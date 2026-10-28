import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app, prisma } from '../../src/app';

const PASSWORD = 'InitialPassword123!';
const ACTIVE = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED'] as const;

async function login(email: string) {
  const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return { token: res.body.data.token as string, id: res.body.data.user.id as number };
}
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

describe('Lab 4 Dashboard API', () => {
  let jennifer: { token: string; id: number };
  let michael: { token: string; id: number };
  let alex: { token: string; id: number };
  let admin: { token: string; id: number };
  let newRequesterToken: string;

  beforeAll(async () => {
    jennifer = await login('jennifer.anderson@example.com');
    michael = await login('michael.brown@example.com');
    alex = await login('alex.thompson@toktickit.com');
    admin = await login('john.smith@toktickit.com');
    // A requester that never created a Ticket (zero-state): create one fresh account with no tickets.
    const email = `dash.empty.${Date.now()}@example.com`;
    const created = await request(app)
      .post('/api/admin/users')
      .set(auth(admin.token))
      .send({ name: 'Dash Empty', email, role: 'REQUESTER', isActive: true, initialPassword: PASSWORD });
    expect(created.status).toBe(201);
    const l = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
    const newPassword = 'DashEmpty#2026pw';
    const changed = await request(app)
      .post('/api/auth/change-password')
      .set(auth(l.body.data.token))
      .send({ currentPassword: PASSWORD, newPassword, confirmPassword: newPassword });
    expect(changed.status).toBe(200);
    const again = await request(app).post('/api/auth/login').send({ email, password: newPassword });
    newRequesterToken = again.body.data.token;
    expect(newRequesterToken).toBeTruthy();
  });

  it('DASH-01: requester metrics equal direct DB counts for that requester only', async () => {
    const res = await request(app).get('/api/dashboard/requester').set(auth(jennifer.token));
    expect(res.status).toBe(200);
    const m = res.body.data.metrics;
    const count = (statuses: string[]) =>
      prisma.ticket.count({ where: { requesterId: jennifer.id, currentStatus: { in: statuses as any } } });
    expect(m.open).toBe(await count(['NEW', 'OPEN', 'REOPENED']));
    expect(m.inProgress).toBe(await count(['IN_PROGRESS']));
    expect(m.waitingForRequester).toBe(await count(['WAITING_FOR_REQUESTER']));
    expect(m.resolved).toBe(await count(['RESOLVED']));
    expect(m.closed).toBe(await count(['CLOSED']));
    expect(res.body.data.generatedAt).toBeTruthy();
  });

  it('DASH-02: requester lists are scoped, limited to 5 and newest first', async () => {
    const res = await request(app).get('/api/dashboard/requester').set(auth(michael.token));
    const mine = await prisma.ticket.findMany({ where: { requesterId: michael.id }, select: { id: true } });
    const ids = new Set(mine.map((t) => t.id));
    const list = res.body.data.recentlyUpdated as { id: number; updatedAt: string }[];
    expect(list.length).toBeLessThanOrEqual(5);
    expect(list.every((t) => ids.has(t.id))).toBe(true);
    const times = list.map((t) => t.updatedAt);
    expect(times).toEqual([...times].sort().reverse());
    for (const t of res.body.data.recentlyResolved) {
      expect(['RESOLVED', 'CLOSED']).toContain(t.currentStatus);
      expect(ids.has(t.id)).toBe(true);
    }
  });

  it('DASH-03: a requester without tickets gets zeros and empty lists, not an error', async () => {
    const res = await request(app).get('/api/dashboard/requester').set(auth(newRequesterToken));
    expect(res.status).toBe(200);
    expect(res.body.data.metrics).toEqual({ open: 0, inProgress: 0, waitingForRequester: 0, resolved: 0, closed: 0 });
    expect(res.body.data.recentlyUpdated).toEqual([]);
    expect(res.body.data.recentlyResolved).toEqual([]);
  });

  it('DASH-04: staff metrics equal direct DB counts', async () => {
    const res = await request(app).get('/api/dashboard/staff').set(auth(alex.token));
    expect(res.status).toBe(200);
    const m = res.body.data.metrics;
    const c = (where: object) => prisma.ticket.count({ where: where as any });
    expect(m.new).toBe(await c({ currentStatus: 'NEW' }));
    expect(m.open).toBe(await c({ currentStatus: { in: ['OPEN', 'REOPENED'] } }));
    expect(m.inProgress).toBe(await c({ currentStatus: 'IN_PROGRESS' }));
    expect(m.waitingForRequester).toBe(await c({ currentStatus: 'WAITING_FOR_REQUESTER' }));
    expect(m.myAssigned).toBe(await c({ ownerId: alex.id, currentStatus: { in: [...ACTIVE] } }));
    expect(m.unassigned).toBe(await c({ ownerId: null, currentStatus: { in: [...ACTIVE] } }));
    for (const p of ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']) {
      expect(m.byItPriority[p]).toBe(await c({ itPriority: p, currentStatus: { in: [...ACTIVE] } }));
    }
    expect(m.myOpenActions).toBe(
      await prisma.actionTaken.count({ where: { assigneeId: alex.id, status: 'OPEN' } })
    );
  });

  it('DASH-05: staff recent lists belong to the caller, are limited and ordered', async () => {
    const res = await request(app).get('/api/dashboard/staff').set(auth(alex.token));
    const tickets = res.body.data.myRecentTickets as { id: number; updatedAt: string }[];
    expect(tickets.length).toBeLessThanOrEqual(5);
    for (const t of tickets) {
      const row = await prisma.ticket.findUnique({ where: { id: t.id } });
      expect(row!.ownerId).toBe(alex.id);
    }
    const times = tickets.map((t) => t.updatedAt);
    expect(times).toEqual([...times].sort().reverse());

    const actions = res.body.data.myRecentActions as { id: number; ticketNumber: string; actionAt: string }[];
    expect(actions.length).toBeLessThanOrEqual(5);
    for (const a of actions) {
      const row = await prisma.actionTaken.findUnique({ where: { id: a.id } });
      expect(row!.performedById).toBe(alex.id);
      expect(a.ticketNumber).toMatch(/^TKT-/);
    }
    const at = actions.map((a) => a.actionAt);
    expect(at).toEqual([...at].sort().reverse());
  });

  it('DASH-06: userCounts is null for IT Staff and filled for Administrator', async () => {
    const staffRes = await request(app).get('/api/dashboard/staff').set(auth(alex.token));
    expect(staffRes.body.data.userCounts).toBeNull();

    const adminRes = await request(app).get('/api/dashboard/staff').set(auth(admin.token));
    const uc = adminRes.body.data.userCounts;
    expect(uc.active).toBe(await prisma.user.count({ where: { isActive: true } }));
    expect(uc.inactive).toBe(await prisma.user.count({ where: { isActive: false } }));
    expect(uc.activeByRole.IT_STAFF).toBe(await prisma.user.count({ where: { isActive: true, role: 'IT_STAFF' } }));
  });

  it('DASH-07: authorization (401 / 403)', async () => {
    expect((await request(app).get('/api/dashboard/requester')).status).toBe(401);
    expect((await request(app).get('/api/dashboard/staff')).status).toBe(401);
    expect((await request(app).get('/api/dashboard/staff').set(auth(jennifer.token))).status).toBe(403);
    expect((await request(app).get('/api/dashboard/requester').set(auth(alex.token))).status).toBe(403);
    expect((await request(app).get('/api/dashboard/requester').set(auth(admin.token))).status).toBe(403);
  });

  it('DASH-08: ignores a requesterId supplied by the client', async () => {
    const res = await request(app)
      .get(`/api/dashboard/requester?requesterId=${michael.id}`)
      .set(auth(jennifer.token))
      .set('X-Dev-Requester-Id', String(michael.id));
    const own = await request(app).get('/api/dashboard/requester').set(auth(jennifer.token));
    expect(res.body.data.metrics).toEqual(own.body.data.metrics);
  });

  it('DASH-09: both endpoints respond within 1000 ms (performance smoke)', async () => {
    for (const [path, t] of [
      ['/api/dashboard/requester', jennifer.token],
      ['/api/dashboard/staff', alex.token],
    ] as const) {
      const start = Date.now();
      const res = await request(app).get(path).set(auth(t));
      expect(res.status).toBe(200);
      expect(Date.now() - start).toBeLessThan(1000);
    }
  });

  it('FILTER-01: multi-status filter on staff queue matches the card count', async () => {
    const dash = await request(app).get('/api/dashboard/staff').set(auth(alex.token));
    const list = await request(app)
      .get('/api/staff/tickets?status=open,reopened&limit=100')
      .set(auth(alex.token));
    expect(list.status).toBe(200);
    expect(list.body.data.pagination.total).toBe(dash.body.data.metrics.open);

    const mixed = await request(app).get('/api/staff/tickets?status=bogus,NEW').set(auth(alex.token));
    expect(mixed.body.data.pagination.total).toBe(dash.body.data.metrics.new);

    const none = await request(app).get('/api/staff/tickets?status=bogus&limit=1').set(auth(alex.token));
    expect(none.body.data.pagination.total).toBe(await prisma.ticket.count());
  });

  it('FILTER-02: multi-status filter on requester list matches the card count', async () => {
    const dash = await request(app).get('/api/dashboard/requester').set(auth(jennifer.token));
    const list = await request(app)
      .get('/api/tickets?status=NEW,OPEN,REOPENED&limit=100')
      .set('X-Dev-Requester-Id', String(jennifer.id));
    expect(list.status).toBe(200);
    expect(list.body.pagination.totalCount).toBe(dash.body.data.metrics.open);

    const single = await request(app)
      .get('/api/tickets?status=resolved&limit=100')
      .set('X-Dev-Requester-Id', String(jennifer.id));
    expect(single.body.pagination.totalCount).toBe(dash.body.data.metrics.resolved);
  });
});
