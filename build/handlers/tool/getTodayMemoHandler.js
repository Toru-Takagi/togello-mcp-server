import { httpClient } from '../../client.js';
export const getTodayMemoHandler = async () => {
    try {
        const todayMemo = await httpClient.fetchURL({
            path: '/v2/integration/calendar-date-memo/today',
        });
        return {
            content: [
                {
                    type: 'text',
                    text: `targetDate: ${todayMemo.targetDate}\nmemo: ${todayMemo.memo ?? ''}`,
                },
            ],
        };
    }
    catch (error) {
        console.error('Error getting today memo:', error);
        return {
            content: [
                {
                    type: 'text',
                    text: `Error getting today memo: ${error}`,
                },
            ],
        };
    }
};
