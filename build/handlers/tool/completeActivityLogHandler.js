import { httpClient } from "../../client.js";
export const completeActivityLogHandler = async ({ activityLogUUID }) => {
    try {
        await httpClient.putJson({
            path: `/v2/integration/activity-logs/${activityLogUUID}/work-complete`,
            body: {},
        });
        return {
            content: [
                {
                    type: "text",
                    text: `Activity log with UUID "${activityLogUUID}" completed successfully.`,
                },
            ],
        };
    }
    catch (error) {
        console.error("Error completing activity log:", error);
        return {
            content: [
                {
                    type: "text",
                    text: `Error completing activity log: ${error}`,
                },
            ],
        };
    }
};
