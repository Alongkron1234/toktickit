import { describe, it, expect } from 'vitest';
import { Role, TicketStatus } from '../../generated/prisma/client';
import { getAllowedTransitions, evaluateResolutionGate } from '../../src/workflow';

const STAFF = Role.IT_STAFF;
const ADMIN = Role.ADMINISTRATOR;
const REQ = Role.REQUESTER;

describe('Lab 4 workflow unit tests', () => {
  it('UNIT-01: staff transition matrix matches the specification', () => {
    expect(getAllowedTransitions('NEW', STAFF, false)).toEqual(['OPEN', 'CANCELLED']);
    expect(getAllowedTransitions('OPEN', ADMIN, false)).toEqual(['IN_PROGRESS', 'CANCELLED']);
    expect(getAllowedTransitions('IN_PROGRESS', STAFF, false)).toEqual(['WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED']);
    expect(getAllowedTransitions('WAITING_FOR_REQUESTER', STAFF, false)).toEqual(['IN_PROGRESS', 'RESOLVED', 'CANCELLED']);
    expect(getAllowedTransitions('RESOLVED', STAFF, false)).toEqual(['CLOSED', 'REOPENED']);
    expect(getAllowedTransitions('REOPENED', STAFF, false)).toEqual(['IN_PROGRESS', 'OPEN', 'CANCELLED']);
  });

  it('UNIT-01 (closed/cancelled): CLOSED can only be reopened by its Requester and CANCELLED is terminal', () => {
    expect(getAllowedTransitions('CLOSED', STAFF, false)).toEqual([]);
    expect(getAllowedTransitions('CLOSED', ADMIN, false)).toEqual([]);
    expect(getAllowedTransitions('CLOSED', REQ, true)).toEqual(['REOPENED']);
    expect(getAllowedTransitions('CANCELLED', STAFF, false)).toEqual([]);
    expect(getAllowedTransitions('CANCELLED', REQ, true)).toEqual([]);
  });

  it('UNIT-01 (requester): a Requester may only reopen an owned RESOLVED or CLOSED Ticket', () => {
    expect(getAllowedTransitions('RESOLVED', REQ, true)).toEqual(['REOPENED']);
    expect(getAllowedTransitions('RESOLVED', REQ, false)).toEqual([]);
    for (const s of Object.values(TicketStatus)) {
      if (s === 'RESOLVED' || s === 'CLOSED') continue;
      expect(getAllowedTransitions(s, REQ, true)).toEqual([]);
    }
    for (const s of Object.values(TicketStatus)) {
      const t = getAllowedTransitions(s, REQ, true);
      expect(t).not.toContain('RESOLVED');
      expect(t).not.toContain('CLOSED');
    }
  });

  it('UNIT-02: resolution gate lists every failing reason', () => {
    expect(evaluateResolutionGate(0, 'Fixed')).toEqual({ ok: true, reasons: [] });
    expect(evaluateResolutionGate(2, 'Fixed')).toEqual({ ok: false, reasons: [{ reason: 'OPEN_ACTIONS', count: 2 }] });
    expect(evaluateResolutionGate(0, '   ')).toEqual({ ok: false, reasons: [{ reason: 'MISSING_RESOLUTION_SUMMARY' }] });
    expect(evaluateResolutionGate(1, null)).toEqual({
      ok: false,
      reasons: [{ reason: 'OPEN_ACTIONS', count: 1 }, { reason: 'MISSING_RESOLUTION_SUMMARY' }],
    });
  });
});
