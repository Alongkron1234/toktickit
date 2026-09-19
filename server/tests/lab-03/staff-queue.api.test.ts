import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';

describe('Issue 4: IT Staff Ticket Queue API Tests', () => {
  let staffToken: string;
  let adminToken: string;
  let requesterToken: string;

  beforeAll(async () => {
    const staffLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alex.thompson@toktickit.com', password: 'InitialPassword123!' });
    staffToken = staffLogin.body.data.token;

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'john.smith@toktickit.com', password: 'InitialPassword123!' });
    adminToken = adminLogin.body.data.token;

    const requesterLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'jennifer.anderson@example.com', password: 'InitialPassword123!' });
    requesterToken = requesterLogin.body.data.token;
  });

  it('STAFF-Q-01: Rejects Requester role with 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/staff/tickets')
      .set('Authorization', `Bearer ${requesterToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN_ACCESS');
  });

  it('Rejects unauthenticated access with 401', async () => {
    const res = await request(app).get('/api/staff/tickets');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('STAFF-Q-02: IT Staff can retrieve queue with tickets & pagination metadata', async () => {
    const res = await request(app)
      .get('/api/staff/tickets')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.tickets)).toBe(true);
    expect(res.body.data.pagination).toMatchObject({
      total: expect.any(Number),
      page: 1,
      totalPages: expect.any(Number),
      limit: 10,
    });
  });

  it('STAFF-Q-02b: Administrator can retrieve queue', async () => {
    const res = await request(app)
      .get('/api/staff/tickets')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('STAFF-Q-03: Search filters by ticket number substring', async () => {
    const res = await request(app)
      .get('/api/staff/tickets')
      .query({ search: 'TKT-2026-001234' })
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.tickets.length).toBeGreaterThan(0);
    for (const t of res.body.data.tickets) {
      expect(t.ticketNumber).toContain('TKT-2026-001234');
    }
  });

  it('STAFF-Q-03b: Search filters by summary substring (case-insensitive)', async () => {
    const res = await request(app)
      .get('/api/staff/tickets')
      .query({ search: 'battery' })
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.tickets.length).toBeGreaterThan(0);
    for (const t of res.body.data.tickets) {
      expect(t.summary.toLowerCase()).toContain('battery');
    }
  });

  it('STAFF-Q-04: Filters by status', async () => {
    const res = await request(app)
      .get('/api/staff/tickets')
      .query({ status: 'OPEN' })
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    for (const t of res.body.data.tickets) {
      expect(t.currentStatus).toBe('OPEN');
    }
  });

  it('STAFF-Q-04b: Filters by priority', async () => {
    const res = await request(app)
      .get('/api/staff/tickets')
      .query({ priority: 'HIGH' })
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    for (const t of res.body.data.tickets) {
      expect(t.itPriority).toBe('HIGH');
    }
  });

  it('STAFF-Q-04c: Filters by ownerId=unassigned', async () => {
    const res = await request(app)
      .get('/api/staff/tickets')
      .query({ ownerId: 'unassigned' })
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    for (const t of res.body.data.tickets) {
      expect(t.owner).toBeNull();
    }
  });

  it('STAFF-Q-04d: Filters by explicit ownerId', async () => {
    const staffMe = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${staffToken}`);
    const staffId = staffMe.body.data.user.id;

    const res = await request(app)
      .get('/api/staff/tickets')
      .query({ ownerId: staffId.toString() })
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    for (const t of res.body.data.tickets) {
      expect(t.owner?.id).toBe(staffId);
    }
  });

  it('STAFF-Q-05: Sorts by ticketNumber ascending', async () => {
    const res = await request(app)
      .get('/api/staff/tickets')
      .query({ sortBy: 'ticketNumber', sortOrder: 'asc', limit: '100' })
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    const numbers = res.body.data.tickets.map((t: any) => t.ticketNumber);
    const sorted = [...numbers].sort();
    expect(numbers).toEqual(sorted);
  });

  it('STAFF-Q-05b: Invalid sortBy/sortOrder falls back to defaults without erroring', async () => {
    const res = await request(app)
      .get('/api/staff/tickets')
      .query({ sortBy: 'DROP TABLE', sortOrder: 'sideways' })
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('STAFF-Q-05c: Pagination respects page/limit and clamps limit to 100', async () => {
    const res = await request(app)
      .get('/api/staff/tickets')
      .query({ page: '1', limit: '2' })
      .set('Authorization', `Bearer ${staffToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.tickets.length).toBeLessThanOrEqual(2);
    expect(res.body.data.pagination.limit).toBe(2);

    const clamped = await request(app)
      .get('/api/staff/tickets')
      .query({ limit: '9999' })
      .set('Authorization', `Bearer ${staffToken}`);

    expect(clamped.body.data.pagination.limit).toBe(100);
  });
});
