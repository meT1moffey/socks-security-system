const API_BASE = '';
async function fetchApi(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: {
                'Accept': 'application/json',
                ...options.headers,
            },
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    }
    catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}
export async function getStats() {
    return fetchApi('/api/stats');
}
export async function loadSocks(query, offset, limit, priority) {
    const encodedQuery = encodeURIComponent(query);
    return fetchApi(`/api/load?query=${encodedQuery}&offset=${offset}&limit=${limit}&priority=${priority}`);
}
export async function getWashHistory(sockId) {
    return fetchApi(`/api/wash_history/${sockId}`);
}
export async function toggleCleanStatus(sockId) {
    return fetchApi(`/toggle_clean/${sockId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    });
}
export async function deleteSock(sockId) {
    return fetchApi(`/delete_sock/${sockId}`, {
        method: 'DELETE',
    });
}
export async function addSock(formData) {
    return fetchApi('/add', {
        method: 'POST',
        body: formData,
    });
}
export function isValidImageFile(file) {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const maxSize = 1 << 24;
    if (!allowedTypes.includes(file.type)) {
        return false;
    }
    if (file.size > maxSize) {
        return false;
    }
    return true;
}
