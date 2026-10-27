import React, { useState, useEffect, useCallback } from 'react';
import { getActionStatusPill, followUpPill, formatDate } from '../utils/badges';

export interface ActionItem {
  id: number;
  ticketId: number;
  actionAt: string;
  description: string;
  result: string | null;
  performedBy: { id: number; name: string; role: string };
  assignee: { id: number; name: string; role: string } | null;
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
  status: 'OPEN' | 'COMPLETED' | 'CANCELLED';
}

interface Member {
  id: number;
  name: string;
  role: string;
}

interface ActionsTakenSectionProps {
  ticketId: number;
  /** Auth headers for the current user (Bearer token, or the legacy requester header). */
  getHeaders: () => Record<string, string>;
  readOnly: boolean;
  performerName?: string;
  members?: Member[];
  onCountChange?: (count: number) => void;
}

interface FormState {
  actionAt: string;
  description: string;
  result: string;
  assigneeId: string;
  followUpRequired: boolean;
  followUpNote: string;
  attachmentNotes: string;
}

const STATUS_LABEL: Record<string, string> = { OPEN: 'Open', COMPLETED: '✓ Completed', CANCELLED: 'Cancelled' };

const toLocalInput = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

const emptyForm = (): FormState => ({
  actionAt: toLocalInput(new Date()),
  description: '',
  result: '',
  assigneeId: '',
  followUpRequired: false,
  followUpNote: '',
  attachmentNotes: '',
});

export const ActionsTakenSection: React.FC<ActionsTakenSectionProps> = ({
  ticketId,
  getHeaders,
  readOnly,
  performerName,
  members = [],
  onCountChange,
}) => {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [completingId, setCompletingId] = useState<number | null>(null);
  const [completeResult, setCompleteResult] = useState('');
  const [completeError, setCompleteError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const listUrl = readOnly ? `/api/tickets/${ticketId}/actions` : `/api/staff/tickets/${ticketId}/actions`;

  const fetchActions = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(listUrl, { headers: getHeaders() });
      const body = await res.json();
      if (!res.ok || !body.success || !Array.isArray(body.data?.actions)) throw new Error('load');
      setActions(body.data.actions);
      onCountChange?.(body.data.actions.length);
    } catch {
      setLoadError("We couldn't load the actions.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listUrl]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFieldErrors({});
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (a: ActionItem) => {
    setEditingId(a.id);
    setForm({
      actionAt: toLocalInput(new Date(a.actionAt)),
      description: a.description,
      result: a.result ?? '',
      assigneeId: a.assignee ? String(a.assignee.id) : '',
      followUpRequired: a.followUpRequired,
      followUpNote: a.followUpNote ?? '',
      attachmentNotes: a.attachmentNotes ?? '',
    });
    setFieldErrors({});
    setFormError(null);
    setShowForm(true);
  };

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!form.description.trim()) e.description = 'Description is required.';
    else if (form.description.trim().length > 2000) e.description = 'Description must be at most 2000 characters.';
    if (form.result.length > 1000) e.result = 'Result must be at most 1000 characters.';
    if (form.attachmentNotes.length > 500) e.attachmentNotes = 'Attachment notes must be at most 500 characters.';
    if (form.followUpRequired && !form.followUpNote.trim()) e.followUpNote = 'Follow-up note is required.';
    return e;
  };

  const handleSave = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const errs = validate();
    setFieldErrors(errs);
    setFormError(null);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    const payload: Record<string, unknown> = {
      actionAt: new Date(form.actionAt).toISOString(),
      description: form.description.trim(),
      result: form.result.trim(),
      assigneeId: form.assigneeId ? Number(form.assigneeId) : null,
      followUpRequired: form.followUpRequired,
      followUpNote: form.followUpRequired ? form.followUpNote.trim() : '',
      attachmentNotes: form.attachmentNotes.trim(),
    };
    try {
      const res = await fetch(editingId ? `${listUrl}/${editingId}` : listUrl, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        if (body?.error?.details) setFieldErrors(body.error.details);
        setFormError(body?.error?.message ?? 'We could not save the action. Please try again.');
        return;
      }
      setShowForm(false);
      setSuccess(editingId ? 'Action updated.' : 'Action added.');
      await fetchActions();
    } catch {
      setFormError('We could not save the action. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const runRowAction = async (a: ActionItem, path: 'complete' | 'cancel', body?: object) => {
    setRowError(null);
    try {
      const res = await fetch(`${listUrl}/${a.id}/${path}`, {
        method: 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body ?? {}),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        const msg = json?.error?.details?.result ?? json?.error?.message ?? 'The action could not be updated.';
        if (path === 'complete') setCompleteError(msg);
        else setRowError(msg);
        return false;
      }
      setSuccess(path === 'complete' ? 'Action completed.' : 'Action cancelled.');
      await fetchActions();
      return true;
    } catch {
      setRowError('The action could not be updated. Please try again.');
      return false;
    }
  };

  const submitComplete = async (a: ActionItem) => {
    if (!completeResult.trim()) {
      setCompleteError('Result is required to complete an action.');
      return;
    }
    setCompleteError(null);
    if (await runRowAction(a, 'complete', { result: completeResult.trim() })) {
      setCompletingId(null);
      setCompleteResult('');
    }
  };

  const confirmCancel = async (a: ActionItem) => {
    if (await runRowAction(a, 'cancel')) setCancellingId(null);
  };

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));
  const errMsg = (k: string) =>
    fieldErrors[k] ? (
      <div id={`action-${k}-error`} className="text-danger small mt-1" role="alert">
        {fieldErrors[k]}
      </div>
    ) : null;
  const inputClass = (k: string) => `form-control ${fieldErrors[k] ? 'is-invalid' : ''}`;

  return (
    <div data-testid="actions-taken-section">
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h2 className="h6 mb-0 fw-bold">Actions Taken</h2>
        {!readOnly && !showForm && (
          <button type="button" className="btn btn-sm text-white" style={{ backgroundColor: '#006B3C' }} onClick={openCreate}>
            Add Action Taken
          </button>
        )}
      </div>

      {success && (
        <div className="alert alert-success small p-2" role="status">
          ✓ {success}
        </div>
      )}
      {rowError && (
        <div className="alert alert-danger small p-2" role="alert">
          {rowError}
        </div>
      )}

      {!readOnly && showForm && (
        <form onSubmit={handleSave} noValidate className="border rounded p-3 mb-3" style={{ backgroundColor: '#F5F7F6' }} aria-label={editingId ? 'Edit action' : 'Add action'}>
          <div className="row g-3">
            <div className="col-md-6">
              <label htmlFor="action-actionAt" className="form-label small fw-semibold">Action date/time</label>
              <input id="action-actionAt" type="datetime-local" className={inputClass('actionAt')} value={form.actionAt} onChange={(e) => set('actionAt', e.target.value)} />
              {errMsg('actionAt')}
            </div>
            <div className="col-md-6">
              <label htmlFor="action-performedBy" className="form-label small fw-semibold">Performed By</label>
              <input id="action-performedBy" className="form-control" value={performerName ?? ''} readOnly style={{ backgroundColor: '#E8EFEB' }} />
            </div>
            <div className="col-12">
              <label htmlFor="action-description" className="form-label small fw-semibold">
                Description <span className="text-danger">*</span>
              </label>
              <textarea id="action-description" rows={3} className={inputClass('description')} value={form.description} onChange={(e) => set('description', e.target.value)} aria-describedby="action-description-error" />
              <div className="text-muted small">{form.description.length}/2000</div>
              {errMsg('description')}
            </div>
            <div className="col-12">
              <label htmlFor="action-result" className="form-label small fw-semibold">Result</label>
              <textarea id="action-result" rows={2} className={inputClass('result')} value={form.result} onChange={(e) => set('result', e.target.value)} aria-describedby="action-result-error" />
              {errMsg('result')}
            </div>
            <div className="col-md-6">
              <label htmlFor="action-assignee" className="form-label small fw-semibold">Assignee</label>
              <select id="action-assignee" className="form-select" value={form.assigneeId} onChange={(e) => set('assigneeId', e.target.value)}>
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label htmlFor="action-attachmentNotes" className="form-label small fw-semibold">Attachment notes</label>
              <input id="action-attachmentNotes" className={inputClass('attachmentNotes')} value={form.attachmentNotes} onChange={(e) => set('attachmentNotes', e.target.value)} aria-describedby="action-attachmentNotes-help action-attachmentNotes-error" />
              <div id="action-attachmentNotes-help" className="text-muted small">Tell the reader which attached file to look at</div>
              {errMsg('attachmentNotes')}
            </div>
            <div className="col-12">
              <div className="form-check">
                <input id="action-followUpRequired" type="checkbox" className="form-check-input" checked={form.followUpRequired} onChange={(e) => set('followUpRequired', e.target.checked)} />
                <label htmlFor="action-followUpRequired" className="form-check-label small fw-semibold">Follow-up required</label>
              </div>
            </div>
            {form.followUpRequired && (
              <div className="col-12">
                <label htmlFor="action-followUpNote" className="form-label small fw-semibold">
                  Follow-up note <span className="text-danger">*</span>
                </label>
                <textarea id="action-followUpNote" rows={2} className={inputClass('followUpNote')} value={form.followUpNote} onChange={(e) => set('followUpNote', e.target.value)} aria-describedby="action-followUpNote-error" />
                {errMsg('followUpNote')}
              </div>
            )}
          </div>
          {formError && (
            <div className="alert alert-danger small p-2 mt-3 mb-0" role="alert">
              {formError}
            </div>
          )}
          <div className="d-flex gap-2 mt-3">
            <button type="submit" className="btn text-white" style={{ backgroundColor: '#006B3C', minHeight: 44 }} disabled={saving}>
              {saving ? 'Saving...' : 'Save Action'}
            </button>
            <button type="button" className="btn btn-outline-secondary" style={{ minHeight: 44 }} onClick={() => setShowForm(false)} disabled={saving}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-muted small py-3" role="status">Loading actions...</div>
      ) : loadError ? (
        <div className="alert alert-danger small" role="alert">
          {loadError}{' '}
          <button type="button" className="btn btn-sm btn-outline-danger ms-2" onClick={fetchActions}>Retry</button>
        </div>
      ) : actions.length === 0 ? (
        <div className="text-center py-4 text-muted small">
          {readOnly ? 'No actions have been recorded yet.' : 'No actions have been recorded for this Ticket yet.'}
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {actions.map((a) => (
            <div key={a.id} className="border rounded p-3 bg-white" data-testid={`action-${a.id}`}>
              <div className="d-flex justify-content-between flex-wrap gap-2 mb-2">
                <span className="text-muted small">{formatDate(a.actionAt)}</span>
                <span className="d-flex gap-2 flex-wrap">
                  <span style={getActionStatusPill(a.status)}>{STATUS_LABEL[a.status]}</span>
                  {a.followUpRequired && <span style={followUpPill}>⚑ Follow-up required</span>}
                </span>
              </div>
              <div className="fw-semibold" style={{ overflowWrap: 'anywhere' }}>{a.description}</div>
              <div className="small mt-1" style={{ overflowWrap: 'anywhere' }}>
                <span className="text-muted">Result: </span>
                {a.result ? a.result : <span className="text-muted">No result yet</span>}
              </div>
              <div className="small text-muted mt-1">
                Performed by {a.performedBy.name} ({a.performedBy.role === 'ADMINISTRATOR' ? 'Administrator' : 'IT Staff'}) · Assignee:{' '}
                {a.assignee ? a.assignee.name : 'Unassigned'}
              </div>
              {a.followUpRequired && a.followUpNote && (
                <div className="small mt-1" style={{ overflowWrap: 'anywhere' }}>
                  <span className="text-muted">Follow-up note: </span>{a.followUpNote}
                </div>
              )}
              {a.attachmentNotes && (
                <div className="small mt-1" style={{ overflowWrap: 'anywhere' }}>
                  <span className="text-muted">Attachment notes: </span>{a.attachmentNotes}
                </div>
              )}

              {!readOnly && a.status === 'OPEN' && (
                <div className="mt-2">
                  {completingId === a.id ? (
                    <div className="border rounded p-2" style={{ backgroundColor: '#F5F7F6' }}>
                      <label htmlFor={`complete-result-${a.id}`} className="form-label small fw-semibold">
                        Result <span className="text-danger">*</span>
                      </label>
                      <textarea id={`complete-result-${a.id}`} rows={2} className={`form-control ${completeError ? 'is-invalid' : ''}`} value={completeResult} onChange={(e) => setCompleteResult(e.target.value)} />
                      {completeError && <div className="text-danger small mt-1" role="alert">{completeError}</div>}
                      <div className="d-flex gap-2 mt-2">
                        <button type="button" className="btn btn-sm text-white" style={{ backgroundColor: '#006B3C' }} onClick={() => submitComplete(a)}>Complete Action</button>
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setCompletingId(null); setCompleteError(null); }}>Cancel</button>
                      </div>
                    </div>
                  ) : cancellingId === a.id ? (
                    <div className="alert alert-warning small p-2 mb-0" role="alertdialog" aria-label="Confirm cancel action">
                      Cancel this action? It can't be edited afterwards.
                      <div className="d-flex gap-2 mt-2">
                        <button type="button" className="btn btn-sm btn-danger" onClick={() => confirmCancel(a)}>Cancel Action</button>
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setCancellingId(null)}>Keep Open</button>
                      </div>
                    </div>
                  ) : (
                    <div className="d-flex gap-2 flex-wrap">
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => openEdit(a)}>Edit</button>
                      <button type="button" className="btn btn-sm btn-outline-success" onClick={() => { setCompletingId(a.id); setCompleteResult(a.result ?? ''); setCompleteError(null); }}>Complete</button>
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setCancellingId(a.id)}>Cancel</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActionsTakenSection;
