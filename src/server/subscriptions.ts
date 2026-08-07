import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { SubscribeRequestSchema, UnsubscribeRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { mutateLiveStats } from './data.ts'

const LIVE_STATS_INTERVAL_MS = 3000
// Even when nothing is subscribed, occasionally nudge the fake stats so a
// later `read` doesn't look frozen.
const IDLE_MUTATION_PROBABILITY = 0.2

/**
 * The SDK doesn't handle `resources/subscribe` / `resources/unsubscribe` for
 * us, so this module tracks the URIs a client has subscribed to per session
 * and pushes `notifications/resources/updated` whenever the live resource
 * changes. Returns a `dispose` callback that stops the ticker.
 */
export function registerSubscriptions(server: McpServer): () => void {
  const subscribedUris = new Set<string>()

  server.server.setRequestHandler(SubscribeRequestSchema, (request) => {
    subscribedUris.add(request.params.uri)
    return {}
  })

  server.server.setRequestHandler(UnsubscribeRequestSchema, (request) => {
    subscribedUris.delete(request.params.uri)
    return {}
  })

  const interval = setInterval(() => {
    if (subscribedUris.size === 0) {
      if (Math.random() < IDLE_MUTATION_PROBABILITY) mutateLiveStats()
      return
    }
    mutateLiveStats()
    for (const uri of subscribedUris) {
      server.server
        .notification({ method: 'notifications/resources/updated', params: { uri } })
        .catch(() => {
          /* connection already closed */
        })
    }
  }, LIVE_STATS_INTERVAL_MS)

  return () => clearInterval(interval)
}