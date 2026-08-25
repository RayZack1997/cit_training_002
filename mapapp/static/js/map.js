// ==================== 地图初始化 ====================
// 地图中心设置为北京市政府
const map = L.map('map').setView([39.9042, 116.4074], 15);
L.tileLayer('https://tile.openstreetmap.de/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// ==================== 全局状态 ====================
const palette = ['#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6'];
const pathLayers = {};          // pathId -> Leaflet layerGroup
const loadedPaths = {};         // pathId -> true，表示已加载图层
let checkedPathIds = [];        // 当前勾选显示的路径ID（最新在末尾）
const waypointDataCache = {};   // pathId -> waypoints数组

// ==================== 工具函数 ====================
async function fetchJSON(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
        const err = await response.json().catch(() => ({ message: '请求失败' }));
        throw new Error(err.message || `HTTP error! status: ${response.status}`);
    }
    return await response.json();
}

// ==================== 路径列表渲染 ====================
async function refreshPathList() {
    const paths = await fetchJSON('/api/paths/');

    const container = document.getElementById('path-list');
    container.innerHTML = '';

    if (paths.length === 0) {
        container.innerHTML = '<div style="color:#999;">暂无路径</div>';
        return;
    }

    paths.forEach((path, index) => {
        const color = path.color || palette[index % palette.length];
        const itemDiv = document.createElement('div');
        itemDiv.className = 'path-item';
        itemDiv.style.borderBottom = '1px solid #ddd';
        itemDiv.style.paddingBottom = '8px';
        itemDiv.style.marginBottom = '8px';

        itemDiv.innerHTML = `
            <div style="display:flex; align-items:center; gap:6px;">
                <input type="checkbox" class="path-checkbox" value="${path.id}">
                <span class="color-dot" style="background-color: ${color}; width:12px; height:12px; border-radius:50%; display:inline-block;"></span>
                <label style="flex:1; cursor:pointer;">${path.name} (${path.point_count}点)</label>
                <button class="btn-detail" data-id="${path.id}" title="查看轨迹点列表">详情</button>
                <button class="btn-replace" data-id="${path.id}" title="替换文件">替换</button>
                <button class="btn-delete-single" data-id="${path.id}" title="删除该路径">删</button>
            </div>
        `;

        container.appendChild(itemDiv);

        // 唯一复选框：控制地图显示
        const checkbox = itemDiv.querySelector('.path-checkbox');
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                showPath(path.id);
            } else {
                hidePath(path.id);
            }
        });

        // 单个删除
        itemDiv.querySelector('.btn-delete-single').addEventListener('click', async () => {
            if (confirm(`确定删除路径“${path.name}”？`)) {
                const formData = new FormData();
                formData.append('id', path.id);
                await fetchJSON('/delete-paths/', { method: 'POST', body: formData });
                refreshPathList();
                // 同时清理可能存在的图层
                if (pathLayers[path.id]) {
                    map.removeLayer(pathLayers[path.id]);
                    delete pathLayers[path.id];
                    delete loadedPaths[path.id];
                }
                checkedPathIds = checkedPathIds.filter(id => id !== path.id);
                delete waypointDataCache[path.id];
                updateWaypointList();
            }
        });

        // 详情按钮：弹出模态框显示轨迹点列表
        itemDiv.querySelector('.btn-detail').addEventListener('click', async () => {
            let waypoints = waypointDataCache[path.id];
            if (!waypoints) {
                waypoints = await fetchJSON(`/api/paths/${path.id}/waypoints/`);
                waypointDataCache[path.id] = waypoints;
            }
            showWaypointModal(path.name, waypoints);
        });

        // 替换按钮：弹出文件选择
        itemDiv.querySelector('.btn-replace').addEventListener('click', () => {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.txt';
            fileInput.onchange = async () => {
                if (fileInput.files.length === 0) return;
                const formData = new FormData();
                formData.append('file', fileInput.files[0]);
                try {
                    const result = await fetchJSON(`/replace-path/${path.id}/`, {
                        method: 'POST',
                        body: formData,
                    });
                    if (result.success) {
                        alert(`路径“${path.name}”文件已替换`);
                        refreshPathList();
                        // 如果该路径正在地图显示，需重新加载
                        if (pathLayers[path.id]) {
                            map.removeLayer(pathLayers[path.id]);
                            delete pathLayers[path.id];
                            delete loadedPaths[path.id];
                            showPath(path.id);
                        }
                    } else {
                        alert(`替换失败：${result.message}`);
                    }
                } catch (err) {
                    alert('替换出错：' + err.message);
                }
            };
            fileInput.click();
        });
    });
}

// ==================== 地图路径显示 ====================
async function showPath(pathId) {
    if (!checkedPathIds.includes(pathId)) {
        checkedPathIds.push(pathId);
    }

    if (loadedPaths[pathId]) {
        updateWaypointList();
        return;
    }

    const waypoints = await fetchJSON(`/api/paths/${pathId}/waypoints/`);
    waypointDataCache[pathId] = waypoints;

    // 获取路径颜色
    const paths = await fetchJSON('/api/paths/');
    const pathInfo = paths.find(p => p.id === pathId);
    const color = pathInfo ? pathInfo.color : palette[pathId % palette.length];

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

function hidePath(pathId) {
    if (pathLayers[pathId]) {
        map.removeLayer(pathLayers[pathId]);
        delete pathLayers[pathId];
        delete loadedPaths[pathId];
    }
    checkedPathIds = checkedPathIds.filter(id => id !== pathId);
    updateWaypointList();
}

function updateWaypointList() {
    const container = document.getElementById('waypoint-list');
    if (!container) return;
    container.innerHTML = '';

    if (checkedPathIds.length === 0) {
        container.innerHTML = '<div style="color:#999;">未选择路径</div>';
        return;
    }

    const latestId = checkedPathIds[checkedPathIds.length - 1];
    const waypoints = waypointDataCache[latestId];
    if (!waypoints) return;

    waypoints.forEach(w => {
        const div = document.createElement('div');
        div.style.marginBottom = '4px';
        const statusText = w.status === 'carrier' ? '已取' : '未取';
        div.innerHTML = `<b>${w.seq}.</b> ${w.info || '无'} (${statusText})`;
        container.appendChild(div);
    });
}

// ==================== 弹出模态框 ====================
function showWaypointModal(pathName, waypoints) {
    const modal = document.getElementById('waypoint-modal');
    const title = document.getElementById('modal-title');
    const listContainer = document.getElementById('modal-waypoint-list');

    title.textContent = `${pathName} - 轨迹点列表`;
    listContainer.innerHTML = '';

    waypoints.forEach(w => {
        const div = document.createElement('div');
        div.style.marginBottom = '4px';
        const statusText = w.status === 'carrier' ? '已取' : '未取';
        div.innerHTML = `<b>${w.seq}.</b> ${w.info || '无'} (${statusText})`;
        listContainer.appendChild(div);
    });

    modal.style.display = 'block';
}

// 关闭模态框
document.getElementById('modal-close')?.addEventListener('click', () => {
    document.getElementById('waypoint-modal').style.display = 'none';
});
window.addEventListener('click', (e) => {
    const modal = document.getElementById('waypoint-modal');
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});

// ==================== 批量操作 ====================
document.getElementById('btn-delete-selected')?.addEventListener('click', async () => {
    const selected = [...document.querySelectorAll('.path-checkbox:checked')].map(cb => cb.value);
    if (selected.length === 0) {
        alert('请先勾选要删除的路径');
        return;
    }
    if (confirm(`确定删除选中的 ${selected.length} 条路径？`)) {
        const formData = new FormData();
        selected.forEach(id => formData.append('ids[]', id));
        await fetchJSON('/delete-paths/', { method: 'POST', body: formData });
        refreshPathList();
        // 清理已删除路径的图层和状态
        selected.forEach(id => {
            if (pathLayers[id]) {
                map.removeLayer(pathLayers[id]);
                delete pathLayers[id];
                delete loadedPaths[id];
            }
            checkedPathIds = checkedPathIds.filter(pid => pid !== Number(id));
            delete waypointDataCache[id];
        });
        updateWaypointList();
    }
});

document.getElementById('btn-clear-all')?.addEventListener('click', async () => {
    if (confirm('确定清空所有路径？此操作不可恢复！')) {
        await fetchJSON('/clear-paths/', { method: 'POST' });
        refreshPathList();
        // 清除所有图层
        Object.keys(pathLayers).forEach(id => {
            map.removeLayer(pathLayers[id]);
            delete pathLayers[id];
            delete loadedPaths[id];
        });
        checkedPathIds = [];
        Object.keys(waypointDataCache).forEach(k => delete waypointDataCache[k]);
        updateWaypointList();
    }
});

// ==================== 上传表单处理 ====================
document.getElementById('upload-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    try {
        const result = await fetchJSON('/upload/', {
            method: 'POST',
            body: formData,
        });
        if (result.success) {
            alert(result.message || `导入成功：${result.name}`);
            form.reset();
            refreshPathList();
        } else {
            alert(`导入失败：${result.message}`);
        }
    } catch (err) {
        alert('上传出错：' + err.message);
    }
});

// ==================== 初始化 ====================
refreshPathList();