import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app, prisma } from '../../src/app';

describe('Lab 3 Auth API Integration Tests', () => {
  beforeEach(async () => {
    // Reset test user passwords to default initial password for idempotency
    const defaultHash = bcrypt.hashSync('InitialPassword123!', 10);
    await prisma.user.update({
      where: { email: 'sarah.johnson@example.com' },
      data: { passwordHash: defaultHash, requiresPasswordChange: true },
    });
  });

  it('API-01: Valid login returns 200 OK with authenticated user profile and token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'jennifer.anderson@example.com',
        password: 'InitialPassword123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBe('jennifer.anderson@example.com');
    expect(res.body.data.user.role).toBe('REQUESTER');
    expect(res.body.data.token).toBeDefined();
  });

  it('API-02: Invalid credentials return 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'jennifer.anderson@example.com',
        password: 'WrongPassword123!',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('API-02 (Inactive Account): Inactive account login returns 403 Forbidden', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'robert.taylor@example.com',
        password: 'InitialPassword123!',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('ACCOUNT_DISABLED');
  });

  it('GET /api/auth/me: Retrieve current authenticated user profile', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'alex.thompson@toktickit.com',
        password: 'InitialPassword123!',
      });

    const token = loginRes.body.data.token;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.user.email).toBe('alex.thompson@toktickit.com');
    expect(meRes.body.data.user.role).toBe('IT_STAFF');
  });

  it('API-03: Mandatory First-Login Password Change', async () => {
    // 1. Authenticate user
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'sarah.johnson@example.com',
        password: 'InitialPassword123!',
      });

    expect(loginRes.status).toBe(200);
    const token = loginRes.body.data.token;

    // 2. Change password
    const changeRes = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: 'InitialPassword123!',
        newPassword: 'NewSecurePassword123!',
        confirmPassword: 'NewSecurePassword123!',
      });

    expect(changeRes.status).toBe(200);
    expect(changeRes.body.success).toBe(true);

    // 3. Verify login with NEW password
    const newLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'sarah.johnson@example.com',
        password: 'NewSecurePassword123!',
      });

    expect(newLoginRes.status).toBe(200);
    expect(newLoginRes.body.data.user.requiresPasswordChange).toBe(false);
  });

  it('POST /api/auth/logout: Clear session', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
