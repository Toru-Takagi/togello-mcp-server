import type { ReadResourceCallback } from '@modelcontextprotocol/sdk/server/mcp.js'
import { httpClient } from '../../client.js'

export const activityItemListHandler: ReadResourceCallback = async (
  uri,
  _options,
) => {
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
      contents: [
        {
          type: 'text',
          uri: uri.href,
          text: `The following is a single activity item represented in the order:
[activity item uuid, item name]`,
        },
        {
          type: 'text',
          uri: uri.href,
          text: enabledActivityItemList
            .map((item) => [item.activityItemUUID, item.itemName])
            .join(','),
        },
      ],
    }
  } catch (error) {
    console.error('Error in resource handler:', error)
    return {
      contents: [
        {
          type: 'text',
          uri: uri.href,
          text: `Error in resource handler: ${error}`,
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
