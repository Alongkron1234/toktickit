import React from 'react';
import { useRequester } from '../context/RequesterContext';

interface HeaderProps {
  activeNav: 'my-tickets' | 'create-ticket' | 'ticket-detail';
  onNavigate: (view: 'my-tickets' | 'create-ticket') => void;
}

export const Header: React.FC<HeaderProps> = ({ activeNav, onNavigate }) => {
  const { currentRequester, clearRequester } = useRequester();

  return (
    <header className="shadow-sm" style={{ backgroundColor: '#006B3C', color: '#FFFFFF' }}>
      <div className="container-fluid px-3 px-md-5 py-2 d-flex align-items-center justify-content-between flex-wrap gap-2">
        {/* Left Side: Brand Logo & Navigation */}
        <div className="d-flex align-items-center gap-4">
          <div className="d-flex align-items-center gap-2 cursor-pointer" onClick={() => onNavigate('my-tickets')}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z" />
              <path d="M8 4a.5.5 0 0 1 .5.5v3.5h3a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5v-4A.5.5 0 0 1 8 4z" />
            </svg>
            <span className="fs-4 fw-bold">TokTickIT</span>
          </div>

          <nav className="d-flex gap-2">
            <button
              onClick={() => onNavigate('my-tickets')}
              className={`btn btn-sm px-3 py-1 fw-semibold border-0 ${
                activeNav === 'my-tickets' ? 'text-white' : 'text-white-50'
              }`}
              style={{
                backgroundColor: activeNav === 'my-tickets' ? '#0B7A46' : 'transparent',
                borderRadius: '6px',
              }}
            >
              📄 My Tickets
            </button>
            <button
              onClick={() => onNavigate('create-ticket')}
              className={`btn btn-sm px-3 py-1 fw-semibold border-0 ${
                activeNav === 'create-ticket' ? 'text-white' : 'text-white-50'
              }`}
              style={{
                backgroundColor: activeNav === 'create-ticket' ? '#0B7A46' : 'transparent',
                borderRadius: '6px',
              }}
            >
              ➕ Create Ticket
            </button>
          </nav>
        </div>

        {/* Right Side: Active User Identity & Change Requester */}
        {currentRequester && (
          <div className="d-flex align-items-center gap-3">
            <div className="d-flex align-items-center gap-2 bg-white bg-opacity-10 px-3 py-1 rounded-pill">
              <span
                className="rounded-circle d-inline-flex align-items-center justify-content-center text-white fw-bold"
                style={{ width: '28px', height: '28px', backgroundColor: '#0B7A46', fontSize: '0.85rem' }}
              >
                {currentRequester.name.charAt(0)}
              </span>
              <div className="d-flex flex-column text-start lh-1">
                <span className="fw-semibold text-white fs-6">{currentRequester.name}</span>
                <span className="text-white-50" style={{ fontSize: '0.75rem' }}>
                  Requester Context
                </span>
              </div>
            </div>

            <button
              onClick={clearRequester}
              className="btn btn-outline-light btn-sm fw-semibold px-2 py-1"
              style={{ borderRadius: '6px', fontSize: '0.8rem' }}
              title="Switch Development Requester"
            >
              🔄 Change Requester
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
