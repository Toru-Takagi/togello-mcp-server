import { httpClient } from '../../client.js';
import { errorToolResponse, jsonToolResponse } from './toolResponse.js';
export const createTaskHandler = async ({ taskName, status, categoryUUID, scheduledStartDate, scheduledEndDate, deadlineDateTime, url, detail, }) => {
    try {
        await httpClient.postJson({
            path: '/v2/integration/todo',
            body: {
                label: taskName,
                status: status,
                categoryUUID: categoryUUID,
                scheduledStartDate: scheduledStartDate,
                scheduledEndDate: scheduledEndDate,
                deadlineDateTime: deadlineDateTime,
                url: url,
                detail: detail,
            },
        });
        return jsonToolResponse({
            taskName,
            status,
            deadlineDateTime,
            created: true,
        });
    }
    catch (error) {
        console.error('Error creating task:', error);
        return errorToolResponse('Error creating task');
    }
};
