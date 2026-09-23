/**
 * backend/tests/auth.test.js
 * ───────────────────────────
 * Jest + Supertest integration tests for POST /api/auth/signup
 *
 * Covers every acceptance criterion from the issue:
 *   - Happy path
 *   - Validation (missing / invalid fields)
 *   - Duplicate email handling (including case normalization)
 *   - Error response shape (no stack traces / internals)
 *   - Health check sanity
 */

'use strict';

const request  = require('supertest');
const mongoose = require('mongoose');
const app      = require('../src/app');
const User     = require('../src/models/User');

// ── Test DB — isolated ronin_test database, same credentials as dev ───────────
const TEST_MONGO_URI =
  'mongodb://ronin_admin:RoninAdmin2435@127.0.0.1:27017/ronin_test?authSource=admin';

beforeAll(async () => {
  await mongoose.connect(TEST_MONGO_URI, { serverSelectionTimeoutMS: 8000 });
});

afterEach(async () => {
  // Wipe users between tests for a clean slate
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const SIGNUP_URL = '/api/auth/signup';

const validPayload = () => ({
  fullName: 'Alex Morgan',
  email:    'alex@example.com',
  password: 'StrongPassword123!',
});

const post = (payload) =>
  request(app).post(SIGNUP_URL).send(payload).set('Content-Type', 'application/json');

// ─────────────────────────────────────────────────────────────────────────────
// 1. HAPPY PATH
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/signup — happy path', () => {
  test('returns 201 for valid fullName + email + password', async () => {
    const res = await post(validPayload());
    expect(res.status).toBe(201);
  });

  test('response success flag is true', async () => {
    const res = await post(validPayload());
    expect(res.body.success).toBe(true);
  });

  test('response message confirms creation', async () => {
    const res = await post(validPayload());
    expect(res.body.message).toMatch(/created/i);
  });

  test('response contains user id, fullName, and email', async () => {
    const res = await post(validPayload());
    expect(res.body.user).toMatchObject({
      id:       expect.any(String),
      fullName: 'Alex Morgan',
      email:    'alex@example.com',
    });
  });

  test('response does NOT contain password or hash', async () => {
    const res  = await post(validPayload());
    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/password/i);
  });

  test('response does NOT contain a JWT token', async () => {
    const res = await post(validPayload());
    expect(res.body.token).toBeUndefined();
  });

  test('user is persisted in MongoDB with is_active: true', async () => {
    await post(validPayload());
    const dbUser = await User.findOne({ email: 'alex@example.com' });
    expect(dbUser).not.toBeNull();
    expect(dbUser.is_active).toBe(true);
  });

  test('stored password is bcrypt-hashed, never plaintext', async () => {
    await post(validPayload());
    const dbUser = await User.findOne({ email: 'alex@example.com' }).select('+password');
    expect(dbUser.password).not.toBe('StrongPassword123!');
    expect(dbUser.password).toMatch(/^\$2[aby]\$/); // bcrypt hash prefix
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. VALIDATION — missing / invalid fields
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/signup — validation', () => {
  test('missing fullName returns 422', async () => {
    const { fullName, ...rest } = validPayload();
    const res = await post(rest);
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  test('missing email returns 422', async () => {
    const { email, ...rest } = validPayload();
    const res = await post(rest);
    expect(res.status).toBe(422);
  });

  test('missing password returns 422', async () => {
    const { password, ...rest } = validPayload();
    const res = await post(rest);
    expect(res.status).toBe(422);
  });

  test('invalid email format returns 422', async () => {
    const res = await post({ ...validPayload(), email: 'not-an-email' });
    expect(res.status).toBe(422);
  });

  test('whitespace-only email returns 422', async () => {
    // express-validator .trim().notEmpty() catches this
    const res = await post({ ...validPayload(), email: '   ' });
    expect(res.status).toBe(422);
  });

  test('empty string email returns 422', async () => {
    const res = await post({ ...validPayload(), email: '' });
    expect(res.status).toBe(422);
  });

  test('password shorter than 8 characters returns 422', async () => {
    const res = await post({ ...validPayload(), password: 'short' });
    expect(res.status).toBe(422);
  });

  test('empty password returns 422', async () => {
    const res = await post({ ...validPayload(), password: '' });
    expect(res.status).toBe(422);
  });

  test('empty body returns 422', async () => {
    const res = await post({});
    expect(res.status).toBe(422);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. DUPLICATE EMAIL HANDLING
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/signup — duplicate handling', () => {
  test('same email submitted twice returns 409 on second request', async () => {
    await post(validPayload());
    const res = await post(validPayload());
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already exists/i);
  });

  test('email with different casing is treated as a duplicate → 409', async () => {
    // express-validator .normalizeEmail() + Mongoose lowercase:true mean
    // ALEX@EXAMPLE.COM is stored as alex@example.com — same record
    await post(validPayload());
    const res = await post({ ...validPayload(), email: 'ALEX@EXAMPLE.COM' });
    expect(res.status).toBe(409);
  });

  test('only one user record exists after concurrent duplicate attempts', async () => {
    // Back-to-back parallel POSTs — DB unique index is the final guard
    await Promise.allSettled([
      post(validPayload()),
      post(validPayload()),
      post(validPayload()),
    ]);
    const count = await User.countDocuments({ email: 'alex@example.com' });
    expect(count).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. ERROR RESPONSE SHAPE — no internals leak to client
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/signup — error response shape', () => {
  test('409 response does not expose stack trace or MongoDB internals', async () => {
    await post(validPayload());
    const res  = await post(validPayload());
    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/stack/i);
    expect(body).not.toMatch(/keyValue/i);
    expect(body).not.toMatch(/errmsg/i);
  });

  test('422 response does not expose stack trace', async () => {
    const res  = await post({ email: 'bad-email', password: '123' });
    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/stack/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. HEALTH CHECK
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/health', () => {
  test('returns 200 with success: true', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('response contains version and timestamp', async () => {
    const res = await request(app).get('/api/health');
    expect(res.body.version).toBeDefined();
    expect(res.body.timestamp).toBeDefined();
  });
});
