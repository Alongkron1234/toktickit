import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getRoleBadge } from '../utils/badges';

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR';
  isActive: boolean;
  requiresPasswordChange: boolean;
}

const ROLE_OPTIONS: AdminUser['role'][] = ['REQUESTER', 'IT_STAFF', 'ADMINISTRATOR'];

type ModalMode = null | { type: 'create' } | { type: 'edit'; user: AdminUser } | { type: 'reset'; user: AdminUser };

const inputStyle: React.CSSProperties = { borderRadius: '8px', fontSize: '0.875rem' };

export const UserManagement: React.FC = () => {
  const { user: currentUser, token, logout } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const [modal, setModal] = useState<ModalMode>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState<AdminUser['role']>('REQUESTER');
  const [formActive, setFormActive] = useState(true);
  const [formPassword, setFormPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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

  const latestRequestId = useRef(0);

  const fetchUsers = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    const requestId = ++latestRequestId.current;
    setLoading(true);
    setError(null);
    setForbidden(false);

    const q = new URLSearchParams();
    if (searchTerm.trim()) q.set('search', searchTerm.trim());
    if (roleFilter) q.set('role', roleFilter);

    try {
      const res = await fetch(`/api/admin/users?${q.toString()}`, { headers: authHeaders() });
      if (await handleUnauthorized(res)) return;
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error?.message || 'Failed to load users.');
      // Search/filter changes fire a fresh request while an older one may
      // still be in flight; only the most recently issued request may apply
      // its result, otherwise a slower unfiltered response can overwrite a
      // faster filtered one and silently show the wrong list.
      if (requestId !== latestRequestId.current) return;
      setUsers(result.data);
    } catch (err: unknown) {
      if (requestId !== latestRequestId.current) return;
      setError(getErrorMessage(err, 'Unable to load users.'));
    } finally {
      if (requestId === latestRequestId.current) setLoading(false);
    }
  }, [token, authHeaders, handleUnauthorized, searchTerm, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openCreate = () => {
    setFormName(''); setFormEmail(''); setFormRole('REQUESTER'); setFormActive(true); setFormPassword('');
    setFormError(null);
    setModal({ type: 'create' });
  };

  const openEdit = (u: AdminUser) => {
    setFormName(u.name); setFormEmail(u.email); setFormRole(u.role); setFormActive(u.isActive); setFormPassword('');
    setFormError(null);
    setModal({ type: 'edit', user: u });
  };

  const openReset = (u: AdminUser) => {
    setFormPassword('');
    setFormError(null);
    setModal({ type: 'reset', user: u });
  };

  const closeModal = () => setModal(null);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ name: formName.trim(), email: formEmail.trim(), role: formRole, isActive: formActive, initialPassword: formPassword }),
      });
      if (await handleUnauthorized(res)) return;
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error?.message || 'Failed to create user.');
      closeModal();
      await fetchUsers();
    } catch (err: unknown) {
      setFormError(getErrorMessage(err, 'Failed to create user.'));
    } finally {
      setSaving(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modal?.type !== 'edit') return;
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/admin/users/${modal.user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ name: formName.trim(), email: formEmail.trim(), role: formRole, isActive: formActive }),
      });
      if (await handleUnauthorized(res)) return;
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error?.message || 'Failed to update user.');
      closeModal();
      await fetchUsers();
    } catch (err: unknown) {
      setFormError(getErrorMessage(err, 'Failed to update user.'));
    } finally {
      setSaving(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modal?.type !== 'reset') return;
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/admin/users/${modal.user.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ newInitialPassword: formPassword }),
      });
      if (await handleUnauthorized(res)) return;
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error?.message || 'Failed to reset password.');
      closeModal();
      await fetchUsers();
    } catch (err: unknown) {
      setFormError(getErrorMessage(err, 'Failed to reset password.'));
    } finally {
      setSaving(false);
    }
  };

  if (forbidden) {
    return (
      <div className="container py-4" style={{ maxWidth: '900px' }}>
        <div className="card border-0 shadow-sm text-center py-5" style={{ borderRadius: '12px' }}>
          <h5 className="fw-bold mb-2">Access Denied</h5>
          <p className="text-muted small mb-4">You no longer have permission to view this page. Your role or account status may have changed — please sign in again.</p>
          <button className="btn btn-outline-secondary px-4 btn-sm mx-auto" onClick={logout}>Sign Out</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4 px-3 px-md-4" style={{ maxWidth: '1200px' }}>
      <div className="d-flex align-items-start justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="fw-bold mb-1" style={{ color: '#111827', fontSize: '1.75rem' }}>Users</h1>
          <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>Manage user accounts, roles, and access.</p>
        </div>
        <button
          className="btn text-white fw-semibold px-3 py-2"
          style={{ backgroundColor: '#15803D', borderRadius: '8px', fontSize: '0.875rem' }}
          onClick={openCreate}
        >
          + Create User
        </button>
      </div>

      <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: '12px' }}>
        <div className="card-body py-3 px-3">
          <div className="row g-2 align-items-end">
            <div className="col-12 col-md">
              <label htmlFor="user-search-input" className="d-block text-muted mb-1" style={{ fontSize: '0.75rem', fontWeight: 500 }}>Search</label>
              <input id="user-search-input" type="text" className="form-control" placeholder="Search by name or email..."
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={inputStyle} />
            </div>
            <div className="col-6 col-md-auto">
              <label htmlFor="user-role-filter" className="d-block text-muted mb-1" style={{ fontSize: '0.75rem', fontWeight: 500 }}>Role</label>
              <select id="user-role-filter" className="form-select" value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)} style={inputStyle}>
                <option value="">All Roles</option>
                {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{getRoleBadge(r).label}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border" role="status" style={{ width: '2.5rem', height: '2.5rem', color: '#15803D' }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted small">Loading users...</p>
        </div>
      ) : error ? (
        <div className="alert alert-danger border-0 shadow-sm d-flex align-items-center justify-content-between p-4" style={{ borderRadius: '12px' }}>
          <div>
            <div className="fw-bold mb-1">Error loading users</div>
            <div className="small">{error}</div>
          </div>
          <button className="btn btn-danger btn-sm px-3" onClick={fetchUsers}>Retry</button>
        </div>
      ) : users.length === 0 ? (
        <div className="card border-0 shadow-sm text-center py-5" style={{ borderRadius: '12px' }}>
          <h5 className="fw-bold mb-2" style={{ color: '#111827' }}>No Users Found</h5>
          <p className="text-muted small mb-0">No accounts match your search or filter criteria.</p>
        </div>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="d-block d-md-none mb-3">
            {users.map((u) => (
              <div key={u.id} className="card border-0 shadow-sm mb-3 p-3" style={{ borderRadius: '12px' }}>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="fw-bold text-dark">{u.name}</span>
                  <span className="badge" style={{ ...getRoleBadge(u.role).style, borderRadius: '10px' }}>{getRoleBadge(u.role).label}</span>
                </div>
                <div className="text-muted small mb-2">{u.email}</div>
                <div className="d-flex align-items-center justify-content-between">
                  <span className={`badge ${u.isActive ? 'bg-success-subtle text-success-emphasis' : 'bg-secondary-subtle text-secondary-emphasis'}`}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <div className="d-flex gap-2">
                    <button className="btn btn-sm btn-outline-success" onClick={() => openEdit(u)}>Edit</button>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => openReset(u)}>Reset Password</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="card border-0 shadow-sm d-none d-md-block" style={{ borderRadius: '12px', overflow: 'hidden' }}>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th className="py-3 ps-3" style={{ backgroundColor: '#EBF5F0', color: '#166534' }}>Name</th>
                    <th className="py-3 px-2" style={{ backgroundColor: '#EBF5F0', color: '#166534' }}>Email</th>
                    <th className="py-3 px-2" style={{ backgroundColor: '#EBF5F0', color: '#166534' }}>Role</th>
                    <th className="py-3 px-2" style={{ backgroundColor: '#EBF5F0', color: '#166534' }}>Status</th>
                    <th className="py-3 pe-3 text-end" style={{ backgroundColor: '#EBF5F0', color: '#166534' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="ps-3 py-3 fw-semibold">{u.name}</td>
                      <td className="py-3 px-2">{u.email}</td>
                      <td className="py-3 px-2">
                        <span className="badge" style={{ ...getRoleBadge(u.role).style, borderRadius: '10px' }}>{getRoleBadge(u.role).label}</span>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`badge ${u.isActive ? 'bg-success-subtle text-success-emphasis' : 'bg-secondary-subtle text-secondary-emphasis'}`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 pe-3 text-end">
                        <button className="btn btn-sm btn-outline-success me-2" onClick={() => openEdit(u)}>Edit</button>
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => openReset(u)}>Reset Password</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Create / Edit Modal */}
      {(modal?.type === 'create' || modal?.type === 'edit') && (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow" style={{ borderRadius: '12px' }}>
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold">{modal.type === 'create' ? 'Create New User' : 'Edit User'}</h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <form onSubmit={modal.type === 'create' ? handleCreateSubmit : handleEditSubmit}>
                <div className="modal-body p-4">
                  {formError && <div className="alert alert-danger small p-2 mb-3" style={{ borderRadius: '6px' }}>{formError}</div>}

                  <div className="mb-3">
                    <label htmlFor="user-form-name" className="form-label fw-semibold small">Full Name</label>
                    <input id="user-form-name" type="text" className="form-control" value={formName}
                      onChange={(e) => setFormName(e.target.value)} required minLength={2} style={inputStyle} />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="user-form-email" className="form-label fw-semibold small">Email Address</label>
                    <input id="user-form-email" type="email" className="form-control" value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)} required style={inputStyle} />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="user-form-role" className="form-label fw-semibold small">Role</label>
                    <select id="user-form-role" className="form-select" value={formRole}
                      onChange={(e) => setFormRole(e.target.value as AdminUser['role'])} style={inputStyle}>
                      {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{getRoleBadge(r).label}</option>)}
                    </select>
                  </div>

                  <div className="mb-3 form-check form-switch">
                    <input id="user-form-active" className="form-check-input" type="checkbox"
                      checked={formActive} onChange={(e) => setFormActive(e.target.checked)}
                      disabled={modal.type === 'edit' && modal.user.id === currentUser?.id} />
                    <label htmlFor="user-form-active" className="form-check-label small">Active</label>
                    {modal.type === 'edit' && modal.user.id === currentUser?.id && (
                      <div className="form-text extra-small text-warning">You cannot deactivate your own account.</div>
                    )}
                  </div>

                  {modal.type === 'create' && (
                    <div className="mb-1">
                      <label htmlFor="user-form-password" className="form-label fw-semibold small">Initial Password</label>
                      <input id="user-form-password" type="text" className="form-control" value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)} required style={inputStyle} />
                      <div className="form-text extra-small">User must change this password at their next login.</div>
                    </div>
                  )}
                </div>
                <div className="modal-footer border-top bg-light" style={{ borderRadius: '0 0 12px 12px' }}>
                  <button type="button" className="btn btn-secondary btn-sm px-3" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn btn-sm text-white fw-semibold px-4"
                    style={{ backgroundColor: '#15803D' }} disabled={saving}>
                    {saving ? 'Saving...' : 'Save User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {modal?.type === 'reset' && (
        <div className="modal d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow" style={{ borderRadius: '12px' }}>
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold">Reset Password — {modal.user.name}</h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <form onSubmit={handleResetSubmit}>
                <div className="modal-body p-4">
                  {formError && <div className="alert alert-danger small p-2 mb-3" style={{ borderRadius: '6px' }}>{formError}</div>}
                  <label htmlFor="reset-password-input" className="form-label fw-semibold small">New Initial Password</label>
                  <input id="reset-password-input" type="text" className="form-control" value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)} required style={inputStyle} />
                  <div className="form-text extra-small">User must change this password at their next login.</div>
                </div>
                <div className="modal-footer border-top bg-light" style={{ borderRadius: '0 0 12px 12px' }}>
                  <button type="button" className="btn btn-secondary btn-sm px-3" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn btn-sm text-white fw-semibold px-4"
                    style={{ backgroundColor: '#15803D' }} disabled={saving}>
                    {saving ? 'Saving...' : 'Reset Password'}
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

export default UserManagement;
