import { httpClient } from '../../client.js';
import { errorToolResponse, jsonToolResponse } from './toolResponse.js';
export const deleteTaskHandler = async ({ todoUUID }) => {
    try {
        await httpClient.delete({
            path: `/v2/integration/todo/${encodeURIComponent(todoUUID)}`,
        });
        return jsonToolResponse({ todoUUID, deleted: true });
    }
    catch {
        return errorToolResponse('Error deleting task');
    }
};
