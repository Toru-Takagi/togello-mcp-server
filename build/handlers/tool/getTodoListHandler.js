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
                    text: `The following is a single task represented in the order:
[label of the task, scheduled start date, scheduled end date, priority, category of the task]`,
                },
                {
                    type: "text",
                    text: `The tasks with scheduled start dates that are today or in the past, and those with a priority of 2, should be addressed as soon as possible.`,
                },
                {
                    type: "text",
                    text: tasks
                        .map((todo) => [
                        todo.label,
                        todo.scheduledStartDate,
                        todo.scheduledEndDate,
                        todo.priorityNumber,
                        todo.categoryLabel,
                    ])
                        .join(","),
                    // text: tasks
                    //   .map((todo) =>
                    //     JSON.stringify({
                    //       label: todo.label,
                    //       scheduledStartDate: todo.scheduledStartDate,
                    //       scheduledEndDate: todo.scheduledEndDate,
                    //       priorityNumber: todo.priorityNumber,
                    //     })
                    //   )
                    //   .join(","),
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
