#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMcpServer } from './mcpServer.js';
import { startRemoteServer } from './remoteServer.js';
async function main() {
    const args = process.argv.slice(2);
    const firstArg = args[0];
    const mode = (getArgValue(args, '--mode')
        ?? (!firstArg || firstArg.startsWith('--') ? undefined : firstArg)
        ?? process.env.TOGELLO_MCP_MODE
        ?? 'stdio').toLowerCase();
    if (mode === 'remote') {
        const host = getArgValue(args, '--host') ?? process.env.TOGELLO_MCP_HOST ?? '0.0.0.0';
        const portString = getArgValue(args, '--port') ?? process.env.TOGELLO_MCP_PORT ?? '8081';
        const authMode = parseRemoteAuthMode(getArgValue(args, '--auth-mode') ?? process.env.TOGELLO_MCP_AUTH_MODE);
        const keepAliveMsString = process.env.TOGELLO_MCP_SSE_KEEPALIVE_MS;
        const port = Number(portString);
        if (!Number.isFinite(port) || !Number.isInteger(port) || port < 1 || port > 65535) {
            throw new Error(`Invalid port: ${portString}`);
        }
        let keepAliveMs;
        if (keepAliveMsString !== undefined) {
            keepAliveMs = Number(keepAliveMsString);
            if (!Number.isFinite(keepAliveMs) || keepAliveMs < 0) {
                throw new Error(`Invalid TOGELLO_MCP_SSE_KEEPALIVE_MS: ${keepAliveMsString}`);
            }
        }
        await startRemoteServer({
            host,
            port,
            authMode,
            sseKeepAliveMs: keepAliveMs,
        });
        return;
    }
    if (mode !== 'stdio') {
        throw new Error(`Unknown mode: ${mode}`);
    }
    const server = createMcpServer();
    await server.connect(new StdioServerTransport());
}
main().catch((error) => {
    console.error('Fatal error in main():', error);
    process.exit(1);
});
function getArgValue(args, key) {
    const index = args.indexOf(key);
    if (index === -1) {
        return undefined;
    }
    return args[index + 1];
}
function parseRemoteAuthMode(value) {
    if (value === undefined) {
        return 'passthrough';
    }
    const normalized = value.trim().toLowerCase();
    if (normalized === 'passthrough' || normalized === 'env') {
        return normalized;
    }
    throw new Error(`Invalid TOGELLO_MCP_AUTH_MODE: ${value}`);
}
