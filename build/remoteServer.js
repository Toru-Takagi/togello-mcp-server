import { createServer } from 'node:http';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { parseBearerToken } from './bearerToken.js';
import { createMcpServer } from './mcpServer.js';
export async function startRemoteServer(options) {
    const ssePath = options.ssePath ?? '/sse';
    const messagePath = options.messagePath ?? '/message';
    const sessions = new Map();
    const resolveUpstreamToken = (sessionId) => {
        if (!sessionId) {
            return undefined;
        }
        return sessions.get(sessionId)?.upstreamToken;
    };
    const server = createServer(async (req, res) => {
        try {
            const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
            if (req.method === 'GET' && requestUrl.pathname === ssePath) {
                const upstreamToken = getUpstreamTokenForSse(req.headers.authorization, options.authMode);
                if (options.authMode === 'passthrough' && !upstreamToken) {
                    res.writeHead(401).end('Unauthorized');
                    return;
                }
                const transport = new SSEServerTransport(messagePath, res);
                sessions.set(transport.sessionId, { transport, upstreamToken });
                const mcpServer = createMcpServer({ resolveUpstreamToken });
                let closed = false;
                const keepAliveMs = options.sseKeepAliveMs;
                const keepAliveTimer = keepAliveMs && keepAliveMs > 0
                    ? setInterval(() => {
                        if (!res.writableEnded) {
                            res.write(':\n\n');
                        }
                    }, keepAliveMs)
                    : undefined;
                transport.onclose = () => {
                    if (closed) {
                        return;
                    }
                    closed = true;
                    sessions.delete(transport.sessionId);
                    if (keepAliveTimer) {
                        clearInterval(keepAliveTimer);
                    }
                    void mcpServer.close().catch(() => undefined);
                };
                try {
                    await mcpServer.connect(transport);
                }
                catch (error) {
                    if (!closed) {
                        closed = true;
                        sessions.delete(transport.sessionId);
                        if (keepAliveTimer) {
                            clearInterval(keepAliveTimer);
                        }
                        void mcpServer.close().catch(() => undefined);
                    }
                    throw error;
                }
                return;
            }
            if (req.method === 'POST' && requestUrl.pathname === messagePath) {
                const sessionId = requestUrl.searchParams.get('sessionId');
                if (!sessionId) {
                    res.writeHead(400).end('Missing sessionId');
                    return;
                }
                const session = sessions.get(sessionId);
                if (!session) {
                    res.writeHead(404).end('Session not found');
                    return;
                }
                await session.transport.handlePostMessage(req, res);
                return;
            }
            res.writeHead(404).end('Not found');
        }
        catch (error) {
            console.error('Remote server error:', error);
            if (!res.headersSent) {
                res.writeHead(500);
            }
            res.end('Internal server error');
        }
    });
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(options.port, options.host, () => resolve());
    });
    console.log(`Remote MCP server listening on http://${options.host}:${options.port}${ssePath}`);
}
function getUpstreamTokenForSse(authorizationHeader, authMode) {
    if (authMode === 'env') {
        return process.env.TOGELLO_API_TOKEN;
    }
    return parseBearerToken(authorizationHeader);
}
