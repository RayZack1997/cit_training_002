// 地图初始化
const map = L.map('map').setView([31.282284, 121.415057], 15);
L.tileLayer('https://tile.openstreetmap.de/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// 颜色调色板
const palette = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6'];

// 存储每条路径的图层组：key 为 path id，value 为 L.layerGroup
const pathLayers = {};

// 当前已加载的路径数据缓存（用于刷新时移除旧图层）
const loadedPaths = {};
// 记录当前勾选的路径ID（按勾选顺序，末尾为最新）
let checkedPathIds = [];
// 缓存轨迹点数据，便于切换列表时无需重新请求
const waypointDataCache = {};

// 获取路径列表并渲染复选框
async function refreshPathList() {
    const paths = await loadPaths();
    const container = document.getElementById('path-list');
    container.innerHTML = '';
    paths.forEach((path, index) => {
        const color = path.color || palette[index % palette.length];
        const div = document.createElement('div');
        div.className = 'path-item';
        div.innerHTML = `
            <input type="checkbox" id="path-${path.id}" value="${path.id}">
            <span class="color-dot" style="background-color: ${color};"></span>
            <label for="path-${path.id}">${path.name} (${path.point_count}点)</label>
        `;
        container.appendChild(div);

        const checkbox = div.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                showPath(path.id);
            } else {
                hidePath(path.id);
            }
        });
    });
}

// 显示指定路径
async function showPath(pathId) {
    // 更新勾选顺序记录
    if (!checkedPathIds.includes(pathId)) {
        checkedPathIds.push(pathId);
    }

    // 如果图层已存在，仅更新轨迹点列表（可能之前取消过又重新勾选）
    if (loadedPaths[pathId]) {
        updateWaypointList();
        return;
    }

    // 请求轨迹点数据
    const waypoints = await loadWaypoints(pathId);
    waypointDataCache[pathId] = waypoints;

    // 获取路径颜色（从已加载的路径列表中查找）
    const paths = await loadPaths();
    const pathInfo = paths.find(p => p.id === pathId);
    const color = pathInfo ? pathInfo.color : palette[pathId % palette.length];

    // 创建图层组
    const layerGroup = L.layerGroup().addTo(map);

    const sortedPoints = waypoints.sort((a, b) => a.seq - b.seq);
    const latlngs = sortedPoints.map(w => [w.lat, w.lng]);

    L.polyline(latlngs, { color: color, weight: 4 }).addTo(layerGroup);

    sortedPoints.forEach(w => {
        const isCarrier = w.status === 'carrier';
        const marker = L.circleMarker([w.lat, w.lng], {
            radius: 8,
            color: '#fff',
            weight: 2,
            fillColor: isCarrier ? '#00c853' : '#d50000',
            fillOpacity: 0.9
        }).addTo(layerGroup);

        const tooltipContent = `<b>序号:</b> ${w.seq}<br><b>说明:</b> ${w.info || '无'}<br><b>状态:</b> ${isCarrier ? '已取' : '未取'}`;
        marker.bindTooltip(tooltipContent);
    });

    pathLayers[pathId] = layerGroup;
    loadedPaths[pathId] = true;

    updateWaypointList();
}

// 隐藏指定路径
function hidePath(pathId) {
    if (pathLayers[pathId]) {
        map.removeLayer(pathLayers[pathId]);
        delete pathLayers[pathId];
        delete loadedPaths[pathId];
    }
    // 从勾选顺序中移除
    checkedPathIds = checkedPathIds.filter(id => id !== pathId);

    updateWaypointList();
}
function updateWaypointList() {
    const container = document.getElementById('waypoint-list');
    if (!container) return;
    container.innerHTML = '';

    if (checkedPathIds.length === 0) return;

    const latestId = checkedPathIds[checkedPathIds.length - 1];
    const waypoints = waypointDataCache[latestId];

    if (!waypoints) return;  // 理论上缓存一定存在

    waypoints.forEach(w => {
        const div = document.createElement('div');
        div.style.marginBottom = '4px';
        const statusText = w.status === 'carrier' ? '已取' : '未取';
        div.innerHTML = `<b>${w.seq}.</b> ${w.info} (${statusText})`;
        container.appendChild(div);
    });
}

// 上传表单处理
document.getElementById('upload-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData();
    const fileInput = document.querySelector('input[name="file"]');
    if (!fileInput.files.length) {
        alert('请选择文件');
        return;
    }
    formData.append('file', fileInput.files[0]);

    try {
        const response = await fetch('/upload/', {
            method: 'POST',
            body: formData,
            // 注意：因为我们使用了 @csrf_exempt，所以不需要 CSRF token
        });
        const result = await response.json();
        if (result.success) {
            alert(`导入成功：${result.name}`);
            fileInput.value = '';
            refreshPathList();
        } else {
            alert(`导入失败：${result.message}`);
        }
    } catch (err) {
        alert('上传出错：' + err.message);
    }
});

// 页面加载时初始化路径列表
refreshPathList();