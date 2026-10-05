export const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

export function currentMonth(): number {
  return new Date().getMonth() + 1
}

/** Compact label, e.g. [3,4,5,9] → "3–5月、9月". */
export function formatMonths(months: number[]): string {
  if (!months.length) return ''
  const sorted = [...new Set(months)].sort((a, b) => a - b)
  const ranges: string[] = []
  let start = sorted[0]
  let prev = sorted[0]
  for (const m of [...sorted.slice(1), Infinity]) {
    if (m === prev + 1) {
      prev = m
      continue
    }
    ranges.push(start === prev ? `${start}月` : `${start}–${prev}月`)
    start = m
    prev = m
  }
  return ranges.join('、')
}

export function sanitizeMonths(input: unknown): number[] {
  if (!Array.isArray(input)) return []
  const months = input.map((m) => Number.parseInt(String(m), 10)).filter((m) => m >= 1 && m <= 12)
  return [...new Set(months)].sort((a, b) => a - b)
}
