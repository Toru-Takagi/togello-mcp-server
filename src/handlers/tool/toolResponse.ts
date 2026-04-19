import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'

export function jsonToolResponse<T extends Record<string, unknown>>(
  structuredContent: T,
): CallToolResult {
  return {
    structuredContent,
    content: [
      {
        type: 'text',
        text: JSON.stringify(structuredContent, null, 2),
      },
    ],
  } as CallToolResult
}

export function errorToolResponse(message: string): CallToolResult {
  const structuredContent = {
    error: {
      message,
    },
  }

  return {
    structuredContent,
    isError: true,
    content: [
      {
        type: 'text',
        text: JSON.stringify(structuredContent, null, 2),
      },
    ],
  }
}
