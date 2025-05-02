import { httpClient } from '../../client.js';
export const createTaskHandler = async ({ taskName, categoryUUID, scheduledStartDate, scheduledEndDate, url, }) => {
    try {
        await httpClient.postJson({
            path: '/v2/integration/todo',
            body: {
                label: taskName,
                categoryUUID: categoryUUID,
                scheduledStartDate: scheduledStartDate,
                scheduledEndDate: scheduledEndDate,
                url: url,
            },
        });
        return {
            content: [
                {
                    type: 'text',
                    text: `Task "${taskName}" created successfully.`,
                },
            ],
        };
    }
    catch (error) {
        console.error('Error creating task:', error);
        return {
            content: [
                {
                    type: 'text',
                    text: `Error creating task: ${error}`,
                },
            ],
        };
    }
};
