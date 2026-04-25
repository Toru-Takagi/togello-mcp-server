import { httpClient } from '../../client.js';
import { errorToolResponse, jsonToolResponse } from './toolResponse.js';
export const updateCalendarDateMemoHandler = async ({ date, memo, }) => {
    try {
        const normalizedMemo = memo.trim();
        await httpClient.putJson({
            path: `/v2/integration/calendar-date-memo/${encodeURIComponent(date)}`,
            body: {
                memo: normalizedMemo,
            },
        });
        return jsonToolResponse({
            targetDate: date,
            memo: normalizedMemo,
            updated: true,
        });
    }
    catch (error) {
        console.error('Error updating calendar date memo:', error);
        return errorToolResponse('Error updating calendar date memo');
    }
};
