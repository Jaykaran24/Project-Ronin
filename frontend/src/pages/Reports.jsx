import { useState } from 'react'
import { Card, Icon, Button, SeverityBadge, PageHeader, Dialog } from '../components/ui.jsx'
import { MOCK_SCANS, MOCK_FINDINGS } from '../data/mock.js'

export default function Reports() {
  const [complianceModalScan, setComplianceModalScan] = useState(null)
  const [diffModalScan, setDiffModalScan] = useState(null)
  const [copiedFormat, setCopiedFormat] = useState(null)

  const handleExport = (format, scanId) => {
    setCopiedFormat(`${format}-${scanId}`)
    setTimeout(() => setCopiedFormat(null), 2000)
  }

  return (
    <div className="page">
      <PageHeader
        title="Reports & Compliance"
        subtitle="Generate executive vulnerability summaries, OWASP compliance matrices, and scan comparison diffs."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {MOCK_SCANS.map(scan => (
          <Card key={scan.id} style={{ padding: '24px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ flex: '2 1 260px', minWidth: 260 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{ fontSize: 16, fontWeight: 650, color: 'var(--text-primary)' }}>{scan.name}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--r-full)', background: scan.status === 'running' ? 'var(--accent-soft)' : 'var(--success-soft)', color: scan.status === 'running' ? 'var(--accent)' : 'var(--success)' }}>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 170 }}>
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
                <div style={{ marginTop: 4, fontSize: 11.5, color: 'var(--text-muted)' }}>
                  {scan.findings} total · {scan.validationRate} verified
                </div>
                {scan.diff && (
                  <div style={{ marginTop: 6, display: 'flex', gap: 8, fontSize: 11 }}>
                    <span style={{ color: 'var(--danger)', fontWeight: 600 }}>+{scan.diff.newFindings} New</span>
                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>-{scan.diff.resolvedFindings} Resolved</span>
                  </div>
                )}
              </div>

              {/* Actions & Dialog openers */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 200 }}>
                <Button variant="primary" size="sm" onClick={() => setComplianceModalScan(scan)} style={{ width: '100%' }}>
                  <Icon name="reports" size={14} /> Executive Compliance View
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setDiffModalScan(scan)} style={{ width: '100%' }}>
                  <Icon name="activity" size={14} /> Compare With Previous Scan
                </Button>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="secondary" size="sm" style={{ flex: 1 }} onClick={() => handleExport('PDF', scan.id)}>
                    <Icon name="download" size={13} /> {copiedFormat === `PDF-${scan.id}` ? 'Exported!' : 'PDF'}
                  </Button>
                  <Button variant="secondary" size="sm" style={{ flex: 1 }} onClick={() => handleExport('HTML', scan.id)}>
                    <Icon name="download" size={13} /> {copiedFormat === `HTML-${scan.id}` ? 'Exported!' : 'HTML'}
                  </Button>
                  <Button variant="secondary" size="sm" style={{ flex: 1 }} onClick={() => handleExport('JSON', scan.id)}>
                    <Icon name="download" size={13} /> {copiedFormat === `JSON-${scan.id}` ? 'Exported!' : 'JSON'}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Executive Compliance Modal */}
      <Dialog
        open={!!complianceModalScan}
        onClose={() => setComplianceModalScan(null)}
        title="OWASP API Security Top 10 (2023) Compliance Mapping"
        subtitle={`Assessment report for ${complianceModalScan?.name} (${complianceModalScan?.target})`}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <Button variant="secondary" onClick={() => setComplianceModalScan(null)}>Close</Button>
            <Button variant="primary" onClick={() => alert('Executive PDF report downloaded.')}>
              <Icon name="download" size={14} /> Download Stakeholder PDF
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            This scan assessed the API attack surface against the OWASP API Security Top 10 standard. All flagged vulnerabilities have been proven reproducible in the sandbox.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { id: 'API1:2023', name: 'Broken Object Level Authorization (BOLA)', status: 'FAILED', sev: 'critical', desc: 'Observed unauthorized tenant parameter tampering on /users/{id}.' },
              { id: 'API2:2023', name: 'Broken Authentication', status: 'FAILED', sev: 'high', desc: 'Expired token verification accepted without validation on /auth/verify.' },
              { id: 'API3:2023', name: 'Broken Object Property Level Authorization', status: 'FAILED', sev: 'medium', desc: 'Excessive order data and payment token exposure on /orders.' },
              { id: 'API4:2023', name: 'Unrestricted Resource Consumption', status: 'FAILED', sev: 'low', desc: 'Missing rate limiting or throttling on authentication route.' },
              { id: 'API5:2023', name: 'Broken Function Level Authorization', status: 'PASSED', sev: 'success', desc: 'Administrative endpoints appropriately rejected standard user tokens.' },
              { id: 'API6:2023', name: 'Unrestricted Access to Sensitive Business Flows (Mass Assignment)', status: 'FAILED', sev: 'high', desc: 'Role privilege escalation via PUT /profile payload.' },
            ].map(m => (
              <div key={m.id} style={{ padding: '10px 14px', background: 'var(--bg-subtle)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span className="mono" style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-primary)' }}>{m.id}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>{m.name}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{m.desc}</div>
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
        title={`Scan Vulnerability Diff — ${diffModalScan?.id}`}
        subtitle="Comparison between current execution and baseline assessment."
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setDiffModalScan(null)}>Close Diff</Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div style={{ padding: '12px 14px', background: 'var(--danger-soft)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 'var(--r-md)', textAlign: 'center' }}>
              <div className="num" style={{ fontSize: 20, fontWeight: 750, color: 'var(--danger)' }}>+3</div>
              <div style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 650 }}>New Flaws Detected</div>
            </div>
            <div style={{ padding: '12px 14px', background: 'var(--success-soft)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 'var(--r-md)', textAlign: 'center' }}>
              <div className="num" style={{ fontSize: 20, fontWeight: 750, color: 'var(--success)' }}>-1</div>
              <div style={{ fontSize: 11, color: 'var(--success)', fontWeight: 650 }}>Flaws Remedied</div>
            </div>
            <div style={{ padding: '12px 14px', background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', textAlign: 'center' }}>
              <div className="num" style={{ fontSize: 20, fontWeight: 750, color: 'var(--text-primary)' }}>2</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 650 }}>Unchanged Flaws</div>
            </div>
          </div>

          <div style={{ padding: '14px 16px', background: 'var(--bg-subtle)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
            <div className="section-label" style={{ marginBottom: 8 }}>Remediated Vulnerability</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)', background: 'var(--success-soft)', padding: '2px 8px', borderRadius: 'var(--r-full)' }}>
                RESOLVED
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Unauthenticated Debug Endpoint /metrics</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              Endpoint returned 401 Unauthorized in current run (previously returned raw Prometheus process metrics).
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
