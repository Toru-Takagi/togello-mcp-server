import { httpClient } from '../../client.js';
export const getTodayCalendarHandler = async () => {
    try {
        const googleEvents = await httpClient.fetchURL({
            path: '/v2/integration/google-calendar/event',
        });
        return {
            content: [
                {
                    type: 'text',
                    text: `The following is a single event represented in the order:
[title of event, start date of event, end date of event]`,
                },
                {
                    type: 'text',
                    text: googleEvents.items
                        .map((event) => [
                        event.summary,
                        formatEventTime(event.start),
                        formatEventTime(event.end),
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
/**
 * EventDateTime型から表示用の日時文字列を取得する
 */
const formatEventTime = (dateTime) => {
    // 全日イベントの場合はdate、そうでない場合はdateTimeを使用
    if (dateTime.date) {
        return dateTime.date; // yyyy-mm-dd形式
    }
    if (dateTime.dateTime) {
        // RFC3339形式の日時をより読みやすい形式に変換
        const dt = new Date(dateTime.dateTime);
        return dt.toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: dateTime.timeZone,
        });
    }
    return '不明な日時';
};
