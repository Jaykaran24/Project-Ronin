import { useState } from 'react'
import { Card, Button, Icon, StatusDot, StatusBadge, PageHeader, Dialog } from '../components/ui.jsx'
import { MOCK_SCANS, MOCK_SCAN, MOCK_AGENTS } from '../data/mock.js'

const STEP_LABELS = ['Target Specification', 'Attack Input Mode', 'Review & Launch']

export default function Scans() {
  const [showLaunch, setShowLaunch] = useState(false)
  const [step, setStep] = useState(1)
  const [targetUrl, setTargetUrl] = useState('')
  const [inputMode, setInputMode] = useState('discovery')

  return (
    <div className="page">
      <PageHeader
        title="Scans"
        subtitle="Operational scan history, target auditing, and live execution telemetry."
        actions={
          <Button variant="primary" onClick={() => { setShowLaunch(true); setStep(1) }}>
            <Icon name="launch" size={15} /> Launch Security Scan
          </Button>
        }
      />

      {/* Active scan highlight hero */}
      <Card glow style={{ padding: '22px 26px', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <StatusBadge status="running" />
            <div>
              <div style={{ fontSize: 16, fontWeight: 650, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>{MOCK_SCAN.name}</div>
              <div className="mono" style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{MOCK_SCAN.id}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ padding: '6px 14px', background: 'var(--bg-subtle)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', textAlign: 'center' }}>
              <div className="num" style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>{MOCK_SCAN.progress}%</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Progress</div>
            </div>
            <div style={{ padding: '6px 14px', background: 'var(--bg-subtle)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', textAlign: 'center' }}>
              <div className="num" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{MOCK_SCAN.endpointsTested}/{MOCK_SCAN.endpointsTotal}</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Endpoints</div>
            </div>
            <div style={{ padding: '6px 14px', background: 'var(--bg-subtle)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', textAlign: 'center' }}>
              <div className="num" style={{ fontSize: 18, fontWeight: 700, color: 'var(--sev-critical)' }}>1</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Critical</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" size="sm"><Icon name="pause" size={14} /> Pause</Button>
              <Button variant="danger" size="sm"><Icon name="abort" size={14} /> Abort</Button>
            </div>
          </div>
        </div>

        {/* Mini progress bar */}
        <div style={{ marginTop: 18, height: 5, background: 'var(--bg-subtle)', borderRadius: 'var(--r-full)', overflow: 'hidden' }}>
          <div style={{ width: `${MOCK_SCAN.progress}%`, height: '100%', background: 'var(--accent)', boxShadow: '0 0 10px var(--accent-glow)', borderRadius: 'var(--r-full)' }} />
        </div>

        {/* Agent pipeline mini */}
        <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
          {MOCK_AGENTS.map(a => {
            const isActive = a.status === 'active'
            return (
              <div key={a.id} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 10px',
                borderRadius: 'var(--r-full)',
                background: isActive ? 'var(--accent-soft)' : 'var(--bg-subtle)',
                border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
              }}>
                <StatusDot status={a.status} pulse={isActive} />
                <span style={{ fontSize: 11.5, color: isActive ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: isActive ? 650 : 500 }}>
                  {a.name}
                </span>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Scan history table */}
      <Card>
        <div className="table-scroll">
          <div style={{ minWidth: 920 }}>
            <div className="table-head" style={{ gridTemplateColumns: '170px 1.4fr 140px 90px 90px 90px 100px 120px' }}>
              <div>Scan ID</div>
              <div>Target Specification</div>
              <div>Timestamp</div>
              <div>Endpoints</div>
              <div>Findings</div>
              <div>Critical</div>
              <div>Validation</div>
              <div>Execution State</div>
            </div>
            {MOCK_SCANS.map(s => (
              <div key={s.id} className="table-row" style={{ gridTemplateColumns: '170px 1.4fr 140px 90px 90px 90px 100px 120px' }}>
                <div className="mono" style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>{s.id.replace('SCAN-', '')}</div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</div>
                  <div className="mono truncate" style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{s.target}</div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.startedAt}</div>
                <div className="num" style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{s.endpoints}</div>
                <div className="num" style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{s.findings}</div>
                <div className="num" style={{ fontSize: 13, fontWeight: 700, color: s.critical > 0 ? 'var(--sev-critical)' : 'var(--text-muted)' }}>{s.critical}</div>
                <div className="num" style={{ fontSize: 13, color: 'var(--success)', fontWeight: 650 }}>{s.validationRate}</div>
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
        title="Launch Autonomous Scan"
        subtitle={`Step ${step} of 3 · ${STEP_LABELS[step - 1]}`}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <Button variant="secondary" onClick={() => step > 1 ? setStep(s => s - 1) : setShowLaunch(false)}>
              {step > 1 ? 'Back' : 'Cancel'}
            </Button>
            <Button variant="primary" onClick={() => { if (step < 3) setStep(s => s + 1); else setShowLaunch(false); }}>
              {step === 3 ? <><Icon name="launch" size={15} /> Start Security Audit</> : 'Continue'}
            </Button>
          </div>
        }
      >
        {step === 1 && (
          <div>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginBottom: 18, lineHeight: 1.6 }}>
              Enter the target base URL. Ronin will initiate automated discovery, attack surface mapping, and vulnerability assessment.
            </p>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
              Target API Base URL
            </label>
            <input
              className="input mono"
              value={targetUrl}
              onChange={e => setTargetUrl(e.target.value)}
              placeholder="https://api.vulnerable.local"
              autoFocus
            />
          </div>
        )}

        {step === 2 && (
          <div>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginBottom: 18 }}>
              Select how Ronin's Recon Agent should ingest the target attack surface:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { id: 'discovery', label: 'Automated Crawl & Spec Discovery', desc: 'Auto-probes for OpenAPI, Swagger, and exposed REST endpoints.' },
                { id: 'openapi',   label: 'Import OpenAPI / Swagger Spec',   desc: 'Upload or supply a direct URI to an OpenAPI v3/v2 JSON document.' },
                { id: 'postman',   label: 'Postman Collection',               desc: 'Import endpoints from an exported v2.1 Postman collection.' },
              ].map(opt => {
                const isSelected = inputMode === opt.id
                return (
                  <label
                    key={opt.id}
                    onClick={() => setInputMode(opt.id)}
                    style={{
                      display: 'flex', gap: 12, padding: '14px 16px',
                      background: isSelected ? 'var(--accent-soft)' : 'var(--bg-subtle)',
                      border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 'var(--r-md)', cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <input type="radio" name="inputMode" checked={isSelected} onChange={() => {}} style={{ accentColor: 'var(--accent)', marginTop: 3 }} />
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 650, color: 'var(--text-primary)', marginBottom: 3 }}>{opt.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{opt.desc}</div>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Review your scan parameters before launching the LangGraph multi-agent pipeline:
            </p>
            {[
              { label: 'Target URL',   value: targetUrl || 'https://api.vulnerable.local', mono: true },
              { label: 'Ingest Mode',  value: inputMode.toUpperCase() },
              { label: 'Model Engine', value: 'qwen/qwen3.8-27b:free (Cloud Inference)' },
              { label: 'Safety Scope', value: 'BOLA, Auth Bypass, Mass Assignment, SQLi, XSS' },
            ].map(({ label, value, mono }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-subtle)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', fontFamily: mono ? 'var(--font-mono)' : undefined }}>{value}</span>
              </div>
            ))}
          </div>
        )}
      </Dialog>
    </div>
  )
}
