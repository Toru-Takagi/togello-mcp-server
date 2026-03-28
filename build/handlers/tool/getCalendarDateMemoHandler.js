import { httpClient } from '../../client.js';
export const getCalendarDateMemoHandler = async ({ date }) => {
    try {
        const calendarDateMemo = await httpClient.fetchURL({
            path: `/v2/integration/calendar-date-memo/${encodeURIComponent(date)}`,
        });
        return {
            content: [
                {
                    type: 'text',
                    text: `targetDate: ${calendarDateMemo.targetDate}\nmemo: ${calendarDateMemo.memo ?? ''}`,
                },
            ],
        };
    }
    catch (error) {
        console.error('Error getting calendar date memo:', error);
        return {
            isError: true,
            content: [
                {
                    type: 'text',
                    text: `Error getting calendar date memo: ${error}`,
                },
            ],
        };
    }
};
