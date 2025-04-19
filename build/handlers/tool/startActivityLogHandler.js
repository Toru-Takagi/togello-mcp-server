import { httpClient } from '../../client.js';
export const startActivityLogHandler = async ({ activityItemName }) => {
    try {
        await httpClient.postJson({
            path: '/v2/integration/activity-logs',
            body: {
                activityItemName: activityItemName,
            },
        });
        return {
            content: [
                {
                    type: 'text',
                    text: `Activity log for "${activityItemName}" started successfully.`,
                },
            ],
        };
    }
    catch (error) {
        console.error('Error starting activity log:', error);
        return {
            content: [
                {
                    type: 'text',
                    text: `Error starting activity log: ${error}`,
                },
            ],
        };
    }
};
