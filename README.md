# Togello MCP Server

Togello MCP Server exposes Togello tasks, categories, calendar memos, Google Calendar events, activity items, and activity logs through the Model Context Protocol.

https://togello.com/sign

## Requirements

- Node.js 24.22.1 or later
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

Clients that use `list-active-scheduling-polls` must explicitly include `gathers:read` in the OAuth authorization request alongside the scopes they already need. For an existing connection without `gathers:read`, start a new authorization from the client's reconnect or reauthorize flow and approve the scope on the Togello consent screen. Existing grants keep their original scopes on refresh. Continue requesting `offline_access` when the client needs a refresh token. For stdio or `env` mode, provide the resulting OAuth access token as `TOGELLO_API_TOKEN` to use this tool.

The tool advertises `gathers:read` in its OAuth security metadata. In remote passthrough mode, a scope denial from the Togello API includes an `insufficient_scope` challenge so clients that support tool-level OAuth can offer reauthorization.

For OpenAI Apps domain verification, set `TOGELLO_MCP_OPENAI_APPS_CHALLENGE_TOKEN` to the verification token. Remote mode then serves it from `/.well-known/openai-apps-challenge` as `text/plain`. If both `TOGELLO_MCP_OPENAI_APPS_CHALLENGE_TOKEN` and `OPENAI_APPS_CHALLENGE_TOKEN` are set, the Togello-scoped variable takes precedence.

### Muse host verification (provisional)

Remote mode supports an independent opt-in `TOGELLO_MCP_MUSE_CHALLENGE_TOKEN`.
Unset or empty disables the route. A configured token must contain 1–256 ASCII
letters, digits, underscores or hyphens; whitespace, dots, slashes, percent escapes
and other characters are rejected at startup without logging the value. Values
are never trimmed or decoded. There is no fallback to the OpenAI Apps token.

With the explicit dummy token `dummy-muse-token`, only
`GET /.well-known/muse-challenge/dummy-muse-token` returns HTTP 200,
`Content-Type: text/plain; charset=utf-8`, `Cache-Control: no-store` and exactly
`muse-challenge=dummy-muse-token` (no newline). It requires no authentication and
performs no redirect or upstream/file lookup. Other tokens, query strings,
encoded or normalized path variants, and other methods receive 404. Existing
OpenAI Apps verification, OAuth metadata and MCP authentication remain independent.

The [official connector guidelines](https://platform.muse.ai/docs) describe the
submission process. The exact challenge path and body above follow an
[applicant's first-hand report](https://reviewtimes.fyi/muse#how-review-works),
not a confirmed official wire specification. Before enabling this setting,
compare the actual submission UI's issued URL, token and required body with this
provisional contract. If the format differs or the token fails validation, leave
it disabled and update the implementation; do not weaken validation or guess a
value. No real challenge has been issued or verified by this implementation.

The MCP handler does not log challenge values or request paths. Reverse proxies,
CDNs and hosting access logs are outside this handler's control; ensure their
logging policy also protects the token before enabling verification. Remove the
setting after verification or expiration and restart the server.

## Tools

All tools set MCP `readOnlyHint`, `openWorldHint`, and `destructiveHint` annotations explicitly. Read-only tools return stable JSON in both `structuredContent` and text content.

- `get-tasks-list`: Retrieves TODO tasks. By default it retrieves incomplete tasks. Optional `categoryUUIDs` filters by category UUID. Use `completionStatus: "COMPLETED"` with both `completedStartDate` and `completedEndDate` in RFC3339 format to retrieve tasks completed during a period.
- `get-calendar-date-memo`: Retrieves a calendar date memo for a `YYYY-MM-DD` date.
- `get-todo-category-list`: Retrieves TODO categories.
- `get-today-calendar`: Retrieves linked Google Calendar events and scheduled tasks.
- `get-activity-item-list`: Retrieves enabled activity items.
- `get-activity-log-list`: Retrieves activity logs.
- `list-active-scheduling-polls`: Lists active scheduling polls (ADJUSTMENT), confirmed events (CONFIRM), and recruitments (RECRUITMENT) created or previously viewed by the authenticated user, using `GET /v2/integration/gathers` with a Togello OAuth access token granted `gathers:read`. Takes no arguments. Unconfirmed polls are active through their adjustment end time; confirmed events and recruitments are active through their start time, inclusive. Already-started events are excluded even if they have not ended. Missing or invalid eligibility dates are excluded. Results retain API ordering and contain only UUID, title, mode, adjustment and confirmed timestamps, participant counts, and relationship type. Returns `{ "gathers": [] }` when none qualify; API failures are errors.
- `get-japan-current-time`: Returns the current time in Japan.

The former tool ID `get-active-gathers` has been replaced by `list-active-scheduling-polls`; clients that store the old ID must update it. No compatibility alias is provided.

Write tools return JSON. Failed tool responses also return JSON and are marked with `isError: true`. Tools that can overwrite existing private Togello data set `destructiveHint: true`; create/start tools set `destructiveHint: false`.

- `create-task`: Creates a TODO task.
- `update-task`: Updates a TODO task, including category assignment or removal.
- `delete-task`: Permanently deletes one TODO task by `todoUUID` from `get-tasks-list`. Use `update-task` with `status: "DONE"` to complete a task. To find completed tasks for deletion, use `completionStatus: "COMPLETED"`. This destructive, idempotent tool returns `{ "todoUUID": "...", "deleted": true }` after a successful API response, including when no task owned by the caller matches. Success does not prove that a task previously existed. Ambiguous targets must be clarified before deletion.
- `update-calendar-date-memo`: Updates or clears a calendar date memo.
- `start-activity-log`: Starts an activity log.
- `complete-activity-log`: Completes an activity log.

## Development

With [mise](https://mise.jdx.dev/) installed, trust this repository's configuration once:

```bash
mise trust
```

Then build or run the tests:

```bash
mise run build
mise run test
```

These tasks install the Node.js version pinned in `mise.toml` and run `npm ci --include=dev` before building. TypeScript's `tsc` comes from the project's development dependencies; no global TypeScript installation is needed, including when `NODE_ENV=production` is set.

The protocol tests exercise SDK v2 modern clients and SDK v1.32.2 legacy clients over stdio, Streamable HTTP, and legacy SSE against a local mock API. They verify the 12 existing tool contracts and the added deletion and active scheduling poll tools, read/write/delete results, request credential isolation, protocol header errors, body limits, metadata, and legacy session lifecycle. `test/fixtures/v1-tools.json` records `tools/list` from server 1.0.42 at commit `558c2c2fda81f7c8b20f443afa1bf5e554a72dad`; comparisons allow the SDK's JSON Schema dialect and wire-format changes.

SDK-facing schemas use Zod 4. UUID fields retain the prior permissive UUID syntax, and date-time fields retain their previous Zod 3 validation through the compatibility export included in the Zod package.

## MCP Review

Certified
https://mcpreview.com/mcp-servers/toru-takagi/togello-mcp-server

## Publish

Run from the `main` branch of a regular checkout that is up to date with `origin/main`. After running `mise trust` once, use this command from an interactive terminal to publish a patch release:

```bash
mise run patch
```

You can also specify an exact version:

```bash
mise run release 1.0.51
```

The patch task chooses the next version above both the version on `main` and the highest stable version on npm. If the only local edits set both manifests to a higher, unpublished version, it uses that version instead.

The release task installs dependencies, builds and tests the server, and checks the current npm login. It prompts for login as needed. It updates `package.json` and `package-lock.json`, commits the version change, publishes from a temporary checkout of that commit, and pushes the release commit to `origin/main`. The working tree must be clean except for version edits in the two manifests. Publishing may require two-factor authentication.

If a release is interrupted, keep the release commit and rerun `mise run release <version>` with the version printed by the task. If npm already has that version, the task checks that its `gitHead` matches the release commit. If the push already succeeded, the task confirms the release without incrementing the version. If `origin/main` has moved to another commit, reconcile the release manually.

Run only one release per checkout. If a terminated process leaves `.git/togello-release.lock`, confirm no release is still running in that checkout before removing the empty directory.
