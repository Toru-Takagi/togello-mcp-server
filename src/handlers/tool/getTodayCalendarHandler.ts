import { httpClient } from '../../client.js'
import { errorToolResponse, jsonToolResponse } from './toolResponse.js'

export const getTodayCalendarHandler = async () => {
  try {
    const googleEvents = await httpClient.fetchURL<GoogleCalendarResponse>({
      path: '/v2/integration/google-calendar/event',
    })
    const tasks = await httpClient.fetchURL<TodoListResponse>({
      path: '/v2/integration/todo',
    })
    const filteredTasks = tasks.filter(
      (task) => task.scheduledStartDate != null,
    )

    return jsonToolResponse({
      events: (googleEvents.items ?? []).map((event) => ({
        title: event.summary,
        startDateTime: formatEventTime(event.start),
        endDateTime: formatEventTime(event.end),
      })),
      tasks: filteredTasks.map((task) => ({
        taskName: task.label,
        scheduledStartDate: task.scheduledStartDate,
        scheduledEndDate: task.scheduledEndDate,
      })),
    })
  } catch (error) {
    console.error('Error in tool handler:', error)
    return errorToolResponse('Error retrieving calendar events')
  }
}

type GoogleCalendarResponse = {
  items?: GoogleCalendarResponseItem[]
}

type EventDateTime = {
  date?: string
  dateTime?: string
  timeZone?: string
}

type GoogleCalendarResponseItem = {
  summary: string
  start: EventDateTime
  end: EventDateTime
}

const formatEventTime = (dateTime: EventDateTime): string => {
  if (dateTime.date) {
    return dateTime.date
  }

  if (dateTime.dateTime) {
    const dt = new Date(dateTime.dateTime)
    return dt.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: dateTime.timeZone,
    })
  }

  return '不明な日時'
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
