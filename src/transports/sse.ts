import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import {
  JSONRPCMessageSchema,
  type JSONRPCMessage,
  type MessageExtraInfo,
} from '@modelcontextprotocol/sdk/types.js'
import type { SSEStreamingApi } from 'hono/streaming'

/**
 * Legacy "HTTP+SSE" server transport (MCP spec 2024-11-05, DEPRECATED in favor
 * of Streamable HTTP), implemented natively for Hono/Bun.
 *
 * The SDK ships SSEServerTransport, but it is Node-only (needs a
 * node:http ServerResponse), so this class re-implements the same wire
 * protocol against hono's SSE streaming:
 *
 *   1. Client opens GET /sse           -> long-lived text/event-stream
 *   2. Server sends `event: endpoint`  -> tells the client where to POST
 *   3. Client POSTs JSON-RPC to /messages?sessionId=...  -> 202 Accepted
 *   4. Server pushes messages as `event: message` SSE frames
 *
 * See docs/sse.md for the full explanation.
 */
export class HonoSseTransport implements Transport {
  readonly sessionId = crypto.randomUUID()

  onclose?: () => void
  onerror?: (error: Error) => void
  onmessage?: (message: JSONRPCMessage, extra?: MessageExtraInfo) => void

  private stream?: SSEStreamingApi

  constructor(private readonly endpoint: string) {}

  /** No-op: the connection lifecycle is driven by run(). */
  async start(): Promise<void> {}

  /**
   * Performs the SSE handshake and holds the stream open until the client
   * disconnects. Await inside hono's streamSSE callback — returning from it
   * closes the stream.
   */
  async run(stream: SSEStreamingApi): Promise<void> {
    this.stream = stream

    // Legacy handshake: tell the client which URL to POST JSON-RPC messages to.
    await stream.writeSSE({
      event: 'endpoint',
      data: `${this.endpoint}?sessionId=${this.sessionId}`,
    })

    // SSE comment heartbeats keep proxies from killing the idle connection.
    const keepAlive = setInterval(() => {
      stream.write(': keep-alive\n\n').catch(() => {})
    }, 15_000)

    try {
      await new Promise<void>((resolve) => {
        stream.onAbort(() => {
          this.onclose?.()
          resolve()
        })
      })
    } finally {
      clearInterval(keepAlive)
    }
  }

  /** Server -> client: every JSON-RPC message becomes an SSE `message` event. */
  async send(message: JSONRPCMessage): Promise<void> {
    if (!this.stream) throw new Error('SSE stream is not open yet')
    await this.stream.writeSSE({ event: 'message', data: JSON.stringify(message) })
  }

  /** Client -> server: feed a JSON-RPC body received over HTTP POST to the server. */
  handleMessage(body: unknown): void {
    const message = JSONRPCMessageSchema.parse(body)
    this.onmessage?.(message)
  }

  async close(): Promise<void> {
    this.stream?.abort()
  }
}
