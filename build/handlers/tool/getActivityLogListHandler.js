import { httpClient } from '../../client.js';
import { errorToolResponse, jsonToolResponse } from './toolResponse.js';
export const getActivityLogListHandler = async () => {
    try {
        const activityLogList = await httpClient.fetchURL({
            path: '/v2/integration/activity-logs',
        });
        return jsonToolResponse({
            activityLogs: activityLogList.map((log) => ({
                activityLogUUID: log.activityLogUUID,
                startDateTime: log.startDateTime,
                endDateTime: log.endDateTime,
                itemName: log.itemName,
            })),
        });
    }
    catch (error) {
        console.error('Error in activity log list handler:', error);
        return errorToolResponse('Error retrieving activity logs');
    }
};
