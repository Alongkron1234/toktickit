import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { getPriorityPill, getStatusPill, formatStatus, formatPriority, formatDate } from '../utils/badges';

export interface StaffAttachmentItem {
  id: number;
  originalName: string;
  storedName: string;
  mimeType: string;
  fileSize: number;
  isRemoved: boolean;
  removalReason?: string | null;
  removedAt?: string | null;
  createdAt: string;
}

export interface StaffTicketDetailData {
  id: number;
  ticketNumber: string;
  summary: string;
  description: string;
  requestedPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  itPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  currentStatus: 'NEW' | 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_REQUESTER' | 'RESOLVED' | 'CLOSED' | 'REOPENED' | 'CANCELLED';
  resolutionSummary?: string | null;
  appearsResolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
  requester: { id: number; name: string; email: string };
  owner: { id: number; name: string; email: string } | null;
  attachments: StaffAttachmentItem[];
}

interface CommentOrNote {
  id: number;
  content?: string;
  body?: string;
  createdAt: string;
  author?: { id: number; name: string; role?: string };
}

interface StaffMember {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface StaffTicketDetailProps {
  ticketId: number;
  onBack: () => void;
}

// Mirrors the server-side transition matrix in server/src/app.ts — client-side is
// UX guidance only; the backend is the real gate.
const VALID_TRANSITIONS: Record<string, string[]> = {
  NEW: ['OPEN', 'CANCELLED'],
  OPEN: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'],
  WAITING_FOR_REQUESTER: ['IN_PROGRESS', 'RESOLVED', 'CANCELLED'],
  RESOLVED: ['CLOSED'],
  REOPENED: ['IN_PROGRESS', 'OPEN', 'CANCELLED'],
  CLOSED: [],
  CANCELLED: [],
};

const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export const StaffTicketDetail: React.FC<StaffTicketDetailProps> = ({ ticketId, onBack }) => {
  const { user, token, logout } = useAuth();

  const [ticket, setTicket] = useState<StaffTicketDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const [members, setMembers] = useState<StaffMember[]>([]);
  const [showReassign, setShowReassign] = useState(false);
  const [reassignTarget, setReassignTarget] = useState('');
  const [ownershipSaving, setOwnershipSaving] = useState(false);
  const [ownershipError, setOwnershipError] = useState<string | null>(null);

  const [prioritySaving, setPrioritySaving] = useState(false);
  const [priorityError, setPriorityError] = useState<string | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState('');
  const [resolutionSummaryDraft, setResolutionSummaryDraft] = useState('');
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'comments' | 'notes' | 'attachments'>('comments');
  const [comments, setComments] = useState<CommentOrNote[]>([]);
  const [notes, setNotes] = useState<CommentOrNote[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [newNoteText, setNewNoteText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [submittingNote, setSubmittingNote] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);

  const authHeaders = useCallback((): Record<string, string> => ({ Authorization: `Bearer ${token}` }), [token]);

  const handleUnauthorized = useCallback(
    async (res: Response): Promise<boolean> => {
      if (res.status === 401) {
        await logout();
        return true;
      }
      if (res.status === 403) {
        setForbidden(true);
        return true;
      }
      return false;
    },
    [logout]
  );

  const getErrorMessage = (err: unknown, fallback: string): string =>
    err instanceof Error && err.message ? err.message : fallback;

  const fetchTicket = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setForbidden(false);

    try {
      const res = await fetch(`/api/staff/tickets/${ticketId}`, { headers: authHeaders() });
      if (await handleUnauthorized(res)) return;

      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error?.message || 'Failed to load ticket details.');

      setTicket(result.data);
      setPendingStatus(result.data.currentStatus);
      setResolutionSummaryDraft(result.data.resolutionSummary || '');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Unable to load ticket details.'));
    } finally {
      setLoading(false);
    }
  }, [ticketId, token, authHeaders, handleUnauthorized]);

  const fetchMembers = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/staff/members', { headers: authHeaders() });
      if (await handleUnauthorized(res)) return;
      const result = await res.json();
      if (res.ok && result.success) setMembers(result.data);
    } catch {
      // Non-critical for initial page render; reassign dropdown just stays empty.
    }
  }, [token, authHeaders, handleUnauthorized]);

  const fetchComments = useCallback(async () => {
    if (!token) return;
    setCommentsLoading(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/comments`, { headers: authHeaders() });
      if (await handleUnauthorized(res)) return;
      const result = await res.json();
      if (res.ok && result.success) setComments(result.data);
    } catch {
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }, [ticketId, token, authHeaders, handleUnauthorized]);

  const fetchNotes = useCallback(async () => {
    if (!token) return;
    // Defense in depth: never even request Internal Notes for a non-staff role.
    if (user?.role !== 'IT_STAFF' && user?.role !== 'ADMINISTRATOR') return;
    setNotesLoading(true);
    try {
      const res = await fetch(`/api/staff/tickets/${ticketId}/internal-notes`, { headers: authHeaders() });
      if (await handleUnauthorized(res)) return;
      const result = await res.json();
      if (res.ok && result.success) setNotes(result.data);
    } catch {
      setNotes([]);
    } finally {
      setNotesLoading(false);
    }
  }, [ticketId, token, authHeaders, user, handleUnauthorized]);

  useEffect(() => { fetchTicket(); }, [fetchTicket]);
  useEffect(() => { fetchMembers(); }, [fetchMembers]);
  useEffect(() => { fetchComments(); fetchNotes(); }, [fetchComments, fetchNotes]);

  const handleClaim = async () => {
    if (!user) return;
    setOwnershipSaving(true);
    setOwnershipError(null);
    try {
      const res = await fetch(`/api/staff/tickets/${ticketId}/ownership`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ ownerId: user.id }),
      });
      if (await handleUnauthorized(res)) return;
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error?.message || 'Failed to claim ticket.');
      await fetchTicket();
    } catch (err: unknown) {
      setOwnershipError(getErrorMessage(err, 'Failed to claim ticket.'));
    } finally {
      setOwnershipSaving(false);
    }
  };

  const handleReassignSubmit = async () => {
    if (!reassignTarget) return;
    setOwnershipSaving(true);
    setOwnershipError(null);
    try {
      const res = await fetch(`/api/staff/tickets/${ticketId}/ownership`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ ownerId: parseInt(reassignTarget, 10) }),
      });
      if (await handleUnauthorized(res)) return;
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error?.message || 'Failed to reassign ticket.');
      setShowReassign(false);
      setReassignTarget('');
      await fetchTicket();
    } catch (err: unknown) {
      setOwnershipError(getErrorMessage(err, 'Failed to reassign ticket.'));
    } finally {
      setOwnershipSaving(false);
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    setPrioritySaving(true);
    setPriorityError(null);
    try {
      const res = await fetch(`/api/staff/tickets/${ticketId}/priority`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ itPriority: newPriority }),
      });
      if (await handleUnauthorized(res)) return;
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error?.message || 'Failed to update IT Priority.');
      setTicket((t) => (t ? { ...t, itPriority: result.data.itPriority } : t));
    } catch (err: unknown) {
      setPriorityError(getErrorMessage(err, 'Failed to update IT Priority.'));
    } finally {
      setPrioritySaving(false);
    }
  };

  const handleStatusSubmit = async () => {
    if (!ticket || pendingStatus === ticket.currentStatus) return;
    setStatusSaving(true);
    setStatusError(null);
    try {
      const res = await fetch(`/api/staff/tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ status: pendingStatus, resolutionSummary: resolutionSummaryDraft.trim() || undefined }),
      });
      if (await handleUnauthorized(res)) return;
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error?.message || 'Failed to update status.');
      await fetchTicket();
    } catch (err: unknown) {
      setStatusError(getErrorMessage(err, 'Failed to update status.'));
      setPendingStatus(ticket.currentStatus);
    } finally {
      setStatusSaving(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    setSubmittingComment(true);
    setCommentError(null);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ body: newCommentText.trim() }),
      });
      if (await handleUnauthorized(res)) return;
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error?.message || 'Failed to post comment.');
      setNewCommentText('');
      await fetchComments();
    } catch (err: unknown) {
      setCommentError(getErrorMessage(err, 'Failed to post comment.'));
    } finally {
      setSubmittingComment(false);
    }
  };

  const handlePostNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    setSubmittingNote(true);
    setNoteError(null);
    try {
      const res = await fetch(`/api/staff/tickets/${ticketId}/internal-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ content: newNoteText.trim() }),
      });
      if (await handleUnauthorized(res)) return;
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error?.message || 'Failed to post internal note.');
      setNewNoteText('');
      await fetchNotes();
    } catch (err: unknown) {
      setNoteError(getErrorMessage(err, 'Failed to post internal note.'));
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleDownload = async (attachment: StaffAttachmentItem) => {
    if (attachment.isRemoved) return;
    setDownloadError(null);
    try {
      const res = await fetch(`/api/attachments/${attachment.id}/download`, { headers: authHeaders() });
      if (await handleUnauthorized(res)) return;
      if (!res.ok) throw new Error('Failed to download attachment.');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err: unknown) {
      setDownloadError(getErrorMessage(err, 'Error downloading file.'));
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border" role="status" style={{ width: '2.5rem', height: '2.5rem', color: '#15803D' }}>
          <span className="visually-hidden">Loading ticket details...</span>
        </div>
        <p className="mt-3 text-muted">Loading ticket details...</p>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="container py-4" style={{ maxWidth: '900px' }}>
        <button className="btn btn-outline-secondary btn-sm mb-3" onClick={onBack}>&larr; Back to Queue</button>
        <div className="card border-0 shadow-sm text-center py-5" style={{ borderRadius: '12px' }}>
          <h5 className="fw-bold mb-2">Access Denied</h5>
          <p className="text-muted small mb-4">You no longer have permission to view this ticket. Your role or account status may have changed — please sign in again.</p>
          <button className="btn btn-outline-secondary px-4 btn-sm mx-auto" onClick={logout}>Sign Out</button>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="container py-4" style={{ maxWidth: '900px' }}>
        <button className="btn btn-outline-secondary btn-sm mb-3" onClick={onBack}>&larr; Back to Queue</button>
        <div className="alert alert-danger shadow-sm border-0 p-4" style={{ borderRadius: '12px' }}>
          <h5 className="fw-bold mb-2">Error Loading Ticket</h5>
          <p className="mb-0">{error || 'Ticket details not available.'}</p>
          <button className="btn btn-danger btn-sm mt-3" onClick={fetchTicket}>Retry</button>
        </div>
      </div>
    );
  }

  const allowedNextStatuses = VALID_TRANSITIONS[ticket.currentStatus] || [];
  const isSelfOwner = ticket.owner?.id === user?.id;
  // Defensive default: the API always returns an array here, but guard anyway.
  const attachments = ticket.attachments ?? [];
  // Defense in depth: this screen is only ever routed to for IT_STAFF/ADMINISTRATOR
  // (see App.tsx), but never render Internal Notes UI for any other role regardless.
  const canSeeInternalNotes = user?.role === 'IT_STAFF' || user?.role === 'ADMINISTRATOR';

  return (
    <div className="container py-4 px-3 px-md-4" style={{ maxWidth: '1100px' }}>
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div className="text-muted small">
          Ticket Queue &gt; <span className="text-dark fw-semibold">{ticket.ticketNumber}</span>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          {!isSelfOwner && (
            <button className="btn btn-sm text-white fw-semibold" style={{ backgroundColor: '#15803D', borderRadius: '8px' }}
              onClick={handleClaim} disabled={ownershipSaving}>
              {ownershipSaving ? 'Saving...' : '🙋 Claim Ticket'}
            </button>
          )}
          <button className="btn btn-outline-secondary btn-sm" style={{ borderRadius: '8px' }}
            onClick={() => setShowReassign((v) => !v)}>
            🔁 Reassign Owner
          </button>
          <button className="btn btn-outline-secondary btn-sm" style={{ borderRadius: '8px' }} onClick={onBack}>
            &larr; Back to Queue
          </button>
        </div>
      </div>

      {showReassign && (
        <div className="card border-0 shadow-sm mb-3 p-3" style={{ borderRadius: '12px' }}>
          <label className="form-label small fw-semibold text-muted mb-1">Reassign to</label>
          <div className="d-flex gap-2 flex-wrap">
            <select className="form-select form-select-sm" style={{ maxWidth: '320px' }} value={reassignTarget}
              onChange={(e) => setReassignTarget(e.target.value)}>
              <option value="">Select a staff member...</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name} ({m.role === 'ADMINISTRATOR' ? 'Admin' : 'IT Staff'})</option>
              ))}
            </select>
            <button className="btn btn-sm text-white" style={{ backgroundColor: '#15803D' }}
              onClick={handleReassignSubmit} disabled={!reassignTarget || ownershipSaving}>
              {ownershipSaving ? 'Saving...' : 'Confirm Reassign'}
            </button>
          </div>
        </div>
      )}

      {ownershipError && <div className="alert alert-danger small p-3 mb-3" style={{ borderRadius: '8px' }}>{ownershipError}</div>}

      {/* Main Info Panel */}
      <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '12px' }}>
        <div className="card-header bg-white border-bottom p-3 p-md-4 d-flex align-items-center justify-content-between flex-wrap gap-3">
          <div>
            <span className="text-muted small d-block mb-1">Ticket Number</span>
            <h3 className="fw-bold mb-0" style={{ color: '#15803D' }}>{ticket.ticketNumber}</h3>
          </div>
          <span style={getStatusPill(ticket.currentStatus)}>{formatStatus(ticket.currentStatus)}</span>
        </div>

        <div className="card-body p-3 p-md-4" style={{ backgroundColor: '#FAFAFA' }}>
          {ticket.appearsResolvedAt && (
            <div className="alert alert-success border-0 bg-success-subtle text-success-emphasis py-2 px-3 mb-3 small" style={{ borderRadius: '8px' }}>
              ✓ Requester indicated problem appears resolved on {formatDate(ticket.appearsResolvedAt)}
            </div>
          )}

          <div className="row g-3 mb-3">
            <div className="col-6 col-md-3">
              <label className="form-label text-muted small mb-1 fw-semibold">Created Date</label>
              <div className="p-2 border rounded bg-white text-dark small">{formatDate(ticket.createdAt)}</div>
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label text-muted small mb-1 fw-semibold">Category</label>
              <div className="p-2 border rounded bg-white text-dark small">{ticket.category?.name}</div>
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label text-muted small mb-1 fw-semibold">Related System</label>
              <div className="p-2 border rounded bg-white text-dark small">{ticket.relatedSystem?.name}</div>
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label text-muted small mb-1 fw-semibold">Ticket Owner</label>
              <div className="p-2 border rounded bg-white text-dark small">{ticket.owner ? ticket.owner.name : 'Unassigned'}</div>
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label text-muted small mb-1 fw-semibold">Requester</label>
              <div className="p-2 border rounded bg-white text-dark small">{ticket.requester?.name} ({ticket.requester?.email})</div>
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label text-muted small mb-1 fw-semibold">Requested Priority</label>
              <div><span style={getPriorityPill(ticket.requestedPriority)}>{formatPriority(ticket.requestedPriority)}</span></div>
            </div>
            <div className="col-6 col-md-3">
              <label htmlFor="staff-detail-it-priority" className="form-label text-muted small mb-1 fw-semibold">IT Priority</label>
              <select id="staff-detail-it-priority" className="form-select form-select-sm" value={ticket.itPriority}
                onChange={(e) => handlePriorityChange(e.target.value)} disabled={prioritySaving}>
                {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{formatPriority(p)}</option>)}
              </select>
              {priorityError && <div className="text-danger extra-small mt-1" style={{ fontSize: '0.78rem' }}>{priorityError}</div>}
            </div>
          </div>

          <hr className="my-3" />

          <div className="row g-3 align-items-end mb-3">
            <div className="col-12 col-md-4">
              <label htmlFor="staff-detail-status" className="form-label text-muted small mb-1 fw-semibold">Current Status</label>
              <select id="staff-detail-status" className="form-select form-select-sm" value={pendingStatus}
                onChange={(e) => setPendingStatus(e.target.value)} disabled={statusSaving}>
                <option value={ticket.currentStatus}>{formatStatus(ticket.currentStatus)} (current)</option>
                {allowedNextStatuses.map((s) => <option key={s} value={s}>{formatStatus(s)}</option>)}
              </select>
            </div>
            <div className="col-12 col-md-8">
              <button className="btn btn-sm text-white fw-semibold" style={{ backgroundColor: '#15803D', borderRadius: '8px' }}
                onClick={handleStatusSubmit} disabled={statusSaving || pendingStatus === ticket.currentStatus}>
                {statusSaving ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>

          {statusError && <div className="alert alert-danger small p-2 mb-3" style={{ borderRadius: '8px' }}>{statusError}</div>}

          <div className="mb-3">
            <label htmlFor="staff-detail-resolution" className="form-label text-muted small mb-1 fw-semibold">Resolution Summary</label>
            <textarea id="staff-detail-resolution" className="form-control" rows={2}
              placeholder="Add resolution summary (visible to requester)..."
              value={resolutionSummaryDraft} onChange={(e) => setResolutionSummaryDraft(e.target.value)} maxLength={2000} />
          </div>

          <div className="mb-3">
            <label className="form-label text-muted small mb-1 fw-semibold">Ticket Summary</label>
            <div className="p-3 border rounded bg-white text-dark fw-semibold" style={{ fontSize: '0.95rem' }}>{ticket.summary}</div>
          </div>
          <div>
            <label className="form-label text-muted small mb-1 fw-semibold">Detailed Description</label>
            <div className="p-3 border rounded bg-white text-dark" style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', minHeight: '100px' }}>
              {ticket.description}
            </div>
          </div>
        </div>
      </div>

      {/* Tabbed Communication Panel */}
      <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '12px' }}>
        <div className="card-header bg-white border-bottom p-0">
          <ul className="nav nav-tabs border-0 px-3 pt-2">
            <li className="nav-item">
              <button className={`nav-link ${activeTab === 'comments' ? 'active fw-semibold' : ''}`}
                style={activeTab === 'comments' ? { color: '#4F46E5', borderColor: '#4F46E5 #4F46E5 #fff' } : { color: '#4A6358', border: 'none' }}
                onClick={() => setActiveTab('comments')}>
                💬 Public Comments ({comments.length})
              </button>
            </li>
            {canSeeInternalNotes && (
              <li className="nav-item">
                <button className={`nav-link ${activeTab === 'notes' ? 'active fw-semibold' : ''}`}
                  style={activeTab === 'notes' ? { color: '#D97706', borderColor: '#D97706 #D97706 #fff' } : { color: '#4A6358', border: 'none' }}
                  onClick={() => setActiveTab('notes')}>
                  🔒 Internal Notes ({notes.length})
                </button>
              </li>
            )}
            <li className="nav-item">
              <button className={`nav-link ${activeTab === 'attachments' ? 'active fw-semibold' : ''}`}
                style={activeTab === 'attachments' ? { color: '#15803D', borderColor: '#15803D #15803D #fff' } : { color: '#4A6358', border: 'none' }}
                onClick={() => setActiveTab('attachments')}>
                📎 Attachments ({attachments.length})
              </button>
            </li>
          </ul>
        </div>

        <div className="card-body p-3 p-md-4">
          {activeTab === 'comments' && (
            <div>
              <div className="alert border-0 mb-3 small" style={{ backgroundColor: '#EEF2FF', color: '#4338CA', borderRadius: '8px' }}>
                Shared communication — visible to the Requester, IT Staff, and Administrators.
              </div>

              {commentsLoading ? (
                <div className="text-center py-3 text-muted small">Loading comments...</div>
              ) : comments.length === 0 ? (
                <div className="text-center py-4 text-muted small border rounded bg-light mb-3">No comments yet.</div>
              ) : (
                <div className="d-flex flex-column gap-3 mb-4">
                  {comments.map((c) => (
                    <div key={c.id} className="p-3 rounded border" style={{ borderRadius: '8px', backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }}>
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <div className="d-flex align-items-center gap-2">
                          <span className="fw-bold text-dark small">{c.author?.name || 'User'}</span>
                          <span className="badge" style={{ backgroundColor: '#4F46E5', fontSize: '0.7rem' }}>{c.author?.role || ''}</span>
                        </div>
                        <span className="text-muted extra-small" style={{ fontSize: '0.78rem' }}>{formatDate(c.createdAt)}</span>
                      </div>
                      <div className="text-dark small" style={{ whiteSpace: 'pre-wrap' }}>{c.content || c.body}</div>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handlePostComment} className="border-top pt-3">
                {commentError && <div className="alert alert-danger small p-2 mb-2" style={{ borderRadius: '6px' }}>{commentError}</div>}
                <textarea className="form-control mb-2" rows={2} placeholder="Type a public comment or update..."
                  value={newCommentText} onChange={(e) => setNewCommentText(e.target.value)} maxLength={2000} required />
                <button type="submit" className="btn btn-sm text-white fw-semibold"
                  style={{ backgroundColor: '#4F46E5', borderRadius: '8px' }}
                  disabled={!newCommentText.trim() || submittingComment}>
                  {submittingComment ? 'Posting...' : 'Post Comment'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'notes' && canSeeInternalNotes && (
            <div>
              <div className="alert border-0 mb-3 small fw-semibold" style={{ backgroundColor: '#FEF3C7', color: '#92400E', borderRadius: '8px' }}>
                🔒 PRIVATE — IT STAFF ONLY. Requesters cannot see this tab or its contents.
              </div>

              {notesLoading ? (
                <div className="text-center py-3 text-muted small">Loading internal notes...</div>
              ) : notes.length === 0 ? (
                <div className="text-center py-4 text-muted small border rounded bg-light mb-3">No internal notes yet.</div>
              ) : (
                <div className="d-flex flex-column gap-3 mb-4">
                  {notes.map((n) => (
                    <div key={n.id} className="p-3 rounded border" style={{ borderRadius: '8px', backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }}>
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <div className="d-flex align-items-center gap-2">
                          <span className="fw-bold text-dark small">{n.author?.name || 'Staff'}</span>
                          <span className="badge" style={{ backgroundColor: '#D97706', fontSize: '0.7rem' }}>{n.author?.role || ''}</span>
                        </div>
                        <span className="text-muted extra-small" style={{ fontSize: '0.78rem' }}>{formatDate(n.createdAt)}</span>
                      </div>
                      <div className="text-dark small" style={{ whiteSpace: 'pre-wrap' }}>{n.content}</div>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handlePostNote} className="border-top pt-3">
                {noteError && <div className="alert alert-danger small p-2 mb-2" style={{ borderRadius: '6px' }}>{noteError}</div>}
                <textarea className="form-control mb-2" rows={2} placeholder="Add a private internal note..."
                  value={newNoteText} onChange={(e) => setNewNoteText(e.target.value)} maxLength={2000} required />
                <button type="submit" className="btn btn-sm text-white fw-semibold"
                  style={{ backgroundColor: '#D97706', borderRadius: '8px' }}
                  disabled={!newNoteText.trim() || submittingNote}>
                  {submittingNote ? 'Posting...' : 'Add Internal Note'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'attachments' && (
            <div>
              {downloadError && <div className="alert alert-danger small p-2 mb-3" style={{ borderRadius: '6px' }}>{downloadError}</div>}
              {attachments.length === 0 ? (
                <div className="text-center py-4 text-muted small">No attachments uploaded for this ticket.</div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {attachments.map((att) => (
                    <div key={att.id} className={`d-flex align-items-center justify-content-between p-3 border rounded flex-wrap gap-2 ${att.isRemoved ? 'bg-light opacity-75' : 'bg-white'}`}
                      style={{ borderRadius: '8px', borderStyle: att.isRemoved ? 'dashed' : 'solid' }}>
                      <div>
                        <div className="fw-semibold text-dark small">
                          {att.originalName} {att.isRemoved && <span className="badge bg-secondary ms-1">Removed</span>}
                        </div>
                        <span className="text-muted extra-small" style={{ fontSize: '0.78rem' }}>
                          Uploaded {formatDate(att.createdAt)}
                        </span>
                      </div>
                      <button className="btn btn-outline-success btn-sm" disabled={att.isRemoved} onClick={() => handleDownload(att)}>
                        {att.isRemoved ? 'Unavailable' : 'Download'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffTicketDetail;
