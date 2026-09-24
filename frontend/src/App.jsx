import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Sidebar, Topbar, useTheme } from './components/Shell.jsx'
import { MOCK_USER } from './data/mock.js'

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

function DashboardShell({ user, onSignOut }) {
  const [navOpen, setNavOpen] = useState(false)
  const { theme, toggle: onToggleTheme } = useTheme()

  // Map user object for topbar (fullName -> name)
  const displayUser = user ? {
    name: user.fullName || user.name || 'Operator',
    email: user.email || 'operator@ronin.local',
    role: user.role || 'Security Operator',
  } : MOCK_USER

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg-canvas)' }}>
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <Topbar
        user={displayUser}
        onSignOut={onSignOut}
        navOpen={navOpen}
        onToggleNav={() => setNavOpen(o => !o)}
        theme={theme}
        onToggleTheme={onToggleTheme}
      />

      <main className="app-main" style={{
        paddingTop: 'var(--topbar-h)',
        minHeight: '100svh',
      }}>
        <div className="app-content" style={{ padding: '32px 32px', maxWidth: 1400 }}>
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
