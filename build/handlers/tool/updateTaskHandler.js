import { httpClient } from '../../client.js';
import { errorToolResponse, jsonToolResponse } from './toolResponse.js';
export const updateTaskHandler = async ({ todoUUID, isCompleted, status, scheduledStartDate, scheduledEndDate, url, detail, }) => {
    try {
        if (isCompleted === undefined &&
            status === undefined &&
            scheduledStartDate === undefined &&
            scheduledEndDate === undefined &&
            url === undefined &&
            detail === undefined) {
            return errorToolResponse('At least one update field is required');
        }
        if (isCompleted !== undefined && status !== undefined) {
            return errorToolResponse('Specify either isCompleted or status, not both');
        }
        await httpClient.putJson({
            path: `/v2/integration/todo/${encodeURIComponent(todoUUID)}`,
            body: {
                isCompleted,
                status,
                scheduledStartDate,
                scheduledEndDate,
                url,
                detail,
            },
        });
        return jsonToolResponse({
            todoUUID,
            isCompleted,
            status,
            updated: true,
        });
    }
    catch (error) {
        console.error('Error updating task:', error);
        return errorToolResponse('Error updating task');
    }
};
