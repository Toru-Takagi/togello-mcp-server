import { httpClient } from '../../client.js'
import { errorToolResponse, jsonToolResponse } from './toolResponse.js'

export type GetTodoListHandlerArgs = {
  categoryUUIDs?: string[]
}

export const getTodoListHandler = async ({
  categoryUUIDs,
}: GetTodoListHandlerArgs) => {
  try {
    const categoryUUIDArray = categoryUUIDs ?? []
    const qs =
      categoryUUIDArray.length > 0
        ? `?${categoryUUIDArray.map((u: string) => `categoryUUID=${encodeURIComponent(u)}`).join('&')}`
        : ''
    const tasks = await httpClient.fetchURL<TodoListResponse>({
      path: `/v2/integration/todo${qs}`,
    })

    return jsonToolResponse({
      tasks: tasks.map((todo) => ({
        todoUUID: todo.todoUUID,
        label: todo.label,
        detail: todo.detail,
        scheduledStartDate: todo.scheduledStartDate,
        scheduledEndDate: todo.scheduledEndDate,
        priorityNumber: todo.priorityNumber,
        categoryUUID: todo.categoryUUID,
        categoryLabel: todo.categoryLabel,
        url: todo.url,
      })),
      guidance:
        'The tasks with scheduled start dates that are today or in the past, and those with a priority of 2, should be addressed as soon as possible.',
    })
  } catch (error) {
    console.error('Error in tool handler:', error)
    return errorToolResponse(`Error in tool handler: ${error}`)
  }
}

type TodoListResponse = {
  todoUUID: string | null
  todoSettingUUID: string | null
  label: string
  priorityNumber: number
  completedAt: string | null
  operatedAt: string
  createdAt: string
  scheduledStartDate: string | null
  scheduledEndDate: string | null
  url: string | null
  detail: string
  categoryUUID: string | null
  categoryLabel: string | null
}[]
