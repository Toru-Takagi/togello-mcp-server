import type { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { z } from 'zod'
import { httpClient } from '../../client.js'

export type UpdateCalendarDateMemoHandlerArgs = {
  date: z.ZodString
  memo: z.ZodString
}

type UpdateCalendarDateMemoRequest = {
  memo: string
}

export const updateCalendarDateMemoHandler: ToolCallback<
  UpdateCalendarDateMemoHandlerArgs
> = async ({ date, memo }) => {
  try {
    await httpClient.putJson<null, UpdateCalendarDateMemoRequest>({
      path: `/v2/integration/calendar-date-memo/${encodeURIComponent(date)}`,
      body: {
        memo,
      },
    })
    return {
      content: [
        {
          type: 'text',
          text: 'Calendar date memo updated successfully.',
        },
      ],
    }
  } catch (error) {
    console.error('Error updating calendar date memo:', error)
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Error updating calendar date memo: ${error}`,
        },
      ],
    }
  }
}
