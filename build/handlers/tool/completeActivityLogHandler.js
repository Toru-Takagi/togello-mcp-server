import { httpClient } from '../../client.js';
import { errorToolResponse, jsonToolResponse } from './toolResponse.js';
export const completeActivityLogHandler = async ({ activityLogUUID, }) => {
    try {
        await httpClient.putJson({
            path: `/v2/integration/activity-logs/${activityLogUUID}/work-complete`,
            body: {},
        });
        return jsonToolResponse({
            activityLogUUID,
            completed: true,
        });
    }
    catch (error) {
        console.error('Error completing activity log:', error);
        return errorToolResponse(`Error completing activity log: ${error}`);
    }
};
