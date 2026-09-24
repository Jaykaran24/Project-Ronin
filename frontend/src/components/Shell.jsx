import { useState, useEffect, useCallback } from 'react'
import { NavLink } from 'react-router-dom'
import { Icon, StatusDot } from './ui.jsx'
import { Logo, LogoMark } from './Logo.jsx'

/* ── Theme hook ─────────────────────────────────────────── */
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    // Respect stored preference; default to 'light' (matches :root vars)
    return localStorage.getItem('roninTheme') || 'light'
  })

  useEffect(() => {
    const html = document.documentElement
    if (theme === 'dark') {
      html.setAttribute('data-theme', 'dark')
    } else {
      html.removeAttribute('data-theme')
    }
    localStorage.setItem('roninTheme', theme)
  }, [theme])

  const toggle = useCallback(() => {
    setTheme(t => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, toggle }
}

const NAV = [
  { to: '/dashboard',       icon: 'overview',    label: 'Overview'     },
  { to: '/dashboard/scans', icon: 'scans',       label: 'Scans'        },
  { to: '/dashboard/findings', icon: 'findings', label: 'Findings'     },
  { to: '/dashboard/endpoints', icon: 'endpoints', label: 'Endpoints'  },
  { to: '/dashboard/agents', icon: 'agentgraph', label: 'Agent Graph'  },
  { to: '/dashboard/sandbox', icon: 'sandbox',   label: 'Sandbox'      },
  { to: '/dashboard/reports', icon: 'reports',   label: 'Reports'      },
  { to: '/dashboard/settings', icon: 'settings', label: 'Settings'     },
]

const SYSTEM_STATUS = [
  { label: 'Ollama', status: 'online'  },
  { label: 'Sandbox', status: 'ready'  },
  { label: 'Backend', status: 'online' },
]

export function Sidebar({ open, onClose }) {
  if (!open) return null

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <aside
        className="sidebar-nav"
        aria-label="Navigation"
        style={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          width: 'var(--sidebar-w)',
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          zIndex: 201,
          animation: 'slide-in .2s ease both',
        }}
      >
        {/* Brand */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 20px',
          borderBottom: '1px solid var(--border)',
          minHeight: 'var(--topbar-h)',
        }}>
          <Logo subtitle="v0.1.0-alpha" />
          <button
            onClick={onClose}
            aria-label="Close navigation"
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto', overflowX: 'hidden' }}>
          {NAV.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard'}
              onClick={onClose}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon name={icon} size={17} />
              <span style={{ fontSize: 13.5 }}>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* System status footer */}
        <div style={{ borderTop: '1px solid var(--border)', padding: '14px 20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {SYSTEM_STATUS.map(({ label, status }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <StatusDot status={status} />
                  <span style={{ fontSize: 11, color: status === 'online' || status === 'ready' ? 'var(--success)' : 'var(--danger)', fontWeight: 500, textTransform: 'capitalize' }}>
                    {status === 'ready' ? 'Ready' : status === 'online' ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </>
  )
}

export function Topbar({ user, onSignOut, navOpen, onToggleNav, theme, onToggleTheme }) {
  const isDark = theme === 'dark'
  return (
    <header className="topbar" style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      height: 'var(--topbar-h)',
      background: isDark
        ? 'rgba(13,17,23,.88)'
        : 'rgba(255,255,255,.85)',
      backdropFilter: 'saturate(180%) blur(6px)',
      WebkitBackdropFilter: 'saturate(180%) blur(6px)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 28px 0 20px',
      zIndex: 90,
      gap: 20,
    }}>
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
        <button
          onClick={onToggleNav}
          aria-label={navOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={navOpen}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4, borderRadius: 'var(--r-sm)', flexShrink: 0 }}
        >
          <Icon name={navOpen ? 'close' : 'menu'} size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <LogoMark size={22} />
          <span className="topbar-wordmark" style={{ fontSize: 13, fontWeight: 700, letterSpacing: '2px', color: 'var(--text-primary)' }}>RONIN</span>
        </div>
        <div className="topbar-divider" style={{ width: 1, alignSelf: 'stretch', margin: '14px 0', background: 'var(--border)', flexShrink: 0 }} />

        <span className="topbar-target-label" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 0.5, whiteSpace: 'nowrap' }}>TARGET</span>
        <span className="mono truncate" style={{ fontSize: 12.5, color: 'var(--text-secondary)', minWidth: 0 }}>api.vulnerable.local</span>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
          background: 'var(--accent-soft)', color: 'var(--accent)', letterSpacing: 0.5,
          flexShrink: 0,
        }}>LOCAL</span>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Light mode' : 'Dark mode'}
          style={{
            background: 'transparent', border: 'none',
            color: 'var(--text-muted)', cursor: 'pointer', padding: 4,
            borderRadius: 'var(--r-sm)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name={isDark ? 'sun' : 'moon'} size={18} />
        </button>

        <button style={{
          background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4,
          borderRadius: 'var(--r-sm)',
        }}
          aria-label="Notifications"
        >
          <Icon name="bell" size={18} />
        </button>

        {/* User menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'var(--accent-soft)', border: '1px solid var(--border-strong)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--accent)', fontSize: 12, fontWeight: 700,
          }}>
            {user?.name?.charAt(0) ?? 'U'}
          </div>
          <button
            onClick={onSignOut}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}

