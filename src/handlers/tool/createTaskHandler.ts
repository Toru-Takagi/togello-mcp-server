import { httpClient } from '../../client.js'
import { errorToolResponse, jsonToolResponse } from './toolResponse.js'

export type CreateTaskHandlerArgs = {
  taskName: string
  status?: TodoStatus
  categoryUUID?: string
  scheduledStartDate?: string
  scheduledEndDate?: string
  deadlineDateTime?: string
  url?: string
  detail?: string
}

type CreateTaskRequest = {
  label: string
  status?: TodoStatus
  categoryUUID?: string
  scheduledStartDate?: string
  scheduledEndDate?: string
  deadlineDateTime?: string
  url?: string
  detail?: string
}

type TodoStatus = 'TODO' | 'PENDING' | 'DOING' | 'DONE'

export const createTaskHandler = async ({
  taskName,
  status,
  categoryUUID,
  scheduledStartDate,
  scheduledEndDate,
  deadlineDateTime,
  url,
  detail,
}: CreateTaskHandlerArgs) => {
  try {
    await httpClient.postJson<null, CreateTaskRequest>({
      path: '/v2/integration/todo',
      body: {
        label: taskName,
        status: status,
        categoryUUID: categoryUUID,
        scheduledStartDate: scheduledStartDate,
        scheduledEndDate: scheduledEndDate,
        deadlineDateTime: deadlineDateTime,
        url: url,
        detail: detail,
      },
    })
    return jsonToolResponse({
      taskName,
      status,
      deadlineDateTime,
      created: true,
    })
  } catch (error) {
    console.error('Error creating task:', error)
    return errorToolResponse('Error creating task')
  }
}
