import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app, prisma } from '../../src/app';
import { loginAs, bearer, TestUser } from '../helpers/auth';

// SEC-02 / SEC-03: identity comes only from a valid token. The legacy X-Dev-Requester-Id header
// must never authenticate a request, and Lab 2 endpoints enforce role and ownership from the token.
describe('Authorization: token-only identity', () => {
  let admin: TestUser;
  let staff: TestUser;
  let jennifer: TestUser;
  let michael: TestUser;
  let ticketId: number;

  beforeAll(async () => {
    admin = await loginAs('john.smith@toktickit.com');
    staff = await loginAs('alex.thompson@toktickit.com');
    jennifer = await loginAs('jennifer.anderson@example.com');
    michael = await loginAs('michael.brown@example.com');

    // Seed ticket owned by Jennifer (does not depend on the endpoints under test).
    const seeded = await prisma.ticket.findUnique({ where: { ticketNumber: 'TKT-2026-001234' } });
    expect(seeded!.requesterId).toBe(jennifer.id);
    ticketId = seeded!.id;
  });

  it('SEC-02a: X-Dev-Requester-Id alone never authenticates (existing admin id)', async () => {
    const paths = [
      '/api/auth/me',
      '/api/staff/tickets',
      '/api/staff/members',
      '/api/admin/users',
      '/api/dashboard/staff',
      '/api/dashboard/requester',
      `/api/tickets/${ticketId}/comments`,
      `/api/tickets/${ticketId}/actions`,
      '/api/tickets',
      `/api/tickets/${ticketId}`,
    ];
    for (const path of paths) {
      const res = await request(app).get(path).set('X-Dev-Requester-Id', String(admin.id));
      expect(res.status, `GET ${path}`).toBe(401);
    }
  });

  it('SEC-02b: a made-up id is not turned into a user', async () => {
    const res = await request(app).get('/api/tickets').set('X-Dev-Requester-Id', '500');
    expect(res.status).toBe(401);
    const create = await request(app)
      .post('/api/tickets')
      .set('X-Dev-Requester-Id', '500')
      .send({ summary: 'x', description: 'y', categoryId: 1, relatedSystemId: 1, requestedPriority: 'LOW' });
    expect(create.status).toBe(401);
  });

  it('SEC-02c: the header cannot be used to write (create, status, attachment remove)', async () => {
    const create = await request(app)
      .post('/api/tickets')
      .set('X-Dev-Requester-Id', String(jennifer.id))
      .send({ summary: 'x', description: 'y', categoryId: 1, relatedSystemId: 1, requestedPriority: 'LOW' });
    expect(create.status).toBe(401);
    const status = await request(app)
      .patch(`/api/tickets/${ticketId}/status`)
      .set('X-Dev-Requester-Id', String(jennifer.id))
      .send({ status: 'REOPENED', expectedVersion: 0 });
    expect(status.status).toBe(401);
    const remove = await request(app).patch('/api/attachments/1/remove').set('X-Dev-Requester-Id', String(jennifer.id));
    expect(remove.status).toBe(401);
  });

  it('SEC-03a: Lab 2 endpoints require a token', async () => {
    expect((await request(app).get('/api/tickets')).status).toBe(401);
    expect((await request(app).get(`/api/tickets/${ticketId}`)).status).toBe(401);
    expect((await request(app).post('/api/tickets').send({})).status).toBe(401);
    expect((await request(app).post(`/api/tickets/${ticketId}/attachments`)).status).toBe(401);
    expect((await request(app).patch('/api/attachments/1/remove')).status).toBe(401);
    expect((await request(app).patch(`/api/tickets/${ticketId}/status`).send({})).status).toBe(401);
  });

  it('SEC-03b: Lab 2 requester endpoints reject IT Staff and Administrator tokens (403)', async () => {
    for (const who of [staff, admin]) {
      expect((await request(app).get('/api/tickets').set(bearer(who.token))).status).toBe(403);
      expect((await request(app).get(`/api/tickets/${ticketId}`).set(bearer(who.token))).status).toBe(403);
      const create = await request(app)
        .post('/api/tickets')
        .set(bearer(who.token))
        .send({ summary: 'x', description: 'y', categoryId: 1, relatedSystemId: 1, requestedPriority: 'LOW' });
      expect(create.status).toBe(403);
    }
  });

  it('SEC-03c: a Requester lists and opens only their own tickets; others look identical to missing', async () => {
    const own = await request(app).get('/api/tickets?search=TKT-2026-001234').set(bearer(jennifer.token));
    expect(own.status).toBe(200);
    expect(own.body.data.every((t: { requesterId: number }) => t.requesterId === jennifer.id)).toBe(true);
    expect(own.body.data.some((t: { id: number }) => t.id === ticketId)).toBe(true);

    const mine = await request(app).get(`/api/tickets/${ticketId}`).set(bearer(jennifer.token));
    expect(mine.status).toBe(200);

    const theirs = await request(app).get(`/api/tickets/${ticketId}`).set(bearer(michael.token));
    const missing = await request(app).get('/api/tickets/99999999').set(bearer(michael.token));
    expect(theirs.status).toBe(404);
    expect(theirs.body).toEqual(missing.body);

    const reopen = await request(app)
      .patch(`/api/tickets/${ticketId}/status`)
      .set(bearer(michael.token))
      .send({ status: 'REOPENED', expectedVersion: 0 });
    expect([403, 404]).toContain(reopen.status);
  });

  it('SEC-03d: Requesters are rejected from staff and admin endpoints', async () => {
    for (const path of ['/api/staff/tickets', '/api/staff/members', '/api/admin/users', '/api/dashboard/staff']) {
      expect((await request(app).get(path).set(bearer(jennifer.token))).status, path).toBe(403);
    }
  });

  it('SEC-04: the Development Requester lookup endpoint no longer exists', async () => {
    const res = await request(app).get('/api/requesters').set(bearer(jennifer.token));
    expect(res.status).toBe(404);
  });
});
