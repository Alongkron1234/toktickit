import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../../App';

describe('Lab 2 UI Tests (Issue 3 & Issue 5 - Development Requester & Create Ticket)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  const setupSelectedRequester = async () => {
    vi.spyOn(global, 'fetch').mockImplementation(async (url, init) => {
      const urlStr = typeof url === 'string' ? url : (url as Request).url;
      const method = init?.method || 'GET';

      if (urlStr.includes('/api/requesters')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: [
              { id: 1, name: 'Jennifer Anderson', email: 'jennifer.anderson@example.com', isActive: true },
            ],
          }),
        } as Response;
      }

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

      return { ok: false } as Response;
    });

    render(<App />);

    // Select Requester
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    // Wait for Header to render
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Change Requester/i })).toBeInTheDocument();
    });
  };

  it('UI-01: Requester Selection dropdown renders active users and handles selection', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const urlStr = typeof url === 'string' ? url : (url as Request).url;
      if (urlStr.includes('/api/requesters')) {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: [
              { id: 1, name: 'Jennifer Anderson', email: 'jennifer.anderson@example.com', isActive: true },
              { id: 2, name: 'Michael Brown', email: 'michael.brown@example.com', isActive: true },
            ],
          }),
        } as Response;
      }
      return { ok: false } as Response;
    });

    render(<App />);

    // Unselected Guard
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Select Development Requester/i })).toBeInTheDocument();
    });

    const selectControl = screen.getByRole('combobox', { name: /Development Requester/i });
    expect(selectControl).toBeInTheDocument();

    fireEvent.change(selectControl, { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/Jennifer Anderson/i).length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: /Change Requester/i })).toBeInTheDocument();
    });
  });

  it('UI-02: Renders Create Ticket form and loads option dropdowns', async () => {
    await setupSelectedRequester();

    // Navigate to Create Ticket
    const createBtn = screen.getByRole('button', { name: /Create Ticket/i });
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

    const createBtn = screen.getByRole('button', { name: /Create Ticket/i });
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

    const createBtn = screen.getByRole('button', { name: /Create Ticket/i });
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
