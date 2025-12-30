import { AsyncLocalStorage } from 'node:async_hooks';
const upstreamTokenStorage = new AsyncLocalStorage();
export async function runWithUpstreamToken(token, fn) {
    return await upstreamTokenStorage.run({ token }, fn);
}
export function getUpstreamToken() {
    return upstreamTokenStorage.getStore()?.token;
}
