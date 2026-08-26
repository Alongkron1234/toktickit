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

export const MyTicketsScreen: React.FC<MyTicketsScreenProps> = ({ onSelectTicket, onNavigateToCreate }) => {
  const { currentRequester } = useRequester();

  // Filter & Search States (Matching Mockup Wireframe)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedReqPriority, setSelectedReqPriority] = useState('');
  const [selectedItPriority, setSelectedItPriority] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortField, setSortField] = useState<'createdAt' | 'ticketNumber'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Data States
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

  // Load active categories for filter dropdown
  useEffect(() => {
    let isMounted = true;
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setCategories(data);
        }
      })
      .catch((err) => {
        console.error('Failed to load categories for filter:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch tickets query
  const fetchTickets = useCallback(async () => {
    if (!currentRequester) return;

    setLoading(true);
    setError(null);

    const queryParams = new URLSearchParams();
    if (searchTerm.trim()) queryParams.set('search', searchTerm.trim());
    if (selectedCategory) queryParams.set('categoryId', selectedCategory);
    if (selectedReqPriority) queryParams.set('requestedPriority', selectedReqPriority);
    if (selectedStatus) queryParams.set('status', selectedStatus);
    queryParams.set('sortBy', sortField);
    queryParams.set('sortOrder', sortOrder);
    queryParams.set('page', page.toString());
    queryParams.set('limit', limit.toString());

    try {
      const response = await fetch(`/api/tickets?${queryParams.toString()}`, {
        headers: {
          'X-Dev-Requester-Id': currentRequester.id.toString(),
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to fetch tickets.');
      }

      let fetchedTickets: TicketItem[] = result.data || [];

      // Secondary client-side filter for IT Priority if selected
      if (selectedItPriority) {
        fetchedTickets = fetchedTickets.filter((t) => t.itPriority === selectedItPriority);
      }

      setTickets(fetchedTickets);
      if (result.pagination) {
        setPagination(result.pagination);
      }
    } catch (err: any) {
      console.error('Error fetching tickets:', err);
      setError(err.message || 'Unable to load your tickets. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentRequester, searchTerm, selectedCategory, selectedReqPriority, selectedItPriority, selectedStatus, sortField, sortOrder, page, limit]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Reset filter handler
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedReqPriority('');
    setSelectedItPriority('');
    setSelectedStatus('');
    setSortField('createdAt');
    setSortOrder('desc');
    setPage(1);
  };

  // Toggle column sort handler
  const handleSortToggle = (field: 'createdAt' | 'ticketNumber') => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  // Pill Badge Styles matching the Lab Mockup PNG exactly
  const getPriorityPillStyle = (priority: string): React.CSSProperties => {
    switch (priority) {
      case 'CRITICAL':
        return { backgroundColor: '#FFE2E2', color: '#E11D48', border: '1px solid #FECDD3', borderRadius: '12px', padding: '3px 12px', fontWeight: 600, fontSize: '0.8rem' };
      case 'HIGH':
        return { backgroundColor: '#FFE2E2', color: '#E11D48', border: '1px solid #FECDD3', borderRadius: '12px', padding: '3px 12px', fontWeight: 600, fontSize: '0.8rem' };
      case 'MEDIUM':
        return { backgroundColor: '#FEF3C7', color: '#D97706', border: '1px solid #FDE68A', borderRadius: '12px', padding: '3px 12px', fontWeight: 600, fontSize: '0.8rem' };
      case 'LOW':
        return { backgroundColor: '#DCFCE7', color: '#16A34A', border: '1px solid #BBF7D0', borderRadius: '12px', padding: '3px 12px', fontWeight: 600, fontSize: '0.8rem' };
      default:
        return { backgroundColor: '#F3F4F6', color: '#4B5563', borderRadius: '12px', padding: '3px 12px', fontSize: '0.8rem' };
    }
  };

  const getStatusPillStyle = (status: string): React.CSSProperties => {
    switch (status) {
      case 'NEW':
        return { backgroundColor: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC', borderRadius: '12px', padding: '3px 12px', fontWeight: 600, fontSize: '0.8rem' };
      case 'OPEN':
        return { backgroundColor: '#E0F2FE', color: '#0284C7', border: '1px solid #7DD3FC', borderRadius: '12px', padding: '3px 12px', fontWeight: 600, fontSize: '0.8rem' };
      case 'IN_PROGRESS':
        return { backgroundColor: '#D1FAE5', color: '#059669', border: '1px solid #6EE7B7', borderRadius: '12px', padding: '3px 12px', fontWeight: 600, fontSize: '0.8rem' };
      case 'RESOLVED':
        return { backgroundColor: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC', borderRadius: '12px', padding: '3px 12px', fontWeight: 600, fontSize: '0.8rem' };
      case 'CLOSED':
        return { backgroundColor: '#F1F5F9', color: '#64748B', border: '1px solid #CBD5E1', borderRadius: '12px', padding: '3px 12px', fontWeight: 600, fontSize: '0.8rem' };
      default:
        return { backgroundColor: '#FEF3C7', color: '#D97706', borderRadius: '12px', padding: '3px 12px', fontSize: '0.8rem' };
    }
  };

  // Format Created Date matching "May 12, 2025 09:14 AM"
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      }) + ' ' + date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  const isFilterActive = searchTerm || selectedCategory || selectedReqPriority || selectedItPriority || selectedStatus;

  return (
    <div className="container-fluid py-4 px-3 px-md-4" style={{ maxWidth: '1280px' }}>
      {/* Top Header matching mockup */}
      <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="fw-bold mb-1" style={{ color: '#1A2E26', fontSize: '2rem' }}>
            My Tickets
          </h2>
          <p className="text-muted mb-0 fs-6">
            View and track all of your support requests.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          {isFilterActive && (
            <button
              className="btn btn-outline-secondary fw-semibold d-inline-flex align-items-center gap-2 px-3 py-2"
              style={{ borderRadius: '8px', fontSize: '0.9rem' }}
              onClick={handleResetFilters}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z" />
                <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z" />
              </svg>
              Clear Filters
            </button>
          )}
          {onNavigateToCreate && (
            <button
              className="btn text-white fw-bold d-inline-flex align-items-center gap-2 px-3 py-2 shadow-sm"
              style={{ backgroundColor: '#006B3C', borderRadius: '8px', fontSize: '0.9rem' }}
              onClick={onNavigateToCreate}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" />
              </svg>
              Create Ticket
            </button>
          )}
        </div>
      </div>

      {/* Filter Controls Card matching mockup */}
      <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '12px', backgroundColor: '#FFFFFF' }}>
        <div className="card-body p-3 p-md-4">
          <div className="row g-3">
            {/* Search Box */}
            <div className="col-12 col-lg-4">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0 text-muted ps-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
                  </svg>
                </span>
                <input
                  id="ticket-search-input"
                  type="text"
                  className="form-control border-start-0 py-2"
                  placeholder="Search by ticket number or summary..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  style={{ borderRadius: '0 8px 8px 0', fontSize: '0.9rem' }}
                />
              </div>
            </div>

            {/* Category Select */}
            <div className="col-6 col-md-3 col-lg-2">
              <label htmlFor="ticket-category-select" className="form-label fw-semibold text-dark small mb-1">
                Category
              </label>
              <select
                id="ticket-category-select"
                className="form-select py-2"
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
                style={{ borderRadius: '8px', fontSize: '0.9rem' }}
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Requested Priority Select */}
            <div className="col-6 col-md-3 col-lg-2">
              <label htmlFor="ticket-priority-select" className="form-label fw-semibold text-dark small mb-1">
                Requested Priority
              </label>
              <select
                id="ticket-priority-select"
                className="form-select py-2"
                value={selectedReqPriority}
                onChange={(e) => {
                  setSelectedReqPriority(e.target.value);
                  setPage(1);
                }}
                style={{ borderRadius: '8px', fontSize: '0.9rem' }}
              >
                <option value="">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            {/* IT Priority Select */}
            <div className="col-6 col-md-3 col-lg-2">
              <label htmlFor="ticket-it-priority-select" className="form-label fw-semibold text-dark small mb-1">
                IT Priority
              </label>
              <select
                id="ticket-it-priority-select"
                className="form-select py-2"
                value={selectedItPriority}
                onChange={(e) => {
                  setSelectedItPriority(e.target.value);
                  setPage(1);
                }}
                style={{ borderRadius: '8px', fontSize: '0.9rem' }}
              >
                <option value="">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            {/* Current Status Select */}
            <div className="col-6 col-md-3 col-lg-2">
              <label htmlFor="ticket-status-select" className="form-label fw-semibold text-dark small mb-1">
                Current Status
              </label>
              <select
                id="ticket-status-select"
                className="form-select py-2"
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
                style={{ borderRadius: '8px', fontSize: '0.9rem' }}
              >
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

      {/* Main Tickets Content Area */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-success" role="status" style={{ width: '2.5rem', height: '2.5rem' }}>
            <span className="visually-hidden">Loading tickets...</span>
          </div>
          <p className="mt-3 text-muted">Loading your tickets...</p>
        </div>
      ) : error ? (
        <div className="alert alert-danger shadow-sm border-0 d-flex align-items-center justify-content-between p-4" style={{ borderRadius: '12px' }}>
          <div>
            <h5 className="alert-heading fw-bold mb-1">Error Loading Tickets</h5>
            <p className="mb-0">{error}</p>
          </div>
          <button className="btn btn-danger btn-sm px-3" onClick={fetchTickets}>
            Retry
          </button>
        </div>
      ) : tickets.length === 0 ? (
        <div className="card shadow-sm border-0 text-center p-5" style={{ borderRadius: '12px' }}>
          <div className="py-4">
            <div
              className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
              style={{ width: '64px', height: '64px', backgroundColor: '#EAF6EF', color: '#006B3C' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
                <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z" />
              </svg>
            </div>
            <h4 className="fw-bold mb-2" style={{ color: '#1A2E26' }}>
              No Tickets Found
            </h4>
            <p className="text-muted max-w-md mx-auto mb-4" style={{ maxWidth: '420px' }}>
              {isFilterActive
                ? 'No tickets match your active filter criteria. Try resetting or adjusting your search filters.'
                : "You haven't submitted any IT support tickets yet. Click the button below to create your first ticket."}
            </p>
            {isFilterActive ? (
              <button className="btn btn-outline-success px-4" onClick={handleResetFilters}>
                Reset Filters
              </button>
            ) : (
              onNavigateToCreate && (
                <button
                  className="btn text-white fw-bold px-4"
                  style={{ backgroundColor: '#006B3C' }}
                  onClick={onNavigateToCreate}
                >
                  Create Your First Ticket
                </button>
              )
            )}
          </div>
        </div>
      ) : (
        <div className="card shadow-sm border-0" style={{ borderRadius: '12px', overflow: 'hidden' }}>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.875rem' }}>
              {/* Light Green Table Header matching mockup image */}
              <thead style={{ backgroundColor: '#EDF7F2', color: '#006B3C' }}>
                <tr>
                  <th scope="col" className="py-3 ps-4 cursor-pointer" onClick={() => handleSortToggle('ticketNumber')}>
                    Ticket No. {sortField === 'ticketNumber' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                  </th>
                  <th scope="col" className="py-3 cursor-pointer" onClick={() => handleSortToggle('createdAt')}>
                    Created Date {sortField === 'createdAt' ? (sortOrder === 'asc' ? '↑' : '↓') : '↕'}
                  </th>
                  <th scope="col" className="py-3">Summary</th>
                  <th scope="col" className="py-3">Category</th>
                  <th scope="col" className="py-3 text-center">Requested Priority</th>
                  <th scope="col" className="py-3 text-center">IT Priority</th>
                  <th scope="col" className="py-3 text-center">Current Status</th>
                  <th scope="col" className="py-3">Ticket Owner</th>
                  <th scope="col" className="py-3 pe-4 text-end">Last Updated ↕</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id}>
                    {/* Ticket No. (Green link style) */}
                    <td className="ps-4 py-3 fw-bold">
                      {onSelectTicket ? (
                        <button
                          className="btn btn-link p-0 fw-bold text-decoration-none"
                          style={{ color: '#006B3C', fontSize: '0.875rem' }}
                          onClick={() => onSelectTicket(ticket.id)}
                        >
                          {ticket.ticketNumber}
                        </button>
                      ) : (
                        <span style={{ color: '#006B3C' }}>{ticket.ticketNumber}</span>
                      )}
                    </td>

                    {/* Created Date */}
                    <td className="py-3 text-muted">{formatDate(ticket.createdAt)}</td>

                    {/* Summary */}
                    <td className="py-3" style={{ maxWidth: '220px' }}>
                      <div className="fw-semibold text-dark text-truncate">{ticket.summary}</div>
                    </td>

                    {/* Category */}
                    <td className="py-3 text-dark">{ticket.category.name}</td>

                    {/* Requested Priority */}
                    <td className="py-3 text-center">
                      <span style={getPriorityPillStyle(ticket.requestedPriority)}>
                        {ticket.requestedPriority.charAt(0) + ticket.requestedPriority.slice(1).toLowerCase()}
                      </span>
                    </td>

                    {/* IT Priority */}
                    <td className="py-3 text-center">
                      <span style={getPriorityPillStyle(ticket.itPriority)}>
                        {ticket.itPriority.charAt(0) + ticket.itPriority.slice(1).toLowerCase()}
                      </span>
                    </td>

                    {/* Current Status */}
                    <td className="py-3 text-center">
                      <span style={getStatusPillStyle(ticket.currentStatus)}>
                        {ticket.currentStatus === 'IN_PROGRESS'
                          ? 'In Progress'
                          : ticket.currentStatus.charAt(0) + ticket.currentStatus.slice(1).toLowerCase()}
                      </span>
                    </td>

                    {/* Ticket Owner */}
                    <td className="py-3 text-muted">{ticket.requester?.name || currentRequester.name}</td>

                    {/* Last Updated */}
                    <td className="py-3 pe-4 text-end text-muted">{formatDate(ticket.updatedAt || ticket.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer & Pagination matching mockup */}
          <div className="card-footer bg-white border-top p-3 p-md-4 d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div className="small text-muted">
              Showing{' '}
              <span className="fw-semibold text-dark">
                {pagination.totalCount === 0 ? 0 : (pagination.currentPage - 1) * pagination.limit + 1}
              </span>{' '}
              to{' '}
              <span className="fw-semibold text-dark">
                {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)}
              </span>{' '}
              of <span className="fw-semibold text-dark">{pagination.totalCount}</span> tickets
            </div>

            <div className="d-flex align-items-center gap-3">
              {/* Pagination controls matching mockup */}
              <nav aria-label="Ticket pagination">
                <ul className="pagination pagination-sm mb-0 align-items-center">
                  <li className={`page-item ${pagination.currentPage <= 1 ? 'disabled' : ''}`}>
                    <button
                      className="page-link rounded-2 px-3 py-1 me-2"
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                      disabled={pagination.currentPage <= 1}
                      style={{ fontSize: '0.85rem' }}
                    >
                      &lt; Previous
                    </button>
                  </li>

                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pNum) => (
                    <li key={pNum} className="page-item mx-1">
                      <button
                        className="page-link rounded-2 px-3 py-1"
                        onClick={() => setPage(pNum)}
                        style={{
                          backgroundColor: pNum === pagination.currentPage ? '#006B3C' : '#FFFFFF',
                          color: pNum === pagination.currentPage ? '#FFFFFF' : '#374151',
                          borderColor: pNum === pagination.currentPage ? '#006B3C' : '#E5E7EB',
                          fontWeight: pNum === pagination.currentPage ? 600 : 400,
                          fontSize: '0.85rem',
                        }}
                      >
                        {pNum}
                      </button>
                    </li>
                  ))}

                  <li className={`page-item ${pagination.currentPage >= pagination.totalPages ? 'disabled' : ''}`}>
                    <button
                      className="page-link rounded-2 px-3 py-1 ms-2"
                      onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
                      disabled={pagination.currentPage >= pagination.totalPages}
                      style={{ fontSize: '0.85rem' }}
                    >
                      Next &gt;
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyTicketsScreen;
