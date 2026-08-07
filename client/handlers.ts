import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import {
  CreateMessageRequestSchema,
  ElicitRequestSchema,
  ListRootsRequestSchema,
  LoggingMessageNotificationSchema,
  PromptListChangedNotificationSchema,
  ResourceListChangedNotificationSchema,
  ResourceUpdatedNotificationSchema,
  ToolListChangedNotificationSchema,
} from '@modelcontextprotocol/sdk/types.js'

/**
 * Build the demo MCP client with all client-side capabilities wired up so the
 * walkthrough can exercise server requests for sampling, elicitation and roots
 * WITHOUT a real LLM — every server request is answered with a canned fake.
 *
 * Also registers notification handlers that simply log the server-initiated
 * notifications (logs, resource updates, *_list_changed) so they show up in
 * the walkthrough output.
 *
 * NOTE: no global `ProgressNotificationSchema` handler is registered on
 * purpose — the SDK installs one internally that routes progress to
 * per-request `onprogress` callbacks (used by the long-task call). Overriding
 * it would break that flow.
 */
export function createDemoClient(): Client {
  const client = new Client(
    { name: 'mcp-demo-client', version: '1.0.0' },
    {
      capabilities: {
        sampling: {},
        elicitation: {},
        roots: { listChanged: true },
      },
    },
  )

  // sampling/createMessage — pretend to be an LLM.
  client.setRequestHandler(CreateMessageRequestSchema, async (request) => {
    const prompt = request.params.messages
      .map((m) => {
        const content = m.content as
          | { type: string; text?: string }
          | Array<{ type: string; text?: string }>
        if (Array.isArray(content)) {
          return content.map((c) => (c.type === 'text' ? c.text : '[non-text]')).join(' ')
        }
        return content.type === 'text' ? content.text : '[non-text]'
      })
      .join('\n')
    console.log('   [client] sampling request received. Prompt preview:', prompt.slice(0, 90))
    return {
      model: 'fake-demo-model-9000',
      role: 'assistant' as const,
      stopReason: 'endTurn' as const,
      content: {
        type: 'text' as const,
        text: 'Fake summary: this text was "summarized" by the demo client — no real LLM was involved.',
      },
    }
  })

  // elicitation/create — pretend to be a user filling in a form.
  client.setRequestHandler(ElicitRequestSchema, async (request) => {
    console.log('   [client] elicitation requested:', request.params.message)
    return {
      action: 'accept' as const,
      content: { name: 'Demo User', role: 'developer', lovesMcp: true },
    }
  })

  // roots/list — expose this project as a root.
  client.setRequestHandler(ListRootsRequestSchema, async () => {
    console.log('   [client] roots requested')
    return { roots: [{ uri: `file://${process.cwd()}`, name: 'mcp-demo project' }] }
  })

  // Server-initiated notifications — log each kind so they're visible.
  client.setNotificationHandler(LoggingMessageNotificationSchema, (n) => {
    console.log(`   [log:${n.params.level}]`, JSON.stringify(n.params.data))
  })
  client.setNotificationHandler(ResourceUpdatedNotificationSchema, (n) => {
    console.log(`   [resource updated] ${n.params.uri}`)
  })
  client.setNotificationHandler(ToolListChangedNotificationSchema, () => {
    console.log('   [notification] tools/list_changed')
  })
  client.setNotificationHandler(ResourceListChangedNotificationSchema, () => {
    console.log('   [notification] resources/list_changed')
  })
  client.setNotificationHandler(PromptListChangedNotificationSchema, () => {
    console.log('   [notification] prompts/list_changed')
  })

  return client
}