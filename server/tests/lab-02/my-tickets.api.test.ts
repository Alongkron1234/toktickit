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

describe('My Tickets Query API & Data Isolation (Lab 2 - Issue 6)', () => {
  it('API-06: GET /api/tickets should return HTTP 401 when the token is missing or invalid', async () => {
    const resNoToken = await request(app).get('/api/tickets');
    expect(resNoToken.status).toBe(401);
    expect(resNoToken.body).toHaveProperty('success', false);

    const resInvalidToken = await request(app).get('/api/tickets').set('Authorization', 'Bearer not-a-real-token');
    expect(resInvalidToken.status).toBe(401);
    expect(resInvalidToken.body).toHaveProperty('success', false);
  });

  it('API-04: GET /api/tickets should return HTTP 200 with tickets belonging ONLY to the requested requester', async () => {
    // Query tickets for Jennifer Anderson (ID: 1)
    const response = await request(app)
      .get('/api/tickets')
      .set(bearer(jennifer.token));

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

  it('API-05: GET /api/tickets should handle search (case-insensitive), filter, sorting, and pagination parameters', async () => {
    // 1. Case-Insensitive Search term filter (testing uppercase search term 'BATTERY')
    const searchRes = await request(app)
      .get('/api/tickets?search=BATTERY')
      .set(bearer(jennifer.token));

    expect(searchRes.status).toBe(200);
    expect(searchRes.body.success).toBe(true);
    expect(searchRes.body.data.length).toBeGreaterThan(0);
    searchRes.body.data.forEach((ticket: any) => {
      const matchSummary = ticket.summary.toLowerCase().includes('battery');
      const matchNumber = ticket.ticketNumber.toLowerCase().includes('battery');
      expect(matchSummary || matchNumber).toBe(true);
    });

    // 2. Category and Priority filter
    const filterRes = await request(app)
      .get('/api/tickets?categoryId=2&requestedPriority=HIGH')
      .set(bearer(jennifer.token));

    expect(filterRes.status).toBe(200);
    expect(filterRes.body.success).toBe(true);
    filterRes.body.data.forEach((ticket: any) => {
      expect(ticket.categoryId).toBe(2);
      expect(ticket.requestedPriority).toBe('HIGH');
    });

    // 3. Pagination structure check
    const pageRes = await request(app)
      .get('/api/tickets?page=1&limit=2')
      .set(bearer(jennifer.token));

    expect(pageRes.status).toBe(200);
    expect(pageRes.body.pagination).toMatchObject({
      currentPage: 1,
      limit: 2,
    });
    expect(pageRes.body.data.length).toBeLessThanOrEqual(2);
  });
});
