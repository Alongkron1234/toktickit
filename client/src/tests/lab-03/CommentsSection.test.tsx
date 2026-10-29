import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { TicketDetailScreen } from '../../components/TicketDetailScreen';
import { AuthContext } from '../../context/AuthContext';

const mockRequester = {
  id: 1,
  email: 'john.doe@example.com',
  name: 'John Doe',
};

describe('Lab 3 TicketDetailScreen Comments & Reopen Tests', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const renderScreen = () => {
    return render(
      <AuthContext.Provider
        value={{
          user: { ...mockRequester, role: 'REQUESTER', isActive: true, requiresPasswordChange: false },
          token: 'test-token',
          isLoading: false,
          login: vi.fn(),
          logout: vi.fn(),
          changePassword: vi.fn(),
          refreshUser: vi.fn(),
        } as never}
      >
        <TicketDetailScreen ticketId={1} onBack={vi.fn()} />
      </AuthContext.Provider>
    );
  };

  it('COM-UI-01: Renders comments section and fetches public comments', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith('/api/tickets/1')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 1,
              ticketNumber: 'TTK-2026-0001',
              requesterId: 1,
              categoryId: 1,
              relatedSystemId: 1,
              summary: 'VPN Connection drops',
              description: 'Disconnects every 10 minutes when working remotely',
              requestedPriority: 'HIGH',
              itPriority: 'HIGH',
              currentStatus: 'OPEN',
              createdAt: '2026-09-14T10:00:00.000Z',
              updatedAt: '2026-09-14T10:00:00.000Z',
              category: { id: 1, name: 'Network' },
              relatedSystem: { id: 1, name: 'Global VPN' },
              requester: mockRequester,
              attachments: [],
            },
          }),
        });
      }
      if (url.endsWith('/api/tickets/1/comments')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: [
              {
                id: 101,
                ticketId: 1,
                authorId: 1,
                content: 'Issue still happening on Wi-Fi',
                createdAt: '2026-09-14T10:15:00.000Z',
                author: { id: 1, name: 'John Doe', role: 'REQUESTER' },
              },
            ],
          }),
        });
      }
      return Promise.reject(new Error('Unknown URL ' + url));
    });

    renderScreen();

    await waitFor(() => {
      expect(screen.getAllByText('TTK-2026-0001')[0]).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Issue still happening on Wi-Fi')).toBeInTheDocument();
    });
  });

  it('COM-UI-02: Allows posting a comment with problem appears resolved hint', async () => {
    let commentPosted = false;

    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      if (url.endsWith('/api/tickets/1') && options?.method !== 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 1,
              ticketNumber: 'TTK-2026-0001',
              requesterId: 1,
              categoryId: 1,
              relatedSystemId: 1,
              summary: 'VPN Connection drops',
              description: 'Disconnects every 10 minutes when working remotely',
              requestedPriority: 'HIGH',
              itPriority: 'HIGH',
              currentStatus: 'OPEN',
              appearsResolvedAt: commentPosted ? '2026-09-14T10:30:00.000Z' : null,
              createdAt: '2026-09-14T10:00:00.000Z',
              updatedAt: '2026-09-14T10:00:00.000Z',
              category: { id: 1, name: 'Network' },
              relatedSystem: { id: 1, name: 'Global VPN' },
              requester: mockRequester,
              attachments: [],
            },
          }),
        });
      }
      if (url.endsWith('/api/tickets/1/comments')) {
        if (options?.method === 'POST') {
          commentPosted = true;
          const body = JSON.parse(options.body);
          expect(body.body).toBe('Fixed after router restart');
          expect(body.appearsResolved).toBe(true);

          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: {
                id: 102,
                ticketId: 1,
                authorId: 1,
                content: 'Fixed after router restart',
                createdAt: '2026-09-14T10:30:00.000Z',
              },
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: commentPosted
              ? [
                  {
                    id: 102,
                    ticketId: 1,
                    authorId: 1,
                    content: 'Fixed after router restart',
                    createdAt: '2026-09-14T10:30:00.000Z',
                    author: { id: 1, name: 'John Doe', role: 'REQUESTER' },
                  },
                ]
              : [],
          }),
        });
      }
      return Promise.reject(new Error('Unknown URL ' + url));
    });

    renderScreen();

    await waitFor(() => {
      expect(screen.getAllByText('TTK-2026-0001')[0]).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(/type your comment or update here/i);
    const checkbox = screen.getByLabelText(/problem appears resolved from my side/i);
    const postBtn = screen.getByRole('button', { name: /post comment/i });

    fireEvent.change(textarea, { target: { value: 'Fixed after router restart' } });
    fireEvent.click(checkbox);
    fireEvent.click(postBtn);

    await waitFor(() => {
      expect(screen.getByText('Fixed after router restart')).toBeInTheDocument();
      expect(screen.getByText(/requester indicated problem appears resolved/i)).toBeInTheDocument();
    });
  });

  it('COM-UI-04: double-clicking Post Comment sends the comment once', async () => {
    let postCount = 0;
    let posted = false;

    global.fetch = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      if (url.endsWith('/api/tickets/1') && options?.method !== 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 1,
              ticketNumber: 'TTK-2026-0001',
              requesterId: 1,
              categoryId: 1,
              relatedSystemId: 1,
              summary: 'VPN Connection drops',
              description: 'Disconnects often',
              requestedPriority: 'HIGH',
              itPriority: 'HIGH',
              currentStatus: 'OPEN',
              appearsResolvedAt: null,
              createdAt: '2026-09-14T10:00:00.000Z',
              updatedAt: '2026-09-14T10:00:00.000Z',
              category: { id: 1, name: 'Network' },
              relatedSystem: { id: 1, name: 'Global VPN' },
              requester: mockRequester,
              attachments: [],
            },
          }),
        });
      }
      if (url.endsWith('/api/tickets/1/comments')) {
        if (options?.method === 'POST') {
          postCount += 1;
          posted = true;
          return new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ success: true, data: { id: 103, ticketId: 1, authorId: 1, content: 'Only once', createdAt: '2026-09-14T10:30:00.000Z' } }),
                }),
              30
            )
          );
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: posted
              ? [{ id: 103, ticketId: 1, authorId: 1, content: 'Only once', createdAt: '2026-09-14T10:30:00.000Z', author: { id: 1, name: 'John Doe', role: 'REQUESTER' } }]
              : [],
          }),
        });
      }
      return Promise.reject(new Error('Unknown URL ' + url));
    });

    renderScreen();
    await waitFor(() => {
      expect(screen.getAllByText('TTK-2026-0001')[0]).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/type your comment or update here/i), { target: { value: 'Only once' } });
    const postBtn = screen.getByRole('button', { name: /post comment/i });
    fireEvent.click(postBtn);
    fireEvent.click(postBtn);

    await waitFor(() => {
      expect(screen.getByText('Only once')).toBeInTheDocument();
    });
    expect(postCount).toBe(1);
  });

  it('COM-UI-03: Displays Reopen Ticket button for RESOLVED status and triggers reopening', async () => {
    let ticketStatus = 'RESOLVED';

    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      if (url.endsWith('/api/tickets/1') && options?.method !== 'PATCH') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: 1,
              ticketNumber: 'TTK-2026-0001',
              requesterId: 1,
              categoryId: 1,
              relatedSystemId: 1,
              summary: 'VPN Connection drops',
              description: 'Disconnects every 10 minutes when working remotely',
              requestedPriority: 'HIGH',
              itPriority: 'HIGH',
              currentStatus: ticketStatus,
              createdAt: '2026-09-14T10:00:00.000Z',
              updatedAt: '2026-09-14T10:00:00.000Z',
              category: { id: 1, name: 'Network' },
              relatedSystem: { id: 1, name: 'Global VPN' },
              requester: mockRequester,
              attachments: [],
            },
          }),
        });
      }
      if (url.endsWith('/api/tickets/1/comments')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: [] }),
        });
      }
      if (url.endsWith('/api/tickets/1/status') && options?.method === 'PATCH') {
        const body = JSON.parse(options.body);
        expect(body.status).toBe('REOPENED');
        ticketStatus = 'REOPENED';
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: { id: 1, currentStatus: 'REOPENED' },
          }),
        });
      }
      return Promise.reject(new Error('Unknown URL ' + url));
    });

    renderScreen();

    await waitFor(() => {
      expect(screen.getByText(/reopen ticket/i)).toBeInTheDocument();
    });

    const reopenBtn = screen.getByRole('button', { name: /reopen ticket/i });
    fireEvent.click(reopenBtn);

    await waitFor(() => {
      expect(screen.getByText('Reopened')).toBeInTheDocument();
    });
  });
});
