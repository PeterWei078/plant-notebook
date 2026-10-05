import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

export function TopBar({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="topbar">
      <h1>
        {title}
        {subtitle && <span className="subtitle">{subtitle}</span>}
      </h1>
      {action}
    </header>
  )
}

export function TopBarWithBack({ title, action }: { title: string; action?: ReactNode }) {
  const navigate = useNavigate()
  return (
    <header className="topbar elevated">
      <button className="icon-btn back" onClick={() => navigate(-1)} aria-label="返回">
        ‹
      </button>
      <h1>{title}</h1>
      {action}
    </header>
  )
}
