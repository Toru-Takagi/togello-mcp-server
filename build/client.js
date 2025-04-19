const API_BASE_URL = 'https://togello.api.toru-takagi.dev';
export const httpClient = {
    fetchURL: async ({ path }) => {
        const token = process.env.TOGELLO_API_TOKEN;
        if (!token) {
            throw new Error('environment variable TOGELLO_API_TOKEN is not set');
        }
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
        const token = process.env.TOGELLO_API_TOKEN;
        if (!token) {
            throw new Error('environment variable TOGELLO_API_TOKEN is not set');
        }
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
        return (await response.json());
    },
    putJson: async ({ path, body }) => {
        const token = process.env.TOGELLO_API_TOKEN;
        if (!token) {
            throw new Error('environment variable TOGELLO_API_TOKEN is not set');
        }
        const url = `${API_BASE_URL}${path}`;
        const bodyString = body !== null ? JSON.stringify(body) : null;
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
        return (await response.json());
    },
};
