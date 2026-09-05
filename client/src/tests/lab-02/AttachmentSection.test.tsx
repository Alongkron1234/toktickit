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

const mockTicketDetailResponse = {
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
    attachments: [
      {
        id: 101,
        ticketId: 1,
        originalName: 'active_report.pdf',
        storedName: 'uuid-active-report.pdf',
        mimeType: 'application/pdf',
        fileSize: 1048576,
        isRemoved: false,
        createdAt: '2025-05-12T09:15:00.000Z',
      },
      {
        id: 102,
        ticketId: 1,
        originalName: 'old_screenshot.png',
        storedName: 'uuid-old-screenshot.png',
        mimeType: 'image/png',
        fileSize: 524288,
        isRemoved: true,
        removalReason: 'Uploaded wrong screenshot by mistake',
        removedAt: '2025-05-12T10:00:00.000Z',
        createdAt: '2025-05-12T09:14:00.000Z',
      },
    ],
  },
};

describe('Ticket Detail & Attachment Section UI Tests (Lab 2 - Issue 8)', () => {
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

  it('UI-08: Render ticket details and soft-removed attachment metadata with disabled download', async () => {
    vi.spyOn(global, 'fetch').mockImplementation((url) => {
      const urlStr = url ? url.toString() : '';
      if (urlStr.includes('/api/tickets/1')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockTicketDetailResponse,
        } as Response);
      }
      return Promise.reject(new Error('Unknown URL: ' + urlStr));
    });

    renderWithContext(<TicketDetailScreen ticketId={1} onBack={vi.fn()} />);

    // Check read-only Ticket Detail header & summary
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'TKT-2025-001234' })).toBeInTheDocument();
    });

    expect(screen.getByText('Laptop battery drains quickly')).toBeInTheDocument();

    // Check Active Attachment renders with active Download button
    expect(screen.getByText('active_report.pdf')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Download$/i })).toBeInTheDocument();

    // Check Soft-Removed Attachment renders "Removed" badge and removal reason
    expect(screen.getByText('old_screenshot.png')).toBeInTheDocument();
    expect(screen.getByText('Removed')).toBeInTheDocument();
    expect(screen.getByText(/Uploaded wrong screenshot by mistake/i)).toBeInTheDocument();

    // Check Disabled Download link for soft-removed attachment
    const unavailableBtn = screen.getByRole('button', { name: /Download Unavailable/i });
    expect(unavailableBtn).toBeDisabled();
  });
});
