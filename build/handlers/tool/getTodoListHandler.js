import { httpClient } from "../../client.js";
export const getTodoListHandler = async ({}) => {
    try {
        const tasks = await httpClient.fetchURL({
            path: "/v2/integration/todo",
        });
        return {
            content: [
                {
                    type: "text",
                    uri: new URL("togello://tasks"),
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
        console.error("Error in tool handler:", error);
        return {
            content: [
                {
                    type: "text",
                    uri: new URL("togello://tasks"),
                    text: `Error in tool handler: ${error}`,
                },
            ],
        };
    }
};
