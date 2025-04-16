#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createTaskHandler } from "./handlers/tool/createTaskHandler.js";
import { getActivityItemListHandler } from "./handlers/tool/getActivityItemListHandler.js";
import { getTodayCalendarHandler } from "./handlers/tool/getTodayCalendarHandler.js";
import { getTodoCategoryListHandler } from "./handlers/tool/getTodoCategoryListHandler.js";
import { getTodoListHandler } from "./handlers/tool/getTodoListHandler.js";
const server = new McpServer({
    name: "togello",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
    },
});
async function main() {
    const transport = new StdioServerTransport();
    // server.resource("togello-todos", "togello://tasks", tasksHandler);
    // server.resource(
    //   "category-list",
    //   "togello://category-list",
    //   categoryListHandler
    // );
    // server.resource(
    //   "activity-item-list",
    //   "togello://activity-item-list",
    //   categoryListHandler
    // );
    server.tool("get-tasks-list", "Retrieves incomplete tasks from the TODO feature. Recognizes task name / scheduled start date and time / scheduled end date and time / priority / category", {}, getTodoListHandler);
    server.tool("create-task", "Creates a new task in the TODO feature.", {
        taskName: z.string().describe("create task name"),
        categoryUUID: z
            .string()
            .optional()
            .describe("category UUID. category UUID of get-todo-category-list"),
    }, createTaskHandler);
    server.tool("get-todo-category-list", "Retrieves the list of categories from the TODO feature. Recognizes category name / category UUID", {}, getTodoCategoryListHandler);
    server.tool("get-today-calendar", "Retrieves scheduled events for yesterday/today/tomorrow from the linked Google Calendar. Recognizes event name / start date and time / end date and time. ", {}, getTodayCalendarHandler);
    server.tool("get-activity-item-list", "Retrieves the list of activity items from the integration feature. Recognizes activity item UUID / item name", {}, getActivityItemListHandler);
    await server.connect(transport);
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
