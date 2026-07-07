import { httpClient } from '../../client.js'
import { errorToolResponse, jsonToolResponse } from './toolResponse.js'

export type GetActivityLogListHandlerArgs = {
  limit?: number
}

export const getActivityLogListHandler = async ({
  limit,
}: GetActivityLogListHandlerArgs) => {
  try {
    const qs = limit !== undefined ? `?limit=${limit}` : ''
    const activityLogList = await httpClient.fetchURL<
      ActivityLogListResponse[]
    >({
      path: `/v2/integration/activity-logs${qs}`,
    })

    return jsonToolResponse({
      activityLogs: activityLogList.map((log) => ({
        activityLogUUID: log.activityLogUUID,
        startDateTime: log.startDateTime,
        endDateTime: log.endDateTime,
        itemName: log.itemName,
      })),
    })
  } catch (error) {
    console.error('Error in activity log list handler:', error)
    return errorToolResponse('Error retrieving activity logs')
  }
}

type ActivityLogListResponse = {
  activityLogUUID: string
  startDateTime: string
  endDateTime: string | null
  itemName: string
}
