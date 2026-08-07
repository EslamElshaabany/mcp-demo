import { MemoryEventStore, StreamableHTTPTransport, streamSSE } from '@hono/mcp'
import { Hono } from 'hono'
import { createMcpServer } from '../server/index.ts'
import { HonoSseTransport } from './sse.ts'

const PORT = Number(process.env.PORT ?? 3000)

const app = new Hono()

app.get('/', (c) =>
  c.text(
    'mcp-demo — a demo MCP server.\n\n' +
      `MCP endpoint (Streamable HTTP):  POST/GET/DELETE http://localhost:${PORT}/mcp\n` +
      `MCP endpoint (legacy HTTP+SSE):  GET http://localhost:${PORT}/sse\n` +
      `Health check:                    GET http://localhost:${PORT}/health\n\n` +
      'Try: bun run client   (walks through every capability)\n' +
      ' or: bun run inspect  (MCP Inspector UI)\n',
  ),
)

app.get('/health', (c) => c.json({ status: 'ok', sessions: sessions.size }))

// ---------------------------------------------------------------------------
// Stateful session management: one McpServer + transport per MCP session,
// keyed by the Mcp-Session-Id header.
// ---------------------------------------------------------------------------
interface Session {
  transport: StreamableHTTPTransport
  dispose: () => void
}

const sessions = new Map<string, Session>()

app.all('/mcp', async (c) => {
  const sessionId = c.req.header('mcp-session-id')

  if (sessionId) {
    const session = sessions.get(sessionId)
    if (!session) {
      return c.json(
        { jsonrpc: '2.0', error: { code: -32001, message: `Unknown session: ${sessionId}` }, id: null },
        404,
      )
    }
    return (await session.transport.handleRequest(c)) ?? c.body(null, 500)
  }

  // No session header -> this should be an `initialize` request.
  // Spin up a fresh server + transport for the new session.
  const { server, dispose } = createMcpServer()
  const transport = new StreamableHTTPTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
    // In-memory event store enables stream resumability (Last-Event-ID replay).
    eventStore: new MemoryEventStore(),
    onsessioninitialized: (id) => {
      sessions.set(id, { transport, dispose })
      console.log(`[session] initialized: ${id} (${sessions.size} active)`)
    },
  })

  transport.onclose = () => {
    if (transport.sessionId) {
      sessions.delete(transport.sessionId)
      console.log(`[session] closed: ${transport.sessionId} (${sessions.size} active)`)
    }
    dispose()
  }

  await server.connect(transport)
  return (await transport.handleRequest(c)) ?? c.body(null, 500)
})

// ---------------------------------------------------------------------------
// Legacy HTTP+SSE transport (spec 2024-11-05, DEPRECATED — kept for education,
// see docs/sse.md). Two endpoints: GET /sse opens the stream, POST /messages
// carries client->server JSON-RPC messages.
// ---------------------------------------------------------------------------
const sseSessions = new Map<string, HonoSseTransport>()

app.get('/sse', async (c) => {
  const { server, dispose } = createMcpServer()
  const transport = new HonoSseTransport('/messages')
  sseSessions.set(transport.sessionId, transport)
  console.log(`[sse] connected: ${transport.sessionId} (${sseSessions.size} active)`)

  transport.onclose = () => {
    sseSessions.delete(transport.sessionId)
    console.log(`[sse] closed: ${transport.sessionId} (${sseSessions.size} active)`)
    dispose()
  }

  await server.connect(transport)
  return streamSSE(c, (stream) => transport.run(stream))
})

app.post('/messages', async (c) => {
  const sessionId = c.req.query('sessionId')
  const transport = sessionId ? sseSessions.get(sessionId) : undefined
  if (!transport) return c.text(`Unknown SSE session: ${sessionId ?? '(none)'}`, 404)

  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.text('Invalid JSON body', 400)
  }

  try {
    transport.handleMessage(body)
  } catch {
    return c.text('Invalid JSON-RPC message', 400)
  }
  return c.text('Accepted', 202)
})

Bun.serve({ port: PORT, fetch: app.fetch })

console.log(`mcp-demo listening on http://localhost:${PORT}`)
console.log(`MCP endpoint: http://localhost:${PORT}/mcp`)
