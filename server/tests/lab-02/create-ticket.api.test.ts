import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { loginAs, bearer, TestUser } from '../helpers/auth';

let jennifer: TestUser;
let michael: TestUser;

beforeAll(async () => {
  jennifer = await loginAs('jennifer.anderson@example.com');
  michael = await loginAs('michael.brown@example.com');
});

describe('Requester authentication on Lab 2 endpoints (Lab 2 - Issue 3, token-based since Lab 4)', () => {
  it('Protected endpoints should return HTTP 401 when the token is missing', async () => {
    const response = await request(app).get('/api/tickets');
    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('success', false);
  });

  it('Protected endpoints should return HTTP 401 when the token is invalid', async () => {
    const response = await request(app).get('/api/tickets').set('Authorization', 'Bearer not-a-real-token');
    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('success', false);
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
      .set(bearer(jennifer.token)) // Jennifer Anderson
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
      .set(bearer(jennifer.token))
      .send(invalidTicketData);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body.error).toHaveProperty('code', 'VALIDATION_ERROR');
    expect(Array.isArray(response.body.error.details)).toBe(true);
    expect(response.body.error.details.length).toBeGreaterThan(0);
  });
});
