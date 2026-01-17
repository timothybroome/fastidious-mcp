/**
 * HTTP client for communicating with Fastidious API
 */

const BASE_URL = process.env.FASTIDIOUS_URL || 'http://localhost:3000'
const TOKEN = process.env.FASTIDIOUS_TOKEN || ''

interface Note {
  id: string
  type: string
  title?: string
  content?: string
  fields?: Record<string, string>
  createdAt: string
  updatedAt: string
}

interface Collection {
  id: string
  type: 'collection'
  title?: string
  items?: string[]
  displayFields?: string[]
  viewMode?: 'grid' | 'list'
  sortField?: string
  sortDirection?: 'asc' | 'desc'
  createdAt: string
  updatedAt: string
}

interface CreateNoteParams {
  title: string
  content: string
  collectionId?: string
  fields?: Record<string, string>
}

interface CreateCollectionParams {
  title: string
  items?: string[]
  displayFields?: string[]
}

async function fetchAPI(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${BASE_URL}${path}`
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${TOKEN}`,
    ...options.headers as Record<string, string>,
  }

  if (options.body && typeof options.body === 'string') {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  return response
}

export async function listNotes(collectionId?: string): Promise<Note[]> {
  const params = new URLSearchParams()
  if (collectionId) params.set('collectionId', collectionId)

  const queryString = params.toString()
  const path = `/api/mcp/notes${queryString ? `?${queryString}` : ''}`

  const response = await fetchAPI(path)
  if (!response.ok) {
    throw new Error(`Failed to list notes: ${response.statusText}`)
  }

  const data = await response.json() as { notes: Note[] }
  return data.notes
}

export async function getNote(id: string): Promise<Note> {
  const response = await fetchAPI(`/api/mcp/notes/${id}`)
  if (!response.ok) {
    throw new Error(`Failed to get note: ${response.statusText}`)
  }

  return response.json() as Promise<Note>
}

export async function createNote(params: CreateNoteParams): Promise<Note> {
  const response = await fetchAPI('/api/mcp/notes', {
    method: 'POST',
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    throw new Error(`Failed to create note: ${response.statusText}`)
  }

  return response.json() as Promise<Note>
}

export async function updateNote(id: string, updates: Partial<CreateNoteParams>): Promise<Note> {
  const response = await fetchAPI(`/api/mcp/notes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    throw new Error(`Failed to update note: ${response.statusText}`)
  }

  return response.json() as Promise<Note>
}

export async function deleteNote(id: string): Promise<void> {
  const response = await fetchAPI(`/api/mcp/notes/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error(`Failed to delete note: ${response.statusText}`)
  }
}

export async function searchNotes(query: string, collectionId?: string): Promise<Note[]> {
  const params = new URLSearchParams({ q: query })
  if (collectionId) params.set('collectionId', collectionId)

  const response = await fetchAPI(`/api/mcp/notes?${params.toString()}`)
  if (!response.ok) {
    throw new Error(`Failed to search notes: ${response.statusText}`)
  }

  const data = await response.json() as { notes: Note[] }
  return data.notes
}

export async function listCollections(): Promise<Collection[]> {
  const response = await fetchAPI('/api/mcp/collections')
  if (!response.ok) {
    throw new Error(`Failed to list collections: ${response.statusText}`)
  }

  const data = await response.json() as { collections: Collection[] }
  return data.collections
}

export async function getCollection(id: string, includeContents = false): Promise<{ collection: Collection; notes?: Note[] }> {
  const params = new URLSearchParams()
  if (includeContents) params.set('includeContents', 'true')

  const queryString = params.toString()
  const path = `/api/mcp/collections/${id}${queryString ? `?${queryString}` : ''}`

  const response = await fetchAPI(path)
  if (!response.ok) {
    throw new Error(`Failed to get collection: ${response.statusText}`)
  }

  return response.json() as Promise<{ collection: Collection; notes?: Note[] }>
}

export async function createCollection(params: CreateCollectionParams): Promise<Collection> {
  const response = await fetchAPI('/api/mcp/collections', {
    method: 'POST',
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    throw new Error(`Failed to create collection: ${response.statusText}`)
  }

  return response.json() as Promise<Collection>
}

export async function addToCollection(collectionId: string, noteIds: string[]): Promise<Collection> {
  const response = await fetchAPI(`/api/mcp/collections/${collectionId}/add`, {
    method: 'POST',
    body: JSON.stringify({ noteIds }),
  })

  if (!response.ok) {
    throw new Error(`Failed to add to collection: ${response.statusText}`)
  }

  return response.json() as Promise<Collection>
}

export async function removeFromCollection(collectionId: string, noteIds: string[]): Promise<Collection> {
  const response = await fetchAPI(`/api/mcp/collections/${collectionId}/remove`, {
    method: 'POST',
    body: JSON.stringify({ noteIds }),
  })

  if (!response.ok) {
    throw new Error(`Failed to remove from collection: ${response.statusText}`)
  }

  return response.json() as Promise<Collection>
}

export async function uploadFile(base64Content: string, filename: string, mimeType: string, title?: string, collectionId?: string): Promise<Note> {
  const response = await fetchAPI('/api/mcp/upload', {
    method: 'POST',
    body: JSON.stringify({
      content: base64Content,
      filename,
      mimeType,
      title,
      collectionId,
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to upload file: ${response.statusText}`)
  }

  return response.json() as Promise<Note>
}
