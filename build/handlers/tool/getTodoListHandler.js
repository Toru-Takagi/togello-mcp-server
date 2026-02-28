import { httpClient } from '../../client.js';
export const getTodoListHandler = async ({ categoryUUIDs }) => {
    try {
        const categoryUUIDArray = categoryUUIDs ?? [];
        const qs = categoryUUIDArray.length > 0
            ? `?${categoryUUIDArray.map((u) => `categoryUUID=${encodeURIComponent(u)}`).join('&')}`
            : '';
        const tasks = await httpClient.fetchURL({
            path: `/v2/integration/todo${qs}`,
        });
        return {
            content: [
                {
                    type: 'text',
                    text: `The following is a single task represented in the order:
[todo uuid, label of the task, detail of the task, scheduled start date, scheduled end date, priority, category of the task, URL associated with the task]`,
                },
                {
                    type: 'text',
                    text: 'The tasks with scheduled start dates that are today or in the past, and those with a priority of 2, should be addressed as soon as possible.',
                },
                {
                    type: 'text',
                    text: tasks
                        .map((todo) => [
                        todo.todoUUID,
                        todo.label,
                        todo.detail,
                        todo.scheduledStartDate,
                        todo.scheduledEndDate,
                        todo.priorityNumber,
                        todo.categoryLabel,
                        todo.url,
                    ])
                        .join(','),
                },
            ],
        };
    }
    catch (error) {
        console.error('Error in tool handler:', error);
        return {
            content: [
                {
                    type: 'text',
                    text: `Error in tool handler: ${error}`,
                },
            ],
        };
    }
};
