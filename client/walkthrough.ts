import type { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js'
import { sleep } from '../src/utils.ts'
import { resourceText, show, step, toolText } from './helpers.ts'

/**
 * Walks the connected client through the current capabilities the demo server exposes:
 * ping, tools (with progress, cancellation and elicitation), logging,
 * resources (static + templated + subscribe), prompts, completion, and the
 * list_changed toggle. Prints everything it does.
 *
 * Teardown is intentionally left to the caller — see `demo.ts`.
 */
export async function runWalkthrough(client: Client): Promise<void> {
  step('Server info')
  console.log('server:', client.getServerVersion())
  console.log('server capabilities:')
  show(client.getServerCapabilities())
  console.log('server instructions:', client.getInstructions())

  step('ping')
  await client.ping()
  console.log('pong')

  // --- Tools ---------------------------------------------------------------
  step('tools/list')
  const { tools } = await client.listTools()
  console.log(tools.map((t) => `- ${t.name}: ${t.description}`).join('\n'))
  console.log('\none full tool definition (note annotations + schemas):')
  show(tools.find((t) => t.name === 'echo'))

  step('tools/call echo (structured output)')
  const echoResult = await client.callTool({ name: 'echo', arguments: { message: 'Hello MCP!' } })
  console.log('structuredContent:')
  show(echoResult.structuredContent)

  step('tools/call roll-dice')
  console.log(toolText(await client.callTool({ name: 'roll-dice', arguments: { sides: 20, rolls: 3 } })))

  step('tools/call long-task (progress notifications)')
  const longTask = await client.callTool(
    { name: 'long-task', arguments: { steps: 4, stepDelayMs: 300 } },
    CallToolResultSchema,
    {
      onprogress: (p) =>
        console.log(`   [onprogress callback] ${p.progress}/${p.total ?? '?'} ${p.message ?? ''}`),
    },
  )
  console.log(toolText(longTask))

  step('tools/call ask-user (elicitation)')
  console.log(toolText(await client.callTool({ name: 'ask-user', arguments: {} })))

  step('logging: emit-logs at all levels')
  await client.callTool({ name: 'emit-logs' })

  step('logging: setLevel(warning) then emit again — debug/info/notice are filtered server-side')
  await client.setLoggingLevel('warning')
  await client.callTool({ name: 'emit-logs' })
  await client.setLoggingLevel('debug')

  // --- Resources ----------------------------------------------------------
  step('resources/list')
  const { resources } = await client.listResources()
  console.log(resources.map((r) => `- ${r.uri} (${r.name})`).join('\n'))

  step('resources/read static resources')
  console.log(resourceText(await client.readResource({ uri: 'demo://about' })))

  step('resources/templates/list')
  const { resourceTemplates } = await client.listResourceTemplates()
  console.log(resourceTemplates.map((t) => `- ${t.uriTemplate} (${t.name})`).join('\n'))

  step('resources/read templated resources')
  console.log(resourceText(await client.readResource({ uri: 'demo://greeting/Ada' })))
  console.log(resourceText(await client.readResource({ uri: 'demo://users/2' })))

  step('resources/subscribe demo://live/stats (watch update notifications for ~7s)')
  await client.subscribeResource({ uri: 'demo://live/stats' })
  console.log('initial value:', resourceText(await client.readResource({ uri: 'demo://live/stats' })))
  await sleep(7000)
  console.log('value after notifications:', resourceText(await client.readResource({ uri: 'demo://live/stats' })))
  await client.unsubscribeResource({ uri: 'demo://live/stats' })
  console.log('unsubscribed')

  // --- Prompts -------------------------------------------------------------
  step('prompts/list')
  const { prompts } = await client.listPrompts()
  console.log(prompts.map((p) => `- ${p.name}: ${p.description}`).join('\n'))

  step('prompts/get code-review')
  const review = await client.getPrompt({
    name: 'code-review',
    arguments: { code: 'const add = (a, b) => a + b', language: 'typescript', focus: 'bugs' },
  })
  show(review.messages)

  step('prompts/get commit-message (multi-message)')
  const commit = await client.getPrompt({
    name: 'commit-message',
    arguments: { changes: 'fixed null pointer in user lookup', style: 'conventional' },
  })
  show(commit.messages)

  // --- Completion ---------------------------------------------------------
  step('completion/complete (prompt argument)')
  const langCompletion = await client.complete({
    ref: { type: 'ref/prompt', name: 'code-review' },
    argument: { name: 'language', value: 't' },
  })
  show(langCompletion.completion)

  step('completion/complete (resource template variable)')
  const nameCompletion = await client.complete({
    ref: { type: 'ref/resource', uri: 'demo://greeting/{name}' },
    argument: { name: 'name', value: 'A' },
  })
  show(nameCompletion.completion)

  // --- list_changed -------------------------------------------------------
  step('list_changed: disable bonus tool, list tools, re-enable')
  await client.callTool({ name: 'toggle-bonus', arguments: { kind: 'tool', enable: false } })
  const afterDisable = await client.listTools()
  console.log('bonus-tool still listed?', afterDisable.tools.some((t) => t.name === 'bonus-tool'))
  await client.callTool({ name: 'toggle-bonus', arguments: { kind: 'tool', enable: true } })
  const afterEnable = await client.listTools()
  console.log('bonus-tool listed again?', afterEnable.tools.some((t) => t.name === 'bonus-tool'))
}
