import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ChangePasswordScreen } from '../../components/ChangePasswordScreen';
import { AuthProvider } from '../../context/AuthContext';

describe('Lab 3 ChangePasswordScreen UI Component Tests', () => {
  it('UI-02: Renders Change Password header and live checklist', () => {
    render(
      <AuthProvider>
        <ChangePasswordScreen />
      </AuthProvider>
    );

    expect(screen.getByText(/change your password/i)).toBeInTheDocument();
    expect(screen.getByText(/password must:/i)).toBeInTheDocument();
    expect(screen.getByText(/be at least 8 characters long/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save password & continue/i })).toBeInTheDocument();
  });
});
