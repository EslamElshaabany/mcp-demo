import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { errorMessage, sleep } from '../utils.ts'

export const LOG_LEVELS = [
  'debug',
  'info',
  'notice',
  'warning',
  'error',
  'critical',
  'alert',
  'emergency',
] as const

export function registerTools(server: McpServer): void {
  // ---------------------------------------------------------------------------
  // echo — the "hello world" tool: input schema, structured output schema,
  // and tool annotations.
  // ---------------------------------------------------------------------------
  server.registerTool(
    'echo',
    {
      title: 'Echo',
      description:
        'Echoes a message back. Demonstrates input schema, structured output schema and annotations.',
      inputSchema: {
        message: z.string().describe('The message to echo back'),
      },
      outputSchema: {
        echoed: z.string(),
        length: z.number(),
        at: z.string(),
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ message }) => {
      const output = {
        echoed: message,
        length: message.length,
        at: new Date().toISOString(),
      }
      return {
        structuredContent: output,
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
      }
    },
  )

  // ---------------------------------------------------------------------------
  // roll-dice — fake "logic" with validated/defaulted arguments.
  // ---------------------------------------------------------------------------
  server.registerTool(
    'roll-dice',
    {
      title: 'Roll Dice',
      description: 'Rolls N dice with S sides. Purely random, purely fake.',
      inputSchema: {
        sides: z.number().int().min(2).max(100).default(6).describe('Sides per die'),
        rolls: z.number().int().min(1).max(20).default(1).describe('How many dice to roll'),
      },
      outputSchema: {
        results: z.array(z.number()),
        total: z.number(),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ sides, rolls }) => {
      const results = Array.from({ length: rolls }, () => 1 + Math.floor(Math.random() * sides))
      const output = { results, total: results.reduce((a, b) => a + b, 0) }
      return {
        structuredContent: output,
        content: [
          { type: 'text', text: `Rolled ${rolls}d${sides}: ${results.join(', ')} (total ${output.total})` },
        ],
      }
    },
  )

  // ---------------------------------------------------------------------------
  // long-task — progress notifications (notifications/progress) and
  // cancellation (notifications/cancelled -> AbortSignal).
  // ---------------------------------------------------------------------------
  server.registerTool(
    'long-task',
    {
      title: 'Long Running Task',
      description:
        'Pretends to work for a while, reporting progress notifications if the client supplies a progressToken. Honors cancellation.',
      inputSchema: {
        steps: z.number().int().min(1).max(20).default(5).describe('Number of fake work steps'),
        stepDelayMs: z
          .number()
          .int()
          .min(50)
          .max(5000)
          .default(500)
          .describe('Delay between steps in milliseconds'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ steps, stepDelayMs }, extra) => {
      const progressToken = extra._meta?.progressToken
      try {
        for (let i = 1; i <= steps; i++) {
          await sleep(stepDelayMs, extra.signal)
          if (progressToken !== undefined) {
            await extra.sendNotification({
              method: 'notifications/progress',
              params: {
                progressToken,
                progress: i,
                total: steps,
                message: `Completed step ${i} of ${steps}`,
              },
            })
          }
        }
      } catch (err) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Long task aborted: ${errorMessage(err)}` }],
        }
      }
      return {
        content: [{ type: 'text', text: `Long task finished all ${steps} steps.` }],
      }
    },
  )

  // ---------------------------------------------------------------------------
  // ask-user — ELICITATION: the server asks the *user* for structured input
  // through the client (elicitation/create).
  // ---------------------------------------------------------------------------
  server.registerTool(
    'ask-user',
    {
      title: 'Ask User',
      description:
        'Asks the user a few questions via elicitation (elicitation/create) and echoes the answers.',
      inputSchema: {
        reason: z.string().optional().describe('Why the server is asking'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ reason }) => {
      try {
        const result = await server.server.elicitInput({
          message: reason ?? 'The demo server would like to know more about you.',
          requestedSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', title: 'Name', description: 'Your display name' },
              role: {
                type: 'string',
                title: 'Role',
                enum: ['developer', 'manager', 'curious bystander'],
              },
              lovesMcp: {
                type: 'boolean',
                title: 'Do you love MCP?',
                default: true,
              },
            },
            required: ['name'],
          },
        })
        return {
          content: [
            { type: 'text', text: `Elicitation result:\n${JSON.stringify(result, null, 2)}` },
          ],
        }
      } catch (err) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Elicitation failed (the client may not support it): ${errorMessage(err)}`,
            },
          ],
        }
      }
    },
  )

  // ---------------------------------------------------------------------------
  // emit-logs — LOGGING: sends notifications/message at every log level.
  // The SDK filters these per-session based on logging/setLevel.
  // ---------------------------------------------------------------------------
  server.registerTool(
    'emit-logs',
    {
      title: 'Emit Logs',
      description:
        'Sends one log notification per level (debug..emergency). Use logging/setLevel on the client to filter.',
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (extra) => {
      for (const level of LOG_LEVELS) {
        // Passing the session id lets the SDK filter by this session's
        // configured log level (logging/setLevel).
        await server.sendLoggingMessage(
          { level, logger: 'mcp-demo', data: `Sample "${level}" log message` },
          extra.sessionId,
        )
      }
      return {
        content: [
          { type: 'text', text: `Emitted ${LOG_LEVELS.length} log notifications (all levels).` },
        ],
      }
    },
  )
}
