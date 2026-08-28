import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';

describe('Ticket Detail API & Ownership Access Control (Lab 2 - Issue 8)', () => {
  it('API-07a: GET /api/tickets/:id should return 200 OK with full ticket details when requested by owner', async () => {
    // 1. Fetch ticket details for Jennifer Anderson (Requester ID: 1) on ticket 1
    const res = await request(app)
      .get('/api/tickets/1')
      .set('X-Dev-Requester-Id', '1');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.data).toHaveProperty('id', 1);
    expect(res.body.data).toHaveProperty('ticketNumber');
    expect(res.body.data).toHaveProperty('summary');
    expect(res.body.data).toHaveProperty('description');
    expect(res.body.data).toHaveProperty('category');
    expect(res.body.data).toHaveProperty('relatedSystem');
    expect(res.body.data).toHaveProperty('attachments');
    expect(Array.isArray(res.body.data.attachments)).toBe(true);
  });

  it('API-07b: GET /api/tickets/:id should return HTTP 403 Forbidden when accessed by non-owner requester', async () => {
    // Ticket ID 1 belongs to Requester 1 (Jennifer Anderson).
    // Attempt to access Ticket ID 1 using Requester 2 (Michael Brown).
    const res = await request(app)
      .get('/api/tickets/1')
      .set('X-Dev-Requester-Id', '2');

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.error.message).toMatch(/do not have permission/i);
  });

  it('GET /api/tickets/:id should return HTTP 404 Not Found for non-existent ticket ID', async () => {
    const res = await request(app)
      .get('/api/tickets/999999')
      .set('X-Dev-Requester-Id', '1');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('success', false);
    expect(res.body.error.message).toMatch(/not found/i);
  });
});
