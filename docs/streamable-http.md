# Streamable HTTP transport (current standard)

> **Status: current.** Introduced in spec **2025-03-26**, replacing
> [HTTP+SSE](./sse.md). This is the transport to use for remote MCP servers today.

Streamable HTTP collapses the old two-endpoint design into **one endpoint** (conventionally
`/mcp`) and makes SSE an *optional, per-request* upgrade instead of a permanent connection:

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    Note over S: Per-session state:<br/>Mcp-Session-Id + MemoryEventStore

    rect rgb(235, 245, 255)
    Note over C,S: Initialize — creates a new session
    C->>S: POST /mcp (no Mcp-Session-Id)
    S-->>C: 200 OK + Mcp-Session-Id header
    end

    rect rgb(245, 255, 245)
    Note over C,S: Request — server may reply with JSON or upgrade to SSE
    C->>S: POST /mcp (Mcp-Session-Id) Accept: json, text/event-stream
    alt Server replies with plain JSON
        S-->>C: 200 application/json
    else Server upgrades this response to SSE
        S-->>C: 200 text/event-stream (frames ... end)
    end
    end

    rect rgb(255, 248, 235)
    Note over C,S: Optional standalone SSE — server-initiated push
    C->>S: GET /mcp (Mcp-Session-Id)
    S-->>C: event: message  data: {...}
    S-->>C: event: message  data: {...}
    S-->>C: ...
    end

    rect rgb(255, 240, 240)
    Note over C,S: Teardown
    C->>S: DELETE /mcp (Mcp-Session-Id)
    end

    rect rgb(245, 240, 255)
    Note over C,S: Reconnect — replay missed events from the event store
    C->>S: GET or POST /mcp (Last-Event-ID)
    S-->>C: replay missed events
    end
```

## The pieces

- **`POST /mcp`** — carries JSON-RPC from the client. If the client accepts
  `text/event-stream`, the server may answer with plain JSON **or** keep that specific response
  open as an SSE stream (useful for streaming progress of the request being answered). The
  stream closes when the response is done — no permanently pinned connection.
- **`GET /mcp`** — optional *standalone* SSE stream for messages the server initiates outside
  any request (e.g. `notifications/resources/updated` for subscriptions). A server may refuse
  with `405` if it doesn't need it.
- **`Mcp-Session-Id` header** — returned at `initialize` for **stateful** servers; the client
  sends it on every subsequent request. Servers may also run **stateless** (no session id, fresh
  server per request) which suits serverless/edge deployments.
- **`DELETE /mcp`** — explicit session termination.
- **Resumability** — SSE frames carry event ids; the server keeps them in an *event store*, and
  a reconnecting client sends `Last-Event-ID` to replay what it missed.

## Why MCP uses it (i.e. why it beat SSE)

- **One endpoint** — trivial to route, proxy, and put behind gateways.
- **No head-of-line** — a response travels on its *own* request's stream instead of being
  multiplexed through one shared connection.
- **Scales** — stateless mode needs no sticky sessions; stateful mode only pins the optional
  GET stream.
- **Resumable** — reconnects replay missed messages instead of losing them.
- **Backward compatible** — plain-JSON responses mean even non-streaming clients work.

**Use it when:** the server is remote, shared, authenticated, or horizontally scaled.
**Skip it when:** the server is a local tool launched by the client — that's
[stdio](./stdio.md)'s job.

## In this repo

- `src/transports/http.ts` — the `/mcp` route with a per-session `StreamableHTTPTransport`
  (from `@hono/mcp`) and an in-memory `MemoryEventStore` for resumability
- `client/demo.ts` — the default walkthrough runs over it (`bun run client`)
- Try it in the Inspector: `bun run inspect` → connect to `http://localhost:3000/mcp`
