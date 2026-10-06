/**
 * backend/src/utils/seedData.js
 * ─────────────────────────────
 * Populates initial seed data into MongoDB for development and dashboard demo.
 */

const Scan = require('../models/Scan');
const Endpoint = require('../models/Endpoint');
const Finding = require('../models/Finding');
const SandboxRun = require('../models/SandboxRun');

const SEED_SCANS = [
  {
    scanId: 'SCAN-20260924-0001',
    target: 'https://api.vulnerable.local',
    name: 'Vulnerable Demo API',
    phase: 'Exploit',
    progress: 68,
    endpointsTested: 26,
    endpointsTotal: 38,
    status: 'running',
    currentActivity: 'Testing BOLA / parameter tampering',
    currentEndpoint: 'GET /api/v1/profile',
    criticalCount: 1,
    highCount: 2,
    mediumCount: 1,
    lowCount: 1,
    validationRate: '100%',
    diff: { newFindings: 3, resolvedFindings: 1, unchangedFindings: 2 },
  },
  {
    scanId: 'SCAN-20260913-0001',
    target: 'https://api.example.com',
    name: 'Example API',
    phase: 'Completed',
    progress: 100,
    endpointsTested: 24,
    endpointsTotal: 24,
    status: 'completed',
    criticalCount: 0,
    highCount: 1,
    mediumCount: 1,
    lowCount: 0,
    validationRate: '100%',
    diff: { newFindings: 0, resolvedFindings: 4, unchangedFindings: 2 },
  },
];

const SEED_FINDINGS = [
  {
    findingId: 'F-001',
    scanId: 'SCAN-20260924-0001',
    severity: 'critical',
    title: 'Broken Object Level Authorization (BOLA)',
    owasp: 'API1:2023',
    endpoint: '/api/v1/users/{id}',
    method: 'GET',
    cvss: 9.1,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:N',
    cvssMetrics: {
      av: 'Network',
      ac: 'Low',
      pr: 'Low (Authenticated)',
      ui: 'None Required',
      scope: 'Unchanged',
      c: 'High (PII Exposure)',
      i: 'High (Account Takeover)',
      a: 'None',
    },
    status: 'verified',
    discoveredAt: '2026-09-24 00:02',
    description: 'Authenticated users can access any user object by manipulating the {id} parameter without object-level ownership checks.',
    narrative: 'During dynamic reconnaissance, the Exploit Agent established a baseline session as User ID 1. When querying /api/v1/users/2 using User 1\'s Bearer token, the server failed to verify tenant boundaries and returned User 2\'s profile including sensitive PII and private API tokens with an HTTP 200 OK.',
    rawRequest: `GET /api/v1/users/2 HTTP/1.1\nHost: api.vulnerable.local\nAuthorization: Bearer <victim_token>\nAccept: application/json`,
    rawResponse: `HTTP/1.1 200 OK\nContent-Type: application/json; charset=utf-8\n\n{"id":2,"name":"Sarah Connor","role":"admin"}`,
    poc: `curl -X GET "https://api.vulnerable.local/api/v1/users/2" \\\n  -H "Authorization: Bearer <victim_token>"`,
    pythonPoc: `import requests\nres = requests.get("https://api.vulnerable.local/api/v1/users/2", headers={"Authorization": "Bearer <victim_token>"})\nprint(res.json())`,
    remediation: 'Enforce object-level authorization checks server-side on every request.',
    remediationCode: `if (sessionUserId !== requestedUserId && req.user.role !== 'admin') {\n  return res.status(403).json({ error: 'Forbidden' });\n}`,
  },
  {
    findingId: 'F-002',
    scanId: 'SCAN-20260924-0001',
    severity: 'high',
    title: 'Broken Authentication — Expired Token Acceptance',
    owasp: 'API2:2023',
    endpoint: '/api/auth/verify',
    method: 'POST',
    cvss: 8.6,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N',
    cvssMetrics: {
      av: 'Network', ac: 'Low', pr: 'None', ui: 'None Required',
      scope: 'Unchanged', c: 'High', i: 'High', a: 'None',
    },
    status: 'verified',
    discoveredAt: '2026-09-24 00:05',
    description: 'Token verification endpoint accepts expired and revoked JWTs without checking the exp claim.',
    narrative: 'The backend verification endpoint decodes JWT payload claims but omits validation of the exp timestamp claim.',
    rawRequest: `POST /api/auth/verify HTTP/1.1\nHost: api.vulnerable.local\nContent-Type: application/json\n\n{"token": "<expired_jwt>"}`,
    rawResponse: `HTTP/1.1 200 OK\nContent-Type: application/json\n\n{"valid": true, "user": {"id": 4, "role": "admin"}}`,
    poc: `curl -X POST "https://api.vulnerable.local/api/auth/verify" \\\n  -H "Content-Type: application/json" \\\n  -d '{"token":"<expired_jwt>"}'`,
    pythonPoc: `import requests\nres = requests.post("https://api.vulnerable.local/api/auth/verify", json={"token": "<expired_jwt>"})\nassert res.status_code == 200`,
    remediation: 'Verify standard claims (exp, nbf, iat) using standard JWT verification libraries with clock tolerance configured.',
    remediationCode: `jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: false });`,
  },
  {
    findingId: 'F-003',
    scanId: 'SCAN-20260924-0001',
    severity: 'high',
    title: 'Mass Assignment — Privilege Escalation via PUT',
    owasp: 'API6:2023',
    endpoint: '/api/v1/profile',
    method: 'PUT',
    cvss: 7.5,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N',
    cvssMetrics: {
      av: 'Network', ac: 'Low', pr: 'Low', ui: 'None Required',
      scope: 'Unchanged', c: 'None', i: 'High (Privilege Escalation)', a: 'None',
    },
    status: 'verified',
    discoveredAt: '2026-09-24 00:09',
    description: 'Profile update endpoint binds all request body fields directly to user model, allowing role escalation.',
    narrative: 'When submitting a user profile update, the API passes req.body directly to the ORM update query without an allowlist.',
    rawRequest: `PUT /api/v1/profile HTTP/1.1\nHost: api.vulnerable.local\nContent-Type: application/json\n\n{"name": "Attacker", "role": "admin"}`,
    rawResponse: `HTTP/1.1 200 OK\nContent-Type: application/json\n\n{"success": true, "user": {"role": "admin"}}`,
    poc: `curl -X PUT "https://api.vulnerable.local/api/v1/profile" \\\n  -H "Authorization: Bearer <token>" \\\n  -d '{"name":"attacker","role":"admin"}'`,
    pythonPoc: `import requests\nres = requests.put("https://api.vulnerable.local/api/v1/profile", headers={"Authorization": "Bearer <token>"}, json={"role": "admin"})\nprint(res.json())`,
    remediation: 'Use an explicit Data Transfer Object (DTO) or field allowlist to restrict modifiable properties.',
    remediationCode: `const { name, bio } = req.body;\nawait User.findByIdAndUpdate(req.user.id, { name, bio });`,
  },
  {
    findingId: 'F-004',
    scanId: 'SCAN-20260924-0001',
    severity: 'medium',
    title: 'Excessive Data Exposure in Order Summaries',
    owasp: 'API3:2023',
    endpoint: '/api/v1/orders',
    method: 'GET',
    cvss: 5.3,
    status: 'verified',
    discoveredAt: '2026-09-24 00:11',
    description: 'Order list response includes internal payment processor tokens and full card BINs not required by client.',
    poc: `curl "https://api.vulnerable.local/api/v1/orders" -H "Authorization: Bearer <token>"`,
    remediation: 'Filter response fields server-side with serializers or projection schemas.',
  },
  {
    findingId: 'F-005',
    scanId: 'SCAN-20260924-0001',
    severity: 'low',
    title: 'Missing Rate Limiting on Authentication Endpoint',
    owasp: 'API4:2023',
    endpoint: '/api/auth/login',
    method: 'POST',
    cvss: 3.7,
    status: 'verified',
    discoveredAt: '2026-09-24 00:13',
    description: 'Login endpoint accepts unlimited authentication attempts with no throttling or lockout.',
    poc: `curl -X POST ".../api/auth/login" -d '{"email":"a@b.com","password":"test"}'`,
    remediation: 'Implement per-IP and per-account rate limiting with exponential backoff.',
  },
];

const SEED_ENDPOINTS = [
  { endpointId: 'E-001', scanId: 'SCAN-20260924-0001', method: 'GET', path: '/api/v1/users', auth: 'Bearer', tested: true, findings: 1, group: '/api/v1/users', parameters: [{ name: 'limit', in: 'query', paramType: 'integer', required: false, desc: 'Pagination limit' }] },
  { endpointId: 'E-002', scanId: 'SCAN-20260924-0001', method: 'GET', path: '/api/v1/users/{id}', auth: 'Bearer', tested: true, findings: 1, group: '/api/v1/users', parameters: [{ name: 'id', in: 'path', paramType: 'string', required: true, desc: 'User ID' }] },
  { endpointId: 'E-003', scanId: 'SCAN-20260924-0001', method: 'POST', path: '/api/v1/users', auth: 'Bearer', tested: true, findings: 0, group: '/api/v1/users', parameters: [{ name: 'email', in: 'body', paramType: 'string', required: true, desc: 'User email' }] },
  { endpointId: 'E-004', scanId: 'SCAN-20260924-0001', method: 'PUT', path: '/api/v1/profile', auth: 'Bearer', tested: true, findings: 1, group: '/api/v1/profile', parameters: [{ name: 'role', in: 'body', paramType: 'string', required: false, desc: 'User role' }] },
  { endpointId: 'E-005', scanId: 'SCAN-20260924-0001', method: 'DELETE', path: '/api/v1/users/{id}', auth: 'Bearer', tested: true, findings: 0, group: '/api/v1/users', parameters: [{ name: 'id', in: 'path', paramType: 'string', required: true, desc: 'User ID' }] },
  { endpointId: 'E-006', scanId: 'SCAN-20260924-0001', method: 'GET', path: '/api/v1/orders', auth: 'Bearer', tested: true, findings: 1, group: '/api/v1/orders' },
  { endpointId: 'E-007', scanId: 'SCAN-20260924-0001', method: 'POST', path: '/api/auth/login', auth: 'None', tested: true, findings: 1, group: '/api/auth' },
  { endpointId: 'E-008', scanId: 'SCAN-20260924-0001', method: 'POST', path: '/api/auth/verify', auth: 'Bearer', tested: true, findings: 1, group: '/api/auth' },
  { endpointId: 'E-009', scanId: 'SCAN-20260924-0001', method: 'POST', path: '/api/auth/refresh', auth: 'Bearer', tested: true, findings: 0, group: '/api/auth' },
  { endpointId: 'E-010', scanId: 'SCAN-20260924-0001', method: 'GET', path: '/api/v1/products', auth: 'None', tested: true, findings: 0, group: '/api/v1/products' },
  { endpointId: 'E-011', scanId: 'SCAN-20260924-0001', method: 'GET', path: '/api/v1/products/{id}', auth: 'None', tested: false, findings: 0, group: '/api/v1/products' },
  { endpointId: 'E-012', scanId: 'SCAN-20260924-0001', method: 'POST', path: '/api/v1/reviews', auth: 'Bearer', tested: false, findings: 0, group: '/api/v1/products' },
];

const SEED_SANDBOX = [
  {
    pocId: 'POC-0003',
    scanId: 'SCAN-20260924-0001',
    finding: 'BOLA /users/{id}',
    result: 'verified',
    duration: '320ms',
    stdout: `[INFO] Initializing Alpine 3.18 container sandbox id=alp_99182\n[INFO] Network egress constrained strictly to 127.0.0.1:5000 (target host)\n[EXEC] Running PoC vector for F-001 (BOLA)...\ncurl -s -X GET "https://api.vulnerable.local/api/v1/users/2" -H "Authorization: Bearer <token>"\n[RECV] Status 200 OK | Body: {"id": 2, "name": "Bob Vance", "role": "admin"}\n[CHECK] Expected 403 Forbidden, received 200 with unauthorized user data.\n[RESULT] VULNERABILITY CONFIRMED REPRODUCIBLE (Exit 0)`,
  },
  {
    pocId: 'POC-0002',
    scanId: 'SCAN-20260924-0001',
    finding: 'Broken Auth /auth/verify',
    result: 'verified',
    duration: '418ms',
    stdout: `[INFO] Initializing Alpine 3.18 container sandbox id=alp_99183\n[EXEC] Running PoC vector for F-002 (Expired Token Verification)...\ncurl -s -X POST "https://api.vulnerable.local/api/auth/verify" -d '{"token":"<expired_jwt>"}'\n[RECV] Status 200 OK | Body: {"valid": true, "user": {"id": 4}}\n[RESULT] EXPIRED TOKEN VALIDATION BYPASS VERIFIED (Exit 0)`,
  },
  {
    pocId: 'POC-0001',
    scanId: 'SCAN-20260924-0001',
    finding: 'Mass Assignment /profile',
    result: 'verified',
    duration: '290ms',
    stdout: `[INFO] Initializing Alpine 3.18 container sandbox id=alp_99184\n[EXEC] Running PoC vector for F-003 (Mass Assignment)...\ncurl -s -X PUT "https://api.vulnerable.local/api/v1/profile" -d '{"role":"admin"}'\n[RECV] Status 200 OK | Body: {"success": true, "user": {"role": "admin"}}\n[RESULT] PRIVILEGE ESCALATION REPRODUCIBLE (Exit 0)`,
  },
];

async function seedInitialData() {
  // Mock auto-seeding disabled to ensure 100% genuine live database telemetry
  return;
}

module.exports = { seedInitialData, SEED_SCANS, SEED_FINDINGS, SEED_ENDPOINTS, SEED_SANDBOX };
