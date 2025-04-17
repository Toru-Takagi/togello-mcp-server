import { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { httpClient } from "../../client.js";

export type UpdateTaskHandlerArgs = {
  todoUUID: z.ZodString;
  isCompleted: z.ZodBoolean;
};

type UpdateTaskRequest = {
  isCompleted: boolean;
};

export const updateTaskHandler: ToolCallback<UpdateTaskHandlerArgs> = async ({
  todoUUID,
  isCompleted,
}) => {
  try {
    await httpClient.putJson<null, UpdateTaskRequest>({
      path: `/v2/integration/todo/${todoUUID}`,
      body: {
        isCompleted,
      },
    });
    return {
      content: [
        {
          type: "text",
          text: `Task status updated successfully. Task is now ${
            isCompleted ? "completed" : "incomplete"
          }.`,
        },
      ],
    };
  } catch (error) {
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
