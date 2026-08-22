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
    // Attempt to access tickets API without X-Dev-Requester-Id header
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
