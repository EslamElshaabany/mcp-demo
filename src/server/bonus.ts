import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

/**
 * Registers a triad of "bonus" features (tool, resource, prompt) plus a
 * `toggle-bonus` tool that enables/disables any of them. enable()/disable()
 * on a registered feature makes the SDK emit the matching
 * `notifications/{tools,resources,prompts}/list_changed` message, so the
 * whole purpose of this module is to demonstrate that notification flow.
 */
export function registerBonus(server: McpServer): void {
  const bonusTool = server.registerTool(
    'bonus-tool',
    {
      title: 'Bonus Tool',
      description: 'A bonus tool that only exists to demonstrate tools/list_changed.',
      annotations: { readOnlyHint: true },
    },
    async () => ({ content: [{ type: 'text', text: 'You found the bonus tool!' }] }),
  )

  const bonusResource = server.registerResource(
    'bonus-resource',
    'demo://bonus',
    {
      title: 'Bonus Resource',
      description: 'A bonus resource that only exists to demonstrate resources/list_changed.',
      mimeType: 'text/plain',
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'text/plain', text: 'Bonus resource content.' }],
    }),
  )

  const bonusPrompt = server.registerPrompt(
    'bonus-prompt',
    {
      title: 'Bonus Prompt',
      description: 'A bonus prompt that only exists to demonstrate prompts/list_changed.',
    },
    async () => ({
      messages: [
        { role: 'user', content: { type: 'text', text: 'This is the bonus prompt.' } },
      ],
    }),
  )

  const targets = { tool: bonusTool, resource: bonusResource, prompt: bonusPrompt } as const

  server.registerTool(
    'toggle-bonus',
    {
      title: 'Toggle Bonus Feature',
      description:
        'Enables or disables a bonus tool/resource/prompt, triggering the matching list_changed notification.',
      inputSchema: {
        kind: z.enum(['tool', 'resource', 'prompt']).describe('Which bonus feature to toggle'),
        enable: z.boolean().describe('true to enable, false to disable'),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    },
    async ({ kind, enable }) => {
      const target = targets[kind]
      if (enable) target.enable()
      else target.disable()
      return {
        content: [
          {
            type: 'text',
            text: `Bonus ${kind} ${enable ? 'enabled' : 'disabled'} — the client should have received a notifications/${kind}s/list_changed.`,
          },
        ],
      }
    },
  )
}