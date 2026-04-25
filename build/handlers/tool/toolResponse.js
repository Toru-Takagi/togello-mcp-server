export function jsonToolResponse(structuredContent) {
    return {
        structuredContent,
        content: [
            {
                type: 'text',
                text: JSON.stringify(structuredContent, null, 2),
            },
        ],
    };
}
export function errorToolResponse(message) {
    const structuredContent = {
        error: {
            message,
        },
    };
    return {
        structuredContent,
        isError: true,
        content: [
            {
                type: 'text',
                text: JSON.stringify(structuredContent, null, 2),
            },
        ],
    };
}
