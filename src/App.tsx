import { useEffect } from 'react'
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { HomePage } from './pages/HomePage'
import { PlantFormPage } from './pages/PlantFormPage'
import { PlantDetailPage } from './pages/PlantDetailPage'
import { QuizPage } from './pages/QuizPage'
import { SettingsPage } from './pages/SettingsPage'
import { ensureDefaultOptions } from './db/db'

const TOP_LEVEL_PATHS = ['/', '/quiz', '/settings']

function AppShell() {
  const location = useLocation()
  const showBottomNav = TOP_LEVEL_PATHS.includes(location.pathname)

  useEffect(() => {
    ensureDefaultOptions()
  }, [])

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/plant/new" element={<PlantFormPage />} />
        <Route path="/plant/:id" element={<PlantDetailPage />} />
        <Route path="/plant/:id/edit" element={<PlantFormPage />} />
        <Route path="/quiz" element={<QuizPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
      {showBottomNav && <BottomNav />}
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AppShell />
    </HashRouter>
  )
}
