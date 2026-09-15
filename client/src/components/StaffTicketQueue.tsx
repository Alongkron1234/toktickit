import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getPriorityPill, getStatusPill, formatStatus, formatPriority, formatDate, getPaginationPages } from '../utils/badges';

export interface StaffTicketItem {
  id: number;
  ticketNumber: string;
  summary: string;
  requestedPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  itPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  currentStatus: 'NEW' | 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_REQUESTER' | 'RESOLVED' | 'CLOSED' | 'REOPENED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  category: { id: number; name: string };
  requester: { id: number; name: string; email: string };
  owner: { id: number; name: string; email: string } | null;
}

export interface StaffQueuePagination {
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

export interface StaffTicketQueueProps {
  onSelectTicket?: (ticketId: number) => void;
}

const thStyle: React.CSSProperties = {
  backgroundColor: '#EBF5F0',
  color: '#166534',
  fontWeight: 600,
  fontSize: '0.82rem',
  borderBottom: '2px solid #C6E0D5',
  whiteSpace: 'nowrap',
  userSelect: 'none',
};

const selectStyle: React.CSSProperties = {
  borderRadius: '8px',
  fontSize: '0.82rem',
  height: '38px',
  border: '1px solid #D1D5DB',
  paddingLeft: '12px',
  paddingRight: '32px',
  cursor: 'pointer',
  width: '100%',
};

const STATUS_OPTIONS = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED'];
const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export const StaffTicketQueue: React.FC<StaffTicketQueueProps> = ({ onSelectTicket }) => {
  const { user, token, logout } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<'' | 'unassigned' | 'me'>('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'itPriority' | 'currentStatus' | 'ticketNumber'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [tickets, setTickets] = useState<StaffTicketItem[]>([]);
  const [pagination, setPagination] = useState<StaffQueuePagination>({ total: 0, page: 1, totalPages: 1, limit: 10 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const fetchTickets = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setForbidden(false);

    const q = new URLSearchParams();
    if (searchTerm.trim()) q.set('search', searchTerm.trim());
    if (status) q.set('status', status);
    if (priority) q.set('priority', priority);
    if (ownerFilter === 'unassigned') q.set('ownerId', 'unassigned');
    else if (ownerFilter === 'me' && user) q.set('ownerId', user.id.toString());
    q.set('sortBy', sortBy);
    q.set('sortOrder', sortOrder);
    q.set('page', page.toString());
    q.set('limit', limit.toString());

    try {
      const res = await fetch(`/api/staff/tickets?${q.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Session expired or invalid — sign out and let the app fall back to the Login screen.
      if (res.status === 401) {
        await logout();
        return;
      }

      // Authenticated but no longer permitted (e.g. role changed or account deactivated
      // mid-session) — session is still valid, so show a distinct message instead of
      // treating it like a generic/transient failure.
      if (res.status === 403) {
        setForbidden(true);
        setTickets([]);
        return;
      }

      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error?.message || 'Failed to fetch ticket queue.');

      setTickets(result.data.tickets || []);
      if (result.data.pagination) setPagination(result.data.pagination);
    } catch (err: any) {
      setError(err.message || 'Unable to load the ticket queue. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token, user, searchTerm, status, priority, ownerFilter, sortBy, sortOrder, page, limit, logout]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const handleResetFilters = () => {
    setSearchTerm(''); setStatus(''); setPriority(''); setOwnerFilter('');
    setSortBy('createdAt'); setSortOrder('desc'); setPage(1);
  };

  const handleSortToggle = (field: typeof sortBy) => {
    if (sortBy === field) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(field); setSortOrder('desc'); }
    setPage(1);
  };

  const sortIcon = (field: typeof sortBy) =>
    sortBy === field ? (sortOrder === 'asc' ? ' ↑' : ' ↓') : ' ↕';

  const isFilterActive = !!(searchTerm || status || priority || ownerFilter);

  return (
    <div className="container-fluid py-4 px-3 px-md-4" style={{ maxWidth: '1400px' }}>

      {/* ── Page Header ── */}
      <div className="d-flex align-items-start justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="fw-bold mb-1" style={{ color: '#111827', fontSize: '1.75rem', letterSpacing: '-0.3px' }}>
            IT Staff Ticket Queue
          </h1>
          <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
            Find, prioritize, and open tickets across the whole system.
          </p>
        </div>

        <button
          className="btn btn-outline-secondary d-inline-flex align-items-center gap-2 px-3 py-2"
          style={{ borderRadius: '8px', fontSize: '0.875rem', opacity: isFilterActive ? 1 : 0.4, pointerEvents: isFilterActive ? 'auto' : 'none' }}
          onClick={handleResetFilters}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
            <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
          </svg>
          Clear Filters
        </button>
      </div>

      {/* ── Filter Bar Card ── */}
      <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '12px' }}>
        <div className="card-body py-3 px-3">
          <div className="row g-2 align-items-end">

            <div className="col-12 col-lg">
              <div className="input-group" style={{ height: '38px' }}>
                <span className="input-group-text bg-white border-end-0 pe-1" style={{ borderRadius: '8px 0 0 8px', border: '1px solid #D1D5DB' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="#9CA3AF" viewBox="0 0 16 16">
                    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85ZM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0Z"/>
                  </svg>
                </span>
                <input
                  id="staff-queue-search-input"
                  type="text"
                  className="form-control border-start-0 ps-1"
                  placeholder="Search by ticket number or summary..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                  style={{ borderRadius: '0 8px 8px 0', fontSize: '0.82rem', border: '1px solid #D1D5DB', height: '38px' }}
                />
              </div>
            </div>

            <div className="col-6 col-md-3 col-lg-auto">
              <label htmlFor="staff-queue-status-select" className="d-block text-muted mb-1" style={{ fontSize: '0.75rem', fontWeight: 500 }}>Status</label>
              <select id="staff-queue-status-select" className="form-select" value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(1); }} style={selectStyle}>
                <option value="">All Statuses</option>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{formatStatus(s)}</option>)}
              </select>
            </div>

            <div className="col-6 col-md-3 col-lg-auto">
              <label htmlFor="staff-queue-priority-select" className="d-block text-muted mb-1" style={{ fontSize: '0.75rem', fontWeight: 500 }}>IT Priority</label>
              <select id="staff-queue-priority-select" className="form-select" value={priority}
                onChange={(e) => { setPriority(e.target.value); setPage(1); }} style={selectStyle}>
                <option value="">All Priorities</option>
                {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{formatPriority(p)}</option>)}
              </select>
            </div>

            <div className="col-6 col-md-3 col-lg-auto">
              <label htmlFor="staff-queue-owner-select" className="d-block text-muted mb-1" style={{ fontSize: '0.75rem', fontWeight: 500 }}>Owner</label>
              <select id="staff-queue-owner-select" className="form-select" value={ownerFilter}
                onChange={(e) => { setOwnerFilter(e.target.value as '' | 'unassigned' | 'me'); setPage(1); }} style={selectStyle}>
                <option value="">All Tickets</option>
                <option value="unassigned">Unassigned</option>
                <option value="me">Assigned to Me</option>
              </select>
            </div>

          </div>
        </div>
      </div>

      {/* ── Main Content Area ── */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border" role="status" style={{ width: '2.5rem', height: '2.5rem', color: '#15803D' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted small">Loading ticket queue...</p>
        </div>

      ) : forbidden ? (
        <div className="card border-0 shadow-sm text-center py-5" style={{ borderRadius: '12px' }}>
          <div className="py-4">
            <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
              style={{ width: 64, height: 64, backgroundColor: '#FEF3C7', color: '#D97706' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
              </svg>
            </div>
            <h5 className="fw-bold mb-2" style={{ color: '#111827' }}>Access Denied</h5>
            <p className="text-muted small mb-4" style={{ maxWidth: 380, margin: '0 auto 1rem' }}>
              You no longer have permission to view the Ticket Queue. Your role or account status may have changed — please sign in again.
            </p>
            <button className="btn btn-outline-secondary px-4 btn-sm" onClick={logout}>Sign Out</button>
          </div>
        </div>

      ) : error ? (
        <div className="alert alert-danger border-0 shadow-sm d-flex align-items-center justify-content-between p-4" style={{ borderRadius: '12px' }}>
          <div>
            <div className="fw-bold mb-1">Error loading ticket queue</div>
            <div className="small">{error}</div>
          </div>
          <button className="btn btn-danger btn-sm px-3" onClick={fetchTickets}>Retry</button>
        </div>

      ) : tickets.length === 0 ? (
        <div className="card border-0 shadow-sm text-center py-5" style={{ borderRadius: '12px' }}>
          <div className="py-4">
            <div className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
              style={{ width: 64, height: 64, backgroundColor: '#DCFCE7', color: '#15803D' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="currentColor" viewBox="0 0 16 16">
                <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/>
              </svg>
            </div>
            <h5 className="fw-bold mb-2" style={{ color: '#111827' }}>No Tickets Found</h5>
            <p className="text-muted small mb-4" style={{ maxWidth: 380, margin: '0 auto 1rem' }}>
              {isFilterActive
                ? 'No tickets match your search or filter criteria. Try adjusting or clearing the filters.'
                : 'There are no tickets in the queue right now.'}
            </p>
            {isFilterActive && (
              <button className="btn btn-outline-success px-4 btn-sm" onClick={handleResetFilters}>Reset Filters</button>
            )}
          </div>
        </div>

      ) : (
        <>
          {/* ── Mobile Cards View (< 768px) ── */}
          <div className="d-block d-md-none mb-3">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="card border-0 shadow-sm mb-3 p-3" style={{ borderRadius: '12px', backgroundColor: '#FFFFFF' }}>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  {onSelectTicket ? (
                    <button className="btn btn-link p-0 fw-bold text-decoration-none" style={{ color: '#15803D', fontSize: '0.9rem' }}
                      onClick={() => onSelectTicket(ticket.id)}>
                      {ticket.ticketNumber}
                    </button>
                  ) : (
                    <span className="fw-bold" style={{ color: '#15803D', fontSize: '0.9rem' }}>{ticket.ticketNumber}</span>
                  )}
                  <small className="text-muted" style={{ fontSize: '0.75rem' }}>{formatDate(ticket.createdAt)}</small>
                </div>

                <h6 className="fw-semibold text-dark mb-2" style={{ fontSize: '0.95rem', lineHeight: '1.4' }}>{ticket.summary}</h6>

                <div className="d-flex align-items-center flex-wrap gap-2 mb-2">
                  <span style={getPriorityPill(ticket.requestedPriority)}>{formatPriority(ticket.requestedPriority)}</span>
                  <span style={getPriorityPill(ticket.itPriority)}>{formatPriority(ticket.itPriority)}</span>
                  <span style={getStatusPill(ticket.currentStatus)}>{formatStatus(ticket.currentStatus)}</span>
                </div>

                <div className="pt-2 border-top d-flex align-items-center justify-content-between text-muted" style={{ fontSize: '0.78rem' }}>
                  <div>
                    <span>{ticket.category?.name}</span>
                    <span className="mx-1">·</span>
                    <span>{ticket.owner ? ticket.owner.name : 'Unassigned'}</span>
                  </div>
                  {onSelectTicket && (
                    <button className="btn btn-sm btn-outline-success" onClick={() => onSelectTicket(ticket.id)}>View</button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ── Desktop & Tablet Table View (>= 768px) ── */}
          <div className="card border-0 shadow-sm d-none d-md-block" style={{ borderRadius: '12px', overflow: 'hidden' }}>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th scope="col" className="py-3 ps-3" style={{ ...thStyle, cursor: 'pointer' }}
                      onClick={() => handleSortToggle('ticketNumber')}>
                      Ticket No.{sortIcon('ticketNumber')}
                    </th>
                    <th scope="col" className="py-3 px-2 d-none d-lg-table-cell" style={{ ...thStyle, cursor: 'pointer' }}
                      onClick={() => handleSortToggle('createdAt')}>
                      Created Date{sortIcon('createdAt')}
                    </th>
                    <th scope="col" className="py-3 px-2" style={thStyle}>Summary</th>
                    <th scope="col" className="py-3 px-2 d-none d-lg-table-cell" style={thStyle}>Category</th>
                    <th scope="col" className="py-3 px-2 text-center d-none d-lg-table-cell" style={thStyle}>Requested Priority</th>
                    <th scope="col" className="py-3 px-2 text-center" style={{ ...thStyle, cursor: 'pointer' }}
                      onClick={() => handleSortToggle('itPriority')}>
                      IT Priority{sortIcon('itPriority')}
                    </th>
                    <th scope="col" className="py-3 px-2 text-center" style={{ ...thStyle, cursor: 'pointer' }}
                      onClick={() => handleSortToggle('currentStatus')}>
                      Status{sortIcon('currentStatus')}
                    </th>
                    <th scope="col" className="py-3 px-2 d-none d-lg-table-cell" style={thStyle}>Owner</th>
                    <th scope="col" className="py-3 pe-3 text-end" style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td className="ps-3 py-3" style={{ whiteSpace: 'nowrap' }}>
                        <span className="fw-bold" style={{ color: '#006B3C' }}>{ticket.ticketNumber}</span>
                      </td>
                      <td className="py-3 px-2 d-none d-lg-table-cell" style={{ color: '#4A6358', whiteSpace: 'nowrap' }}>
                        {formatDate(ticket.createdAt)}
                      </td>
                      <td className="py-3 px-2" style={{ maxWidth: '200px' }}>
                        <span className="fw-medium text-dark text-truncate d-block">{ticket.summary}</span>
                      </td>
                      <td className="py-3 px-2 d-none d-lg-table-cell" style={{ color: '#1A2E26', whiteSpace: 'nowrap' }}>{ticket.category?.name}</td>
                      <td className="py-3 px-2 text-center d-none d-lg-table-cell">
                        <span style={getPriorityPill(ticket.requestedPriority)}>{formatPriority(ticket.requestedPriority)}</span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span style={getPriorityPill(ticket.itPriority)}>{formatPriority(ticket.itPriority)}</span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span style={getStatusPill(ticket.currentStatus)}>{formatStatus(ticket.currentStatus)}</span>
                      </td>
                      <td className="py-3 px-2 d-none d-lg-table-cell" style={{ color: '#4A6358', whiteSpace: 'nowrap' }}>
                        {ticket.owner ? ticket.owner.name : (
                          <span className="badge" style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}>Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 pe-3 text-end" style={{ whiteSpace: 'nowrap' }}>
                        {onSelectTicket && (
                          <button className="btn btn-sm btn-outline-success" onClick={() => onSelectTicket(ticket.id)}>
                            View Details
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Pagination Footer ── */}
          <div className="card-footer bg-white border-top d-flex align-items-center justify-content-between px-4 py-3 flex-wrap gap-2">
            <span className="text-muted small">
              Showing{' '}
              <strong className="text-dark">
                {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}
              </strong>
              {' '}to{' '}
              <strong className="text-dark">{Math.min(pagination.page * pagination.limit, pagination.total)}</strong>
              {' '}of{' '}
              <strong className="text-dark">{pagination.total}</strong> tickets
            </span>

            <nav aria-label="Staff ticket queue pagination">
              <ul className="pagination pagination-sm mb-0 align-items-center gap-1">
                <li className={`page-item ${pagination.page <= 1 ? 'disabled' : ''}`}>
                  <button className="page-link px-3 py-1"
                    style={{ borderRadius: '6px', fontSize: '0.82rem', color: '#374151', borderColor: '#D1D5DB' }}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={pagination.page <= 1}>
                    &lt; Previous
                  </button>
                </li>

                {getPaginationPages(pagination.page, pagination.totalPages).map((p, idx) =>
                  p === '...' ? (
                    <li key={`ellipsis-${idx}`} className="page-item disabled">
                      <span className="page-link px-2 py-1 border-0 bg-transparent" style={{ fontSize: '0.82rem' }}>…</span>
                    </li>
                  ) : (
                    <li key={p} className="page-item">
                      <button
                        className="page-link px-3 py-1"
                        style={{
                          borderRadius: '6px',
                          fontSize: '0.82rem',
                          backgroundColor: p === pagination.page ? '#15803D' : '#fff',
                          color: p === pagination.page ? '#fff' : '#374151',
                          borderColor: p === pagination.page ? '#15803D' : '#D1D5DB',
                          fontWeight: p === pagination.page ? 600 : 400,
                        }}
                        onClick={() => setPage(p as number)}>
                        {p}
                      </button>
                    </li>
                  )
                )}

                <li className={`page-item ${pagination.page >= pagination.totalPages ? 'disabled' : ''}`}>
                  <button className="page-link px-3 py-1"
                    style={{ borderRadius: '6px', fontSize: '0.82rem', color: '#374151', borderColor: '#D1D5DB' }}
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={pagination.page >= pagination.totalPages}>
                    Next &gt;
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </>
      )}
    </div>
  );
};

export default StaffTicketQueue;
