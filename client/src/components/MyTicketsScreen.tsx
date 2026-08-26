import React, { useState, useEffect, useCallback } from 'react';
import { useRequester } from '../context/RequesterContext';

export interface TicketItem {
  id: number;
  ticketNumber: string;
  requesterId: number;
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  description: string;
  requestedPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  itPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  currentStatus: 'NEW' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
  requester?: { id: number; name: string; email: string };
  attachments?: Array<{ id: number; originalName: string; storedName: string; mimeType: string; fileSize: number }>;
}

export interface PaginationInfo {
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

export interface CategoryOption {
  id: number;
  name: string;
}

export interface MyTicketsScreenProps {
  onSelectTicket?: (ticketId: number) => void;
  onNavigateToCreate?: () => void;
}

// Shared th style for table header
const thStyle: React.CSSProperties = {
  backgroundColor: '#EBF5F0',
  color: '#166534',
  fontWeight: 600,
  fontSize: '0.82rem',
  borderBottom: '2px solid #C6E0D5',
  whiteSpace: 'nowrap',
  userSelect: 'none',
};

export const MyTicketsScreen: React.FC<MyTicketsScreenProps> = ({ onSelectTicket, onNavigateToCreate }) => {
  const { currentRequester } = useRequester();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedReqPriority, setSelectedReqPriority] = useState('');
  const [selectedItPriority, setSelectedItPriority] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortField, setSortField] = useState<'createdAt' | 'ticketNumber'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    totalCount: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 10,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => { if (isMounted && Array.isArray(data)) setCategories(data); })
      .catch((err) => console.error('Failed to load categories:', err));
    return () => { isMounted = false; };
  }, []);

  const fetchTickets = useCallback(async () => {
    if (!currentRequester) return;
    setLoading(true);
    setError(null);

    const q = new URLSearchParams();
    if (searchTerm.trim()) q.set('search', searchTerm.trim());
    if (selectedCategory) q.set('categoryId', selectedCategory);
    if (selectedReqPriority) q.set('requestedPriority', selectedReqPriority);
    if (selectedStatus) q.set('status', selectedStatus);
    q.set('sortBy', sortField);
    q.set('sortOrder', sortOrder);
    q.set('page', page.toString());
    q.set('limit', limit.toString());

    try {
      const res = await fetch(`/api/tickets?${q.toString()}`, {
        headers: { 'X-Dev-Requester-Id': currentRequester.id.toString() },
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error?.message || 'Failed to fetch tickets.');

      let data: TicketItem[] = result.data || [];
      if (selectedItPriority) data = data.filter((t) => t.itPriority === selectedItPriority);

      setTickets(data);
      if (result.pagination) setPagination(result.pagination);
    } catch (err: any) {
      setError(err.message || 'Unable to load tickets. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentRequester, searchTerm, selectedCategory, selectedReqPriority, selectedItPriority, selectedStatus, sortField, sortOrder, page, limit]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const handleResetFilters = () => {
    setSearchTerm(''); setSelectedCategory(''); setSelectedReqPriority('');
    setSelectedItPriority(''); setSelectedStatus('');
    setSortField('createdAt'); setSortOrder('desc'); setPage(1);
  };

  const handleSortToggle = (field: 'createdAt' | 'ticketNumber') => {
    if (sortField === field) setSortOrder((p) => (p === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortOrder('desc'); }
    setPage(1);
  };

  const sortIcon = (field: 'createdAt' | 'ticketNumber') =>
    sortField === field ? (sortOrder === 'asc' ? ' ↑' : ' ↓') : ' ↕';

  // Priority pill — matches mockup exactly
  const getPriorityPill = (p: string): React.CSSProperties => {
    const base: React.CSSProperties = { borderRadius: '20px', padding: '2px 14px', fontWeight: 600, fontSize: '0.78rem', display: 'inline-block' };
    switch (p) {
      case 'CRITICAL':
      case 'HIGH':    return { ...base, backgroundColor: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA' };
      case 'MEDIUM':  return { ...base, backgroundColor: '#FEF3C7', color: '#D97706', border: '1px solid #FDE68A' };
      case 'LOW':     return { ...base, backgroundColor: '#DCFCE7', color: '#16A34A', border: '1px solid #BBF7D0' };
      default:        return { ...base, backgroundColor: '#F3F4F6', color: '#6B7280' };
    }
  };

  // Status pill — matches mockup exactly
  const getStatusPill = (s: string): React.CSSProperties => {
    const base: React.CSSProperties = { borderRadius: '20px', padding: '2px 14px', fontWeight: 600, fontSize: '0.78rem', display: 'inline-block' };
    switch (s) {
      case 'NEW':         return { ...base, backgroundColor: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC' };
      case 'OPEN':        return { ...base, backgroundColor: '#DBEAFE', color: '#2563EB', border: '1px solid #93C5FD' };
      case 'IN_PROGRESS': return { ...base, backgroundColor: '#D1FAE5', color: '#059669', border: '1px solid #6EE7B7' };
      case 'RESOLVED':    return { ...base, backgroundColor: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC' };
      case 'CLOSED':      return { ...base, backgroundColor: '#F1F5F9', color: '#64748B', border: '1px solid #CBD5E1' };
      default:            return { ...base, backgroundColor: '#FEF9C3', color: '#CA8A04', border: '1px solid #FDE047' };
    }
  };

  const formatStatus = (s: string) =>
    s === 'IN_PROGRESS' ? 'In Progress' : s.charAt(0) + s.slice(1).toLowerCase();

  const formatPriority = (p: string) =>
    p.charAt(0) + p.slice(1).toLowerCase();

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
        + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch { return dateStr; }
  };

  // Smart pagination with ellipsis (matches mockup "1 2 3 4 5 … 6")
  const getPaginationPages = (current: number, total: number): (number | '...')[] => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | '...')[] = [];
    pages.push(1);
    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  };

  const isFilterActive = !!(searchTerm || selectedCategory || selectedReqPriority || selectedItPriority || selectedStatus);

  const selectStyle: React.CSSProperties = { borderRadius: '8px', fontSize: '0.875rem', height: '38px', border: '1px solid #D1D5DB', paddingLeft: '12px', paddingRight: '28px', appearance: 'auto', cursor: 'pointer' };

  return (
    <div className="container-fluid py-4 px-3 px-md-4" style={{ maxWidth: '1400px' }}>

      {/* ── Page Header ── */}
      <div className="d-flex align-items-start justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="fw-bold mb-1" style={{ color: '#111827', fontSize: '1.75rem', letterSpacing: '-0.3px' }}>
            My Tickets
          </h1>
          <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
            View and track all of your support requests.
          </p>
        </div>

        <div className="d-flex align-items-center gap-2">
          {/* Clear Filters — only visible when filters active */}
          <button
            className="btn btn-outline-secondary d-inline-flex align-items-center gap-2 px-3 py-2"
            style={{ borderRadius: '8px', fontSize: '0.875rem', opacity: isFilterActive ? 1 : 0.4, pointerEvents: isFilterActive ? 'auto' : 'none' }}
            onClick={handleResetFilters}
          >
            {/* refresh icon */}
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
              <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
              <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
            </svg>
            Clear Filters
          </button>

          {onNavigateToCreate && (
            <button
              className="btn d-inline-flex align-items-center gap-2 px-3 py-2 text-white fw-semibold shadow-sm"
              style={{ backgroundColor: '#15803D', borderRadius: '8px', fontSize: '0.875rem' }}
              onClick={onNavigateToCreate}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
              </svg>
              Create Ticket
            </button>
          )}
        </div>
      </div>

      {/* ── Filter Bar Card (matches mockup layout) ── */}
      <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '12px' }}>
        <div className="card-body py-3 px-4">
          <div className="d-flex flex-wrap align-items-end gap-3">

            {/* Search */}
            <div style={{ flex: '1 1 220px', minWidth: '200px' }}>
              <div className="input-group" style={{ height: '38px' }}>
                <span className="input-group-text bg-white border-end-0 pe-1" style={{ borderRadius: '8px 0 0 8px', border: '1px solid #D1D5DB' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="#9CA3AF" viewBox="0 0 16 16">
                    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85ZM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0Z"/>
                  </svg>
                </span>
                <input
                  id="ticket-search-input"
                  type="text"
                  className="form-control border-start-0 ps-1"
                  placeholder="Search by ticket number or summary..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                  style={{ borderRadius: '0 8px 8px 0', fontSize: '0.875rem', border: '1px solid #D1D5DB', height: '38px' }}
                />
              </div>
            </div>

            {/* Category */}
            <div style={{ flex: '0 0 auto' }}>
              <label htmlFor="ticket-category-select" className="d-block text-muted mb-1" style={{ fontSize: '0.78rem', fontWeight: 500 }}>Category</label>
              <select id="ticket-category-select" className="form-select" value={selectedCategory}
                onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }} style={selectStyle}>
                <option value="">All Categories</option>
                {categories.map((c) => <option key={c.id} value={c.id.toString()}>{c.name}</option>)}
              </select>
            </div>

            {/* Requested Priority */}
            <div style={{ flex: '0 0 auto' }}>
              <label htmlFor="ticket-priority-select" className="d-block text-muted mb-1" style={{ fontSize: '0.78rem', fontWeight: 500 }}>Requested Priority</label>
              <select id="ticket-priority-select" className="form-select" value={selectedReqPriority}
                onChange={(e) => { setSelectedReqPriority(e.target.value); setPage(1); }} style={selectStyle}>
                <option value="">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            {/* IT Priority */}
            <div style={{ flex: '0 0 auto' }}>
              <label htmlFor="ticket-it-priority-select" className="d-block text-muted mb-1" style={{ fontSize: '0.78rem', fontWeight: 500 }}>IT Priority</label>
              <select id="ticket-it-priority-select" className="form-select" value={selectedItPriority}
                onChange={(e) => { setSelectedItPriority(e.target.value); setPage(1); }} style={selectStyle}>
                <option value="">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            {/* Current Status */}
            <div style={{ flex: '0 0 auto' }}>
              <label htmlFor="ticket-status-select" className="d-block text-muted mb-1" style={{ fontSize: '0.78rem', fontWeight: 500 }}>Current Status</label>
              <select id="ticket-status-select" className="form-select" value={selectedStatus}
                onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }} style={selectStyle}>
                <option value="">All Statuses</option>
                <option value="NEW">New</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
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
          <p className="mt-3 text-muted small">Loading your tickets...</p>
        </div>

      ) : error ? (
        <div className="alert alert-danger border-0 shadow-sm d-flex align-items-center justify-content-between p-4" style={{ borderRadius: '12px' }}>
          <div>
            <div className="fw-bold mb-1">Error loading tickets</div>
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
                ? 'No tickets match your filter criteria. Try adjusting or clearing the filters.'
                : "You haven't submitted any support tickets yet."}
            </p>
            {isFilterActive
              ? <button className="btn btn-outline-success px-4 btn-sm" onClick={handleResetFilters}>Reset Filters</button>
              : onNavigateToCreate && (
                <button className="btn btn-sm text-white px-4 fw-semibold"
                  style={{ backgroundColor: '#15803D', borderRadius: '8px' }} onClick={onNavigateToCreate}>
                  Create Your First Ticket
                </button>
              )}
          </div>
        </div>

      ) : (
        <div className="card border-0 shadow-sm" style={{ borderRadius: '12px', overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.855rem' }}>
              <thead>
                <tr>
                  <th scope="col" className="py-3 ps-4"
                    style={{ ...thStyle, cursor: 'pointer', whiteSpace: 'nowrap', minWidth: '160px' }}
                    onClick={() => handleSortToggle('ticketNumber')}>
                    Ticket No.{sortIcon('ticketNumber')}
                  </th>
                  <th scope="col" className="py-3"
                    style={{ ...thStyle, cursor: 'pointer' }}
                    onClick={() => handleSortToggle('createdAt')}>
                    Created Date{sortIcon('createdAt')}
                  </th>
                  <th scope="col" className="py-3" style={thStyle}>Summary</th>
                  <th scope="col" className="py-3" style={thStyle}>Category</th>
                  <th scope="col" className="py-3 text-center" style={thStyle}>Requested Priority</th>
                  <th scope="col" className="py-3 text-center" style={thStyle}>IT Priority</th>
                  <th scope="col" className="py-3 text-center" style={thStyle}>Current Status</th>
                  <th scope="col" className="py-3" style={thStyle}>Ticket Owner</th>
                  <th scope="col" className="py-3 pe-4 text-end" style={{ ...thStyle, cursor: 'pointer' }}
                    onClick={() => handleSortToggle('createdAt')}>
                    Last Updated ↕
                  </th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    {/* Ticket No. */}
                    <td className="ps-4 py-3" style={{ whiteSpace: 'nowrap' }}>
                      {onSelectTicket ? (
                        <button className="btn btn-link p-0 fw-semibold text-decoration-none"
                          style={{ color: '#15803D', fontSize: '0.855rem', whiteSpace: 'nowrap' }}
                          onClick={() => onSelectTicket(ticket.id)}>
                          {ticket.ticketNumber}
                        </button>
                      ) : (
                        <span className="fw-semibold" style={{ color: '#15803D', whiteSpace: 'nowrap' }}>{ticket.ticketNumber}</span>
                      )}
                    </td>

                    {/* Created Date */}
                    <td className="py-3" style={{ color: '#4B5563', whiteSpace: 'nowrap' }}>
                      {formatDate(ticket.createdAt)}
                    </td>

                    {/* Summary */}
                    <td className="py-3" style={{ maxWidth: 220 }}>
                      <span className="text-dark text-truncate d-block">{ticket.summary}</span>
                    </td>

                    {/* Category */}
                    <td className="py-3 text-dark">{ticket.category.name}</td>

                    {/* Requested Priority */}
                    <td className="py-3 text-center">
                      <span style={getPriorityPill(ticket.requestedPriority)}>
                        {formatPriority(ticket.requestedPriority)}
                      </span>
                    </td>

                    {/* IT Priority */}
                    <td className="py-3 text-center">
                      <span style={getPriorityPill(ticket.itPriority)}>
                        {formatPriority(ticket.itPriority)}
                      </span>
                    </td>

                    {/* Current Status */}
                    <td className="py-3 text-center">
                      <span style={getStatusPill(ticket.currentStatus)}>
                        {formatStatus(ticket.currentStatus)}
                      </span>
                    </td>

                    {/* Ticket Owner */}
                    <td className="py-3" style={{ color: '#4B5563', whiteSpace: 'nowrap' }}>
                      {ticket.requester?.name || currentRequester.name}
                    </td>

                    {/* Last Updated */}
                    <td className="py-3 pe-4 text-end" style={{ color: '#4B5563', whiteSpace: 'nowrap' }}>
                      {formatDate(ticket.updatedAt || ticket.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Pagination Footer ── */}
          <div className="card-footer bg-white border-top d-flex align-items-center justify-content-between px-4 py-3 flex-wrap gap-2">
            <span className="text-muted small">
              Showing{' '}
              <strong className="text-dark">
                {pagination.totalCount === 0 ? 0 : (pagination.currentPage - 1) * pagination.limit + 1}
              </strong>
              {' '}to{' '}
              <strong className="text-dark">
                {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)}
              </strong>
              {' '}of{' '}
              <strong className="text-dark">{pagination.totalCount}</strong> tickets
            </span>

            <nav aria-label="Ticket pagination">
              <ul className="pagination pagination-sm mb-0 align-items-center gap-1">
                {/* Previous */}
                <li className={`page-item ${pagination.currentPage <= 1 ? 'disabled' : ''}`}>
                  <button className="page-link px-3 py-1"
                    style={{ borderRadius: '6px', fontSize: '0.82rem', color: '#374151', borderColor: '#D1D5DB' }}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={pagination.currentPage <= 1}>
                    &lt; Previous
                  </button>
                </li>

                {/* Page numbers with ellipsis */}
                {getPaginationPages(pagination.currentPage, pagination.totalPages).map((p, idx) =>
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
                          backgroundColor: p === pagination.currentPage ? '#15803D' : '#fff',
                          color: p === pagination.currentPage ? '#fff' : '#374151',
                          borderColor: p === pagination.currentPage ? '#15803D' : '#D1D5DB',
                          fontWeight: p === pagination.currentPage ? 600 : 400,
                        }}
                        onClick={() => setPage(p as number)}>
                        {p}
                      </button>
                    </li>
                  )
                )}

                {/* Next */}
                <li className={`page-item ${pagination.currentPage >= pagination.totalPages ? 'disabled' : ''}`}>
                  <button className="page-link px-3 py-1"
                    style={{ borderRadius: '6px', fontSize: '0.82rem', color: '#374151', borderColor: '#D1D5DB' }}
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={pagination.currentPage >= pagination.totalPages}>
                    Next &gt;
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyTicketsScreen;
