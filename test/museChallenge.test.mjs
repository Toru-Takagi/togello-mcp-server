import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { request } from 'node:http'
import { test } from 'node:test'
import { startRemoteServer } from '../build/remoteServer.js'

const token = 'dummy-muse-token_123'
const prefix = '/.well-known/muse-challenge/'
const options = {
  host: '127.0.0.1',
  port: 0,
  authMode: 'passthrough',
  publicBaseUrl: 'http://localhost',
  oauthIssuer: 'http://localhost',
  openaiAppsChallengeToken: 'dummy-openai-token',
}

async function start(t, museChallengeToken) {
  const server = await startRemoteServer({ ...options, museChallengeToken })
  t.after(async () => {
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
  })
  return server.address().port
}

function send(port, path, method = 'GET', headers = {}) {
  return new Promise((resolve, reject) => {
    const req = request(
      { host: '127.0.0.1', port, path, method, headers },
      (res) => {
        let body = ''
        res.setEncoding('utf8')
        res.on('data', (chunk) => {
          body += chunk
        })
        res.on('end', () =>
          resolve({ status: res.statusCode, headers: res.headers, body }),
        )
      },
    )
    req.on('error', reject)
    req.end()
  })
}

test('Muse serves only the configured raw GET path without auth or redirects', async (t) => {
  const logs = []
  t.mock.method(console, 'log', (...args) => logs.push(args.join(' ')))
  t.mock.method(console, 'error', (...args) => logs.push(args.join(' ')))
  const port = await start(t, token)
  const response = await send(port, `${prefix}${token}`)
  assert.equal(response.status, 200)
  assert.equal(response.headers['content-type'], 'text/plain; charset=utf-8')
  assert.equal(response.headers['cache-control'], 'no-store')
  assert.equal(response.headers.location, undefined)
  assert.equal(response.body, `muse-challenge=${token}`)
  assert.equal(
    (await send(port, `${prefix}${token}`, 'GET', { host: '[' })).status,
    200,
  )

  for (const path of [
    prefix,
    `${prefix}dummy-other-token`,
    `${prefix}${token}/`,
    `${prefix}${token}?query=dummy`,
    `${prefix}${token}?`,
    `${prefix}%64ummy-muse-token_123`,
    `${prefix}${token}%00`,
    `${prefix}../muse-challenge/${token}`,
    `${prefix}./${token}`,
    `${prefix}${token}/..`,
    `//.well-known/muse-challenge/${token}`,
    `${prefix}https://example.test/dummy`,
    `${prefix}file:///dummy`,
  ]) {
    const rejected = await send(port, path)
    assert.equal(rejected.status, 404)
    assert.equal(rejected.body, 'Not found')
    assert.equal(rejected.headers.location, undefined)
  }
  for (const method of ['HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
    const rejected = await send(port, `${prefix}${token}`, method)
    assert.equal(rejected.status, 404)
    assert.equal(rejected.body, method === 'HEAD' ? '' : 'Not found')
  }
  assert.equal(
    (await send(port, '/.well-known/openai-apps-challenge')).body,
    'dummy-openai-token',
  )
  for (const path of [
    '/.well-known/oauth-protected-resource/mcp',
    '/.well-known/oauth-authorization-server/mcp',
  ]) {
    assert.equal((await send(port, path)).status, 200)
  }
  assert.equal((await send(port, '/mcp')).status, 401)
  assert.equal((await send(port, '/sse')).status, 401)
  const malformed = await send(port, `http://[${prefix}${token}`)
  assert.equal(malformed.status, 500)
  assert.equal(malformed.body, 'Internal server error')
  assert.ok(
    logs.every((line) => !line.includes(token) && !line.includes(prefix)),
  )
})

test('Muse stays disabled without its own nonempty token', async (t) => {
  for (const value of [undefined, '']) {
    const port = await start(t, value)
    for (const candidate of [token, 'dummy-openai-token']) {
      const response = await send(port, `${prefix}${candidate}`)
      assert.equal(response.status, 404)
      assert.equal(response.body, 'Not found')
    }
    assert.equal(
      (await send(port, '/.well-known/openai-apps-challenge')).body,
      'dummy-openai-token',
    )
    assert.equal((await send(port, '/mcp')).status, 401)
  }
})

test('Muse rejects unsafe configuration without disclosing the value', async () => {
  for (const value of [
    ' ',
    ' dummy ',
    '../dummy',
    '.',
    '..',
    'dummy/token',
    'dummy\\token',
    'dummy%20token',
    'dummy?x',
    'dummy#x',
    'dummy=token',
    'dummy\r\nvalue',
    'dummy\n',
    'dummy\r',
    'dummy\u2028',
    'トークン',
    'a'.repeat(257),
  ]) {
    await assert.rejects(
      startRemoteServer({ ...options, museChallengeToken: value }),
      {
        message: 'Invalid TOGELLO_MCP_MUSE_CHALLENGE_TOKEN',
      },
    )
  }
})

test('Muse accepts the token length boundaries', async (t) => {
  for (const value of ['a', 'a'.repeat(256)]) {
    const port = await start(t, value)
    assert.equal(
      (await send(port, `${prefix}${value}`)).body,
      `muse-challenge=${value}`,
    )
  }
})

test('remote CLI validates its dedicated Muse environment variable without echoing it', async () => {
  const child = spawn(process.execPath, ['build/index.js', 'remote'], {
    env: {
      PATH: process.env.PATH,
      TOGELLO_MCP_HOST: '127.0.0.1',
      TOGELLO_MCP_PUBLIC_BASE_URL: 'http://localhost',
      TOGELLO_OAUTH_ISSUER: 'http://localhost',
      TOGELLO_MCP_MUSE_CHALLENGE_TOKEN: 'dummy/invalid-token',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  child.stdout.on('data', (chunk) => {
    output += chunk
  })
  child.stderr.on('data', (chunk) => {
    output += chunk
  })
  const code = await new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('close', resolve)
  })
  assert.equal(code, 1)
  assert.ok(output.includes('Invalid TOGELLO_MCP_MUSE_CHALLENGE_TOKEN'))
  assert.ok(!output.includes('dummy/invalid-token'))
})
