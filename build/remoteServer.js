import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { parseBearerToken } from './bearerToken.js';
import { createMcpServer } from './mcpServer.js';
const protectedResourceMetadataPath = '/.well-known/oauth-protected-resource';
const supportedScopes = [
    'offline_access',
    'tasks:read',
    'tasks:write',
    'activity:read',
    'activity:write',
    'calendar:read',
];
export async function startRemoteServer(options) {
    const mcpPath = options.mcpPath ?? '/mcp';
    const ssePath = options.ssePath ?? '/sse';
    const messagePath = options.messagePath ?? '/message';
    const publicBaseUrl = trimTrailingSlash(options.publicBaseUrl);
    const oauthIssuer = options.oauthIssuer;
    const protectedResourceMetadataUrl = `${publicBaseUrl}${protectedResourceMetadataPath}`;
    const sseSessions = new Map();
    const streamableSessions = new Map();
    const resolveUpstreamToken = (sessionId) => {
        if (!sessionId) {
            return undefined;
        }
        return (streamableSessions.get(sessionId)?.upstreamToken ??
            sseSessions.get(sessionId)?.upstreamToken);
    };
    const server = createServer(async (req, res) => {
        try {
            const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
            if (requestUrl.pathname === protectedResourceMetadataPath) {
                if (req.method === 'OPTIONS') {
                    writeOptionsResponse(res);
                    return;
                }
                if (req.method === 'GET') {
                    writeJsonResponse(res, {
                        resource: publicBaseUrl,
                        authorization_servers: [oauthIssuer],
                        scopes_supported: supportedScopes,
                        bearer_methods_supported: ['header'],
                    });
                    return;
                }
            }
            if (requestUrl.pathname === mcpPath) {
                if (req.method === 'OPTIONS') {
                    writeMcpOptionsResponse(res);
                    return;
                }
                await handleStreamableHttpRequest({
                    req,
                    res,
                    authMode: options.authMode,
                    protectedResourceMetadataUrl,
                    resolveUpstreamToken,
                    sessions: streamableSessions,
                });
                return;
            }
            if (req.method === 'GET' && requestUrl.pathname === ssePath) {
                const upstreamToken = getUpstreamTokenForSse(req.headers.authorization, options.authMode);
                if (options.authMode === 'passthrough' && !upstreamToken) {
                    res
                        .writeHead(401, {
                        'WWW-Authenticate': `Bearer resource_metadata="${protectedResourceMetadataUrl}"`,
                    })
                        .end('Unauthorized');
                    return;
                }
                const transport = new SSEServerTransport(messagePath, res);
                sseSessions.set(transport.sessionId, { transport, upstreamToken });
                const mcpServer = createMcpServer({
                    resolveUpstreamToken,
                    requireUpstreamToken: options.authMode === 'passthrough',
                });
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
                    sseSessions.delete(transport.sessionId);
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
                        sseSessions.delete(transport.sessionId);
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
                const session = sseSessions.get(sessionId);
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
    console.log(`Remote MCP server listening on http://${options.host}:${options.port}${mcpPath}`);
}
async function handleStreamableHttpRequest({ req, res, authMode, protectedResourceMetadataUrl, resolveUpstreamToken, sessions, }) {
    writeMcpCorsHeaders(res);
    const sessionId = getHeaderValue(req.headers['mcp-session-id']);
    const existingSession = sessionId ? sessions.get(sessionId) : undefined;
    if (existingSession) {
        await existingSession.transport.handleRequest(req, res);
        return;
    }
    if (sessionId) {
        writeJsonRpcError(res, 404, 'Session not found');
        return;
    }
    if (req.method !== 'POST') {
        writeJsonRpcError(res, 405, 'Method not allowed');
        return;
    }
    const body = await readJsonBody(req).catch(() => undefined);
    if (!includesInitializeRequest(body)) {
        writeJsonRpcError(res, 400, 'Bad Request: No valid session ID provided');
        return;
    }
    const upstreamToken = getUpstreamTokenForStreamableHttp(req.headers.authorization, authMode);
    if (authMode === 'passthrough' && !upstreamToken) {
        res
            .writeHead(401, {
            'WWW-Authenticate': `Bearer resource_metadata="${protectedResourceMetadataUrl}"`,
        })
            .end('Unauthorized');
        return;
    }
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (initializedSessionId) => {
            sessions.set(initializedSessionId, {
                transport,
                upstreamToken,
                closeMcpServer: () => mcpServer.close(),
            });
        },
        onsessionclosed: async (closedSessionId) => {
            const session = sessions.get(closedSessionId);
            sessions.delete(closedSessionId);
            await session?.closeMcpServer().catch(() => undefined);
        },
    });
    const mcpServer = createMcpServer({
        resolveUpstreamToken,
        requireUpstreamToken: authMode === 'passthrough',
    });
    transport.onclose = () => {
        const initializedSessionId = transport.sessionId;
        if (initializedSessionId) {
            sessions.delete(initializedSessionId);
        }
        void mcpServer.close().catch(() => undefined);
    };
    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, body);
}
function trimTrailingSlash(url) {
    return url.replace(/\/+$/, '');
}
function writeJsonResponse(res, body) {
    res.writeHead(200, {
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json',
    });
    res.end(JSON.stringify(body));
}
function writeOptionsResponse(res) {
    res.writeHead(204, {
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Origin': '*',
    });
    res.end();
}
function writeMcpCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Mcp-Session-Id, mcp-session-id, Last-Event-ID, mcp-protocol-version');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id, mcp-session-id, mcp-protocol-version');
}
function writeMcpOptionsResponse(res) {
    writeMcpCorsHeaders(res);
    res.writeHead(204);
    res.end();
}
function writeJsonRpcError(res, httpStatus, message) {
    res.writeHead(httpStatus, {
        'Content-Type': 'application/json',
    });
    res.end(JSON.stringify({
        jsonrpc: '2.0',
        error: {
            code: -32000,
            message,
        },
        id: null,
    }));
}
function getHeaderValue(header) {
    if (Array.isArray(header)) {
        return header[0];
    }
    return header;
}
async function readJsonBody(req) {
    const chunks = [];
    for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const rawBody = Buffer.concat(chunks).toString('utf8').trim();
    if (!rawBody) {
        return undefined;
    }
    return JSON.parse(rawBody);
}
function includesInitializeRequest(body) {
    if (Array.isArray(body)) {
        return body.some((item) => isInitializeRequest(item));
    }
    return isInitializeRequest(body);
}
function getUpstreamTokenForSse(authorizationHeader, authMode) {
    if (authMode === 'env') {
        return process.env.TOGELLO_API_TOKEN;
    }
    return parseBearerToken(authorizationHeader);
}
function getUpstreamTokenForStreamableHttp(authorizationHeader, authMode) {
    if (authMode === 'env') {
        return process.env.TOGELLO_API_TOKEN;
    }
    return parseBearerToken(authorizationHeader);
}
