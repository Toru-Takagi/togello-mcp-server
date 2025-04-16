import { httpClient } from "../../client.js";
export const getActivityItemListHandler = async ({}) => {
    try {
        const activityItemList = await httpClient.fetchURL({
            path: "/v2/integration/activity-items",
        });
        return {
            content: [
                {
                    type: "text",
                    text: `The following is a single activity item represented in the order:
[activity item uuid, item name]`,
                },
                {
                    type: "text",
                    text: activityItemList
                        .map((item) => [item.activityItemUUID, item.itemName])
                        .join(","),
                },
            ],
        };
    }
    catch (error) {
        console.error("Error in tool handler:", error);
        return {
            content: [
                {
                    type: "text",
                    text: `Error in tool handler: ${error}`,
                },
            ],
        };
    }
};
