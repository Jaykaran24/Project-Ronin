import { useState } from 'react'
import { Card, Icon, StatusDot, PageHeader, Drawer } from '../components/ui.jsx'
import { MOCK_AGENTS } from '../data/mock.js'

const FLOW_NODES = [
  { id: 'start',         label: 'START',        type: 'terminal' },
  { id: 'orchestrator',  label: 'Orchestrator', type: 'agent',   status: 'completed', decision: 'Analyzed target OpenAPI spec and dispatched Recon probe tasks.' },
  { id: 'recon',         label: 'Recon',        type: 'agent',   status: 'completed', decision: 'Discovered 38 endpoints, scored 5 endpoints as high risk (BOLA / Auth).' },
  { id: 'exploit',       label: 'Exploit',      type: 'agent',   status: 'active',    decision: 'Synthesizing BOLA tampering vector for /api/v1/users/{id}. Active test running.' },
  { id: 'validate',      label: 'Validation',   type: 'agent',   status: 'waiting',   decision: 'Awaiting exploit HTTP response to replay in Alpine Linux sandbox container.' },
  { id: 'report',        label: 'REPORT',       type: 'terminal' },
]

function FlowNode({ node, selected, onClick }) {
  const isTerminal = node.type === 'terminal'
  const statusColors = {
    active:    { border: 'var(--accent)', bg: 'var(--accent-soft)', text: 'var(--accent)', glow: '0 0 16px -2px var(--accent-glow)' },
    completed: { border: 'rgba(34, 197, 94, 0.35)', bg: 'var(--success-soft)', text: 'var(--success)', glow: 'none' },
    waiting:   { border: 'var(--border)', bg: 'var(--bg-subtle)', text: 'var(--text-muted)', glow: 'none' },
  }
  const c = isTerminal
    ? { border: 'var(--border)', bg: 'var(--bg-subtle)', text: 'var(--text-muted)', glow: 'none' }
    : (statusColors[node.status] ?? statusColors.waiting)
  const isSelected = selected?.id === node.id

  const commonStyle = {
    padding: isTerminal ? '8px 18px' : '16px 20px',
    borderRadius: isTerminal ? 'var(--r-full)' : 'var(--r-lg)',
    border: `1px solid ${isSelected ? 'var(--accent)' : c.border}`,
    background: isSelected ? 'var(--accent-soft-strong)' : c.bg,
    boxShadow: isSelected ? '0 0 20px var(--accent-glow)' : c.glow,
    textAlign: 'center',
    minWidth: isTerminal ? 80 : 124,
    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
    flexShrink: 0,
  }

  if (isTerminal) {
    return (
      <div style={commonStyle}>
        <div className="mono" style={{ fontSize: 11, fontWeight: 700, color: c.text, letterSpacing: '1.2px' }}>{node.label}</div>
      </div>
    )
  }

  return (
    <button onClick={() => onClick(node)} style={{ ...commonStyle, cursor: 'pointer', font: 'inherit' }}>
      {node.status && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
          <StatusDot status={node.status} pulse={node.status === 'active'} />
          <span style={{ fontSize: 10, fontWeight: 750, color: c.text, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
            {node.status}
          </span>
        </div>
      )}
      <div style={{ fontSize: 13.5, fontWeight: 650, color: 'var(--text-primary)' }}>{node.label}</div>
    </button>
  )
}

export default function AgentGraph() {
  const [selected, setSelected] = useState(null)
  const agentDetail = selected ? (MOCK_AGENTS.find(a => a.name === selected.label || a.id === selected.id) || selected) : null

  return (
    <div className="page">
      <PageHeader
        title="Agent Graph & State Machine"
        subtitle="LangGraph multi-agent execution topology, cyclic feedback loops & live LLM decision trees."
      />

      <div>
        {/* Flow Canvas */}
        <Card style={{ padding: '36px 32px', minWidth: 0, overflow: 'hidden' }}>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div className="section-label" style={{ marginBottom: 0 }}>
              <Icon name="radar" size={13} style={{ color: 'var(--accent)' }} /> LangGraph Execution Cycle
            </div>
            <span style={{ fontSize: 11.5, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '2px 10px', borderRadius: 'var(--r-full)', border: '1px solid var(--accent-soft-strong)' }}>
              Feedback Loop: Exploit ⇄ Sandbox Validation
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', gap: 0, overflowX: 'auto', paddingBottom: 16, paddingTop: 8 }}>
            {FLOW_NODES.map((node, i) => (
              <div key={node.id} style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                <FlowNode node={node} selected={selected} onClick={setSelected} />
                {i < FLOW_NODES.length - 1 && (
                  <div style={{ width: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'center' }}>
                      <div style={{ width: 22, height: 1, background: 'var(--border-strong)' }} />
                      <Icon name="chevronRight" size={14} style={{ color: 'var(--border-strong)', marginLeft: -4 }} />
                    </div>
                    {/* Show cycle label between Exploit and Validate */}
                    {node.id === 'exploit' && (
                      <span className="mono" style={{ fontSize: 9, color: 'var(--accent)', fontWeight: 700, marginTop: 4 }}>
                        ⇄ RETRY
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Active Agent Telemetry Grid */}
          <div style={{ marginTop: 36 }}>
            <div className="section-label">
              <Icon name="activity" size={13} style={{ color: 'var(--accent)' }} /> Agent Node Decision Trees
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              {MOCK_AGENTS.map(a => {
                const isSelected = selected?.id === a.id || selected?.label === a.name
                const isActive = a.status === 'active'
                return (
                  <button
                    key={a.id}
                    onClick={() => setSelected({ id: a.id, label: a.name, role: a.role, task: a.task, status: a.status, elapsed: a.elapsed, decision: a.metrics?.speed ? `${a.metrics.speed} inference token rate via ${a.metrics.provider}` : 'Task queued.' })}
                    style={{
                      textAlign: 'left', font: 'inherit',
                      padding: '16px 18px',
                      background: isSelected ? 'var(--accent-soft)' : 'var(--bg-surface)',
                      border: `1px solid ${isSelected ? 'var(--accent)' : isActive ? 'var(--border-strong)' : 'var(--border)'}`,
                      boxShadow: isActive ? '0 0 14px -3px var(--accent-glow)' : 'var(--shadow-sm)',
                      borderRadius: 'var(--r-lg)',
                      cursor: 'pointer',
                      transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <StatusDot status={a.status} pulse={isActive} />
                        <span style={{ fontSize: 13.5, fontWeight: 650, color: 'var(--text-primary)' }}>{a.name}</span>
                      </div>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: isActive ? 'var(--accent)' : 'var(--text-muted)', textTransform: 'uppercase' }}>
                        {a.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 500 }}>{a.role}</div>
                    <div className="truncate" style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 10 }}>{a.task}</div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Icon name="clock" size={12} /> {a.elapsed}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* Detail panel Drawer with Decision Tree & Prompts */}
      <Drawer open={!!selected} onClose={() => setSelected(null)} width="min(460px, 92vw)" labelledBy="agent-detail-title">
        {selected && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>LangGraph Node Context</div>
                <h2 id="agent-detail-title" style={{ fontSize: 20, fontWeight: 650, color: 'var(--text-primary)', margin: '4px 0 0', letterSpacing: '-0.3px' }}>
                  {selected.label || selected.name} Agent
                </h2>
              </div>
              <button
                onClick={() => setSelected(null)}
                aria-label="Close details"
                style={{
                  background: 'var(--bg-subtle)', border: '1px solid var(--border)',
                  borderRadius: 'var(--r-sm)', color: 'var(--text-muted)',
                  cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <Icon name="close" size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Agent Decision Summary */}
              <div style={{ padding: '14px 16px', background: 'var(--bg-subtle)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                <div className="section-label" style={{ marginBottom: 6 }}>LLM Turn Decision & Reasoning</div>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                  {selected.decision || 'The Orchestrator assigned execution priority based on heuristic risk scoring of OpenAPI parameters.'}
                </p>
              </div>

              {/* System Prompt Context */}
              <div style={{ padding: '14px 16px', background: 'var(--bg-subtle)', borderRadius: 'var(--r-md)', border: '1px solid var(--border)' }}>
                <div className="section-label" style={{ marginBottom: 6 }}>System Prompt Context</div>
                <pre className="mono" style={{ margin: 0, padding: '10px 12px', background: 'var(--bg-canvas)', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-sm)', fontSize: 11, lineHeight: 1.6, color: 'var(--text-secondary)', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
{`You are the Ronin ${selected.label || selected.name} Agent.
Your objective: Safely analyze API routes for authorization and input flaws.
Output schema: Strictly validated Pydantic model with reproducible evidence.`}
                </pre>
              </div>

              {/* Live Logs */}
              <div style={{
                padding: '14px 16px',
                background: 'var(--bg-canvas)',
                borderRadius: 'var(--r-md)',
                border: '1px solid var(--border-strong)',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)',
              }}>
                <div style={{ fontSize: 10.5, color: 'var(--accent)', fontWeight: 750, marginBottom: 8, letterSpacing: '0.6px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
                  Node Execution Stream
                </div>
                {['→ Parameter extraction complete for /api/v1/users/{id}', '→ Routing state transition: Exploit -> Validation', '→ Verified response code 200 matches vulnerability predicate'].map((log, i) => (
                  <div key={i} className="mono" style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginBottom: 5, lineHeight: 1.6 }}>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </Drawer>
    </div>
  )
}
