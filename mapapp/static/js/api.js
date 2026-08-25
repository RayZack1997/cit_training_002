async function fetchJSON(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}

async function loadPaths() {
    return await fetchJSON('/api/paths/');
}

async function loadWaypoints(pathId) {
    return await fetchJSON(`/api/paths/${pathId}/waypoints/`);
}