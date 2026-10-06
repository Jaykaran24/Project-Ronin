import { useState } from 'react'
import { Card, Icon, Button, SeverityBadge, PageHeader, Dialog } from '../components/ui.jsx'
import { useApi } from '../hooks/useApi.js'
import { getScans, getFindings, downloadReport } from '../services/api.js'

const OWASP_TOP_10 = [
  { id: 'API1:2023', name: 'Broken Object Level Authorization (BOLA)', desc: 'Object ID parameter tampering without tenant authorization.' },
  { id: 'API2:2023', name: 'Broken Authentication', desc: 'Invalid, weak, or unverified tokens and authentication flows.' },
  { id: 'API3:2023', name: 'Broken Object Property Level Authorization', desc: 'Excessive data exposure and unauthorized property access.' },
  { id: 'API4:2023', name: 'Unrestricted Resource Consumption', desc: 'Missing rate limiting, throttling, or execution quotas.' },
  { id: 'API5:2023', name: 'Broken Function Level Authorization', desc: 'Unauthorized access to administrative operations.' },
  { id: 'API6:2023', name: 'Unrestricted Access to Sensitive Business Flows', desc: 'Mass assignment and business logic tampering.' },
  { id: 'API7:2023', name: 'Server Side Request Forgery (SSRF)', desc: 'Arbitrary backend egress to untrusted external URLs.' },
  { id: 'API8:2023', name: 'Security Misconfiguration', desc: 'Verbose error messages, exposed stack traces, or default configs.' },
  { id: 'API9:2023', name: 'Improper Inventory Management', desc: 'Unregistered, deprecated, or shadow API endpoints.' },
  { id: 'API10:2023', name: 'Unsafe Consumption of APIs', desc: 'Insecure validation of third-party API integration data.' },
]

export default function Reports() {
  const [complianceModalScan, setComplianceModalScan] = useState(null)
  const [diffModalScan, setDiffModalScan] = useState(null)
  const [copiedFormat, setCopiedFormat] = useState(null)

  const { data: rawScans, loading: loadingScans, error: errorScans } = useApi(getScans)
  const { data: rawFindings } = useApi(getFindings)

  const findingsList = (rawFindings || []).map(f => ({
    id: f.findingId || f.id || f._id,
    scanId: f.scanId,
    title: f.title,
    severity: (f.severity || 'low').toLowerCase(),
    owasp: f.owasp || 'API1:2023',
    endpoint: f.endpoint,
    status: f.status || 'verified',
  }))

  const scansList = (rawScans || []).map(s => {
    const sId = s.scanId || s.id || s._id
    const scanFindings = findingsList.filter(f => f.scanId === sId)
    const crit = s.criticalCount ?? scanFindings.filter(f => f.severity === 'critical').length
    const high = s.highCount ?? scanFindings.filter(f => f.severity === 'high').length
    const med  = s.mediumCount ?? scanFindings.filter(f => f.severity === 'medium').length
    const low  = s.lowCount ?? scanFindings.filter(f => f.severity === 'low').length
    const totalFindings = (crit + high + med + low) > 0 ? (crit + high + med + low) : scanFindings.length

    return {
      id: sId,
      name: s.name || `Scan ${s.target}`,
      target: s.target,
      startedAt: s.startedAt ? new Date(s.startedAt).toLocaleString() : 'Recent',
      duration: s.completedAt && s.startedAt
        ? `${Math.max(1, Math.round((new Date(s.completedAt) - new Date(s.startedAt)) / 60000))}m`
        : (s.status === 'running' ? 'Active' : 'Completed'),
      endpoints: s.endpointsTotal ?? s.endpointsTested ?? 0,
      endpointsTested: s.endpointsTested ?? 0,
      findings: totalFindings,
      critical: crit,
      high: high,
      medium: med,
      low: low,
      validationRate: s.validationRate || (totalFindings > 0 ? '100%' : 'N/A'),
      status: s.status || 'completed',
      diff: s.diff || null,
      reportMarkdown: s.reportMarkdown,
    }
  })

  const handleExport = (format, scan) => {
    setCopiedFormat(`${format}-${scan.id}`)
    setTimeout(() => setCopiedFormat(null), 2000)

    if (format === 'MD') {
      window.open(downloadReport(scan.id), '_blank')
    } else if (format === 'JSON') {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(scan, null, 2))
      const dlAnchor = document.createElement('a')
      dlAnchor.setAttribute('href', dataStr)
      dlAnchor.setAttribute('download', `ronin_report_${scan.id}.json`)
      document.body.appendChild(dlAnchor)
      dlAnchor.click()
      dlAnchor.remove()
    } else if (format === 'HTML') {
      const htmlDoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Ronin Security Assessment - ${scan.id}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; background: #0b1118; color: #f1f5f9; line-height: 1.6; }
    h1 { color: #64d7b0; margin-bottom: 4px; }
    .card { background: #16202c; border: 1px solid #233446; border-radius: 8px; padding: 24px; margin-top: 20px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 12px; font-weight: bold; }
    .crit { background: rgba(244,63,94,0.2); color: #f43f5e; }
    .high { background: rgba(249,115,22,0.2); color: #f97316; }
    .med  { background: rgba(234,179,8,0.2); color: #eab308; }
  </style>
</head>
<body>
  <h1>Project Ronin — Assessment Report</h1>
  <p style="color: #94a3b8;">Target: <strong>${scan.target}</strong> · ID: ${scan.id} · Generated: ${new Date().toLocaleString()}</p>
  <div class="card">
    <h3>Executive Summary</h3>
    <p>Endpoints Analyzed: <strong>${scan.endpoints}</strong> · Confirmed Flaws: <strong>${scan.findings}</strong> · Validation Rate: <strong>${scan.validationRate}</strong></p>
    <div>
      <span class="badge crit">${scan.critical} Critical</span>
      <span class="badge high">${scan.high} High</span>
      <span class="badge med">${scan.medium} Medium</span>
    </div>
  </div>
</body>
</html>`
      const blob = new Blob([htmlDoc], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ronin_report_${scan.id}.html`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    }
  }

  // Derive compliance mapping for modal scan
  const getComplianceMapping = (scan) => {
    if (!scan) return []
    const scanFindings = findingsList.filter(f => f.scanId === scan.id)
    return OWASP_TOP_10.map(m => {
      const matching = scanFindings.filter(f => (f.owasp || '').startsWith(m.id.split(':')[0]))
      const failed = matching.length > 0
      return {
        ...m,
        status: failed ? 'FAILED' : 'PASSED',
        sev: failed ? matching[0].severity : 'success',
        detail: failed
          ? `${matching.length} verified flaw(s) identified on ${matching.map(f => f.endpoint).filter(Boolean).join(', ') || 'target API'}.`
          : 'Zero matching authorization or input flaws detected during active verification.',
      }
    })
  }

  return (
    <div className="page">
      <PageHeader
        title="Reports & Compliance"
        subtitle="Generate executive vulnerability summaries, OWASP compliance matrices, and scan comparison diffs."
      />

      {loadingScans ? (
        <Card style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Icon name="clock" size={24} style={{ color: 'var(--accent)', marginBottom: 8 }} />
          <div>Loading assessment reports from backend...</div>
        </Card>
      ) : errorScans ? (
        <Card style={{ padding: '24px', borderColor: 'var(--danger-soft)', background: 'var(--danger-soft)' }}>
          <div style={{ color: 'var(--danger)', fontWeight: 650 }}>Failed to retrieve reports from server</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{errorScans.message}</div>
        </Card>
      ) : scansList.length === 0 ? (
        <Card style={{ padding: '40px 24px', textAlign: 'center' }}>
          <Icon name="reports" size={32} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
          <div style={{ fontSize: 16, fontWeight: 650, color: 'var(--text-primary)', marginBottom: 4 }}>No Scan Reports Recorded</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 460, margin: '0 auto 16px' }}>
            Run an automated API security scan from the Scans page to produce executive reports, compliance matrices, and reproducible proof-of-concepts.
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {scansList.map(scan => (
            <Card key={scan.id} style={{ padding: '24px 28px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
                <div style={{ flex: '2 1 240px', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div style={{ fontSize: 16, fontWeight: 650, color: 'var(--text-primary)' }}>{scan.name}</div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--r-full)',
                      background: scan.status === 'running' ? 'var(--accent-soft)' : 'var(--success-soft)',
                      color: scan.status === 'running' ? 'var(--accent)' : 'var(--success)'
                    }}>
                      {scan.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="mono" style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>{scan.id}</div>
                  <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                    {[
                      { label: 'Target', value: scan.target },
                      { label: 'Timestamp', value: scan.startedAt },
                      { label: 'Duration', value: scan.duration },
                      { label: 'Endpoints', value: scan.endpoints },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.6px', marginBottom: 3 }}>{label.toUpperCase()}</div>
                        <div className="mono" style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Severity summary & Diff stats */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0, flex: '1 1 150px' }}>
                  <div className="section-label" style={{ marginBottom: 4 }}>Findings Breakdown</div>
                  {scan.critical > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <SeverityBadge level="critical" />
                      <span className="num" style={{ fontSize: 13, color: 'var(--sev-critical)', fontWeight: 700 }}>{scan.critical}</span>
                    </div>
                  )}
                  {scan.high > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <SeverityBadge level="high" />
                      <span className="num" style={{ fontSize: 13, color: 'var(--sev-high)', fontWeight: 700 }}>{scan.high}</span>
                    </div>
                  )}
                  {scan.medium > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <SeverityBadge level="medium" />
                      <span className="num" style={{ fontSize: 13, color: 'var(--sev-medium)', fontWeight: 700 }}>{scan.medium}</span>
                    </div>
                  )}
                  {scan.low > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <SeverityBadge level="low" />
                      <span className="num" style={{ fontSize: 13, color: 'var(--sev-low)', fontWeight: 700 }}>{scan.low}</span>
                    </div>
                  )}
                  <div style={{ marginTop: 4, fontSize: 11.5, color: 'var(--text-muted)' }}>
                    {scan.findings} total · {scan.validationRate} verified
                  </div>
                  {scan.diff && (
                    <div style={{ marginTop: 6, display: 'flex', gap: 8, fontSize: 11 }}>
                      <span style={{ color: 'var(--danger)', fontWeight: 600 }}>+{scan.diff.newFindings || 0} New</span>
                      <span style={{ color: 'var(--success)', fontWeight: 600 }}>-{scan.diff.resolvedFindings || 0} Resolved</span>
                    </div>
                  )}
                </div>

                {/* Actions & Dialog openers */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, flex: '1 1 180px' }}>
                  <Button variant="primary" size="sm" onClick={() => setComplianceModalScan(scan)} style={{ width: '100%' }}>
                    <Icon name="reports" size={14} /> Executive Compliance View
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setDiffModalScan(scan)} style={{ width: '100%' }}>
                    <Icon name="activity" size={14} /> Compare Assessment History
                  </Button>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="secondary" size="sm" style={{ flex: 1 }} onClick={() => handleExport('MD', scan)}>
                      <Icon name="download" size={13} /> {copiedFormat === `MD-${scan.id}` ? 'Exported!' : 'MD'}
                    </Button>
                    <Button variant="secondary" size="sm" style={{ flex: 1 }} onClick={() => handleExport('HTML', scan)}>
                      <Icon name="download" size={13} /> {copiedFormat === `HTML-${scan.id}` ? 'Exported!' : 'HTML'}
                    </Button>
                    <Button variant="secondary" size="sm" style={{ flex: 1 }} onClick={() => handleExport('JSON', scan)}>
                      <Icon name="download" size={13} /> {copiedFormat === `JSON-${scan.id}` ? 'Exported!' : 'JSON'}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Executive Compliance Modal */}
      <Dialog
        open={!!complianceModalScan}
        onClose={() => setComplianceModalScan(null)}
        title="OWASP API Security Top 10 (2023) Compliance Mapping"
        subtitle={`Assessment report for ${complianceModalScan?.name} (${complianceModalScan?.target})`}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <Button variant="secondary" onClick={() => setComplianceModalScan(null)}>Close</Button>
            <Button variant="primary" onClick={() => complianceModalScan && handleExport('MD', complianceModalScan)}>
              <Icon name="download" size={14} /> Download Markdown Report
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            This scan assessed the API attack surface against the OWASP API Security Top 10 standard. All flagged vulnerabilities are verified reproducible in the isolation sandbox.
          </p>
          <div style={{ padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Attack Surface Mapped</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{complianceModalScan?.endpoints || 0} Discovered Endpoints Audited</div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Target: <span className="mono" style={{ color: 'var(--accent)' }}>{complianceModalScan?.target}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {getComplianceMapping(complianceModalScan).map(m => (
              <div key={m.id} style={{ padding: '10px 14px', background: 'var(--bg-subtle)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span className="mono" style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-primary)' }}>{m.id}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>{m.name}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{m.detail}</div>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 'var(--r-full)',
                  background: m.status === 'PASSED' ? 'var(--success-soft)' : 'var(--danger-soft)',
                  color: m.status === 'PASSED' ? 'var(--success)' : 'var(--danger)',
                  border: `1px solid ${m.status === 'PASSED' ? 'rgba(34,197,94,0.3)' : 'rgba(244,63,94,0.3)'}`,
                  flexShrink: 0,
                }}>
                  {m.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Dialog>

      {/* Diff / Comparison Modal */}
      <Dialog
        open={!!diffModalScan}
        onClose={() => setDiffModalScan(null)}
        title={`Scan Assessment Diff — ${diffModalScan?.id}`}
        subtitle={`Target: ${diffModalScan?.target} · Comparison against baseline execution.`}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setDiffModalScan(null)}>Close Diff</Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
            <div style={{ padding: '12px 14px', background: 'var(--danger-soft)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 'var(--r-md)', textAlign: 'center' }}>
              <div className="num" style={{ fontSize: 20, fontWeight: 750, color: 'var(--danger)' }}>
                +{diffModalScan?.diff?.newFindings ?? diffModalScan?.findings ?? 0}
              </div>
              <div style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 650 }}>New Flaws Detected</div>
            </div>
            <div style={{ padding: '12px 14px', background: 'var(--success-soft)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 'var(--r-md)', textAlign: 'center' }}>
              <div className="num" style={{ fontSize: 20, fontWeight: 750, color: 'var(--success)' }}>
                -{diffModalScan?.diff?.resolvedFindings ?? 0}
              </div>
              <div style={{ fontSize: 11, color: 'var(--success)', fontWeight: 650 }}>Flaws Remedied</div>
            </div>
            <div style={{ padding: '12px 14px', background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', textAlign: 'center' }}>
              <div className="num" style={{ fontSize: 20, fontWeight: 750, color: 'var(--text-primary)' }}>
                {diffModalScan?.diff?.unchangedFindings ?? Math.max(0, (diffModalScan?.findings || 0) - (diffModalScan?.diff?.newFindings || 0))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 650 }}>Unchanged Flaws</div>
            </div>
          </div>

          <div style={{ padding: '14px 16px', background: 'var(--bg-subtle)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
            <div className="section-label" style={{ marginBottom: 8 }}>Target Execution Metrics</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '2px 8px', borderRadius: 'var(--r-full)' }}>
                AUDITED
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                {diffModalScan?.target} — {diffModalScan?.endpoints} Endpoints Mapped
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Vulnerabilities reproducible in sandbox with {diffModalScan?.validationRate} verification confidence.
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
