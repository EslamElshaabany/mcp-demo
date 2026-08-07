/**
 * Small shared helpers used across the server and the demo client.
 */

/** Coerce any thrown value into a readable single-line string. */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/**
 * Promise-based timer that rejects (with "cancelled by client") if the supplied
 * AbortSignal fires before the delay elapses. Used by long-running MCP tools
 * that need to cooperate with the protocol's cancellation notification.
 */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error('cancelled by client'))
    const onAbort = () => {
      clearTimeout(timer)
      reject(new Error('cancelled by client'))
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}