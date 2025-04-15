#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
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
    server.tool("get-tasks-list", {}, getTodoListHandler);
    await server.connect(transport);
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
