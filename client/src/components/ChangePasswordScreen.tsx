import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const ChangePasswordScreen: React.FC = () => {
  const { changePassword, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Password Checklist validation rules
  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumberOrSpecial = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
  const isMatching = newPassword !== '' && newPassword === confirmPassword;

  const isFormValid = hasMinLength && hasUpper && hasLower && hasNumberOrSpecial && isMatching && currentPassword !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isFormValid) {
      setErrorMessage('Please ensure all password requirements are satisfied.');
      return;
    }

    setIsSubmitting(true);
    const result = await changePassword(currentPassword, newPassword, confirmPassword);
    setIsSubmitting(false);

    if (!result.success && result.error) {
      setErrorMessage(result.error);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center px-3 py-4" style={{ backgroundColor: '#F0FDF4' }}>
      <div className="card border-0 shadow-lg p-4 p-md-5 w-100" style={{ maxWidth: '500px', borderRadius: '16px' }}>
        {/* Header Notice */}
        <div className="text-center mb-4">
          <div className="d-inline-flex align-items-center justify-content-center bg-amber-100 text-amber-800 p-3 rounded-circle mb-3" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
            </svg>
          </div>
          <h2 className="fw-bold text-dark mb-1 fs-4">Change Your Password</h2>
          <p className="text-muted fs-6 mb-0">
            You must change your initial password before accessing the application.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="alert alert-danger py-2 px-3 fs-6 d-flex align-items-center gap-2 mb-4" role="alert" style={{ borderRadius: '8px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
              <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
            </svg>
            <div>{errorMessage}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Current Password */}
          <div className="mb-3">
            <label className="form-label fw-semibold text-secondary fs-6">Current (Initial) Password</label>
            <input
              type="password"
              className="form-control form-control-lg fs-6"
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={isSubmitting}
              required
              style={{ borderRadius: '8px' }}
            />
          </div>

          {/* New Password */}
          <div className="mb-3">
            <label className="form-label fw-semibold text-secondary fs-6">New Password</label>
            <div className="input-group">
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-control form-control-lg fs-6"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isSubmitting}
                required
                style={{ borderTopLeftRadius: '8px', borderBottomLeftRadius: '8px' }}
              />
              <button
                type="button"
                className="btn btn-outline-secondary px-3"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                style={{ borderTopRightRadius: '8px', borderBottomRightRadius: '8px' }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div className="mb-4">
            <label className="form-label fw-semibold text-secondary fs-6">Confirm New Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              className="form-control form-control-lg fs-6"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isSubmitting}
              required
              style={{ borderRadius: '8px' }}
            />
          </div>

          {/* Live Password Requirements Checklist */}
          <div className="card bg-light border-0 p-3 mb-4" style={{ borderRadius: '8px', fontSize: '0.85rem' }}>
            <div className="fw-semibold text-dark mb-2">Password must:</div>
            <ul className="list-unstyled mb-0 d-flex flex-column gap-1">
              <li className={hasMinLength ? 'text-success fw-medium' : 'text-muted'}>
                {hasMinLength ? '✓' : '○'} Be at least 8 characters long
              </li>
              <li className={hasUpper && hasLower ? 'text-success fw-medium' : 'text-muted'}>
                {hasUpper && hasLower ? '✓' : '○'} Include upper and lower case letters
              </li>
              <li className={hasNumberOrSpecial ? 'text-success fw-medium' : 'text-muted'}>
                {hasNumberOrSpecial ? '✓' : '○'} Include a number and a special character
              </li>
              <li className={isMatching ? 'text-success fw-medium' : 'text-muted'}>
                {isMatching ? '✓' : '○'} Passwords match
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="d-flex flex-column gap-2">
            <button
              type="submit"
              className="btn btn-lg w-100 fw-bold text-white shadow-sm py-2"
              disabled={!isFormValid || isSubmitting}
              style={{
                backgroundColor: '#006B3C',
                borderColor: '#006B3C',
                borderRadius: '8px',
                opacity: !isFormValid || isSubmitting ? 0.7 : 1,
                cursor: !isFormValid || isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? (
                <span className="d-flex align-items-center justify-content-center gap-2">
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  Updating Password...
                </span>
              ) : (
                'Save Password & Continue'
              )}
            </button>

            <button
              type="button"
              onClick={logout}
              className="btn btn-link text-muted text-decoration-none btn-sm"
            >
              Cancel & Sign Out
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
