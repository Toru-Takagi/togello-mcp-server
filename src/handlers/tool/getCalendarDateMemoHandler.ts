import type { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { z } from 'zod'
import { httpClient } from '../../client.js'

export type GetCalendarDateMemoHandlerArgs = {
  date: z.ZodString
}

export const getCalendarDateMemoHandler: ToolCallback<
  GetCalendarDateMemoHandlerArgs
> = async ({ date }) => {
  try {
    const calendarDateMemo = await httpClient.fetchURL<GetCalendarDateMemoResponse>({
      path: `/v2/integration/calendar-date-memo/${encodeURIComponent(date)}`,
    })

    return {
      content: [
        {
          type: 'text',
          text: `targetDate: ${calendarDateMemo.targetDate}\nmemo: ${calendarDateMemo.memo ?? ''}`,
        },
      ],
    }
  } catch (error) {
    console.error('Error getting calendar date memo:', error)
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `Error getting calendar date memo: ${error}`,
        },
      ],
    }
  }
}

type GetCalendarDateMemoResponse = {
  targetDate: string
  memo: string | null
}
