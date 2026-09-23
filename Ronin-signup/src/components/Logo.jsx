// Ronin brand mark — a grid-built "R" whose leg is a single blade-like cut.
export function LogoMark({ size = 24, color = 'var(--accent, #002FA7)', title }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : 'true'}
      aria-label={title}
      style={{ display: 'block', flexShrink: 0 }}
    >
      <rect width="24" height="24" rx="5" fill={color} />
      <path
        d="M8 18V6h4.5a3.25 3.25 0 0 1 0 6.5H8M11.6 12.5 16.8 18"
        fill="none"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  )
}

export function Logo({ size = 26, subtitle, showWordmark = true }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <LogoMark size={size} title={showWordmark ? undefined : 'Ronin'} />
      {showWordmark && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '2.5px', color: 'var(--text-primary)', lineHeight: 1.2 }}>RONIN</div>
          {subtitle && <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 0.3, marginTop: 1 }}>{subtitle}</div>}
        </div>
      )}
    </div>
  )
}
