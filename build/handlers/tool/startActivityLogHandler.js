import { httpClient } from '../../client.js';
import { errorToolResponse, jsonToolResponse } from './toolResponse.js';
export const startActivityLogHandler = async ({ activityItemName, }) => {
    try {
        await httpClient.postJson({
            path: '/v2/integration/activity-logs',
            body: {
                activityItemName: activityItemName,
            },
        });
        return jsonToolResponse({
            activityItemName,
            started: true,
        });
    }
    catch (error) {
        console.error('Error starting activity log:', error);
        return errorToolResponse(`Error starting activity log: ${error}`);
    }
};
