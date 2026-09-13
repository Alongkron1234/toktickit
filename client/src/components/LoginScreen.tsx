import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(email, password);
    setIsSubmitting(false);

    if (!result.success && result.error) {
      setErrorMessage(result.error);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center px-3" style={{ backgroundColor: '#F0FDF4' }}>
      <div className="card border-0 shadow-lg p-4 p-md-5 w-100" style={{ maxWidth: '440px', borderRadius: '16px' }}>
        {/* Brand Header */}
        <div className="text-center mb-4">
          <div className="d-inline-flex align-items-center justify-content-center bg-emerald-100 text-emerald-800 p-3 rounded-circle mb-3" style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
              <path d="M8 4a.5.5 0 0 1 .5.5v3.5h3a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5v-4A.5.5 0 0 1 8 4z" />
            </svg>
          </div>
          <h2 className="fw-bold text-dark mb-1 fs-3">TokTickIT</h2>
          <p className="text-muted fs-6 mb-0">Sign in to your account</p>
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

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label fw-semibold text-secondary fs-6">Email address</label>
            <input
              type="email"
              className="form-control form-control-lg fs-6"
              placeholder="name@toktickit.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              required
              style={{ borderRadius: '8px' }}
            />
          </div>

          <div className="mb-4">
            <label className="form-label fw-semibold text-secondary fs-6">Password</label>
            <div className="input-group">
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-control form-control-lg fs-6"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

          <button
            type="submit"
            className="btn btn-lg w-100 fw-bold text-white shadow-sm py-2"
            disabled={isSubmitting}
            style={{
              backgroundColor: '#006B3C',
              borderColor: '#006B3C',
              borderRadius: '8px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? (
              <span className="d-flex align-items-center justify-content-center gap-2">
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Quick Test Credential Hint */}
        <div className="mt-4 pt-3 border-top text-center text-muted" style={{ fontSize: '0.8rem' }}>
          <div className="fw-semibold mb-1">Seed Test Credentials:</div>
          <div>Initial Password: <code>InitialPassword123!</code></div>
          <div className="mt-1">
            <strong>Requester:</strong> <code>jennifer.anderson@example.com</code><br />
            <strong>IT Staff:</strong> <code>alex.thompson@toktickit.com</code><br />
            <strong>Admin:</strong> <code>john.smith@toktickit.com</code>
          </div>
        </div>
      </div>
    </div>
  );
};
