import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthContext } from '../../context/AuthContext';
import { StaffTicketDetail } from '../../components/StaffTicketDetail';

const mockStaffUser = {
  id: 6,
  name: 'Alex Thompson',
  email: 'alex.thompson@toktickit.com',
  role: 'IT_STAFF' as const,
  isActive: true,
  requiresPasswordChange: false,
};

const mockRequesterUser = {
  id: 1,
  name: 'Jennifer Anderson',
  email: 'jennifer.anderson@example.com',
  role: 'REQUESTER' as const,
  isActive: true,
  requiresPasswordChange: false,
};

const baseTicket = {
  id: 1,
  ticketNumber: 'TKT-2026-000001',
  summary: 'Laptop battery drains quickly',
  description: 'Battery drains fast even when idle.',
  requestedPriority: 'MEDIUM',
  itPriority: 'MEDIUM',
  currentStatus: 'NEW',
  resolutionSummary: null,
  appearsResolvedAt: null,
  createdAt: '2026-05-12T09:14:00.000Z',
  updatedAt: '2026-05-12T09:14:00.000Z',
  category: { id: 2, name: 'Hardware' },
  relatedSystem: { id: 7, name: 'Corporate Laptop' },
  requester: { id: 1, name: 'Jennifer Anderson', email: 'jennifer.anderson@example.com' },
  owner: null,
  attachments: [],
};

const mockMembers = [
  { id: 6, name: 'Alex Thompson', email: 'alex.thompson@toktickit.com', role: 'IT_STAFF' },
  { id: 7, name: 'Kevin Patel', email: 'kevin.patel@toktickit.com', role: 'IT_STAFF' },
];

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

function routeFetch(overrides: Partial<{ ticket: any; members: any[]; comments: any[]; notes: any[] }> = {}) {
  const ticket = overrides.ticket ?? baseTicket;
  const members = overrides.members ?? mockMembers;
  const comments = overrides.comments ?? [];
  const notes = overrides.notes ?? [];

  return vi.fn().mockImplementation((url: string, init?: RequestInit) => {
    const method = init?.method || 'GET';

    if (url.includes('/internal-notes') && method === 'GET') return Promise.resolve(jsonResponse({ success: true, data: notes }));
    if (url.includes('/internal-notes') && method === 'POST') return Promise.resolve(jsonResponse({ success: true, data: { id: 99, content: 'note', createdAt: new Date().toISOString(), author: { name: 'Alex Thompson', role: 'IT_STAFF' } } }, 201));
    if (url.includes('/comments') && method === 'GET') return Promise.resolve(jsonResponse({ success: true, data: comments }));
    if (url.includes('/comments') && method === 'POST') return Promise.resolve(jsonResponse({ success: true, data: { id: 88, content: 'comment', createdAt: new Date().toISOString(), author: { name: 'Alex Thompson', role: 'IT_STAFF' } } }, 201));
    if (url.includes('/ownership')) return Promise.resolve(jsonResponse({ success: true, data: { ...ticket, ownerId: 6, owner: mockMembers[0] } }));
    if (url.includes('/priority')) return Promise.resolve(jsonResponse({ success: true, data: { ...ticket, itPriority: 'HIGH' } }));
    if (url.includes('/status')) return Promise.resolve(jsonResponse({ success: true, data: { ...ticket, currentStatus: 'OPEN' } }));
    if (url.includes('/staff/members')) return Promise.resolve(jsonResponse({ success: true, data: members }));
    if (url.includes('/staff/tickets/')) return Promise.resolve(jsonResponse({ success: true, data: ticket }));

    return Promise.reject(new Error(`Unhandled fetch: ${method} ${url}`));
  });
}

describe('StaffTicketDetail UI Tests (Lab 3 - Issue 5)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const renderWithAuth = (ui: React.ReactNode, user = mockStaffUser) => {
    return render(
      <AuthContext.Provider
        value={{
          user,
          token: 'mock-token',
          isLoading: false,
          login: vi.fn(),
          logout: vi.fn(),
          changePassword: vi.fn(),
          refreshUser: vi.fn(),
        }}
      >
        {ui}
      </AuthContext.Provider>
    );
  };

  it('renders ticket info, owner, and priority', async () => {
    global.fetch = routeFetch();
    renderWithAuth(<StaffTicketDetail ticketId={1} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getAllByText('TKT-2026-000001')[0]).toBeInTheDocument();
    });

    expect(screen.getByText('Laptop battery drains quickly')).toBeInTheDocument();
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });

  it('Claim Ticket calls the ownership endpoint with the current staff user id', async () => {
    const fetchMock = routeFetch();
    global.fetch = fetchMock;
    renderWithAuth(<StaffTicketDetail ticketId={1} onBack={vi.fn()} />);

    await waitFor(() => expect(screen.getAllByText('TKT-2026-000001')[0]).toBeInTheDocument());

    fireEvent.click(screen.getByText('🙋 Claim Ticket'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/ownership'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ ownerId: 6 }),
        })
      );
    });
  });

  it('Reassign Owner opens a dropdown and submits the chosen member', async () => {
    const fetchMock = routeFetch();
    global.fetch = fetchMock;
    renderWithAuth(<StaffTicketDetail ticketId={1} onBack={vi.fn()} />);

    await waitFor(() => expect(screen.getAllByText('TKT-2026-000001')[0]).toBeInTheDocument());

    fireEvent.click(screen.getByText('🔁 Reassign Owner'));
    const select = await screen.findByDisplayValue('Select a staff member...');
    fireEvent.change(select, { target: { value: '7' } });
    fireEvent.click(screen.getByText('Confirm Reassign'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/ownership'),
        expect.objectContaining({ body: JSON.stringify({ ownerId: 7 }) })
      );
    });
  });

  it('updating IT Priority calls the priority endpoint', async () => {
    const fetchMock = routeFetch();
    global.fetch = fetchMock;
    renderWithAuth(<StaffTicketDetail ticketId={1} onBack={vi.fn()} />);

    await waitFor(() => expect(screen.getAllByText('TKT-2026-000001')[0]).toBeInTheDocument());

    const prioritySelect = screen.getByLabelText('IT Priority');
    fireEvent.change(prioritySelect, { target: { value: 'HIGH' } });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/priority'),
        expect.objectContaining({ body: JSON.stringify({ itPriority: 'HIGH' }) })
      );
    });
  });

  it('updating status to a permitted next value succeeds', async () => {
    const fetchMock = routeFetch();
    global.fetch = fetchMock;
    renderWithAuth(<StaffTicketDetail ticketId={1} onBack={vi.fn()} />);

    await waitFor(() => expect(screen.getAllByText('TKT-2026-000001')[0]).toBeInTheDocument());

    const statusSelect = screen.getByLabelText('Current Status');
    fireEvent.change(statusSelect, { target: { value: 'OPEN' } });
    fireEvent.click(screen.getByText('Update Status'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/status'),
        expect.objectContaining({ method: 'PATCH' })
      );
    });
  });

  it('an illegal status transition surfaces the server error message instead of updating', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const method = init?.method || 'GET';
      if (url.includes('/status') && method === 'PATCH') {
        return Promise.resolve(jsonResponse({ success: false, error: { code: 'ILLEGAL_STATUS_TRANSITION', message: 'Cannot transition ticket from NEW to CLOSED.' } }, 409));
      }
      if (url.includes('/internal-notes')) return Promise.resolve(jsonResponse({ success: true, data: [] }));
      if (url.includes('/comments')) return Promise.resolve(jsonResponse({ success: true, data: [] }));
      if (url.includes('/staff/members')) return Promise.resolve(jsonResponse({ success: true, data: mockMembers }));
      if (url.includes('/staff/tickets/')) return Promise.resolve(jsonResponse({ success: true, data: baseTicket }));
      return Promise.reject(new Error(`Unhandled fetch: ${method} ${url}`));
    });
    global.fetch = fetchMock;

    renderWithAuth(<StaffTicketDetail ticketId={1} onBack={vi.fn()} />);
    await waitFor(() => expect(screen.getAllByText('TKT-2026-000001')[0]).toBeInTheDocument());

    const statusSelect = screen.getByLabelText('Current Status');
    fireEvent.change(statusSelect, { target: { value: 'CANCELLED' } });
    fireEvent.click(screen.getByText('Update Status'));

    await waitFor(() => {
      expect(screen.getByText('Cannot transition ticket from NEW to CLOSED.')).toBeInTheDocument();
    });
  });

  it('Public Comments and Internal Notes render in visually distinct tabs and both post correctly', async () => {
    const fetchMock = routeFetch();
    global.fetch = fetchMock;
    renderWithAuth(<StaffTicketDetail ticketId={1} onBack={vi.fn()} />);

    await waitFor(() => expect(screen.getAllByText('TKT-2026-000001')[0]).toBeInTheDocument());

    // Public Comments tab is active by default
    expect(screen.getByText(/Shared communication/i)).toBeInTheDocument();
    const commentBox = screen.getByPlaceholderText('Type a public comment or update...');
    fireEvent.change(commentBox, { target: { value: 'Investigating now.' } });
    fireEvent.click(screen.getByText('Post Comment'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/tickets\/1\/comments$/),
        expect.objectContaining({ method: 'POST' })
      );
    });

    // Switch to Internal Notes — visually distinct (amber "PRIVATE" banner)
    fireEvent.click(screen.getByText(/Internal Notes/));
    expect(await screen.findByText(/PRIVATE — IT STAFF ONLY/)).toBeInTheDocument();

    const noteBox = screen.getByPlaceholderText('Add a private internal note...');
    fireEvent.change(noteBox, { target: { value: 'Ordered replacement battery.' } });
    fireEvent.click(screen.getByText('Add Internal Note'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/internal-notes'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('defense in depth: a Requester-role user (hypothetical misuse) sees no Internal Notes tab or content', async () => {
    const fetchMock = routeFetch();
    global.fetch = fetchMock;
    renderWithAuth(<StaffTicketDetail ticketId={1} onBack={vi.fn()} />, mockRequesterUser);

    await waitFor(() => expect(screen.getAllByText('TKT-2026-000001')[0]).toBeInTheDocument());

    expect(screen.queryByText(/Internal Notes/)).not.toBeInTheDocument();
    expect(screen.queryByText(/PRIVATE — IT STAFF ONLY/)).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining('/internal-notes'), expect.anything());
  });
});
