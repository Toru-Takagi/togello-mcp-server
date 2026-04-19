import { httpClient } from '../../client.js';
import { errorToolResponse, jsonToolResponse } from './toolResponse.js';
export const getActivityItemListHandler = async () => {
    try {
        const activityItemList = await httpClient.fetchURL({
            path: '/v2/integration/activity-items',
        });
        const enabledActivityItemList = activityItemList.filter((item) => item.enabled === 'true');
        return jsonToolResponse({
            activityItems: enabledActivityItemList.map((item) => ({
                activityItemUUID: item.activityItemUUID,
                itemName: item.itemName,
            })),
        });
    }
    catch (error) {
        console.error('Error in tool handler:', error);
        return errorToolResponse('Error retrieving activity items');
    }
};
