# Togello MCP Server

This server implements the Model Context Protocol (MCP) for managing context in applications.

## Using npm

```
{
  "mcpServers": {
    "togello": {
      "command": "npx",
      "args": ["-y", "@Toru-Takagi/togello-mcp-server"],
      "env": {
        "TOGELLO_API_TOKEN": "replace_with_your_token",
      }
    }
  }
}

```
