import { httpClient } from "../../client.js";
export const getActivityLogListHandler = async ({}) => {
    try {
        const activityLogList = await httpClient.fetchURL({
            path: "/v2/integration/activity-logs",
        });
        return {
            content: [
                {
                    type: "text",
                    text: `The following is a list of activity logs. Since it is a record of what the person has done, if all the end dates are filled in, this person is not doing anything now. If there is one with a null end date, there should be at most one, and if there is one, it means that the person is doing it now. The information is in the following order: [activity log UUID, start date and time, end date and time, item name]`,
                },
                {
                    type: "text",
                    text: activityLogList
                        .map((log) => [
                        log.activityLogUUID,
                        log.startDateTime,
                        log.endDateTime,
                        log.itemName,
                    ])
                        .join("\n"),
                },
            ],
        };
    }
    catch (error) {
        console.error("Error in activity log list handler:", error);
        return {
            content: [
                {
                    type: "text",
                    text: `アクティビティログの取得中にエラーが発生しました: ${error}`,
                },
            ],
        };
    }
};
