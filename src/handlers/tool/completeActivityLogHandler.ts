import type { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { z } from 'zod'
import { httpClient } from '../../client.js'

export type CompleteActivityLogHandlerArgs = {
  activityLogUUID: z.ZodString
}

export const completeActivityLogHandler: ToolCallback<
  CompleteActivityLogHandlerArgs
> = async ({ activityLogUUID }) => {
  try {
    await httpClient.putJson<void, Record<string, never>>({
      path: `/v2/integration/activity-logs/${activityLogUUID}/work-complete`,
      body: {},
    })
    return {
      content: [
        {
          type: 'text',
          text: `Activity log with UUID "${activityLogUUID}" completed successfully.`,
        },
      ],
    }
  } catch (error) {
    console.error('Error completing activity log:', error)
    return {
      content: [
        {
          type: 'text',
          text: `Error completing activity log: ${error}`,
        },
      ],
    }
  }
}
