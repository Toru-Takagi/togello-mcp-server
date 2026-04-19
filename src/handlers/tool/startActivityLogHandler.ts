import { httpClient } from '../../client.js'
import { errorToolResponse, jsonToolResponse } from './toolResponse.js'

export type StartActivityLogHandlerArgs = {
  activityItemName: string
}

type StartActivityLogRequest = {
  activityItemName: string
}

export const startActivityLogHandler = async ({
  activityItemName,
}: StartActivityLogHandlerArgs) => {
  try {
    await httpClient.postJson<null, StartActivityLogRequest>({
      path: '/v2/integration/activity-logs',
      body: {
        activityItemName: activityItemName,
      },
    })
    return jsonToolResponse({
      activityItemName,
      started: true,
    })
  } catch (error) {
    console.error('Error starting activity log:', error)
    return errorToolResponse('Error starting activity log')
  }
}
