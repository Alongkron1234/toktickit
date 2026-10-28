import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { loginAs, bearer, TestUser } from '../helpers/auth';

describe('Issue 3: Public Comments & Resolution Signal API Tests', () => {
  let requester: TestUser;
  let other: TestUser;
  let testTicketNumber: string;

  beforeAll(async () => {
    // 1. Log in the seeded requesters (identity comes from the token)
    requester = await loginAs('jennifer.anderson@example.com');
    other = await loginAs('michael.brown@example.com');

    // 2. Fetch requester's tickets
    const ticketsRes = await request(app)
      .get('/api/tickets')
      .set(bearer(requester.token));
    expect(ticketsRes.status).toBe(200);
    const tickets = ticketsRes.body.data || [];
    if (tickets.length > 0) {
      testTicketNumber = tickets[0].ticketNumber || tickets[0].id.toString();
    } else {
      // Create a ticket if none exists
      const createRes = await request(app)
        .post('/api/tickets')
        .set(bearer(requester.token))
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
      .set(bearer(requester.token));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('API-COM-02: Should post a public comment to an owned ticket', async () => {
    const res = await request(app)
      .post(`/api/tickets/${testTicketNumber}/comments`)
      .set(bearer(requester.token))
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
      .set(bearer(requester.token))
      .send({
        body: '   ',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('API-COM-04: Should post comment with problem-appears-resolved signal', async () => {
    const res = await request(app)
      .post(`/api/tickets/${testTicketNumber}/comments`)
      .set(bearer(requester.token))
      .send({
        body: 'Everything looks good now - problem appears resolved.',
        appearsResolved: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.appearsResolvedAt).not.toBeNull();
  });

  it('API-COM-05: Should return masked 404 if accessing comments of another user ticket', async () => {
    const res = await request(app)
      .get(`/api/tickets/${testTicketNumber}/comments`)
      .set(bearer(other.token));

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
