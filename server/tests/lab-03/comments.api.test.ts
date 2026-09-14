import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app';

describe('Issue 3: Public Comments & Resolution Signal API Tests', () => {
  let requesterId: number;
  let testTicketNumber: string;

  beforeAll(async () => {
    // 1. Fetch active requesters
    const reqRes = await request(app).get('/api/requesters');
    expect(reqRes.status).toBe(200);
    const requesters = reqRes.body.data || reqRes.body;
    requesterId = requesters[0].id;

    // 2. Fetch requester's tickets
    const ticketsRes = await request(app)
      .get('/api/tickets')
      .set('X-Dev-Requester-Id', requesterId.toString());
    expect(ticketsRes.status).toBe(200);
    const tickets = ticketsRes.body.data || [];
    if (tickets.length > 0) {
      testTicketNumber = tickets[0].ticketNumber || tickets[0].id.toString();
    } else {
      // Create a ticket if none exists
      const createRes = await request(app)
        .post('/api/tickets')
        .set('X-Dev-Requester-Id', requesterId.toString())
        .send({
          summary: 'Test Ticket for Comments API',
          description: 'Testing comments and resolution signal',
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: 'MEDIUM',
        });
      expect(createRes.status).toBe(201);
      testTicketNumber = createRes.body.data.ticketNumber || createRes.body.data.id.toString();
    }
  });

  it('API-COM-01: Should fetch comments for an owned ticket', async () => {
    const res = await request(app)
      .get(`/api/tickets/${testTicketNumber}/comments`)
      .set('X-Dev-Requester-Id', requesterId.toString());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('API-COM-02: Should post a public comment to an owned ticket', async () => {
    const res = await request(app)
      .post(`/api/tickets/${testTicketNumber}/comments`)
      .set('X-Dev-Requester-Id', requesterId.toString())
      .send({
        body: 'Hello, this is a test public comment.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.content || res.body.data.body).toContain('test public comment');
  });

  it('API-COM-03: Should reject empty or whitespace-only comment bodies with 400', async () => {
    const res = await request(app)
      .post(`/api/tickets/${testTicketNumber}/comments`)
      .set('X-Dev-Requester-Id', requesterId.toString())
      .send({
        body: '   ',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('API-COM-04: Should post comment with problem-appears-resolved signal', async () => {
    const res = await request(app)
      .post(`/api/tickets/${testTicketNumber}/comments`)
      .set('X-Dev-Requester-Id', requesterId.toString())
      .send({
        body: 'Everything looks good now - problem appears resolved.',
        appearsResolved: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.appearsResolvedAt).not.toBeNull();
  });

  it('API-COM-05: Should return masked 404 if accessing comments of another user ticket', async () => {
    const otherRequesterId = requesterId === 1 ? 2 : 1;
    const res = await request(app)
      .get(`/api/tickets/${testTicketNumber}/comments`)
      .set('X-Dev-Requester-Id', otherRequesterId.toString());

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
