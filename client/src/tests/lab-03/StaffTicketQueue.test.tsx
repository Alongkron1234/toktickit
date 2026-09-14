import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthContext } from '../../context/AuthContext';
import { StaffTicketQueue } from '../../components/StaffTicketQueue';

const mockStaffUser = {
  id: 6,
  name: 'Alex Thompson',
  email: 'alex.thompson@toktickit.com',
  role: 'IT_STAFF' as const,
  isActive: true,
  requiresPasswordChange: false,
};

const mockQueueResponse = {
  success: true,
  data: {
    tickets: [
      {
        id: 1,
        ticketNumber: 'TKT-2026-001234',
        summary: 'Laptop battery drains quickly',
        requestedPriority: 'MEDIUM',
        itPriority: 'MEDIUM',
        currentStatus: 'IN_PROGRESS',
        createdAt: '2026-05-12T09:14:00.000Z',
        updatedAt: '2026-05-12T09:14:00.000Z',
        category: { id: 2, name: 'Hardware' },
        requester: { id: 1, name: 'Jennifer Anderson', email: 'jennifer.anderson@example.com' },
        owner: { id: 6, name: 'Alex Thompson', email: 'alex.thompson@toktickit.com' },
      },
      {
        id: 2,
        ticketNumber: 'TKT-2026-001233',
        summary: 'Cannot connect to VPN',
        requestedPriority: 'HIGH',
        itPriority: 'HIGH',
        currentStatus: 'OPEN',
        createdAt: '2026-05-12T08:02:00.000Z',
        updatedAt: '2026-05-12T08:02:00.000Z',
        category: { id: 4, name: 'Network' },
        requester: { id: 3, name: 'Sarah Johnson', email: 'sarah.johnson@example.com' },
        owner: null,
      },
    ],
    pagination: { total: 2, page: 1, totalPages: 1, limit: 10 },
  },
};

describe('StaffTicketQueue UI Tests (Lab 3 - Issue 4)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const renderWithAuth = (ui: React.ReactNode) => {
    return render(
      <AuthContext.Provider
        value={{
          user: mockStaffUser,
          token: 'mock-staff-token',
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

  it('STAFF-UI-01: Renders toolbar, filters, and search controls', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify(mockQueueResponse)));

    renderWithAuth(<StaffTicketQueue />);

    expect(screen.getByPlaceholderText('Search by ticket number or summary...')).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
    expect(screen.getByLabelText('IT Priority')).toBeInTheDocument();
    expect(screen.getByLabelText('Owner')).toBeInTheDocument();
    expect(screen.getByLabelText('Sort By')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText('TKT-2026-001234')[0]).toBeInTheDocument();
    });
  });

  it('STAFF-UI-02: Renders queue table rows, status/priority pills, owner badges, and pagination', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify(mockQueueResponse)));

    renderWithAuth(<StaffTicketQueue />);

    await waitFor(() => {
      expect(screen.getAllByText('TKT-2026-001234')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Cannot connect to VPN')[0]).toBeInTheDocument();
    });

    expect(screen.getAllByText('Alex Thompson').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Unassigned').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/In Progress/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Showing/)).toBeInTheDocument();
  });

  it('STAFF-UI-03: Search input triggers a new fetch with correct query params using Bearer auth', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify(mockQueueResponse)));

    renderWithAuth(<StaffTicketQueue />);

    await waitFor(() => {
      expect(screen.getAllByText('TKT-2026-001234')[0]).toBeInTheDocument();
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/staff/tickets'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer mock-staff-token' }),
      })
    );

    const searchInput = screen.getByPlaceholderText('Search by ticket number or summary...');
    fireEvent.change(searchInput, { target: { value: 'VPN' } });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('search=VPN'), expect.anything());
    });

    const statusSelect = screen.getByLabelText('Status');
    fireEvent.change(statusSelect, { target: { value: 'OPEN' } });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('status=OPEN'), expect.anything());
    });

    const ownerSelect = screen.getByLabelText('Owner');
    fireEvent.change(ownerSelect, { target: { value: 'unassigned' } });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('ownerId=unassigned'), expect.anything());
    });
  });

  it('Clicking a ticket row calls onSelectTicket with the ticket id', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify(mockQueueResponse)));
    const onSelectTicket = vi.fn();

    renderWithAuth(<StaffTicketQueue onSelectTicket={onSelectTicket} />);

    await waitFor(() => {
      expect(screen.getAllByText('TKT-2026-001234')[0]).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByText('View Details');
    fireEvent.click(viewButtons[0]);

    expect(onSelectTicket).toHaveBeenCalledWith(1);
  });
});
