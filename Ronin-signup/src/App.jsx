import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Sidebar, Topbar } from './components/Shell.jsx'
import { MOCK_USER } from './data/mock.js'

// Auth page (existing)
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

function DashboardShell({ onSignOut }) {
  const [navOpen, setNavOpen] = useState(false)

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg-canvas)' }}>
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <Topbar
        user={MOCK_USER}
        onSignOut={onSignOut}
        navOpen={navOpen}
        onToggleNav={() => setNavOpen(o => !o)}
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
  const [authed, setAuthed] = useState(() => !!localStorage.getItem('roninUser'))

  if (!authed) {
    return <AuthPage onAuth={() => setAuthed(true)} />
  }

  return (
    <DashboardShell
      onSignOut={() => { localStorage.removeItem('roninUser'); setAuthed(false) }}
    />
  )
}
