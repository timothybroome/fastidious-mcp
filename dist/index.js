#!/usr/bin/env node
/**
 * Fastidious MCP Server
 *
 * Provides tools for Claude to interact with Fastidious notes and collections.
 *
 * Environment variables:
 * - FASTIDIOUS_TOKEN: API token for authentication
 * - FASTIDIOUS_URL: Base URL of the Fastidious server (default: http://localhost:3000)
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, ErrorCode, McpError, } from '@modelcontextprotocol/sdk/types.js';
import * as client from './client.js';
// Validate environment
if (!process.env.FASTIDIOUS_TOKEN) {
    console.error('Error: FASTIDIOUS_TOKEN environment variable is required');
    process.exit(1);
}
// Create server instance
const server = new Server({
    name: 'fastidious-mcp',
    version: '1.0.0',
}, {
    capabilities: {
        tools: {},
    },
});
// Define available tools
const TOOLS = [
    {
        name: 'create_note',
        description: 'Create a new note in Fastidious. Notes should be in Markdown format.',
        inputSchema: {
            type: 'object',
            properties: {
                title: {
                    type: 'string',
                    description: 'Title of the note',
                },
                content: {
                    type: 'string',
                    description: 'Content of the note in Markdown format',
                },
                collectionId: {
                    type: 'string',
                    description: 'Optional: ID of collection to add this note to',
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
            type: 'object',
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
            type: 'object',
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
            type: 'object',
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
        description: 'List all notes, optionally filtered by collection',
        inputSchema: {
            type: 'object',
            properties: {
                collectionId: {
                    type: 'string',
                    description: 'Optional: Filter notes by collection ID',
                },
            },
        },
    },
    {
        name: 'search_notes',
        description: 'Search notes by content',
        inputSchema: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Search query to match against note content',
                },
                collectionId: {
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
            type: 'object',
            properties: {
                title: {
                    type: 'string',
                    description: 'Title of the collection',
                },
                items: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Optional: Array of note IDs to include in the collection',
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
        name: 'get_collection',
        description: 'Get a collection by ID, optionally including full note contents',
        inputSchema: {
            type: 'object',
            properties: {
                id: {
                    type: 'string',
                    description: 'ID of the collection to retrieve',
                },
                includeContents: {
                    type: 'boolean',
                    description: 'Whether to include full content of all notes in the collection',
                    default: false,
                },
            },
            required: ['id'],
        },
    },
    {
        name: 'list_collections',
        description: 'List all collections',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'add_to_collection',
        description: 'Add notes to an existing collection',
        inputSchema: {
            type: 'object',
            properties: {
                collectionId: {
                    type: 'string',
                    description: 'ID of the collection',
                },
                noteIds: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Array of note IDs to add to the collection',
                },
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
                collectionId: {
                    type: 'string',
                    description: 'ID of the collection',
                },
                noteIds: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Array of note IDs to remove from the collection',
                },
            },
            required: ['collectionId', 'noteIds'],
        },
    },
];
// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
});
// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        switch (name) {
            case 'create_note': {
                const { title, content, collectionId, fields } = args;
                const note = await client.createNote({ title, content, collectionId, fields });
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(note, null, 2),
                        },
                    ],
                };
            }
            case 'get_note': {
                const { id } = args;
                const note = await client.getNote(id);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(note, null, 2),
                        },
                    ],
                };
            }
            case 'update_note': {
                const { id, ...updates } = args;
                const note = await client.updateNote(id, updates);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(note, null, 2),
                        },
                    ],
                };
            }
            case 'delete_note': {
                const { id } = args;
                await client.deleteNote(id);
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Note ${id} deleted successfully`,
                        },
                    ],
                };
            }
            case 'list_notes': {
                const { collectionId } = args;
                const notes = await client.listNotes(collectionId);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(notes, null, 2),
                        },
                    ],
                };
            }
            case 'search_notes': {
                const { query, collectionId } = args;
                const notes = await client.searchNotes(query, collectionId);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(notes, null, 2),
                        },
                    ],
                };
            }
            case 'create_collection': {
                const { title, items, displayFields } = args;
                const collection = await client.createCollection({ title, items, displayFields });
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(collection, null, 2),
                        },
                    ],
                };
            }
            case 'get_collection': {
                const { id, includeContents } = args;
                const result = await client.getCollection(id, includeContents);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(result, null, 2),
                        },
                    ],
                };
            }
            case 'list_collections': {
                const collections = await client.listCollections();
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(collections, null, 2),
                        },
                    ],
                };
            }
            case 'add_to_collection': {
                const { collectionId, noteIds } = args;
                const collection = await client.addToCollection(collectionId, noteIds);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(collection, null, 2),
                        },
                    ],
                };
            }
            case 'remove_from_collection': {
                const { collectionId, noteIds } = args;
                const collection = await client.removeFromCollection(collectionId, noteIds);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(collection, null, 2),
                        },
                    ],
                };
            }
            default:
                throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new McpError(ErrorCode.InternalError, message);
    }
});
// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Fastidious MCP server running on stdio');
}
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map