import { currentMonth, formatMonths, MONTHS } from '../utils/months'

export function MonthBar({ label, months, variant }: { label: string; months: number[]; variant: 'flower' | 'fruit' }) {
  const now = currentMonth()
  return (
    <>
      <div className="month-bar-row">
        <span className="bar-label">{label}</span>
        <div className={`month-bar ${variant}`}>
          {MONTHS.map((m) => (
            <span key={m} className={`${months.includes(m) ? 'on' : ''}${m === now ? ' now' : ''}`}>
              {m}
            </span>
          ))}
        </div>
      </div>
      <div className="month-bar-summary">{months.length ? formatMonths(months) : '未填寫'}</div>
    </>
  )
}
