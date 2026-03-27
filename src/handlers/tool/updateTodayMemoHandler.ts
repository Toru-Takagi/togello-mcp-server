import type { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { z } from 'zod'
import { httpClient } from '../../client.js'

export type UpdateTodayMemoHandlerArgs = {
  memo: z.ZodString
}

type UpdateTodayMemoRequest = {
  memo: string
}

export const updateTodayMemoHandler: ToolCallback<
  UpdateTodayMemoHandlerArgs
> = async ({ memo }) => {
  try {
    await httpClient.putJson<null, UpdateTodayMemoRequest>({
      path: '/v2/integration/calendar-date-memo/today',
      body: {
        memo,
      },
    })
    return {
      content: [
        {
          type: 'text',
          text: 'Today memo updated successfully.',
        },
      ],
    }
  } catch (error) {
    console.error('Error updating today memo:', error)
    return {
      content: [
        {
          type: 'text',
          text: `Error updating today memo: ${error}`,
        },
      ],
    }
  }
}
