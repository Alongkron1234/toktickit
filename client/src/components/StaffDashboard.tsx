import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { MetricCard } from './MetricCard';
import { Icon } from './Icon';
import type { QueueFilters } from './StaffTicketQueue';
import { getStatusPill, getPriorityPill, getActionStatusPill, formatStatus, formatPriority, formatDate } from '../utils/badges';

interface DashboardTicket {
  id: number;
  ticketNumber: string;
  summary: string;
  currentStatus: string;
  updatedAt: string;
}

interface DashboardAction {
  id: number;
  ticketId: number;
  ticketNumber: string;
  description: string;
  status: string;
  actionAt: string;
}

interface StaffDashboardData {
  generatedAt: string;
  metrics: {
    new: number;
    open: number;
    inProgress: number;
    waitingForRequester: number;
    myAssigned: number;
    unassigned: number;
    myOpenActions: number;
    byItPriority: Record<string, number>;
  };
  myRecentTickets: DashboardTicket[];
  myRecentActions: DashboardAction[];
  userCounts: null | { active: number; inactive: number; activeByRole: Record<string, number> };
}

export interface StaffDashboardProps {
  onOpenQueue: (filters?: QueueFilters) => void;
  onOpenTicket: (ticketId: number) => void;
  onOpenUsers?: () => void;
}

const ACTIVE = 'NEW,OPEN,IN_PROGRESS,WAITING_FOR_REQUESTER,REOPENED';
const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const PRIORITY_BAR: Record<string, string> = { CRITICAL: '#DC2626', HIGH: '#F87171', MEDIUM: '#FBBF24', LOW: '#4ADE80' };

export const StaffDashboard: React.FC<StaffDashboardProps> = ({ onOpenQueue, onOpenTicket, onOpenUsers }) => {
  const { user, token, logout } = useAuth();
  const [data, setData] = useState<StaffDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    setForbidden(false);
    try {
      const res = await fetch('/api/dashboard/staff', { headers: { Authorization: `Bearer ${token}` } });
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
  const SUBTITLE = 'Your service desk at a glance';

  if (forbidden) {
    return (
      <div className="text-center py-5" role="alert">
        <h2 className="fs-4">Access Denied</h2>
        <p className="text-muted">You don't have permission to view this dashboard.</p>
      </div>
    );
  }

  const m = data?.metrics;
  const maxPriority = Math.max(1, ...PRIORITIES.map((p) => m?.byItPriority[p] ?? 0));

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
            <div className="col-6 col-md-4 col-xl-2"><MetricCard icon="plusCircle" accent="#15803D" accentBg="#DCFCE7" label="New" value={m.new} onClick={() => onOpenQueue({ status: 'NEW' })} /></div>
            <div className="col-6 col-md-4 col-xl-2"><MetricCard icon="inbox" accent="#0284C7" accentBg="#E0F2FE" label="Open" value={m.open} onClick={() => onOpenQueue({ status: 'OPEN,REOPENED' })} /></div>
            <div className="col-6 col-md-4 col-xl-2"><MetricCard icon="tool" accent="#16A34A" accentBg="#DCFCE7" label="In Progress" value={m.inProgress} onClick={() => onOpenQueue({ status: 'IN_PROGRESS' })} /></div>
            <div className="col-6 col-md-4 col-xl-2"><MetricCard icon="clock" accent="#EA580C" accentBg="#FFEDD5" label="Waiting for Requester" value={m.waitingForRequester} onClick={() => onOpenQueue({ status: 'WAITING_FOR_REQUESTER' })} /></div>
            <div className="col-6 col-md-4 col-xl-2"><MetricCard icon="user" accent="#006B3C" accentBg="#EAF6EF" label="My Assigned" value={m.myAssigned} onClick={() => onOpenQueue({ status: ACTIVE, ownerId: 'me' })} /></div>
            <div className="col-6 col-md-4 col-xl-2"><MetricCard icon="inbox" accent="#D97706" accentBg="#FEF3C7" label="Unassigned" value={m.unassigned} onClick={() => onOpenQueue({ status: ACTIVE, ownerId: 'unassigned' })} /></div>
          </div>

          <div className="row g-3">
            <div className="col-12 col-lg-8">
              <section aria-label="My Recent Tickets" className="dash-panel mb-3">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h2 className="fw-bold mb-0"><Icon name="ticket" /> My Recent Tickets</h2>
                  <button type="button" className="btn btn-link p-0" onClick={() => onOpenQueue()}>View all</button>
                </div>
                {data.myRecentTickets.length === 0 ? (
                  <p className="text-muted mb-0">No tickets to show yet.</p>
                ) : (
                  <ul className="list-unstyled mb-0">
                    {data.myRecentTickets.map((t) => (
                      <li key={t.id} className="dash-li">
                        <button type="button" className="dash-row" onClick={() => onOpenTicket(t.id)}>
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

              <section className="dash-panel" aria-label="My Actions Taken">
                <h2 className="fw-bold mb-1"><Icon name="fileText" /> My Actions Taken</h2>
                <p className="text-muted small mb-3">Open actions assigned to me: {m.myOpenActions}</p>
                {data.myRecentActions.length === 0 ? (
                  <p className="text-muted mb-0">No actions recorded yet.</p>
                ) : (
                  <ul className="list-unstyled mb-0">
                    {data.myRecentActions.map((a) => (
                      <li key={a.id} className="dash-li">
                        <button type="button" className="dash-row" onClick={() => onOpenTicket(a.ticketId)}>
                          <span className="d-flex flex-column gap-1" style={{ minHeight: "44px" }}>
                            <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                              <span className="text-dark">{a.description}</span>{' '}
                              <span className="fw-semibold" style={{ color: '#006B3C' }}>{a.ticketNumber}</span>
                            </span>
                            <span className="d-flex align-items-center gap-2">
                              <span style={getActionStatusPill(a.status)}>{formatStatus(a.status)}</span>
                              <small className="text-muted">{formatDate(a.actionAt)}</small>
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <div className="col-12 col-lg-4">
              <section aria-label="Quick Actions" className="dash-panel mb-3">
                <h2 className="fw-bold mb-3"><Icon name="zap" /> Quick Actions</h2>
                <div className="d-grid gap-2">
                  <button type="button" className="btn btn-success" style={{ minHeight: '44px' }} onClick={() => onOpenQueue()}>Ticket Queue</button>
                  <button type="button" className="btn btn-outline-success" style={{ minHeight: '44px' }} onClick={() => onOpenQueue({ focusSearch: true })}>Search Tickets</button>
                </div>
              </section>

              <section aria-label="Tickets by IT Priority" className="dash-panel mb-3">
                <h2 className="fw-bold mb-2"><Icon name="chart" /> Tickets by IT Priority</h2>
                <ul className="list-unstyled mb-0">
                  {PRIORITIES.map((p) => (
                    <li key={p} className="dash-li">
                      <button
                        type="button"
                        className="dash-row"
                        aria-label={`${formatPriority(p)} priority: ${m.byItPriority[p] ?? 0}, view list`}
                        onClick={() => onOpenQueue({ status: ACTIVE, priority: p })}
                      >
                        <span className="d-flex justify-content-between align-items-center mb-1">
                          <span style={getPriorityPill(p)}>{formatPriority(p)}</span>
                          <span className="fw-bold text-dark">{m.byItPriority[p] ?? 0}</span>
                        </span>
                        <span className="prio-bar d-block" aria-hidden="true">
                          <span style={{ width: `${((m.byItPriority[p] ?? 0) / maxPriority) * 100}%`, backgroundColor: PRIORITY_BAR[p] }} />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>

              {data.userCounts && (
                <section className="dash-panel" aria-label="Accounts">
                  <h2 className="fw-bold mb-2"><Icon name="users" /> Accounts</h2>
                  <p className="mb-1">Active: <strong>{data.userCounts.active}</strong> · Inactive: <strong>{data.userCounts.inactive}</strong></p>
                  <p className="text-muted small">
                    Requesters {data.userCounts.activeByRole.REQUESTER ?? 0} · IT Staff {data.userCounts.activeByRole.IT_STAFF ?? 0} · Administrators {data.userCounts.activeByRole.ADMINISTRATOR ?? 0}
                  </p>
                  {onOpenUsers && (
                    <button type="button" className="btn btn-outline-success btn-sm" onClick={onOpenUsers}>Manage users</button>
                  )}
                </section>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
