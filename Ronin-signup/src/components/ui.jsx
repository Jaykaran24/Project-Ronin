import { useEffect, useRef } from 'react'

// Shared icon set — SVG inline, stroke-based, consistent 1.8 stroke width
export function Icon({ name, size = 18, className = '', style = {} }) {
  const icons = {
    // Navigation
    overview:    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
    scans:       <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></>,
    findings:    <><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r=".5" fill="currentColor"/></>,
    endpoints:   <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>,
    agentgraph:  <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98M15.41 10.49 8.59 6.51"/></>,
    sandbox:     <><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></>,
    reports:     <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></>,
    settings:    <><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></>,

    // Actions
    launch:      <><path d="M5 12H19M12 5l7 7-7 7"/></>,
    plus:        <><path d="M12 5v14M5 12h14"/></>,
    pause:       <><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></>,
    abort:       <><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></>,
    copy:        <><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>,
    download:    <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
    external:    <><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></>,
    filter:      <><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></>,
    search:      <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
    chevronRight:<path d="m9 18 6-6-6-6" />,
    chevronLeft: <path d="m15 18-6-6 6-6" />,
    chevronDown: <path d="m6 9 6 6 6-6" />,
    close:       <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
    menu:        <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>,
    arrowLeft:   <><path d="M19 12H5M12 19l-7-7 7-7"/></>,
    arrowRight:  <><path d="M5 12H19M12 5l7 7-7 7"/></>,
    signout:     <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
    clock:       <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></>,

    // Status
    check:       <path d="m5 12 4 4L19 6" />,
    sparkle:     <path d="m12 3 1.3 5.7L19 10l-5.7 1.3L12 17l-1.3-5.7L5 10l5.7-1.3L12 3Zm6.5 12 .5 2.2 2.2.5-2.2.5-.5 2.2-.5-2.2-2.2-.5 2.2-.5.5-2.2Z"/>,
    bell:        <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
    user:        <><circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/></>,
    database:    <><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></>,
    cpu:         <><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M20 9h2M2 15h2M20 15h2"/></>,
    activity:    <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>,
    shield:      <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
    zap:         <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
    eye:         <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
    x:           <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
  }

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      {icons[name] ?? null}
    </svg>
  )
}

export function SeverityBadge({ level }) {
  const map = {
    critical: { label: 'Critical', color: 'var(--sev-critical)', bg: 'var(--sev-critical-soft)' },
    high:     { label: 'High',     color: 'var(--sev-high)',     bg: 'var(--sev-high-soft)'      },
    medium:   { label: 'Medium',   color: 'var(--sev-medium)',   bg: 'var(--sev-medium-soft)'     },
    low:      { label: 'Low',      color: 'var(--sev-low)',      bg: 'var(--sev-low-soft)'        },
  }
  const { label, color, bg } = map[level] ?? { label: level, color: 'var(--text-muted)', bg: 'var(--bg-subtle)' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 9px', borderRadius: 'var(--r-sm)',
      fontSize: 11.5, fontWeight: 600, letterSpacing: '0.1px',
      color, background: bg,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
      {label}
    </span>
  )
}

export function StatusDot({ status, pulse = false }) {
  const colors = {
    active:    'var(--accent)',
    completed: 'var(--success)',
    waiting:   'var(--text-muted)',
    error:     'var(--danger)',
    running:   'var(--accent)',
    paused:    'var(--warning)',
    failed:    'var(--danger)',
    aborted:   'var(--danger)',
    ready:     'var(--success)',
    online:    'var(--success)',
    offline:   'var(--danger)',
  }
  const color = colors[status] ?? 'var(--text-muted)'
  return (
    <span style={{
      display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
      background: color, flexShrink: 0,
      ...(pulse && (status === 'active' || status === 'running')
        ? { animation: 'pulse-dot 1.6s ease-in-out infinite' } : {}),
    }} />
  )
}

export function MethodBadge({ method }) {
  const colors = {
    GET:    { bg: 'var(--success-soft)',       color: 'var(--success)'      },
    POST:   { bg: 'var(--accent-soft)',        color: 'var(--accent)'       },
    PUT:    { bg: 'var(--sev-high-soft)',       color: 'var(--sev-high)'     },
    PATCH:  { bg: 'var(--sev-medium-soft)',     color: 'var(--sev-medium)'   },
    DELETE: { bg: 'var(--sev-critical-soft)',   color: 'var(--sev-critical)' },
  }
  const c = colors[method] ?? { bg: 'var(--bg-subtle)', color: 'var(--text-muted)' }
  return (
    <span className="mono" style={{
      display: 'inline-block', padding: '2px 7px', borderRadius: 4,
      fontSize: 11, fontWeight: 600, letterSpacing: '0.4px',
      background: c.bg, color: c.color, whiteSpace: 'nowrap',
    }}>
      {method}
    </span>
  )
}

export function StatusBadge({ status }) {
  const map = {
    running:   { label: 'Running',   color: 'var(--accent)',  bg: 'var(--accent-soft)'  },
    completed: { label: 'Completed', color: 'var(--success)', bg: 'var(--success-soft)' },
    paused:    { label: 'Paused',    color: 'var(--warning)', bg: 'var(--warning-soft)' },
    failed:    { label: 'Failed',    color: 'var(--danger)',  bg: 'var(--danger-soft)'  },
    aborted:   { label: 'Aborted',   color: 'var(--danger)',  bg: 'var(--danger-soft)'  },
    online:    { label: 'Online',    color: 'var(--success)', bg: 'var(--success-soft)' },
    ready:     { label: 'Ready',     color: 'var(--success)', bg: 'var(--success-soft)' },
    offline:   { label: 'Offline',   color: 'var(--danger)',  bg: 'var(--danger-soft)'  },
  }
  const s = map[status] ?? map.completed
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 'var(--r-full)', fontSize: 11.5, fontWeight: 600, background: s.bg, color: s.color }}>
      <StatusDot status={status} pulse={status === 'running'} />
      {s.label}
    </span>
  )
}

export function Card({ children, style = {}, className = '', onClick }) {
  return (
    <div
      onClick={onClick}
      className={`card ${className}`}
      style={{
        ...(onClick ? { cursor: 'pointer' } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function Button({ children, variant = 'primary', size = 'md', onClick, disabled, style = {}, type = 'button', className = '' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant} btn-${size} ${className}`}
      style={style}
    >
      {children}
    </button>
  )
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  )
}

export function StatStrip({ items }) {
  return (
    <div className="stat-strip">
      {items.map(({ label, value, sub, accent }) => (
        <div key={label} className="stat">
          <div className="stat-label">{label}</div>
          <div className="stat-value num" style={accent ? { color: accent } : undefined}>{value}</div>
          {sub && <div className="stat-sub">{sub}</div>}
        </div>
      ))}
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder, label = 'Search' }) {
  return (
    <div className="search-wrap">
      <span className="search-icon"><Icon name="search" size={15} /></span>
      <label className="sr-only" htmlFor="search-input">{label}</label>
      <input
        id="search-input"
        className="input"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    </div>
  )
}

export function Segmented({ options, value, onChange, accent = false }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }} role="group">
      {options.map(({ value: v, label }) => (
        <button
          key={v}
          type="button"
          className={`chip ${accent ? 'accent' : ''}`}
          aria-pressed={value === v}
          onClick={() => onChange(v)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function useFocusTrap(active, containerRef, onClose) {
  const triggerRef = useRef(null)
  useEffect(() => {
    if (!active) return
    triggerRef.current = document.activeElement
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const getFocusable = () =>
      containerRef.current?.querySelectorAll('button:not(:disabled), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')

    getFocusable()?.[0]?.focus()

    const handleKey = (e) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'Tab') {
        // Re-query on every Tab press so the trap stays correct even if the
        // dialog's content changes (e.g. a multi-step wizard) between focuses.
        const focusable = getFocusable()
        if (!focusable?.length) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = prevOverflow
      triggerRef.current?.focus?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])
}

export function Dialog({ open, onClose, title, subtitle, children, footer, width = 'min(540px, 90vw)' }) {
  const ref = useRef(null)
  useFocusTrap(open, ref, onClose)
  if (!open) return null
  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div
        ref={ref}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        style={{ width }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '32px 32px 0', marginBottom: 28, flexShrink: 0 }}>
          <div>
            <h2 id="dialog-title" style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{title}</h2>
            {subtitle && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} aria-label="Close dialog" className="btn-ghost" style={{ background: 'none', border: 'none', padding: 4, borderRadius: 'var(--r-sm)', color: 'var(--text-muted)' }}>
            <Icon name="close" size={20} />
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: footer ? '0 32px' : '0 32px 32px' }}>
          {children}
        </div>
        {footer && (
          <div style={{ flexShrink: 0, padding: '20px 32px 28px' }}>
            {footer}
          </div>
        )}
      </div>
    </>
  )
}

export function Drawer({ open, onClose, children, width = 'min(600px, 90vw)', labelledBy }) {
  const ref = useRef(null)
  useFocusTrap(open, ref, onClose)
  if (!open) return null
  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div
        ref={ref}
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        style={{ width, padding: '28px 28px' }}
      >
        {children}
      </div>
    </>
  )
}
