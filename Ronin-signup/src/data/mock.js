// Shared mock data used across all dashboard pages
export const MOCK_USER = { name: 'Arjun Mehra', email: 'arjun@ronin.local' }

export const MOCK_SCAN = {
  id: 'SCAN-20260924-0001',
  target: 'https://api.vulnerable.local',
  name: 'Vulnerable Demo API',
  phase: 'Exploitation',
  phaseIndex: 2,     // 0 recon, 1 orchestrator, 2 exploit, 3 validate
  progress: 68,
  endpointsTested: 26,
  endpointsTotal: 38,
  startedMinsAgo: 14,
  currentActivity: 'Testing BOLA / parameter tampering',
  currentEndpoint: 'GET /api/v1/profile',
  status: 'running',  // running | paused | completed | failed | aborted
}

export const MOCK_AGENTS = [
  {
    id: 'orchestrator',
    name: 'Orchestrator',
    role: 'Workflow coordinator',
    status: 'completed',  // active | completed | waiting | error
    task: 'Dispatching exploit tasks',
    elapsed: '14m 03s',
  },
  {
    id: 'recon',
    name: 'Recon',
    role: 'Attack surface discovery',
    status: 'completed',
    task: 'Discovered 38 endpoints',
    elapsed: '4m 22s',
  },
  {
    id: 'exploit',
    name: 'Exploit',
    role: 'Vulnerability testing',
    status: 'active',
    task: 'BOLA on /api/v1/users/{id}',
    elapsed: '9m 41s',
  },
  {
    id: 'validate',
    name: 'Validate',
    role: 'PoC sandbox execution',
    status: 'waiting',
    task: 'Awaiting exploit results',
    elapsed: '—',
  },
]

export const MOCK_FINDINGS = [
  {
    id: 'F-001',
    severity: 'critical',
    title: 'Broken Object Level Authorization',
    owasp: 'API1:2023',
    endpoint: '/api/v1/users/{id}',
    method: 'GET',
    cvss: 9.1,
    status: 'verified',
    scanId: 'SCAN-20260924-0001',
    discoveredAt: '2026-09-24 00:02',
    description: 'Authenticated users can access any user object by manipulating the {id} parameter without ownership validation.',
    poc: `curl -X GET "https://api.vulnerable.local/api/v1/users/2" \\
  -H "Authorization: Bearer <victim_token>"`,
    remediation: 'Enforce object-level ownership check server-side. Never trust client-supplied IDs without verifying the requesting user has permission.',
  },
  {
    id: 'F-002',
    severity: 'high',
    title: 'Broken Authentication',
    owasp: 'API2:2023',
    endpoint: '/api/auth/verify',
    method: 'POST',
    cvss: 8.6,
    status: 'verified',
    scanId: 'SCAN-20260924-0001',
    discoveredAt: '2026-09-24 00:05',
    description: 'Token verification endpoint accepts expired JWTs without validating expiry claim.',
    poc: `curl -X POST "https://api.vulnerable.local/api/auth/verify" \\
  -H "Content-Type: application/json" \\
  -d '{"token":"<expired_jwt>"}'`,
    remediation: 'Validate exp claim server-side. Use short token lifetimes and implement token revocation.',
  },
  {
    id: 'F-003',
    severity: 'high',
    title: 'Mass Assignment',
    owasp: 'API6:2023',
    endpoint: '/api/v1/profile',
    method: 'PUT',
    cvss: 7.5,
    status: 'verified',
    scanId: 'SCAN-20260924-0001',
    discoveredAt: '2026-09-24 00:09',
    description: 'Profile update endpoint binds all request body fields directly to user model, allowing role escalation.',
    poc: `curl -X PUT "https://api.vulnerable.local/api/v1/profile" \\
  -H "Authorization: Bearer <token>" \\
  -d '{"name":"attacker","role":"admin"}'`,
    remediation: 'Use an explicit allow-list (DTO/serializer) to define which fields may be mass-assigned.',
  },
  {
    id: 'F-004',
    severity: 'medium',
    title: 'Excessive Data Exposure',
    owasp: 'API3:2023',
    endpoint: '/api/v1/orders',
    method: 'GET',
    cvss: 5.3,
    status: 'verified',
    scanId: 'SCAN-20260924-0001',
    discoveredAt: '2026-09-24 00:11',
    description: 'Order list response includes internal payment processor tokens and full card BINs not required by client.',
    poc: `curl "https://api.vulnerable.local/api/v1/orders" \\
  -H "Authorization: Bearer <token>"`,
    remediation: 'Filter response fields server-side. Never expose internal identifiers or sensitive fields in list endpoints.',
  },
  {
    id: 'F-005',
    severity: 'low',
    title: 'Missing Rate Limiting',
    owasp: 'API4:2023',
    endpoint: '/api/auth/login',
    method: 'POST',
    cvss: 3.7,
    status: 'verified',
    scanId: 'SCAN-20260924-0001',
    discoveredAt: '2026-09-24 00:13',
    description: 'Login endpoint accepts unlimited authentication attempts with no throttling or lockout.',
    poc: `for i in $(seq 1 1000); do
  curl -X POST ".../api/auth/login" -d '{"email":"a@b.com","password":"guess$i"}'
done`,
    remediation: 'Implement per-IP and per-account rate limiting. Add exponential back-off and account lockout after N failures.',
  },
]

export const MOCK_ENDPOINTS = [
  { id: 'E-001', method: 'GET',    path: '/api/v1/users',         auth: 'Bearer',  tested: true,  findings: 1, params: 2  },
  { id: 'E-002', method: 'GET',    path: '/api/v1/users/{id}',    auth: 'Bearer',  tested: true,  findings: 1, params: 1  },
  { id: 'E-003', method: 'POST',   path: '/api/v1/users',         auth: 'Bearer',  tested: true,  findings: 0, params: 0  },
  { id: 'E-004', method: 'PUT',    path: '/api/v1/profile',       auth: 'Bearer',  tested: true,  findings: 1, params: 4  },
  { id: 'E-005', method: 'DELETE', path: '/api/v1/users/{id}',    auth: 'Bearer',  tested: true,  findings: 0, params: 1  },
  { id: 'E-006', method: 'GET',    path: '/api/v1/orders',        auth: 'Bearer',  tested: true,  findings: 1, params: 3  },
  { id: 'E-007', method: 'POST',   path: '/api/auth/login',       auth: 'None',    tested: true,  findings: 1, params: 2  },
  { id: 'E-008', method: 'POST',   path: '/api/auth/verify',      auth: 'Bearer',  tested: true,  findings: 1, params: 1  },
  { id: 'E-009', method: 'POST',   path: '/api/auth/refresh',     auth: 'Bearer',  tested: true,  findings: 0, params: 1  },
  { id: 'E-010', method: 'GET',    path: '/api/v1/products',      auth: 'None',    tested: true,  findings: 0, params: 5  },
  { id: 'E-011', method: 'GET',    path: '/api/v1/products/{id}', auth: 'None',    tested: false, findings: 0, params: 1  },
  { id: 'E-012', method: 'POST',   path: '/api/v1/reviews',       auth: 'Bearer',  tested: false, findings: 0, params: 3  },
]

export const MOCK_ACTIVITY = [
  { time: '00:14', agent: 'Exploit',       event: 'Testing BOLA parameter tampering', endpoint: 'GET /api/v1/profile',         sev: null },
  { time: '00:12', agent: 'Exploit',       event: 'Confirmed mass assignment PoC',   endpoint: 'PUT /api/v1/profile',          sev: 'high' },
  { time: '00:09', agent: 'Validate',      event: 'Sandbox execution — Verified',    endpoint: 'PUT /api/v1/profile',          sev: 'high' },
  { time: '00:07', agent: 'Exploit',       event: 'Flagged broken auth anomaly',     endpoint: 'POST /api/auth/verify',        sev: 'high' },
  { time: '00:05', agent: 'Orchestrator',  event: 'Dispatched exploit batch #3',     endpoint: null,                           sev: null },
  { time: '00:02', agent: 'Validate',      event: 'BOLA PoC — Verified critical',    endpoint: 'GET /api/v1/users/{id}',       sev: 'critical' },
  { time: '00:00', agent: 'Recon',         event: 'Discovery complete — 38 endpoints found', endpoint: null,                   sev: null },
]

export const MOCK_SCANS = [
  {
    id: 'SCAN-20260924-0001',
    target: 'https://api.vulnerable.local',
    name: 'Vulnerable Demo API',
    startedAt: '2026-09-24 00:00',
    duration: '14m (running)',
    endpoints: 38,
    findings: 5,
    critical: 1,
    high: 2,
    validationRate: '100%',
    status: 'running',
  },
  {
    id: 'SCAN-20260913-0001',
    target: 'https://api.example.com',
    name: 'Example API',
    startedAt: '2026-09-13 09:16',
    duration: '22m 14s',
    endpoints: 24,
    findings: 2,
    critical: 0,
    high: 1,
    validationRate: '100%',
    status: 'completed',
  },
]

export const MOCK_SANDBOX = [
  { id: 'POC-0003', finding: 'BOLA /users/{id}',    result: 'verified', duration: '320ms' },
  { id: 'POC-0002', finding: 'Broken Auth',         result: 'verified', duration: '418ms' },
  { id: 'POC-0001', finding: 'Mass Assignment',     result: 'verified', duration: '290ms' },
]
