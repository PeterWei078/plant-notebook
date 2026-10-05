export function generateId(): string {
  if ('randomUUID' in crypto) return crypto.randomUUID()
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
