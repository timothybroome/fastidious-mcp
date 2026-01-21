#!/usr/bin/env node

/**
 * Fastidious MCP Server - HTTP/SSE Transport
 *
 * This is a thin wrapper that provides HTTP/SSE transport for the MCP server,
 * compatible with mcp-remote for Claude Desktop.
 * All tool definitions and handlers are in tools.ts.
 *
 * Environment variables:
 * - FASTIDIOUS_URL: Base URL of the Fastidious API (default: http://localhost:3000)
 * - PORT: Port to run on (default: 3001)
 *
 * The token is passed via query parameter on the /sse endpoint.
 */

import express, { Request, Response as ExpressResponse } from 'express'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import { createMCPServer } from './tools.js'

const PORT = parseInt(process.env.PORT || '3000', 10)
const FASTIDIOUS_URL = process.env.FASTIDIOUS_URL || 'http://localhost:3000'

// Store active transports by session ID
const transports = new Map<string, SSEServerTransport>()

// Express app
const app = express()
app.use(express.json())

// CORS
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
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0' })
})

// SSE endpoint for MCP - handles GET requests
app.get('/sse', async (req: Request, res: ExpressResponse) => {
  const token = req.query.token as string

  if (!token || !token.startsWith('fst_')) {
    return res.status(401).json({ error: 'Valid token required as query parameter' })
  }

  console.log(`[SSE] New connection with token: ${token.substring(0, 20)}...`)

  // Create transport - the path is where POST messages should go
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transport = new SSEServerTransport('/message', res as any)

  // Store transport for message routing
  const sessionId = `${Date.now()}-${Math.random().toString(36).substring(7)}`
  transports.set(sessionId, transport)

  // Create and connect server using shared tools
  const server = createMCPServer({ baseUrl: FASTIDIOUS_URL, token })

  // Handle connection close
  res.on('close', () => {
    console.log(`[SSE] Connection closed: ${sessionId}`)
    transports.delete(sessionId)
  })

  try {
    await server.connect(transport)
    console.log(`[SSE] Server connected: ${sessionId}`)
  } catch (error) {
    console.error(`[SSE] Connection error:`, error)
    transports.delete(sessionId)
  }
})

// Message endpoint for SSE transport
app.post('/message', async (req: Request, res: ExpressResponse) => {
  console.log(`[Message] Received:`, JSON.stringify(req.body).substring(0, 100))

  // Find the most recent transport (simple approach for single-user)
  const transportEntries = Array.from(transports.entries())
  if (transportEntries.length === 0) {
    return res.status(400).json({ error: 'No active SSE connection' })
  }

  // Use the most recent transport
  const [_sessionId, transport] = transportEntries[transportEntries.length - 1]

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await transport.handlePostMessage(req as any, res as any)
  } catch (error) {
    console.error(`[Message] Error handling message:`, error)
    res.status(500).json({ error: 'Failed to handle message' })
  }
})

// Start server
app.listen(PORT, () => {
  console.log(`Fastidious MCP HTTP server running on port ${PORT}`)
  console.log(`Fastidious API URL: ${FASTIDIOUS_URL}`)
  console.log(`\nEndpoints:`)
  console.log(`  GET  /health - Health check`)
  console.log(`  GET  /sse?token=TOKEN - SSE endpoint for MCP`)
  console.log(`  POST /message - Message endpoint for SSE transport`)
})
