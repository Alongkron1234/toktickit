import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthContext } from '../../context/AuthContext';
import { UserManagement } from '../../components/UserManagement';

const mockAdminUser = {
  id: 10,
  name: 'John Smith',
  email: 'john.smith@toktickit.com',
  role: 'ADMINISTRATOR' as const,
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

const mockUsers = [
  { id: 1, name: 'Jennifer Anderson', email: 'jennifer.anderson@example.com', role: 'REQUESTER', isActive: true, requiresPasswordChange: false },
  { id: 6, name: 'Alex Thompson', email: 'alex.thompson@toktickit.com', role: 'IT_STAFF', isActive: true, requiresPasswordChange: false },
  { id: 10, name: 'John Smith', email: 'john.smith@toktickit.com', role: 'ADMINISTRATOR', isActive: true, requiresPasswordChange: false },
];

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

describe('UserManagement UI Tests (Lab 3 - Issue 6)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const renderWithAuth = (ui: React.ReactNode, user = mockAdminUser) => {
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

  it('renders the user list with role and status badges', async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ success: true, data: mockUsers }));
    renderWithAuth(<UserManagement />);

    await waitFor(() => {
      expect(screen.getAllByText('Alex Thompson')[0]).toBeInTheDocument();
    });

    expect(screen.getAllByText('IT Staff').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Administrator').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
  });

  it('search and role filter trigger a refetch with correct query params', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true, data: mockUsers }));
    global.fetch = fetchMock;
    renderWithAuth(<UserManagement />);

    await waitFor(() => expect(screen.getAllByText('Alex Thompson')[0]).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText('Search by name or email...'), { target: { value: 'alex' } });
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('search=alex'), expect.anything());
    });

    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'IT_STAFF' } });
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('role=IT_STAFF'), expect.anything());
    });
  });

  it('Create User flow submits the form and surfaces a duplicate-email error', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const method = init?.method || 'GET';
      if (url.includes('/api/admin/users') && method === 'POST') {
        return Promise.resolve(jsonResponse({ success: false, error: { message: 'A user with this email address already exists.' } }, 400));
      }
      return Promise.resolve(jsonResponse({ success: true, data: mockUsers }));
    });
    global.fetch = fetchMock;
    renderWithAuth(<UserManagement />);

    await waitFor(() => expect(screen.getAllByText('Alex Thompson')[0]).toBeInTheDocument());

    fireEvent.click(screen.getByText('+ Create User'));
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'New Person' } });
    fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: 'alex.thompson@toktickit.com' } });
    fireEvent.change(screen.getByLabelText('Initial Password'), { target: { value: 'InitialPassword123!' } });
    fireEvent.click(screen.getByText('Save User'));

    await waitFor(() => {
      expect(screen.getByText('A user with this email address already exists.')).toBeInTheDocument();
    });
  });

  it('Edit User flow submits updated fields', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const method = init?.method || 'GET';
      if (url.includes('/api/admin/users/6') && method === 'PATCH') {
        return Promise.resolve(jsonResponse({ success: true, data: { ...mockUsers[1], name: 'Alex T. Updated' } }));
      }
      return Promise.resolve(jsonResponse({ success: true, data: mockUsers }));
    });
    global.fetch = fetchMock;
    renderWithAuth(<UserManagement />);

    await waitFor(() => expect(screen.getAllByText('Alex Thompson')[0]).toBeInTheDocument());

    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);
    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Alex T. Updated' } });
    fireEvent.click(screen.getByText('Save User'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/users/'),
        expect.objectContaining({ method: 'PATCH' })
      );
    });
  });

  it('Reset Password flow submits a new password', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const method = init?.method || 'GET';
      if (url.includes('/reset-password')) {
        return Promise.resolve(jsonResponse({ success: true, data: { ...mockUsers[1], requiresPasswordChange: true } }));
      }
      return Promise.resolve(jsonResponse({ success: true, data: mockUsers }));
    });
    global.fetch = fetchMock;
    renderWithAuth(<UserManagement />);

    await waitFor(() => expect(screen.getAllByText('Alex Thompson')[0]).toBeInTheDocument());

    const resetButtons = screen.getAllByText('Reset Password');
    fireEvent.click(resetButtons[0]);
    fireEvent.change(screen.getByLabelText('New Initial Password'), { target: { value: 'BrandNewPassword123!' } });
    // Row buttons (mobile card + desktop table, both present in the DOM under
    // jsdom regardless of Bootstrap's d-block/d-none classes) plus the modal's
    // own submit button all share this label — the modal's is appended last.
    const allResetPasswordButtons = screen.getAllByRole('button', { name: 'Reset Password' });
    fireEvent.click(allResetPasswordButtons[allResetPasswordButtons.length - 1]);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/reset-password'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('BR-13 defense in depth: the Active toggle is disabled when editing your own account', async () => {
    global.fetch = vi.fn().mockResolvedValue(jsonResponse({ success: true, data: mockUsers }));
    renderWithAuth(<UserManagement />);

    await waitFor(() => expect(screen.getAllByText('John Smith')[0]).toBeInTheDocument());

    const editButtons = screen.getAllByText('Edit');
    // John Smith (the signed-in admin, mockAdminUser.id === 10) is the third row in mockUsers
    fireEvent.click(editButtons[2]);

    expect(screen.getByLabelText('Active')).toBeDisabled();
    expect(screen.getByText('You cannot deactivate your own account.')).toBeInTheDocument();
  });

  it('BR-14 last-admin guard error from the API is surfaced when editing a different admin', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      const method = init?.method || 'GET';
      if (url.includes('/api/admin/users/10') && method === 'PATCH') {
        return Promise.resolve(jsonResponse({ success: false, error: { message: 'The system must have at least one active Administrator.' } }, 400));
      }
      return Promise.resolve(jsonResponse({ success: true, data: mockUsers }));
    });
    global.fetch = fetchMock;
    // A second admin (different id) editing John Smith, whose toggle is NOT disabled
    // since the target isn't the signed-in user this time.
    renderWithAuth(<UserManagement />, { ...mockAdminUser, id: 999 });

    await waitFor(() => expect(screen.getAllByText('John Smith')[0]).toBeInTheDocument());

    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[2]);
    expect(screen.getByLabelText('Active')).not.toBeDisabled();
    fireEvent.click(screen.getByLabelText('Active'));
    fireEvent.click(screen.getByText('Save User'));

    await waitFor(() => {
      expect(screen.getByText('The system must have at least one active Administrator.')).toBeInTheDocument();
    });
  });

  it('defense in depth: a non-Administrator role never sees this screen render its data', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: false, error: { message: 'Forbidden' } }), { status: 403 })
    );
    global.fetch = fetchMock;
    renderWithAuth(<UserManagement />, mockRequesterUser);

    await waitFor(() => {
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });
    expect(screen.queryByText('Alex Thompson')).not.toBeInTheDocument();
  });
});
