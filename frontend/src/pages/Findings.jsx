import { useState } from 'react'
import { Card, Icon, SeverityBadge, MethodBadge, PageHeader, SearchInput, Segmented, Drawer } from '../components/ui.jsx'
import { MOCK_FINDINGS } from '../data/mock.js'

function FindingDrawer({ finding, onClose }) {
  const [copied, setCopied] = useState(false)
  if (!finding) return null

  const copy = () => {
    navigator.clipboard.writeText(finding.poc)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Drawer open={!!finding} onClose={onClose} labelledBy="finding-title">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <SeverityBadge level={finding.severity} />
          <h2 id="finding-title" style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: '10px 0 4px', letterSpacing: -0.3 }}>{finding.title}</h2>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{finding.owasp} · {finding.id}</div>
        </div>
        <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
          <Icon name="close" size={20} />
        </button>
      </div>

      {[
        { label: 'Summary', content: <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-secondary)' }}>{finding.description}</p> },
        { label: 'Affected Endpoint', content: (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-subtle)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}>
            <MethodBadge method={finding.method} />
            <span className="mono" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{finding.endpoint}</span>
          </div>
        )},
        { label: 'CVSS Score', content: (
          <div style={{ display: 'flex', gap: 24 }}>
            <div><div className="num" style={{ fontSize: 28, fontWeight: 700, color: `var(--sev-${finding.severity})` }}>{finding.cvss}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>CVSS v3.1</div></div>
            <div style={{ alignSelf: 'center' }}><SeverityBadge level={finding.severity} /></div>
          </div>
        )},
        { label: 'Proof of Concept', content: (
          <div style={{ position: 'relative' }}>
            <pre style={{
              margin: 0, padding: '14px 16px',
              background: 'var(--bg-subtle)', border: '1px solid var(--border)',
              borderRadius: 'var(--r-sm)', fontFamily: 'var(--font-mono)',
              fontSize: 12.5, lineHeight: 1.7, color: 'var(--text-secondary)',
              overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            }}>
              {finding.poc}
            </pre>
            <button
              onClick={copy}
              aria-label="Copy proof of concept"
              style={{
                position: 'absolute', top: 10, right: 10,
                background: copied ? 'var(--success)' : 'var(--bg-surface)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--r-sm)', color: copied ? '#fff' : 'var(--text-muted)',
                padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5, transition: 'all .2s',
              }}
            >
              <Icon name={copied ? 'check' : 'copy'} size={13} />
              {copied ? 'Copied' : 'Copy'}
            </button>
            <span role="status" aria-live="polite" className="sr-only">{copied ? 'Proof of concept copied to clipboard' : ''}</span>
          </div>
        )},
        { label: 'Validation Status', content: (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--success-soft)', border: '1px solid rgba(6,118,71,.2)', borderRadius: 'var(--r-sm)' }}>
            <Icon name="check" size={16} style={{ color: 'var(--success)' }} />
            <span style={{ fontSize: 13, color: 'var(--success)', fontWeight: 500 }}>Verified in sandbox</span>
          </div>
        )},
        { label: 'Remediation', content: <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-secondary)' }}>{finding.remediation}</p> },
      ].map(({ label, content }) => (
        <div key={label} style={{ marginBottom: 24 }}>
          <div className="section-label" style={{ marginBottom: 10 }}>{label}</div>
          {content}
        </div>
      ))}
    </Drawer>
  )
}

const SEVERITIES = [
  { value: 'all', label: 'All' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

export default function Findings() {
  const [selected, setSelected] = useState(null)
  const [sev, setSev] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = MOCK_FINDINGS.filter(f => {
    const matchSev = sev === 'all' || f.severity === sev
    const q = search.toLowerCase()
    const matchQ = !q || f.title.toLowerCase().includes(q) || f.endpoint.toLowerCase().includes(q) || f.owasp.toLowerCase().includes(q)
    return matchSev && matchQ
  })

  const total = MOCK_FINDINGS.length
  const counts = { critical: 0, high: 0, medium: 0, low: 0 }
  MOCK_FINDINGS.forEach(f => { counts[f.severity] = (counts[f.severity] ?? 0) + 1 })

  return (
    <div className="page">
      <PageHeader
        title="Findings"
        subtitle={`${total} verified vulnerabilities across ${[...new Set(MOCK_FINDINGS.map(f => f.scanId))].length} scan run${total !== 1 ? 's' : ''}.`}
      />

      {/* Severity distribution */}
      <Card style={{ padding: '18px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 14, background: 'var(--bg-subtle)' }}>
          {['critical', 'high', 'medium', 'low'].map(s => (
            counts[s] > 0 && (
              <div key={s} style={{ width: `${(counts[s] / total) * 100}%`, background: `var(--sev-${s})` }} />
            )
          ))}
        </div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          {['critical', 'high', 'medium', 'low'].map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: `var(--sev-${s})`, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{s}</span>
              <span className="num" style={{ fontSize: 12, fontWeight: 700, color: `var(--sev-${s})` }}>{counts[s]}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Search findings, endpoints, OWASP..." label="Search findings" />
        <Segmented options={SEVERITIES} value={sev} onChange={setSev} />
      </div>

      {/* Findings table */}
      <Card>
        <div className="table-scroll">
          <div style={{ minWidth: 760 }}>
            <div className="table-head" style={{ gridTemplateColumns: '110px 1fr 120px 1fr 70px 80px 90px' }}>
              <div>Severity</div><div>Finding</div><div>Category</div><div>Endpoint</div><div>CVSS</div><div>Status</div><div />
            </div>
            {filtered.length === 0 && (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>No findings match your filters.</div>
            )}
            {filtered.map(f => (
              <button
                key={f.id}
                onClick={() => setSelected(f)}
                className="table-row"
                style={{ gridTemplateColumns: '110px 1fr 120px 1fr 70px 80px 90px' }}
              >
                <div><SeverityBadge level={f.severity} /></div>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)' }}>{f.title}</div>
                <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{f.owasp}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <MethodBadge method={f.method} />
                  <span className="mono truncate" style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{f.endpoint}</span>
                </div>
                <div className="num" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{f.cvss}</div>
                <div>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 'var(--r-full)',
                    background: 'var(--success-soft)', color: 'var(--success)',
                  }}>Verified</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Icon name="chevronRight" size={15} style={{ color: 'var(--text-muted)' }} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </Card>

      <FindingDrawer finding={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
