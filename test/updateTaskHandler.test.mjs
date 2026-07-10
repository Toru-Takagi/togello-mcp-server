import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createServer } from 'node:http'
import test from 'node:test'

test('updateTaskHandler forwards category assignments and removals', async () => {
  const requests = []
  const server = createServer(async (request, response) => {
    let body = ''
    for await (const chunk of request) {
      body += chunk
    }
    requests.push({
      method: request.method,
      url: request.url,
      authorization: request.headers.authorization,
      body: JSON.parse(body),
    })
    response.writeHead(204)
    response.end()
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')

  const address = server.address()
  assert.notEqual(address, null)
  assert.equal(typeof address, 'object')
  const originalBaseURL = process.env.TOGELLO_API_BASE_URL
  const originalToken = process.env.TOGELLO_API_TOKEN
  process.env.TOGELLO_API_BASE_URL = `http://127.0.0.1:${address.port}`
  process.env.TOGELLO_API_TOKEN = 'test-token'

  try {
    const { updateTaskHandler } = await import('../build/handlers/tool/updateTaskHandler.js')
    const todoUUID = 'e523ed88-6f60-4c4a-95c0-65eebd9712ee'
    const categoryUUID = '171409cc-a7aa-4081-8267-931a229e11ba'

    await updateTaskHandler({ todoUUID, categoryUUID })
    await updateTaskHandler({ todoUUID, categoryUUID: null })

    assert.deepEqual(requests, [
      {
        method: 'PUT',
        url: `/v2/integration/todo/${todoUUID}`,
        authorization: 'Bearer test-token',
        body: { categoryUUID },
      },
      {
        method: 'PUT',
        url: `/v2/integration/todo/${todoUUID}`,
        authorization: 'Bearer test-token',
        body: { categoryUUID: null },
      },
    ])
  } finally {
    if (originalBaseURL === undefined) {
      delete process.env.TOGELLO_API_BASE_URL
    } else {
      process.env.TOGELLO_API_BASE_URL = originalBaseURL
    }
    if (originalToken === undefined) {
      delete process.env.TOGELLO_API_TOKEN
    } else {
      process.env.TOGELLO_API_TOKEN = originalToken
    }
    const closed = once(server, 'close')
    server.close()
    await closed
  }
})
