import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createServer } from 'node:http'
import test from 'node:test'

test('active gathers use a single instant, preserve order and restrict output', async (t) => {
  const now = Date.parse('2030-01-01T00:00:00Z')
  const requests = []
  let status = 200
  let payload = []
  const server = createServer((request, response) => {
    requests.push({ path: request.url, token: request.headers.authorization })
    response.writeHead(status, { 'Content-Type': 'application/json' })
    response.end(status === 200 ? JSON.stringify(payload) : 'private upstream details')
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const originalBase = process.env.TOGELLO_API_BASE_URL
  const originalToken = process.env.TOGELLO_API_TOKEN
  process.env.TOGELLO_API_BASE_URL = `http://127.0.0.1:${server.address().port}`
  process.env.TOGELLO_API_TOKEN = 'test-environment-token'
  t.after(async () => {
    t.mock.restoreAll()
    if (originalBase === undefined) delete process.env.TOGELLO_API_BASE_URL
    else process.env.TOGELLO_API_BASE_URL = originalBase
    if (originalToken === undefined) delete process.env.TOGELLO_API_TOKEN
    else process.env.TOGELLO_API_TOKEN = originalToken
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
  })
  let clockCalls = 0
  t.mock.method(Date, 'now', () => { clockCalls++; return now })
  const { getActiveGathersHandler } = await import('../build/handlers/tool/getActiveGathersHandler.js')
  const { runWithUpstreamToken } = await import('../build/upstreamTokenContext.js')
  const base = {
    gatherUUID: '11111111-1111-4111-8111-111111111111', title: 'Example poll',
    mode: 'ADJUSTMENT', adjustmentStartDateTime: '2029-12-01T00:00:00Z',
    adjustmentEndDateTime: '2030-01-02T00:00:00Z',
    confirmedStartDateTime: null, confirmedEndDateTime: null,
    numberOfParticipants: 2, minNumberOfParticipants: 3, relationshipType: 'CREATOR',
  }
  const data = (result) => {
    assert.deepEqual(JSON.parse(result.content[0].text), result.structuredContent)
    return result.structuredContent
  }
  const cases = [
    [{}, true],
    [{ adjustmentEndDateTime: '2030-01-01T00:00:00Z' }, true],
    [{ adjustmentEndDateTime: '2029-12-31T23:59:59.999Z' }, false],
    [{ adjustmentEndDateTime: null }, false],
    [{ adjustmentEndDateTime: 'invalid' }, false],
    [{ mode: 'CONFIRM', confirmedStartDateTime: '2030-01-02T00:00:00Z' }, true],
    [{ mode: 'CONFIRM', confirmedStartDateTime: '2030-01-01T09:00:00+09:00' }, true],
    [{ mode: 'RECRUITMENT', confirmedStartDateTime: '2030-01-02T00:00:00Z' }, true],
    [{ mode: 'RECRUITMENT', confirmedStartDateTime: '2030-01-01T00:00:00Z' }, true],
    [{ mode: 'CONFIRM', confirmedStartDateTime: '2029-12-31T23:59:59Z', confirmedEndDateTime: '2030-01-02T00:00:00Z' }, false],
    [{ mode: 'RECRUITMENT', confirmedStartDateTime: '2029-12-31T23:59:59Z' }, false],
    [{ confirmedStartDateTime: 'invalid' }, false],
    [{ adjustmentEndDateTime: undefined }, false],
  ]
  payload = cases.map(([overrides], index) => ({ ...base, ...overrides, title: `Example ${index}`, detail: 'private details', gatherHistoryUUID: 'private history', participants: ['private name'] }))
  const before = clockCalls
  const result = await runWithUpstreamToken('test-request-token', getActiveGathersHandler)
  assert.notEqual(result.isError, true)
  assert.equal(clockCalls - before, 1)
  const expected = payload.filter((_, index) => cases[index][1]).map((item) => Object.fromEntries(Object.keys(base).map((key) => [key, item[key]])))
  assert.deepEqual(data(result), { gathers: expected })
  assert.deepEqual(requests.at(-1), { path: '/v2/gathers', token: 'Bearer test-request-token' })
  payload = []
  assert.deepEqual(data(await getActiveGathersHandler()), { gathers: [] })
  for (status of [401, 403, 500]) {
    const failure = await getActiveGathersHandler()
    assert.equal(failure.isError, true)
    assert.deepEqual(data(failure), { error: { message: 'Error retrieving active gathers' } })
  }
  status = 200
  payload = {}
  assert.equal((await getActiveGathersHandler()).isError, true)
  delete process.env.TOGELLO_API_TOKEN
  const requestCount = requests.length
  assert.equal((await getActiveGathersHandler()).isError, true)
  assert.equal(requests.length, requestCount)
  process.env.TOGELLO_API_TOKEN = 'test-environment-token'
  server.closeAllConnections()
  await new Promise((resolve) => server.close(resolve))
  assert.equal((await getActiveGathersHandler()).isError, true)
})
