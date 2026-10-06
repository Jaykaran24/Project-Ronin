import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { NavLink } from 'react-router-dom'
import { Icon, StatusDot } from './ui.jsx'
import { Logo, LogoMark } from './Logo.jsx'
import { getActiveScan } from '../services/api.js'

/* ── Theme hook ─────────────────────────────────────────── */
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    // Prefer the premium dark cyber aesthetic by default, while still respecting user choice.
    return localStorage.getItem('roninTheme') || 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('roninTheme', theme)
  }, [theme])

  const toggle = useCallback(() => {
    setTheme(t => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, toggle }
}

const NAV = [
  { to: '/dashboard',           icon: 'overview',    label: 'Overview' },
  { to: '/dashboard/scans',     icon: 'scans',       label: 'Scans',        badge: '1',  badgeColor: 'accent' },
  { to: '/dashboard/findings',  icon: 'findings',    label: 'Findings',     badge: '5',  badgeColor: 'critical' },
  { to: '/dashboard/endpoints', icon: 'endpoints',   label: 'Endpoints',    badge: '12', badgeColor: 'neutral' },
  { to: '/dashboard/agents',    icon: 'agentgraph',  label: 'Agent Graph' },
  { to: '/dashboard/sandbox',   icon: 'sandbox',     label: 'Sandbox',      badge: '3',  badgeColor: 'success' },
  { to: '/dashboard/reports',   icon: 'reports',     label: 'Reports' },
  { to: '/dashboard/settings',  icon: 'settings',    label: 'Settings' },
]

const SYSTEM_STATUS = [
  { label: 'Ollama', status: 'online'  },
  { label: 'Sandbox', status: 'ready'  },
  { label: 'Backend', status: 'online' },
]

export function Sidebar({ open, onClose }) {
  if (!open) return null

  return createPortal(
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
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          minHeight: 'var(--topbar-h)',
          background: 'var(--bg-surface)',
        }}>
          <Logo subtitle="v0.1.0-alpha" />
          <button
            onClick={onClose}
            aria-label="Close navigation"
            style={{
              background: 'var(--bg-subtle)', border: '1px solid var(--border)',
              borderRadius: 'var(--r-sm)', color: 'var(--text-muted)',
              cursor: 'pointer', padding: 5, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '16px 0', overflowY: 'auto', overflowX: 'hidden' }}>
          <div style={{ padding: '0 24px 8px', fontSize: 10.5, fontWeight: 750, letterSpacing: '0.8px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Operations
          </div>
          {NAV.map(({ to, icon, label, badge, badgeColor }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard'}
              onClick={onClose}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon name={icon} size={17} />
              <span style={{ fontSize: 13.5 }}>{label}</span>
              {badge && (
                <span style={{
                  marginLeft: 'auto',
                  fontSize: 10.5,
                  fontWeight: 750,
                  padding: '1px 7px',
                  borderRadius: 'var(--r-full)',
                  background: badgeColor === 'critical' ? 'var(--sev-critical-soft)' : badgeColor === 'accent' ? 'var(--accent-soft)' : badgeColor === 'success' ? 'var(--success-soft)' : 'var(--bg-subtle)',
                  color: badgeColor === 'critical' ? 'var(--sev-critical)' : badgeColor === 'accent' ? 'var(--accent)' : badgeColor === 'success' ? 'var(--success)' : 'var(--text-muted)',
                  border: `1px solid ${badgeColor === 'critical' ? 'rgba(244,63,94,0.3)' : badgeColor === 'accent' ? 'var(--accent-soft-strong)' : 'var(--border)'}`,
                }}>
                  {badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* System status footer */}
        <div style={{ borderTop: '1px solid var(--border)', padding: '16px 18px', background: 'var(--bg-surface)' }}>
          <div style={{
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}>
            <div style={{ fontSize: 10.5, fontWeight: 750, letterSpacing: '0.6px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Infrastructure
            </div>
            {SYSTEM_STATUS.map(({ label, status }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <StatusDot status={status} pulse={status === 'online' || status === 'ready'} />
                  <span style={{ fontSize: 11, color: status === 'online' || status === 'ready' ? 'var(--success)' : 'var(--danger)', fontWeight: 600, textTransform: 'capitalize' }}>
                    {status === 'ready' ? 'Ready' : status === 'online' ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </>,
    document.body
  )
}

export function Topbar({ user, onSignOut, navOpen, onToggleNav, theme, onToggleTheme, activeTarget }) {
  const isDark = theme === 'dark'
  const userKey = user?.email || user?.id || user?._id || 'default'
  const storageKey = `ronin_active_target_${userKey}`

  const [currentTarget, setCurrentTarget] = useState(() => {
    // Purge legacy global key immediately so it never leaks across accounts
    try { localStorage.removeItem('ronin_active_target') } catch {}
    if (activeTarget) return activeTarget.replace(/^https?:\/\//, '').replace(/\/$/, '')
    return localStorage.getItem(storageKey) || 'STANDBY'
  })

  useEffect(() => {
    // Ensure legacy unscoped key is purged
    try { localStorage.removeItem('ronin_active_target') } catch {}

    if (activeTarget) {
      const clean = activeTarget.replace(/^https?:\/\//, '').replace(/\/$/, '')
      setCurrentTarget(clean)
      localStorage.setItem(storageKey, clean)
    } else {
      getActiveScan()
        .then(scan => {
          if (scan && scan.target && (scan.status === 'running' || scan.status === 'paused' || scan.status === 'pending')) {
            const clean = scan.target.replace(/^https?:\/\//, '').replace(/\/$/, '')
            setCurrentTarget(clean)
            localStorage.setItem(storageKey, clean)
          } else {
            setCurrentTarget('STANDBY')
            localStorage.removeItem(storageKey)
          }
        })
        .catch(() => {
          setCurrentTarget('STANDBY')
          localStorage.removeItem(storageKey)
        })
    }
  }, [activeTarget, userKey, storageKey])

  return (
    <header className="topbar" style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      height: 'var(--topbar-h)',
      background: isDark ? 'rgba(11, 17, 24, 0.9)' : 'rgba(255, 255, 255, 0.92)',
      backdropFilter: 'blur(18px)',
      WebkitBackdropFilter: 'blur(18px)',
      borderBottom: '1px solid var(--border)',
      boxShadow: isDark ? '0 12px 28px rgba(2, 6, 23, 0.35)' : '0 12px 28px rgba(15, 23, 42, 0.08)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px 0 18px',
      zIndex: 90,
      gap: 16,
    }}>
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <button
          onClick={onToggleNav}
          aria-label={navOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={navOpen}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            color: 'var(--text-secondary)', cursor: 'pointer',
            width: 34, height: 34,
            borderRadius: 'var(--r-md)', flexShrink: 0,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <Icon name={navOpen ? 'close' : 'menu'} size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <LogoMark size={22} />
          <span className="topbar-wordmark" style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '2px', color: 'var(--text-primary)' }}>RONIN</span>
        </div>

        <div className="topbar-divider" style={{ width: 1, height: 22, background: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />

        {/* Target Badge Capsule */}
        <div className="topbar-target-capsule" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-full)',
          padding: '4px 12px 4px 10px',
          boxShadow: 'var(--shadow-sm)',
          minWidth: 0,
        }}>
          <StatusDot status={currentTarget === 'STANDBY' ? 'ready' : 'online'} pulse={currentTarget !== 'STANDBY'} />
          <span className="topbar-target-label" style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase' }}>TARGET</span>
          <span className="mono truncate" style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)', minWidth: 0 }}>{currentTarget}</span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 'var(--r-full)',
            background: 'var(--accent-soft)', color: 'var(--accent)', letterSpacing: 0.5,
            border: '1px solid var(--accent-soft-strong)',
            flexShrink: 0,
          }}>{currentTarget === 'STANDBY' ? 'IDLE' : 'ACTIVE'}</span>
        </div>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Light mode' : 'Dark mode'}
          style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            color: 'var(--text-muted)', cursor: 'pointer',
            width: 34, height: 34,
            borderRadius: 'var(--r-md)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name={isDark ? 'sun' : 'moon'} size={17} />
        </button>

        <button
          style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            color: 'var(--text-muted)', cursor: 'pointer',
            width: 34, height: 34,
            borderRadius: 'var(--r-md)',
            boxShadow: 'var(--shadow-sm)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          aria-label="Notifications"
        >
          <Icon name="bell" size={17} />
        </button>

        {/* User menu */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '3px 12px 3px 4px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-full)',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'var(--accent-soft)', border: '1px solid var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--accent)', fontSize: 11.5, fontWeight: 700,
            flexShrink: 0,
            boxShadow: '0 0 8px var(--accent-glow)',
          }}>
            {user?.name?.[0]?.toUpperCase() ?? 'A'}
          </div>
          <div className="topbar-user-details" style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 650, color: 'var(--text-primary)', lineHeight: 1.2 }}>{user?.name ?? 'Operator'}</span>
            <span style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1 }}>SecOps</span>
          </div>
          {onSignOut && (
            <button
              onClick={onSignOut}
              aria-label="Sign out"
              title="Sign out"
              style={{
                background: 'none', border: 'none', color: 'var(--text-muted)',
                cursor: 'pointer', padding: 2, marginLeft: 4, display: 'flex', alignItems: 'center',
              }}
            >
              <Icon name="logout" size={14} />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

