import { httpClient } from '../../client.js'
import { errorToolResponse, jsonToolResponse } from './toolResponse.js'

export type UpdateTaskHandlerArgs = {
  todoUUID: string
  isCompleted?: boolean
  status?: 'TODO' | 'DOING' | 'DONE'
  scheduledStartDate?: string
  scheduledEndDate?: string
  url?: string
  detail?: string
}

type UpdateTaskRequest = {
  isCompleted?: boolean
  status?: 'TODO' | 'DOING' | 'DONE'
  scheduledStartDate?: string
  scheduledEndDate?: string
  url?: string
  detail?: string
}

export const updateTaskHandler = async ({
  todoUUID,
  isCompleted,
  status,
  scheduledStartDate,
  scheduledEndDate,
  url,
  detail,
}: UpdateTaskHandlerArgs) => {
  try {
    if (
      isCompleted === undefined &&
      status === undefined &&
      scheduledStartDate === undefined &&
      scheduledEndDate === undefined &&
      url === undefined &&
      detail === undefined
    ) {
      return errorToolResponse('At least one update field is required')
    }

    await httpClient.putJson<null, UpdateTaskRequest>({
      path: `/v2/integration/todo/${encodeURIComponent(todoUUID)}`,
      body: {
        isCompleted,
        status,
        scheduledStartDate,
        scheduledEndDate,
        url,
        detail,
      },
    })
    return jsonToolResponse({
      todoUUID,
      isCompleted,
      status,
      updated: true,
    })
  } catch (error) {
    console.error('Error updating task:', error)
    return errorToolResponse('Error updating task')
  }
}
