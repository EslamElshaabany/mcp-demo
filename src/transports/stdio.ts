/**
 * stdio entry point — serves MCP over stdin/stdout instead of HTTP.
 *
 * This is how local MCP servers are usually launched: the client (Claude
 * Desktop, an IDE, client/demo.ts) spawns this process and speaks
 * newline-delimited JSON-RPC on its stdin/stdout.
 *
 * IMPORTANT: stdout is the protocol channel — never console.log here.
 * Use stderr (console.error) for human-facing logs.
 *
 * Usage:
 *   bun run stdio                      # run standalone (waits for JSON-RPC on stdin)
 *   bun run client:stdio               # demo client spawns this automatically
 *   bunx @modelcontextprotocol/inspector bun run src/transports/stdio.ts
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createMcpServer } from '../server/index.ts'

const { server } = createMcpServer()
await server.connect(new StdioServerTransport())

console.error('mcp-demo stdio server running — JSON-RPC on stdin/stdout, logs on stderr')
