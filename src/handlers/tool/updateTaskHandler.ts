import { httpClient } from '../../client.js'
import { errorToolResponse, jsonToolResponse } from './toolResponse.js'

export type UpdateTaskHandlerArgs = {
  todoUUID: string
  isCompleted: boolean
  scheduledStartDate?: string
  scheduledEndDate?: string
  url?: string
  detail?: string
}

type UpdateTaskRequest = {
  isCompleted: boolean
  scheduledStartDate?: string
  scheduledEndDate?: string
  url?: string
  detail?: string
}

export const updateTaskHandler = async ({
  todoUUID,
  isCompleted,
  scheduledStartDate,
  scheduledEndDate,
  url,
  detail,
}: UpdateTaskHandlerArgs) => {
  try {
    await httpClient.putJson<null, UpdateTaskRequest>({
      path: `/v2/integration/todo/${todoUUID}`,
      body: {
        isCompleted,
        scheduledStartDate,
        scheduledEndDate,
        url,
        detail,
      },
    })
    return jsonToolResponse({
      todoUUID,
      isCompleted,
      updated: true,
    })
  } catch (error) {
    console.error('Error updating task:', error)
    return errorToolResponse(`Error updating task: ${error}`)
  }
}
