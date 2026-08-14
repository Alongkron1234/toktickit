import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../../src/App';

describe('UI Tests for Lab 1 (TokTickIT UI)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('UI-01: TokTickIT heading renders', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /TokTickIT IT Service Desk/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Check System/i })).toBeInTheDocument();
  });

  it('UI-02: Loading state changes to category list', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const urlStr = typeof url === 'string' ? url : (url as Request).url;
      if (urlStr.includes('/api/health')) {
        return {
          ok: true,
          json: async () => ({ status: 'ok', service: 'TokTickIT API' }),
        } as Response;
      }
      if (urlStr.includes('/api/categories')) {
        return {
          ok: true,
          json: async () => [
            { id: 1, name: 'Account and Access' },
            { id: 2, name: 'Hardware' },
            { id: 3, name: 'Software' },
            { id: 4, name: 'Network' },
          ],
        } as Response;
      }
      return { ok: false } as Response;
    });

    render(<App />);
    const button = screen.getByRole('button', { name: /Check System/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/System Status: Online/i)).toBeInTheDocument();
      expect(screen.getByText(/Supported Request Categories:/i)).toBeInTheDocument();
      expect(screen.getByText(/Account and Access/i)).toBeInTheDocument();
      expect(screen.getByText(/Hardware/i)).toBeInTheDocument();
      expect(screen.getByText(/Software/i)).toBeInTheDocument();
      expect(screen.getByText(/Network/i)).toBeInTheDocument();
    });
  });

  it('UI-03: API failure displays a useful error message', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    render(<App />);
    const button = screen.getByRole('button', { name: /Check System/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/System Status: Offline/i)).toBeInTheDocument();
      expect(screen.getByText(/Unable to connect to TokTickIT API/i)).toBeInTheDocument();
    });
  });
});
