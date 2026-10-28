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
import { StaffTicketDetail } from './components/StaffTicketDetail';
import { UserManagement } from './components/UserManagement';
import { StaffDashboard } from './components/StaffDashboard';
import { RequesterDashboard } from './components/RequesterDashboard';
import type { QueueFilters } from './components/StaffTicketQueue';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

type NavKey = 'dashboard' | 'my-tickets' | 'create-ticket' | 'staff-queue' | 'user-management';

// Which nav destinations are valid for each role, and the default to fall back to
// when the current one isn't (e.g. right after login/logout/switching accounts).
const ALLOWED_NAVS_BY_ROLE: Record<string, NavKey[]> = {
  REQUESTER: ['dashboard', 'my-tickets', 'create-ticket'],
  IT_STAFF: ['dashboard', 'staff-queue'],
  ADMINISTRATOR: ['dashboard', 'staff-queue', 'user-management'],
};
const DEFAULT_NAV_BY_ROLE: Record<string, NavKey> = {
  REQUESTER: 'dashboard',
  IT_STAFF: 'dashboard',
  ADMINISTRATOR: 'dashboard',
};

const MainAppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { currentRequester } = useRequester();
  const [activeNav, setActiveNav] = useState<NavKey>('dashboard');
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  // Dashboard drill-down: initial filters for the list screens. `listKey` remounts the
  // list so a new drill-down always starts from the card's filter.
  const [queueFilters, setQueueFilters] = useState<QueueFilters | undefined>(undefined);
  const [myTicketsStatus, setMyTicketsStatus] = useState<string | undefined>(undefined);
  const [listKey, setListKey] = useState(0);

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
      setActiveNav('dashboard');
      setSelectedTicketId(null);
      return;
    }
    const allowed = ALLOWED_NAVS_BY_ROLE[activeUser.role] || [];
    if (!allowed.includes(activeNav)) {
      setActiveNav(DEFAULT_NAV_BY_ROLE[activeUser.role] || 'dashboard');
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
          setQueueFilters(undefined);
          setMyTicketsStatus(undefined);
          setListKey((k) => k + 1);
        }}
      />

      <main className="container-fluid px-3 px-md-5 py-4 flex-grow-1">
        {/* Requester Views */}
        {activeUser.role === 'REQUESTER' && (
          <>
            {activeNav === 'dashboard' && (
              selectedTicketId ? (
                <TicketDetailScreen ticketId={selectedTicketId} onBack={() => setSelectedTicketId(null)} />
              ) : (
                <RequesterDashboard
                  onOpenMyTickets={(status) => {
                    setMyTicketsStatus(status);
                    setListKey((k) => k + 1);
                    setActiveNav('my-tickets');
                  }}
                  onOpenTicket={(id) => setSelectedTicketId(id)}
                  onCreateTicket={() => setActiveNav('create-ticket')}
                />
              )
            )}

            {activeNav === 'my-tickets' && (
              selectedTicketId ? (
                <TicketDetailScreen
                  ticketId={selectedTicketId}
                  onBack={() => setSelectedTicketId(null)}
                />
              ) : (
                <MyTicketsScreen
                  key={listKey}
                  initialStatus={myTicketsStatus}
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

        {(activeUser.role === 'IT_STAFF' || activeUser.role === 'ADMINISTRATOR') && activeNav === 'dashboard' && (
          selectedTicketId ? (
            <StaffTicketDetail ticketId={selectedTicketId} onBack={() => setSelectedTicketId(null)} />
          ) : (
            <StaffDashboard
              onOpenQueue={(filters) => {
                setQueueFilters(filters);
                setListKey((k) => k + 1);
                setActiveNav('staff-queue');
              }}
              onOpenTicket={(id) => setSelectedTicketId(id)}
              onOpenUsers={activeUser.role === 'ADMINISTRATOR' ? () => setActiveNav('user-management') : undefined}
            />
          )
        )}

        {/* IT Staff Views (Issue 4: Queue; Issue 5: Ticket Detail operations) */}
        {(activeUser.role === 'IT_STAFF' || activeUser.role === 'ADMINISTRATOR') && activeNav === 'staff-queue' && (
          selectedTicketId ? (
            <StaffTicketDetail
              ticketId={selectedTicketId}
              onBack={() => setSelectedTicketId(null)}
            />
          ) : (
            <StaffTicketQueue key={listKey} initialFilters={queueFilters} onSelectTicket={(ticketId) => setSelectedTicketId(ticketId)} />
          )
        )}

        {/* Administrator Views (Issue 6) */}
        {activeUser.role === 'ADMINISTRATOR' && activeNav === 'user-management' && (
          <UserManagement />
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
