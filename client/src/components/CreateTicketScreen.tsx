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

      // Success
      setSuccessTicketNumber(data.data.ticketNumber);
      setSubmitting(false);

      // Reset form fields
      setCategoryId('');
      setRelatedSystemId('');
      setSummary('');
      setRequestedPriority('MEDIUM');
      setDescription('');
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
          className="alert alert-success d-flex align-items-center justify-content-between mb-4 p-3"
          style={{ backgroundColor: '#EAF6EF', borderColor: '#BBE6CE', color: '#006B3C', borderRadius: '8px' }}
          role="alert"
        >
          <div>
            <h5 className="fw-bold mb-1">🎉 Ticket Created Successfully!</h5>
            <p className="mb-0 fs-6">
              Your ticket reference number is <strong>{successTicketNumber}</strong>. Status is set to{' '}
              <span className="badge bg-success">NEW</span>.
            </p>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('my-tickets')}
              className="btn btn-sm text-white fw-semibold ms-3"
              style={{ backgroundColor: '#006B3C' }}
            >
              View My Tickets →
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
