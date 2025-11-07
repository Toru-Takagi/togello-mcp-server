#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { completeActivityLogHandler } from './handlers/tool/completeActivityLogHandler.js'
import { createTaskHandler } from './handlers/tool/createTaskHandler.js'
import { getActivityItemListHandler } from './handlers/tool/getActivityItemListHandler.js'
import { getActivityLogListHandler } from './handlers/tool/getActivityLogListHandler.js'
import { getJapanCurrentTimeHandler } from './handlers/tool/getJapanCurrentTimeHandler.js'
import { getTodayCalendarHandler } from './handlers/tool/getTodayCalendarHandler.js'
import { getTodoCategoryListHandler } from './handlers/tool/getTodoCategoryListHandler.js'
import { getTodoListHandler } from './handlers/tool/getTodoListHandler.js'
import { startActivityLogHandler } from './handlers/tool/startActivityLogHandler.js'
import { updateTaskHandler } from './handlers/tool/updateTaskHandler.js'

const server = new McpServer({
  name: 'togello',
  version: '1.0.0',
  capabilities: {
    resources: {},
    tools: {},
  },
})

async function main() {
  const transport = new StdioServerTransport()
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
  server.tool(
    'get-tasks-list',
    'Retrieves incomplete tasks from the TODO feature. Recognizes task uuid / task name / scheduled start date and time / scheduled end date and time / priority / category',
    {
      categoryUUIDs: z.array(z.string()).optional().describe('Filters tasks by specified category UUIDs.'),
    },
    getTodoListHandler,
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
      scheduledStartDate: z
        .string()
        .optional()
        .describe('Scheduled start date in ISO format.'),
      scheduledEndDate: z
        .string()
        .optional()
        .describe('Scheduled end date in ISO format.'),
      url: z
        .string()
        .optional()
        .describe('Optional URL associated with the task.'),
    },
    createTaskHandler,
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
        .describe(
          'You can update the completion status of the task. If true, it is completed.',
        ),
      scheduledStartDate: z
        .string()
        .optional()
        .describe(
          'Scheduled start date in ISO format.If the user does not specify, the information obtained from get-tasks-list is passed.',
        ),
      scheduledEndDate: z
        .string()
        .optional()
        .describe(
          'Scheduled end date in ISO format.If the user does not specify, the information obtained from get-tasks-list is passed.',
        ),
      url: z
        .string()
        .optional()
        .describe(
          'Optional URL associated with the task.If the user does not specify, the information obtained from get-tasks-list is passed.',
        ),
    },
    updateTaskHandler,
  )
  server.tool(
    'get-todo-category-list',
    'Retrieves the list of categories from the TODO feature. Recognizes category name / category UUID',
    {},
    getTodoCategoryListHandler,
  )
  server.tool(
    'get-today-calendar',
    'Retrieves scheduled events for yesterday/today/tomorrow from the linked Google Calendar. Recognizes event name / start date and time / end date and time. ',
    {},
    getTodayCalendarHandler,
  )
  server.tool(
    'get-activity-item-list',
    'Retrieves the list of activity items from the integration feature. Recognizes activity item UUID / item name',
    {},
    getActivityItemListHandler,
  )
  server.tool(
    'get-activity-log-list',
    'Retrieves the list of activity logs from the integration feature. Since it is a record of what the person has done, if all the end dates are filled in, this person is not doing anything now. If there is one with a null end date, there should be at most one, and if there is one, it means that the person is doing it now. Recognizes activity log UUID / start date and time / end date and time / item name.',
    {},
    getActivityLogListHandler,
  )
  server.tool(
    'start-activity-log',
    // 'Starts an activity log. If all the endDateTime of get-activity-log-list have values, it means that nothing is being done, so start-activity-log can be called.',
    'Starts an activity log.',
    {
      activityItemName: z
        .string()
        .describe(
          'Activity log name. Please specify the itemName obtained from get-activity-item-list. You cannot specify a value that is not in itemName, so this tool cannot be used.',
        ),
    },
    startActivityLogHandler,
  )
  server.tool(
    'complete-activity-log',
    // 'Completes an activity log. If all the endDateTime of get-activity-log-list have values, it means that nothing is being done, so start-activity-log can be called.',
    'Completes an activity log.',
    {
      activityLogUUID: z
        .string()
        .describe(
          'Activity log UUID. Please specify the activityLogUUID obtained from get-activity-log-list. You cannot specify a value that is not in activityLogUUID, so this tool cannot be used.',
        ),
    },
    completeActivityLogHandler,
  )
  server.tool(
    'get-japan-current-time',
    'Returns the current time in Japan (JST).',
    {},
    getJapanCurrentTimeHandler,
  )
  await server.connect(transport)
}

main().catch((error) => {
  console.error('Fatal error in main():', error)
  process.exit(1)
})

// en:     'Starts an activity log. If all the endDateTime of get-activity-log-list have values, it means that nothing is being done, so start-activity-log can be called.',
// ja:     'アクティビティログを開始します。get-activity-log-listのendDateTimeがすべて値を持っている場合、何もしていないことを意味します。そのため、start-activity-logを呼び出すことができます。'
