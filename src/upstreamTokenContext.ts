import { AsyncLocalStorage } from 'node:async_hooks'

type UpstreamTokenContext = {
  token: string
}

const upstreamTokenStorage = new AsyncLocalStorage<UpstreamTokenContext>()

export async function runWithUpstreamToken<T>(
  token: string,
  fn: () => Promise<T> | T,
): Promise<T> {
  return await upstreamTokenStorage.run({ token }, fn)
}

export function getUpstreamToken(): string | undefined {
  return upstreamTokenStorage.getStore()?.token
}

