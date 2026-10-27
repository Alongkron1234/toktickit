import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';

const PASSWORD = 'InitialPassword123!';

async function login(email: string) {
  const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return { token: res.body.data.token as string, id: res.body.data.user.id as number };
}

describe('Lab 4 Actions Taken API', () => {
  let staff: { token: string; id: number };
  let staff2: { token: string; id: number };
  let admin: { token: string; id: number };
  let owner: { token: string; id: number };
  let other: { token: string; id: number };
  let inactiveStaffId: number;
  let ticketId: number;

  const base = () => `/api/staff/tickets/${ticketId}/actions`;
  const create = (body: object, token = staff.token) =>
    request(app).post(base()).set('Authorization', `Bearer ${token}`).send(body);

  beforeAll(async () => {
    staff = await login('alex.thompson@toktickit.com');
    staff2 = await login('kevin.patel@toktickit.com');
    admin = await login('john.smith@toktickit.com');
    owner = await login('jennifer.anderson@example.com');
    other = await login('michael.brown@example.com');

    const list = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${admin.token}`);
    const users = list.body.data?.users ?? list.body.data ?? [];
    inactiveStaffId = users.find((u: { email: string }) => u.email === 'emily.davis@toktickit.com')?.id;

    const t = await request(app)
      .post('/api/tickets')
      .set('X-Dev-Requester-Id', owner.id.toString())
      .send({
        summary: 'Lab 4 actions fixture',
        description: 'Fixture ticket for Actions Taken API tests',
        categoryId: 1,
        relatedSystemId: 1,
        requestedPriority: 'LOW',
      });
    ticketId = t.body.data.id;
  });

  it('API-01: staff creates an action; performedBy comes from the token, status OPEN', async () => {
    const res = await create({
      description: '  Checked the device  ',
      performedById: staff2.id,
      performedBy: { id: staff2.id },
    });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('OPEN');
    expect(res.body.data.description).toBe('Checked the device');
    expect(res.body.data.performedBy.id).toBe(staff.id);
    expect(res.body.data.assignee).toBeNull();
    expect(res.body.data.ticketId).toBe(ticketId);
  });

  it('API-02: validation rules', async () => {
    const empty = await create({ description: '   ' });
    expect(empty.status).toBe(400);
    expect(empty.body.error.code).toBe('VALIDATION_ERROR');

    expect((await create({ description: 'x'.repeat(2001) })).status).toBe(400);
    expect((await create({ description: 'ok', result: 'x'.repeat(1001) })).status).toBe(400);
    expect((await create({ description: 'ok', attachmentNotes: 'x'.repeat(501) })).status).toBe(400);
    expect((await create({ description: 'ok', followUpRequired: true })).status).toBe(400);
    expect((await create({ description: 'ok', followUpRequired: true, followUpNote: ' ' })).status).toBe(400);
    expect((await create({ description: 'ok', actionAt: 'not-a-date' })).status).toBe(400);

    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    expect((await create({ description: 'ok', actionAt: future })).status).toBe(400);

    const withFollowUp = await create({
      description: 'ok',
      followUpRequired: true,
      followUpNote: 'Check next week',
    });
    expect(withFollowUp.status).toBe(201);
    expect(withFollowUp.body.data.followUpRequired).toBe(true);
    expect(withFollowUp.body.data.followUpNote).toBe('Check next week');
  });

  it('API-03: assignee must be an active IT staff or administrator', async () => {
    const ok = await create({ description: 'assign ok', assigneeId: staff2.id });
    expect(ok.status).toBe(201);
    expect(ok.body.data.assignee.id).toBe(staff2.id);

    const asRequester = await create({ description: 'bad', assigneeId: owner.id });
    expect(asRequester.status).toBe(400);
    expect(asRequester.body.error.code).toBe('INVALID_ASSIGNEE');

    if (inactiveStaffId) {
      const inactive = await create({ description: 'bad', assigneeId: inactiveStaffId });
      expect(inactive.status).toBe(400);
      expect(inactive.body.error.code).toBe('INVALID_ASSIGNEE');
    }
    expect((await create({ description: 'bad', assigneeId: 999999 })).body.error.code).toBe('INVALID_ASSIGNEE');
  });

  it('API-04: list is ordered newest first and empty for a ticket without actions', async () => {
    await create({ description: 'older', actionAt: '2026-01-01T00:00:00.000Z' });
    await create({ description: 'newer', actionAt: '2026-02-01T00:00:00.000Z' });
    const res = await request(app).get(base()).set('Authorization', `Bearer ${staff.token}`);
    expect(res.status).toBe(200);
    const dates = res.body.data.actions.map((a: { actionAt: string }) => a.actionAt);
    expect(dates).toEqual([...dates].sort().reverse());

    const t = await request(app)
      .post('/api/tickets')
      .set('X-Dev-Requester-Id', owner.id.toString())
      .send({
        summary: 'No actions',
        description: 'Ticket without actions',
        categoryId: 1,
        relatedSystemId: 1,
        requestedPriority: 'LOW',
      });
    const empty = await request(app)
      .get(`/api/staff/tickets/${t.body.data.id}/actions`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(empty.status).toBe(200);
    expect(empty.body.data.actions).toEqual([]);
  });

  it('API-05: edit an OPEN action, reassign and clear the assignee', async () => {
    const created = await create({ description: 'to edit', assigneeId: staff2.id });
    const id = created.body.data.id;
    const res = await request(app)
      .patch(`${base()}/${id}`)
      .set('Authorization', `Bearer ${staff.token}`)
      .send({ description: 'edited', assigneeId: null });
    expect(res.status).toBe(200);
    expect(res.body.data.description).toBe('edited');
    expect(res.body.data.assignee).toBeNull();
    expect(res.body.data.performedBy.id).toBe(staff.id);

    const bad = await request(app)
      .patch(`${base()}/${id}`)
      .set('Authorization', `Bearer ${staff.token}`)
      .send({ followUpRequired: true });
    expect(bad.status).toBe(400);
  });

  it('API-06: complete requires a result; terminal actions are not editable', async () => {
    const created = await create({ description: 'to complete' });
    const id = created.body.data.id;

    const noResult = await request(app)
      .post(`${base()}/${id}/complete`)
      .set('Authorization', `Bearer ${staff.token}`)
      .send({});
    expect(noResult.status).toBe(400);

    const done = await request(app)
      .post(`${base()}/${id}/complete`)
      .set('Authorization', `Bearer ${staff.token}`)
      .send({ result: 'Fixed' });
    expect(done.status).toBe(200);
    expect(done.body.data.status).toBe('COMPLETED');
    expect(done.body.data.result).toBe('Fixed');

    const edit = await request(app)
      .patch(`${base()}/${id}`)
      .set('Authorization', `Bearer ${staff.token}`)
      .send({ description: 'again' });
    expect(edit.status).toBe(409);
    expect(edit.body.error.code).toBe('ACTION_NOT_EDITABLE');

    const again = await request(app)
      .post(`${base()}/${id}/cancel`)
      .set('Authorization', `Bearer ${staff.token}`);
    expect(again.status).toBe(409);
  });

  it('API-07: cancel an OPEN action', async () => {
    const created = await create({ description: 'to cancel' });
    const id = created.body.data.id;
    const res = await request(app)
      .post(`${base()}/${id}/cancel`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CANCELLED');

    const complete = await request(app)
      .post(`${base()}/${id}/complete`)
      .set('Authorization', `Bearer ${staff.token}`)
      .send({ result: 'x' });
    expect(complete.status).toBe(409);
    expect(complete.body.error.code).toBe('ACTION_NOT_EDITABLE');
  });

  it('API-08: authorization and masking', async () => {
    const created = await create({ description: 'auth check' });
    const id = created.body.data.id;

    expect((await request(app).get(base())).status).toBe(401);
    expect((await request(app).post(base()).send({ description: 'x' })).status).toBe(401);

    const asRequester = await request(app).get(base()).set('Authorization', `Bearer ${owner.token}`);
    expect(asRequester.status).toBe(403);
    expect(
      (await request(app).post(base()).set('Authorization', `Bearer ${owner.token}`).send({ description: 'x' })).status
    ).toBe(403);
    expect(
      (await request(app).post(`${base()}/${id}/cancel`).set('Authorization', `Bearer ${owner.token}`)).status
    ).toBe(403);

    const missingTicket = await request(app)
      .get('/api/staff/tickets/99999999/actions')
      .set('Authorization', `Bearer ${staff.token}`);
    expect(missingTicket.status).toBe(404);
    expect(missingTicket.body.error.code).toBe('TICKET_NOT_FOUND');

    const missingAction = await request(app)
      .patch(`${base()}/99999999`)
      .set('Authorization', `Bearer ${staff.token}`)
      .send({ description: 'x' });
    expect(missingAction.status).toBe(404);
    expect(missingAction.body.error.code).toBe('ACTION_NOT_FOUND');
  });

  it('API-09: requester reads actions of an owned ticket only', async () => {
    const ownerRes = await request(app)
      .get(`/api/tickets/${ticketId}/actions`)
      .set('Authorization', `Bearer ${owner.token}`);
    expect(ownerRes.status).toBe(200);
    expect(ownerRes.body.data.actions.length).toBeGreaterThan(0);

    const otherRes = await request(app)
      .get(`/api/tickets/${ticketId}/actions`)
      .set('Authorization', `Bearer ${other.token}`);
    const missing = await request(app)
      .get('/api/tickets/99999999/actions')
      .set('Authorization', `Bearer ${other.token}`);
    expect(otherRes.status).toBe(404);
    expect(otherRes.body).toEqual(missing.body);

    const staffRes = await request(app)
      .get(`/api/tickets/${ticketId}/actions`)
      .set('Authorization', `Bearer ${staff.token}`);
    expect(staffRes.status).toBe(200);
  });
});
