import React, { useState, useEffect } from 'react';
import { useRequester } from '../context/RequesterContext';

interface CategoryOption {
  id: number;
  name: string;
}

interface SystemOption {
  id: number;
  name: string;
}

interface CreateTicketScreenProps {
  onNavigate?: (view: 'my-tickets' | 'create-ticket') => void;
}

export const CreateTicketScreen: React.FC<CreateTicketScreenProps> = ({ onNavigate }) => {
  const { currentRequester, getAuthHeaders } = useRequester();

  // Form State
  const [categoryId, setCategoryId] = useState<string>('');
  const [relatedSystemId, setRelatedSystemId] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [requestedPriority, setRequestedPriority] = useState<string>('MEDIUM');
  const [description, setDescription] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Options State
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [systems, setSystems] = useState<SystemOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState<boolean>(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  // Submission State
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successTicketNumber, setSuccessTicketNumber] = useState<string | null>(null);

  // Client Validation State
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  // File Validation Process Helper
  const processFile = (file: File) => {
    setFileError(null);
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      setFileError('Only JPG, PNG, WEBP, and PDF files are allowed.');
      setSelectedFile(null);
      return;
    }

    if (file.size > maxSize) {
      setFileError('File size exceeds maximum allowed limit of 5 MB.');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  // File Input Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Fetch reference data (Categories & Systems)
  useEffect(() => {
    const fetchReferenceData = async () => {
      setLoadingOptions(true);
      setOptionsError(null);
      try {
        const [catRes, sysRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/related-systems'),
        ]);

        if (!catRes.ok || !sysRes.ok) {
          throw new Error('Failed to load category or related system options.');
        }

        const catData = await catRes.json();
        const sysData = await sysRes.json();

        setCategories(Array.isArray(catData) ? catData : catData.data || []);
        setSystems(Array.isArray(sysData) ? sysData : sysData.data || []);
      } catch (err: any) {
        console.error('Error loading reference options:', err);
        setOptionsError(err.message || 'Unable to connect to server.');
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchReferenceData();
  }, []);

  // Client-side Validation Logic
  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!categoryId) {
      errors.categoryId = 'Please select a request category.';
    }

    if (!relatedSystemId) {
      errors.relatedSystemId = 'Please select a related system.';
    }

    const trimmedSummary = summary.trim();
    if (!trimmedSummary) {
      errors.summary = 'Summary is required.';
    } else if (trimmedSummary.length < 5) {
      errors.summary = 'Summary must be at least 5 characters long.';
    } else if (trimmedSummary.length > 150) {
      errors.summary = 'Summary must not exceed 150 characters.';
    }

    if (!requestedPriority) {
      errors.requestedPriority = 'Please select a requested priority level.';
    }

    const trimmedDesc = description.trim();
    if (!trimmedDesc) {
      errors.description = 'Description is required.';
    } else if (trimmedDesc.length < 10) {
      errors.description = 'Description must be at least 10 characters long.';
    } else if (trimmedDesc.length > 2000) {
      errors.description = 'Description must not exceed 2000 characters.';
    }

    if (fileError) {
      errors.file = fileError;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setSuccessTicketNumber(null);

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        categoryId: parseInt(categoryId, 10),
        relatedSystemId: parseInt(relatedSystemId, 10),
        summary: summary.trim(),
        requestedPriority,
        description: description.trim(),
      };

      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMsg = data.error?.message || 'Failed to submit IT support ticket.';
        setApiError(errorMsg);
        setSubmitting(false);
        return;
      }

      const createdTicketId = data.data.id;
      const createdTicketNumber = data.data.ticketNumber;

      // Upload attachment if selected (BR-24)
      if (selectedFile && createdTicketId) {
        try {
          const formData = new FormData();
          formData.append('file', selectedFile);

          const attachRes = await fetch(`/api/tickets/${createdTicketId}/attachments`, {
            method: 'POST',
            headers: {
              ...getAuthHeaders(),
            },
            body: formData,
          });

          if (!attachRes.ok) {
            const attachErrData = await attachRes.json().catch(() => ({}));
            console.warn('Attachment upload failed:', attachErrData);
            setApiError(`Ticket ${createdTicketNumber} created, but file attachment upload failed: ${attachErrData.error?.message || 'Upload error'}`);
          }
        } catch (uploadErr) {
          console.error('Attachment upload exception:', uploadErr);
          setApiError(`Ticket ${createdTicketNumber} created, but file attachment upload encountered a network error.`);
        }
      }

      // Success
      setSuccessTicketNumber(createdTicketNumber);
      setSubmitting(false);

      // Reset form fields
      setCategoryId('');
      setRelatedSystemId('');
      setSummary('');
      setRequestedPriority('MEDIUM');
      setDescription('');
      setSelectedFile(null);
      setFileError(null);
      setValidationErrors({});
    } catch (err: any) {
      console.error('Submission error:', err);
      setApiError('Network connection error. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="card shadow-sm border-0 p-4 w-100" style={{ borderRadius: '12px', backgroundColor: '#FFFFFF' }}>
      {/* Title Header */}
      <div className="border-bottom pb-3 mb-4">
        <h1 className="fw-bold fs-3 mb-1" style={{ color: '#1A2E26' }}>
          ➕ Create IT Support Ticket
        </h1>
        <p className="text-muted mb-0 fs-6">
          Submit a request for IT assistance. Submitting as{' '}
          <span className="fw-semibold text-success">{currentRequester?.name}</span> ({currentRequester?.email}).
        </p>
      </div>

      {/* Success Notification */}
      {successTicketNumber && (
        <div
          className="alert alert-success d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between mb-4 p-3 p-md-4 gap-3 shadow-sm border"
          style={{ backgroundColor: '#F0FDF4', borderColor: '#BBF7D0', color: '#15803D', borderRadius: '12px' }}
          role="alert"
        >
          <div className="d-flex align-items-start gap-3">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
              style={{ width: '42px', height: '42px', backgroundColor: '#DCFCE7', color: '#15803D', fontSize: '1.25rem' }}
            >
              🎉
            </div>
            <div>
              <h5 className="fw-bold mb-1" style={{ color: '#14532D', fontSize: '1.05rem' }}>
                Ticket Created Successfully!
              </h5>
              <p className="mb-0 text-secondary" style={{ fontSize: '0.875rem', lineHeight: '1.5' }}>
                Your ticket reference number is{' '}
                <span className="fw-bold text-dark" style={{ whiteSpace: 'nowrap' }}>
                  {successTicketNumber}
                </span>
                . Status is set to{' '}
                <span className="badge rounded-pill bg-success px-2.5 py-1 align-middle" style={{ fontSize: '0.72rem', fontWeight: 600 }}>
                  NEW
                </span>
              </p>
            </div>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('my-tickets')}
              className="btn btn-sm text-white fw-semibold px-3 py-2 flex-shrink-0 align-self-stretch align-self-md-center ms-0 ms-md-2"
              style={{ backgroundColor: '#15803D', borderRadius: '8px', whiteSpace: 'nowrap', fontSize: '0.875rem' }}
            >
              View My Tickets &rarr;
            </button>
          )}
        </div>
      )}

      {/* Server Error Callout */}
      {apiError && (
        <div className="alert alert-danger mb-4" role="alert">
          <strong className="d-block mb-1">⚠️ Submission Failed</strong>
          <small>{apiError}</small>
        </div>
      )}

      {/* Options Error Callout */}
      {optionsError && (
        <div className="alert alert-danger mb-4" role="alert">
          <strong className="d-block mb-1">Error Loading Reference Data</strong>
          <small>{optionsError}</small>
        </div>
      )}

      {/* Loading Reference Options State */}
      {loadingOptions ? (
        <div className="text-center py-5">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading options...</span>
          </div>
          <p className="mt-2 text-muted">Loading categories and system options...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <div className="row g-3 mb-3">
            {/* Category Dropdown */}
            <div className="col-md-6">
              <label htmlFor="categoryId" className="form-label fw-semibold" style={{ color: '#1A2E26' }}>
                Category <span className="text-danger">*</span>
              </label>
              <select
                id="categoryId"
                className={`form-select ${validationErrors.categoryId ? 'is-invalid' : ''}`}
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  if (validationErrors.categoryId) {
                    setValidationErrors((prev) => ({ ...prev, categoryId: '' }));
                  }
                }}
                disabled={submitting}
              >
                <option value="">-- Select Category --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {validationErrors.categoryId && (
                <div className="invalid-feedback d-block">{validationErrors.categoryId}</div>
              )}
            </div>

            {/* Related System Dropdown */}
            <div className="col-md-6">
              <label htmlFor="relatedSystemId" className="form-label fw-semibold" style={{ color: '#1A2E26' }}>
                Related System <span className="text-danger">*</span>
              </label>
              <select
                id="relatedSystemId"
                className={`form-select ${validationErrors.relatedSystemId ? 'is-invalid' : ''}`}
                value={relatedSystemId}
                onChange={(e) => {
                  setRelatedSystemId(e.target.value);
                  if (validationErrors.relatedSystemId) {
                    setValidationErrors((prev) => ({ ...prev, relatedSystemId: '' }));
                  }
                }}
                disabled={submitting}
              >
                <option value="">-- Select Related System --</option>
                {systems.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {validationErrors.relatedSystemId && (
                <div className="invalid-feedback d-block">{validationErrors.relatedSystemId}</div>
              )}
            </div>
          </div>

          {/* Requested Priority Select */}
          <div className="mb-3">
            <label htmlFor="requestedPriority" className="form-label fw-semibold" style={{ color: '#1A2E26' }}>
              Requested Priority <span className="text-danger">*</span>
            </label>
            <select
              id="requestedPriority"
              className={`form-select ${validationErrors.requestedPriority ? 'is-invalid' : ''}`}
              value={requestedPriority}
              onChange={(e) => {
                setRequestedPriority(e.target.value);
                if (validationErrors.requestedPriority) {
                  setValidationErrors((prev) => ({ ...prev, requestedPriority: '' }));
                }
              }}
              disabled={submitting}
            >
              <option value="LOW">Low - General inquiry or minor issue</option>
              <option value="MEDIUM">Medium - Normal operational issue</option>
              <option value="HIGH">High - Important issue affecting work</option>
              <option value="CRITICAL">Critical - Complete system outage or emergency</option>
            </select>
            {validationErrors.requestedPriority && (
              <div className="invalid-feedback d-block">{validationErrors.requestedPriority}</div>
            )}
          </div>

          {/* Summary Input */}
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label htmlFor="summary" className="form-label fw-semibold mb-0" style={{ color: '#1A2E26' }}>
                Summary <span className="text-danger">*</span>
              </label>
              <small className={`form-text ${summary.length > 150 ? 'text-danger' : 'text-muted'}`}>
                {summary.length} / 150 chars
              </small>
            </div>
            <input
              type="text"
              id="summary"
              className={`form-control ${validationErrors.summary ? 'is-invalid' : ''}`}
              placeholder="Brief summary of the issue (e.g. Cannot access email account)"
              value={summary}
              onChange={(e) => {
                setSummary(e.target.value);
                if (validationErrors.summary) {
                  setValidationErrors((prev) => ({ ...prev, summary: '' }));
                }
              }}
              disabled={submitting}
              maxLength={160}
            />
            {validationErrors.summary && (
              <div className="invalid-feedback d-block">{validationErrors.summary}</div>
            )}
          </div>

          {/* Description Textarea */}
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label htmlFor="description" className="form-label fw-semibold mb-0" style={{ color: '#1A2E26' }}>
                Description <span className="text-danger">*</span>
              </label>
              <small className={`form-text ${description.length > 2000 ? 'text-danger' : 'text-muted'}`}>
                {description.length} / 2000 chars
              </small>
            </div>
            <textarea
              id="description"
              rows={5}
              className={`form-control ${validationErrors.description ? 'is-invalid' : ''}`}
              placeholder="Provide full details, steps to reproduce, or relevant error messages..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (validationErrors.description) {
                  setValidationErrors((prev) => ({ ...prev, description: '' }));
                }
              }}
              disabled={submitting}
              maxLength={2050}
            />
            {validationErrors.description && (
              <div className="invalid-feedback d-block">{validationErrors.description}</div>
            )}
          </div>

          {/* Custom Attachments Dropzone UI */}
          <div className="mb-4">
            <div className="d-flex align-items-center gap-2 mb-2">
              <span className="fw-bold tracking-wider" style={{ color: '#006B3C', fontSize: '0.85rem', letterSpacing: '0.05em' }}>
                ATTACHMENTS
              </span>
              <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                · optional · up to 5 files · 5 MB each
              </span>
            </div>

            <div
              className="p-4 text-center rounded-3 position-relative"
              style={{
                borderStyle: 'dashed',
                borderWidth: '2px',
                borderColor: isDragging ? '#006B3C' : (fileError ? '#DC3545' : '#CBD5E1'),
                backgroundColor: isDragging ? '#EAF6EF' : '#F8FAFC',
                transition: 'all 0.2s ease-in-out',
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (!submitting) setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (!submitting && e.dataTransfer.files && e.dataTransfer.files[0]) {
                  processFile(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => {
                if (!submitting) {
                  document.getElementById('create-ticket-attachment')?.click();
                }
              }}
            >
              <input
                type="file"
                id="create-ticket-attachment"
                className="d-none"
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={handleFileChange}
                disabled={submitting}
              />

              {!selectedFile ? (
                <div>
                  <div className="mb-2">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#006B3C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <p className="mb-1 text-secondary" style={{ fontSize: '0.95rem' }}>
                    Drag and drop files here, or{' '}
                    <span className="fw-bold" style={{ color: '#006B3C', textDecoration: 'underline' }}>
                      browse files
                    </span>
                  </p>
                  <small className="text-muted d-block" style={{ fontSize: '0.8rem', letterSpacing: '0.04em' }}>
                    JPG · PNG · WEBP · PDF
                  </small>
                </div>
              ) : (
                <div className="d-flex align-items-center justify-content-between p-2 px-3 bg-white border rounded shadow-sm">
                  <div className="d-flex align-items-center gap-2 overflow-hidden">
                    <span className="fs-5">📄</span>
                    <div className="text-start text-truncate">
                      <div className="fw-semibold text-dark text-truncate" style={{ fontSize: '0.9rem' }}>
                        {selectedFile.name}
                      </div>
                      <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </small>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger border-0 ms-2"
                    title="Remove file"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      setFileError(null);
                      const fileInput = document.getElementById('create-ticket-attachment') as HTMLInputElement;
                      if (fileInput) fileInput.value = '';
                    }}
                  >
                    ✖
                  </button>
                </div>
              )}
            </div>

            {fileError && <div className="text-danger small mt-2 fw-semibold">⚠️ {fileError}</div>}
          </div>

          {/* Submit Action Button */}
          <div className="d-flex justify-content-end gap-2">
            {onNavigate && (
              <button
                type="button"
                className="btn btn-outline-secondary px-4 fw-semibold"
                onClick={() => onNavigate('my-tickets')}
                disabled={submitting}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="btn text-white fw-semibold px-4 d-flex align-items-center gap-2"
              disabled={submitting}
              style={{
                backgroundColor: submitting ? '#94A3B8' : '#006B3C',
                borderColor: submitting ? '#94A3B8' : '#006B3C',
              }}
            >
              {submitting ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  Submitting...
                </>
              ) : (
                'Submit Ticket'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
