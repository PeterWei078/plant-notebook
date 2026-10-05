import { MONTHS } from '../utils/months'

export function MonthPicker({
  value,
  onChange,
  variant,
}: {
  value: number[]
  onChange: (months: number[]) => void
  variant: 'flower' | 'fruit'
}) {
  function toggle(m: number) {
    onChange(value.includes(m) ? value.filter((v) => v !== m) : [...value, m].sort((a, b) => a - b))
  }
  return (
    <div className={`month-grid ${variant}`}>
      {MONTHS.map((m) => (
        <button type="button" key={m} className={value.includes(m) ? 'active' : ''} onClick={() => toggle(m)}>
          {m}月
        </button>
      ))}
    </div>
  )
}
