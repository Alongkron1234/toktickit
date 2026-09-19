import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app, prisma } from '../../src/app';

describe('Issue 5: IT Staff Ticket Operations API Tests', () => {
  let staffToken: string;
  let staffId: number;
  let adminToken: string;
  let requesterToken: string;
  let requesterId: number;
  let inactiveStaffId: number;
  let ticketId: number;
  let ticketNumber: string;

  beforeAll(async () => {
    const staffLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alex.thompson@toktickit.com', password: 'InitialPassword123!' });
    staffToken = staffLogin.body.data.token;
    staffId = staffLogin.body.data.user.id;

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'john.smith@toktickit.com', password: 'InitialPassword123!' });
    adminToken = adminLogin.body.data.token;

    const requesterLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'jennifer.anderson@example.com', password: 'InitialPassword123!' });
    requesterToken = requesterLogin.body.data.token;
    requesterId = requesterLogin.body.data.user.id;

    const inactiveStaff = await prisma.user.findUnique({ where: { email: 'emily.davis@toktickit.com' } });
    inactiveStaffId = inactiveStaff!.id;

    const createRes = await request(app)
      .post('/api/tickets')
      .set('X-Dev-Requester-Id', requesterId.toString())
      .send({
        summary: 'Issue 5 staff ticket operations test fixture',
        description: 'Created for staff ownership/priority/status API tests',
        categoryId: 1,
        relatedSystemId: 1,
        requestedPriority: 'MEDIUM',
      });
    ticketId = createRes.body.data.id;
    ticketNumber = createRes.body.data.ticketNumber;
  });

  describe('GET /api/staff/tickets/:id', () => {
    it('returns ticket detail for IT Staff', async () => {
      const res = await request(app)
        .get(`/api/staff/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(ticketId);
      expect(res.body.data.requester).toBeDefined();
      expect(res.body.data.attachments).toBeDefined();
    });

    it('returns ticket detail for Administrator', async () => {
      const res = await request(app)
        .get(`/api/staff/tickets/${ticketNumber}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.ticketNumber).toBe(ticketNumber);
    });

    it('rejects Requester with 403', async () => {
      const res = await request(app)
        .get(`/api/staff/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${requesterToken}`);
      expect(res.status).toBe(403);
    });

    it('rejects unauthenticated access with 401', async () => {
      const res = await request(app).get(`/api/staff/tickets/${ticketId}`);
      expect(res.status).toBe(401);
    });

    it('returns 404 for an unknown ticket', async () => {
      const res = await request(app)
        .get('/api/staff/tickets/999999')
        .set('Authorization', `Bearer ${staffToken}`);
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/staff/members', () => {
    it('lists only active IT_STAFF and ADMINISTRATOR accounts', async () => {
      const res = await request(app)
        .get('/api/staff/members')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      for (const m of res.body.data) {
        expect(['IT_STAFF', 'ADMINISTRATOR']).toContain(m.role);
      }
      expect(res.body.data.find((m: any) => m.email === 'emily.davis@toktickit.com')).toBeUndefined();
      expect(res.body.data.find((m: any) => m.email === 'jennifer.anderson@example.com')).toBeUndefined();
    });

    it('rejects Requester with 403', async () => {
      const res = await request(app)
        .get('/api/staff/members')
        .set('Authorization', `Bearer ${requesterToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/staff/tickets/:id/ownership', () => {
    it('claims a ticket by setting ownerId to self', async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${ticketId}/ownership`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ ownerId: staffId });

      expect(res.status).toBe(200);
      expect(res.body.data.ownerId).toBe(staffId);
      expect(res.body.data.owner.id).toBe(staffId);
    });

    it('rejects an ownerId that belongs to a Requester', async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${ticketId}/ownership`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ ownerId: requesterId });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_OWNER');
    });

    it('rejects an ownerId that belongs to an inactive IT Staff account', async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${ticketId}/ownership`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ ownerId: inactiveStaffId });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_OWNER');
    });

    it('rejects a non-integer ownerId', async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${ticketId}/ownership`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ ownerId: 'not-a-number' });

      expect(res.status).toBe(400);
    });

    it('rejects Requester with 403', async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${ticketId}/ownership`)
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({ ownerId: staffId });

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/staff/tickets/:id/priority', () => {
    it('updates itPriority to a valid value without touching requestedPriority', async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${ticketId}/priority`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ itPriority: 'high' });

      expect(res.status).toBe(200);
      expect(res.body.data.itPriority).toBe('HIGH');
      expect(res.body.data.requestedPriority).toBe('MEDIUM');
    });

    it('rejects an invalid priority value', async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${ticketId}/priority`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ itPriority: 'URGENT' });

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /api/staff/tickets/:id/status - permitted workflow transitions', () => {
    it('walks a ticket through NEW -> OPEN -> IN_PROGRESS -> WAITING_FOR_REQUESTER -> RESOLVED -> CLOSED', async () => {
      let res = await request(app)
        .patch(`/api/staff/tickets/${ticketId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'OPEN' });
      expect(res.status).toBe(200);
      expect(res.body.data.currentStatus).toBe('OPEN');

      res = await request(app)
        .patch(`/api/staff/tickets/${ticketId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'IN_PROGRESS' });
      expect(res.status).toBe(200);
      expect(res.body.data.currentStatus).toBe('IN_PROGRESS');

      res = await request(app)
        .patch(`/api/staff/tickets/${ticketId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'WAITING_FOR_REQUESTER' });
      expect(res.status).toBe(200);
      expect(res.body.data.currentStatus).toBe('WAITING_FOR_REQUESTER');

      res = await request(app)
        .patch(`/api/staff/tickets/${ticketId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'RESOLVED', resolutionSummary: 'Fixed by replacing the faulty part.' });
      expect(res.status).toBe(200);
      expect(res.body.data.currentStatus).toBe('RESOLVED');
      expect(res.body.data.resolutionSummary).toBe('Fixed by replacing the faulty part.');

      res = await request(app)
        .patch(`/api/staff/tickets/${ticketId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'CLOSED' });
      expect(res.status).toBe(200);
      expect(res.body.data.currentStatus).toBe('CLOSED');

      // CLOSED is terminal for staff-initiated transitions
      res = await request(app)
        .patch(`/api/staff/tickets/${ticketId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'OPEN' });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ILLEGAL_STATUS_TRANSITION');
    });

    it('rejects an illegal direct jump (NEW -> CLOSED) with 409', async () => {
      const createRes = await request(app)
        .post('/api/tickets')
        .set('X-Dev-Requester-Id', requesterId.toString())
        .send({
          summary: 'Illegal transition test fixture',
          description: 'Should not be closeable directly from NEW',
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: 'LOW',
        });
      const freshTicketId = createRes.body.data.id;

      const res = await request(app)
        .patch(`/api/staff/tickets/${freshTicketId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'CLOSED' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ILLEGAL_STATUS_TRANSITION');
    });

    it('rejects an invalid status enum value with 400', async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${ticketId}/status`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'ARCHIVED' });

      expect(res.status).toBe(400);
    });

    it('rejects Requester with 403', async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${ticketId}/status`)
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({ status: 'OPEN' });

      expect(res.status).toBe(403);
    });
  });
});
