import React, { useState } from 'react';
import { RequesterProvider, useRequester } from './context/RequesterContext';
import { RequesterSelectionScreen } from './components/RequesterSelectionScreen';
import { Header } from './components/Header';
import { CreateTicketScreen } from './components/CreateTicketScreen';
import { MyTicketsScreen } from './components/MyTicketsScreen';
import { TicketDetailScreen } from './components/TicketDetailScreen';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

const MainAppContent: React.FC = () => {
  const { currentRequester } = useRequester();
  const [activeNav, setActiveNav] = useState<'my-tickets' | 'create-ticket'>('my-tickets');
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  // Unselected Guard: Redirect/render Requester Selection Screen if no requester selected
  if (!currentRequester) {
    return <RequesterSelectionScreen />;
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
              setActiveNav(nav);
            }}
          />
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
