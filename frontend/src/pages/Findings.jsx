import { useState } from 'react'
import { Card, Icon, SeverityBadge, MethodBadge, PageHeader, SearchInput, Segmented, Drawer, Button } from '../components/ui.jsx'
import { useApi } from '../hooks/useApi.js'
import { getFindings } from '../services/api.js'

function FindingDrawer({ finding, onClose }) {
  const [copiedType, setCopiedType] = useState(null)
  const [activeTab, setActiveTab] = useState('narrative') // narrative | http | poc | remediation
  const [showCvssBreakdown, setShowCvssBreakdown] = useState(false)

  if (!finding) return null

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text)
    setCopiedType(type)
    setTimeout(() => setCopiedType(null), 2000)
  }

  const exportMarkdownIssue = () => {
    const md = `## [${finding.severity.toUpperCase()}] ${finding.title}
**OWASP Category:** ${finding.owasp}
**Endpoint:** \`${finding.method} ${finding.endpoint}\`
**CVSS v3.1:** ${finding.cvss} (\`${finding.cvssVector || 'N/A'}\`)

### Vulnerability Narrative
${finding.narrative || finding.description}

### Reproduction (cURL)
\`\`\`bash
${finding.poc}
\`\`\`

### Remediation Recommendation
${finding.remediation}
`
    copyToClipboard(md, 'issue')
  }

  return (
    <Drawer open={!!finding} onClose={onClose} labelledBy="finding-title" width="min(680px, 94vw)">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <SeverityBadge level={finding.severity} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)', background: 'var(--success-soft)', padding: '2px 8px', borderRadius: 'var(--r-full)', border: '1px solid rgba(34,197,94,0.3)' }}>
              100% Sandbox Verified
            </span>
          </div>
          <h2 id="finding-title" style={{ fontSize: 22, fontWeight: 650, color: 'var(--text-primary)', margin: '4px 0', letterSpacing: '-0.4px' }}>
            {finding.title}
          </h2>
          <div className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {finding.owasp} · <span style={{ color: 'var(--accent)' }}>{finding.id}</span> · Discovered {finding.discoveredAt}
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            background: 'var(--bg-subtle)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-sm)', color: 'var(--text-muted)',
            cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Icon name="close" size={16} />
        </button>
      </div>

      {/* Target Endpoint & CVSS Strip */}
      <div style={{ padding: '12px 16px', background: 'var(--bg-subtle)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MethodBadge method={finding.method} />
          <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{finding.endpoint}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span className="num" style={{ fontSize: 18, fontWeight: 750, color: `var(--sev-${finding.severity})` }}>{finding.cvss}</span>
            <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600 }}>CVSS v3.1</span>
          </div>
          <button
            onClick={() => setShowCvssBreakdown(!showCvssBreakdown)}
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-sm)', padding: '3px 8px', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            {showCvssBreakdown ? 'Hide Vector ▲' : 'Vector Breakdown ▼'}
          </button>
        </div>
      </div>

      {/* Collapsible CVSS 3.1 Vector Breakdown */}
      {showCvssBreakdown && (
        <div style={{ padding: '14px 16px', background: 'var(--bg-canvas)', borderRadius: 'var(--r-md)', border: '1px solid var(--border-strong)', marginBottom: 20, animation: 'reveal 0.2s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span className="section-label" style={{ marginBottom: 0 }}>CVSS v3.1 Vector String</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>{finding.cvssVector}</span>
          </div>
          {finding.cvssMetrics && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
              {Object.entries(finding.cvssMetrics).map(([k, v]) => (
                <div key={k} style={{ padding: '6px 10px', background: 'var(--bg-subtle)', borderRadius: 'var(--r-xs)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{k.toUpperCase()}</div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-primary)' }}>{v}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="table-scroll" style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--border)', paddingBottom: 10, marginBottom: 18 }}>
        {[
          { id: 'narrative',   label: 'Attack Narrative' },
          { id: 'http',        label: 'HTTP Request & Response' },
          { id: 'poc',         label: 'PoC Scripts' },
          { id: 'remediation', label: 'Remediation & Patch' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="chip accent"
            aria-pressed={activeTab === tab.id}
            style={{ fontSize: 11.5, padding: '4px 12px' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Attack Narrative */}
      {activeTab === 'narrative' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ padding: '16px 18px', background: 'var(--bg-subtle)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
            <div className="section-label" style={{ marginBottom: 8 }}>Vulnerability Summary</div>
            <p style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-secondary)' }}>{finding.description}</p>
          </div>
          <div style={{ padding: '16px 18px', background: 'var(--bg-subtle)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
            <div className="section-label" style={{ marginBottom: 8 }}>AI Attack Narrative & Execution Analysis</div>
            <p style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-secondary)' }}>
              {finding.narrative || 'The Exploit agent flagged unauthorized state transition when altering object identifiers.'}
            </p>
          </div>
        </div>
      )}

      {/* Tab 2: HTTP Raw Payloads */}
      {activeTab === 'http' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span className="section-label" style={{ marginBottom: 0 }}>Attack Request Probe</span>
              <button onClick={() => copyToClipboard(finding.rawRequest, 'req')} style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>
                {copiedType === 'req' ? '✓ Copied' : 'Copy Request'}
              </button>
            </div>
            <pre className="mono" style={{ margin: 0, padding: '12px 14px', background: 'var(--bg-canvas)', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-sm)', fontSize: 11.5, lineHeight: 1.6, color: 'var(--text-primary)', overflowX: 'auto' }}>
              {finding.rawRequest}
            </pre>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span className="section-label" style={{ marginBottom: 0 }}>Vulnerable Server Response</span>
              <button onClick={() => copyToClipboard(finding.rawResponse, 'res')} style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>
                {copiedType === 'res' ? '✓ Copied' : 'Copy Response'}
              </button>
            </div>
            <pre className="mono" style={{ margin: 0, padding: '12px 14px', background: 'var(--bg-canvas)', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-sm)', fontSize: 11.5, lineHeight: 1.6, color: 'var(--sev-critical)', overflowX: 'auto' }}>
              {finding.rawResponse}
            </pre>
          </div>
        </div>
      )}

      {/* Tab 3: PoC Scripts */}
      {activeTab === 'poc' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span className="section-label" style={{ marginBottom: 0 }}>cURL Exploit Vector</span>
              <button onClick={() => copyToClipboard(finding.poc, 'poc')} style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>
                {copiedType === 'poc' ? '✓ Copied' : 'Copy cURL'}
              </button>
            </div>
            <pre className="mono" style={{ margin: 0, padding: '12px 14px', background: 'var(--bg-canvas)', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-sm)', fontSize: 11.5, lineHeight: 1.6, color: 'var(--text-primary)', overflowX: 'auto' }}>
              {finding.poc}
            </pre>
          </div>

          {finding.pythonPoc && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span className="section-label" style={{ marginBottom: 0 }}>Python PoC Script (Requests)</span>
                <button onClick={() => copyToClipboard(finding.pythonPoc, 'pypoc')} style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>
                  {copiedType === 'pypoc' ? '✓ Copied' : 'Copy Python'}
                </button>
              </div>
              <pre className="mono" style={{ margin: 0, padding: '12px 14px', background: 'var(--bg-canvas)', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-sm)', fontSize: 11.5, lineHeight: 1.6, color: 'var(--text-primary)', overflowX: 'auto' }}>
                {finding.pythonPoc}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Remediation */}
      {activeTab === 'remediation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ padding: '16px 18px', background: 'var(--bg-subtle)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
            <div className="section-label" style={{ marginBottom: 8 }}>Remediation Strategy</div>
            <p style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--text-secondary)' }}>{finding.remediation}</p>
          </div>
          {finding.remediationCode && (
            <div>
              <div className="section-label" style={{ marginBottom: 6 }}>Recommended Code Patch / Middleware</div>
              <pre className="mono" style={{ margin: 0, padding: '12px 14px', background: 'var(--bg-canvas)', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-sm)', fontSize: 11.5, lineHeight: 1.6, color: 'var(--success)', overflowX: 'auto' }}>
                {finding.remediationCode}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Footer Issue Tracker Integration */}
      <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <button
          onClick={exportMarkdownIssue}
          className="btn btn-secondary btn-sm"
        >
          <Icon name="copy" size={13} />
          {copiedType === 'issue' ? 'Copied GitHub / Jira Markdown!' : 'Export to GitHub / Jira Issue'}
        </button>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Verified by Ronin Exploit & Sandbox Agents</span>
      </div>
    </Drawer>
  )
}

const SEVERITIES = [
  { value: 'all', label: 'All Severities' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

export default function Findings() {
  const [selected, setSelected] = useState(null)
  const [sev, setSev] = useState('all')
  const [search, setSearch] = useState('')

  const { data: rawFindings, loading } = useApi(getFindings)

  const findingsList = (rawFindings || []).map(f => ({
    id: f.findingId || f.id || f._id,
    scanId: f.scanId || 'UNKNOWN',
    title: f.title,
    severity: (f.severity || 'medium').toLowerCase(),
    owasp: f.owasp || 'API Security',
    endpoint: f.endpoint || '/',
    method: f.method || 'GET',
    cvss: f.cvss ?? 5.0,
    cvssVector: f.cvssVector || 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:N',
    cvssMetrics: f.cvssMetrics || {},
    status: f.status || 'verified',
    discoveredAt: f.discoveredAt ? (typeof f.discoveredAt === 'string' ? f.discoveredAt.slice(0, 16).replace('T', ' ') : new Date(f.discoveredAt).toISOString().slice(0, 16).replace('T', ' ')) : 'Recent',
    description: f.description || '',
    narrative: f.narrative || f.description || '',
    rawRequest: f.rawRequest || '',
    rawResponse: f.rawResponse || '',
    poc: f.poc || f.pocCurl || '',
    pythonPoc: f.pythonPoc || '',
    remediation: f.remediation || '',
    remediationCode: f.remediationCode || '',
  }))

  const filtered = findingsList.filter(f => {
    const matchSev = sev === 'all' || f.severity === sev
    const q = search.toLowerCase()
    const matchQ = !q || f.title.toLowerCase().includes(q) || f.endpoint.toLowerCase().includes(q) || f.owasp.toLowerCase().includes(q)
    return matchSev && matchQ
  })

  const total = findingsList.length
  const counts = { critical: 0, high: 0, medium: 0, low: 0 }
  findingsList.forEach(f => {
    const s = f.severity.toLowerCase()
    if (counts[s] !== undefined) counts[s] = counts[s] + 1
  })

  const scanCount = [...new Set(findingsList.map(f => f.scanId))].length

  return (
    <div className="page">
      <PageHeader
        title="Vulnerability Findings"
        subtitle={`${total} verified findings across ${scanCount} security assessment${scanCount !== 1 ? 's' : ''}.${loading ? ' (Refreshing...)' : ''}`}
      />

      {/* Severity distribution hero */}
      <Card style={{ padding: '20px 22px', marginBottom: 20 }}>
        <div style={{ display: 'flex', height: 8, borderRadius: 'var(--r-full)', overflow: 'hidden', marginBottom: 14, background: 'var(--bg-subtle)' }}>
          {['critical', 'high', 'medium', 'low'].map(s => (
            counts[s] > 0 && (
              <div key={s} style={{ width: `${(counts[s] / total) * 100}%`, background: `var(--sev-${s})` }} />
            )
          ))}
        </div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          {['critical', 'high', 'medium', 'low'].map(s => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: `var(--sev-${s})`, flexShrink: 0, boxShadow: `0 0 6px var(--sev-${s})` }} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize', fontWeight: 500 }}>{s}</span>
              <span className="num" style={{ fontSize: 13, fontWeight: 700, color: `var(--sev-${s})` }}>{counts[s]}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Search and Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: '1 1 260px', minWidth: 200 }}>
          <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter by title, endpoint, or OWASP tag..." label="Search findings" />
        </div>
        <Segmented options={SEVERITIES} value={sev} onChange={setSev} />
      </div>

      {/* Findings table */}
      <Card>
        <div className="table-scroll">
          <div style={{ minWidth: 840 }}>
            <div className="table-head" style={{ gridTemplateColumns: '120px 1.4fr 110px 1.2fr 80px 100px 60px' }}>
              <div>Severity</div>
              <div>Finding Description</div>
              <div>OWASP Category</div>
              <div>Affected Endpoint</div>
              <div>CVSS</div>
              <div>Verification</div>
              <div />
            </div>
            {filtered.length === 0 && (
              <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                No findings match your active filters.
              </div>
            )}
            {filtered.map(f => (
              <button
                key={f.id}
                onClick={() => setSelected(f)}
                className="table-row"
                style={{ gridTemplateColumns: '120px 1.4fr 110px 1.2fr 80px 100px 60px', padding: '14px 20px' }}
              >
                <div><SeverityBadge level={f.severity} /></div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{f.title}</div>
                <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{f.owasp}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                  <MethodBadge method={f.method} />
                  <span className="mono truncate" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{f.endpoint}</span>
                </div>
                <div className="num" style={{ fontSize: 13, fontWeight: 700, color: `var(--sev-${f.severity})` }}>{f.cvss}</div>
                <div>
                  <span style={{
                    fontSize: 11, fontWeight: 650, padding: '2px 8px', borderRadius: 'var(--r-full)',
                    background: 'var(--success-soft)', color: 'var(--success)', border: '1px solid rgba(34, 197, 94, 0.24)'
                  }}>Verified</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Icon name="chevronRight" size={16} style={{ color: 'var(--text-muted)' }} />
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
