import type { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js'
import { httpClient } from '../../client.js'

export const getTodayCalendarHandler: ToolCallback<
  Record<string, never>
> = async () => {
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

    return {
      content: [
        {
          type: 'text',
          text: `The following is a single event represented in the order:
[title of event, start date of event, end date of event]`,
        },
        {
          type: 'text',
          text: googleEvents.items
            .map((event) => [
              event.summary,
              formatEventTime(event.start),
              formatEventTime(event.end),
            ])
            .join(','),
        },
        {
          type: 'text',
          text: 'en: The following is a task. The following is the order:[task name, scheduled start date, scheduled end date]',
        },
        {
          type: 'text',
          text: filteredTasks
            .map((task) => [
              task.label,
              task.scheduledStartDate,
              task.scheduledEndDate,
            ])
            .join(','),
        },
      ],
    }
  } catch (error) {
    console.error('Error in tool handler:', error)
    return {
      content: [
        {
          type: 'text',
          text: `Error in tool handler: ${error}`,
        },
      ],
    }
  }
}

type GoogleCalendarResponse = {
  items: GoogleCalendarResponseItem[]
}

type EventDateTime = {
  // 全日のイベント用のフォーマット "yyyy-mm-dd"
  date?: string
  // RFC3339形式の日時
  dateTime?: string
  // IANAタイムゾーン名（例："Asia/Tokyo"）
  timeZone?: string
}

type GoogleCalendarResponseItem = {
  summary: string
  start: EventDateTime
  end: EventDateTime
}

/**
 * EventDateTime型から表示用の日時文字列を取得する
 */
const formatEventTime = (dateTime: EventDateTime): string => {
  // 全日イベントの場合はdate、そうでない場合はdateTimeを使用
  if (dateTime.date) {
    return dateTime.date // yyyy-mm-dd形式
  }

  if (dateTime.dateTime) {
    // RFC3339形式の日時をより読みやすい形式に変換
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
