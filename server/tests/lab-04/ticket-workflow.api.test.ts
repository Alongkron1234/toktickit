import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';

const PASSWORD = 'InitialPassword123!';

async function login(email: string) {
  const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD });
  return { token: res.body.data.token as string, id: res.body.data.user.id as number };
}

describe('Lab 4 Ticket workflow API', () => {
  let staff: { token: string; id: number };
  let staff2: { token: string; id: number };
  let owner: { token: string; id: number };
  let other: { token: string; id: number };

  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

  async function newTicket() {
    const res = await request(app)
      .post('/api/tickets')
      .set('X-Dev-Requester-Id', owner.id.toString())
      .send({
        summary: 'Workflow fixture',
        description: 'Fixture ticket for workflow tests',
        categoryId: 1,
        relatedSystemId: 1,
        requestedPriority: 'LOW',
      });
    return res.body.data.id as number;
  }
  const getStaff = (id: number, token = staff.token) =>
    request(app).get(`/api/staff/tickets/${id}`).set(auth(token));
  const setStatus = (id: number, body: object, token = staff.token) =>
    request(app).patch(`/api/staff/tickets/${id}/status`).set(auth(token)).send(body);

  /** Moves a ticket through the given statuses using fresh versions. */
  async function advance(id: number, ...statuses: string[]) {
    for (const status of statuses) {
      const v = (await getStaff(id)).body.data.version;
      const res = await setStatus(id, { status, expectedVersion: v, ...(status === 'RESOLVED' ? { resolutionSummary: 'Fixed it' } : {}) });
      expect(res.status, `${status}: ${JSON.stringify(res.body)}`).toBe(200);
    }
  }

  beforeAll(async () => {
    staff = await login('alex.thompson@toktickit.com');
    staff2 = await login('kevin.patel@toktickit.com');
    owner = await login('jennifer.anderson@example.com');
    other = await login('michael.brown@example.com');
  });

  it('API-14: staff GET returns version, allowedTransitions and openActionsCount', async () => {
    const id = await newTicket();
    const res = await getStaff(id);
    expect(res.status).toBe(200);
    expect(res.body.data.version).toBe(0);
    expect(res.body.data.allowedTransitions).toEqual(['OPEN', 'CANCELLED']);
    expect(res.body.data.openActionsCount).toBe(0);

    await request(app)
      .post(`/api/staff/tickets/${id}/actions`)
      .set(auth(staff.token))
      .send({ description: 'Open action' });
    expect((await getStaff(id)).body.data.openActionsCount).toBe(1);
  });

  it('API-09 (allowed path): the full allowed path succeeds and the version increases by 1 each time', async () => {
    const id = await newTicket();
    let expected = 0;
    for (const status of ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']) {
      const res = await setStatus(id, { status, expectedVersion: expected, resolutionSummary: 'Fixed it' });
      expect(res.status, status).toBe(200);
      expect(res.body.data.currentStatus).toBe(status);
      expected += 1;
      expect(res.body.data.version).toBe(expected);
      expect(Array.isArray(res.body.data.allowedTransitions)).toBe(true);
    }
  });

  it('API-09 (illegal): illegal transitions are rejected with 409', async () => {
    const id = await newTicket();
    const v = (await getStaff(id)).body.data.version;
    for (const status of ['RESOLVED', 'CLOSED', 'IN_PROGRESS', 'REOPENED', 'NEW']) {
      const res = await setStatus(id, { status, expectedVersion: v, resolutionSummary: 'x' });
      expect(res.status, status).toBe(409);
      expect(res.body.error.code).toBe('ILLEGAL_STATUS_TRANSITION');
    }
    await advance(id, 'CANCELLED');
    const terminal = await setStatus(id, { status: 'OPEN', expectedVersion: (await getStaff(id)).body.data.version });
    expect(terminal.status).toBe(409);
    expect(terminal.body.error.code).toBe('ILLEGAL_STATUS_TRANSITION');
  });

  it('API-09 (staff reopen): staff may reopen a RESOLVED ticket but not a CLOSED one', async () => {
    const id = await newTicket();
    await advance(id, 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'REOPENED');
    expect((await getStaff(id)).body.data.currentStatus).toBe('REOPENED');

    const id2 = await newTicket();
    await advance(id2, 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
    const res = await setStatus(id2, { status: 'REOPENED', expectedVersion: (await getStaff(id2)).body.data.version });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ILLEGAL_STATUS_TRANSITION');
  });

  it('API-10: resolution gate blocks RESOLVED for open actions and a missing summary, even via direct API', async () => {
    const id = await newTicket();
    await advance(id, 'OPEN', 'IN_PROGRESS');
    const created = await request(app)
      .post(`/api/staff/tickets/${id}/actions`)
      .set(auth(staff.token))
      .send({ description: 'Still working' });
    const actionId = created.body.data.id;

    const both = await setStatus(id, { status: 'RESOLVED', expectedVersion: (await getStaff(id)).body.data.version });
    expect(both.status).toBe(409);
    expect(both.body.error.code).toBe('RESOLUTION_GATE_FAILED');
    expect(both.body.error.details).toEqual([
      { reason: 'OPEN_ACTIONS', count: 1 },
      { reason: 'MISSING_RESOLUTION_SUMMARY' },
    ]);
    expect((await getStaff(id)).body.data.currentStatus).toBe('IN_PROGRESS');

    const onlyAction = await setStatus(id, {
      status: 'RESOLVED',
      resolutionSummary: 'Done',
      expectedVersion: (await getStaff(id)).body.data.version,
    });
    expect(onlyAction.body.error.details).toEqual([{ reason: 'OPEN_ACTIONS', count: 1 }]);

    await request(app)
      .post(`/api/staff/tickets/${id}/actions/${actionId}/cancel`)
      .set(auth(staff.token));
    const noSummary = await setStatus(id, { status: 'RESOLVED', expectedVersion: (await getStaff(id)).body.data.version });
    expect(noSummary.body.error.details).toEqual([{ reason: 'MISSING_RESOLUTION_SUMMARY' }]);

    const ok = await setStatus(id, {
      status: 'RESOLVED',
      resolutionSummary: '  Battery replaced  ',
      expectedVersion: (await getStaff(id)).body.data.version,
    });
    expect(ok.status).toBe(200);
    expect(ok.body.data.resolutionSummary).toBe('Battery replaced');
  });

  it('API-10 (stored summary): a stored resolution summary satisfies the gate', async () => {
    const id = await newTicket();
    await advance(id, 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'REOPENED', 'IN_PROGRESS');
    const res = await setStatus(id, { status: 'RESOLVED', expectedVersion: (await getStaff(id)).body.data.version });
    expect(res.status).toBe(200);
  });

  it('API-13: stale update returns 409 STALE_UPDATE and does not overwrite the newer change', async () => {
    const id = await newTicket();
    const staleVersion = (await getStaff(id)).body.data.version;
    const a = await setStatus(id, { status: 'OPEN', expectedVersion: staleVersion }, staff.token);
    expect(a.status).toBe(200);
    const b = await setStatus(id, { status: 'CANCELLED', expectedVersion: staleVersion }, staff2.token);
    expect(b.status).toBe(409);
    expect(b.body.error.code).toBe('STALE_UPDATE');
    expect(b.body.error.currentVersion).toBe(staleVersion + 1);
    expect((await getStaff(id)).body.data.currentStatus).toBe('OPEN');
  });

  it('API-09 (validation): validation, authentication and not-found', async () => {
    const id = await newTicket();
    const v = (await getStaff(id)).body.data.version;
    expect((await setStatus(id, { status: 'BOGUS', expectedVersion: v })).status).toBe(400);
    expect((await setStatus(id, { status: 'OPEN' })).status).toBe(400);
    expect((await setStatus(id, { status: 'OPEN', expectedVersion: 'x' })).status).toBe(400);
    expect((await setStatus(id, { status: 'OPEN', expectedVersion: -1 })).status).toBe(400);
    expect((await request(app).patch(`/api/staff/tickets/${id}/status`).send({ status: 'OPEN', expectedVersion: v })).status).toBe(401);
    expect((await setStatus(99999999, { status: 'OPEN', expectedVersion: 0 })).status).toBe(404);
    expect((await setStatus(id, { status: 'OPEN', expectedVersion: v, resolutionSummary: 'x'.repeat(2001) })).status).toBe(400);
  });

  it('API-11: a Requester cannot use the staff status endpoint or set RESOLVED/CLOSED', async () => {
    const id = await newTicket();
    const staffEndpoint = await setStatus(id, { status: 'RESOLVED', expectedVersion: 0 }, owner.token);
    expect(staffEndpoint.status).toBe(403);

    for (const status of ['RESOLVED', 'CLOSED', 'IN_PROGRESS']) {
      const res = await request(app)
        .patch(`/api/tickets/${id}/status`)
        .set('X-Dev-Requester-Id', owner.id.toString())
        .send({ status });
      expect(res.status, status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_STATUS_TRANSITION');
    }
    expect((await getStaff(id)).body.data.currentStatus).toBe('NEW');
  });

  it('API-12: a Requester can reopen only their own RESOLVED ticket; version increases', async () => {
    const id = await newTicket();
    await advance(id, 'OPEN', 'IN_PROGRESS', 'RESOLVED');
    const before = (await getStaff(id)).body.data.version;

    const notOwner = await request(app)
      .patch(`/api/tickets/${id}/status`)
      .set('X-Dev-Requester-Id', other.id.toString())
      .send({ status: 'REOPENED' });
    expect(notOwner.status).toBe(403);

    const stale = await request(app)
      .patch(`/api/tickets/${id}/status`)
      .set('X-Dev-Requester-Id', owner.id.toString())
      .send({ status: 'REOPENED', expectedVersion: before - 1 });
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('STALE_UPDATE');

    const ok = await request(app)
      .patch(`/api/tickets/${id}/status`)
      .set('X-Dev-Requester-Id', owner.id.toString())
      .send({ status: 'REOPENED', expectedVersion: before });
    expect(ok.status).toBe(200);
    expect(ok.body.data.currentStatus).toBe('REOPENED');
    expect((await getStaff(id)).body.data.version).toBe(before + 1);
  });

  it('API-13 (ownership/priority): ownership and priority changes increment version and honor expectedVersion', async () => {
    const id = await newTicket();
    const v0 = (await getStaff(id)).body.data.version;

    const owned = await request(app)
      .patch(`/api/staff/tickets/${id}/ownership`)
      .set(auth(staff.token))
      .send({ ownerId: staff.id, expectedVersion: v0 });
    expect(owned.status).toBe(200);
    expect((await getStaff(id)).body.data.version).toBe(v0 + 1);

    const staleOwner = await request(app)
      .patch(`/api/staff/tickets/${id}/ownership`)
      .set(auth(staff2.token))
      .send({ ownerId: staff2.id, expectedVersion: v0 });
    expect(staleOwner.status).toBe(409);
    expect(staleOwner.body.error.code).toBe('STALE_UPDATE');
    expect((await getStaff(id)).body.data.owner.id).toBe(staff.id);

    const prio = await request(app)
      .patch(`/api/staff/tickets/${id}/priority`)
      .set(auth(staff.token))
      .send({ itPriority: 'HIGH', expectedVersion: v0 + 1 });
    expect(prio.status).toBe(200);
    const stalePrio = await request(app)
      .patch(`/api/staff/tickets/${id}/priority`)
      .set(auth(staff2.token))
      .send({ itPriority: 'LOW', expectedVersion: v0 + 1 });
    expect(stalePrio.status).toBe(409);
    expect((await getStaff(id)).body.data.itPriority).toBe('HIGH');

    // expectedVersion stays optional for these two endpoints
    const noVersion = await request(app)
      .patch(`/api/staff/tickets/${id}/priority`)
      .set(auth(staff.token))
      .send({ itPriority: 'MEDIUM' });
    expect(noVersion.status).toBe(200);
    expect((await getStaff(id)).body.data.version).toBe(v0 + 3);
  });

  it('API-11 (advisory): "Problem Appears Resolved" is advisory and never changes status or version', async () => {
    const id = await newTicket();
    await advance(id, 'OPEN', 'IN_PROGRESS');
    const before = (await getStaff(id)).body.data;
    const res = await request(app)
      .post(`/api/tickets/${id}/comments`)
      .set('X-Dev-Requester-Id', owner.id.toString())
      .send({ content: 'It seems fixed now', appearsResolved: true });
    expect(res.status).toBe(201);
    const after = (await getStaff(id)).body.data;
    expect(after.currentStatus).toBe(before.currentStatus);
    expect(after.version).toBe(before.version);
    expect(after.appearsResolvedAt).not.toBeNull();
  });
});
