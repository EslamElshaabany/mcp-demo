import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerBonus } from './bonus.ts'
import { registerPrompts } from './prompts.ts'
import { registerResources } from './resources.ts'
import { registerSubscriptions } from './subscriptions.ts'
import { registerTools } from './tools.ts'

export interface DemoServer {
  server: McpServer
  dispose: () => void
}

/**
 * Creates a fully-featured demo MCP server. A fresh instance is created per
 * client session so subscriptions and log-level state stay isolated.
 *
 * Registration is split across focused modules, one per capability family —
 * see `tools.ts`, `resources.ts`, `prompts.ts`, `bonus.ts` and
 * `subscriptions.ts`. This function just wires them together.
 */
export function createMcpServer(): DemoServer {
  const server = new McpServer(
    { name: 'mcp-demo', version: '1.0.0' },
    {
      instructions:
        'Demo MCP server showcasing every protocol capability: tools, resources (static, templated, ' +
        'subscribable), prompts, argument completion, logging, progress, cancellation, sampling, ' +
        'elicitation and roots. Nothing here does anything real.',
      capabilities: {
        logging: {},
        completions: {},
        tools: { listChanged: true },
        resources: { subscribe: true, listChanged: true },
        prompts: { listChanged: true },
      },
    },
  )

  registerTools(server)
  registerResources(server)
  registerPrompts(server)
  registerBonus(server)
  const stopSubscriptions = registerSubscriptions(server)

  return { server, dispose: () => stopSubscriptions() }
}