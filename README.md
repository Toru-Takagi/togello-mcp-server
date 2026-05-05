# Togello MCP Server

Togello MCP Server exposes Togello tasks, categories, calendar memos, Google Calendar events, activity items, and activity logs through the Model Context Protocol.

https://togello.com/sign

## Requirements

- Node.js 22 or later
- A Togello API token

## Local MCP With npm

Use this for desktop clients and local developer tools that launch MCP servers over stdio.

```json
{
  "mcpServers": {
    "togello": {
      "command": "npx",
      "args": ["-y", "togello-mcp-server"],
      "env": {
        "TOGELLO_API_TOKEN": "replace_with_your_token"
      }
    }
  }
}
```

## Remote MCP

Remote mode exposes a Streamable HTTP endpoint at `/mcp`. It also keeps the legacy SSE endpoint at `/sse` and message endpoint at `/message` for older MCP clients.

```bash
TOGELLO_MCP_MODE=remote \
TOGELLO_MCP_AUTH_MODE=passthrough \
TOGELLO_MCP_HOST=0.0.0.0 \
TOGELLO_MCP_PORT=8081 \
npm start
```

Connect remote MCP clients to:

```text
https://your-domain.example/mcp
```

`passthrough` auth expects each remote client request to send its own Togello API token as an `Authorization: Bearer ...` header. Use this mode for published remote MCP servers.

`env` auth uses one server-side `TOGELLO_API_TOKEN` for every remote client. It is intended only for trusted local or single-user deployments. When binding to a non-local host, `TOGELLO_MCP_AUTH_MODE=env` also requires `TOGELLO_MCP_ALLOW_ENV_AUTH=true` so public deployments cannot enable shared-token auth by accident.

ChatGPT developer mode can add remote MCP servers that use SSE. For production ChatGPT apps or connectors, use `passthrough` auth or a deployment that authenticates each user separately before forwarding requests to Togello.

Remote mode redirects OAuth authorization server metadata discovery paths at `/.well-known/oauth-authorization-server` and `/.well-known/oauth-authorization-server/mcp` to the Togello OAuth issuer configured with `TOGELLO_OAUTH_ISSUER` or `TOGELLO_API_BASE_URL`.

Remote OAuth clients that connect to `/mcp` should discover protected resource metadata at `/.well-known/oauth-protected-resource/mcp`. That metadata returns `resource` as the full MCP endpoint URL, such as `https://your-domain.example/mcp`. Unauthenticated `/mcp` requests include a `WWW-Authenticate` challenge whose `resource_metadata` value points to that `/mcp` metadata path.

The configured OAuth issuer must be an origin URL without a path component.

For OpenAI Apps domain verification, set `TOGELLO_MCP_OPENAI_APPS_CHALLENGE_TOKEN` to the verification token. Remote mode then serves it from `/.well-known/openai-apps-challenge` as `text/plain`. If both `TOGELLO_MCP_OPENAI_APPS_CHALLENGE_TOKEN` and `OPENAI_APPS_CHALLENGE_TOKEN` are set, the Togello-scoped variable takes precedence.

## Tools

Read-only tools include MCP `readOnlyHint` annotations and return stable JSON in both `structuredContent` and text content.

- `get-tasks-list`: Retrieves incomplete TODO tasks. Optional `categoryUUIDs` filters by category UUID.
- `get-calendar-date-memo`: Retrieves a calendar date memo for a `YYYY-MM-DD` date.
- `get-todo-category-list`: Retrieves TODO categories.
- `get-today-calendar`: Retrieves linked Google Calendar events and scheduled tasks.
- `get-activity-item-list`: Retrieves enabled activity items.
- `get-activity-log-list`: Retrieves activity logs.
- `get-japan-current-time`: Returns the current time in Japan.

Write tools return JSON. Failed tool responses also return JSON and are marked with `isError: true`.

- `create-task`: Creates a TODO task.
- `update-task`: Updates a TODO task.
- `update-calendar-date-memo`: Updates or clears a calendar date memo.
- `start-activity-log`: Starts an activity log.
- `complete-activity-log`: Completes an activity log.

## Development

```bash
npm install
npm run build
```

## MCP Review

Certified
https://mcpreview.com/mcp-servers/toru-takagi/togello-mcp-server

## Publish

```bash
npm run build
npm version patch
npm publish --access public
```
