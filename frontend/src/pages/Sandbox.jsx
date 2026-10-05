import { useState } from 'react'
import { Card, Icon, StatusDot, Button, PageHeader, StatStrip, Dialog } from '../components/ui.jsx'
import { MOCK_SANDBOX } from '../data/mock.js'

export default function Sandbox() {
  const [selectedPoc, setSelectedPoc] = useState(null)
  const [diagnosticsRunning, setDiagnosticsRunning] = useState(false)
  const [diagnosticResult, setDiagnosticResult] = useState(null)

  const runDiagnostics = () => {
    setDiagnosticsRunning(true)
    setTimeout(() => {
      setDiagnosticsRunning(false)
      setDiagnosticResult('Isolation check passed: seccomp enabled, cgroups memory limit 512MB active, egress firewall locked.')
    }, 1200)
  }

  return (
    <div className="page">
      <PageHeader
        title="Sandbox & PoC Isolation"
        subtitle="Ephemeral container execution engine for safe and reproducible vulnerability verification."
      />

      {/* Surface Stats */}
      <div style={{ marginBottom: 20 }}>
        <StatStrip items={[
          { label: 'Container State', value: 'Ready', sub: 'Alpine 3.18', accent: 'var(--success)' },
          { label: 'Isolation Mode', value: 'Docker cgroups', sub: 'Rootless execution' },
          { label: 'Validations Run', value: '3', sub: 'This session', accent: 'var(--accent)' },
          { label: 'Precision Rate', value: '100%', sub: '0 false positives', accent: 'var(--success)' },
        ]} />
      </div>

      {/* Network Egress & Safety Isolation Banner */}
      <Card style={{ padding: '22px 24px', marginBottom: 20, borderColor: 'rgba(34,197,94,0.3)', background: 'var(--success-soft)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 'var(--r-md)', background: 'rgba(34,197,94,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)', flexShrink: 0 }}>
              <Icon name="sandbox" size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Sandbox Security Sandbox Container</span>
                <StatusDot status="ready" />
                <span style={{ fontSize: 11.5, color: 'var(--success)', fontWeight: 700, textTransform: 'uppercase' }}>Hardened Isolation Active</span>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                Container network interface is strictly restricted to communicate exclusively with the target host (`127.0.0.1:5000`). All unauthorized external internet egress is rejected at the bridge firewall.
              </div>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={runDiagnostics} disabled={diagnosticsRunning}>
            <Icon name={diagnosticsRunning ? 'clock' : 'activity'} size={14} />
            {diagnosticsRunning ? 'Testing Isolation...' : 'Run Diagnostics'}
          </Button>
        </div>

        {diagnosticResult && (
          <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--r-sm)', fontSize: 12, color: 'var(--success)', fontWeight: 600, border: '1px solid rgba(34,197,94,0.3)' }}>
            ✓ {diagnosticResult}
          </div>
        )}
      </Card>

      {/* Configured Quotas & Resource Constraints */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Memory Ceiling',  val: '512 MB',         desc: 'cgroups hard ceiling' },
          { label: 'CPU Quota',       val: '1.0 vCPU',       desc: 'Throttle limit' },
          { label: 'Hard Timeout',    val: '30 seconds',     desc: 'Auto-kill signal' },
          { label: 'Filesystem',      val: 'Read-Only + tmpfs', desc: 'Immutable overlay' },
        ].map(q => (
          <Card key={q.label} style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: 4 }}>
              {q.label}
            </div>
            <div className="mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
              {q.val}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{q.desc}</div>
          </Card>
        ))}
      </div>

      {/* PoC execution history */}
      <Card>
        <div style={{ padding: '16px 20px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="section-label" style={{ marginBottom: 0 }}>
            PoC Execution Audit History
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Click any run to view raw container stdout / stderr</span>
        </div>

        <div className="table-scroll">
          <div style={{ minWidth: 600 }}>
            <div className="table-head" style={{ gridTemplateColumns: '110px 1.5fr 120px 100px 140px' }}>
              <div>Run ID</div>
              <div>Tested Finding</div>
              <div>Validation State</div>
              <div>Duration</div>
              <div>Container Telemetry</div>
            </div>

            {MOCK_SANDBOX.map(p => (
              <div
                key={p.id}
                onClick={() => setSelectedPoc(p)}
                className="table-row"
                style={{ gridTemplateColumns: '110px 1.5fr 120px 100px 140px', cursor: 'pointer' }}
              >
                <div className="mono" style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>{p.id}</div>
                <div style={{ fontSize: 13.5, color: 'var(--text-primary)', fontWeight: 600 }}>{p.finding}</div>
                <div>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontSize: 11.5, fontWeight: 650, padding: '3px 10px', borderRadius: 'var(--r-full)',
                    background: p.result === 'verified' ? 'var(--success-soft)' : 'var(--danger-soft)',
                    color: p.result === 'verified' ? 'var(--success)' : 'var(--danger)',
                    border: `1px solid ${p.result === 'verified' ? 'rgba(34,197,94,0.3)' : 'rgba(244,63,94,0.3)'}`,
                  }}>
                    <Icon name={p.result === 'verified' ? 'check' : 'x'} size={11} />
                    {p.result === 'verified' ? 'Verified' : 'Rejected'}
                  </span>
                </div>
                <div className="mono" style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{p.duration}</div>
                <div>
                  <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedPoc(p) }}>
                    <Icon name="code" size={13} /> View Terminal
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Raw Container Terminal Output Dialog */}
      <Dialog
        open={!!selectedPoc}
        onClose={() => setSelectedPoc(null)}
        title={`Container Terminal Output — ${selectedPoc?.id}`}
        subtitle={`Execution logs for ${selectedPoc?.finding} · Alpine 3.18`}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setSelectedPoc(null)}>Close Terminal</Button>
          </div>
        }
      >
        {selectedPoc && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />
                <span className="mono" style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>stdout / stderr stream (exit 0)</span>
              </div>
              <span className="mono" style={{ fontSize: 11.5, color: 'var(--accent)' }}>Execution: {selectedPoc.duration}</span>
            </div>

            <pre className="mono" style={{
              margin: 0,
              padding: '16px 18px',
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--r-md)',
              fontSize: 12,
              lineHeight: 1.7,
              color: '#34D399',
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.3)',
            }}>
              {selectedPoc.stdout}
            </pre>
          </div>
        )}
      </Dialog>
    </div>
  )
}
