import { httpClient } from '../../client.js'
import { errorToolResponse, jsonToolResponse } from './toolResponse.js'

export type CompleteActivityLogHandlerArgs = {
  activityLogUUID: string
}

export const completeActivityLogHandler = async ({
  activityLogUUID,
}: CompleteActivityLogHandlerArgs) => {
  try {
    await httpClient.putJson<void, Record<string, never>>({
      path: `/v2/integration/activity-logs/${activityLogUUID}/work-complete`,
      body: {},
    })
    return jsonToolResponse({
      activityLogUUID,
      completed: true,
    })
  } catch (error) {
    console.error('Error completing activity log:', error)
    return errorToolResponse(`Error completing activity log: ${error}`)
  }
}
