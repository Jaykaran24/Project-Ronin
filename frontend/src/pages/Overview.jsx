import { useNavigate } from 'react-router-dom'
import { Card, Button, Icon, SeverityBadge, StatusDot, PageHeader, StatStrip } from '../components/ui.jsx'
import { MOCK_SCAN, MOCK_AGENTS, MOCK_FINDINGS, MOCK_ACTIVITY } from '../data/mock.js'

function ActiveScanCard({ scan, onView }) {
  return (
    <Card style={{ padding: '24px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Scan</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 'var(--r-full)', background: 'var(--accent-soft)' }}>
              <StatusDot status="running" pulse />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)' }}>Running</span>
            </div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>{scan.name}</div>
          <div className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{scan.target}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <Button variant="secondary" size="sm" onClick={onView}><Icon name="eye" size={14} /> Live View</Button>
          <Button variant="danger" size="sm"><Icon name="abort" size={14} /> Abort</Button>
        </div>
      </div>

      {/* Phase + progress */}
      <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{scan.phase}</span>
        <span className="num" style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{scan.progress}%</span>
      </div>
      <div style={{ height: 6, background: 'var(--bg-subtle)', borderRadius: 3, overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ width: `${scan.progress}%`, height: '100%', background: 'var(--accent)', borderRadius: 3, transition: 'width 1s ease' }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
          <span className="num" style={{ color: 'var(--text-secondary)' }}>{scan.endpointsTested}</span> / {scan.endpointsTotal} endpoints tested
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Started {scan.startedMinsAgo}m ago</div>
      </div>

      {/* Current activity */}
      <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 'var(--r-sm)', borderLeft: '2px solid var(--border-strong)' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>Current Activity</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>{scan.currentActivity}</div>
        <div className="mono" style={{ fontSize: 12, color: 'var(--accent)' }}>{scan.currentEndpoint}</div>
      </div>
    </Card>
  )
}

function AgentPipeline({ agents }) {
  const statusStyle = {
    active:    { label: 'Active',    labelColor: 'var(--accent)'  },
    completed: { label: 'Done',      labelColor: 'var(--success)' },
    waiting:   { label: 'Waiting',   labelColor: 'var(--text-muted)' },
    error:     { label: 'Error',     labelColor: 'var(--danger)'  },
  }

  return (
    <Card style={{ padding: '22px 24px' }}>
      <div className="section-label">Agent Pipeline</div>
      <div style={{ display: 'flex', gap: 0, alignItems: 'stretch', overflowX: 'auto', paddingBottom: 4 }}>
        {agents.map((agent, i) => {
          const s = statusStyle[agent.status]
          const isLast = i === agents.length - 1
          return (
            <div key={agent.id} style={{ display: 'flex', alignItems: 'center', flex: '1 0 180px' }}>
              {/* Agent card */}
              <div style={{
                flex: 1, padding: '14px 16px',
                background: agent.status === 'active' ? 'var(--accent-soft)' : 'var(--bg-subtle)',
                border: `1px solid ${agent.status === 'active' ? 'var(--accent-soft-strong)' : 'var(--border)'}`,
                borderRadius: 'var(--r-md)',
                minWidth: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <StatusDot status={agent.status} pulse={agent.status === 'active'} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: s.labelColor, letterSpacing: 0.4 }}>{s.label.toUpperCase()}</span>
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>{agent.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 8 }}>{agent.role}</div>
                <div className="truncate" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{agent.task}</div>
                <div className="mono" style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Icon name="clock" size={11} /> {agent.elapsed}
                </div>
              </div>
              {/* Connector */}
              {!isLast && (
                <div style={{ width: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--border-strong)' }}>
                  <Icon name="chevronRight" size={16} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function ActivityFeed({ items }) {
  const agentColors = {
    Orchestrator: 'var(--accent)',
    Recon:        'var(--sev-low)',
    Exploit:      'var(--sev-high)',
    Validate:     'var(--success)',
  }
  return (
    <Card style={{ padding: '22px 24px', height: '100%' }}>
      <div className="section-label">Recent Activity</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {items.map((item, i) => (
          <div key={i} style={{
            display: 'flex', gap: 14, paddingBottom: 14, marginBottom: 14,
            borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <div style={{ paddingTop: 2, flexShrink: 0 }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%', marginTop: 4,
                background: item.sev ? `var(--sev-${item.sev})` : 'var(--border-strong)',
              }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.time}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: agentColors[item.agent] ?? 'var(--text-muted)', letterSpacing: 0.3 }}>{item.agent}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: item.endpoint ? 3 : 0 }}>{item.event}</div>
              {item.endpoint && <div className="mono truncate" style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{item.endpoint}</div>}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function FindingsPreview({ findings, onViewAll }) {
  const navigate = useNavigate()
  return (
    <Card style={{ padding: '22px 24px', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div className="section-label" style={{ marginBottom: 0 }}>Findings Requiring Attention</div>
        <button onClick={onViewAll} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', fontSize: 12, fontWeight: 600, color: 'var(--accent)', cursor: 'pointer', padding: 0 }}>
          View all <Icon name="arrowRight" size={12} />
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {findings.filter(f => f.severity === 'critical' || f.severity === 'high').map((f, i, arr) => (
          <button
            key={f.id}
            onClick={() => navigate('/dashboard/findings')}
            className="table-row"
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '11px 4px',
              borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
              borderRadius: 'var(--r-sm)',
            }}
          >
            <div style={{ width: 3, height: 36, borderRadius: 2, background: `var(--sev-${f.severity})`, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>{f.title}</div>
              <div className="mono truncate" style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{f.method} {f.endpoint}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
              <SeverityBadge level={f.severity} />
              <span className="num" style={{ fontSize: 11, color: 'var(--text-muted)' }}>CVSS {f.cvss}</span>
            </div>
          </button>
        ))}
      </div>
    </Card>
  )
}

export default function Overview() {
  const navigate = useNavigate()
  const criticalCount = MOCK_FINDINGS.filter(f => f.severity === 'critical').length

  return (
    <div className="page">
      <PageHeader
        title="Security Overview"
        subtitle="Monitor your API attack surface and validated findings."
        actions={<>
          <Button variant="primary" size="md" onClick={() => navigate('/dashboard/scans')}>
            <Icon name="launch" size={15} /> Launch Scan
          </Button>
          <Button variant="secondary" size="md">
            <Icon name="plus" size={15} /> Import Collection
          </Button>
        </>}
      />

      {/* KPI strip */}
      <div style={{ marginBottom: 24 }}>
        <StatStrip items={[
          { label: 'Endpoints Mapped', value: '38', sub: '+38 this scan' },
          { label: 'Verified Findings', value: '5', sub: '+5 this scan', accent: 'var(--sev-high)' },
          { label: 'Critical Findings', value: criticalCount, sub: 'Requires immediate review', accent: 'var(--sev-critical)' },
          { label: 'Validation Rate', value: '100%', sub: '0 false positives', accent: 'var(--success)' },
        ]} />
      </div>

      {/* Active Scan Hero */}
      <div style={{ marginBottom: 24 }}>
        <ActiveScanCard scan={MOCK_SCAN} onView={() => navigate('/dashboard/scans')} />
      </div>

      {/* Agent Pipeline */}
      <div style={{ marginBottom: 24 }}>
        <AgentPipeline agents={MOCK_AGENTS} />
      </div>

      {/* Lower two-col grid */}
      <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <ActivityFeed items={MOCK_ACTIVITY} />
        <FindingsPreview findings={MOCK_FINDINGS} onViewAll={() => navigate('/dashboard/findings')} />
      </div>
    </div>
  )
}
