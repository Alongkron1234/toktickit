import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../../App';

describe('Lab 2 UI Tests (Issue 3 - Development Requester Selector & Context)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

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

    // 1. Verify Unselected Guard renders Requester Selection Screen
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Select Development Requester/i })).toBeInTheDocument();
      expect(screen.getByText(/In Lab 3, this selection will be replaced with secure authentication/i)).toBeInTheDocument();
    });

    // 2. Verify Dropdown renders active requesters
    const selectControl = screen.getByRole('combobox', { name: /Development Requester/i });
    expect(selectControl).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Jennifer Anderson/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Michael Brown/i })).toBeInTheDocument();

    // 3. Select Requester and click Continue
    fireEvent.change(selectControl, { target: { value: '1' } });
    const continueBtn = screen.getByRole('button', { name: /Continue/i });
    expect(continueBtn).not.toBeDisabled();
    fireEvent.click(continueBtn);

    // 4. Verify identity context header and app shell are rendered
    await waitFor(() => {
      expect(screen.getAllByText(/Jennifer Anderson/i).length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: /Change Requester/i })).toBeInTheDocument();
    });
  });

  it('UI-01b: Change Requester button clears context and returns to Selection Screen', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const urlStr = typeof url === 'string' ? url : (url as Request).url;
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
      return { ok: false } as Response;
    });

    render(<App />);

    // Select Requester
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    // Click Change Requester
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Change Requester/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Change Requester/i }));

    // Verify redirected back to Selection Screen
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Select Development Requester/i })).toBeInTheDocument();
    });
  });
});
