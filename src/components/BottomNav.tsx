import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: '圖鑑', icon: '🌿', end: true },
  { to: '/plant/new', label: '新增', icon: '📷', end: false },
  { to: '/quiz', label: '測驗', icon: '🎯', end: false },
  { to: '/settings', label: '設定', icon: '⚙️', end: false },
]

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      {links.map((l) => (
        <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="nav-icon">{l.icon}</span>
          <span>{l.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
