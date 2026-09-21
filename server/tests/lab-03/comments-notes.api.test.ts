import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app';

describe('Issue 5: Internal Notes & Staff Public Comments Access API Tests', () => {
  let staffToken: string;
  let adminToken: string;
  let requesterToken: string;
  let requesterId: number;
  let ticketId: number;

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
    requesterId = requesterLogin.body.data.user.id;

    const createRes = await request(app)
      .post('/api/tickets')
      .set('X-Dev-Requester-Id', requesterId.toString())
      .send({
        summary: 'Issue 5 comments/notes test fixture',
        description: 'Created for Public Comments (staff access) and Internal Notes API tests',
        categoryId: 1,
        relatedSystemId: 1,
        requestedPriority: 'LOW',
      });
    ticketId = createRes.body.data.id;
  });

  describe('Public Comments — now shared with IT Staff/Administrator (BR-06)', () => {
    it('IT Staff can GET comments on a ticket they do not own', async () => {
      const res = await request(app)
        .get(`/api/tickets/${ticketId}/comments`)
        .set('Authorization', `Bearer ${staffToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('IT Staff can POST a comment on a ticket they do not own', async () => {
      const res = await request(app)
        .post(`/api/tickets/${ticketId}/comments`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ body: 'We are looking into this now.' });

      expect(res.status).toBe(201);
      expect(res.body.data.content).toContain('looking into this');
    });

    it('Administrator can GET and POST comments on any ticket', async () => {
      const postRes = await request(app)
        .post(`/api/tickets/${ticketId}/comments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ body: 'Escalating priority per manager request.' });
      expect(postRes.status).toBe(201);

      const getRes = await request(app)
        .get(`/api/tickets/${ticketId}/comments`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(getRes.status).toBe(200);
    });

    it('a staff-posted comment does not trigger the Requester-only appearsResolved signal', async () => {
      const res = await request(app)
        .post(`/api/tickets/${ticketId}/comments`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ body: 'Trying to mark this resolved as staff.', appearsResolved: true });

      expect(res.status).toBe(201);
      expect(res.body.data.appearsResolvedAt).toBeNull();
    });

    it('a Requester still cannot view or post comments on a ticket they do not own', async () => {
      const otherRequesterLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: 'michael.brown@example.com', password: 'InitialPassword123!' });
      const otherToken = otherRequesterLogin.body.data.token;

      const getRes = await request(app)
        .get(`/api/tickets/${ticketId}/comments`)
        .set('Authorization', `Bearer ${otherToken}`);
      expect(getRes.status).toBe(404);

      const postRes = await request(app)
        .post(`/api/tickets/${ticketId}/comments`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ body: 'Should not be allowed.' });
      expect(postRes.status).toBe(404);
    });
  });

  describe('Internal Notes — strictly IT Staff/Administrator only (BR-10, AC-04)', () => {
    it('IT Staff can post an Internal Note', async () => {
      const res = await request(app)
        .post(`/api/staff/tickets/${ticketId}/internal-notes`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ content: 'Diagnostic: confirmed hardware fault on inspection.' });

      expect(res.status).toBe(201);
      expect(res.body.data.content).toContain('hardware fault');
      expect(res.body.data.author.id).toBeDefined();
    });

    it('Administrator can post and retrieve Internal Notes', async () => {
      const postRes = await request(app)
        .post(`/api/staff/tickets/${ticketId}/internal-notes`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ content: 'Approved replacement part order.' });
      expect(postRes.status).toBe(201);

      const getRes = await request(app)
        .get(`/api/staff/tickets/${ticketId}/internal-notes`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('rejects empty or whitespace-only note content with 400', async () => {
      const res = await request(app)
        .post(`/api/staff/tickets/${ticketId}/internal-notes`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ content: '   ' });
      expect(res.status).toBe(400);
    });

    it('AC-04: rejects Requester GET of Internal Notes with 403, exposing no note content', async () => {
      const res = await request(app)
        .get(`/api/staff/tickets/${ticketId}/internal-notes`)
        .set('Authorization', `Bearer ${requesterToken}`);

      expect(res.status).toBe(403);
      expect(res.body.data).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain('hardware fault');
    });

    it('AC-04: rejects Requester POST of an Internal Note with 403', async () => {
      const res = await request(app)
        .post(`/api/staff/tickets/${ticketId}/internal-notes`)
        .set('Authorization', `Bearer ${requesterToken}`)
        .send({ content: 'A requester should never be able to write this.' });

      expect(res.status).toBe(403);
    });

    it('rejects unauthenticated access with 401', async () => {
      const res = await request(app).get(`/api/staff/tickets/${ticketId}/internal-notes`);
      expect(res.status).toBe(401);
    });
  });
});
