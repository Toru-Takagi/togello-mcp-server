import { httpClient } from '../../client.js';
export const activityItemListHandler = async (uri, _options) => {
    try {
        const activityItemList = await httpClient.fetchURL({
            path: '/v2/integration/activity-items',
        });
        return {
            contents: [
                {
                    type: 'text',
                    uri: uri.href,
                    text: `The following is a single activity item represented in the order:
[activity item uuid, item name]`,
                },
                {
                    type: 'text',
                    uri: uri.href,
                    text: activityItemList
                        .map((item) => [item.activityItemUUID, item.itemName])
                        .join(','),
                },
            ],
        };
    }
    catch (error) {
        console.error('Error in resource handler:', error);
        return {
            contents: [
                {
                    type: 'text',
                    uri: uri.href,
                    text: `Error in resource handler: ${error}`,
                },
            ],
        };
    }
};
