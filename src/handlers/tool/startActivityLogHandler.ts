import type { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { z } from 'zod'
import { httpClient } from '../../client.js'

export type StartActivityLogHandlerArgs = {
  activityItemName: z.ZodString
}

type StartActivityLogRequest = {
  activityItemName: string
}

export const startActivityLogHandler: ToolCallback<
  StartActivityLogHandlerArgs
> = async ({ activityItemName }) => {
  try {
    await httpClient.postJson<null, StartActivityLogRequest>({
      path: '/v2/integration/activity-logs',
      body: {
        activityItemName: activityItemName,
      },
    })
    return {
      content: [
        {
          type: 'text',
          text: `Activity log for "${activityItemName}" started successfully.`,
        },
      ],
    }
  } catch (error) {
    console.error('Error starting activity log:', error)
    return {
      content: [
        {
          type: 'text',
          text: `Error starting activity log: ${error}`,
        },
      ],
    }
  }
}
