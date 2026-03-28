import { httpClient } from '../../client.js';
export const updateTodayMemoHandler = async ({ memo }) => {
    try {
        await httpClient.putJson({
            path: '/v2/integration/calendar-date-memo/today',
            body: {
                memo,
            },
        });
        return {
            content: [
                {
                    type: 'text',
                    text: 'Today memo updated successfully.',
                },
            ],
        };
    }
    catch (error) {
        console.error('Error updating today memo:', error);
        return {
            content: [
                {
                    type: 'text',
                    text: `Error updating today memo: ${error}`,
                },
            ],
        };
    }
};
