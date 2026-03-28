import { httpClient } from '../../client.js';
export const updateCalendarDateMemoHandler = async ({ date, memo }) => {
    try {
        const normalizedMemo = memo.trim();
        await httpClient.putJson({
            path: `/v2/integration/calendar-date-memo/${encodeURIComponent(date)}`,
            body: {
                memo: normalizedMemo,
            },
        });
        return {
            content: [
                {
                    type: 'text',
                    text: 'Calendar date memo updated successfully.',
                },
            ],
        };
    }
    catch (error) {
        console.error('Error updating calendar date memo:', error);
        return {
            isError: true,
            content: [
                {
                    type: 'text',
                    text: `Error updating calendar date memo: ${error}`,
                },
            ],
        };
    }
};
