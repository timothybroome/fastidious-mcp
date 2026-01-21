/**
 * Shared MCP Tools Module
 *
 * This module contains all tool definitions and handlers for the Fastidious MCP server.
 * Both the local stdio server (index.ts) and hosted HTTP server (http-server.ts) import
 * from this module to ensure consistent behavior and avoid code duplication.
 *
 * IMPORTANT: All MCP functionality should be implemented here. The transport layers
 * (stdio/HTTP) should be minimal wrappers that only handle connection management.
 * This allows rapid iteration during development without redeploying the hosted server.
 */

import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js'

// ============================================================================
// Types
// ============================================================================

export interface FieldDefinition {
  name: string
  type: 'text' | 'number' | 'checkbox' | 'select'
  options?: Array<{ id: string; value: string; color?: string }>
  required?: boolean
  description?: string
}

export interface Note {
  id: string
  type: string
  title?: string
  content?: string
  fields?: Record<string, string>
  fieldDefinitions?: FieldDefinition[]
  favorite?: boolean
  createdAt: string
  updatedAt: string
}

export interface Collection extends Note {
  type: 'collection'
  childCount?: number
  displayFields?: string[]
  viewMode?: 'grid' | 'list'
  sortField?: string
  sortDirection?: 'asc' | 'desc'
}

// ============================================================================
// Tool Definitions
// ============================================================================

export const TOOLS = [
  {
    name: 'create_note',
    description: 'Create a new note in Fastidious. Notes should be in Markdown format.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        title: {
          type: 'string',
          description: 'Title of the note',
        },
        content: {
          type: 'string',
          description: 'Content of the note in Markdown format',
        },
        parentId: {
          type: 'string',
          description: 'Optional: ID of parent collection to add this note to',
        },
        fields: {
          type: 'object',
          description: 'Optional: Custom fields as key-value pairs',
          additionalProperties: { type: 'string' },
        },
      },
      required: ['title', 'content'],
    },
  },
  {
    name: 'get_note',
    description: 'Get a specific note by ID with its full content',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: {
          type: 'string',
          description: 'ID of the note to retrieve',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'update_note',
    description: 'Update an existing note',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: {
          type: 'string',
          description: 'ID of the note to update',
        },
        title: {
          type: 'string',
          description: 'New title for the note',
        },
        content: {
          type: 'string',
          description: 'New content in Markdown format',
        },
        fields: {
          type: 'object',
          description: 'Custom fields to update',
          additionalProperties: { type: 'string' },
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_note',
    description: 'Delete a note by ID',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: {
          type: 'string',
          description: 'ID of the note to delete',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_notes',
    description: 'List all notes, optionally filtered by parent collection',
    inputSchema: {
      type: 'object' as const,
      properties: {
        parentId: {
          type: 'string',
          description: 'Optional: Filter notes by parent collection ID. Omit for root-level items.',
        },
      },
    },
  },
  {
    name: 'search_notes',
    description: 'Search notes by content',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Search query to match against note content',
        },
        parentId: {
          type: 'string',
          description: 'Optional: Limit search to a specific collection',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'create_collection',
    description: 'Create a new collection to organize notes',
    inputSchema: {
      type: 'object' as const,
      properties: {
        title: {
          type: 'string',
          description: 'Title of the collection',
        },
        parentId: {
          type: 'string',
          description: 'Optional: ID of parent collection for nesting. Omit for root-level.',
        },
        fieldDefinitions: {
          type: 'array',
          description: 'Optional: Schema defining fields for items in this collection',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Field name' },
              type: {
                type: 'string',
                enum: ['text', 'number', 'checkbox', 'select'],
                description: 'Field type'
              },
              options: {
                type: 'array',
                description: 'Options for select fields',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    value: { type: 'string' },
                    color: { type: 'string', description: 'Optional tailwind color name' },
                  },
                  required: ['id', 'value'],
                },
              },
              required: { type: 'boolean', description: 'Whether field is required' },
              description: { type: 'string', description: 'Field description' },
            },
            required: ['name', 'type'],
          },
        },
        displayFields: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional: Fields to display in list view (e.g., ["title", "createdAt"])',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'update_collection',
    description: 'Update a collection\'s settings, including field definitions',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: {
          type: 'string',
          description: 'ID of the collection to update',
        },
        title: {
          type: 'string',
          description: 'New title for the collection',
        },
        fieldDefinitions: {
          type: 'array',
          description: 'Updated field definitions schema',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              type: { type: 'string', enum: ['text', 'number', 'checkbox', 'select'] },
              options: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    value: { type: 'string' },
                    color: { type: 'string' },
                  },
                  required: ['id', 'value'],
                },
              },
              required: { type: 'boolean' },
              description: { type: 'string' },
            },
            required: ['name', 'type'],
          },
        },
        displayFields: {
          type: 'array',
          items: { type: 'string' },
          description: 'Fields to display in list view',
        },
        viewMode: {
          type: 'string',
          enum: ['grid', 'list'],
          description: 'View mode for the collection',
        },
        sortField: {
          type: 'string',
          description: 'Field to sort by',
        },
        sortDirection: {
          type: 'string',
          enum: ['asc', 'desc'],
          description: 'Sort direction',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'get_collection',
    description: 'Get a collection by ID, optionally including its children',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: {
          type: 'string',
          description: 'ID of the collection to retrieve',
        },
        includeChildren: {
          type: 'boolean',
          description: 'Whether to include child notes/collections',
          default: false,
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_collections',
    description: 'List all collections at root level or within a parent',
    inputSchema: {
      type: 'object' as const,
      properties: {
        parentId: {
          type: 'string',
          description: 'Optional: List collections within a parent collection',
        },
      },
    },
  },
  {
    name: 'move_note',
    description: 'Move a note or collection to a different parent collection',
    inputSchema: {
      type: 'object' as const,
      properties: {
        id: {
          type: 'string',
          description: 'ID of the note or collection to move',
        },
        targetParentId: {
          type: 'string',
          description: 'ID of the target parent collection. Omit or null to move to root.',
        },
      },
      required: ['id'],
    },
  },
]

// ============================================================================
// API Client
// ============================================================================

export interface APIClientConfig {
  baseUrl: string
  token: string
}

async function fetchAPI(
  config: APIClientConfig,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${config.baseUrl}${path}`
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${config.token}`,
    ...(options.headers as Record<string, string>),
  }

  if (options.body && typeof options.body === 'string') {
    headers['Content-Type'] = 'application/json'
  }

  return fetch(url, { ...options, headers })
}

// ============================================================================
// Tool Handlers
// ============================================================================

export async function handleToolCall(
  config: APIClientConfig,
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  switch (toolName) {
    case 'create_note': {
      const { title, content, parentId, fields } = args as {
        title: string
        content: string
        parentId?: string
        fields?: Record<string, string>
      }
      const response = await fetchAPI(config, '/api/pastes', {
        method: 'POST',
        body: JSON.stringify({
          type: 'text',
          title,
          content,
          parentId,
          fields
        }),
      })
      if (!response.ok) {
        throw new Error(`Failed to create note: ${response.statusText}`)
      }
      return response.json()
    }

    case 'get_note': {
      const { id } = args as { id: string }
      const response = await fetchAPI(config, `/api/pastes/${id}`)
      if (!response.ok) {
        throw new Error(`Failed to get note: ${response.statusText}`)
      }
      return response.json()
    }

    case 'update_note': {
      const { id, ...updates } = args as {
        id: string
        title?: string
        content?: string
        fields?: Record<string, string>
      }
      const response = await fetchAPI(config, `/api/pastes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      })
      if (!response.ok) {
        throw new Error(`Failed to update note: ${response.statusText}`)
      }
      return response.json()
    }

    case 'delete_note': {
      const { id } = args as { id: string }
      const response = await fetchAPI(config, `/api/pastes/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error(`Failed to delete note: ${response.statusText}`)
      }
      return { success: true, id }
    }

    case 'list_notes': {
      const { parentId } = args as { parentId?: string }
      const params = new URLSearchParams()
      if (parentId) params.set('parentId', parentId)
      const queryString = params.toString()
      const path = `/api/pastes${queryString ? `?${queryString}` : ''}`

      const response = await fetchAPI(config, path)
      if (!response.ok) {
        throw new Error(`Failed to list notes: ${response.statusText}`)
      }
      const data = await response.json() as { pastes: Note[] }
      // Filter to only return non-collection items
      return { notes: data.pastes.filter(p => p.type !== 'collection') }
    }

    case 'search_notes': {
      const { query, parentId } = args as { query: string; parentId?: string }
      const params = new URLSearchParams({ q: query })
      if (parentId) params.set('parentId', parentId)

      const response = await fetchAPI(config, `/api/pastes?${params.toString()}`)
      if (!response.ok) {
        throw new Error(`Failed to search notes: ${response.statusText}`)
      }
      const data = await response.json() as { pastes: Note[] }
      return { notes: data.pastes.filter(p => p.type !== 'collection') }
    }

    case 'create_collection': {
      const { title, parentId, fieldDefinitions, displayFields } = args as {
        title: string
        parentId?: string
        fieldDefinitions?: FieldDefinition[]
        displayFields?: string[]
      }
      const response = await fetchAPI(config, '/api/pastes', {
        method: 'POST',
        body: JSON.stringify({
          type: 'collection',
          title,
          parentId,
          fieldDefinitions,
          displayFields: displayFields || ['title', 'type', 'createdAt'],
          viewMode: 'grid',
          sortField: 'createdAt',
          sortDirection: 'desc',
        }),
      })
      if (!response.ok) {
        throw new Error(`Failed to create collection: ${response.statusText}`)
      }
      return response.json()
    }

    case 'update_collection': {
      const { id, ...updates } = args as {
        id: string
        title?: string
        fieldDefinitions?: FieldDefinition[]
        displayFields?: string[]
        viewMode?: 'grid' | 'list'
        sortField?: string
        sortDirection?: 'asc' | 'desc'
      }
      const response = await fetchAPI(config, `/api/pastes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      })
      if (!response.ok) {
        throw new Error(`Failed to update collection: ${response.statusText}`)
      }
      return response.json()
    }

    case 'get_collection': {
      const { id, includeChildren } = args as { id: string; includeChildren?: boolean }

      // Get the collection itself
      const response = await fetchAPI(config, `/api/pastes/${id}`)
      if (!response.ok) {
        throw new Error(`Failed to get collection: ${response.statusText}`)
      }
      const collection = await response.json()

      if (!includeChildren) {
        return { collection }
      }

      // Get children if requested
      const childrenResponse = await fetchAPI(config, `/api/pastes?parentId=${id}`)
      if (!childrenResponse.ok) {
        throw new Error(`Failed to get collection children: ${childrenResponse.statusText}`)
      }
      const childrenData = await childrenResponse.json() as { pastes: Note[] }

      return { collection, children: childrenData.pastes }
    }

    case 'list_collections': {
      const { parentId } = args as { parentId?: string }
      const params = new URLSearchParams()
      if (parentId) params.set('parentId', parentId)
      const queryString = params.toString()
      const path = `/api/pastes${queryString ? `?${queryString}` : ''}`

      const response = await fetchAPI(config, path)
      if (!response.ok) {
        throw new Error(`Failed to list collections: ${response.statusText}`)
      }
      const data = await response.json() as { pastes: Note[] }
      // Filter to only return collections
      return { collections: data.pastes.filter(p => p.type === 'collection') }
    }

    case 'move_note': {
      const { id, targetParentId } = args as { id: string; targetParentId?: string | null }
      const response = await fetchAPI(config, `/api/pastes/${id}/move`, {
        method: 'POST',
        body: JSON.stringify({ targetParentId: targetParentId || null }),
      })
      if (!response.ok) {
        throw new Error(`Failed to move note: ${response.statusText}`)
      }
      return response.json()
    }

    default:
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${toolName}`)
  }
}

// ============================================================================
// Server Factory
// ============================================================================

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

/**
 * Creates a configured MCP Server instance.
 * This factory is used by both stdio and HTTP transports.
 */
export function createMCPServer(config: APIClientConfig): Server {
  const server = new Server(
    { name: 'fastidious-mcp', version: '1.0.0' },
    { capabilities: { tools: {} } }
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params

    try {
      const result = await handleToolCall(config, name, args as Record<string, unknown>)
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new McpError(ErrorCode.InternalError, message)
    }
  })

  return server
}
