import { createServer, type ServerResponse } from 'node:http'
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js'
import { parseBearerToken } from './bearerToken.js'
import { type UpstreamTokenResolver, createMcpServer } from './mcpServer.js'

export type RemoteAuthMode = 'passthrough' | 'env'

export type StartRemoteServerOptions = {
  host: string
  port: number
  authMode: RemoteAuthMode
  publicBaseUrl: string
  oauthIssuer: string
  ssePath?: string
  messagePath?: string
  sseKeepAliveMs?: number
}

type Session = {
  transport: SSEServerTransport
  upstreamToken?: string
}

type OAuthProtectedResourceMetadata = {
  resource: string
  authorization_servers: string[]
  scopes_supported: string[]
  bearer_methods_supported: string[]
}

const protectedResourceMetadataPath = '/.well-known/oauth-protected-resource'
const supportedScopes = [
  'offline_access',
  'tasks:read',
  'tasks:write',
  'activity:read',
  'activity:write',
  'calendar:read',
]

export async function startRemoteServer(
  options: StartRemoteServerOptions,
): Promise<void> {
  const ssePath = options.ssePath ?? '/sse'
  const messagePath = options.messagePath ?? '/message'
  const publicBaseUrl = trimTrailingSlash(options.publicBaseUrl)
  const oauthIssuer = options.oauthIssuer
  const protectedResourceMetadataUrl = `${publicBaseUrl}${protectedResourceMetadataPath}`
  const sessions = new Map<string, Session>()

  const resolveUpstreamToken: UpstreamTokenResolver = (sessionId) => {
    if (!sessionId) {
      return undefined
    }
    return sessions.get(sessionId)?.upstreamToken
  }

  const server = createServer(async (req, res) => {
    try {
      const requestUrl = new URL(
        req.url ?? '/',
        `http://${req.headers.host ?? 'localhost'}`,
      )

      if (requestUrl.pathname === protectedResourceMetadataPath) {
        if (req.method === 'OPTIONS') {
          writeOptionsResponse(res)
          return
        }
        if (req.method === 'GET') {
          writeJsonResponse(res, {
            resource: publicBaseUrl,
            authorization_servers: [oauthIssuer],
            scopes_supported: supportedScopes,
            bearer_methods_supported: ['header'],
          })
          return
        }
      }

      if (req.method === 'GET' && requestUrl.pathname === ssePath) {
        const upstreamToken = getUpstreamTokenForSse(
          req.headers.authorization,
          options.authMode,
        )
        if (options.authMode === 'passthrough' && !upstreamToken) {
          res
            .writeHead(401, {
              'WWW-Authenticate': `Bearer resource_metadata="${protectedResourceMetadataUrl}"`,
            })
            .end('Unauthorized')
          return
        }

        const transport = new SSEServerTransport(messagePath, res)
        sessions.set(transport.sessionId, { transport, upstreamToken })

        const mcpServer = createMcpServer({
          resolveUpstreamToken,
          requireUpstreamToken: options.authMode === 'passthrough',
        })
        let closed = false

        const keepAliveMs = options.sseKeepAliveMs
        const keepAliveTimer =
          keepAliveMs && keepAliveMs > 0
            ? setInterval(() => {
                if (!res.writableEnded) {
                  res.write(':\n\n')
                }
              }, keepAliveMs)
            : undefined

        transport.onclose = () => {
          if (closed) {
            return
          }
          closed = true
          sessions.delete(transport.sessionId)
          if (keepAliveTimer) {
            clearInterval(keepAliveTimer)
          }
          void mcpServer.close().catch(() => undefined)
        }

        try {
          await mcpServer.connect(transport)
        } catch (error) {
          if (!closed) {
            closed = true
            sessions.delete(transport.sessionId)
            if (keepAliveTimer) {
              clearInterval(keepAliveTimer)
            }
            void mcpServer.close().catch(() => undefined)
          }
          throw error
        }
        return
      }

      if (req.method === 'POST' && requestUrl.pathname === messagePath) {
        const sessionId = requestUrl.searchParams.get('sessionId')
        if (!sessionId) {
          res.writeHead(400).end('Missing sessionId')
          return
        }

        const session = sessions.get(sessionId)
        if (!session) {
          res.writeHead(404).end('Session not found')
          return
        }

        await session.transport.handlePostMessage(req, res)
        return
      }

      res.writeHead(404).end('Not found')
    } catch (error) {
      console.error('Remote server error:', error)
      if (!res.headersSent) {
        res.writeHead(500)
      }
      res.end('Internal server error')
    }
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(options.port, options.host, () => resolve())
  })

  console.log(
    `Remote MCP server listening on http://${options.host}:${options.port}${ssePath}`,
  )
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '')
}

function writeJsonResponse(
  res: ServerResponse,
  body: OAuthProtectedResourceMetadata,
): void {
  res.writeHead(200, {
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json',
  })
  res.end(JSON.stringify(body))
}

function writeOptionsResponse(res: ServerResponse): void {
  res.writeHead(204, {
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Origin': '*',
  })
  res.end()
}

function getUpstreamTokenForSse(
  authorizationHeader: string | undefined,
  authMode: RemoteAuthMode,
): string | undefined {
  if (authMode === 'env') {
    return process.env.TOGELLO_API_TOKEN
  }
  return parseBearerToken(authorizationHeader)
}
