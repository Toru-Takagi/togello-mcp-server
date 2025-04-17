import { httpClient } from "../../client.js";
export const updateTaskHandler = async ({ todoUUID, isCompleted, }) => {
    try {
        await httpClient.putJson({
            path: `/v2/integration/todo/${todoUUID}`,
            body: {
                isCompleted,
            },
        });
        return {
            content: [
                {
                    type: "text",
                    text: `Task status updated successfully. Task is now ${isCompleted ? "completed" : "incomplete"}.`,
                },
            ],
        };
    }
    catch (error) {
        console.error("Error updating task:", error);
        return {
            content: [
                {
                    type: "text",
                    text: `Error updating task: ${error}`,
                },
            ],
        };
    }
};
