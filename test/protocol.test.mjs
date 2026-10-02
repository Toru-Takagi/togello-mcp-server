import assert from 'node:assert/strict'
import { once } from 'node:events'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { test } from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'
import {
  Client,
  StreamableHTTPClientTransport,
} from '@modelcontextprotocol/client'
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio'
import { Client as LegacyClient } from 'mcp-sdk-v1/client/index.js'
import { SSEClientTransport } from 'mcp-sdk-v1/client/sse.js'
import { StdioClientTransport as LegacyStdioTransport } from 'mcp-sdk-v1/client/stdio.js'
import { StreamableHTTPClientTransport as LegacyHttpTransport } from 'mcp-sdk-v1/client/streamableHttp.js'

const baseline = JSON.parse(
  await readFile(new URL('./fixtures/v1-tools.json', import.meta.url), 'utf8'),
)
const identity = { name: 'togello-protocol-test', version: '1.0.0' }
const modernOptions = { versionNegotiation: { mode: { pin: '2026-07-28' } } }

function normalizeSchema(value, root = value) {
  if (Array.isArray(value))
    return value.map((item) => normalizeSchema(item, root))
  if (value === null || typeof value !== 'object') return value
  let node = { ...value }
  if (node.$ref) {
    const { $ref, ...rest } = node
    const target = $ref
      .slice(2)
      .split('/')
      .reduce((item, key) => item[key], root)
    node = { ...target, ...rest }
  }
  if (Array.isArray(node.type) && node.type.includes('null')) {
    node.type = node.type.find((type) => type !== 'null')
    node.nullable = true
  }
  if (
    node.anyOf?.length === 2 &&
    node.anyOf.some((item) => item.type === 'null')
  ) {
    const { anyOf, ...rest } = node
    const nonNull = anyOf.find((item) => item.type !== 'null')
    node = { ...nonNull, ...rest, nullable: true }
  }
  return Object.fromEntries(
    Object.entries(node)
      .filter(
        ([key]) =>
          key !== '$schema' &&
          key !== 'additionalProperties' &&
          !(key === 'pattern' && ['uuid', 'date-time'].includes(node.format)),
      )
      .map(([key, item]) => [key, normalizeSchema(item, root)]),
  )
}

function toolContract(tool) {
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: normalizeSchema(tool.inputSchema),
    annotations: tool.annotations,
  }
}

function resultData(result) {
  const text = JSON.parse(
    result.content.find((item) => item.type === 'text').text,
  )
  assert.deepEqual(result.structuredContent, text)
  return text
}

test(
  'protocol migration preserves transports, tool contracts and request isolation',
  { timeout: 60000 },
  async (t) => {
    const requests = []
    const api = createServer(async (req, res) => {
      const chunks = []
      for await (const chunk of req) chunks.push(chunk)
      const body = Buffer.concat(chunks).toString()
      requests.push({
        method: req.method,
        path: req.url,
        token: req.headers.authorization,
        body: body ? JSON.parse(body) : null,
      })
      if (req.headers.authorization === 'Bearer token-A') await delay(30)
      res.setHeader('Content-Type', 'application/json')
      if (req.headers.authorization === 'Bearer invalid-token') {
        res.writeHead(401).end(JSON.stringify({ error: 'invalid token' }))
      } else if (req.url === '/v2/integration/categories') {
        res.end(
          JSON.stringify([
            { categoryUUID: null, label: req.headers.authorization },
          ]),
        )
      } else if (req.method === 'GET') {
        res.end('[]')
      } else {
        res.end()
      }
    })
    api.listen(0, '127.0.0.1')
    await once(api, 'listening')
    const apiUrl = `http://127.0.0.1:${api.address().port}`
    const originalBase = process.env.TOGELLO_API_BASE_URL
    const originalToken = process.env.TOGELLO_API_TOKEN
    process.env.TOGELLO_API_BASE_URL = apiUrl
    process.env.TOGELLO_API_TOKEN = 'environment-token'
    const { startRemoteServer } = await import('../build/remoteServer.js')
    const server = await startRemoteServer({
      host: '127.0.0.1',
      port: 0,
      authMode: 'passthrough',
      publicBaseUrl: 'https://mcp.example.test',
      oauthIssuer: 'https://api.example.test',
      openaiAppsChallengeToken: 'test-domain-challenge',
    })
    const base = `http://127.0.0.1:${server.address().port}`
    const clients = []
    t.after(async () => {
      await Promise.all(clients.map((client) => client.close()))
      server.closeAllConnections()
      api.closeAllConnections()
      await Promise.all([
        new Promise((resolve) => server.close(resolve)),
        new Promise((resolve) => api.close(resolve)),
      ])
      if (originalBase === undefined)
        Reflect.deleteProperty(process.env, 'TOGELLO_API_BASE_URL')
      else process.env.TOGELLO_API_BASE_URL = originalBase
      if (originalToken === undefined)
        Reflect.deleteProperty(process.env, 'TOGELLO_API_TOKEN')
      else process.env.TOGELLO_API_TOKEN = originalToken
    })

    const captured = []
    const connectModern = async (token, extraHeaders = {}) => {
      const client = new Client(identity, modernOptions)
      clients.push(client)
      const transport = new StreamableHTTPClientTransport(
        new URL(`${base}/mcp`),
        {
          requestInit: {
            headers: { Authorization: `Bearer ${token}`, ...extraHeaders },
          },
          fetch: async (input, init) => {
            if (init?.body)
              captured.push({
                body: JSON.parse(init.body),
                headers: Object.fromEntries(new Headers(init.headers)),
              })
            const response = await fetch(input, init)
            assert.equal(response.headers.get('mcp-session-id'), null)
            return response
          },
        },
      )
      await client.connect(transport)
      assert.equal(client.getProtocolEra(), 'modern')
      return client
    }
    const modern = await connectModern('token-A')
    const legacyTransport = new LegacyHttpTransport(new URL(`${base}/mcp`), {
      requestInit: { headers: { Authorization: 'Bearer legacy-token' } },
    })
    const legacy = new LegacyClient(identity)
    clients.push(legacy)
    await legacy.connect(legacyTransport)

    await t.test(
      'modern HTTP and SDK v1 HTTP expose all 12 existing tool contracts',
      async () => {
        assert.equal(typeof legacyTransport.sessionId, 'string')
        for (const client of [modern, legacy]) {
          const tools = await client.listTools()
          assert.deepEqual(
            tools.tools.map(toolContract),
            baseline.tools.map(toolContract),
          )
          const read = await client.callTool({
            name: 'get-todo-category-list',
            arguments: {},
          })
          const expected =
            client === modern ? 'Bearer token-A' : 'Bearer legacy-token'
          assert.equal(resultData(read).categories[0].label, expected)
          const write = await client.callTool({
            name: 'create-task',
            arguments: { taskName: 'migration task', status: 'TODO' },
          })
          assert.equal(resultData(write).created, true)
          assert.deepEqual(requests.at(-1), {
            method: 'POST',
            path: '/v2/integration/todo',
            token: expected,
            body: { label: 'migration task', status: 'TODO' },
          })
        }
      },
    )

    await t.test(
      'concurrent modern requests use only their own tokens, including with a legacy session ID',
      async () => {
        const other = await connectModern('token-B', {
          'Mcp-Session-Id': legacyTransport.sessionId,
        })
        const [a, b] = await Promise.all(
          [modern, other].map((client) =>
            client.callTool({ name: 'get-todo-category-list', arguments: {} }),
          ),
        )
        assert.equal(resultData(a).categories[0].label, 'Bearer token-A')
        assert.equal(resultData(b).categories[0].label, 'Bearer token-B')
        const call = captured.find(
          (entry) =>
            entry.body.method === 'tools/call' &&
            entry.body.params.name === 'get-todo-category-list',
        )
        const post = (headers) =>
          fetch(`${base}/mcp`, {
            method: 'POST',
            headers: { ...call.headers, ...headers },
            body: JSON.stringify(call.body),
          })
        const changed = await post({ authorization: 'Bearer rotated-token' })
        assert.equal(changed.status, 200)
        assert.equal(
          (await changed.json()).result.content[0].text.includes(
            'Bearer rotated-token',
          ),
          true,
        )
        for (const token of ['', 'Basic invalid', 'Bearer ']) {
          const before = requests.length
          const missing = await post({
            authorization: token,
            'mcp-session-id': legacyTransport.sessionId,
          })
          assert.equal(missing.status, 401)
          assert.equal(
            missing.headers.get('www-authenticate'),
            'Bearer resource_metadata="https://mcp.example.test/.well-known/oauth-protected-resource/mcp"',
          )
          assert.equal(requests.length, before)
          await missing.body.cancel()
        }
        assert.equal(
          requests.some(
            (request) => request.token === 'Bearer environment-token',
          ),
          false,
        )
      },
    )

    await t.test(
      'modern protocol errors cannot fall back to a legacy session',
      async () => {
        const call = captured.find(
          (entry) => entry.body.method === 'tools/call',
        )
        for (const change of [
          { headers: { 'mcp-method': 'tools/list' }, code: -32020 },
          { headers: { 'mcp-name': 'wrong-tool' }, code: -32020 },
          { headers: { 'mcp-protocol-version': '' }, code: -32020 },
          {
            body: { jsonrpc: '2.0', id: 9, method: 'tools/list' },
            code: -32602,
          },
        ]) {
          const before = requests.length
          const response = await fetch(`${base}/mcp`, {
            method: 'POST',
            headers: {
              ...call.headers,
              'mcp-session-id': legacyTransport.sessionId,
              ...change.headers,
            },
            body: JSON.stringify(change.body ?? call.body),
          })
          assert.equal(response.status, 400)
          assert.equal((await response.json()).error.code, change.code)
          assert.equal(requests.length, before)
        }
      },
    )

    await t.test(
      'input validation and errors preserve tool behavior',
      async () => {
        for (const client of [modern, legacy]) {
          for (const args of [0, -1, 301, 1.5, '10']) {
            const before = requests.length
            const result = await client.callTool({
              name: 'get-activity-log-list',
              arguments: { limit: args },
            })
            assert.equal(result.isError, true)
            assert.equal(requests.length, before)
          }
          const invalid = await client.callTool({
            name: 'update-task',
            arguments: { todoUUID: 'invalid' },
          })
          assert.equal(invalid.isError, true)
          for (const date of [
            '2026-02-30T12:00:00Z',
            '2026-10-02',
            'invalid',
          ]) {
            const before = requests.length
            const result = await client.callTool({
              name: 'get-tasks-list',
              arguments: { completedStartDate: date },
            })
            assert.equal(result.isError, true)
            assert.equal(requests.length, before)
          }
          const compatibleUuid = '12345678-1234-0234-0234-123456789abc'
          const update = await client.callTool({
            name: 'update-task',
            arguments: { todoUUID: compatibleUuid, categoryUUID: null },
          })
          assert.notEqual(update.isError, true)
          assert.equal(requests.at(-1).body.categoryUUID, null)
          const completed = await client.callTool({
            name: 'get-tasks-list',
            arguments: {
              completionStatus: 'COMPLETED',
              completedStartDate: '2026-10-01T01:02Z',
              completedEndDate: '2026-10-02T01:02:03+0900',
            },
          })
          assert.notEqual(completed.isError, true)
        }
        const invalidClient = await connectModern('invalid-token')
        const failure = await invalidClient.callTool({
          name: 'create-task',
          arguments: { taskName: 'rejected' },
        })
        assert.equal(failure.isError, true)
        assert.equal(resultData(failure).error.message, 'Error creating task')
      },
    )

    await t.test(
      'stdio supports modern and SDK v1 clients with the same tools and read/write behavior',
      async () => {
        for (const [ClientType, TransportType, options] of [
          [Client, StdioClientTransport, modernOptions],
          [LegacyClient, LegacyStdioTransport, undefined],
        ]) {
          const client = new ClientType(identity, options)
          clients.push(client)
          await client.connect(
            new TransportType({
              command: process.execPath,
              args: [new URL('../build/index.js', import.meta.url).pathname],
              env: {
                TOGELLO_API_BASE_URL: apiUrl,
                TOGELLO_API_TOKEN: 'stdio-token',
              },
            }),
          )
          assert.deepEqual(
            (await client.listTools()).tools.map(toolContract),
            baseline.tools.map(toolContract),
          )
          const read = await client.callTool({
            name: 'get-todo-category-list',
            arguments: {},
          })
          assert.equal(
            resultData(read).categories[0].label,
            'Bearer stdio-token',
          )
          const write = await client.callTool({
            name: 'create-task',
            arguments: { taskName: 'stdio task' },
          })
          assert.equal(resultData(write).created, true)
          await client.close()
        }
      },
    )

    await t.test(
      'SDK v1 SSE client can initialize, list, read and write through /message',
      async () => {
        const client = new LegacyClient(identity)
        clients.push(client)
        const headers = { Authorization: 'Bearer sse-token' }
        await client.connect(
          new SSEClientTransport(new URL(`${base}/sse`), {
            requestInit: { headers },
            eventSourceInit: {
              fetch: (input, init) =>
                fetch(input, {
                  ...init,
                  headers: { ...init.headers, ...headers },
                }),
            },
          }),
        )
        assert.deepEqual(
          (await client.listTools()).tools.map(toolContract),
          baseline.tools.map(toolContract),
        )
        const read = await client.callTool({
          name: 'get-todo-category-list',
          arguments: {},
        })
        assert.equal(resultData(read).categories[0].label, 'Bearer sse-token')
        const write = await client.callTool({
          name: 'create-task',
          arguments: { taskName: 'SSE task' },
        })
        assert.equal(resultData(write).created, true)
        await client.close()
      },
    )

    await t.test(
      'env mode uses its configured token for modern requests',
      async () => {
        const shared = await startRemoteServer({
          host: '127.0.0.1',
          port: 0,
          authMode: 'env',
          publicBaseUrl: 'https://mcp.example.test',
          oauthIssuer: 'https://api.example.test',
        })
        const client = new Client(identity, modernOptions)
        try {
          await client.connect(
            new StreamableHTTPClientTransport(
              new URL(`http://127.0.0.1:${shared.address().port}/mcp`),
            ),
          )
          const result = await client.callTool({
            name: 'get-todo-category-list',
            arguments: {},
          })
          assert.equal(
            resultData(result).categories[0].label,
            'Bearer environment-token',
          )
        } finally {
          await client.close()
          shared.closeAllConnections()
          await new Promise((resolve) => shared.close(resolve))
        }
      },
    )

    await t.test(
      'body limit, malformed JSON, CORS and metadata remain available',
      async () => {
        for (const headers of [{}, { 'MCP-Protocol-Version': '2026-07-28' }]) {
          const response = await fetch(`${base}/mcp`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer token-A',
              ...headers,
            },
            body: JSON.stringify({ data: 'x'.repeat(1_000_001) }),
          })
          assert.equal(response.status, 413)
          await response.body.cancel()
        }
        const malformed = await fetch(`${base}/mcp`, {
          method: 'POST',
          body: '{',
          headers: { 'Content-Type': 'application/json' },
        })
        assert.equal(malformed.status, 400)
        await malformed.body.cancel()
        const preflight = await fetch(`${base}/mcp`, { method: 'OPTIONS' })
        assert.equal(preflight.status, 204)
        const allowed = preflight.headers
          .get('access-control-allow-headers')
          .toLowerCase()
        for (const header of [
          'authorization',
          'mcp-protocol-version',
          'mcp-method',
          'mcp-name',
        ])
          assert.ok(allowed.includes(header))
        const metadata = await (
          await fetch(`${base}/.well-known/oauth-protected-resource/mcp`)
        ).json()
        assert.equal(metadata.resource, 'https://mcp.example.test/mcp')
        assert.deepEqual(metadata.authorization_servers, [
          'https://api.example.test',
        ])
        const issuer = await (
          await fetch(`${base}/.well-known/oauth-authorization-server/mcp`)
        ).json()
        assert.equal(issuer.issuer, 'https://api.example.test')
        assert.equal(
          await (
            await fetch(`${base}/.well-known/openai-apps-challenge`)
          ).text(),
          'test-domain-challenge',
        )
      },
    )

    await t.test(
      'legacy HTTP GET and DELETE preserve session lifecycle and permit reconnection',
      async () => {
        const controller = new AbortController()
        const stream = await fetch(`${base}/mcp`, {
          headers: {
            Accept: 'text/event-stream',
            'Mcp-Session-Id': legacyTransport.sessionId,
          },
          signal: controller.signal,
        })
        assert.equal(stream.status, 409)
        controller.abort()
        await stream.body.cancel().catch(() => undefined)
        const sessionId = legacyTransport.sessionId
        await legacyTransport.terminateSession()
        const stale = await fetch(`${base}/mcp`, {
          headers: { 'Mcp-Session-Id': sessionId },
        })
        assert.equal(stale.status, 404)
        await stale.body.cancel()
        const next = new LegacyClient(identity)
        clients.push(next)
        await next.connect(
          new LegacyHttpTransport(new URL(`${base}/mcp`), {
            requestInit: {
              headers: { Authorization: 'Bearer reconnect-token' },
            },
          }),
        )
        assert.equal((await next.listTools()).tools.length, 12)
      },
    )
  },
)
