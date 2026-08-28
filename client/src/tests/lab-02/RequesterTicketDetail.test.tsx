import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RequesterContext } from '../../context/RequesterContext';
import { TicketDetailScreen } from '../../components/TicketDetailScreen';

const mockRequester = {
  id: 1,
  name: 'Jennifer Anderson',
  email: 'jennifer.anderson@example.com',
  isActive: true,
};

const mockTicketDetailData = {
  success: true,
  data: {
    id: 1,
    ticketNumber: 'TKT-2025-001234',
    requesterId: 1,
    categoryId: 2,
    relatedSystemId: 7,
    summary: 'Laptop battery drains quickly',
    description: 'My laptop battery is draining much faster than usual.',
    requestedPriority: 'MEDIUM',
    itPriority: 'MEDIUM',
    currentStatus: 'IN_PROGRESS',
    createdAt: '2025-05-12T09:14:00.000Z',
    updatedAt: '2025-05-13T10:30:00.000Z',
    category: { id: 2, name: 'Hardware' },
    relatedSystem: { id: 7, name: 'Corporate Laptop' },
    requester: { id: 1, name: 'Jennifer Anderson', email: 'jennifer.anderson@example.com' },
    attachments: [],
  },
};

describe('Requester Ticket Detail Read-Only View Tests (Lab 2 - Issue 8)', () => {
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

  it('UI-08: Render read-only ticket details for owned ticket', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url) => {
      const urlStr = url ? url.toString() : '';
      if (urlStr.includes('/api/tickets/1')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockTicketDetailData,
        } as Response);
      }
      return Promise.reject(new Error('Unknown URL: ' + urlStr));
    });

    renderWithContext(<TicketDetailScreen ticketId={1} onBack={vi.fn()} />);

    // Check read-only Ticket Detail header & fields
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'TKT-2025-001234' })).toBeInTheDocument();
    });

    expect(screen.getByText('Laptop battery drains quickly')).toBeInTheDocument();
    expect(screen.getByText('My laptop battery is draining much faster than usual.')).toBeInTheDocument();
    expect(screen.getByText('Hardware')).toBeInTheDocument();
    expect(screen.getByText('Corporate Laptop')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });
});
