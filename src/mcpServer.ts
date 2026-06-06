import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import { completeActivityLogHandler } from './handlers/tool/completeActivityLogHandler.js'
import { createTaskHandler } from './handlers/tool/createTaskHandler.js'
import { getActivityItemListHandler } from './handlers/tool/getActivityItemListHandler.js'
import { getActivityLogListHandler } from './handlers/tool/getActivityLogListHandler.js'
import { getCalendarDateMemoHandler } from './handlers/tool/getCalendarDateMemoHandler.js'
import { getJapanCurrentTimeHandler } from './handlers/tool/getJapanCurrentTimeHandler.js'
import { getTodayCalendarHandler } from './handlers/tool/getTodayCalendarHandler.js'
import { getTodoCategoryListHandler } from './handlers/tool/getTodoCategoryListHandler.js'
import { getTodoListHandler } from './handlers/tool/getTodoListHandler.js'
import { startActivityLogHandler } from './handlers/tool/startActivityLogHandler.js'
import { errorToolResponse } from './handlers/tool/toolResponse.js'
import { updateCalendarDateMemoHandler } from './handlers/tool/updateCalendarDateMemoHandler.js'
import { updateTaskHandler } from './handlers/tool/updateTaskHandler.js'
import { runWithUpstreamToken } from './upstreamTokenContext.js'

export type UpstreamTokenResolver = (sessionId?: string) => string | undefined

export type CreateMcpServerOptions = {
  resolveUpstreamToken?: UpstreamTokenResolver
  requireUpstreamToken?: boolean
}

type ToolExtra = {
  sessionId?: string
}

type ToolHandler<TArgs extends Record<string, unknown>> = (
  args: TArgs,
  extra: ToolExtra,
) => CallToolResult | Promise<CallToolResult>

const calendarDateMemoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, expected YYYY-MM-DD')

const readOnlyToolAnnotations = {
  readOnlyHint: true,
  openWorldHint: false,
  destructiveHint: false,
}

const privateWriteToolAnnotations = {
  readOnlyHint: false,
  openWorldHint: false,
  destructiveHint: false,
}

const privateOverwriteToolAnnotations = {
  readOnlyHint: false,
  openWorldHint: false,
  destructiveHint: true,
}

function withUpstreamToken<TArgs extends Record<string, unknown>>(
  cb: ToolHandler<TArgs>,
  resolveUpstreamToken?: UpstreamTokenResolver,
  requireUpstreamToken = false,
): ToolHandler<TArgs> {
  return async (args, extra) => {
    const token = resolveUpstreamToken?.(extra.sessionId)
    if (!token && requireUpstreamToken) {
      return errorToolResponse(
        'Remote passthrough auth requires a Togello API token from the client Authorization header.',
      )
    }
    if (!token) {
      return await cb(args, extra)
    }
    return await runWithUpstreamToken(token, () => cb(args, extra))
  }
}

export function createMcpServer(
  options: CreateMcpServerOptions = {},
): McpServer {
  const server = new McpServer(
    {
      name: 'togello',
      version: '1.0.0',
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    },
  )

  server.registerTool(
    'get-tasks-list',
    {
      description:
        'Retrieves incomplete tasks from the TODO feature. Recognizes task uuid / task name / status / detail / scheduled start date and time / scheduled end date and time / deadline date and time / priority / category',
      inputSchema: {
        categoryUUIDs: z
          .array(z.string())
          .optional()
          .describe('Filters tasks by specified category UUIDs.'),
      },
      annotations: readOnlyToolAnnotations,
    },
    withUpstreamToken(
      getTodoListHandler,
      options.resolveUpstreamToken,
      options.requireUpstreamToken,
    ),
  )
  server.registerTool(
    'create-task',
    {
      description: 'Creates a new task in the TODO feature.',
      inputSchema: {
        taskName: z.string().describe('create task name'),
        status: z
          .enum(['TODO', 'PENDING', 'DOING', 'DONE'])
          .optional()
          .describe(
            'Optional. Creates the task with the specified todo status.',
          ),
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
        deadlineDateTime: z
          .string()
          .optional()
          .describe('Deadline date and time in ISO format.'),
        url: z
          .string()
          .optional()
          .describe('Optional URL associated with the task.'),
        detail: z
          .string()
          .optional()
          .describe('Optional detail associated with the task.'),
      },
      annotations: privateWriteToolAnnotations,
    },
    withUpstreamToken(
      createTaskHandler,
      options.resolveUpstreamToken,
      options.requireUpstreamToken,
    ),
  )
  server.registerTool(
    'update-task',
    {
      description: 'Updates a task in the TODO feature.',
      inputSchema: {
        todoUUID: z
          .string()
          .uuid()
          .describe(
            'Task UUID. Please specify the task uuid (todo uuid) obtained from get-tasks-list. You cannot use this tool without specifying it.',
          ),
        taskName: z
          .string()
          .optional()
          .describe(
            'Optional task name. If omitted, the current task name is kept.',
          ),
        isCompleted: z
          .boolean()
          .optional()
          .describe(
            'Optional. Backward-compatible completion update. true marks the task done. false preserves existing TODO or DOING tasks and reopens DONE tasks to TODO.',
          ),
        status: z
          .enum(['TODO', 'PENDING', 'DOING', 'DONE'])
          .optional()
          .describe(
            'Optional. Updates the todo status directly. Use this to switch tasks between TODO, PENDING, DOING, and DONE.',
          ),
        scheduledStartDate: z
          .string()
          .optional()
          .describe(
            'Scheduled start date in ISO format. If omitted, the current value is kept.',
          ),
        scheduledEndDate: z
          .string()
          .optional()
          .describe(
            'Scheduled end date in ISO format. If omitted, the current value is kept.',
          ),
        deadlineDateTime: z
          .string()
          .optional()
          .describe(
            'Deadline date and time in ISO format. If omitted, the current value is kept.',
          ),
        url: z
          .string()
          .optional()
          .describe(
            'Optional URL associated with the task. If omitted, the current value is kept.',
          ),
        detail: z
          .string()
          .optional()
          .describe(
            'Optional detail associated with the task. If omitted, the current value is kept.',
          ),
      },
      annotations: privateOverwriteToolAnnotations,
    },
    withUpstreamToken(
      updateTaskHandler,
      options.resolveUpstreamToken,
      options.requireUpstreamToken,
    ),
  )
  server.registerTool(
    'get-calendar-date-memo',
    {
      description:
        'Retrieves a calendar date memo for the specified date. Recognizes target date and memo content.',
      inputSchema: {
        date: calendarDateMemoDateSchema.describe(
          'Target date in YYYY-MM-DD format.',
        ),
      },
      annotations: readOnlyToolAnnotations,
    },
    withUpstreamToken(
      getCalendarDateMemoHandler,
      options.resolveUpstreamToken,
      options.requireUpstreamToken,
    ),
  )
  server.registerTool(
    'update-calendar-date-memo',
    {
      description: 'Updates a calendar date memo for the specified date.',
      inputSchema: {
        date: calendarDateMemoDateSchema.describe(
          'Target date in YYYY-MM-DD format.',
        ),
        memo: z
          .string()
          .describe(
            'Memo content for the date. Pass an empty or whitespace-only string to clear the memo.',
          ),
      },
      annotations: privateOverwriteToolAnnotations,
    },
    withUpstreamToken(
      updateCalendarDateMemoHandler,
      options.resolveUpstreamToken,
      options.requireUpstreamToken,
    ),
  )
  server.registerTool(
    'get-todo-category-list',
    {
      description:
        'Retrieves the list of categories from the TODO feature. Recognizes category name / category UUID',
      inputSchema: {},
      annotations: readOnlyToolAnnotations,
    },
    withUpstreamToken(
      getTodoCategoryListHandler,
      options.resolveUpstreamToken,
      options.requireUpstreamToken,
    ),
  )
  server.registerTool(
    'get-today-calendar',
    {
      description:
        'Retrieves scheduled events for yesterday/today/tomorrow from the linked Google Calendar. Recognizes event name / start date and time / end date and time. ',
      inputSchema: {},
      annotations: readOnlyToolAnnotations,
    },
    withUpstreamToken(
      getTodayCalendarHandler,
      options.resolveUpstreamToken,
      options.requireUpstreamToken,
    ),
  )
  server.registerTool(
    'get-activity-item-list',
    {
      description:
        'Retrieves the list of activity items from the integration feature. Recognizes activity item UUID / item name',
      inputSchema: {},
      annotations: readOnlyToolAnnotations,
    },
    withUpstreamToken(
      getActivityItemListHandler,
      options.resolveUpstreamToken,
      options.requireUpstreamToken,
    ),
  )
  server.registerTool(
    'get-activity-log-list',
    {
      description:
        'Retrieves the list of activity logs from the integration feature. Since it is a record of what the person has done, if all the end dates are filled in, this person is not doing anything now. If there is one with a null end date, there should be at most one, and if there is one, it means that the person is doing it now. Recognizes activity log UUID / start date and time / end date and time / item name.',
      inputSchema: {},
      annotations: readOnlyToolAnnotations,
    },
    withUpstreamToken(
      getActivityLogListHandler,
      options.resolveUpstreamToken,
      options.requireUpstreamToken,
    ),
  )
  server.registerTool(
    'start-activity-log',
    {
      description: 'Starts an activity log.',
      inputSchema: {
        activityItemName: z
          .string()
          .describe(
            'You must specify a valid itemName obtained from get-activity-item-list. This tool requires a pre-existing activity item.',
          ),
      },
      annotations: privateWriteToolAnnotations,
    },
    withUpstreamToken(
      startActivityLogHandler,
      options.resolveUpstreamToken,
      options.requireUpstreamToken,
    ),
  )
  server.registerTool(
    'complete-activity-log',
    {
      description: 'Completes an activity log.',
      inputSchema: {
        activityLogUUID: z
          .string()
          .uuid()
          .describe(
            'You must specify a valid activityLogUUID obtained from get-activity-log-list. This tool requires an existing activity log.',
          ),
      },
      annotations: privateOverwriteToolAnnotations,
    },
    withUpstreamToken(
      completeActivityLogHandler,
      options.resolveUpstreamToken,
      options.requireUpstreamToken,
    ),
  )
  server.registerTool(
    'get-japan-current-time',
    {
      description: 'Returns the current time in Japan (JST).',
      inputSchema: {},
      annotations: readOnlyToolAnnotations,
    },
    withUpstreamToken(
      getJapanCurrentTimeHandler,
      options.resolveUpstreamToken,
      options.requireUpstreamToken,
    ),
  )

  return server
}
