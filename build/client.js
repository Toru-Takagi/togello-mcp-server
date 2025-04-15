const API_BASE_URL = "https://togello.api.toru-takagi.dev";
export const httpClient = {
    fetchURL: async ({ path }) => {
        const token = process.env.TOGELLO_API_TOKEN;
        if (!token) {
            throw new Error("environment variable TOGELLO_API_TOKEN is not set");
        }
        const url = `${API_BASE_URL}${path}`;
        const response = await fetch(url, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });
        if (!response.ok) {
            throw new Error(`response status: ${response.status}`);
        }
        return (await response.json());
    },
};
