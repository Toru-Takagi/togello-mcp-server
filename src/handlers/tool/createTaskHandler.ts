import type { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { z } from 'zod'
import { httpClient } from '../../client.js'

export type CreateTaskHandlerArgs = {
  taskName: z.ZodString
  categoryUUID: z.ZodOptional<z.ZodString>
  scheduledStartDate: z.ZodOptional<z.ZodString>
  scheduledEndDate: z.ZodOptional<z.ZodString>
  url: z.ZodOptional<z.ZodString>
}

type CreateTaskRequest = {
  label: string
  categoryUUID?: string
  scheduledStartDate?: string
  scheduledEndDate?: string
  url?: string
}

export const createTaskHandler: ToolCallback<CreateTaskHandlerArgs> = async ({
  taskName,
  categoryUUID,
  scheduledStartDate,
  scheduledEndDate,
  url,
}) => {
  try {
    await httpClient.postJson<null, CreateTaskRequest>({
      path: '/v2/integration/todo',
      body: {
        label: taskName,
        categoryUUID: categoryUUID,
        scheduledStartDate: scheduledStartDate,
        scheduledEndDate: scheduledEndDate,
        url: url,
      },
    })
    return {
      content: [
        {
          type: 'text',
          text: `Task "${taskName}" created successfully.`,
        },
      ],
    }
  } catch (error) {
    console.error('Error creating task:', error)
    return {
      content: [
        {
          type: 'text',
          text: `Error creating task: ${error}`,
        },
      ],
    }
  }
}
