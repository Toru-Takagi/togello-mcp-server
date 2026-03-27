import type { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js'
import { httpClient } from '../../client.js'

export const getTodayMemoHandler: ToolCallback<
  Record<string, never>
> = async () => {
  try {
    const todayMemo = await httpClient.fetchURL<GetTodayMemoResponse>({
      path: '/v2/integration/calendar-date-memo/today',
    })

    return {
      content: [
        {
          type: 'text',
          text: 'The following is today memo information in the order: [target date, memo]',
        },
        {
          type: 'text',
          text: `${todayMemo.targetDate},${todayMemo.memo ?? ''}`,
        },
      ],
    }
  } catch (error) {
    console.error('Error getting today memo:', error)
    return {
      content: [
        {
          type: 'text',
          text: `Error getting today memo: ${error}`,
        },
      ],
    }
  }
}

type GetTodayMemoResponse = {
  targetDate: string
  memo: string | null
}
