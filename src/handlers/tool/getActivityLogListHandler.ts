import { httpClient } from '../../client.js'
import { errorToolResponse, jsonToolResponse } from './toolResponse.js'

export const getActivityLogListHandler = async () => {
  try {
    const activityLogList = await httpClient.fetchURL<
      ActivityLogListResponse[]
    >({
      path: '/v2/integration/activity-logs',
    })

    return jsonToolResponse({
      activityLogs: activityLogList.map((log) => ({
        activityLogUUID: log.activityLogUUID,
        startDateTime: log.startDateTime,
        endDateTime: log.endDateTime,
        itemName: log.itemName,
      })),
      guidance:
        'If all activity logs have endDateTime values, the user is not doing anything now. If one log has a null endDateTime, that log represents the current activity.',
    })
  } catch (error) {
    console.error('Error in activity log list handler:', error)
    return errorToolResponse(
      `アクティビティログの取得中にエラーが発生しました: ${error}`,
    )
  }
}

type ActivityLogListResponse = {
  activityLogUUID: string
  startDateTime: string
  endDateTime: string | null
  itemName: string
}
