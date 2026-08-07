import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { completable } from '@modelcontextprotocol/sdk/server/completable.js'
import { z } from 'zod'

const LANGUAGES = ['typescript', 'javascript', 'python', 'go', 'rust']
const FOCUSES = ['security', 'performance', 'readability', 'bugs']
const STYLES = ['conventional', 'plain', 'emoji']

export function registerPrompts(server: McpServer): void {
  // ---------------------------------------------------------------------------
  // code-review — prompt with completable arguments (completion/complete).
  // ---------------------------------------------------------------------------
  server.registerPrompt(
    'code-review',
    {
      title: 'Code Review',
      description: 'Asks the LLM to review a code snippet.',
      argsSchema: {
        code: z.string().describe('The code to review'),
        language: completable(
          z.string().optional().describe('Programming language'),
          (value) => LANGUAGES.filter((l) => l.startsWith(value ?? '')),
        ),
        focus: completable(
          z.string().optional().describe('What to focus the review on'),
          (value) => FOCUSES.filter((f) => f.startsWith(value ?? '')),
        ),
      },
    },
    ({ code, language, focus }) => ({
      description: 'Code review request',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please review the following ${language ?? 'unknown-language'} code${
              focus ? `, focusing on ${focus}` : ''
            }:\n\n\`\`\`${language ?? ''}\n${code}\n\`\`\``,
          },
        },
      ],
    }),
  )

  // ---------------------------------------------------------------------------
  // commit-message — multi-message prompt (few-shot example) with completion.
  // ---------------------------------------------------------------------------
  server.registerPrompt(
    'commit-message',
    {
      title: 'Commit Message',
      description: 'Drafts a git commit message for a set of changes (with a few-shot example).',
      argsSchema: {
        changes: z.string().describe('Description or diff of the changes'),
        style: completable(
          z.string().optional().describe('Commit message style'),
          (value) => STYLES.filter((s) => s.startsWith(value ?? '')),
        ),
      },
    },
    ({ changes, style }) => ({
      description: 'Commit message request',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Write a ${style ?? 'conventional'} commit message for these changes:\n"added a dark mode toggle to the settings page"`,
          },
        },
        {
          role: 'assistant',
          content: {
            type: 'text',
            text:
              style === 'emoji'
                ? ':sparkles: feat(settings): add dark mode toggle'
                : 'feat(settings): add dark mode toggle',
          },
        },
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Now write one for these changes:\n${changes}`,
          },
        },
      ],
    }),
  )
}
