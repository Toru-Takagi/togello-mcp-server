export const getJapanCurrentTimeHandler = async () => {
    try {
        const now = new Date();
        // 日本標準時（JST）でフォーマット
        const jstTime = now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
        return {
            content: [
                {
                    type: 'text',
                    text: `現在の日本時刻（JST）は: ${jstTime}`,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `日本時刻取得中にエラーが発生しました: ${error}`,
                },
            ],
        };
    }
};
