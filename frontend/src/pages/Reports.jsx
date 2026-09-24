import { Card, Icon, Button, SeverityBadge, PageHeader } from '../components/ui.jsx'
import { MOCK_SCANS } from '../data/mock.js'

export default function Reports() {
  return (
    <div className="page">
      <PageHeader title="Reports" subtitle="Generated security assessment reports available for export." />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {MOCK_SCANS.map(scan => (
          <Card key={scan.id} style={{ padding: '22px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ flex: '2 1 240px', minWidth: 240 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 5 }}>{scan.name}</div>
                <div className="mono" style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>{scan.id}</div>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Target', value: scan.target },
                    { label: 'Date', value: scan.startedAt },
                    { label: 'Duration', value: scan.duration },
                    { label: 'Endpoints', value: scan.endpoints },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 0.4, marginBottom: 3 }}>{label.toUpperCase()}</div>
                      <div className="mono" style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Severity summary */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 160 }}>
                <div className="section-label" style={{ marginBottom: 4 }}>Findings</div>
                {scan.critical > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><SeverityBadge level="critical" /><span className="num" style={{ fontSize: 13, color: 'var(--sev-critical)', fontWeight: 700 }}>{scan.critical}</span></div>}
                {scan.high > 0     && <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><SeverityBadge level="high" /><span className="num" style={{ fontSize: 13, color: 'var(--sev-high)', fontWeight: 700 }}>{scan.high}</span></div>}
                <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-muted)' }}>{scan.findings} total · {scan.validationRate} validated</div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 180 }}>
                <Button variant="primary" size="sm" style={{ width: '100%' }}>
                  <Icon name="external" size={14} /> View HTML Report
                </Button>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="secondary" size="sm" style={{ flex: 1 }}>
                    <Icon name="download" size={14} /> HTML
                  </Button>
                  <Button variant="secondary" size="sm" style={{ flex: 1 }}>
                    <Icon name="download" size={14} /> JSON
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
