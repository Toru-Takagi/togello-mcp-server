import { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import { httpClient } from "../../client.js";

export const getTodoListHandler: ToolCallback<{}> = async ({}) => {
  try {
    const tasks = await httpClient.fetchURL<TodoListResponse>({
      path: "/v2/integration/todo",
    });

    return {
      content: [
        {
          type: "text",
          uri: new URL("togello://tasks"),
          text: tasks
            .map((todo) =>
              JSON.stringify({
                label: todo.label,
                scheduledStartDate: todo.scheduledStartDate,
                scheduledEndDate: todo.scheduledEndDate,
                priorityNumber: todo.priorityNumber,
              })
            )
            .join(","),
        },
      ],
    };
  } catch (error) {
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

type TodoListResponse = {
  todoUUID: string | null;
  todoSettingUUID: string | null;
  label: string;
  priorityNumber: number;
  completedAt: string | null;
  operatedAt: string;
  createdAt: string;
  scheduledStartDate: string | null;
  scheduledEndDate: string | null;
  url: string | null;
  detail: string;
  categoryUUID: string | null;
  categoryLabel: string | null;
}[];
