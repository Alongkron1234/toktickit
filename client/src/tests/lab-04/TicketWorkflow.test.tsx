import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthContext } from '../../context/AuthContext';
import { StaffTicketDetail } from '../../components/StaffTicketDetail';

const staffUser = {
  id: 6,
  name: 'Alex Thompson',
  email: 'alex.thompson@toktickit.com',
  role: 'IT_STAFF' as const,
  isActive: true,
  requiresPasswordChange: false,
};

const makeTicket = (over: Record<string, unknown> = {}) => ({
  id: 1,
  ticketNumber: 'TKT-2026-000001',
  summary: 'Laptop battery drains quickly',
  description: 'Battery drains fast.',
  requestedPriority: 'MEDIUM',
  itPriority: 'MEDIUM',
  currentStatus: 'IN_PROGRESS',
  resolutionSummary: null,
  appearsResolvedAt: null,
  createdAt: '2026-05-12T09:14:00.000Z',
  updatedAt: '2026-05-12T09:14:00.000Z',
  category: { id: 2, name: 'Hardware' },
  relatedSystem: { id: 7, name: 'Corporate Laptop' },
  requester: { id: 1, name: 'Jennifer Anderson', email: 'jennifer.anderson@example.com' },
  owner: { id: 6, name: 'Alex Thompson', email: 'alex.thompson@toktickit.com' },
  attachments: [],
  version: 3,
  allowedTransitions: ['WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'],
  openActionsCount: 0,
  ...over,
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

function setup(opts: { ticket?: Record<string, unknown>; onStatus?: (init: RequestInit) => Response }) {
  let current = makeTicket(opts.ticket);
  const calls: { url: string; init?: RequestInit }[] = [];
  global.fetch = vi.fn((url: string, init?: RequestInit) => {
    calls.push({ url, init });
    if (url.endsWith('/status') && init?.method === 'PATCH') {
      const res = opts.onStatus ? opts.onStatus(init) : json({ success: true, data: current });
      return Promise.resolve(res);
    }
    if (url === '/api/staff/tickets/1') return Promise.resolve(json({ success: true, data: current }));
    if (url.endsWith('/api/staff/members')) return Promise.resolve(json({ success: true, data: [] }));
    if (url.includes('/actions')) return Promise.resolve(json({ success: true, data: { actions: [] } }));
    return Promise.resolve(json({ success: true, data: [] }));
  }) as unknown as typeof fetch;
  render(
    <AuthContext.Provider
      value={{ user: staffUser, token: 'tok', loading: false, login: vi.fn(), logout: vi.fn(), refreshUser: vi.fn() } as never}
    >
      <StaffTicketDetail ticketId={1} onBack={vi.fn()} />
    </AuthContext.Provider>
  );
  return { calls, setCurrent: (t: Record<string, unknown>) => (current = makeTicket(t)) };
}

describe('Lab 4 Ticket workflow UI', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('UI-05: the status dropdown lists only the transitions returned by the API', async () => {
    setup({});
    const select = await screen.findByLabelText('Current Status');
    const options = Array.from((select as HTMLSelectElement).options).map((o) => o.value);
    expect(options).toEqual(['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED']);
  });

  it('UI-05 (terminal): a terminal Ticket has a read-only status control with an explanation', async () => {
    setup({ ticket: { currentStatus: 'CANCELLED', allowedTransitions: [] } });
    const select = await screen.findByLabelText('Current Status');
    expect(select).toBeDisabled();
    expect(screen.getByText(/No further status changes are available/)).toBeInTheDocument();
  });

  it('UI-06 (warning): warns about open actions but keeps Save enabled', async () => {
    setup({ ticket: { openActionsCount: 2 } });
    expect(await screen.findByText(/2 action\(s\) are still open/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Current Status'), { target: { value: 'RESOLVED' } });
    expect(screen.getByRole('button', { name: 'Update Status' })).toBeEnabled();
  });

  it('UI-06 (gate): sends expectedVersion and lists the reasons when the gate refuses', async () => {
    const { calls } = setup({
      ticket: { openActionsCount: 1 },
      onStatus: () =>
        json(
          {
            success: false,
            error: {
              code: 'RESOLUTION_GATE_FAILED',
              message: 'The Ticket cannot be resolved yet.',
              details: [{ reason: 'OPEN_ACTIONS', count: 1 }, { reason: 'MISSING_RESOLUTION_SUMMARY' }],
            },
          },
          409
        ),
    });
    fireEvent.change(await screen.findByLabelText('Current Status'), { target: { value: 'RESOLVED' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update Status' }));
    expect(await screen.findByText('1 action(s) are still open.')).toBeInTheDocument();
    expect(screen.getByText('A Resolution Summary is required.')).toBeInTheDocument();
    const patch = calls.find((c) => c.init?.method === 'PATCH' && c.url.endsWith('/status'))!;
    expect(JSON.parse(patch.init!.body as string)).toMatchObject({ status: 'RESOLVED', expectedVersion: 3 });
  });

  it('UI-07: a stale update shows the conflict message with a Reload button that refetches', async () => {
    const { calls } = setup({
      onStatus: () => json({ success: false, error: { code: 'STALE_UPDATE', message: 'x', currentVersion: 4 } }, 409),
    });
    fireEvent.change(await screen.findByLabelText('Current Status'), { target: { value: 'WAITING_FOR_REQUESTER' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update Status' }));
    expect(await screen.findByText(/changed by someone else/)).toBeInTheDocument();
    const before = calls.filter((c) => c.url === '/api/staff/tickets/1').length;
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
    await waitFor(() => expect(calls.filter((c) => c.url === '/api/staff/tickets/1').length).toBe(before + 1));
    await waitFor(() => expect(screen.queryByText(/changed by someone else/)).not.toBeInTheDocument());
  });

  it('UI-05 (busy): shows a busy state and ignores a second click while saving', async () => {
    let resolve!: (r: Response) => void;
    const pending = new Promise<Response>((r) => (resolve = r));
    const { calls } = setup({});
    const original = global.fetch as unknown as (u: string, i?: RequestInit) => Promise<Response>;
    global.fetch = vi.fn((u: string, i?: RequestInit) =>
      i?.method === 'PATCH' && u.endsWith('/status') ? (calls.push({ url: u, init: i }), pending) : original(u, i)
    ) as unknown as typeof fetch;
    fireEvent.change(await screen.findByLabelText('Current Status'), { target: { value: 'WAITING_FOR_REQUESTER' } });
    const button = screen.getByRole('button', { name: 'Update Status' });
    fireEvent.click(button);
    const busy = await screen.findByRole('button', { name: 'Updating...' });
    expect(busy).toBeDisabled();
    fireEvent.click(busy);
    expect(calls.filter((c) => c.init?.method === 'PATCH')).toHaveLength(1);
    resolve(json({ success: true, data: makeTicket() }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Updating...' })).not.toBeInTheDocument());
  });
});
