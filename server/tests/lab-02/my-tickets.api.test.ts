import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';

describe('My Tickets Query API & Data Isolation (Lab 2 - Issue 6)', () => {
  it('API-06: GET /api/tickets should return HTTP 403 when X-Dev-Requester-Id header is missing or invalid', async () => {
    // 1. Missing header
    const resNoHeader = await request(app).get('/api/tickets');
    expect(resNoHeader.status).toBe(403);
    expect(resNoHeader.body).toHaveProperty('success', false);
    expect(resNoHeader.body.error.message).toMatch(/X-Dev-Requester-Id header is required/i);

    // 2. Inactive or invalid requester ID
    const resInvalidHeader = await request(app)
      .get('/api/tickets')
      .set('X-Dev-Requester-Id', '99999');
    expect(resInvalidHeader.status).toBe(403);
    expect(resInvalidHeader.body).toHaveProperty('success', false);
    expect(resInvalidHeader.body.error.message).toMatch(/invalid or inactive/i);
  });

  it('API-04: GET /api/tickets should return HTTP 200 with tickets belonging ONLY to the requested requester', async () => {
    // Query tickets for Jennifer Anderson (ID: 1)
    const response = await request(app)
      .get('/api/tickets')
      .set('X-Dev-Requester-Id', '1');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body).toHaveProperty('pagination');

    const tickets = response.body.data;
    // Data Isolation Check: All returned tickets must belong to requesterId = 1
    tickets.forEach((ticket: any) => {
      expect(ticket.requesterId).toBe(1);
    });
  });

  it('API-05: GET /api/tickets should handle search, filter, sorting, and pagination parameters', async () => {
    // 1. Search term filter
    const searchRes = await request(app)
      .get('/api/tickets?search=battery')
      .set('X-Dev-Requester-Id', '1');

    expect(searchRes.status).toBe(200);
    expect(searchRes.body.success).toBe(true);

    // 2. Category and Priority filter
    const filterRes = await request(app)
      .get('/api/tickets?categoryId=2&requestedPriority=HIGH')
      .set('X-Dev-Requester-Id', '1');

    expect(filterRes.status).toBe(200);
    expect(filterRes.body.success).toBe(true);
    filterRes.body.data.forEach((ticket: any) => {
      expect(ticket.categoryId).toBe(2);
      expect(ticket.requestedPriority).toBe('HIGH');
    });

    // 3. Pagination structure check
    const pageRes = await request(app)
      .get('/api/tickets?page=1&limit=2')
      .set('X-Dev-Requester-Id', '1');

    expect(pageRes.status).toBe(200);
    expect(pageRes.body.pagination).toMatchObject({
      currentPage: 1,
      limit: 2,
    });
    expect(pageRes.body.data.length).toBeLessThanOrEqual(2);
  });
});
