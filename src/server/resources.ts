import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import { liveStats, users } from './data.ts'

const GREETING_NAMES = ['World', 'Ada', 'Alan', 'Grace', 'MCP']

export function registerResources(server: McpServer): void {
  // ---------------------------------------------------------------------------
  // Static resources — fixed URIs.
  // ---------------------------------------------------------------------------
  server.registerResource(
    'about',
    'demo://about',
    {
      title: 'About',
      description: 'Static information about this demo server (plain text).',
      mimeType: 'text/plain',
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'text/plain',
          text: 'mcp-demo — a Hono + Bun server demonstrating every MCP capability. Nothing here is real.',
        },
      ],
    }),
  )

  server.registerResource(
    'config',
    'demo://config',
    {
      title: 'Config',
      description: 'Fake server configuration (JSON blob).',
      mimeType: 'application/json',
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              name: 'mcp-demo',
              version: '1.0.0',
              runtime: 'bun',
              framework: 'hono',
              features: {
                tools: true,
                resources: true,
                prompts: true,
                sampling: true,
                elicitation: true,
                realFunctionality: false,
              },
            },
            null,
            2,
          ),
        },
      ],
    }),
  )

  // ---------------------------------------------------------------------------
  // Templated resources — URI templates with completion callbacks.
  // ---------------------------------------------------------------------------
  server.registerResource(
    'greeting',
    new ResourceTemplate('demo://greeting/{name}', {
      list: undefined,
      complete: {
        name: (value) =>
          GREETING_NAMES.filter((n) => n.toLowerCase().startsWith(value.toLowerCase())),
      },
    }),
    {
      title: 'Greeting',
      description: 'A personalized greeting for any name (resource template + completion).',
      mimeType: 'text/plain',
    },
    async (uri, { name }) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'text/plain',
          text: `Hello, ${name}! Greetings from the mcp-demo server.`,
        },
      ],
    }),
  )

  server.registerResource(
    'user-profile',
    new ResourceTemplate('demo://users/{id}', {
      list: async () => ({
        resources: users.map((u) => ({
          uri: `demo://users/${u.id}`,
          name: u.name,
          title: `${u.name} (${u.role})`,
          mimeType: 'application/json',
        })),
      }),
      complete: {
        id: (value) => users.map((u) => u.id).filter((id) => id.startsWith(value)),
      },
    }),
    {
      title: 'User Profile',
      description: 'Fake user profiles by ID (resource template with list + completion).',
      mimeType: 'application/json',
    },
    async (uri, { id }) => {
      const user = users.find((u) => u.id === id)
      if (!user) throw new Error(`No user with id "${id}"`)
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(user, null, 2),
          },
        ],
      }
    },
  )

  // ---------------------------------------------------------------------------
  // Live resource — changes every few seconds; clients can subscribe to it
  // (resources/subscribe) and receive notifications/resources/updated.
  // ---------------------------------------------------------------------------
  server.registerResource(
    'live-stats',
    'demo://live/stats',
    {
      title: 'Live Stats',
      description:
        'Fake server stats, regenerated every few seconds. Subscribe to this resource to receive update notifications.',
      mimeType: 'application/json',
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(liveStats, null, 2),
        },
      ],
    }),
  )
}
