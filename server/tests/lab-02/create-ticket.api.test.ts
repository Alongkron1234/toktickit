import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';

describe('Development Requester API & Context Middleware (Lab 2 - Issue 3)', () => {
  it('GET /api/requesters should return HTTP 200 with only active requesters', async () => {
    const response = await request(app).get('/api/requesters');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(Array.isArray(response.body.data)).toBe(true);

    const requesters = response.body.data;
    expect(requesters.length).toBeGreaterThan(0);

    // All returned requesters must have isActive = true
    requesters.forEach((req: { id: number; name: string; email: string; isActive: boolean }) => {
      expect(req.isActive).toBe(true);
      expect(req.email).not.toBe('robert.taylor@example.com'); // Robert Taylor is inactive in seed
    });
  });

  it('Protected endpoints should return HTTP 403 when X-Dev-Requester-Id header is missing', async () => {
    const response = await request(app).get('/api/tickets');
    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body.error.message).toMatch(/X-Dev-Requester-Id header is required/i);
  });

  it('Protected endpoints should return HTTP 403 when X-Dev-Requester-Id belongs to an invalid or inactive requester', async () => {
    const response = await request(app)
      .get('/api/tickets')
      .set('X-Dev-Requester-Id', '999999'); // Non-existent requester ID

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body.error.message).toMatch(/invalid or inactive/i);
  });
});

describe('Ticket Creation API & Backend Validation (Lab 2 - Issue 4)', () => {
  it('GET /api/related-systems should return HTTP 200 with active related systems', async () => {
    const response = await request(app).get('/api/related-systems');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
  });

  it('API-01: POST /api/tickets should create a valid ticket and auto-generate unique ticket number', async () => {
    const newTicketData = {
      categoryId: 1, // Account and Access
      relatedSystemId: 1, // Email
      summary: 'Unable to login to webmail account',
      requestedPriority: 'HIGH',
      description: 'Account gets locked out whenever I attempt to log in from my desktop browser.',
    };

    const response = await request(app)
      .post('/api/tickets')
      .set('X-Dev-Requester-Id', '1') // Jennifer Anderson
      .send(newTicketData);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('success', true);

    const ticket = response.body.data;
    expect(ticket).toHaveProperty('id');
    expect(ticket).toHaveProperty('ticketNumber');
    expect(ticket.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/); // TKT-YYYY-XXXXXX format
    expect(ticket.currentStatus).toBe('NEW');
    expect(ticket.summary).toBe('Unable to login to webmail account');
    expect(ticket.requestedPriority).toBe('HIGH');
    expect(ticket.requesterId).toBe(1);
  });

  it('API-02: POST /api/tickets should return HTTP 400 Bad Request when validation fails', async () => {
    // Missing summary and short description (<10 chars)
    const invalidTicketData = {
      categoryId: 1,
      relatedSystemId: 1,
      summary: '   ', // empty after trim
      requestedPriority: 'MEDIUM',
      description: 'Too short',
    };

    const response = await request(app)
      .post('/api/tickets')
      .set('X-Dev-Requester-Id', '1')
      .send(invalidTicketData);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    expect(Array.isArray(response.body.error.details)).toBe(true);
    expect(response.body.error.details.length).toBeGreaterThan(0);
  });
});
