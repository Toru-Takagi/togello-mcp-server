import { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import { httpClient } from "../../client.js";

export const getTodoCategoryListHandler: ToolCallback<{}> = async ({}) => {
  try {
    const categoryList = await httpClient.fetchURL<CategoryListResponse[]>({
      path: "/v2/integration/categories",
    });

    return {
      content: [
        {
          type: "text",
          text: `The following is a single category represented in the order:
[category uuid, label of category]`,
        },
        {
          type: "text",
          text: categoryList
            .map((category) => [category.categoryUUID, category.label])
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
          text: `Error in tool handler: ${error}`,
        },
      ],
    };
  }
};

type CategoryListResponse = {
  categoryUUID: string | null;
  label: string;
  operatedAt: string;
};
