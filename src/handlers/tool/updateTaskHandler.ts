import { httpClient } from '../../client.js'
import type { TodoStatus } from '../../types/todo.js'
import { errorToolResponse, jsonToolResponse } from './toolResponse.js'

export type UpdateTaskHandlerArgs = {
  todoUUID: string
  taskName?: string
  isCompleted?: boolean
  status?: TodoStatus
  categoryUUID?: string | null
  scheduledStartDate?: string
  scheduledEndDate?: string
  deadlineDateTime?: string
  url?: string
  detail?: string
}

type UpdateTaskRequest = {
  label?: string
  isCompleted?: boolean
  status?: TodoStatus
  categoryUUID?: string | null
  scheduledStartDate?: string
  scheduledEndDate?: string
  deadlineDateTime?: string
  url?: string
  detail?: string
}

export const updateTaskHandler = async ({
  todoUUID,
  taskName,
  isCompleted,
  status,
  categoryUUID,
  scheduledStartDate,
  scheduledEndDate,
  deadlineDateTime,
  url,
  detail,
}: UpdateTaskHandlerArgs) => {
  try {
    if (
      taskName === undefined &&
      isCompleted === undefined &&
      status === undefined &&
      categoryUUID === undefined &&
      scheduledStartDate === undefined &&
      scheduledEndDate === undefined &&
      deadlineDateTime === undefined &&
      url === undefined &&
      detail === undefined
    ) {
      return errorToolResponse('At least one update field is required')
    }

    if (isCompleted !== undefined && status !== undefined) {
      return errorToolResponse('Specify either isCompleted or status, not both')
    }

    await httpClient.putJson<null, UpdateTaskRequest>({
      path: `/v2/integration/todo/${encodeURIComponent(todoUUID)}`,
      body: {
        label: taskName,
        isCompleted,
        status,
        categoryUUID,
        scheduledStartDate,
        scheduledEndDate,
        deadlineDateTime,
        url,
        detail,
      },
    })
    return jsonToolResponse({
      todoUUID,
      taskName,
      isCompleted,
      status,
      categoryUUID,
      deadlineDateTime,
      updated: true,
    })
  } catch (error) {
    console.error('Error updating task:', error)
    return errorToolResponse('Error updating task')
  }
}
