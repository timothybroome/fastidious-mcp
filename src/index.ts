#!/usr/bin/env node

/**
 * Fastidious MCP Server - Stdio Transport
 *
 * This is a thin wrapper that provides stdio transport for the MCP server.
 * All tool definitions and handlers are in tools.ts.
 *
 * Environment variables:
 * - FASTIDIOUS_TOKEN: API token for authentication (required)
 * - FASTIDIOUS_URL: Base URL of the Fastidious server (default: http://localhost:3000)
 *
 * Usage:
 *   FASTIDIOUS_TOKEN=fst_xxx FASTIDIOUS_URL=http://localhost:3000 npx tsx src/index.ts
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createMCPServer } from './tools.js'

// Validate environment
const token = process.env.FASTIDIOUS_TOKEN
if (!token) {
  console.error('Error: FASTIDIOUS_TOKEN environment variable is required')
  process.exit(1)
}

const baseUrl = process.env.FASTIDIOUS_URL || 'http://localhost:3000'

// Create and start server
async function main() {
  const server = createMCPServer({ baseUrl, token: token as string })
  const transport = new StdioServerTransport()

  await server.connect(transport)
  console.error('Fastidious MCP server running on stdio')
  console.error(`API URL: ${baseUrl}`)
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
