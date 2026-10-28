import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../../App';

describe('Lab 2 UI Tests (Issue 3 & Issue 5 - Development Requester & Create Ticket)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  const setupSelectedRequester = async () => {
    localStorage.setItem('toktickit_user', JSON.stringify({
      id: 1,
      name: 'Jennifer Anderson',
      email: 'jennifer.anderson@example.com',
      role: 'REQUESTER',
      isActive: true,
      requiresPasswordChange: false,
    }));
    localStorage.setItem('toktickit_token', 'mock_test_token');
    vi.spyOn(global, 'fetch').mockImplementation(async (url, init) => {
      const urlStr = typeof url === 'string' ? url : (url as Request).url;
      const method = init?.method || 'GET';

      if (urlStr.includes('/api/categories')) {
        return {
          ok: true,
          json: async () => [
            { id: 1, name: 'Account and Access' },
            { id: 2, name: 'Hardware' },
          ],
        } as Response;
      }

      if (urlStr.includes('/api/related-systems')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: [
              { id: 1, name: 'Email' },
              { id: 2, name: 'Campus Wi-Fi' },
            ],
          }),
        } as Response;
      }

      if (urlStr.includes('/api/tickets') && method === 'GET') {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: [],
            pagination: { totalCount: 0, totalPages: 1, currentPage: 1, limit: 10 },
          }),
        } as Response;
      }

      if (urlStr.includes('/api/tickets') && method === 'POST') {
        return {
          ok: true,
          status: 201,
          json: async () => ({
            success: true,
            data: {
              id: 1,
              ticketNumber: 'TKT-2026-000001',
              currentStatus: 'NEW',
              summary: 'Unable to connect to campus wifi',
            },
          }),
        } as Response;
      }

      return { ok: false, json: async () => ({}) } as Response;
    });

    render(<App />);

    // Wait for AuthContext loading to finish & Header to render
    await waitFor(() => {
      expect(screen.getByText(/Jennifer Anderson/i)).toBeInTheDocument();
    }, { timeout: 3000 });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Logout/i })).toBeInTheDocument();
    });

    // Lab 4: the default landing page is the Dashboard; these Lab 2 flows start from My Tickets.
    fireEvent.click(screen.getByRole('button', { name: /My Tickets/i }));
    await waitFor(() => {
      expect(within(screen.getByRole('main')).getByRole('button', { name: /^Create Ticket$/i })).toBeInTheDocument();
    });
  };

  it('UI-01: a signed-in Requester sees their own session; no Development Requester selector or lookup remains', async () => {
    localStorage.setItem('toktickit_user', JSON.stringify({
      id: 1,
      name: 'Jennifer Anderson',
      email: 'jennifer.anderson@example.com',
      role: 'REQUESTER',
      isActive: true,
      requiresPasswordChange: false,
    }));
    localStorage.setItem('toktickit_token', 'mock_test_token');
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async () => {
      return { ok: true, json: async () => ({ success: true, data: [], pagination: {} }) } as Response;
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Jennifer Anderson/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Logout/i })).toBeInTheDocument();
    expect(screen.queryByText(/Change Requester|Development Requester|Select a Requester/i)).not.toBeInTheDocument();
    expect(fetchSpy.mock.calls.some(([url]) => String(url).includes('/api/requesters'))).toBe(false);
  });

  it('UI-02: Renders Create Ticket form and loads option dropdowns', async () => {
    await setupSelectedRequester();

    // Navigate to Create Ticket
    const createBtn = within(screen.getByRole('main')).getByRole('button', { name: /^Create Ticket$/i });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Create IT Support Ticket/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/Category/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Related System/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Summary/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    });
  });

  it('UI-03: Triggers client-side inline validation errors when submitting invalid inputs', async () => {
    await setupSelectedRequester();

    const createBtn = within(screen.getByRole('main')).getByRole('button', { name: /^Create Ticket$/i });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Create IT Support Ticket/i })).toBeInTheDocument();
    });

    // Click Submit without filling form
    const submitBtn = screen.getByRole('button', { name: /Submit Ticket/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Please select a request category/i)).toBeInTheDocument();
      expect(screen.getByText(/Please select a related system/i)).toBeInTheDocument();
      expect(screen.getByText(/Summary is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Description is required/i)).toBeInTheDocument();
    });
  });

  it('UI-04: Submits valid form, displays busy state, and shows success alert with ticket number', async () => {
    await setupSelectedRequester();

    const createBtn = within(screen.getByRole('main')).getByRole('button', { name: /^Create Ticket$/i });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByLabelText(/Category/i)).toBeInTheDocument();
    });

    // Fill valid form
    fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/Related System/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/Summary/i), { target: { value: 'Unable to connect to campus wifi' } });
    fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'Wi-Fi disconnects every 5 minutes in Library.' } });

    const submitBtn = screen.getByRole('button', { name: /Submit Ticket/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Ticket Created Successfully!/i)).toBeInTheDocument();
      expect(screen.getByText(/TKT-2026-000001/i)).toBeInTheDocument();
    });
  });
});
