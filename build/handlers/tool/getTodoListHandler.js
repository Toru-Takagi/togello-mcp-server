import { httpClient } from '../../client.js';
import { errorToolResponse, jsonToolResponse } from './toolResponse.js';
export const getTodoListHandler = async ({ categoryUUIDs, }) => {
    try {
        const categoryUUIDArray = categoryUUIDs ?? [];
        const qs = categoryUUIDArray.length > 0
            ? `?${categoryUUIDArray.map((u) => `categoryUUID=${encodeURIComponent(u)}`).join('&')}`
            : '';
        const tasks = await httpClient.fetchURL({
            path: `/v2/integration/todo${qs}`,
        });
        return jsonToolResponse({
            tasks: tasks.map((todo) => ({
                todoUUID: todo.todoUUID,
                label: todo.label,
                status: todo.status,
                detail: todo.detail,
                scheduledStartDate: todo.scheduledStartDate,
                scheduledEndDate: todo.scheduledEndDate,
                deadlineDateTime: todo.deadlineDateTime,
                priorityNumber: todo.priorityNumber,
                categoryUUID: todo.categoryUUID,
                categoryLabel: todo.categoryLabel,
                url: todo.url,
            })),
            guidance: 'The tasks with scheduled start dates that are today or in the past, and those with a priority of 2, should be addressed as soon as possible.',
        });
    }
    catch (error) {
        console.error('Error in tool handler:', error);
        return errorToolResponse('Error retrieving tasks');
    }
};
