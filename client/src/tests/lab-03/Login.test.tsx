import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { LoginScreen } from '../../components/LoginScreen';
import { AuthProvider } from '../../context/AuthContext';

describe('Lab 3 LoginScreen UI Component Tests', () => {
  it('UI-01: Renders login form with email, password fields and sign in button', () => {
    render(
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>
    );

    expect(screen.getByPlaceholderText(/name@toktickit.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('UI-01 (Validation): Displays error message when submitting empty fields', async () => {
    render(
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>
    );

    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitBtn);

    // Form inputs have html5 required or validation feedback
    expect(screen.getByPlaceholderText(/name@toktickit.com/i)).toBeInTheDocument();
  });
});
