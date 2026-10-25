import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createServer } from 'node:http'
import test from 'node:test'

test('deleteTaskHandler sends authenticated DELETE and reports only successful responses', async (t) => {
  const requests = []
  let status = 204
  const server = createServer(async (request, response) => {
    let body = ''
    for await (const chunk of request) body += chunk
    requests.push({
      method: request.method,
      path: request.url,
      authorization: request.headers.authorization,
      body,
    })
    response.writeHead(status)
    response.end(status >= 400 ? 'private upstream error details' : '')
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const originalBase = process.env.TOGELLO_API_BASE_URL
  const originalToken = process.env.TOGELLO_API_TOKEN
  process.env.TOGELLO_API_BASE_URL = `http://127.0.0.1:${server.address().port}`
  process.env.TOGELLO_API_TOKEN = 'test-environment-token'
  t.after(async () => {
    if (originalBase === undefined) delete process.env.TOGELLO_API_BASE_URL
    else process.env.TOGELLO_API_BASE_URL = originalBase
    if (originalToken === undefined) delete process.env.TOGELLO_API_TOKEN
    else process.env.TOGELLO_API_TOKEN = originalToken
    server.closeAllConnections()
    await new Promise((resolve) => server.close(resolve))
  })
  const { deleteTaskHandler } = await import('../build/handlers/tool/deleteTaskHandler.js')
  const { runWithUpstreamToken } = await import('../build/upstreamTokenContext.js')
  const todoUUID = '11111111-1111-4111-8111-111111111111'
  const data = (result) => {
    assert.deepEqual(JSON.parse(result.content[0].text), result.structuredContent)
    return result.structuredContent
  }

  for (const successStatus of [200, 204]) {
    status = successStatus
    const result = await runWithUpstreamToken('test-request-token', () => deleteTaskHandler({ todoUUID }))
    assert.notEqual(result.isError, true)
    assert.deepEqual(data(result), { todoUUID, deleted: true })
    assert.deepEqual(requests.at(-1), {
      method: 'DELETE',
      path: `/v2/integration/todo/${todoUUID}`,
      authorization: 'Bearer test-request-token',
      body: '',
    })
  }

  for (const failureStatus of [400, 401, 403, 404, 500]) {
    status = failureStatus
    const result = await deleteTaskHandler({ todoUUID })
    assert.equal(result.isError, true)
    assert.deepEqual(data(result), { error: { message: 'Error deleting task' } })
    assert.equal(requests.at(-1).authorization, 'Bearer test-environment-token')
  }

  delete process.env.TOGELLO_API_TOKEN
  const before = requests.length
  const missingToken = await deleteTaskHandler({ todoUUID })
  assert.equal(missingToken.isError, true)
  assert.equal(requests.length, before)

  process.env.TOGELLO_API_TOKEN = 'test-environment-token'
  server.closeAllConnections()
  await new Promise((resolve) => server.close(resolve))
  const networkFailure = await deleteTaskHandler({ todoUUID })
  assert.equal(networkFailure.isError, true)
  assert.deepEqual(data(networkFailure), { error: { message: 'Error deleting task' } })
})
