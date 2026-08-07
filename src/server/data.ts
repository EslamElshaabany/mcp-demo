/**
 * Fake in-memory data. Nothing here is real — it only exists to give the
 * MCP capabilities something to operate on.
 */

export interface User {
  id: string
  name: string
  role: string
  email: string
}

export const users: User[] = [
  { id: '1', name: 'Ada Lovelace', role: 'Engineer', email: 'ada@example.dev' },
  { id: '2', name: 'Alan Turing', role: 'Scientist', email: 'alan@example.dev' },
  { id: '3', name: 'Grace Hopper', role: 'Admiral', email: 'grace@example.dev' },
]

export const liveStats = {
  cpuPercent: 0,
  memoryPercent: 0,
  requestsServed: 0,
  updatedAt: new Date().toISOString(),
}

export function mutateLiveStats(): void {
  liveStats.cpuPercent = Math.round(Math.random() * 100)
  liveStats.memoryPercent = Math.round(Math.random() * 100)
  liveStats.requestsServed += Math.floor(Math.random() * 10)
  liveStats.updatedAt = new Date().toISOString()
}
