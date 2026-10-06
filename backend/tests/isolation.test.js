/**
 * backend/tests/isolation.test.js
 * ───────────────────────────────
 * Integration tests verifying multi-tenant user data isolation:
 *   - Each user can only see their own scans, findings, endpoints, and sandbox runs.
 *   - Unauthenticated requests are rejected with 401.
 *   - User B cannot access, modify, or view User A's scan details, telemetry, or reports.
 */

'use strict';

const request  = require('supertest');
const mongoose = require('mongoose');
const jwt      = require('jsonwebtoken');
const app      = require('../src/app');
const User     = require('../src/models/User');
const Scan     = require('../src/models/Scan');
const Finding  = require('../src/models/Finding');
const Endpoint = require('../src/models/Endpoint');
const SandboxRun = require('../src/models/SandboxRun');

const TEST_MONGO_URI =
  'mongodb://ronin_admin:RoninAdmin2435@127.0.0.1:27017/ronin_test?authSource=admin';

jest.setTimeout(30000);

let userA, tokenA;
let userB, tokenB;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  }
});

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Scan.deleteMany({}),
    Finding.deleteMany({}),
    Endpoint.deleteMany({}),
    SandboxRun.deleteMany({}),
  ]);

  // Create User A
  userA = await User.create({
    fullName: 'Operator Alpha',
    email: 'alpha@ronin.local',
    password: 'Password123!',
  });
  tokenA = jwt.sign({ id: userA._id }, process.env.JWT_SECRET || 'ronin_JWT_123', { expiresIn: '1h' });

  // Create User B
  userB = await User.create({
    fullName: 'Operator Beta',
    email: 'beta@ronin.local',
    password: 'Password123!',
  });
  tokenB = jwt.sign({ id: userB._id }, process.env.JWT_SECRET || 'ronin_JWT_123', { expiresIn: '1h' });
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

describe('User Data & Test Isolation', () => {
  test('rejects unauthenticated requests to scans, findings, and endpoints with 401', async () => {
    const resScans = await request(app).get('/api/scans');
    expect(resScans.status).toBe(401);

    const resFindings = await request(app).get('/api/findings');
    expect(resFindings.status).toBe(401);

    const resEndpoints = await request(app).get('/api/endpoints');
    expect(resEndpoints.status).toBe(401);

    const resSandbox = await request(app).get('/api/sandbox');
    expect(resSandbox.status).toBe(401);
  });

  test('User A creates a scan; User A sees it, but User B sees 0 scans', async () => {
    // User A launches a scan
    const scanRes = await request(app)
      .post('/api/scans')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ target: 'https://alpha-target.com', name: 'Alpha Target Audit' });

    expect(scanRes.status).toBe(201);
    const scanId = scanRes.body.data.scanId;
    expect(scanId).toBeDefined();

    // User A lists scans → 1 scan found
    const resA = await request(app)
      .get('/api/scans')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(resA.status).toBe(200);
    expect(resA.body.count).toBe(1);
    expect(resA.body.data[0].scanId).toBe(scanId);

    // User B lists scans → 0 scans found
    const resB = await request(app)
      .get('/api/scans')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(resB.status).toBe(200);
    expect(resB.body.count).toBe(0);
    expect(resB.body.data).toEqual([]);
  });

  test('User B cannot view or download User A scan report', async () => {
    const scan = await Scan.create({
      scanId: 'SCAN-ISOLATION-001',
      name: 'Alpha Secret Scan',
      target: 'https://secret.local',
      status: 'completed',
      operatorId: userA._id,
      reportMarkdown: '# Confidential Security Report',
    });

    // User A can access report
    const resA = await request(app)
      .get(`/api/scans/${scan.scanId}/report`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(resA.status).toBe(200);
    expect(resA.body.report).toContain('Confidential');

    // User B cannot access report
    const resB = await request(app)
      .get(`/api/scans/${scan.scanId}/report`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(resB.status).toBe(404);
  });

  test('User B cannot abort or pause User A scan', async () => {
    const scan = await Scan.create({
      scanId: 'SCAN-ISOLATION-002',
      name: 'Alpha Running Scan',
      target: 'https://running.local',
      status: 'running',
      operatorId: userA._id,
    });

    // User B attempts to abort User A's scan
    const resB = await request(app)
      .patch(`/api/scans/${scan.scanId}/status`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ status: 'aborted' });
    expect(resB.status).toBe(404);

    // Confirm scan status is untouched
    const freshScan = await Scan.findOne({ scanId: scan.scanId });
    expect(freshScan.status).toBe('running');
  });

  test('Findings, Endpoints, and Sandbox runs are isolated by user', async () => {
    const scanA = await Scan.create({
      scanId: 'SCAN-ALPHA-TEST',
      name: 'Alpha Scan',
      target: 'https://target-alpha.com',
      status: 'completed',
      operatorId: userA._id,
    });

    await Finding.create({
      findingId: 'FIND-ALPHA-01',
      scanId: scanA.scanId,
      title: 'BOLA on /api/users/{id}',
      owasp: 'API1:2023',
      severity: 'critical',
      cvss: 9.1,
      endpoint: '/api/users/{id}',
      method: 'GET',
      description: 'Unauthorized access',
      poc: 'curl https://target-alpha.com/api/users/2',
      remediation: 'Implement RBAC checks',
    });

    await Endpoint.create({
      endpointId: 'EP-ALPHA-01',
      scanId: scanA.scanId,
      method: 'GET',
      path: '/api/users/{id}',
    });

    await SandboxRun.create({
      pocId: 'POC-ALPHA-01',
      scanId: scanA.scanId,
      finding: 'BOLA on /api/users/{id}',
      result: 'verified',
    });

    // User A sees 1 finding, 1 endpoint, 1 sandbox run
    const resFindA = await request(app).get('/api/findings').set('Authorization', `Bearer ${tokenA}`);
    expect(resFindA.body.count).toBe(1);
    expect(resFindA.body.data[0].findingId).toBe('FIND-ALPHA-01');

    const resEpA = await request(app).get('/api/endpoints').set('Authorization', `Bearer ${tokenA}`);
    expect(resEpA.body.count).toBe(1);
    expect(resEpA.body.data[0].endpointId).toBe('EP-ALPHA-01');

    const resSandA = await request(app).get('/api/sandbox').set('Authorization', `Bearer ${tokenA}`);
    expect(resSandA.body.count).toBe(1);
    expect(resSandA.body.data[0].pocId).toBe('POC-ALPHA-01');

    // User B sees ZERO findings, endpoints, or sandbox runs
    const resFindB = await request(app).get('/api/findings').set('Authorization', `Bearer ${tokenB}`);
    expect(resFindB.body.count).toBe(0);
    expect(resFindB.body.data).toEqual([]);

    const resEpB = await request(app).get('/api/endpoints').set('Authorization', `Bearer ${tokenB}`);
    expect(resEpB.body.count).toBe(0);
    expect(resEpB.body.data).toEqual([]);

    const resSandB = await request(app).get('/api/sandbox').set('Authorization', `Bearer ${tokenB}`);
    expect(resSandB.body.count).toBe(0);
    expect(resSandB.body.data).toEqual([]);
  });

  test('GET /api/scans/active returns running scan only to the owner, null to other users', async () => {
    // User A has an active running scan
    await Scan.create({
      scanId: 'SCAN-ALPHA-RUNNING',
      name: 'Alpha Active Scan',
      target: 'https://alpha-target.com',
      status: 'running',
      operatorId: userA._id,
      startedAt: new Date(),
    });

    // User A calls /api/scans/active → receives active scan
    const resActiveA = await request(app)
      .get('/api/scans/active')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(resActiveA.status).toBe(200);
    expect(resActiveA.body.success).toBe(true);
    expect(resActiveA.body.data).not.toBeNull();
    expect(resActiveA.body.data.scanId).toBe('SCAN-ALPHA-RUNNING');
    expect(resActiveA.body.data.target).toBe('https://alpha-target.com');

    // User B calls /api/scans/active → receives data: null, never User A's scan
    const resActiveB = await request(app)
      .get('/api/scans/active')
      .set('Authorization', `Bearer ${tokenB}`);
    expect(resActiveB.status).toBe(200);
    expect(resActiveB.body.success).toBe(true);
    expect(resActiveB.body.data).toBeNull();
  });
});
