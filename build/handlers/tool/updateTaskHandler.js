import { httpClient } from '../../client.js';
import { errorToolResponse, jsonToolResponse } from './toolResponse.js';
export const updateTaskHandler = async ({ todoUUID, isCompleted, scheduledStartDate, scheduledEndDate, url, detail, }) => {
    try {
        await httpClient.putJson({
            path: `/v2/integration/todo/${encodeURIComponent(todoUUID)}`,
            body: {
                isCompleted,
                scheduledStartDate,
                scheduledEndDate,
                url,
                detail,
            },
        });
        return jsonToolResponse({
            todoUUID,
            isCompleted,
            updated: true,
        });
    }
    catch (error) {
        console.error('Error updating task:', error);
        return errorToolResponse('Error updating task');
    }
};
