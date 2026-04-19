import { httpClient } from '../../client.js';
import { errorToolResponse, jsonToolResponse } from './toolResponse.js';
export const createTaskHandler = async ({ taskName, categoryUUID, scheduledStartDate, scheduledEndDate, url, detail, }) => {
    try {
        await httpClient.postJson({
            path: '/v2/integration/todo',
            body: {
                label: taskName,
                categoryUUID: categoryUUID,
                scheduledStartDate: scheduledStartDate,
                scheduledEndDate: scheduledEndDate,
                url: url,
                detail: detail,
            },
        });
        return jsonToolResponse({
            taskName,
            created: true,
        });
    }
    catch (error) {
        console.error('Error creating task:', error);
        return errorToolResponse(`Error creating task: ${error}`);
    }
};
