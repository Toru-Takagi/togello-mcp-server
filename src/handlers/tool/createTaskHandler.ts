import { httpClient } from '../../client.js'
import { errorToolResponse, jsonToolResponse } from './toolResponse.js'

export type CreateTaskHandlerArgs = {
  taskName: string
  categoryUUID?: string
  scheduledStartDate?: string
  scheduledEndDate?: string
  url?: string
  detail?: string
}

type CreateTaskRequest = {
  label: string
  categoryUUID?: string
  scheduledStartDate?: string
  scheduledEndDate?: string
  url?: string
  detail?: string
}

export const createTaskHandler = async ({
  taskName,
  categoryUUID,
  scheduledStartDate,
  scheduledEndDate,
  url,
  detail,
}: CreateTaskHandlerArgs) => {
  try {
    await httpClient.postJson<null, CreateTaskRequest>({
      path: '/v2/integration/todo',
      body: {
        label: taskName,
        categoryUUID: categoryUUID,
        scheduledStartDate: scheduledStartDate,
        scheduledEndDate: scheduledEndDate,
        url: url,
        detail: detail,
      },
    })
    return jsonToolResponse({
      taskName,
      created: true,
    })
  } catch (error) {
    console.error('Error creating task:', error)
    return errorToolResponse(`Error creating task: ${error}`)
  }
}
