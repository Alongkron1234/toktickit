import request from 'supertest';
import { app } from '../../src/app';

export const SEED_PASSWORD = 'InitialPassword123!';

export interface TestUser {
  token: string;
  id: number;
}

// Logs in a seeded account and returns its bearer token and id.
export async function loginAs(email: string): Promise<TestUser> {
  const res = await request(app).post('/api/auth/login').send({ email, password: SEED_PASSWORD });
  return { token: res.body.data.token as string, id: res.body.data.user.id as number };
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
