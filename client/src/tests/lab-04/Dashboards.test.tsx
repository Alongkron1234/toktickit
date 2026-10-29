import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthContext } from '../../context/AuthContext';
import { StaffDashboard } from '../../components/StaffDashboard';
import { RequesterDashboard } from '../../components/RequesterDashboard';

const makeUser = (role: 'IT_STAFF' | 'ADMINISTRATOR' | 'REQUESTER') => ({
  id: 6,
  name: 'Alex Thompson',
  email: 'alex.thompson@toktickit.com',
  role,
  isActive: true,
  requiresPasswordChange: false,
});

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

const ticket = { id: 7, ticketNumber: 'TKT-2026-000007', summary: 'Laptop battery drains', currentStatus: 'IN_PROGRESS', updatedAt: '2026-10-26T09:00:00.000Z' };

const staffData = (over: Record<string, unknown> = {}) => ({
  generatedAt: '2026-10-27T03:00:00.000Z',
  metrics: {
    new: 14, open: 23, inProgress: 18, waitingForRequester: 7, myAssigned: 16, unassigned: 9, myOpenActions: 4,
    byItPriority: { LOW: 10, MEDIUM: 30, HIGH: 15, CRITICAL: 3 },
  },
  myRecentTickets: [ticket],
  myRecentActions: [{ id: 12, ticketId: 7, ticketNumber: 'TKT-2026-000007', description: 'Replaced the faulty battery', status: 'COMPLETED', actionAt: '2026-10-20T09:30:00.000Z' }],
  userCounts: null,
  ...over,
});

const requesterData = (over: Record<string, unknown> = {}) => ({
  generatedAt: '2026-10-27T03:00:00.000Z',
  metrics: { open: 3, inProgress: 2, waitingForRequester: 1, resolved: 5, closed: 12 },
  recentlyUpdated: [ticket],
  recentlyResolved: [],
  ...over,
});

function withAuth(role: 'IT_STAFF' | 'ADMINISTRATOR' | 'REQUESTER', ui: React.ReactElement, logout = vi.fn()) {
  return render(
    <AuthContext.Provider
      value={{ user: makeUser(role), token: 'tok', isLoading: false, login: vi.fn(), logout, changePassword: vi.fn(), refreshUser: vi.fn() } as never}
    >
      {ui}
    </AuthContext.Provider>
  );
}

describe('Lab 4 Dashboards UI', () => {
  const originalFetch = global.fetch;
  beforeEach(() => vi.restoreAllMocks());
  afterEach(() => {
    global.fetch = originalFetch;
  });

  const mockFetch = (res: () => Response | Promise<Response>) => {
    const fn = vi.fn(() => Promise.resolve(res()));
    global.fetch = fn as unknown as typeof fetch;
    return fn;
  };

  it('DUI-01: staff dashboard shows loading, then the metric values from the API', async () => {
    mockFetch(() => json({ success: true, data: staffData() }));
    withAuth('IT_STAFF', <StaffDashboard onOpenQueue={vi.fn()} onOpenTicket={vi.fn()} />);
    expect(screen.getByText(/Loading dashboard/i)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'New: 14, view list' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open: 23, view list' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'My Assigned: 16, view list' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unassigned: 9, view list' })).toBeInTheDocument();
    expect(screen.getByText(/Open actions assigned to me: 4/)).toBeInTheDocument();
    expect(screen.getByText('Replaced the faulty battery')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Accounts/ })).not.toBeInTheDocument();
  });

  it('DUI-02: staff cards drill down with the filter defined in the spec', async () => {
    mockFetch(() => json({ success: true, data: staffData() }));
    const onOpenQueue = vi.fn();
    const onOpenTicket = vi.fn();
    withAuth('IT_STAFF', <StaffDashboard onOpenQueue={onOpenQueue} onOpenTicket={onOpenTicket} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Open: 23, view list' }));
    expect(onOpenQueue).toHaveBeenLastCalledWith({ status: 'OPEN,REOPENED' });

    fireEvent.click(screen.getByRole('button', { name: 'My Assigned: 16, view list' }));
    expect(onOpenQueue).toHaveBeenLastCalledWith({ status: 'NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED', ownerId: 'me' });

    fireEvent.click(screen.getByRole('button', { name: 'Unassigned: 9, view list' }));
    expect(onOpenQueue).toHaveBeenLastCalledWith({ status: 'NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED', ownerId: 'unassigned' });

    fireEvent.click(screen.getByRole('button', { name: 'High priority: 15, view list' }));
    expect(onOpenQueue).toHaveBeenLastCalledWith({ status: 'NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED', priority: 'HIGH' });

    fireEvent.click(screen.getByRole('button', { name: 'Search Tickets' }));
    expect(onOpenQueue).toHaveBeenLastCalledWith({ focusSearch: true });

    fireEvent.click(screen.getByText('Laptop battery drains'));
    expect(onOpenTicket).toHaveBeenCalledWith(7);
  });

  it('DUI-03: administrators see the Accounts card', async () => {
    mockFetch(() =>
      json({ success: true, data: staffData({ userCounts: { active: 8, inactive: 2, activeByRole: { REQUESTER: 4, IT_STAFF: 3, ADMINISTRATOR: 1 } } }) })
    );
    withAuth('ADMINISTRATOR', <StaffDashboard onOpenQueue={vi.fn()} onOpenTicket={vi.fn()} onOpenUsers={vi.fn()} />);
    expect(await screen.findByRole('heading', { name: /Accounts/ })).toBeInTheDocument();
    expect(screen.getByText(/IT Staff 3/)).toBeInTheDocument();
  });

  it('DUI-04: empty data shows zeros and empty-state messages, not an error', async () => {
    mockFetch(() =>
      json({
        success: true,
        data: staffData({
          metrics: { new: 0, open: 0, inProgress: 0, waitingForRequester: 0, myAssigned: 0, unassigned: 0, myOpenActions: 0, byItPriority: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 } },
          myRecentTickets: [],
          myRecentActions: [],
        }),
      })
    );
    withAuth('IT_STAFF', <StaffDashboard onOpenQueue={vi.fn()} onOpenTicket={vi.fn()} />);
    expect(await screen.findByRole('button', { name: 'New: 0, view list' })).toBeInTheDocument();
    expect(screen.getByText('No tickets to show yet.')).toBeInTheDocument();
    expect(screen.getByText('No actions recorded yet.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('DUI-05: failure shows a safe message and Retry reloads; Refresh also refetches', async () => {
    let fail = true;
    const fetchFn = mockFetch(() => (fail ? json({ success: false }, 500) : json({ success: true, data: staffData() })));
    withAuth('IT_STAFF', <StaffDashboard onOpenQueue={vi.fn()} onOpenTicket={vi.fn()} />);
    expect(await screen.findByText(/We couldn't load the dashboard/i)).toBeInTheDocument();

    fail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('button', { name: 'New: 14, view list' })).toBeInTheDocument();

    const before = fetchFn.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(fetchFn.mock.calls.length).toBe(before + 1));
  });

  it('DUI-06: a 403 shows Access Denied', async () => {
    mockFetch(() => json({ success: false, error: { code: 'FORBIDDEN' } }, 403));
    withAuth('IT_STAFF', <StaffDashboard onOpenQueue={vi.fn()} onOpenTicket={vi.fn()} />);
    expect(await screen.findByText('Access Denied')).toBeInTheDocument();
  });

  it('DUI-07: requester dashboard shows metrics, highlights waiting, and drills down', async () => {
    const fetchFn = mockFetch(() => json({ success: true, data: requesterData() }));
    const onOpenMyTickets = vi.fn();
    const onOpenTicket = vi.fn();
    withAuth('REQUESTER', <RequesterDashboard onOpenMyTickets={onOpenMyTickets} onOpenTicket={onOpenTicket} onCreateTicket={vi.fn()} />);

    expect(await screen.findByRole('button', { name: 'Open: 3, view list' })).toBeInTheDocument();
    expect(fetchFn.mock.calls[0][0]).toBe('/api/dashboard/requester');
    expect(screen.getByText(/Needs your reply/)).toBeInTheDocument();
    expect(screen.getByText('No tickets resolved in the last 7 days.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open: 3, view list' }));
    expect(onOpenMyTickets).toHaveBeenLastCalledWith('NEW,OPEN,REOPENED');
    fireEvent.click(screen.getByRole('button', { name: 'Waiting for Requester: 1, view list' }));
    expect(onOpenMyTickets).toHaveBeenLastCalledWith('WAITING_FOR_REQUESTER');
    fireEvent.click(screen.getByRole('button', { name: 'Closed: 12, view list' }));
    expect(onOpenMyTickets).toHaveBeenLastCalledWith('CLOSED');
    fireEvent.click(screen.getByText('Laptop battery drains'));
    expect(onOpenTicket).toHaveBeenCalledWith(7);
  });

  it('DUI-08: requester with no tickets sees zeros, no reply cue, and empty lists', async () => {
    mockFetch(() =>
      json({
        success: true,
        data: requesterData({ metrics: { open: 0, inProgress: 0, waitingForRequester: 0, resolved: 0, closed: 0 }, recentlyUpdated: [] }),
      })
    );
    withAuth('REQUESTER', <RequesterDashboard onOpenMyTickets={vi.fn()} onOpenTicket={vi.fn()} onCreateTicket={vi.fn()} />);
    expect(await screen.findByRole('button', { name: 'Waiting for Requester: 0, view list' })).toBeInTheDocument();
    expect(screen.queryByText(/Needs your reply/)).not.toBeInTheDocument();
    expect(screen.getByText('No tickets to show yet.')).toBeInTheDocument();
  });

  it('DUI-09: a 401 logs the user out', async () => {
    mockFetch(() => json({ success: false }, 401));
    const logout = vi.fn();
    withAuth('REQUESTER', <RequesterDashboard onOpenMyTickets={vi.fn()} onOpenTicket={vi.fn()} onCreateTicket={vi.fn()} />, logout);
    await waitFor(() => expect(logout).toHaveBeenCalled());
  });
});
