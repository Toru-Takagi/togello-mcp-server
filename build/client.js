import { getUpstreamToken } from './upstreamTokenContext.js';
const API_BASE_URL = process.env.TOGELLO_API_BASE_URL ?? 'https://togello.api.toru-takagi.dev';
function getApiTokenOrThrow() {
    const token = getUpstreamToken() ?? process.env.TOGELLO_API_TOKEN;
    if (!token) {
        throw new Error('API token not available from upstream context or TOGELLO_API_TOKEN environment variable');
    }
    return token;
}
export const httpClient = {
    fetchURL: async ({ path }) => {
        const token = getApiTokenOrThrow();
        const url = `${API_BASE_URL}${path}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            throw new Error(`response status: ${response.status}`);
        }
        return (await response.json());
    },
    postJson: async ({ path, body }) => {
        const token = getApiTokenOrThrow();
        const url = `${API_BASE_URL}${path}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            throw new Error(`response status: ${response.status}`);
        }
        // 空レスポンスの堅牢な処理
        const text = await response.text();
        if (!text || text.trim() === '') {
            return undefined;
        }
        return JSON.parse(text);
    },
    putJson: async ({ path, body }) => {
        const token = getApiTokenOrThrow();
        const url = `${API_BASE_URL}${path}`;
        const bodyString = body !== null ? JSON.stringify(body) : '{}';
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: bodyString,
        });
        if (!response.ok) {
            throw new Error(`response status: ${response.status}`);
        }
        // 空レスポンスの堅牢な処理
        const text = await response.text();
        if (!text || text.trim() === '') {
            return undefined;
        }
        return JSON.parse(text);
    },
};
