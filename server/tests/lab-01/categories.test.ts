import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app';

describe('GET /api/categories', () => {
  it('should return HTTP 200 and the four seeded IT request categories', async () => {
    const response = await request(app).get('/api/categories');
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(4);
    expect(response.body).toEqual([
      { id: 1, name: 'Account and Access' },
      { id: 2, name: 'Hardware' },
      { id: 3, name: 'Software' },
      { id: 4, name: 'Network' },
    ]);
  });
});
