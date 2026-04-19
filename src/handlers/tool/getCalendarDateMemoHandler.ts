import { httpClient } from '../../client.js'
import { errorToolResponse, jsonToolResponse } from './toolResponse.js'

export type GetCalendarDateMemoHandlerArgs = {
  date: string
}

export const getCalendarDateMemoHandler = async ({
  date,
}: GetCalendarDateMemoHandlerArgs) => {
  try {
    const calendarDateMemo =
      await httpClient.fetchURL<GetCalendarDateMemoResponse>({
        path: `/v2/integration/calendar-date-memo/${encodeURIComponent(date)}`,
      })

    return jsonToolResponse({
      targetDate: calendarDateMemo.targetDate,
      memo: calendarDateMemo.memo ?? '',
    })
  } catch (error) {
    console.error('Error getting calendar date memo:', error)
    return errorToolResponse('Error getting calendar date memo')
  }
}

type GetCalendarDateMemoResponse = {
  targetDate: string
  memo: string | null
}
