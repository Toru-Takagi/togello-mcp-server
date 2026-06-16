import { httpClient } from '../../client.js';
import { errorToolResponse, jsonToolResponse } from './toolResponse.js';
export const getTodoListHandler = async ({ categoryUUIDs, completionStatus, completedStartDate, completedEndDate, }) => {
    try {
        const searchParams = new URLSearchParams();
        for (const categoryUUID of categoryUUIDs ?? []) {
            searchParams.append('categoryUUID', categoryUUID);
        }
        if (completionStatus) {
            searchParams.set('status', completionStatus);
        }
        if (completedStartDate) {
            searchParams.set('completedStartDate', completedStartDate);
        }
        if (completedEndDate) {
            searchParams.set('completedEndDate', completedEndDate);
        }
        const qs = searchParams.size > 0 ? `?${searchParams.toString()}` : '';
        const tasks = await httpClient.fetchURL({
            path: `/v2/integration/todo${qs}`,
        });
        return jsonToolResponse({
            tasks: tasks.map((todo) => ({
                todoUUID: todo.todoUUID,
                label: todo.label,
                status: todo.status,
                detail: todo.detail,
                completedAt: todo.completedAt,
                scheduledStartDate: todo.scheduledStartDate,
                scheduledEndDate: todo.scheduledEndDate,
                deadlineDateTime: todo.deadlineDateTime,
                priorityNumber: todo.priorityNumber,
                categoryUUID: todo.categoryUUID,
                categoryLabel: todo.categoryLabel,
                url: todo.url,
            })),
            guidance: 'Use completionStatus COMPLETED with completedStartDate and completedEndDate in RFC3339 format to retrieve tasks completed during a period such as yesterday. Tasks with scheduled start dates that are today or in the past, and those with a priority of 2, should be addressed as soon as possible.',
        });
    }
    catch (error) {
        console.error('Error in tool handler:', error);
        return errorToolResponse('Error retrieving tasks');
    }
};
