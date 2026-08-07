/** Tiny formatting helpers shared by the demo client walkthrough. */

const CYAN = '\x1b[1m\x1b[36m'
const RESET = '\x1b[0m'

/** Print a section header so the walkthrough output is skimmable. */
export function step(title: string): void {
  console.log(`\n${CYAN}=== ${title} ===${RESET}`)
}

/** Pretty-print any value as indented JSON. */
export function show(data: unknown): void {
  console.log(JSON.stringify(data, null, 2))
}

/** Extract the concatenated text of a `tools/call` result. */
export function toolText(result: unknown): string {
  const content = (result as { content?: unknown }).content
  const items = Array.isArray(content) ? content : []
  return items
    .map((c) => {
      const item = c as { type: string; text?: string }
      return item.type === 'text' ? (item.text ?? '') : `[${item.type} content]`
    })
    .join('\n')
}

/** Extract the concatenated text of a `resources/read` result. */
export function resourceText(result: {
  contents: Array<{ uri: string; text?: string; blob?: string }>
}): string {
  return result.contents.map((c) => (c.text ?? (c.blob ? '[base64 blob]' : '[empty]'))).join('\n')
}