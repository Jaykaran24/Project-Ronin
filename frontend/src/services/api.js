/**
 * frontend/src/services/api.js
 * ─────────────────────────────
 * Centralised HTTP client for all Ronin backend API calls.
 * All components import from here — never fetch() directly.
 */

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api'

export function getAuthHeaders(extraHeaders = {}) {
  const token = localStorage.getItem('roninToken')
  const headers = { 'Content-Type': 'application/json', ...extraHeaders }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

async function _get(path) {
  const headers = getAuthHeaders()
  const res = await fetch(`${BASE}${path}`, { headers })
  if (res.status === 401) {
    localStorage.removeItem('roninToken')
    localStorage.removeItem('roninUser')
    localStorage.removeItem('ronin_active_target')
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('ronin_active_target')) localStorage.removeItem(k)
    })
    window.location.href = '/'
    throw new Error('Unauthorized — session expired')
  }
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`)
  const body = await res.json()
  return body.data !== undefined ? body.data : body
}

// ── Scans ──────────────────────────────────────────────────────────────────
export const getScans        = ()     => _get('/scans')
export const getActiveScan   = ()     => _get('/scans/active')
export const getScanById     = (id)   => _get(`/scans/${id}`)
export const getScanReport   = (id)   => _get(`/scans/${id}/report`)
export const downloadReport  = (id)   => {
  const token = localStorage.getItem('roninToken')
  return `${BASE}/scans/${id}/report?download=true${token ? `&token=${encodeURIComponent(token)}` : ''}`
}
export const createScan      = (data) =>
  fetch(`${BASE}/scans`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  }).then(r => r.json())
export const updateScanStatus = (id, status) =>
  fetch(`${BASE}/scans/${id}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  }).then(r => r.json())

// ── Findings ───────────────────────────────────────────────────────────────
export const getFindings     = (params = {}) => {
  const qs = new URLSearchParams(params).toString()
  return _get(`/findings${qs ? `?${qs}` : ''}`)
}
export const getFindingById  = (id)   => _get(`/findings/${id}`)

// ── Endpoints ──────────────────────────────────────────────────────────────
export const getEndpoints    = (params = {}) => {
  const qs = new URLSearchParams(params).toString()
  return _get(`/endpoints${qs ? `?${qs}` : ''}`)
}
export const probeEndpoint   = (id)   =>
  fetch(`${BASE}/endpoints/${id}/probe`, {
    method: 'POST',
    headers: getAuthHeaders(),
  }).then(r => r.json())

// ── Auth ───────────────────────────────────────────────────────────────────
export const login = (email, password) =>
  fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }).then(r => r.json())

export const signup = (fullName, email, password) =>
  fetch(`${BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName, email, password }),
  }).then(r => r.json())

// ── Sandbox ────────────────────────────────────────────────────────────────
export const getSandboxRuns    = (params = {}) => {
  const qs = new URLSearchParams(params).toString()
  return _get(`/sandbox${qs ? `?${qs}` : ''}`)
}
export const getSandboxRunById = (id) => _get(`/sandbox/${id}`)

// ── Health ─────────────────────────────────────────────────────────────────
export const getSystemHealth   = () => _get('/health')
