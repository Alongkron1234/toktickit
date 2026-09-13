import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RequesterProvider, useRequester } from './context/RequesterContext';
import { LoginScreen } from './components/LoginScreen';
import { ChangePasswordScreen } from './components/ChangePasswordScreen';
import { Header } from './components/Header';
import { CreateTicketScreen } from './components/CreateTicketScreen';
import { MyTicketsScreen } from './components/MyTicketsScreen';
import { TicketDetailScreen } from './components/TicketDetailScreen';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

const MainAppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { currentRequester } = useRequester();
  const [activeNav, setActiveNav] = useState<'my-tickets' | 'create-ticket' | 'staff-queue' | 'user-management'>('my-tickets');
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading application...</span>
        </div>
      </div>
    );
  }

  // Active user identity either from AuthContext or RequesterContext (Lab 2 compatibility)
  const activeUser = user || (currentRequester ? {
    id: currentRequester.id,
    name: currentRequester.name,
    email: currentRequester.email,
    role: 'REQUESTER' as const,
    isActive: true,
    requiresPasswordChange: false,
  } : null);

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

        {/* IT Staff Views Placeholder (Issue 4 & Issue 5) */}
        {(activeUser.role === 'IT_STAFF' || activeUser.role === 'ADMINISTRATOR') && activeNav === 'staff-queue' && (
          <div className="card border-0 shadow-sm p-4 text-center">
            <h4 className="fw-bold text-secondary">📋 IT Staff Ticket Queue</h4>
            <p className="text-muted">The operational IT Staff Ticket Queue screen will be integrated in Issue 4 & Issue 5.</p>
          </div>
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
