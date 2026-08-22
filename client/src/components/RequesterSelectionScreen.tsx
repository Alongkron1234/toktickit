import React, { useState } from 'react';
import { useRequester } from '../context/RequesterContext';

export const RequesterSelectionScreen: React.FC = () => {
  const { requesters, loading, error, selectRequester, fetchRequesters } = useRequester();
  const [selectedId, setSelectedId] = useState<string>('');

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedId) {
      selectRequester(parseInt(selectedId, 10));
    }
  };

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: '#F5F7F6' }}>
      {/* App Header */}
      <header className="py-3 px-4 shadow-sm" style={{ backgroundColor: '#006B3C', color: '#FFFFFF' }}>
        <div className="container-fluid d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-2">
            <span className="fs-4 fw-bold">TokTickIT</span>
            <span className="badge bg-light text-success ms-2 fs-6">Lab 2 MVP</span>
          </div>
        </div>
      </header>

      {/* Main Selection Area */}
      <div className="container d-flex flex-column align-items-center justify-content-center flex-grow-1 py-5">
        <div
          className="card shadow-sm border-0 p-4 w-100"
          style={{ maxWidth: '520px', borderRadius: '12px', backgroundColor: '#FFFFFF' }}
        >
          {/* User Icon Circle */}
          <div className="text-center mb-3">
            <div
              className="rounded-circle d-inline-flex align-items-center justify-content-center"
              style={{ width: '64px', height: '64px', backgroundColor: '#EAF6EF', color: '#006B3C' }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
                <path
                  fillRule="evenodd"
                  d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1z"
                />
              </svg>
            </div>
          </div>

          <h2 className="text-center fw-bold mb-2" style={{ color: '#1A2E26', fontSize: '1.5rem' }}>
            Select Development Requester
          </h2>
          <p className="text-center text-muted fs-6 mb-4">
            Choose a development requester to simulate the current requester context for Lab 2. This is for testing only and is not a login screen.
          </p>

          {/* Callout Notice */}
          <div
            className="alert d-flex align-items-start gap-2 mb-4"
            style={{ backgroundColor: '#EAF6EF', borderColor: '#BBE6CE', color: '#006B3C', borderRadius: '8px' }}
            role="alert"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              fill="currentColor"
              className="flex-shrink-0 mt-1"
              viewBox="0 0 16 16"
            >
              <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
            </svg>
            <div>
              <strong className="d-block mb-1">Authentication coming in Lab 3</strong>
              <small style={{ fontSize: '0.85rem' }}>
                In Lab 3, this selection will be replaced with secure authentication so you can access the system with your own account.
              </small>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-4">
              <div className="spinner-border text-success" role="status">
                <span className="visually-hidden">Loading Requesters...</span>
              </div>
              <p className="mt-2 text-muted">Loading active development requesters...</p>
            </div>
          )}

          {/* API Error State */}
          {error && !loading && (
            <div className="alert alert-danger text-center" role="alert">
              <p className="mb-2">{error}</p>
              <button className="btn btn-outline-danger btn-sm" onClick={fetchRequesters}>
                Retry Loading
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && requesters.length === 0 && (
            <div className="text-center py-3 text-muted">
              <p className="mb-1">No active development requesters found.</p>
              <small>Please check the database seed or contact your instructor.</small>
            </div>
          )}

          {/* Selection Form */}
          {!loading && !error && requesters.length > 0 && (
            <form onSubmit={handleContinue}>
              <div className="mb-4">
                <label htmlFor="requesterSelect" className="form-label fw-semibold" style={{ color: '#1A2E26' }}>
                  Development Requester <span className="text-danger">*</span>
                </label>
                <select
                  id="requesterSelect"
                  className="form-select form-select-lg"
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  style={{ borderColor: '#CBD5E1', fontSize: '1rem' }}
                  required
                >
                  <option value="">-- Select a Requester --</option>
                  {requesters.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.email})
                    </option>
                  ))}
                </select>
                <div className="form-text text-muted">Only active development requesters are shown.</div>
              </div>

              <div className="d-grid gap-2">
                <button
                  type="submit"
                  className="btn btn-lg text-white fw-semibold"
                  disabled={!selectedId}
                  style={{
                    backgroundColor: selectedId ? '#006B3C' : '#94A3B8',
                    borderColor: selectedId ? '#006B3C' : '#94A3B8',
                  }}
                >
                  Continue →
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
