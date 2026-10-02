# Togello MCP Server

Togello MCP Server exposes Togello tasks, categories, calendar memos, Google Calendar events, activity items, and activity logs through the Model Context Protocol.

https://togello.com/sign

## Requirements

- Node.js 22 or later
- A Togello API token

## Protocol compatibility

The server uses MCP TypeScript SDK v2. Stdio and `/mcp` support the MCP `2026-07-28` protocol and legacy clients using the `initialize` handshake. The `/mcp` endpoint retains sessions for legacy clients; modern requests are stateless. `/sse` and `/message` remain available for legacy clients.

Modern remote requests must each include an `Authorization: Bearer ...` header. Their credentials are isolated per request, including when a legacy session ID is supplied. Legacy connections retain the token provided when their session was created. The existing OAuth metadata URLs and authentication modes are unchanged.

MCP Events are not implemented.

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

`passthrough` auth uses the connecting user's Togello API token from the `Authorization: Bearer ...` header. Modern requests require this header on every request; legacy sessions retain the connection's token. Use this mode for published remote MCP servers.

`env` auth uses one server-side `TOGELLO_API_TOKEN` for every remote client. It is intended only for trusted local or single-user deployments. When binding to a non-local host, `TOGELLO_MCP_AUTH_MODE=env` also requires `TOGELLO_MCP_ALLOW_ENV_AUTH=true` so public deployments cannot enable shared-token auth by accident.

ChatGPT developer mode can add remote MCP servers that use SSE. For production ChatGPT apps or connectors, use `passthrough` auth or a deployment that authenticates each user separately before forwarding requests to Togello.

Remote mode serves OAuth authorization server metadata from `/.well-known/oauth-authorization-server` and `/.well-known/oauth-authorization-server/mcp` using the Togello OAuth issuer configured with `TOGELLO_OAUTH_ISSUER` or `TOGELLO_API_BASE_URL`.

Remote OAuth clients that connect to `/mcp` should discover protected resource metadata at `/.well-known/oauth-protected-resource/mcp`. That metadata returns `resource` as the full MCP endpoint URL, such as `https://your-domain.example/mcp`. Unauthenticated `/mcp` requests include a `WWW-Authenticate` challenge whose `resource_metadata` value points to that `/mcp` metadata path.

The configured OAuth issuer must be an origin URL without a path component.

For OpenAI Apps domain verification, set `TOGELLO_MCP_OPENAI_APPS_CHALLENGE_TOKEN` to the verification token. Remote mode then serves it from `/.well-known/openai-apps-challenge` as `text/plain`. If both `TOGELLO_MCP_OPENAI_APPS_CHALLENGE_TOKEN` and `OPENAI_APPS_CHALLENGE_TOKEN` are set, the Togello-scoped variable takes precedence.

## Tools

All tools set MCP `readOnlyHint`, `openWorldHint`, and `destructiveHint` annotations explicitly. Read-only tools return stable JSON in both `structuredContent` and text content.

- `get-tasks-list`: Retrieves TODO tasks. By default it retrieves incomplete tasks. Optional `categoryUUIDs` filters by category UUID. Use `completionStatus: "COMPLETED"` with both `completedStartDate` and `completedEndDate` in RFC3339 format to retrieve tasks completed during a period.
- `get-calendar-date-memo`: Retrieves a calendar date memo for a `YYYY-MM-DD` date.
- `get-todo-category-list`: Retrieves TODO categories.
- `get-today-calendar`: Retrieves linked Google Calendar events and scheduled tasks.
- `get-activity-item-list`: Retrieves enabled activity items.
- `get-activity-log-list`: Retrieves activity logs.
- `get-japan-current-time`: Returns the current time in Japan.

Write tools return JSON. Failed tool responses also return JSON and are marked with `isError: true`. Tools that can overwrite existing private Togello data set `destructiveHint: true`; create/start tools set `destructiveHint: false`.

- `create-task`: Creates a TODO task.
- `update-task`: Updates a TODO task, including category assignment or removal.
- `update-calendar-date-memo`: Updates or clears a calendar date memo.
- `start-activity-log`: Starts an activity log.
- `complete-activity-log`: Completes an activity log.

## Development

```bash
npm ci
npm test
```

The protocol tests exercise SDK v2 modern clients and SDK v1.29.0 legacy clients over stdio, Streamable HTTP, and legacy SSE against a local mock API. They verify the 12 existing tool contracts, read/write results, request credential isolation, protocol header errors, body limits, metadata, and legacy session lifecycle. `test/fixtures/v1-tools.json` records `tools/list` from server 1.0.42 at commit `558c2c2fda81f7c8b20f443afa1bf5e554a72dad`; comparisons allow the SDK's JSON Schema dialect and wire-format changes.

SDK-facing schemas use Zod 4. UUID fields retain the prior permissive UUID syntax, and date-time fields retain their previous Zod 3 validation through the compatibility export included in the Zod package.

## MCP Review

Certified
https://mcpreview.com/mcp-servers/toru-takagi/togello-mcp-server

## Publish

```bash
npm run build
npm version patch
npm publish --access public
```
