import { errorToolResponse, jsonToolResponse } from './toolResponse.js';
export const getJapanCurrentTimeHandler = async () => {
    try {
        const now = new Date();
        const jstTime = now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
        return jsonToolResponse({
            timeZone: 'Asia/Tokyo',
            currentTime: jstTime,
        });
    }
    catch (error) {
        console.error('Error getting Japan current time:', error);
        return errorToolResponse('Error getting Japan current time');
    }
};
