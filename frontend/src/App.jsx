import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import './App.css'
import { Sidebar, Topbar, useTheme } from './components/Shell.jsx'

// Auth page
import AuthPage from './pages/Auth.jsx'

// Dashboard pages
import Overview   from './pages/Overview.jsx'
import Scans      from './pages/Scans.jsx'
import Findings   from './pages/Findings.jsx'
import Endpoints  from './pages/Endpoints.jsx'
import AgentGraph from './pages/AgentGraph.jsx'
import Sandbox    from './pages/Sandbox.jsx'
import Reports    from './pages/Reports.jsx'
import Settings   from './pages/Settings.jsx'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    if (document.documentElement) {
      document.documentElement.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }
    if (document.body) {
      document.body.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }
  }, [pathname])

  return null
}

const DEFAULT_OPERATOR = {
  name: 'Security Operator',
  email: 'operator@ronin.local',
  role: 'Security Operator',
}

function DashboardShell({ user, onSignOut }) {
  const [navOpen, setNavOpen] = useState(false)
  const { theme, toggle: onToggleTheme } = useTheme()

  // Map user object for topbar (fullName -> name)
  const displayUser = user ? {
    name: user.fullName || user.name || 'Operator',
    email: user.email || 'operator@ronin.local',
    role: user.role || 'Security Operator',
  } : DEFAULT_OPERATOR

  return (
    <div className="app-shell">
      <ScrollToTop />
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <Topbar
        user={displayUser}
        onSignOut={onSignOut}
        navOpen={navOpen}
        onToggleNav={() => setNavOpen(o => !o)}
        theme={theme}
        onToggleTheme={onToggleTheme}
      />

      <main className="app-main">
        <div className="app-content">
          <Routes>
            <Route path="/"                    element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard"           element={<Overview />} />
            <Route path="/dashboard/scans"     element={<Scans />} />
            <Route path="/dashboard/findings"  element={<Findings />} />
            <Route path="/dashboard/endpoints" element={<Endpoints />} />
            <Route path="/dashboard/agents"    element={<AgentGraph />} />
            <Route path="/dashboard/sandbox"   element={<Sandbox />} />
            <Route path="/dashboard/reports"   element={<Reports />} />
            <Route path="/dashboard/settings"  element={<Settings />} />
            <Route path="*"                    element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('roninUser')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    const token = localStorage.getItem('roninToken')
    if (token) {
      fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.success && data?.user) {
            setUser(data.user)
            localStorage.setItem('roninUser', JSON.stringify(data.user))
          }
        })
        .catch(() => {
          // Keep offline or cached user state
        })
    }
  }, [])

  const handleSignOut = () => {
    localStorage.removeItem('roninToken')
    localStorage.removeItem('roninUser')
    localStorage.removeItem('ronin_active_target')
    try {
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('ronin_active_target')) localStorage.removeItem(k)
      })
    } catch {}
    setUser(null)
  }

  if (!user) {
    return <AuthPage onAuth={(authedUser) => setUser(authedUser)} />
  }

  return (
    <DashboardShell
      user={user}
      onSignOut={handleSignOut}
    />
  )
}
