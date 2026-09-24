import { Card, Icon, StatusDot, Button, PageHeader, StatStrip } from '../components/ui.jsx'
import { MOCK_SANDBOX } from '../data/mock.js'

export default function Sandbox() {
  return (
    <div className="page">
      <PageHeader title="Sandbox" subtitle="Isolated PoC execution environment and validation history." />

      {/* Status row */}
      <div style={{ marginBottom: 24 }}>
        <StatStrip items={[
          { label: 'Status', value: 'Ready', sub: 'Alpine Linux', accent: 'var(--success)' },
          { label: 'Runtime', value: 'Docker 24.x', sub: 'Container isolation' },
          { label: 'Validations', value: '3', sub: 'This session', accent: 'var(--accent)' },
          { label: 'False Positives', value: '0', sub: '100% precision', accent: 'var(--success)' },
        ]} />
      </div>

      {/* Sandbox status card */}
      <Card style={{ padding: '22px 24px', marginBottom: 20, borderColor: 'rgba(6,118,71,.2)', background: 'var(--success-soft)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ width: 40, height: 40, borderRadius: 'var(--r-md)', background: 'rgba(6,118,71,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)', flexShrink: 0 }}>
            <Icon name="sandbox" size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-primary)' }}>Sandbox Environment</span>
              <StatusDot status="ready" />
              <span style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600 }}>Ready</span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Alpine Linux · Docker 24.x · Network isolated · Ephemeral containers</div>
          </div>
          <Button variant="secondary" size="sm"><Icon name="activity" size={14} /> Diagnostics</Button>
        </div>
      </Card>

      {/* PoC execution history */}
      <Card>
        <div style={{ padding: '16px 20px 14px', borderBottom: '1px solid var(--border)' }}>
          <div className="section-label" style={{ marginBottom: 0 }}>PoC Execution History</div>
        </div>
        <div className="table-scroll">
          <div style={{ minWidth: 480 }}>
            <div className="table-head" style={{ gridTemplateColumns: '100px 1fr 110px 90px' }}>
              <div>ID</div><div>Finding</div><div>Result</div><div>Duration</div>
            </div>
            {MOCK_SANDBOX.map(p => (
              <div key={p.id} className="table-row" style={{ gridTemplateColumns: '100px 1fr 110px 90px', cursor: 'default' }}>
                <div className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.id}</div>
                <div style={{ fontSize: 13.5, color: 'var(--text-primary)', fontWeight: 500 }}>{p.finding}</div>
                <div>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontSize: 11.5, fontWeight: 600, padding: '3px 10px', borderRadius: 'var(--r-full)',
                    background: p.result === 'verified' ? 'var(--success-soft)' : 'var(--danger-soft)',
                    color: p.result === 'verified' ? 'var(--success)' : 'var(--danger)',
                  }}>
                    <Icon name={p.result === 'verified' ? 'check' : 'x'} size={11} />
                    {p.result === 'verified' ? 'Verified' : 'Rejected'}
                  </span>
                </div>
                <div className="mono" style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{p.duration}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}
