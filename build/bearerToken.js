export function parseBearerToken(authorizationHeader) {
    if (!authorizationHeader) {
        return undefined;
    }
    const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
    const token = match?.[1]?.trim();
    if (!token) {
        return undefined;
    }
    return token;
}
