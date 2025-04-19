import type { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js'
import { httpClient } from '../../client.js'

export const getTodayCalendarHandler: ToolCallback<
  Record<string, never>
> = async () => {
  try {
    const googleEvents = await httpClient.fetchURL<GoogleCalendarResponse>({
      path: '/v2/integration/google-calendar/event',
    })

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
            .map((event) => [event.summary, event.start, event.end])
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

type GoogleCalendarResponseItem = {
  summary: string
  start: string
  end: string
}
