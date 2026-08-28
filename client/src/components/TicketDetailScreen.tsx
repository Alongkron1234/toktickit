import React, { useState, useEffect, useCallback } from 'react';
import { useRequester } from '../context/RequesterContext';

export interface AttachmentItem {
  id: number;
  ticketId: number;
  originalName: string;
  storedName: string;
  mimeType: string;
  fileSize: number;
  isRemoved: boolean;
  removalReason?: string | null;
  removedAt?: string | null;
  createdAt: string;
}

export interface TicketDetailData {
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
  requester: { id: number; name: string; email: string };
  attachments: AttachmentItem[];
}

export interface TicketDetailScreenProps {
  ticketId: number;
  onBack: () => void;
}

export const TicketDetailScreen: React.FC<TicketDetailScreenProps> = ({ ticketId, onBack }) => {
  const { currentRequester } = useRequester();

  const [ticket, setTicket] = useState<TicketDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upload Attachment State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Soft Remove Attachment State
  const [removingAttachment, setRemovingAttachment] = useState<AttachmentItem | null>(null);
  const [removalReason, setRemovalReason] = useState('');
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  // Fetch Ticket Detail
  const fetchTicketDetail = useCallback(async () => {
    if (!currentRequester) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/tickets/${ticketId}`, {
        headers: {
          'X-Dev-Requester-Id': currentRequester.id.toString(),
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to load ticket details.');
      }

      setTicket(result.data);
    } catch (err: any) {
      console.error('Error fetching ticket detail:', err);
      setError(err.message || 'Unable to load ticket details.');
    } finally {
      setLoading(false);
    }
  }, [ticketId, currentRequester]);

  useEffect(() => {
    fetchTicketDetail();
  }, [fetchTicketDetail]);

  // Download Attachment Handler
  const handleDownload = async (attachment: AttachmentItem) => {
    if (!currentRequester || attachment.isRemoved) return;

    try {
      const res = await fetch(`/api/attachments/${attachment.id}/download`, {
        headers: {
          'X-Dev-Requester-Id': currentRequester.id.toString(),
        },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || 'Failed to download attachment.');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.originalName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err: any) {
      alert(err.message || 'Error downloading file.');
    }
  };

  // Upload Attachment Form Submit
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !currentRequester) return;

    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch(`/api/tickets/${ticketId}/attachments`, {
        method: 'POST',
        headers: {
          'X-Dev-Requester-Id': currentRequester.id.toString(),
        },
        body: formData,
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to upload attachment.');
      }

      setShowUploadModal(false);
      setSelectedFile(null);
      fetchTicketDetail(); // Refresh list
    } catch (err: any) {
      console.error('Error uploading attachment:', err);
      setUploadError(err.message || 'Failed to upload attachment.');
    } finally {
      setUploading(false);
    }
  };

  // Soft Remove Submit
  const handleSoftRemoveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!removingAttachment || !currentRequester) return;

    const trimmed = removalReason.trim();
    if (!trimmed || trimmed.length < 3) {
      setRemoveError('Please enter a valid removal reason (minimum 3 characters).');
      return;
    }

    if (trimmed.length > 200) {
      setRemoveError('Removal reason cannot exceed 200 characters.');
      return;
    }

    setRemoving(true);
    setRemoveError(null);

    try {
      const res = await fetch(`/api/attachments/${removingAttachment.id}/remove`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Dev-Requester-Id': currentRequester.id.toString(),
        },
        body: JSON.stringify({
          removalReason: removalReason.trim(),
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to remove attachment.');
      }

      setRemovingAttachment(null);
      setRemovalReason('');
      fetchTicketDetail(); // Refresh list
    } catch (err: any) {
      console.error('Error soft-removing attachment:', err);
      setRemoveError(err.message || 'Failed to remove attachment.');
    } finally {
      setRemoving(false);
    }
  };

  // Helpers
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
        + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return dateStr;
    }
  };

  const getPriorityPill = (p: string): React.CSSProperties => {
    const base: React.CSSProperties = { borderRadius: '20px', padding: '2px 14px', fontWeight: 600, fontSize: '0.78rem', display: 'inline-block' };
    switch (p) {
      case 'CRITICAL':
      case 'HIGH': return { ...base, backgroundColor: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA' };
      case 'MEDIUM': return { ...base, backgroundColor: '#FEF3C7', color: '#D97706', border: '1px solid #FDE68A' };
      case 'LOW': return { ...base, backgroundColor: '#DCFCE7', color: '#16A34A', border: '1px solid #BBF7D0' };
      default: return { ...base, backgroundColor: '#F3F4F6', color: '#6B7280' };
    }
  };

  const getStatusPill = (s: string): React.CSSProperties => {
    const base: React.CSSProperties = { borderRadius: '20px', padding: '2px 14px', fontWeight: 600, fontSize: '0.78rem', display: 'inline-block' };
    switch (s) {
      case 'NEW': return { ...base, backgroundColor: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC' };
      case 'OPEN': return { ...base, backgroundColor: '#DBEAFE', color: '#2563EB', border: '1px solid #93C5FD' };
      case 'IN_PROGRESS': return { ...base, backgroundColor: '#D1FAE5', color: '#059669', border: '1px solid #6EE7B7' };
      case 'RESOLVED': return { ...base, backgroundColor: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC' };
      case 'CLOSED': return { ...base, backgroundColor: '#F1F5F9', color: '#64748B', border: '1px solid #CBD5E1' };
      default: return { ...base, backgroundColor: '#FEF9C3', color: '#CA8A04', border: '1px solid #FDE047' };
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-success" role="status" style={{ width: '2.5rem', height: '2.5rem' }}>
          <span className="visually-hidden">Loading ticket details...</span>
        </div>
        <p className="mt-3 text-muted">Loading ticket details...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="container py-4" style={{ maxWidth: '1000px' }}>
        <button className="btn btn-outline-secondary btn-sm mb-3" onClick={onBack}>
          &larr; Back to My Tickets
        </button>
        <div className="alert alert-danger shadow-sm border-0 p-4" style={{ borderRadius: '12px' }}>
          <h5 className="fw-bold mb-2">Error Loading Ticket</h5>
          <p className="mb-0">{error || 'Ticket details not available.'}</p>
        </div>
      </div>
    );
  }

  const activeAttachments = ticket.attachments.filter((a) => !a.isRemoved);
  const removedAttachments = ticket.attachments.filter((a) => a.isRemoved);

  return (
    <div className="container py-4 px-3 px-md-4" style={{ maxWidth: '1100px' }}>
      {/* Breadcrumb & Navigation */}
      <div className="d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div className="text-muted small">
          My Tickets &gt; <span className="text-dark fw-semibold">{ticket.ticketNumber}</span>
        </div>
        <button
          className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center gap-2 px-3 py-1.5"
          style={{ borderRadius: '8px', fontSize: '0.875rem' }}
          onClick={onBack}
        >
          &larr; Back to My Tickets
        </button>
      </div>

      {/* Main Ticket Summary Card (Read-Only) */}
      <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '12px' }}>
        <div className="card-header bg-white border-bottom p-3 p-md-4 d-flex align-items-center justify-content-between flex-wrap gap-3">
          <div>
            <span className="text-muted small d-block mb-1">Ticket Number</span>
            <h3 className="fw-bold mb-0" style={{ color: '#15803D' }}>
              {ticket.ticketNumber}
            </h3>
          </div>
          <div className="d-flex align-items-center gap-2">
            <div>
              <span className="text-muted small d-block mb-1 text-center">Current Status</span>
              <span style={getStatusPill(ticket.currentStatus)}>
                {ticket.currentStatus === 'IN_PROGRESS'
                  ? 'In Progress'
                  : ticket.currentStatus.charAt(0) + ticket.currentStatus.slice(1).toLowerCase()}
              </span>
            </div>
          </div>
        </div>

        <div className="card-body p-3 p-md-4" style={{ backgroundColor: '#FAFAFA' }}>
          {/* Read-Only Grid */}
          <div className="row g-3">
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
              <label className="form-label text-muted small mb-1 fw-semibold">Requested Priority</label>
              <div>
                <span style={getPriorityPill(ticket.requestedPriority)}>
                  {ticket.requestedPriority.charAt(0) + ticket.requestedPriority.slice(1).toLowerCase()}
                </span>
              </div>
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label text-muted small mb-1 fw-semibold">Requester</label>
              <div className="p-2 border rounded bg-white text-dark small">
                {ticket.requester?.name} ({ticket.requester?.email})
              </div>
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label text-muted small mb-1 fw-semibold">IT Priority</label>
              <div>
                <span style={getPriorityPill(ticket.itPriority)}>
                  {ticket.itPriority.charAt(0) + ticket.itPriority.slice(1).toLowerCase()}
                </span>
              </div>
            </div>
          </div>

          <hr className="my-4" />

          {/* Ticket Summary & Description */}
          <div className="mb-4">
            <label className="form-label text-muted small mb-1 fw-semibold">Ticket Summary</label>
            <div className="p-3 border rounded bg-white text-dark fw-semibold" style={{ fontSize: '0.95rem' }}>
              {ticket.summary}
            </div>
          </div>

          <div>
            <label className="form-label text-muted small mb-1 fw-semibold">Detailed Description</label>
            <div className="p-3 border rounded bg-white text-dark" style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', minHeight: '100px' }}>
              {ticket.description}
            </div>
          </div>
        </div>
      </div>

      {/* Attachments Section */}
      <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '12px' }}>
        <div className="card-header bg-white border-bottom p-3 p-md-4 d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div>
            <h5 className="fw-bold mb-0" style={{ color: '#111827' }}>
              Attachments ({activeAttachments.length}/5 Active)
            </h5>
            <span className="text-muted small">Upload permitted files (JPG, PNG, WEBP, PDF up to 5MB)</span>
          </div>

          <button
            className="btn text-white btn-sm fw-semibold d-inline-flex align-items-center gap-1.5 px-3 py-2"
            style={{ backgroundColor: '#15803D', borderRadius: '8px', opacity: activeAttachments.length >= 5 ? 0.5 : 1 }}
            disabled={activeAttachments.length >= 5}
            onClick={() => {
              setSelectedFile(null);
              setUploadError(null);
              setShowUploadModal(true);
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" />
            </svg>
            Add Attachment
          </button>
        </div>

        <div className="card-body p-3 p-md-4">
          {ticket.attachments.length === 0 ? (
            <div className="text-center py-4 text-muted small">
              No attachments uploaded for this ticket yet.
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {/* Active Attachments */}
              {activeAttachments.map((att) => (
                <div
                  key={att.id}
                  className="d-flex align-items-center justify-content-between p-3 border rounded bg-white shadow-2xs flex-wrap gap-2"
                  style={{ borderRadius: '8px' }}
                >
                  <div className="d-flex align-items-center gap-3">
                    <div className="p-2 rounded bg-light text-success">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M4.5 3a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-7zm10 3.5v6a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 4.5 14v-9A1.5 1.5 0 0 1 6 3.5h7.5A1.5 1.5 0 0 1 15 5v1.5z" />
                      </svg>
                    </div>
                    <div>
                      <div className="fw-semibold text-dark small">{att.originalName}</div>
                      <span className="text-muted extra-small" style={{ fontSize: '0.78rem' }}>
                        {formatFileSize(att.fileSize)} &bull; Uploaded {formatDate(att.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    <button
                      className="btn btn-outline-success btn-sm fw-semibold"
                      onClick={() => handleDownload(att)}
                    >
                      Download
                    </button>
                    <button
                      className="btn btn-outline-danger btn-sm"
                      title="Remove attachment"
                      onClick={() => {
                        setRemovingAttachment(att);
                        setRemovalReason('');
                        setRemoveError(null);
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
                        <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}

              {/* Soft-Removed Attachments (Historical Metadata & Disabled Links) */}
              {removedAttachments.map((att) => (
                <div
                  key={att.id}
                  className="d-flex align-items-start justify-content-between p-3 border rounded bg-light opacity-75 flex-wrap gap-2"
                  style={{ borderRadius: '8px', borderStyle: 'dashed' }}
                >
                  <div className="d-flex align-items-start gap-3">
                    <div className="p-2 rounded bg-secondary-subtle text-secondary mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z" />
                      </svg>
                    </div>
                    <div>
                      <div className="d-flex align-items-center gap-2">
                        <span className="fw-semibold text-muted text-decoration-line-through small">{att.originalName}</span>
                        <span className="badge bg-secondary">Removed</span>
                      </div>
                      <div className="text-danger extra-small mt-1" style={{ fontSize: '0.8rem' }}>
                        Reason: {att.removalReason || 'No reason specified'}
                      </div>
                      <span className="text-muted extra-small d-block mt-0.5" style={{ fontSize: '0.75rem' }}>
                        Removed on {formatDate(att.removedAt || att.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <button className="btn btn-sm btn-outline-secondary disabled" disabled style={{ fontSize: '0.8rem' }}>
                      Download Unavailable
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload Attachment Modal */}
      {showUploadModal && (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow" style={{ borderRadius: '12px' }}>
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold" style={{ color: '#111827' }}>
                  Upload Attachment
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowUploadModal(false)}
                ></button>
              </div>

              <form onSubmit={handleUploadSubmit}>
                <div className="modal-body p-4">
                  {uploadError && (
                    <div className="alert alert-danger small p-3 mb-3" style={{ borderRadius: '8px' }}>
                      {uploadError}
                    </div>
                  )}

                  <div className="mb-3">
                    <label htmlFor="attachment-file-input" className="form-label fw-semibold small">Select File *</label>
                    <input
                      id="attachment-file-input"
                      type="file"
                      className="form-control"
                      accept=".jpg,.jpeg,.png,.webp,.pdf"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedFile(e.target.files[0]);
                          setUploadError(null);
                        }
                      }}
                    />
                    <div className="form-text extra-small mt-1 text-muted">
                      Allowed types: JPG, PNG, WEBP, PDF (Maximum file size: 5 MB)
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-top bg-light" style={{ borderRadius: '0 0 12px 12px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm px-3"
                    onClick={() => setShowUploadModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn text-white btn-sm fw-semibold px-4"
                    style={{ backgroundColor: '#15803D' }}
                    disabled={!selectedFile || uploading}
                  >
                    {uploading ? 'Uploading...' : 'Upload File'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Soft Remove Confirmation Modal */}
      {removingAttachment && (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow" style={{ borderRadius: '12px' }}>
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold text-danger">Remove Attachment</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setRemovingAttachment(null)}
                ></button>
              </div>

              <form onSubmit={handleSoftRemoveSubmit}>
                <div className="modal-body p-4">
                  {removeError && (
                    <div className="alert alert-danger small p-3 mb-3" style={{ borderRadius: '8px' }}>
                      {removeError}
                    </div>
                  )}

                  <p className="small mb-3 text-dark">
                    Are you sure you want to soft-remove <strong>{removingAttachment.originalName}</strong>? The file will no longer be downloadable.
                  </p>

                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <label htmlFor="removal-reason-input" className="form-label fw-semibold small mb-0">Removal Reason *</label>
                      <span className={`extra-small ${removalReason.length > 200 ? 'text-danger fw-bold' : 'text-muted'}`}>
                        {removalReason.length}/200
                      </span>
                    </div>
                    <textarea
                      id="removal-reason-input"
                      className="form-control"
                      rows={3}
                      maxLength={200}
                      placeholder="e.g. Uploaded outdated log file by mistake"
                      value={removalReason}
                      onChange={(e) => setRemovalReason(e.target.value)}
                      required
                    ></textarea>
                    <div className="form-text extra-small mt-1 text-muted">
                      Please document why this attachment is being removed (between 3 and 200 characters).
                    </div>
                  </div>
                </div>

                <div className="modal-footer border-top bg-light" style={{ borderRadius: '0 0 12px 12px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm px-3"
                    onClick={() => setRemovingAttachment(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-danger btn-sm fw-semibold px-4"
                    disabled={!removalReason.trim() || removalReason.trim().length < 3 || removalReason.trim().length > 200 || removing}
                  >
                    {removing ? 'Removing...' : 'Confirm Soft Remove'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketDetailScreen;
