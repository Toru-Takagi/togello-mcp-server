import { httpClient } from "../../client.js";
export const tasksHandler = async (uri, {}) => {
    try {
        const tasks = await httpClient.fetchURL({
            path: "/v2/integration/todo",
        });
        return {
            contents: [
                {
                    type: "text",
                    uri: uri.href,
                    text: tasks
                        .map((todo) => JSON.stringify({
                        label: todo.label,
                        scheduledStartDate: todo.scheduledStartDate,
                        scheduledEndDate: todo.scheduledEndDate,
                        priorityNumber: todo.priorityNumber,
                    }))
                        .join(","),
                },
            ],
        };
    }
    catch (error) {
        console.error("Error in resource handler:", error);
        return {
            contents: [
                {
                    type: "text",
                    uri: uri.href,
                    text: `Error in resource handler: ${error}`,
                },
            ],
        };
    }
};
