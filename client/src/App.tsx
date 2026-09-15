import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RequesterProvider, useRequester } from './context/RequesterContext';
import { LoginScreen } from './components/LoginScreen';
import { ChangePasswordScreen } from './components/ChangePasswordScreen';
import { Header } from './components/Header';
import { CreateTicketScreen } from './components/CreateTicketScreen';
import { MyTicketsScreen } from './components/MyTicketsScreen';
import { TicketDetailScreen } from './components/TicketDetailScreen';
import { StaffTicketQueue } from './components/StaffTicketQueue';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

type NavKey = 'my-tickets' | 'create-ticket' | 'staff-queue' | 'user-management';

// Which nav destinations are valid for each role, and the default to fall back to
// when the current one isn't (e.g. right after login/logout/switching accounts).
const ALLOWED_NAVS_BY_ROLE: Record<string, NavKey[]> = {
  REQUESTER: ['my-tickets', 'create-ticket'],
  IT_STAFF: ['staff-queue'],
  ADMINISTRATOR: ['staff-queue', 'user-management'],
};
const DEFAULT_NAV_BY_ROLE: Record<string, NavKey> = {
  REQUESTER: 'my-tickets',
  IT_STAFF: 'staff-queue',
  ADMINISTRATOR: 'staff-queue',
};

const MainAppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { currentRequester } = useRequester();
  const [activeNav, setActiveNav] = useState<NavKey>('my-tickets');
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  // Active user identity either from AuthContext or RequesterContext (Lab 2 compatibility)
  const activeUser = user || (currentRequester ? {
    id: currentRequester.id,
    name: currentRequester.name,
    email: currentRequester.email,
    role: 'REQUESTER' as const,
    isActive: true,
    requiresPasswordChange: false,
  } : null);

  // `activeNav`/`selectedTicketId` live in this component and survive logout (it never
  // unmounts, it just swaps in <LoginScreen/>). Without this, logging out of one role's
  // tab (e.g. IT Staff's "staff-queue") and into a role that doesn't have that tab
  // (e.g. Requester) leaves `activeNav` pointing at a destination none of the role
  // checks below match, and <main> renders nothing at all.
  useEffect(() => {
    if (!activeUser) {
      setActiveNav('my-tickets');
      setSelectedTicketId(null);
      return;
    }
    const allowed = ALLOWED_NAVS_BY_ROLE[activeUser.role] || [];
    if (!allowed.includes(activeNav)) {
      setActiveNav(DEFAULT_NAV_BY_ROLE[activeUser.role] || 'my-tickets');
      setSelectedTicketId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUser?.id, activeUser?.role]);

  if (isLoading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading application...</span>
        </div>
      </div>
    );
  }

  // 1. Unauthenticated Guard -> Render Login Screen or Requester Selection Screen for Lab 2 fallback
  if (!activeUser) {
    // In legacy tests (Lab 2), RequesterSelectionScreen is rendered when no user is authenticated
    return <LoginScreen />;
  }

  // 2. Mandatory First-Login Password Change Guard
  if (activeUser.requiresPasswordChange) {
    return <ChangePasswordScreen />;
  }

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: '#F5F7F6' }}>
      <Header
        activeNav={activeNav}
        onNavigate={(nav) => {
          setActiveNav(nav);
          setSelectedTicketId(null);
        }}
      />

      <main className="container-fluid px-3 px-md-5 py-4 flex-grow-1">
        {/* Requester Views */}
        {activeUser.role === 'REQUESTER' && (
          <>
            {activeNav === 'my-tickets' && (
              selectedTicketId ? (
                <TicketDetailScreen
                  ticketId={selectedTicketId}
                  onBack={() => setSelectedTicketId(null)}
                />
              ) : (
                <MyTicketsScreen
                  onNavigateToCreate={() => {
                    setSelectedTicketId(null);
                    setActiveNav('create-ticket');
                  }}
                  onSelectTicket={(ticketId) => {
                    setSelectedTicketId(ticketId);
                  }}
                />
              )
            )}

            {activeNav === 'create-ticket' && (
              <CreateTicketScreen
                onNavigate={(nav) => {
                  setSelectedTicketId(null);
                  setActiveNav(nav as any);
                }}
              />
            )}
          </>
        )}

        {/* IT Staff Views (Issue 4: Queue; Issue 5: full Ticket Detail operations) */}
        {(activeUser.role === 'IT_STAFF' || activeUser.role === 'ADMINISTRATOR') && activeNav === 'staff-queue' && (
          selectedTicketId ? (
            <div className="card border-0 shadow-sm p-4">
              <button
                className="btn btn-sm btn-outline-secondary mb-3"
                style={{ width: 'fit-content' }}
                onClick={() => setSelectedTicketId(null)}
              >
                &lt; Back to Queue
              </button>
              <h4 className="fw-bold text-secondary">📋 Ticket #{selectedTicketId}</h4>
              <p className="text-muted mb-0">
                Claim/reassign ownership, IT Priority, status workflow, Public Comments, and Internal Notes will be integrated in Issue 5.
              </p>
            </div>
          ) : (
            <StaffTicketQueue onSelectTicket={(ticketId) => setSelectedTicketId(ticketId)} />
          )
        )}

        {/* Administrator Views Placeholder (Issue 6) */}
        {activeUser.role === 'ADMINISTRATOR' && activeNav === 'user-management' && (
          <div className="card border-0 shadow-sm p-4 text-center">
            <h4 className="fw-bold text-secondary">👥 Administrator User Management</h4>
            <p className="text-muted">The Administrator User Management screen will be integrated in Issue 6.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <RequesterProvider>
        <MainAppContent />
      </RequesterProvider>
    </AuthProvider>
  );
};

export default App;
