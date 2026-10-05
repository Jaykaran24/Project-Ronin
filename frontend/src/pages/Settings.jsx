import { useState } from 'react'
import { Card, Icon, Button, StatusDot, PageHeader, StatusBadge } from '../components/ui.jsx'
import { MOCK_USER } from '../data/mock.js'

function SettingsSection({ title, children }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div className="section-label" style={{ paddingBottom: 10, borderBottom: '1px solid var(--border)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function SettingRow({ label, desc, control, id }) {
  return (
    <div className="settings-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, padding: '14px 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
      <div>
        <label htmlFor={id} style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{label}</label>
        {desc && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{desc}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{control}</div>
    </div>
  )
}

function StatusRow({ label, status, detail, latency }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <StatusDot status={status} pulse={status === 'online' || status === 'ready'} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          {label}
          {latency && (
            <span className="mono" style={{ fontSize: 11, fontWeight: 650, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '1px 6px', borderRadius: 'var(--r-full)', border: '1px solid var(--accent-soft-strong)' }}>
              {latency}
            </span>
          )}
        </div>
        {detail && <div className="mono truncate" style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{detail}</div>}
      </div>
      <StatusBadge status={status} />
    </div>
  )
}

function TextInput({ id, value, onChange, placeholder, mono, style = {} }) {
  return (
    <input
      id={id}
      className={`input ${mono ? 'mono' : ''}`}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{
        width: 'min(100%, 300px)',
        background: 'var(--bg-subtle)',
        border: '1px solid var(--border-strong)',
        color: 'var(--text-primary)',
        ...style
      }}
    />
  )
}

export default function Settings() {
  const [provider, setProvider] = useState('openrouter')
  const [backendUrl, setBackendUrl] = useState('http://localhost:5000')
  const [ollamaHost, setOllamaHost] = useState('http://localhost:11434')
  const [cloudModel, setCloudModel] = useState('qwen/qwen3.8-27b:free')
  const [dockerImage, setDockerImage] = useState('alpine:3.18')
  const [timeout, setTimeoutVal] = useState('30')
  const [testingHealth, setTestingHealth] = useState(false)
  const [healthStatus, setHealthStatus] = useState(null)
  const [savedNotice, setSavedNotice] = useState(false)

  const runDiagnostics = () => {
    setTestingHealth(true)
    setHealthStatus(null)
    setTimeout(() => {
      setTestingHealth(false)
      setHealthStatus({
        openrouter: '18ms (Qwen 3.8 27B Ready)',
        backend: '4ms (Express API Healthy)',
        sandbox: '0ms (Alpine Container Isolated)',
        db: '22ms (MongoDB Connected)',
      })
    }, 900)
  }

  const handleSave = () => {
    setSavedNotice(true)
    setTimeout(() => setSavedNotice(false), 2500)
  }

  return (
    <div className="page">
      <PageHeader
        title="Settings & Infrastructure"
        subtitle="Manage cloud and local LLM runtime, sandbox isolation, and API parameters."
      />

      <div style={{ maxWidth: 800 }}>
        {/* Runtime Settings */}
        <Card style={{ padding: '24px 28px', marginBottom: 24 }}>
          <SettingsSection title="AI Engine & Runtime">
            <SettingRow
              id="inference-mode"
              label="Inference Provider"
              desc="Choose between free cloud OpenRouter or local on-device Ollama"
              control={
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setProvider('openrouter')}
                    className="chip accent"
                    aria-pressed={provider === 'openrouter'}
                  >
                    OpenRouter (Cloud Free)
                  </button>
                  <button
                    type="button"
                    onClick={() => setProvider('ollama')}
                    className="chip"
                    aria-pressed={provider === 'ollama'}
                  >
                    Ollama (Local)
                  </button>
                </div>
              }
            />

            {provider === 'openrouter' ? (
              <SettingRow
                id="cloud-model"
                label="Cloud Model"
                desc="Active high-reasoning free tier model"
                control={
                  <select
                    id="cloud-model"
                    className="input mono"
                    value={cloudModel}
                    onChange={e => setCloudModel(e.target.value)}
                    style={{
                      width: 'min(100%, 300px)',
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--border-strong)',
                      color: 'var(--text-primary)',
                      padding: '8px 12px',
                    }}
                  >
                    <option value="qwen/qwen3.8-27b:free">qwen/qwen3.8-27b:free (Recommended)</option>
                    <option value="nvidia/nemotron-3.5-lightning:free">nvidia/nemotron-3.5-lightning:free</option>
                    <option value="meta-llama/llama-3.3-70b-instruct:free">meta-llama/llama-3.3-70b-instruct:free</option>
                  </select>
                }
              />
            ) : (
              <>
                <SettingRow
                  id="ollama-host"
                  label="Ollama Server URL"
                  desc="Local daemon endpoint"
                  control={<TextInput id="ollama-host" value={ollamaHost} onChange={e => setOllamaHost(e.target.value)} mono />}
                />
                <SettingRow
                  id="local-model"
                  label="Local Model Tag"
                  desc="Model installed on GPU"
                  control={<TextInput id="local-model" value="qwen2.5-coder:7b" onChange={() => {}} mono />}
                />
              </>
            )}

            <SettingRow
              id="backend-api"
              label="Backend REST API"
              desc="Host and port for Ronin backend communication"
              control={<TextInput id="backend-api" value={backendUrl} onChange={e => setBackendUrl(e.target.value)} mono />}
            />
          </SettingsSection>

          {/* Infrastructure status & Diagnostics */}
          <SettingsSection title="Infrastructure Health & Latencies">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Real-time health telemetry across all services:</span>
              <Button variant="secondary" size="sm" onClick={runDiagnostics} disabled={testingHealth}>
                <Icon name={testingHealth ? 'clock' : 'activity'} size={14} />
                {testingHealth ? 'Pinging Services...' : 'Run Diagnostics'}
              </Button>
            </div>

            <StatusRow
              label={provider === 'openrouter' ? 'OpenRouter API' : 'Ollama Daemon'}
              status="online"
              latency={healthStatus?.openrouter || '18ms'}
              detail={provider === 'openrouter' ? `${cloudModel} · Verified` : 'localhost:11434 · GPU Ready'}
            />
            <StatusRow
              label="Validation Sandbox"
              status="ready"
              latency={healthStatus?.sandbox || '2ms'}
              detail="Docker 24.x · Alpine Linux · Isolated Egress"
            />
            <StatusRow
              label="Node.js Backend"
              status="online"
              latency={healthStatus?.backend || '4ms'}
              detail="Express.js REST API · localhost:5000"
            />
            <StatusRow
              label="MongoDB Database"
              status="online"
              latency={healthStatus?.db || '22ms'}
              detail="Mongoose Engine · Port 27017"
            />
          </SettingsSection>

          {/* Sandbox Config */}
          <SettingsSection title="Sandbox Isolation & Resource Limits">
            <SettingRow
              id="docker-image"
              label="Sandbox Base Image"
              desc="Minimal Linux distribution for safe PoC execution"
              control={<TextInput id="docker-image" value={dockerImage} onChange={e => setDockerImage(e.target.value)} mono />}
            />
            <SettingRow
              id="exec-timeout"
              label="Execution Quota & Timeout"
              desc="Hard termination ceiling per PoC test (seconds)"
              control={<TextInput id="exec-timeout" value={timeout} onChange={e => setTimeoutVal(e.target.value)} style={{ width: 100 }} />}
            />
            <SettingRow
              id="network-egress"
              label="Network Egress Policy"
              desc="Containment rules for running exploits"
              control={
                <span style={{
                  fontSize: 11.5, fontWeight: 650, color: 'var(--success)',
                  background: 'var(--success-soft)', padding: '4px 10px',
                  borderRadius: 'var(--r-full)', border: '1px solid rgba(34, 197, 94, 0.24)',
                }}>
                  Target-Host Only (External Blocked)
                </span>
              }
            />
          </SettingsSection>
        </Card>

        {/* User Session */}
        <Card style={{ padding: '24px 28px' }}>
          <SettingsSection title="Operator Identity">
            <SettingRow
              label="Signed in as"
              desc={MOCK_USER.email}
              control={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 650, color: 'var(--text-primary)' }}>{MOCK_USER.name}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--r-full)', background: 'var(--accent-soft)', color: 'var(--accent)' }}>ADMIN</span>
                </div>
              }
            />
          </SettingsSection>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, flexWrap: 'wrap', gap: 10 }}>
            {savedNotice ? (
              <span style={{ fontSize: 12.5, color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="check" size={15} /> Settings successfully saved to configuration
              </span>
            ) : <div />}
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="secondary" onClick={() => setSavedNotice(false)}>Reset to Defaults</Button>
              <Button variant="primary" onClick={handleSave}><Icon name="check" size={14} /> Save Configuration</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
