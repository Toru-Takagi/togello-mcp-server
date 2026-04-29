#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createMcpServer } from './mcpServer.js'
import { type RemoteAuthMode, startRemoteServer } from './remoteServer.js'

async function main() {
  const args = process.argv.slice(2)
  const firstArg = args[0]
  const mode = (
    getArgValue(args, '--mode') ??
    (!firstArg || firstArg.startsWith('--') ? undefined : firstArg) ??
    process.env.TOGELLO_MCP_MODE ??
    'stdio'
  ).toLowerCase()

  if (mode === 'remote') {
    const host =
      getArgValue(args, '--host') ?? process.env.TOGELLO_MCP_HOST ?? '0.0.0.0'
    const portString =
      getArgValue(args, '--port') ?? process.env.TOGELLO_MCP_PORT ?? '8081'
    const authMode = parseRemoteAuthMode(
      getArgValue(args, '--auth-mode') ?? process.env.TOGELLO_MCP_AUTH_MODE,
    )
    const keepAliveMsString = process.env.TOGELLO_MCP_SSE_KEEPALIVE_MS

    validateRemoteAuthMode({ host, authMode })

    const port = Number(portString)
    if (
      !Number.isFinite(port) ||
      !Number.isInteger(port) ||
      port < 1 ||
      port > 65535
    ) {
      throw new Error(`Invalid port: ${portString}`)
    }

    let keepAliveMs: number | undefined
    if (keepAliveMsString !== undefined) {
      keepAliveMs = Number(keepAliveMsString)
      if (!Number.isFinite(keepAliveMs) || keepAliveMs < 0) {
        throw new Error(
          `Invalid TOGELLO_MCP_SSE_KEEPALIVE_MS: ${keepAliveMsString}`,
        )
      }
    }

    const publicBaseUrl = getRemotePublicBaseUrl(port)
    const oauthIssuer = getRemoteOAuthIssuer()
    const openaiAppsChallengeToken =
      getEnvValue('TOGELLO_MCP_OPENAI_APPS_CHALLENGE_TOKEN') ??
      getEnvValue('OPENAI_APPS_CHALLENGE_TOKEN')

    await startRemoteServer({
      host,
      port,
      authMode,
      publicBaseUrl,
      oauthIssuer,
      sseKeepAliveMs: keepAliveMs,
      openaiAppsChallengeToken,
    })
    return
  }

  if (mode !== 'stdio') {
    throw new Error(`Unknown mode: ${mode}`)
  }

  const server = createMcpServer()
  await server.connect(new StdioServerTransport())
}

main().catch((error) => {
  console.error('Fatal error in main():', error)
  process.exit(1)
})

function getArgValue(args: string[], key: string): string | undefined {
  const index = args.indexOf(key)
  if (index === -1) {
    return undefined
  }
  return args[index + 1]
}

function getEnvValue(name: string): string | undefined {
  const value = process.env[name]?.trim()
  return value ? value : undefined
}

function getRemotePublicBaseUrl(port: number): string {
  const publicBaseUrl = getEnvValue('TOGELLO_MCP_PUBLIC_BASE_URL')
  if (publicBaseUrl) {
    return assertAbsoluteHttpUrl('TOGELLO_MCP_PUBLIC_BASE_URL', publicBaseUrl)
  }
  if (getEnvValue('ENV') === 'production') {
    throw new Error('TOGELLO_MCP_PUBLIC_BASE_URL is required in production')
  }
  return `http://localhost:${port}`
}

function getRemoteOAuthIssuer(): string {
  const oauthIssuer = getEnvValue('TOGELLO_OAUTH_ISSUER')
  if (oauthIssuer) {
    return assertAbsoluteHttpUrl('TOGELLO_OAUTH_ISSUER', oauthIssuer)
  }
  const apiBaseUrl = getEnvValue('TOGELLO_API_BASE_URL')
  if (apiBaseUrl) {
    return assertAbsoluteHttpUrl('TOGELLO_API_BASE_URL', apiBaseUrl)
  }
  if (getEnvValue('ENV') === 'production') {
    throw new Error('TOGELLO_OAUTH_ISSUER or TOGELLO_API_BASE_URL is required in production')
  }
  return 'http://localhost:8000'
}

function assertAbsoluteHttpUrl(name: string, value: string): string {
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new Error(`Invalid ${name}: ${value}`)
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Invalid ${name}: ${value}`)
  }
  return value
}

function parseRemoteAuthMode(value: string | undefined): RemoteAuthMode {
  if (value === undefined) {
    return 'passthrough'
  }

  const normalized = value.trim().toLowerCase()
  if (normalized === 'passthrough' || normalized === 'env') {
    return normalized
  }

  throw new Error(`Invalid TOGELLO_MCP_AUTH_MODE: ${value}`)
}

function validateRemoteAuthMode({
  host,
  authMode,
}: { host: string; authMode: RemoteAuthMode }): void {
  if (authMode !== 'env') {
    return
  }

  if (!process.env.TOGELLO_API_TOKEN) {
    throw new Error('TOGELLO_MCP_AUTH_MODE=env requires TOGELLO_API_TOKEN')
  }

  if (isLocalHost(host)) {
    return
  }

  if (process.env.TOGELLO_MCP_ALLOW_ENV_AUTH === 'true') {
    return
  }

  throw new Error(
    'TOGELLO_MCP_AUTH_MODE=env shares one TOGELLO_API_TOKEN with every remote client. Use passthrough auth for public remote MCP, or set TOGELLO_MCP_ALLOW_ENV_AUTH=true explicitly for a trusted deployment.',
  )
}

function isLocalHost(host: string): boolean {
  const normalizedHost = host.trim().toLowerCase()
  return (
    normalizedHost === 'localhost' ||
    normalizedHost === '127.0.0.1' ||
    normalizedHost === '::1'
  )
}
