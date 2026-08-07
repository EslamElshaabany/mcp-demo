/**
 * Demo MCP client — connects to the demo server and walks through every
 * capability. No real LLM involved: sampling/elicitation/roots are answered
 * with fakes (see `handlers.ts`).
 *
 * Usage (pick a transport):
 *   bun run client          Streamable HTTP  (server must be running: bun run dev)
 *   bun run client:sse      legacy HTTP+SSE  (server must be running: bun run dev)
 *   bun run client:stdio    stdio            (spawns src/transports/stdio.ts automatically)
 *
 * The walkthrough itself lives in `walkthrough.ts`; per-capability fake
 * handlers live in `handlers.ts`; formatting helpers in `helpers.ts`. This
 * file is just the connect → run → teardown wiring.
 */
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import { step } from './helpers.ts'
import { createDemoClient } from './handlers.ts'
import { runWalkthrough } from './walkthrough.ts'

const url = new URL(process.env.MCP_URL ?? 'http://localhost:3000/mcp')

type TransportKind = 'http' | 'sse' | 'stdio'

function resolveTransportKind(arg: string | undefined): TransportKind {
  if (arg === 'sse' || arg === 'stdio' || arg === 'http') return arg
  return 'http'
}

function buildTransport(kind: TransportKind): Transport {
  switch (kind) {
    case 'stdio':
      // Spawns the server as a child process and speaks JSON-RPC over its
      // stdin/stdout — exactly how Claude Desktop / IDEs launch local servers.
      return new StdioClientTransport({
        command: process.execPath, // the bun binary running this script
        args: ['run', 'src/transports/stdio.ts'],
      })
    case 'sse':
      return new SSEClientTransport(new URL(`${url.origin}/sse`))
    case 'http':
      return new StreamableHTTPClientTransport(url)
  }
}

// ---------------------------------------------------------------------------
// Orchestrator: pick transport, connect, run the walkthrough, tear down.
// ---------------------------------------------------------------------------
const transportKind = resolveTransportKind(process.argv[2])
const transport = buildTransport(transportKind)
const client = createDemoClient()

step(`Connect + initialize (transport: ${transportKind})`)
await client.connect(transport)
console.log('connected, session id:', transport.sessionId ?? '(none — this transport has no sessions)')

await runWalkthrough(client)

step('Teardown + close')
// Session teardown via HTTP DELETE only exists on Streamable HTTP.
if (transport instanceof StreamableHTTPClientTransport) await transport.terminateSession()
await client.close()
console.log('\nDone — every MCP capability demonstrated.')