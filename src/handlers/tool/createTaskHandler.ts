import { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { httpClient } from "../../client.js";

export type CreateTaskHandlerArgs = {
  taskName: z.ZodString;
};

type CreateTaskRequest = {
  label: string;
};

export const createTaskHandler: ToolCallback<CreateTaskHandlerArgs> = async ({
  taskName,
}) => {
  try {
    await httpClient.postJson<null, CreateTaskRequest>({
      path: "/v2/integration/todo",
      body: {
        label: taskName,
      },
    });
    return {
      content: [
        {
          type: "text",
          text: `Task "${taskName}" created successfully.`,
        },
      ],
    };
  } catch (error) {
    console.error("Error creating task:", error);
    return {
      content: [
        {
          type: "text",
          text: `Error creating task: ${error}`,
        },
      ],
    };
  }
};
