import { useState } from 'react'
import { MethodBadge, PageHeader, StatStrip, SearchInput, Segmented, Card } from '../components/ui.jsx'
import { MOCK_ENDPOINTS } from '../data/mock.js'

const METHODS = [
  { value: 'ALL', label: 'ALL' },
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'PATCH', label: 'PATCH' },
  { value: 'DELETE', label: 'DELETE' },
]

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'tested', label: 'Tested' },
  { value: 'untested', label: 'Untested' },
  { value: 'vulnerable', label: 'Vulnerable' },
]

export default function Endpoints() {
  const [method, setMethod] = useState('ALL')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // all | tested | untested | vulnerable

  const filtered = MOCK_ENDPOINTS.filter(e => {
    const matchM = method === 'ALL' || e.method === method
    const q = search.toLowerCase()
    const matchQ = !q || e.path.toLowerCase().includes(q)
    const matchF = filter === 'all' || (filter === 'tested' && e.tested) || (filter === 'untested' && !e.tested) || (filter === 'vulnerable' && e.findings > 0)
    return matchM && matchQ && matchF
  })

  const testedCount = MOCK_ENDPOINTS.filter(e => e.tested).length
  const vulnerableCount = MOCK_ENDPOINTS.filter(e => e.findings > 0).length
  const coveragePct = Math.round((testedCount / MOCK_ENDPOINTS.length) * 100)

  return (
    <div className="page">
      <PageHeader
        title="Endpoints"
        subtitle={`API attack surface — ${MOCK_ENDPOINTS.length} endpoints discovered.`}
      />

      {/* Surface stats */}
      <div style={{ marginBottom: 20 }}>
        <StatStrip items={[
          { label: 'Total', value: MOCK_ENDPOINTS.length },
          { label: 'Tested', value: testedCount, accent: 'var(--success)' },
          { label: 'Untested', value: MOCK_ENDPOINTS.length - testedCount },
          { label: 'Vulnerable', value: vulnerableCount, accent: 'var(--sev-high)' },
          { label: 'Coverage', value: `${coveragePct}%`, accent: 'var(--success)' },
        ]} />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <SearchInput value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter by path..." label="Filter endpoints by path" />
        <Segmented options={METHODS} value={method} onChange={setMethod} />
        <Segmented options={STATUS_FILTERS} value={filter} onChange={setFilter} />
      </div>

      {/* Endpoints table */}
      <Card>
        <div className="table-scroll">
          <div style={{ minWidth: 640 }}>
            <div className="table-head" style={{ gridTemplateColumns: '80px 1fr 100px 90px 80px' }}>
              <div>Method</div><div>Path</div><div>Auth</div><div>Status</div><div>Findings</div>
            </div>
            {filtered.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>No endpoints match your filters.</div>
            )}
            {filtered.map(e => (
              <div key={e.id} className="table-row" style={{ gridTemplateColumns: '80px 1fr 100px 90px 80px', cursor: 'default' }}>
                <div><MethodBadge method={e.method} /></div>
                <div className="mono" style={{ fontSize: 13, color: e.findings > 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{e.path}</div>
                <div>
                  <span style={{ fontSize: 11.5, color: e.auth === 'None' ? 'var(--text-muted)' : 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontWeight: e.auth !== 'None' ? 500 : 400 }}>
                    {e.auth}
                  </span>
                </div>
                <div>
                  {e.tested ? (
                    <span style={{ fontSize: 11.5, color: 'var(--success)', fontWeight: 600 }}>Tested</span>
                  ) : (
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Pending</span>
                  )}
                </div>
                <div>
                  {e.findings > 0 ? (
                    <span className="num" style={{ fontSize: 12, fontWeight: 700, color: 'var(--sev-high)' }}>{e.findings} finding{e.findings > 1 ? 's' : ''}</span>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}
