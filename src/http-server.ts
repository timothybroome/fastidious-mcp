#!/usr/bin/env node

/**
 * Fastidious MCP HTTP Server
 *
 * HTTP-based MCP server that can be deployed and accessed remotely.
 * Uses SSE (Server-Sent Events) transport for MCP protocol.
 *
 * Environment variables:
 * - FASTIDIOUS_URL: Base URL of Fastidious API (default: http://localhost:3000)
 * - PORT: Server port (default: 3001)
 */

import express from 'express'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js'

const PORT = process.env.PORT || 3001
const FASTIDIOUS_URL = process.env.FASTIDIOUS_URL || 'http://localhost:3000'

// HTTP client for Fastidious API
async function fetchAPI(token: string, path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${FASTIDIOUS_URL}${path}`
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    ...options.headers as Record<string, string>,
  }

  if (options.body && typeof options.body === 'string') {
    headers['Content-Type'] = 'application/json'
  }

  return fetch(url, { ...options, headers })
}

// Tool definitions
const TOOLS = [
  {
    name: 'create_note',
    description: 'Create a new note in Fastidious. Notes should be in Markdown format.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Title of the note' },
        content: { type: 'string', description: 'Content of the note in Markdown format' },
        collectionId: { type: 'string', description: 'Optional: ID of collection to add this note to' },
        fields: { type: 'object', description: 'Optional: Custom fields as key-value pairs', additionalProperties: { type: 'string' } },
      },
      required: ['title', 'content'],
    },
  },
  {
    name: 'get_note',
    description: 'Get a specific note by ID with its full content',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'ID of the note to retrieve' } },
      required: ['id'],
    },
  },
  {
    name: 'update_note',
    description: 'Update an existing note',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID of the note to update' },
        title: { type: 'string', description: 'New title for the note' },
        content: { type: 'string', description: 'New content in Markdown format' },
        fields: { type: 'object', description: 'Custom fields to update', additionalProperties: { type: 'string' } },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_note',
    description: 'Delete a note by ID',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'ID of the note to delete' } },
      required: ['id'],
    },
  },
  {
    name: 'list_notes',
    description: 'List all notes, optionally filtered by collection',
    inputSchema: {
      type: 'object',
      properties: { collectionId: { type: 'string', description: 'Optional: Filter notes by collection ID' } },
    },
  },
  {
    name: 'search_notes',
    description: 'Search notes by content',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query to match against note content' },
        collectionId: { type: 'string', description: 'Optional: Limit search to a specific collection' },
      },
      required: ['query'],
    },
  },
  {
    name: 'create_collection',
    description: 'Create a new collection to organize notes',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Title of the collection' },
        items: { type: 'array', items: { type: 'string' }, description: 'Optional: Array of note IDs to include' },
        displayFields: { type: 'array', items: { type: 'string' }, description: 'Optional: Fields to display in list view' },
      },
      required: ['title'],
    },
  },
  {
    name: 'get_collection',
    description: 'Get a collection by ID, optionally including full note contents',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID of the collection to retrieve' },
        includeContents: { type: 'boolean', description: 'Whether to include full content of all notes', default: false },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_collections',
    description: 'List all collections',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'add_to_collection',
    description: 'Add notes to an existing collection',
    inputSchema: {
      type: 'object',
      properties: {
        collectionId: { type: 'string', description: 'ID of the collection' },
        noteIds: { type: 'array', items: { type: 'string' }, description: 'Array of note IDs to add' },
      },
      required: ['collectionId', 'noteIds'],
    },
  },
  {
    name: 'remove_from_collection',
    description: 'Remove notes from a collection',
    inputSchema: {
      type: 'object',
      properties: {
        collectionId: { type: 'string', description: 'ID of the collection' },
        noteIds: { type: 'array', items: { type: 'string' }, description: 'Array of note IDs to remove' },
      },
      required: ['collectionId', 'noteIds'],
    },
  },
]

// Create MCP server for a specific token
function createMCPServer(token: string): Server {
  const server = new Server(
    { name: 'fastidious-mcp', version: '1.0.0' },
    { capabilities: { tools: {} } }
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params

    try {
      let response: Response
      let result: unknown

      switch (name) {
        case 'create_note': {
          const { title, content, collectionId, fields } = args as { title: string; content: string; collectionId?: string; fields?: Record<string, string> }
          response = await fetchAPI(token, '/api/mcp/notes', {
            method: 'POST',
            body: JSON.stringify({ title, content, collectionId, fields }),
          })
          result = await response.json()
          break
        }

        case 'get_note': {
          const { id } = args as { id: string }
          response = await fetchAPI(token, `/api/mcp/notes/${id}`)
          result = await response.json()
          break
        }

        case 'update_note': {
          const { id, ...updates } = args as { id: string; title?: string; content?: string; fields?: Record<string, string> }
          response = await fetchAPI(token, `/api/mcp/notes/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
          })
          result = await response.json()
          break
        }

        case 'delete_note': {
          const { id } = args as { id: string }
          response = await fetchAPI(token, `/api/mcp/notes/${id}`, { method: 'DELETE' })
          result = await response.json()
          break
        }

        case 'list_notes': {
          const { collectionId } = args as { collectionId?: string }
          const params = collectionId ? `?collectionId=${collectionId}` : ''
          response = await fetchAPI(token, `/api/mcp/notes${params}`)
          result = await response.json()
          break
        }

        case 'search_notes': {
          const { query, collectionId } = args as { query: string; collectionId?: string }
          const params = new URLSearchParams({ q: query })
          if (collectionId) params.set('collectionId', collectionId)
          response = await fetchAPI(token, `/api/mcp/notes?${params.toString()}`)
          result = await response.json()
          break
        }

        case 'create_collection': {
          const { title, items, displayFields } = args as { title: string; items?: string[]; displayFields?: string[] }
          response = await fetchAPI(token, '/api/mcp/collections', {
            method: 'POST',
            body: JSON.stringify({ title, items, displayFields }),
          })
          result = await response.json()
          break
        }

        case 'get_collection': {
          const { id, includeContents } = args as { id: string; includeContents?: boolean }
          const params = includeContents ? '?includeContents=true' : ''
          response = await fetchAPI(token, `/api/mcp/collections/${id}${params}`)
          result = await response.json()
          break
        }

        case 'list_collections': {
          response = await fetchAPI(token, '/api/mcp/collections')
          result = await response.json()
          break
        }

        case 'add_to_collection': {
          const { collectionId, noteIds } = args as { collectionId: string; noteIds: string[] }
          response = await fetchAPI(token, `/api/mcp/collections/${collectionId}/add`, {
            method: 'POST',
            body: JSON.stringify({ noteIds }),
          })
          result = await response.json()
          break
        }

        case 'remove_from_collection': {
          const { collectionId, noteIds } = args as { collectionId: string; noteIds: string[] }
          response = await fetchAPI(token, `/api/mcp/collections/${collectionId}/remove`, {
            method: 'POST',
            body: JSON.stringify({ noteIds }),
          })
          result = await response.json()
          break
        }

        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`)
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new McpError(ErrorCode.InternalError, message)
    }
  })

  return server
}

// Express app
const app = express()

// CORS for Claude Desktop
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' })
})

// SSE endpoint for MCP
// Token is passed as query parameter: /sse?token=fst_xxx
app.get('/sse', async (req, res) => {
  const token = req.query.token as string

  if (!token || !token.startsWith('fst_')) {
    return res.status(401).json({ error: 'Valid token required as query parameter' })
  }

  const transport = new SSEServerTransport('/message', res)
  const server = createMCPServer(token)

  await server.connect(transport)
})

// Message endpoint for MCP
app.post('/message', express.json(), async (req, res) => {
  // This endpoint receives messages from the SSE transport
  // The transport handles routing internally
  res.json({ received: true })
})

// Start server
app.listen(PORT, () => {
  console.log(`Fastidious MCP HTTP server running on port ${PORT}`)
  console.log(`Fastidious API URL: ${FASTIDIOUS_URL}`)
  console.log(`\nEndpoints:`)
  console.log(`  GET  /health - Health check`)
  console.log(`  GET  /sse?token=YOUR_TOKEN - MCP SSE endpoint`)
})
