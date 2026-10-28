import { Role } from '../generated/prisma/client';

type StatusName =
  | 'NEW'
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_REQUESTER'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REOPENED'
  | 'CANCELLED';

// Staff (IT Staff / Administrator) transition matrix from docs/lab-04/specification.md section 6.2.
const STAFF_TRANSITIONS: Record<StatusName, StatusName[]> = {
  NEW: ['OPEN', 'CANCELLED'],
  OPEN: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'],
  WAITING_FOR_REQUESTER: ['IN_PROGRESS', 'RESOLVED', 'CANCELLED'],
  RESOLVED: ['CLOSED', 'REOPENED'],
  CLOSED: [],
  REOPENED: ['IN_PROGRESS', 'OPEN', 'CANCELLED'],
  CANCELLED: [],
};

/** Transitions the caller may perform from `status`; the backend is the single authority. */
export function getAllowedTransitions(status: string, role: Role, isOwnerRequester: boolean): string[] {
  if (role === Role.REQUESTER) {
    return isOwnerRequester && (status === 'RESOLVED' || status === 'CLOSED') ? ['REOPENED'] : [];
  }
  return [...(STAFF_TRANSITIONS[status as StatusName] ?? [])];
}

export type GateReason = { reason: 'OPEN_ACTIONS'; count: number } | { reason: 'MISSING_RESOLUTION_SUMMARY' };

/** BR-09: no OPEN action and a non-empty Resolution Summary. */
export function evaluateResolutionGate(
  openActionsCount: number,
  resolutionSummary: string | null | undefined
): { ok: boolean; reasons: GateReason[] } {
  const reasons: GateReason[] = [];
  if (openActionsCount > 0) reasons.push({ reason: 'OPEN_ACTIONS', count: openActionsCount });
  if (!resolutionSummary || resolutionSummary.trim().length === 0) reasons.push({ reason: 'MISSING_RESOLUTION_SUMMARY' });
  return { ok: reasons.length === 0, reasons };
}

const ALL_STATUSES: StatusName[] = [
  'NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED',
];

// Multi-status filter (api-spec 8.1): comma-separated, case-insensitive, unknown values ignored.
export function parseStatusList(value: unknown): StatusName[] {
  if (typeof value !== 'string') return [];
  const parsed = value
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((s): s is StatusName => (ALL_STATUSES as string[]).includes(s));
  return Array.from(new Set(parsed));
}
