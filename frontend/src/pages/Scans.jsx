import { useState, useEffect } from 'react'
import { Card, Button, Icon, StatusDot, StatusBadge, PageHeader, Dialog, Drawer, MethodBadge, SearchInput, Segmented } from '../components/ui.jsx'
import { useApi } from '../hooks/useApi.js'
import { getScans, getActiveScan, createScan, updateScanStatus, getEndpoints, probeEndpoint } from '../services/api.js'

const STEP_LABELS = ['Target Specification', 'Attack Input Mode', 'Review & Launch']

export default function Scans() {
  const [showLaunch, setShowLaunch] = useState(false)
  const [step, setStep] = useState(1)
  const [targetUrl, setTargetUrl] = useState('')
  const [inputMode, setInputMode] = useState('discovery')
  const [launching, setLaunching] = useState(false)

  // Discovered endpoints drawer state
  const [selectedScanEndpoints, setSelectedScanEndpoints] = useState(null)
  const [endpointsList, setEndpointsList] = useState([])
  const [loadingEndpoints, setLoadingEndpoints] = useState(false)
  const [endpointSearch, setEndpointSearch] = useState('')
  const [endpointMethod, setEndpointMethod] = useState('ALL')
  const [probingId, setProbingId] = useState(null)

  const { data: rawScans, loading: loadingScans, refetch: refetchScans } = useApi(getScans)
  const { data: rawActive, refetch: refetchActive } = useApi(getActiveScan)

  const scansList = (rawScans || []).map(s => ({
    id: s.scanId || s.id || s._id,
    name: s.name || `Scan ${s.target}`,
    target: s.target,
    startedAt: s.startedAt ? new Date(s.startedAt).toLocaleString() : 'Recent',
    endpoints: s.endpointsTotal ?? s.endpoints ?? 0,
    endpointsTested: s.endpointsTested ?? 0,
    findings: (s.criticalCount || 0) + (s.highCount || 0) + (s.mediumCount || 0) + (s.lowCount || 0),
    critical: s.criticalCount || 0,
    high: s.highCount || 0,
    medium: s.mediumCount || 0,
    low: s.lowCount || 0,
    validationRate: s.validationRate || '100%',
    status: s.status || 'completed',
    progress: s.progress ?? 100,
    phase: s.phase || 'Completed',
  }))

  const activeScan = (rawActive && rawActive.target) ? {
    id: rawActive.scanId || rawActive.id,
    name: rawActive.name || `Scan ${rawActive.target}`,
    target: rawActive.target,
    status: rawActive.status || 'running',
    progress: rawActive.progress ?? 0,
    endpointsTested: rawActive.endpointsTested ?? 0,
    endpointsTotal: rawActive.endpointsTotal ?? 0,
    critical: rawActive.criticalCount ?? 0,
    phase: rawActive.phase || 'Recon',
  } : (scansList.find(s => s.status === 'running') || scansList[0])

  const agents = [
    { id: 'orchestrator', name: 'Orchestrator', status: activeScan?.status === 'running' ? 'active' : 'completed' },
    { id: 'recon', name: 'Recon', status: ['Recon'].includes(activeScan?.phase) ? 'active' : 'completed' },
    { id: 'exploit', name: 'Exploit', status: ['Exploit', 'Exploitation'].includes(activeScan?.phase) ? 'active' : (activeScan?.status === 'running' && activeScan?.progress < 30 ? 'waiting' : 'completed') },
    { id: 'validate', name: 'Validate', status: ['Validation'].includes(activeScan?.phase) ? 'active' : (activeScan?.status === 'running' && activeScan?.progress < 70 ? 'waiting' : 'completed') },
  ]

  // Live polling & browser console logging of scan progress
  useEffect(() => {
    if (activeScan && activeScan.status === 'running') {
      console.log(`[Ronin Scan Monitor] Initiated real-time telemetry tracking for ${activeScan.id} (${activeScan.target})`);
      const timer = setInterval(async () => {
        try {
          const fresh = await getActiveScan();
          if (fresh) {
            console.log(`[Ronin Scan Progress] ${fresh.scanId || fresh.id} | Phase: ${fresh.phase || 'Recon'} | Progress: ${fresh.progress || 0}% | Tested: ${fresh.endpointsTested || 0}/${fresh.endpointsTotal || 0}`);
            refetchActive();
            refetchScans();
            if (fresh.status === 'completed') {
              console.log(`[Ronin Scan Complete] Report generated & scan completed for ${fresh.scanId || fresh.id}!`);
              clearInterval(timer);
            }
          }
        } catch (err) {
          console.warn('[Ronin Scan Monitor] Poll attempt failed:', err.message);
        }
      }, 2500);

      return () => clearInterval(timer);
    }
  }, [activeScan?.id, activeScan?.status]);

  const openScanEndpoints = async (scan) => {
    if (!scan) return
    setSelectedScanEndpoints(scan)
    setLoadingEndpoints(true)
    setEndpointSearch('')
    setEndpointMethod('ALL')
    try {
      const data = await getEndpoints({ scanId: scan.id })
      setEndpointsList(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load scan endpoints:', err)
      setEndpointsList([])
    } finally {
      setLoadingEndpoints(false)
    }
  }

  const handleProbe = async (epId) => {
    setProbingId(epId)
    try {
      await probeEndpoint(epId)
    } catch (err) {
      console.error('Probe failed:', err)
    } finally {
      setTimeout(() => setProbingId(null), 1500)
    }
  }

  const handleStatusChange = async (newStatus) => {
    if (!activeScan) return
    try {
      await updateScanStatus(activeScan.id, newStatus)
      refetchActive()
      refetchScans()
    } catch (err) {
      console.error('Status update failed:', err)
    }
  }

  const handleLaunchScan = async () => {
    if (!targetUrl) return
    setLaunching(true)
    try {
      await createScan({ target: targetUrl, inputMode })
      setShowLaunch(false)
      setTargetUrl('')
      setStep(1)
      refetchScans()
      refetchActive()
    } catch (err) {
      console.error('Launch failed:', err)
    } finally {
      setLaunching(false)
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Scans"
        subtitle={`Operational scan history, target auditing, and live execution telemetry.${loadingScans ? ' (Refreshing...)' : ''}`}
        actions={
          <Button variant="primary" onClick={() => { setShowLaunch(true); setStep(1) }}>
            <Icon name="launch" size={15} /> Launch Security Scan
          </Button>
        }
      />

      {/* Active scan highlight hero */}
      {activeScan && (
        <Card glow style={{ padding: '22px 26px', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <StatusBadge status={activeScan.status} />
              <div>
                <div style={{ fontSize: 16, fontWeight: 650, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>{activeScan.name}</div>
                <div className="mono" style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{activeScan.id}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ padding: '6px 14px', background: 'var(--bg-subtle)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', textAlign: 'center' }}>
                <div className="num" style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>{activeScan.progress}%</div>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Progress</div>
              </div>
              <div
                onClick={() => openScanEndpoints(activeScan)}
                style={{ padding: '6px 14px', background: 'var(--bg-subtle)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', textAlign: 'center', cursor: 'pointer' }}
                title="Click to view discovered endpoints"
              >
                <div className="num" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{activeScan.endpointsTested}/{activeScan.endpointsTotal}</div>
                <div style={{ fontSize: 10.5, color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                  Endpoints ↗
                </div>
              </div>
              <div style={{ padding: '6px 14px', background: 'var(--bg-subtle)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', textAlign: 'center' }}>
                <div className="num" style={{ fontSize: 18, fontWeight: 700, color: 'var(--sev-critical)' }}>{activeScan.critical}</div>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Critical</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="secondary" size="sm" onClick={() => handleStatusChange('paused')}><Icon name="pause" size={14} /> Pause</Button>
                <Button variant="danger" size="sm" onClick={() => handleStatusChange('aborted')}><Icon name="abort" size={14} /> Abort</Button>
              </div>
            </div>
          </div>

          {/* Mini progress bar */}
          <div style={{ marginTop: 18, height: 5, background: 'var(--bg-subtle)', borderRadius: 'var(--r-full)', overflow: 'hidden' }}>
            <div style={{ width: `${activeScan.progress}%`, height: '100%', background: 'var(--accent)', boxShadow: '0 0 10px var(--accent-glow)', borderRadius: 'var(--r-full)' }} />
          </div>

          {/* Agent pipeline mini */}
          <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
            {agents.map(a => {
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
      )}

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
            {scansList.length === 0 && (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>
                No scan history available yet. Launch your first security scan above!
              </div>
            )}
            {scansList.map(s => (
              <div key={s.id} className="table-row" style={{ gridTemplateColumns: '170px 1.4fr 140px 90px 90px 90px 100px 120px' }}>
                <div className="mono" style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>{String(s.id).replace('SCAN-', '')}</div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</div>
                  <div className="mono truncate" style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{s.target}</div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.startedAt}</div>
                <div>
                  <button
                    type="button"
                    onClick={() => openScanEndpoints(s)}
                    className="chip"
                    style={{ fontSize: 11.5, padding: '2px 9px', borderRadius: 'var(--r-full)' }}
                    title={`View ${s.endpoints} discovered endpoints`}
                  >
                    {s.endpoints} ↗
                  </button>
                </div>
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
            <Button variant="primary" disabled={launching} onClick={() => { if (step < 3) setStep(s => s + 1); else handleLaunchScan(); }}>
              {step === 3 ? (launching ? 'Launching...' : <><Icon name="launch" size={15} /> Start Security Audit</>) : 'Continue'}
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
              placeholder="https://api.yourtarget.com"
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
              { label: 'Target URL',   value: targetUrl || 'No target specified', mono: true },
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

      {/* Discovered Endpoints Drawer */}
      <Drawer
        open={!!selectedScanEndpoints}
        onClose={() => setSelectedScanEndpoints(null)}
        labelledBy="scan-endpoints-title"
        width="min(740px, 94vw)"
      >
        {selectedScanEndpoints && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Attack Surface Recon</span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{selectedScanEndpoints.id}</span>
                </div>
                <h2 id="scan-endpoints-title" style={{ fontSize: 22, fontWeight: 650, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.4px' }}>
                  Discovered Endpoints ({endpointsList.length})
                </h2>
                <div className="mono truncate" style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  {selectedScanEndpoints.target}
                </div>
              </div>
              <button
                onClick={() => setSelectedScanEndpoints(null)}
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

            {/* Filter controls */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <SearchInput
                  value={endpointSearch}
                  onChange={e => setEndpointSearch(e.target.value)}
                  placeholder="Filter paths e.g. /api/users..."
                  label="Search endpoints"
                />
              </div>
              <Segmented
                options={[
                  { value: 'ALL', label: 'ALL' },
                  { value: 'GET', label: 'GET' },
                  { value: 'POST', label: 'POST' },
                  { value: 'PUT', label: 'PUT' },
                  { value: 'DELETE', label: 'DELETE' },
                ]}
                value={endpointMethod}
                onChange={setEndpointMethod}
              />
            </div>

            {/* Endpoints Table */}
            {loadingEndpoints ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Icon name="clock" size={24} style={{ color: 'var(--accent)', marginBottom: 8 }} />
                <div>Fetching attack surface endpoints from MongoDB...</div>
              </div>
            ) : endpointsList.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', background: 'var(--bg-subtle)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)' }}>
                <Icon name="endpoints" size={32} style={{ color: 'var(--text-muted)', marginBottom: 10 }} />
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>No Endpoints Recorded</div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', maxWidth: 440, margin: '0 auto' }}>
                  Zero endpoints mapped for this scan. Active scans dynamically append routes to MongoDB once the Recon agent finishes spidering the target.
                </div>
              </div>
            ) : (
              <div className="table-scroll" style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
                <div style={{ minWidth: 580 }}>
                  <div className="table-head" style={{ gridTemplateColumns: '70px 1fr 90px 80px 100px' }}>
                    <div>Method</div>
                    <div>Endpoint Path</div>
                    <div>Risk Score</div>
                    <div>Auth</div>
                    <div>Action</div>
                  </div>
                  {endpointsList
                    .filter(ep => {
                      const matchM = endpointMethod === 'ALL' || (ep.method || 'GET') === endpointMethod
                      const matchQ = !endpointSearch || (ep.path || '').toLowerCase().includes(endpointSearch.toLowerCase())
                      return matchM && matchQ
                    })
                    .map(ep => (
                      <div
                        key={ep.endpointId || ep._id || ep.path}
                        className="table-row"
                        style={{ gridTemplateColumns: '70px 1fr 90px 80px 100px' }}
                      >
                        <div><MethodBadge method={ep.method || 'GET'} /></div>
                        <div className="mono truncate" style={{ fontSize: 12.5, color: 'var(--text-primary)', fontWeight: 550 }}>
                          {ep.path}
                        </div>
                        <div>
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 'var(--r-sm)',
                            background: (ep.riskScore >= 7) ? 'var(--sev-high-soft)' : (ep.riskScore >= 4) ? 'var(--accent-soft)' : 'var(--bg-subtle)',
                            color: (ep.riskScore >= 7) ? 'var(--sev-high)' : (ep.riskScore >= 4) ? 'var(--accent)' : 'var(--text-muted)',
                            border: `1px solid ${(ep.riskScore >= 7) ? 'rgba(251,146,60,0.3)' : (ep.riskScore >= 4) ? 'var(--accent-soft-strong)' : 'var(--border)'}`,
                          }}>
                            {ep.riskScore || 0}/10
                          </span>
                        </div>
                        <div style={{ fontSize: 11.5, color: ep.auth === 'Yes' ? 'var(--warning)' : 'var(--text-muted)', fontWeight: 600 }}>
                          {ep.auth === 'Yes' ? 'Required' : 'None'}
                        </div>
                        <div>
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={probingId === (ep.endpointId || ep._id)}
                            onClick={() => handleProbe(ep.endpointId || ep._id)}
                            style={{ padding: '4px 8px', fontSize: 11 }}
                          >
                            {probingId === (ep.endpointId || ep._id) ? 'Probing...' : 'Probe'}
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  )
}
