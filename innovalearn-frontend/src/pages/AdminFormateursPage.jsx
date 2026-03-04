import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api';
import { getCurrentUser } from '../auth';
import ProfileSidebar from '../components/ProfileSidebar';
import StatusBadge from '../components/StatusBadge';

const PAGE_SIZE = 6;

function statusTone(status) {
  if (status === 'APPROVED') return 'green';
  if (status === 'PENDING') return 'orange';
  if (status === 'REJECTED') return 'red';
  return 'gray';
}

function money(value) {
  return `${Number(value || 0).toFixed(2)} TND`;
}

function formatDateOfBirth(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
}

function toDateInputValue(value) {
  if (!value) return '';
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildQuery(path, params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || String(value).trim() === '') return;
    query.set(key, String(value));
  });

  return `${path}?${query.toString()}`;
}

function Modal({ open, title, onClose, children, wide = false }) {
  if (!open) return null;

  return (
    <div className="admin-modal-overlay" role="dialog" aria-modal="true">
      <button type="button" className="admin-modal-backdrop" onClick={onClose} aria-label="Close modal" />
      <article className={`admin-modal-card ${wide ? 'is-wide' : ''}`}>
        <div className="admin-modal-head">
          <h2>{title}</h2>
          <button type="button" className="admin-modal-close" onClick={onClose}>
            x
          </button>
        </div>
        <div className="admin-modal-body">{children}</div>
      </article>
    </div>
  );
}

function Donut({ value, label }) {
  const safe = Math.max(0, Math.min(100, Number(value || 0)));
  return (
    <article className="admin-metric-card admin-metric-card-centered">
      <div
        className="admin-donut"
        style={{
          background: `conic-gradient(#1f72df ${safe}%, #d7e7f6 ${safe}% 100%)`,
        }}
      >
        <div className="admin-donut-inner">
          <strong>{safe.toFixed(1)}%</strong>
        </div>
      </div>
      <p className="hint">{label}</p>
    </article>
  );
}

function MiniBars({ title, data, valueKey }) {
  const maxValue = Math.max(1, ...data.map((entry) => Number(entry[valueKey] || 0)));
  return (
    <article className="admin-analytics-card">
      <h3>{title}</h3>
      <div className="admin-mini-bar">
        {(data || []).map((entry) => {
          const value = Number(entry[valueKey] || 0);
          const height = Math.max(6, Math.round((value / maxValue) * 100));
          return (
            <div className="admin-mini-bar-item" key={`${title}-${entry.monthLabel}`}>
              <span className="hint">{entry.monthLabel}</span>
              <div className="admin-mini-bar-track">
                <div className="admin-mini-bar-fill" style={{ height: `${height}%` }} />
              </div>
              <strong>{value.toFixed(2)}</strong>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export default function AdminFormateursPage({ pushToast, embedded = false }) {
  const user = getCurrentUser();
  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => Array.from({ length: 5 }, (_, i) => currentYear - i), [currentYear]);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ page: 1, totalPages: 1, total: 0, items: [] });
  const [details, setDetails] = useState(null);
  const [editModel, setEditModel] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [suspendTarget, setSuspendTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [suspendingId, setSuspendingId] = useState(null);
  const [analytics, setAnalytics] = useState({
    open: false,
    loading: false,
    formateurId: null,
    year: currentYear,
    data: null,
  });

  async function loadFormateurs() {
    setLoading(true);
    try {
      const response = await apiRequest(
        buildQuery('/admin/formateurs', { page, pageSize: PAGE_SIZE, search }),
        { token: user.token },
      );
      setData(response);
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function openDetails(formateurId) {
    try {
      const response = await apiRequest(`/admin/formateurs/${formateurId}`, { token: user.token });
      setDetails(response);
    } catch (err) {
      pushToast(err.message, 'error');
    }
  }

  async function saveFormateur(event) {
    event.preventDefault();
    if (!editModel) return;

    setSaving(true);
    try {
      await apiRequest(`/admin/formateurs/${editModel.id}`, {
        method: 'PATCH',
        token: user.token,
        body: {
          name: editModel.name,
          email: editModel.email,
          phoneNumber: editModel.phoneNumber,
          dateOfBirth: editModel.dateOfBirth || null,
        },
      });
      pushToast('Formateur updated successfully.', 'success');
      setEditModel(null);
      await loadFormateurs();
      if (details?.id === editModel.id) {
        await openDetails(editModel.id);
      }
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function deleteFormateur() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await apiRequest(`/admin/formateurs/${deleteTarget.id}`, {
        method: 'DELETE',
        token: user.token,
      });
      pushToast('Formateur deleted successfully.', 'success');
      setDeleteTarget(null);
      setDetails((prev) => (prev?.id === deleteTarget.id ? null : prev));
      await loadFormateurs();
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function toggleFormateurSuspend(target) {
    if (!target) return;
    const action = target.isSuspended ? 'unsuspend' : 'suspend';
    setSuspendingId(target.id);
    try {
      await apiRequest(`/admin/formateurs/${target.id}/${action}`, {
        method: 'PATCH',
        token: user.token,
      });
      pushToast(
        action === 'suspend'
          ? 'Formateur account suspended.'
          : 'Formateur account unsuspended.',
        'success',
      );
      setSuspendTarget(null);
      await loadFormateurs();
      if (details?.id === target.id) {
        await openDetails(target.id);
      }
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setSuspendingId((prev) => (prev === target.id ? null : prev));
    }
  }

  async function openAnalytics(formateurId, year = analytics.year) {
    setAnalytics((prev) => ({
      ...prev,
      open: true,
      loading: true,
      formateurId,
      year,
    }));

    try {
      const response = await apiRequest(
        buildQuery(`/admin/formateurs/${formateurId}/analytics`, { year }),
        { token: user.token },
      );
      setAnalytics((prev) => ({ ...prev, loading: false, data: response }));
    } catch (err) {
      setAnalytics((prev) => ({ ...prev, loading: false }));
      pushToast(err.message, 'error');
    }
  }

  useEffect(() => {
    loadFormateurs();
  }, [page, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  return (
    <section className={embedded ? 'stack admin-skin-page admin-embedded-content' : 'stack admin-skin-page'}>
      {!embedded && <ProfileSidebar user={user} />}

      {!embedded && (
      <div className="card panel-head">
        <div>
          <h1>Formateur Management</h1>
          <p className="hint">Manage formateurs, approvals, profile updates, analytics, and controlled deletion.</p>
        </div>
        <div className="row">
          <Link className="link-btn small-btn" to="/admin">
            Back to Admin
          </Link>
          <Link className="link-btn small-btn" to="/admin/students">
            Students
          </Link>
          <Link className="link-btn small-btn" to="/admin/formations">
            Formations
          </Link>
        </div>
      </div>
      )}

      <div className={embedded ? 'card admin-saas-section' : 'card'}>
        <div className="card-head-row">
          <h2>Formateurs</h2>
          <StatusBadge label={`${data.total} total`} tone="blue" />
        </div>

        <div className="table-toolbar">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or email"
          />
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.id}</td>
                  <td>{entry.name}</td>
                  <td>{entry.email}</td>
                  <td>
                    <StatusBadge label={entry.status} tone={statusTone(entry.status)} />
                  </td>
                  <td>
                    <div className="row action-btn-group">
                      <button type="button" className="action-btn action-page" onClick={() => openDetails(entry.id)}>
                        Details
                      </button>
                      <button
                        type="button"
                        className="action-btn action-analytics"
                        onClick={() => openAnalytics(entry.id)}
                      >
                        Analytics
                      </button>
                      <button
                        type="button"
                        className="action-btn action-approve"
                        onClick={() =>
                          setEditModel({
                            id: entry.id,
                            name: entry.name,
                            email: entry.email,
                            phoneNumber: entry.phoneNumber || '',
                            dateOfBirth: toDateInputValue(entry.dateOfBirth),
                          })
                        }
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className={`action-btn action-suspend ${
                          entry.isSuspended ? 'is-unsuspend' : ''
                        }`}
                        onClick={() =>
                          setSuspendTarget({
                            id: entry.id,
                            name: entry.name,
                            isSuspended: Boolean(entry.isSuspended),
                          })
                        }
                        disabled={suspendingId === entry.id}
                      >
                        {suspendingId === entry.id
                          ? 'Working...'
                          : entry.isSuspended
                            ? 'Unsuspend'
                            : 'Suspend'}
                      </button>
                      <button
                        type="button"
                        className="action-btn admin-square-trash-btn"
                        aria-label={`Delete formateur ${entry.name}`}
                        title="Delete"
                        onClick={() => setDeleteTarget(entry)}
                      >
                        <img src="/images/trash.png" alt="" className="admin-square-trash-icon" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={5}>{loading ? 'Loading formateurs...' : 'No formateurs found.'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar">
          <button
            type="button"
            className="action-btn action-page"
            disabled={page <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            Prev
          </button>
          <span>
            Page {data.page} / {data.totalPages}
          </span>
          <button
            type="button"
            className="action-btn action-page"
            disabled={page >= data.totalPages}
            onClick={() => setPage((prev) => Math.min(data.totalPages, prev + 1))}
          >
            Next
          </button>
        </div>
      </div>

      <Modal open={Boolean(details)} title={`Formateur #${details?.id || ''}`} onClose={() => setDetails(null)}>
        {details && (
          <div className="stack">
            <div className="admin-metric-grid admin-user-detail-cards">
              <article className="admin-metric-card">
                <p className="hint">Name</p>
                <strong>{details.name}</strong>
              </article>
              <article className="admin-metric-card">
                <p className="hint">Email</p>
                <strong>{details.email}</strong>
              </article>
              <article className="admin-metric-card">
                <p className="hint">Phone Number</p>
                <strong>{details.phoneNumber || '-'}</strong>
              </article>
              <article className="admin-metric-card">
                <p className="hint">Date of Birth</p>
                <strong>{formatDateOfBirth(details.dateOfBirth)}</strong>
              </article>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Formation ID</th>
                    <th>Formation Name</th>
                    <th>Price</th>
                    <th>Type</th>
                    <th>Enrollments</th>
                    <th>Success Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {(details.formations || []).map((formation) => (
                    <tr key={formation.id}>
                      <td>{formation.id}</td>
                      <td>{formation.title}</td>
                      <td>{money(formation.price)}</td>
                      <td>{formation.type}</td>
                      <td>{formation.enrollmentsCount ?? 0}</td>
                      <td>{Number(formation.successRate || 0).toFixed(2)}%</td>
                    </tr>
                  ))}
                  {(details.formations || []).length === 0 && (
                    <tr>
                      <td colSpan={6}>No formations found for this formateur.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(suspendTarget)}
        title={suspendTarget?.isSuspended ? 'Unsuspend Formateur' : 'Suspend Formateur'}
        onClose={() => setSuspendTarget(null)}
      >
        <div className="grid">
          <p>
            Are you sure you want to{' '}
            {suspendTarget?.isSuspended ? 'unsuspend' : 'suspend'} this
            formateur?
          </p>
          <div className="row">
            <button
              type="button"
              className="action-btn action-reject"
              onClick={() => toggleFormateurSuspend(suspendTarget)}
              disabled={!suspendTarget || suspendingId === suspendTarget.id}
            >
              {suspendTarget && suspendingId === suspendTarget.id
                ? 'Working...'
                : 'Confirm'}
            </button>
            <button
              type="button"
              className="action-btn modal-cancel-btn"
              onClick={() => setSuspendTarget(null)}
              disabled={suspendTarget && suspendingId === suspendTarget.id}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={Boolean(editModel)} title={`Edit Formateur #${editModel?.id || ''}`} onClose={() => setEditModel(null)}>
        {editModel && (
          <form className="grid" onSubmit={saveFormateur}>
            <label className="grid">
              <span>Name</span>
              <input
                type="text"
                value={editModel.name}
                onChange={(event) => setEditModel((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
            </label>
            <label className="grid">
              <span>Email</span>
              <input
                type="email"
                value={editModel.email}
                onChange={(event) => setEditModel((prev) => ({ ...prev, email: event.target.value }))}
                required
              />
            </label>
            <label className="grid">
              <span>Phone Number</span>
              <input
                type="text"
                value={editModel.phoneNumber || ''}
                onChange={(event) =>
                  setEditModel((prev) => ({ ...prev, phoneNumber: event.target.value }))
                }
              />
            </label>
            <label className="grid">
              <span>Date of Birth</span>
              <input
                type="date"
                value={editModel.dateOfBirth || ''}
                onChange={(event) =>
                  setEditModel((prev) => ({ ...prev, dateOfBirth: event.target.value }))
                }
              />
            </label>
            <div className="row">
              <button
                type="submit"
                className="action-btn admin-student-edit-save"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                className="action-btn admin-student-edit-cancel"
                onClick={() => setEditModel(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={Boolean(deleteTarget)} title="Delete Formateur" onClose={() => setDeleteTarget(null)}>
        <div className="grid">
          <p>Are you sure you want to delete this formateur? This action cannot be undone.</p>
          <div className="row">
            <button type="button" className="action-btn action-reject" onClick={deleteFormateur} disabled={saving}>
              {saving ? 'Deleting...' : 'Confirm'}
            </button>
            <button type="button" className="action-btn modal-cancel-btn" onClick={() => setDeleteTarget(null)} disabled={saving}>
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={analytics.open}
        title="Formateur Analytics"
        onClose={() => setAnalytics((prev) => ({ ...prev, open: false, data: null, formateurId: null }))}
        wide
      >
        <div className="stack">
          <div className="table-toolbar">
            <select
              value={analytics.year}
              onChange={(event) => {
                const selectedYear = Number(event.target.value);
                setAnalytics((prev) => ({ ...prev, year: selectedYear }));
                if (analytics.formateurId) {
                  openAnalytics(analytics.formateurId, selectedYear);
                }
              }}
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {analytics.loading && <p className="hint">Loading analytics...</p>}

          {analytics.data && (
            <>
              <div className="admin-metric-grid">
                <article className="admin-metric-card">
                  <p className="hint">Number of Formations</p>
                  <strong>{analytics.data.numberOfFormations}</strong>
                </article>
                <article className="admin-metric-card">
                  <p className="hint">Total Students Enrolled</p>
                  <strong>{analytics.data.totalStudentsEnrolled}</strong>
                </article>
                <article className="admin-metric-card">
                  <p className="hint">Total Revenue Generated</p>
                  <strong>{money(analytics.data.totalRevenueGenerated)}</strong>
                </article>
                <Donut value={analytics.data.completionRate} label="Completion Rate" />
              </div>

              <div className="admin-analytics-grid">
                <MiniBars title="Monthly Revenue" data={analytics.data.monthlyRevenue || []} valueKey="revenue" />
                <MiniBars title="Monthly Enrollments" data={analytics.data.monthlyEnrollments || []} valueKey="enrollments" />
              </div>
            </>
          )}
        </div>
      </Modal>
    </section>
  );
}
