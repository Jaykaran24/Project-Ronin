import { useState } from 'react'
import { Card, Button, Icon, StatusDot, StatusBadge, PageHeader, Dialog } from '../components/ui.jsx'
import { MOCK_SCANS, MOCK_SCAN, MOCK_AGENTS } from '../data/mock.js'

const STEP_LABELS = ['Target', 'Input mode', 'Review']

export default function Scans() {
  const [showLaunch, setShowLaunch] = useState(false)
  const [step, setStep] = useState(1)
  const [targetUrl, setTargetUrl] = useState('')
  const [inputMode, setInputMode] = useState('discovery')

  return (
    <div className="page">
      <PageHeader
        title="Scans"
        subtitle="Operational scan history and live scan management."
        actions={
          <Button variant="primary" onClick={() => { setShowLaunch(true); setStep(1) }}>
            <Icon name="launch" size={15} /> Launch Scan
          </Button>
        }
      />

      {/* Active scan highlight */}
      <Card style={{ padding: '20px 24px', marginBottom: 20, borderColor: 'var(--accent-soft-strong)', background: 'var(--accent-soft)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <StatusBadge status="running" />
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{MOCK_SCAN.name}</div>
              <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{MOCK_SCAN.id}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <div className="num" style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>{MOCK_SCAN.progress}%</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Progress</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div className="num" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{MOCK_SCAN.endpointsTested}/{MOCK_SCAN.endpointsTotal}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Endpoints</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div className="num" style={{ fontSize: 18, fontWeight: 700, color: 'var(--sev-critical)' }}>1</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Critical</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" size="sm"><Icon name="pause" size={14} /> Pause</Button>
              <Button variant="danger" size="sm"><Icon name="abort" size={14} /> Abort</Button>
            </div>
          </div>
        </div>
        {/* Mini progress bar */}
        <div style={{ marginTop: 16, height: 4, background: 'var(--bg-surface)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: `${MOCK_SCAN.progress}%`, height: '100%', background: 'var(--accent)', borderRadius: 2 }} />
        </div>

        {/* Agent pipeline mini */}
        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          {MOCK_AGENTS.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <StatusDot status={a.status} pulse={a.status === 'active'} />
              <span style={{ fontSize: 12, color: a.status === 'active' ? 'var(--accent)' : a.status === 'completed' ? 'var(--success)' : 'var(--text-muted)', fontWeight: a.status === 'active' ? 600 : 400 }}>{a.name}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Scan history table */}
      <Card>
        <div className="table-scroll">
          <div style={{ minWidth: 900 }}>
            <div className="table-head" style={{ gridTemplateColumns: '180px 1fr 140px 90px 90px 90px 90px 110px' }}>
              <div>Scan ID</div><div>Target</div><div>Started</div><div>Endpoints</div><div>Findings</div><div>Critical</div><div>Val. Rate</div><div>Status</div>
            </div>
            {MOCK_SCANS.map(s => (
              <div key={s.id} className="table-row" style={{ gridTemplateColumns: '180px 1fr 140px 90px 90px 90px 90px 110px' }}>
                <div className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.id.replace('SCAN-', '')}</div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)' }}>{s.name}</div>
                  <div className="mono truncate" style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{s.target}</div>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{s.startedAt}</div>
                <div className="num" style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{s.endpoints}</div>
                <div className="num" style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{s.findings}</div>
                <div className="num" style={{ fontSize: 13, fontWeight: 700, color: s.critical > 0 ? 'var(--sev-critical)' : 'var(--text-muted)' }}>{s.critical}</div>
                <div className="num" style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>{s.validationRate}</div>
                <div><StatusBadge status={s.status} /></div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Launch Scan Dialog */}
      <Dialog
        open={showLaunch}
        onClose={() => setShowLaunch(false)}
        title="Launch Scan"
        subtitle={`Step ${step} of 3 · ${STEP_LABELS[step - 1]}`}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <Button variant="secondary" onClick={() => step > 1 ? setStep(s => s - 1) : setShowLaunch(false)}>
              {step > 1 ? 'Back' : 'Cancel'}
            </Button>
            <Button variant="primary" onClick={() => { if (step < 3) setStep(s => s + 1); else setShowLaunch(false); }}>
              {step === 3 ? <><Icon name="launch" size={15} /> Start Scan</> : 'Continue'}
            </Button>
          </div>
        }
      >
        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
          {[1, 2, 3].map(n => (
            <div key={n} style={{ flex: 1, height: 3, borderRadius: 2, background: n <= step ? 'var(--accent)' : 'var(--border)', transition: 'background .2s' }} />
          ))}
        </div>

        {step === 1 && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <label htmlFor="target-url" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Target API URL</label>
              <input
                id="target-url"
                className="input mono"
                value={targetUrl}
                onChange={e => setTargetUrl(e.target.value)}
                placeholder="https://api.example.local"
              />
            </div>
          </div>
        )}
        {step === 2 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 14 }}>Input mode</div>
            {[
              { id: 'discovery', label: 'Base URL discovery', desc: 'Crawl and fingerprint the API from the root URL.' },
              { id: 'openapi',   label: 'OpenAPI specification', desc: 'Import a .json or .yaml spec file.' },
              { id: 'postman',   label: 'Postman collection', desc: 'Import a Postman v2.1 collection.' },
              { id: 'list',      label: 'Endpoint list', desc: 'Provide a plain text list of paths.' },
            ].map(opt => (
              <label key={opt.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 14px', marginBottom: 6, borderRadius: 'var(--r-sm)', border: `1px solid ${inputMode === opt.id ? 'var(--accent)' : 'var(--border)'}`, background: inputMode === opt.id ? 'var(--accent-soft)' : 'var(--bg-surface)', cursor: 'pointer', transition: 'all .15s' }}>
                <input type="radio" name="mode" value={opt.id} checked={inputMode === opt.id} onChange={() => setInputMode(opt.id)} style={{ marginTop: 3, accentColor: 'var(--accent)' }} />
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>{opt.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        )}
        {step === 3 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 14 }}>Review</div>
            <div style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>
              {[
                { label: 'Target',     value: targetUrl || 'https://api.example.local' },
                { label: 'Input Mode', value: inputMode },
                { label: 'Scope',      value: '38 endpoints expected' },
              ].map(({ label, value }, i) => (
                <div key={label} style={{ display: 'flex', padding: '13px 18px', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ width: 100, fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</div>
                  <div className="mono" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
