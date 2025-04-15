#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { tasksHandler } from "./handlers/tasksHandler.js";
const server = new McpServer({
    name: "togello",
    version: "1.0.0",
    capabilities: {
        resources: {},
    },
});
async function main() {
    const transport = new StdioServerTransport();
    server.resource("togello-todos", "togello://tasks", tasksHandler);
    await server.connect(transport);
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
