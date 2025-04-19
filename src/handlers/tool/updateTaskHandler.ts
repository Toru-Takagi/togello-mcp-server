import type { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { z } from 'zod'
import { httpClient } from '../../client.js'

export type UpdateTaskHandlerArgs = {
  todoUUID: z.ZodString
  isCompleted: z.ZodBoolean
  scheduledStartDate: z.ZodOptional<z.ZodString>
  url: z.ZodOptional<z.ZodString>
}

type UpdateTaskRequest = {
  isCompleted: boolean
  scheduledStartDate?: string
  url?: string
}

export const updateTaskHandler: ToolCallback<UpdateTaskHandlerArgs> = async ({
  todoUUID,
  isCompleted,
  scheduledStartDate,
  url,
}) => {
  try {
    await httpClient.putJson<null, UpdateTaskRequest>({
      path: `/v2/integration/todo/${todoUUID}`,
      body: {
        isCompleted,
        scheduledStartDate,
        url,
      },
    })
    return {
      content: [
        {
          type: 'text',
          text: `Task status updated successfully. Task is now ${
            isCompleted ? 'completed' : 'incomplete'
          }.`,
        },
      ],
    }
  } catch (error) {
    console.error('Error updating task:', error)
    return {
      content: [
        {
          type: 'text',
          text: `Error updating task: ${error}`,
        },
      ],
    }
  }
}
