import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../server/src/app';

describe('API-01: Health Endpoint', () => {
  it('should return 200 and expected JSON status', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      service: 'TokTickIT API',
    });
  });
});
