# mcp-demo

A demo [Model Context Protocol](https://modelcontextprotocol.io) server built with **TypeScript + Hono + Bun**, showcasing current MCP capabilities with fake logic — nothing here does anything real.

> See [docs/architecture.md](docs/architecture.md) for the session model and module split. Run `bun run typecheck` to type-check the project.

## Run it

```bash
bun install

# terminal 1 — the server (http://localhost:3000, MCP endpoints at /mcp and /sse)
bun run dev

# terminal 2 — scripted walkthrough of the capabilities (no LLM needed),
# pick a transport:
bun run client          # Streamable HTTP (current standard)
bun run client:sse      # legacy HTTP+SSE (deprecated, kept for education)
bun run client:stdio    # stdio (client spawns src/transports/stdio.ts itself)

# or explore interactively with the MCP Inspector
bun run inspect   # Streamable HTTP → http://localhost:3000/mcp, SSE → /sse
bunx @modelcontextprotocol/inspector bun run src/transports/stdio.ts   # stdio
```

`bun run dev` uses `--hot` reload. Set `PORT=4000` to change the port, `MCP_URL` to point the client elsewhere.

## Transports

All three MCP transports are implemented — the same server capabilities are exposed over each:

| Transport | Status | Endpoint / entry | Docs |
| --- | --- | --- | --- |
| **Streamable HTTP** | current standard (2025-03-26) | `POST/GET/DELETE /mcp` | [docs/streamable-http.md](docs/streamable-http.md) |
| **HTTP+SSE** | legacy (2024-11-05), deprecated | `GET /sse` + `POST /messages` | [docs/sse.md](docs/sse.md) |
| **stdio** | current, for local servers | `src/transports/stdio.ts` (stdin/stdout) | [docs/stdio.md](docs/stdio.md) |

## Capability map

| MCP capability | Where it's demonstrated |
| --- | --- |
| **Tools** | `echo` (input schema, structured `outputSchema`, annotations), `roll-dice` — `src/server/tools.ts` |
| **Progress** | `long-task` streams `notifications/progress` when the client passes a `progressToken` (client uses the `onprogress` option) |
| **Cancellation** | `long-task` honors the request `AbortSignal` (`notifications/cancelled`) |
| **Elicitation** | `ask-user` calls `elicitation/create` to request structured user input via the client |
| **Resources (static)** | `demo://about`, `demo://config` |
| **Resource templates** | `demo://greeting/{name}`, `demo://users/{id}` (with `list` + `complete` callbacks) |
| **Subscriptions** | `demo://live/stats` mutates every 3s; subscribers get `notifications/resources/updated` |
| **Prompts** | `code-review`, `commit-message` (multi-message / few-shot) |
| **Completion** | `completable()` prompt args + resource template variables (`completion/complete`) |
| **Logging** | `emit-logs` sends every level via `notifications/message`; the SDK filters per-session after `logging/setLevel` |
| **List-changed** | `toggle-bonus` enables/disables a bonus tool/resource/prompt → `notifications/{tools,resources,prompts}/list_changed` — `src/server/bonus.ts` |
| **Ping** | `client.ping()` in the demo client |
| **Sessions & resumability** | Stateful `Mcp-Session-Id` sessions in `src/transports/http.ts`, in-memory event store for `Last-Event-ID` replay, `DELETE` teardown |

## Layout

```
src/
  server/           the MCP server itself — one module per capability family
    index.ts        createMcpServer(): wires the capability modules together
    tools.ts        echo, roll-dice, long-task, ask-user, emit-logs
    resources.ts    static + templated + live subscribable resources
    prompts.ts      code-review, commit-message (completable args)
    bonus.ts        bonus tool/resource/prompt + toggle-bonus (demonstrates list_changed)
    subscriptions.ts per-session resource-subscribe tracking + live-stats ticker
    data.ts         fake in-memory data
  transports/       the wire layers that expose the same server over the network/process boundary
    http.ts         Hono app: /mcp (Streamable HTTP) + /sse + /messages (legacy SSE), /health — main entry
    sse.ts          HonoSseTransport: Bun-native implementation of the legacy HTTP+SSE wire protocol
    stdio.ts        stdio entry point (server over stdin/stdout)
  utils.ts          helpers shared by server and client (sleep, errorMessage)
client/
  demo.ts           thin orchestrator: pick transport → connect → run → teardown
  walkthrough.ts    runWalkthrough(): one step per MCP capability
  handlers.ts       createDemoClient(): fake elicitation + notification logging
  helpers.ts        step/show/toolText/resourceText formatters
docs/
  architecture.md   session model, module split, how to add a capability
  streamable-http.md / sse.md / stdio.md   — how each transport works and why MCP uses it
```

See [docs/architecture.md](docs/architecture.md) for the full session model and how the pieces fit.

## Notes / gotchas encountered

- The server is **stateful**: each `initialize` gets its own `McpServer` + `StreamableHTTPTransport`, so subscriptions and log levels are per-session.
- `resources/subscribe` is **not** handled by the SDK — the server tracks subscribed URIs itself (`src/server/subscriptions.ts`).
- Log-level filtering only applies when `sendLoggingMessage(params, sessionId)` is given the session id.
- Don't override the client's `ProgressNotificationSchema` handler if you want the per-request `onprogress` callback — the SDK's internal handler is what routes to it.
- The demo client fakes the `elicitation` response, so the full walkthrough runs without external services. In the Inspector, elicitation shows a form dialog.
