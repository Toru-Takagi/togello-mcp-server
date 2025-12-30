import type { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js'
import { httpClient } from '../../client.js'

export const getActivityItemListHandler: ToolCallback<
  Record<string, never>
> = async () => {
  try {
    const activityItemList = await httpClient.fetchURL<
      ActivityItemListResponse[]
    >({
      path: '/v2/integration/activity-items',
    })

    const enabledActivityItemList = activityItemList.filter(
      (item) => item.enabled === 'true',
    )

    return {
      content: [
        {
          type: 'text',
          text: `The following is a single activity item represented in the order:
[activity item uuid, item name]`,
        },
        {
          type: 'text',
          text: enabledActivityItemList
            .map((item) => [item.activityItemUUID, item.itemName])
            .join(','),
        },
      ],
    }
  } catch (error) {
    console.error('Error in tool handler:', error)
    return {
      content: [
        {
          type: 'text',
          text: `Error in tool handler: ${error}`,
        },
      ],
    }
  }
}

type ActivityItemListResponse = {
  activityItemUUID: string
  itemName: string
  enabled: string
}
