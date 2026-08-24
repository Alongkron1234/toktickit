import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from '../../App';

describe('UI Tests for Lab 1 (TokTickIT UI - Legacy)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('UI-01: TokTickIT application brand heading renders in Lab 2 shell', () => {
    render(<App />);
    expect(screen.getByText(/TokTickIT/i)).toBeInTheDocument();
  });
});
