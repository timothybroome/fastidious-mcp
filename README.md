# Fastidious MCP Server

MCP (Model Context Protocol) server for Fastidious AI notes application.

## Deployment

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `FASTIDIOUS_URL` | Fastidious API base URL | `http://localhost:3000` |

### Deploy to Coolify

1. Create a new service in Coolify
2. Connect to this repository (or the standalone repo)
3. Set build pack to **Nixpacks** or **Dockerfile**
4. Configure environment variables:
   ```
   PORT=3001
   FASTIDIOUS_URL=https://blog.tjb.app
   ```
5. Set the domain to `mcp.tjb.app`
6. Deploy

### Docker

```bash
docker build -t fastidious-mcp .
docker run -p 3001:3001 -e FASTIDIOUS_URL=https://blog.tjb.app fastidious-mcp
```

## Usage

### Claude Desktop Configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "fastidious": {
      "url": "https://mcp.tjb.app/sse?token=YOUR_TOKEN_HERE"
    }
  }
}
```

Get your token from Fastidious AI Settings (sidebar → profile → Settings).

### Local Development (stdio mode)

For local testing with Claude Desktop:

```json
{
  "mcpServers": {
    "fastidious": {
      "command": "npx",
      "args": ["tsx", "/path/to/mcp-server/src/index.ts"],
      "env": {
        "FASTIDIOUS_TOKEN": "YOUR_TOKEN_HERE",
        "FASTIDIOUS_URL": "https://blog.tjb.app"
      }
    }
  }
}
```

## Available Tools

| Tool | Description |
|------|-------------|
| `create_note` | Create a new markdown note |
| `get_note` | Get a note by ID |
| `update_note` | Update a note |
| `delete_note` | Delete a note |
| `list_notes` | List all notes (with optional collection filter) |
| `search_notes` | Search notes by content |
| `create_collection` | Create a new collection |
| `get_collection` | Get a collection (with optional contents) |
| `list_collections` | List all collections |
| `add_to_collection` | Add notes to a collection |
| `remove_from_collection` | Remove notes from a collection |

## Architecture

```
Claude Desktop
    ↓ MCP Protocol (SSE)
MCP HTTP Server (mcp.tjb.app)
    ↓ HTTP + Bearer Token
Fastidious API (blog.tjb.app/api/mcp/*)
    ↓
User's Notes & Collections
```

## API Endpoints

- `GET /health` - Health check
- `GET /sse?token=TOKEN` - MCP SSE endpoint for Claude Desktop

## Internal Network (Docker/Coolify)

If running alongside Fastidious in the same Docker network:

```
FASTIDIOUS_URL=http://fastidious:3000
```

This avoids external network hops for better performance.
