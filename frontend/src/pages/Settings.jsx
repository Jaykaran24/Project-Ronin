import { useState } from 'react'
import { Card, Icon, Button, StatusDot, PageHeader, StatusBadge } from '../components/ui.jsx'
import { MOCK_USER } from '../data/mock.js'

function SettingsSection({ title, children }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div className="section-label" style={{ paddingBottom: 10, borderBottom: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function SettingRow({ label, desc, control, id }) {
  return (
    <div className="settings-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, padding: '13px 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
      <div>
        <label htmlFor={id} style={{ display: 'block', fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>{label}</label>
        {desc && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{desc}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{control}</div>
    </div>
  )
}

function StatusRow({ label, status, detail }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
      <StatusDot status={status} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)' }}>{label}</div>
        {detail && <div className="mono truncate" style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{detail}</div>}
      </div>
      <StatusBadge status={status} />
    </div>
  )
}

function TextInput({ id, value, placeholder, mono }) {
  const [val, setVal] = useState(value)
  return (
    <input
      id={id}
      className={`input ${mono ? 'mono' : ''}`}
      value={val}
      onChange={e => setVal(e.target.value)}
      placeholder={placeholder}
      style={{ width: 'min(100%, 280px)' }}
    />
  )
}

export default function Settings() {
  return (
    <div className="page">
      <PageHeader title="Settings" subtitle="Configure runtime, infrastructure, and account preferences." />

      <div style={{ maxWidth: 760 }}>
        {/* Runtime */}
        <Card style={{ padding: '24px 26px', marginBottom: 20 }}>
          <SettingsSection title="Runtime">
            <SettingRow
              id="backend-api"
              label="Backend API"
              desc="URL of the Ronin backend service"
              control={<TextInput id="backend-api" value="http://localhost:8000" placeholder="http://localhost:8000" mono />}
            />
            <SettingRow
              id="ollama-host"
              label="Ollama Host"
              desc="Local Ollama inference server"
              control={<TextInput id="ollama-host" value="http://localhost:11434" placeholder="http://localhost:11434" mono />}
            />
            <SettingRow
              id="model"
              label="Model"
              desc="Active LLM for agent reasoning"
              control={<TextInput id="model" value="qwen2.5-coder:14b" placeholder="qwen2.5-coder:14b" mono />}
            />
          </SettingsSection>

          {/* Infrastructure status */}
          <SettingsSection title="Infrastructure Status">
            <StatusRow label="Ollama"   status="online" detail="qwen2.5-coder:14b · localhost:11434" />
            <StatusRow label="Sandbox"  status="ready"  detail="Docker 24.x · Alpine Linux · Isolated" />
            <StatusRow label="Backend"  status="online" detail="Express.js · localhost:8000" />
            <StatusRow label="Database" status="online" detail="MongoDB · localhost:27017" />
          </SettingsSection>

          {/* Sandbox config */}
          <SettingsSection title="Sandbox">
            <SettingRow
              id="docker-image"
              label="Docker Image"
              desc="Container image used for PoC execution"
              control={<TextInput id="docker-image" value="alpine:3.18" placeholder="alpine:3.18" mono />}
            />
            <SettingRow
              id="exec-timeout"
              label="Execution Timeout"
              desc="Maximum time per PoC execution (seconds)"
              control={<TextInput id="exec-timeout" value="30" placeholder="30" />}
            />
          </SettingsSection>
        </Card>

        {/* Session */}
        <Card style={{ padding: '24px 26px' }}>
          <SettingsSection title="Session">
            <SettingRow
              label="Signed in as"
              desc={MOCK_USER.email}
              control={
                <Button variant="ghost" size="sm">
                  <Icon name="signout" size={14} /> Sign out
                </Button>
              }
            />
            <SettingRow
              label="Workspace"
              desc="Local Ronin workspace — all data stays on-device"
              control={<span style={{ fontSize: 12, color: 'var(--text-muted)' }}>local-only</span>}
            />
          </SettingsSection>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8, flexWrap: 'wrap' }}>
            <Button variant="secondary">Reset to defaults</Button>
            <Button variant="primary"><Icon name="check" size={14} /> Save Settings</Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
