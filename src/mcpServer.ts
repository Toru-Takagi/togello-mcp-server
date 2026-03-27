import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { runWithUpstreamToken } from './upstreamTokenContext.js'
import { completeActivityLogHandler } from './handlers/tool/completeActivityLogHandler.js'
import { createTaskHandler } from './handlers/tool/createTaskHandler.js'
import { getActivityItemListHandler } from './handlers/tool/getActivityItemListHandler.js'
import { getActivityLogListHandler } from './handlers/tool/getActivityLogListHandler.js'
import { getJapanCurrentTimeHandler } from './handlers/tool/getJapanCurrentTimeHandler.js'
import { getTodayCalendarHandler } from './handlers/tool/getTodayCalendarHandler.js'
import { getTodayMemoHandler } from './handlers/tool/getTodayMemoHandler.js'
import { getTodoCategoryListHandler } from './handlers/tool/getTodoCategoryListHandler.js'
import { getTodoListHandler } from './handlers/tool/getTodoListHandler.js'
import { startActivityLogHandler } from './handlers/tool/startActivityLogHandler.js'
import { updateTodayMemoHandler } from './handlers/tool/updateTodayMemoHandler.js'
import { updateTaskHandler } from './handlers/tool/updateTaskHandler.js'

export type UpstreamTokenResolver = (sessionId?: string) => string | undefined

export type CreateMcpServerOptions = {
  resolveUpstreamToken?: UpstreamTokenResolver
}

function withUpstreamToken(cb: any, resolveUpstreamToken?: UpstreamTokenResolver): any {
  return async (args: any, extra: { sessionId?: string }) => {
    const token = resolveUpstreamToken?.(extra.sessionId)
    if (!token) {
      return await cb(args, extra)
    }
    return await runWithUpstreamToken(token, () => cb(args, extra))
  }
}

export function createMcpServer(options: CreateMcpServerOptions = {}): McpServer {
  const server = new McpServer({
    name: 'togello',
    version: '1.0.0',
    capabilities: {
      resources: {},
      tools: {},
    },
  })

  server.tool(
    'get-tasks-list',
    'Retrieves incomplete tasks from the TODO feature. Recognizes task uuid / task name / detail / scheduled start date and time / scheduled end date and time / priority / category',
    {
      categoryUUIDs: z.array(z.string()).optional().describe('Filters tasks by specified category UUIDs.'),
    },
    withUpstreamToken(getTodoListHandler, options.resolveUpstreamToken),
  )
  server.tool(
    'create-task',
    'Creates a new task in the TODO feature.',
    {
      taskName: z.string().describe('create task name'),
      categoryUUID: z
        .string()
        .optional()
        .describe('category UUID. category UUID of get-todo-category-list'),
      scheduledStartDate: z.string().optional().describe('Scheduled start date in ISO format.'),
      scheduledEndDate: z.string().optional().describe('Scheduled end date in ISO format.'),
      url: z.string().optional().describe('Optional URL associated with the task.'),
      detail: z.string().optional().describe('Optional detail associated with the task.'),
    },
    withUpstreamToken(createTaskHandler, options.resolveUpstreamToken),
  )
  server.tool(
    'update-task',
    'Updates a task in the TODO feature.',
    {
      todoUUID: z
        .string()
        .describe(
          'Task UUID. Please specify the task uuid (todo uuid) obtained from get-tasks-list. You cannot use this tool without specifying it.',
        ),
      isCompleted: z
        .boolean()
        .describe('Required. Updates the completion status of the task. If true, it is completed.'),
      scheduledStartDate: z
        .string()
        .optional()
        .describe(
          'Scheduled start date in ISO format. If the user does not specify, the information obtained from get-tasks-list is passed.',
        ),
      scheduledEndDate: z
        .string()
        .optional()
        .describe(
          'Scheduled end date in ISO format. If the user does not specify, the information obtained from get-tasks-list is passed.',
        ),
      url: z
        .string()
        .optional()
        .describe(
          'Optional URL associated with the task. If the user does not specify, the information obtained from get-tasks-list is passed.',
        ),
      detail: z
        .string()
        .optional()
        .describe(
          'Optional detail associated with the task. If the user does not specify, the information obtained from get-tasks-list is passed.',
        ),
    },
    withUpstreamToken(updateTaskHandler, options.resolveUpstreamToken),
  )
  server.tool(
    'get-today-memo',
    'Retrieves today\'s memo from the calendar date memo feature. Recognizes target date and memo content.',
    {},
    withUpstreamToken(getTodayMemoHandler, options.resolveUpstreamToken),
  )
  server.tool(
    'update-today-memo',
    'Updates today\'s memo in the calendar date memo feature.',
    {
      memo: z
        .string()
        .describe('Memo content for today. Pass an empty or whitespace-only string to clear today\'s memo.'),
    },
    withUpstreamToken(updateTodayMemoHandler, options.resolveUpstreamToken),
  )
  server.tool(
    'get-todo-category-list',
    'Retrieves the list of categories from the TODO feature. Recognizes category name / category UUID',
    {},
    withUpstreamToken(getTodoCategoryListHandler, options.resolveUpstreamToken),
  )
  server.tool(
    'get-today-calendar',
    'Retrieves scheduled events for yesterday/today/tomorrow from the linked Google Calendar. Recognizes event name / start date and time / end date and time. ',
    {},
    withUpstreamToken(getTodayCalendarHandler, options.resolveUpstreamToken),
  )
  server.tool(
    'get-activity-item-list',
    'Retrieves the list of activity items from the integration feature. Recognizes activity item UUID / item name',
    {},
    withUpstreamToken(getActivityItemListHandler, options.resolveUpstreamToken),
  )
  server.tool(
    'get-activity-log-list',
    'Retrieves the list of activity logs from the integration feature. Since it is a record of what the person has done, if all the end dates are filled in, this person is not doing anything now. If there is one with a null end date, there should be at most one, and if there is one, it means that the person is doing it now. Recognizes activity log UUID / start date and time / end date and time / item name.',
    {},
    withUpstreamToken(getActivityLogListHandler, options.resolveUpstreamToken),
  )
  server.tool(
    'start-activity-log',
    'Starts an activity log.',
    {
      activityItemName: z
        .string()
        .describe(
          'You must specify a valid itemName obtained from get-activity-item-list. This tool requires a pre-existing activity item.',
        ),
    },
    withUpstreamToken(startActivityLogHandler, options.resolveUpstreamToken),
  )
  server.tool(
    'complete-activity-log',
    'Completes an activity log.',
    {
      activityLogUUID: z
        .string()
        .describe(
          'You must specify a valid activityLogUUID obtained from get-activity-log-list. This tool requires an existing activity log.',
        ),
    },
    withUpstreamToken(completeActivityLogHandler, options.resolveUpstreamToken),
  )
  server.tool(
    'get-japan-current-time',
    'Returns the current time in Japan (JST).',
    {},
    withUpstreamToken(getJapanCurrentTimeHandler, options.resolveUpstreamToken),
  )

  return server
}
