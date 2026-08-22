import React, { useState } from 'react';
import { RequesterProvider, useRequester } from './context/RequesterContext';
import { RequesterSelectionScreen } from './components/RequesterSelectionScreen';
import { Header } from './components/Header';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

const MainAppContent: React.FC = () => {
  const { currentRequester } = useRequester();
  const [activeNav, setActiveNav] = useState<'my-tickets' | 'create-ticket'>('my-tickets');

  // Unselected Guard: Redirect/render Requester Selection Screen if no requester selected
  if (!currentRequester) {
    return <RequesterSelectionScreen />;
  }

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: '#F5F7F6' }}>
      <Header activeNav={activeNav} onNavigate={setActiveNav} />

      <main className="container-fluid px-3 px-md-5 py-4 flex-grow-1">
        {activeNav === 'my-tickets' && (
          <div className="card shadow-sm border-0 p-4 w-100" style={{ borderRadius: '10px' }}>
            <h1 className="fw-bold fs-3 mb-2" style={{ color: '#1A2E26' }}>
              My Tickets
            </h1>
            <p className="text-muted mb-4">View and track all of your support requests.</p>
            <div className="alert alert-info">
              My Tickets list view placeholder for Issue 7. Active user: <strong>{currentRequester.name}</strong> ({currentRequester.email}).
            </div>
          </div>
        )}

        {activeNav === 'create-ticket' && (
          <div className="card shadow-sm border-0 p-4 w-100" style={{ borderRadius: '10px' }}>
            <h1 className="fw-bold fs-3 mb-2" style={{ color: '#1A2E26' }}>
              Create IT Support Ticket
            </h1>
            <p className="text-muted mb-4">Submit a new request for IT support.</p>
            <div className="alert alert-info">
              Create Ticket form placeholder for Issue 5. Active user: <strong>{currentRequester.name}</strong> ({currentRequester.email}).
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <RequesterProvider>
      <MainAppContent />
    </RequesterProvider>
  );
};

export default App;
