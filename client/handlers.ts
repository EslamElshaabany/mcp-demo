import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import {
  ElicitRequestSchema,
  LoggingMessageNotificationSchema,
  PromptListChangedNotificationSchema,
  ResourceListChangedNotificationSchema,
  ResourceUpdatedNotificationSchema,
  ToolListChangedNotificationSchema,
} from '@modelcontextprotocol/sdk/types.js'

/**
 * Build the demo MCP client with all client-side capabilities wired up so the
 * walkthrough can exercise elicitation WITHOUT an external service — the
 * server request is answered with a canned fake.
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
        elicitation: {},
      },
    },
  )

  // elicitation/create — pretend to be a user filling in a form.
  client.setRequestHandler(ElicitRequestSchema, async (request) => {
    console.log('   [client] elicitation requested:', request.params.message)
    return {
      action: 'accept' as const,
      content: { name: 'Demo User', role: 'developer', lovesMcp: true },
    }
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
