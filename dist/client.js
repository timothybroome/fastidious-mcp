/**
 * HTTP client for communicating with Fastidious API
 */
const BASE_URL = process.env.FASTIDIOUS_URL || 'http://localhost:3000';
const TOKEN = process.env.FASTIDIOUS_TOKEN || '';
async function fetchAPI(path, options = {}) {
    const url = `${BASE_URL}${path}`;
    const headers = {
        'Authorization': `Bearer ${TOKEN}`,
        ...options.headers,
    };
    if (options.body && typeof options.body === 'string') {
        headers['Content-Type'] = 'application/json';
    }
    const response = await fetch(url, {
        ...options,
        headers,
    });
    return response;
}
export async function listNotes(collectionId) {
    const params = new URLSearchParams();
    if (collectionId)
        params.set('collectionId', collectionId);
    const queryString = params.toString();
    const path = `/api/mcp/notes${queryString ? `?${queryString}` : ''}`;
    const response = await fetchAPI(path);
    if (!response.ok) {
        throw new Error(`Failed to list notes: ${response.statusText}`);
    }
    const data = await response.json();
    return data.notes;
}
export async function getNote(id) {
    const response = await fetchAPI(`/api/mcp/notes/${id}`);
    if (!response.ok) {
        throw new Error(`Failed to get note: ${response.statusText}`);
    }
    return response.json();
}
export async function createNote(params) {
    const response = await fetchAPI('/api/mcp/notes', {
        method: 'POST',
        body: JSON.stringify(params),
    });
    if (!response.ok) {
        throw new Error(`Failed to create note: ${response.statusText}`);
    }
    return response.json();
}
export async function updateNote(id, updates) {
    const response = await fetchAPI(`/api/mcp/notes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    });
    if (!response.ok) {
        throw new Error(`Failed to update note: ${response.statusText}`);
    }
    return response.json();
}
export async function deleteNote(id) {
    const response = await fetchAPI(`/api/mcp/notes/${id}`, {
        method: 'DELETE',
    });
    if (!response.ok) {
        throw new Error(`Failed to delete note: ${response.statusText}`);
    }
}
export async function searchNotes(query, collectionId) {
    const params = new URLSearchParams({ q: query });
    if (collectionId)
        params.set('collectionId', collectionId);
    const response = await fetchAPI(`/api/mcp/notes?${params.toString()}`);
    if (!response.ok) {
        throw new Error(`Failed to search notes: ${response.statusText}`);
    }
    const data = await response.json();
    return data.notes;
}
export async function listCollections() {
    const response = await fetchAPI('/api/mcp/collections');
    if (!response.ok) {
        throw new Error(`Failed to list collections: ${response.statusText}`);
    }
    const data = await response.json();
    return data.collections;
}
export async function getCollection(id, includeContents = false) {
    const params = new URLSearchParams();
    if (includeContents)
        params.set('includeContents', 'true');
    const queryString = params.toString();
    const path = `/api/mcp/collections/${id}${queryString ? `?${queryString}` : ''}`;
    const response = await fetchAPI(path);
    if (!response.ok) {
        throw new Error(`Failed to get collection: ${response.statusText}`);
    }
    return response.json();
}
export async function createCollection(params) {
    const response = await fetchAPI('/api/mcp/collections', {
        method: 'POST',
        body: JSON.stringify(params),
    });
    if (!response.ok) {
        throw new Error(`Failed to create collection: ${response.statusText}`);
    }
    return response.json();
}
export async function addToCollection(collectionId, noteIds) {
    const response = await fetchAPI(`/api/mcp/collections/${collectionId}/add`, {
        method: 'POST',
        body: JSON.stringify({ noteIds }),
    });
    if (!response.ok) {
        throw new Error(`Failed to add to collection: ${response.statusText}`);
    }
    return response.json();
}
export async function removeFromCollection(collectionId, noteIds) {
    const response = await fetchAPI(`/api/mcp/collections/${collectionId}/remove`, {
        method: 'POST',
        body: JSON.stringify({ noteIds }),
    });
    if (!response.ok) {
        throw new Error(`Failed to remove from collection: ${response.statusText}`);
    }
    return response.json();
}
export async function uploadFile(base64Content, filename, mimeType, title, collectionId) {
    const response = await fetchAPI('/api/mcp/upload', {
        method: 'POST',
        body: JSON.stringify({
            content: base64Content,
            filename,
            mimeType,
            title,
            collectionId,
        }),
    });
    if (!response.ok) {
        throw new Error(`Failed to upload file: ${response.statusText}`);
    }
    return response.json();
}
//# sourceMappingURL=client.js.map