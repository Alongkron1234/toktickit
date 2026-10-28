import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { MetricCard } from './MetricCard';
import { Icon } from './Icon';
import { getStatusPill, formatStatus, formatDate } from '../utils/badges';

interface DashboardTicket {
  id: number;
  ticketNumber: string;
  summary: string;
  currentStatus: string;
  updatedAt: string;
}

interface RequesterDashboardData {
  generatedAt: string;
  metrics: { open: number; inProgress: number; waitingForRequester: number; resolved: number; closed: number };
  recentlyUpdated: DashboardTicket[];
  recentlyResolved: DashboardTicket[];
}

export interface RequesterDashboardProps {
  onOpenMyTickets: (status?: string) => void;
  onOpenTicket: (ticketId: number) => void;
  onCreateTicket: () => void;
}

const TicketList: React.FC<{ title: string; items: DashboardTicket[]; empty: string; onOpen: (id: number) => void }> = ({
  title, items, empty, onOpen,
}) => (
  <section aria-label={title} className="dash-panel mb-3">
    <h2 className="fw-bold mb-2">{title}</h2>
    {items.length === 0 ? (
      <p className="text-muted mb-0">{empty}</p>
    ) : (
      <ul className="list-unstyled mb-0">
        {items.map((t) => (
          <li key={t.id} className="dash-li">
            <button type="button" className="dash-row" onClick={() => onOpen(t.id)}>
              <span className="d-flex flex-column gap-1" style={{ minHeight: "44px" }}>
                <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                  <span className="fw-semibold" style={{ color: '#006B3C' }}>{t.ticketNumber}</span>{' '}
                  <span className="text-dark">{t.summary}</span>
                </span>
                <span className="d-flex align-items-center gap-2">
                  <span style={getStatusPill(t.currentStatus)}>{formatStatus(t.currentStatus)}</span>
                  <small className="text-muted">{formatDate(t.updatedAt)}</small>
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    )}
  </section>
);

export const RequesterDashboard: React.FC<RequesterDashboardProps> = ({ onOpenMyTickets, onOpenTicket, onCreateTicket }) => {
  const { user, token, logout } = useAuth();
  const [data, setData] = useState<RequesterDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    setForbidden(false);
    try {
      const res = await fetch('/api/dashboard/requester', { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 401) { logout(); return; }
      if (res.status === 403) { setForbidden(true); return; }
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error('failed');
      setData(body.data);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [token, logout]);

  useEffect(() => { load(); }, [load]);

  const firstName = (user?.name ?? '').split(' ')[0];
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const SUBTITLE = 'Here is where your requests stand';

  if (forbidden) {
    return (
      <div className="text-center py-5" role="alert">
        <h2 className="fs-4">Access Denied</h2>
        <p className="text-muted">You don't have permission to view this dashboard.</p>
      </div>
    );
  }

  const m = data?.metrics;

  return (
    <div>
      <div className="dash-hero d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h1 className="fs-3 fw-bold mb-1">Welcome back, {firstName}</h1>
          <div className="dash-sub">{SUBTITLE} · {today}</div>
        </div>
        <button type="button" className="btn btn-refresh" onClick={load} disabled={loading} style={{ minHeight: '44px' }}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {loading && !data && <p role="status" aria-live="polite">Loading dashboard...</p>}

      {failed && (
        <div className="alert alert-danger d-flex flex-wrap align-items-center justify-content-between gap-2" role="alert">
          <span>We couldn't load the dashboard.</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={load}>Retry</button>
        </div>
      )}

      {data && m && (
        <>
          <div className="row g-3 mb-4">
            <div className="col-6 col-md-4 col-lg"><MetricCard icon="inbox" accent="#0284C7" accentBg="#E0F2FE" label="Open" value={m.open} onClick={() => onOpenMyTickets('NEW,OPEN,REOPENED')} /></div>
            <div className="col-6 col-md-4 col-lg"><MetricCard icon="tool" accent="#16A34A" accentBg="#DCFCE7" label="In Progress" value={m.inProgress} onClick={() => onOpenMyTickets('IN_PROGRESS')} /></div>
            <div className="col-6 col-md-4 col-lg">
              <MetricCard
                icon="message"
                accent="#EA580C"
                accentBg="#FFEDD5"
                label="Waiting for Requester"
                value={m.waitingForRequester}
                highlight={m.waitingForRequester > 0}
                cue={m.waitingForRequester > 0 ? 'Needs your reply' : undefined}
                onClick={() => onOpenMyTickets('WAITING_FOR_REQUESTER')}
              />
            </div>
            <div className="col-6 col-md-4 col-lg"><MetricCard icon="check" accent="#166534" accentBg="#DCFCE7" label="Resolved" value={m.resolved} onClick={() => onOpenMyTickets('RESOLVED')} /></div>
            <div className="col-6 col-md-4 col-lg"><MetricCard icon="archive" accent="#64748B" accentBg="#F1F5F9" label="Closed" value={m.closed} onClick={() => onOpenMyTickets('CLOSED')} /></div>
          </div>

          <div className="row g-3">
            <div className="col-12 col-lg-8">
              <TicketList title="Recently Updated" items={data.recentlyUpdated} empty="No tickets to show yet." onOpen={onOpenTicket} />
              <TicketList title="Recently Resolved" items={data.recentlyResolved} empty="No tickets resolved in the last 7 days." onOpen={onOpenTicket} />
            </div>
            <div className="col-12 col-lg-4">
              <section className="dash-panel" aria-label="Quick Actions">
                <h2 className="fw-bold mb-3"><Icon name="zap" /> Quick Actions</h2>
                <div className="d-grid gap-2">
                  <button type="button" className="btn btn-success" style={{ minHeight: '44px' }} onClick={onCreateTicket}>Create Ticket</button>
                  <button type="button" className="btn btn-outline-success" style={{ minHeight: '44px' }} onClick={() => onOpenMyTickets()}>View My Tickets</button>
                </div>
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
