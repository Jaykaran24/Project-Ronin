import { useState } from 'react'
import { MethodBadge, PageHeader, StatStrip, SearchInput, Segmented, Card, Icon, Button, Drawer } from '../components/ui.jsx'
import { useApi } from '../hooks/useApi.js'
import { getEndpoints, probeEndpoint, getScans } from '../services/api.js'

const METHODS = [
  { value: 'ALL', label: 'ALL' },
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'PATCH', label: 'PATCH' },
  { value: 'DELETE', label: 'DELETE' },
]

const STATUS_FILTERS = [
  { value: 'all', label: 'All Status' },
  { value: 'tested', label: 'Tested' },
  { value: 'untested', label: 'Untested' },
  { value: 'vulnerable', label: 'Vulnerable' },
]

export default function Endpoints() {
  const [method, setMethod] = useState('ALL')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [selectedScan, setSelectedScan] = useState('ALL')
  const [viewMode, setViewMode] = useState('grouped') // grouped | flat
  const [selectedEndpoint, setSelectedEndpoint] = useState(null)
  const [scanningId, setScanningId] = useState(null)

  const { data: rawEndpoints, loading } = useApi(getEndpoints)
  const { data: rawScans } = useApi(getScans)

  const endpoints = (rawEndpoints || []).map(e => ({
    id: e.endpointId || e.id || e._id,
    scanId: e.scanId,
    method: e.method || 'GET',
    path: e.path,
    auth: e.auth || 'None',
    tested: !!e.tested,
    findings: e.findings || 0,
    parameters: e.parameters || [],
    riskScore: e.riskScore || 0,
    tags: e.tags || [],
    group: e.group || '/' + (e.path || '').split('/').filter(Boolean).slice(0, 2).join('/') || '/',
  }))

  const filtered = endpoints.filter(e => {
    const matchScan = selectedScan === 'ALL' || e.scanId === selectedScan
    const matchM = method === 'ALL' || e.method === method
    const q = search.toLowerCase()
    const matchQ = !q || e.path.toLowerCase().includes(q)
    const matchF = filter === 'all' || (filter === 'tested' && e.tested) || (filter === 'untested' && !e.tested) || (filter === 'vulnerable' && e.findings > 0)
    return matchScan && matchM && matchQ && matchF
  })

  // Group endpoints by route prefix
  const groups = {}
  filtered.forEach(e => {
    const g = e.group || e.path.split('/').slice(0, 4).join('/')
    if (!groups[g]) groups[g] = []
    groups[g].push(e)
  })

  const testedCount = endpoints.filter(e => e.tested).length
  const vulnerableCount = endpoints.filter(e => e.findings > 0).length
  const totalCount = endpoints.length
  const coveragePct = totalCount > 0 ? Math.round((testedCount / totalCount) * 100) : 0

  const handleTargetedScan = async (e, endpoint) => {
    e.stopPropagation()
    setScanningId(endpoint.id)
    try {
      await probeEndpoint(endpoint.id)
    } catch (err) {
      console.error('Probe failed:', err)
    } finally {
      setTimeout(() => setScanningId(null), 1800)
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Endpoints & Attack Surface"
        subtitle={`Explored API surface — ${totalCount} endpoints mapped by Recon Agent.${loading ? ' (Refreshing...)' : ''}`}
      />

      {/* Surface stats */}
      <div style={{ marginBottom: 20 }}>
        <StatStrip items={[
          { label: 'Total Endpoints', value: totalCount },
          { label: 'Tested', value: testedCount, accent: 'var(--success)' },
          { label: 'Untested', value: totalCount - testedCount },
          { label: 'Vulnerable', value: vulnerableCount, accent: 'var(--sev-high)' },
          { label: 'Surface Coverage', value: `${coveragePct}%`, accent: 'var(--success)' },
        ]} />
      </div>

      {/* Controls & Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', flex: '1 1 240px', minWidth: 0 }}>
          <div style={{ flex: '1 1 220px', minWidth: 180 }}>
            <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Search path, params, or resource..." label="Filter endpoints" />
          </div>
          {rawScans && rawScans.length > 0 && (
            <select
              value={selectedScan}
              onChange={e => setSelectedScan(e.target.value)}
              className="input"
              style={{ width: 'auto', minWidth: 160, padding: '7px 12px', fontSize: 12, background: 'var(--bg-subtle)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}
              aria-label="Filter by scan"
            >
              <option value="ALL">All Scans ({endpoints.length} routes)</option>
              {rawScans.map(s => (
                <option key={s.scanId || s.id} value={s.scanId || s.id}>
                  {(s.name || s.target || s.scanId)}
                </option>
              ))}
            </select>
          )}
          <Segmented options={METHODS} value={method} onChange={setMethod} />
          <Segmented options={STATUS_FILTERS} value={filter} onChange={setFilter} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            onClick={() => setViewMode('grouped')}
            className="chip"
            aria-pressed={viewMode === 'grouped'}
          >
            Resource Accordion
          </button>
          <button
            onClick={() => setViewMode('flat')}
            className="chip"
            aria-pressed={viewMode === 'flat'}
          >
            Flat List
          </button>
        </div>
      </div>

      {/* Endpoints Table / Group Accordion */}
      {filtered.length === 0 ? (
        <Card style={{ padding: '44px 24px', textAlign: 'center' }}>
          <Icon name="endpoints" size={32} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
          <div style={{ fontSize: 16, fontWeight: 650, color: 'var(--text-primary)', marginBottom: 4 }}>No Endpoints Matching Filter</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 460, margin: '0 auto' }}>
            {endpoints.length === 0
              ? 'No attack surface endpoints mapped yet. Run an automated scan from the Scans page to discover target API routes.'
              : 'Try clearing your search query or selecting a different HTTP method / scan filter.'}
          </div>
        </Card>
      ) : viewMode === 'grouped' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Object.entries(groups).map(([groupName, items]) => (
            <Card key={groupName} style={{ overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="folder" size={15} style={{ color: 'var(--accent)' }} />
                  <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{groupName}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({items.length} endpoint{items.length > 1 ? 's' : ''})</span>
                </div>
                {items.some(i => i.findings > 0) && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sev-high)', background: 'var(--sev-high-soft)', padding: '2px 8px', borderRadius: 'var(--r-full)' }}>
                    {items.reduce((acc, i) => acc + i.findings, 0)} finding(s)
                  </span>
                )}
              </div>

              <div className="table-scroll">
                <div style={{ minWidth: 680 }}>
                  {items.map(e => (
                    <div
                      key={e.id}
                      onClick={() => setSelectedEndpoint(e)}
                      className="table-row"
                      style={{ gridTemplateColumns: '70px 1.4fr 90px 90px 90px 120px', cursor: 'pointer' }}
                    >
                      <div><MethodBadge method={e.method} /></div>
                      <div className="mono truncate" style={{ fontSize: 12.5, fontWeight: e.findings > 0 ? 650 : 500, color: e.findings > 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                        {e.path}
                      </div>
                      <div>
                        <span className="mono" style={{ fontSize: 11.5, color: e.auth === 'None' || e.auth === 'No' ? 'var(--text-muted)' : 'var(--text-secondary)' }}>
                          {e.auth}
                        </span>
                      </div>
                      <div>
                        <span style={{
                          fontSize: 11, fontWeight: 650, padding: '2px 8px', borderRadius: 'var(--r-full)',
                          background: e.tested ? 'var(--success-soft)' : 'var(--bg-subtle)',
                          color: e.tested ? 'var(--success)' : 'var(--text-muted)',
                          border: `1px solid ${e.tested ? 'rgba(34,197,94,0.25)' : 'var(--border)'}`,
                        }}>
                          {e.tested ? 'Tested' : 'Discovered'}
                        </span>
                      </div>
                      <div>
                        {e.findings > 0 ? (
                          <span className="num" style={{ fontSize: 12, fontWeight: 700, color: 'var(--sev-high)' }}>
                            {e.findings} finding{e.findings > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>0</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(evt) => handleTargetedScan(evt, e)}
                        >
                          <Icon name="launch" size={12} />
                          {scanningId === e.id ? 'Probing...' : 'Scan Route'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="table-scroll">
            <div style={{ minWidth: 680 }}>
              <div className="table-head" style={{ gridTemplateColumns: '70px 1.4fr 90px 90px 90px 120px' }}>
                <div>Method</div><div>Path</div><div>Auth</div><div>Status</div><div>Findings</div><div>Action</div>
              </div>
              {filtered.map(e => (
                <div
                  key={e.id}
                  onClick={() => setSelectedEndpoint(e)}
                  className="table-row"
                  style={{ gridTemplateColumns: '70px 1.4fr 90px 90px 90px 120px', cursor: 'pointer' }}
                >
                  <div><MethodBadge method={e.method} /></div>
                  <div className="mono truncate" style={{ fontSize: 12.5, color: 'var(--text-primary)' }}>{e.path}</div>
                  <div className="mono" style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{e.auth}</div>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 650, color: e.tested ? 'var(--success)' : 'var(--text-muted)' }}>
                      {e.tested ? 'Tested' : 'Discovered'}
                    </span>
                  </div>
                  <div className="num" style={{ fontSize: 12, fontWeight: 700, color: e.findings > 0 ? 'var(--sev-high)' : 'var(--text-muted)' }}>
                    {e.findings}
                  </div>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <Button variant="secondary" size="sm" onClick={(evt) => handleTargetedScan(evt, e)}>
                      <Icon name="launch" size={12} /> {scanningId === e.id ? 'Probing...' : 'Scan Route'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Schema Drill-Down Drawer */}
      <Drawer open={!!selectedEndpoint} onClose={() => setSelectedEndpoint(null)} labelledBy="endpoint-schema-title" width="min(540px, 92vw)">
        {selectedEndpoint && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <MethodBadge method={selectedEndpoint.method} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '2px 8px', borderRadius: 'var(--r-full)' }}>
                    {selectedEndpoint.id}
                  </span>
                </div>
                <h2 id="endpoint-schema-title" className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  {selectedEndpoint.path}
                </h2>
              </div>
              <button
                onClick={() => setSelectedEndpoint(null)}
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: 6, cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                <div><span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Authentication:</span> <span className="mono" style={{ fontSize: 12, fontWeight: 600 }}>{selectedEndpoint.auth}</span></div>
                <div><span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Identified Flaws:</span> <span style={{ fontSize: 12, fontWeight: 700, color: selectedEndpoint.findings > 0 ? 'var(--sev-high)' : 'var(--success)' }}>{selectedEndpoint.findings}</span></div>
              </div>

              {/* Parameters Schema List */}
              <div style={{ padding: '16px 18px', background: 'var(--bg-subtle)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                <div className="section-label" style={{ marginBottom: 12 }}>
                  <Icon name="code" size={13} style={{ color: 'var(--accent)' }} /> Parameter Specifications (Recon Parsed)
                </div>

                {selectedEndpoint.parameters && selectedEndpoint.parameters.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedEndpoint.parameters.map((p) => (
                      <div key={p.name} style={{ padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span className="mono" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>{p.name}</span>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: 'var(--bg-subtle)', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                              {p.in}
                            </span>
                            <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: p.required ? 'var(--danger-soft)' : 'var(--bg-subtle)', color: p.required ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 700 }}>
                              {p.required ? 'Required' : 'Optional'}
                            </span>
                          </div>
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{p.desc}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No request parameters required for this endpoint.</div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                <Button variant="primary" onClick={(evt) => handleTargetedScan(evt, selectedEndpoint)}>
                  <Icon name="launch" size={14} /> Launch Targeted Probe on Route
                </Button>
              </div>
            </div>
          </>
        )}
      </Drawer>
    </div>
  )
}
