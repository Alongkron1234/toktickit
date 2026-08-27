import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RequesterContext } from '../../context/RequesterContext';
import { MyTicketsScreen } from '../../components/MyTicketsScreen';

const mockRequester = {
  id: 1,
  name: 'Jennifer Anderson',
  email: 'jennifer.anderson@example.com',
  isActive: true,
};

const mockCategories = [
  { id: 1, name: 'Account and Access' },
  { id: 2, name: 'Hardware' },
];

const mockTicketsResponse = {
  success: true,
  data: [
    {
      id: 1,
      ticketNumber: 'TKT-2026-000001',
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 1,
      summary: 'Cannot log in to VPN account',
      description: 'Getting error 403 when trying to log in',
      requestedPriority: 'HIGH',
      itPriority: 'HIGH',
      currentStatus: 'NEW',
      createdAt: '2026-08-25T10:00:00.000Z',
      updatedAt: '2026-08-25T10:00:00.000Z',
      category: { id: 1, name: 'Account and Access' },
      relatedSystem: { id: 1, name: 'Active Directory' },
      requester: { id: 1, name: 'Jennifer Anderson', email: 'jennifer.anderson@example.com' },
      attachments: [],
    },
    {
      id: 2,
      ticketNumber: 'TKT-2026-000002',
      requesterId: 1,
      categoryId: 2,
      relatedSystemId: 2,
      summary: 'Laptop battery draining fast',
      description: 'Battery drains in less than 30 minutes',
      requestedPriority: 'MEDIUM',
      itPriority: 'MEDIUM',
      currentStatus: 'OPEN',
      createdAt: '2026-08-25T11:00:00.000Z',
      updatedAt: '2026-08-25T11:00:00.000Z',
      category: { id: 2, name: 'Hardware' },
      relatedSystem: { id: 2, name: 'Laptop Workstation' },
      requester: { id: 1, name: 'Jennifer Anderson', email: 'jennifer.anderson@example.com' },
      attachments: [],
    },
  ],
  pagination: {
    totalCount: 2,
    totalPages: 1,
    currentPage: 1,
    limit: 10,
  },
};

describe('My Tickets Screen UI Tests (Lab 2 - Issue 7)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const renderWithContext = (ui: React.ReactNode) => {
    return render(
      <RequesterContext.Provider
        value={{
          currentRequester: mockRequester,
          requesters: [mockRequester],
          loading: false,
          error: null,
          selectRequester: vi.fn(),
          clearRequester: vi.fn(),
          fetchRequesters: vi.fn(),
          getAuthHeaders: () => ({ 'X-Dev-Requester-Id': '1' }),
        }}
      >
        {ui}
      </RequesterContext.Provider>
    );
  };

  it('UI-05: Render My Tickets table with active requester tickets from API', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url) => {
      const urlStr = url.toString();
      if (urlStr.includes('/api/categories')) {
        return Promise.resolve(new Response(JSON.stringify(mockCategories)));
      }
      if (urlStr.includes('/api/tickets')) {
        return Promise.resolve(new Response(JSON.stringify(mockTicketsResponse)));
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    renderWithContext(<MyTicketsScreen />);

    // Should display tickets table matching columns
    await waitFor(() => {
      expect(screen.getByText('TKT-2026-000001')).toBeInTheDocument();
      expect(screen.getByText('Cannot log in to VPN account')).toBeInTheDocument();
      expect(screen.getByText('Laptop battery draining fast')).toBeInTheDocument();
    });

    // Check header was sent with X-Dev-Requester-Id
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/tickets'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Dev-Requester-Id': '1',
        }),
      })
    );
  });

  it('UI-06: Filters tickets dynamically when search term or category/status dropdowns change', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((url) => {
      const urlStr = url.toString();
      if (urlStr.includes('/api/categories')) {
        return Promise.resolve(new Response(JSON.stringify(mockCategories)));
      }
      if (urlStr.includes('/api/tickets')) {
        return Promise.resolve(new Response(JSON.stringify(mockTicketsResponse)));
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    renderWithContext(<MyTicketsScreen />);

    await waitFor(() => {
      expect(screen.getByText('TKT-2026-000001')).toBeInTheDocument();
    });

    // Type into Search box
    const searchInput = screen.getByPlaceholderText('Search by ticket number or summary...');
    fireEvent.change(searchInput, { target: { value: 'VPN' } });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('search=VPN'),
        expect.anything()
      );
    });

    // Select Requested Priority Filter
    const prioritySelect = screen.getByLabelText('Requested Priority');
    fireEvent.change(prioritySelect, { target: { value: 'HIGH' } });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('requestedPriority=HIGH'),
        expect.anything()
      );
    });
  });

  it('UI-07: Pagination controls update page and fetch next set of tickets', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((url) => {
      const urlStr = url.toString();
      if (urlStr.includes('/api/categories')) {
        return Promise.resolve(new Response(JSON.stringify(mockCategories)));
      }
      if (urlStr.includes('/api/tickets')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              ...mockTicketsResponse,
              pagination: {
                totalCount: 25,
                totalPages: 3,
                currentPage: 1,
                limit: 10,
              },
            })
          )
        );
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    renderWithContext(<MyTicketsScreen />);

    await waitFor(() => {
      expect(screen.getByText('TKT-2026-000001')).toBeInTheDocument();
    });

    // Click Next Page button
    const nextBtn = screen.getByRole('button', { name: /Next/i });
    expect(nextBtn).not.toBeDisabled();
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('page=2'),
        expect.anything()
      );
    });
  });
});
