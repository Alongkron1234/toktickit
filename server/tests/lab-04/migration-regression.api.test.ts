import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { execSync } from 'child_process';
import { app, prisma } from '../../src/app';

async function counts() {
  return {
    users: await prisma.user.count(),
    tickets: await prisma.ticket.count(),
    attachments: await prisma.attachment.count(),
    publicComments: await prisma.publicComment.count(),
    internalNotes: await prisma.internalNote.count(),
    actions: await prisma.actionTaken.count(),
  };
}

describe('Lab 4 migration regression', () => {
  let staffToken: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alex.thompson@toktickit.com', password: 'InitialPassword123!' });
    staffToken = res.body.data.token;
  });

  it('MIG-01: a legacy Ticket without actions lists empty and keeps its Lab 3 data', async () => {
    const legacy = await prisma.ticket.findUnique({ where: { ticketNumber: 'TKT-2026-001230' } });
    expect(legacy).not.toBeNull();
    const res = await request(app)
      .get(`/api/staff/tickets/${legacy!.id}/actions`)
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.actions).toEqual([]);

    const rich = await prisma.ticket.findUnique({
      where: { ticketNumber: 'TKT-2026-001234' },
      include: { publicComments: true, internalNotes: true, attachments: true },
    });
    expect(rich!.publicComments.length).toBeGreaterThanOrEqual(2);
    expect(rich!.internalNotes.length).toBeGreaterThanOrEqual(1);
    expect(rich!.attachments.length).toBeGreaterThanOrEqual(1);
  });

  it('MIG-02: running the seed twice leaves identical row counts and 0/1/many actions', async () => {
    execSync('npx tsx prisma/seed.ts', { cwd: process.cwd(), stdio: 'ignore' });
    const first = await counts();
    execSync('npx tsx prisma/seed.ts', { cwd: process.cwd(), stdio: 'ignore' });
    const second = await counts();
    expect(second).toEqual(first);

    const statuses = new Set((await prisma.actionTaken.findMany({ select: { status: true } })).map((a) => a.status));
    expect(statuses).toEqual(new Set(['OPEN', 'COMPLETED', 'CANCELLED']));

    const perTicket = await prisma.actionTaken.groupBy({ by: ['ticketId'], _count: { _all: true } });
    expect(perTicket.some((g) => g._count._all === 1)).toBe(true);
    expect(perTicket.some((g) => g._count._all > 1)).toBe(true);
    const authors = new Set((await prisma.actionTaken.findMany({ select: { performedById: true } })).map((a) => a.performedById));
    expect(authors.size).toBeGreaterThan(1);
  }, 60000);
});
