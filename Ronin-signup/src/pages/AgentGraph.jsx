import { useState } from 'react'
import { Card, Icon, StatusDot, PageHeader, Drawer } from '../components/ui.jsx'
import { MOCK_AGENTS } from '../data/mock.js'

const FLOW_NODES = [
  { id: 'start',         label: 'START',        type: 'terminal' },
  { id: 'orchestrator',  label: 'Orchestrator', type: 'agent',   status: 'completed' },
  { id: 'recon',         label: 'Recon',        type: 'agent',   status: 'completed' },
  { id: 'orchestrator2', label: 'Orchestrator', type: 'agent',   status: 'completed' },
  { id: 'exploit',       label: 'Exploit',      type: 'agent',   status: 'active'    },
  { id: 'validate',      label: 'Validation',   type: 'agent',   status: 'waiting'   },
  { id: 'report',        label: 'REPORT',       type: 'terminal' },
]

function FlowNode({ node, selected, onClick }) {
  const isTerminal = node.type === 'terminal'
  const statusColors = {
    active:    { border: 'var(--accent)', bg: 'var(--accent-soft)', text: 'var(--accent)' },
    completed: { border: 'rgba(6,118,71,.3)', bg: 'var(--success-soft)', text: 'var(--success)' },
    waiting:   { border: 'var(--border)', bg: 'var(--bg-subtle)', text: 'var(--text-muted)' },
  }
  const c = isTerminal ? { border: 'var(--border)', bg: 'var(--bg-canvas)', text: 'var(--text-muted)' } : (statusColors[node.status] ?? statusColors.waiting)
  const isSelected = selected?.id === node.id

  const commonStyle = {
    padding: isTerminal ? '6px 14px' : '14px 18px',
    borderRadius: isTerminal ? 'var(--r-full)' : 'var(--r-md)',
    border: `1px solid ${isSelected ? 'var(--accent)' : c.border}`,
    background: isSelected ? 'var(--accent-soft-strong)' : c.bg,
    textAlign: 'center',
    minWidth: isTerminal ? 70 : 110,
    transition: 'all .15s',
    flexShrink: 0,
  }

  if (isTerminal) {
    return (
      <div style={commonStyle}>
        <div style={{ fontSize: 11, fontWeight: 600, color: c.text, letterSpacing: 1.2 }}>{node.label}</div>
      </div>
    )
  }

  return (
    <button onClick={() => onClick(node)} style={{ ...commonStyle, cursor: 'pointer', font: 'inherit' }}>
      {node.status && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: 6 }}>
          <StatusDot status={node.status} pulse={node.status === 'active'} />
        </div>
      )}
      <div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{node.label}</div>
    </button>
  )
}

export default function AgentGraph() {
  const [selected, setSelected] = useState(null)
  const agentDetail = selected ? MOCK_AGENTS.find(a => a.name === selected.label || a.id === selected.id) : null

  return (
    <div className="page">
      <PageHeader title="Agent Graph" subtitle="LangGraph workflow — current scan execution state." />

      <div>
        {/* Flow */}
        <Card style={{ padding: '40px 28px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', gap: 0, overflowX: 'auto', paddingBottom: 4 }}>
            {FLOW_NODES.map((node, i) => (
              <div key={node.id} style={{ display: 'flex', alignItems: 'center' }}>
                <FlowNode node={node} selected={selected} onClick={setSelected} />
                {i < FLOW_NODES.length - 1 && (
                  <div style={{ width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div style={{ width: 20, height: 1, background: 'var(--border-strong)' }} />
                    <Icon name="chevronRight" size={14} style={{ color: 'var(--border-strong)', marginLeft: -4 }} />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 40 }}>
            <div className="section-label">Agent Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              {MOCK_AGENTS.map(a => (
                <button
                  key={a.id}
                  onClick={() => setSelected({ id: a.id, label: a.name })}
                  style={{
                    textAlign: 'left', font: 'inherit',
                    padding: '14px 16px',
                    background: selected?.id === a.id ? 'var(--accent-soft)' : 'var(--bg-subtle)',
                    border: `1px solid ${selected?.id === a.id ? 'var(--accent-soft-strong)' : 'var(--border)'}`,
                    borderRadius: 'var(--r-md)', cursor: 'pointer', transition: 'all .15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                    <StatusDot status={a.status} pulse={a.status === 'active'} />
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>{a.name}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 6 }}>{a.role}</div>
                  <div className="truncate" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{a.task}</div>
                  <div className="mono" style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="clock" size={11} /> {a.elapsed}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Detail panel — popup */}
      <Drawer open={!!(selected && agentDetail)} onClose={() => setSelected(null)} width="min(400px, 92vw)" labelledBy="agent-detail-title">
        {agentDetail && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div id="agent-detail-title" style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{agentDetail.name}</div>
              <button onClick={() => setSelected(null)} aria-label="Close agent details" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><Icon name="close" size={18} /></button>
            </div>
            {[
              { label: 'Role',          value: agentDetail.role         },
              { label: 'Status',        value: agentDetail.status,     isStatus: true },
              { label: 'Current Task',  value: agentDetail.task        },
              { label: 'Elapsed',       value: agentDetail.elapsed, mono: true },
            ].map(({ label, value, isStatus, mono }) => (
              <div key={label} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 5 }}>{label}</div>
                {isStatus ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <StatusDot status={value} pulse={value === 'active'} />
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'capitalize' }}>{value}</span>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: mono ? 'var(--font-mono)' : undefined }}>{value}</div>
                )}
              </div>
            ))}
            <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 'var(--r-sm)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8, letterSpacing: 0.5 }}>Recent logs</div>
              {['→ Fetching parameter list for /api/v1/users/{id}', '→ Injecting BOLA payload', '→ Response 200 — data belongs to user_id=2'].map((log, i) => (
                <div key={i} className="mono" style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginBottom: 5, lineHeight: 1.6 }}>{log}</div>
              ))}
            </div>
          </>
        )}
      </Drawer>
    </div>
  )
}
