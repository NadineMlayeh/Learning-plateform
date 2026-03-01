import { useEffect, useState } from 'react';
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
  if (status === 'NONE') return 'gray';
  return 'neutral';
}

function buildQuery(path, params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || String(value).trim() === '') return;
    query.set(key, String(value));
  });

  return `${path}?${query.toString()}`;
}

function formatMoney(value) {
  return `${Number(value || 0).toFixed(2)} EUR`;
}

function Modal({ open, title, onClose, children }) {
  if (!open) return null;

  return (
    <div className="admin-modal-overlay" role="dialog" aria-modal="true">
      <button type="button" className="admin-modal-backdrop" onClick={onClose} aria-label="Close modal" />
      <article className="admin-modal-card">
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

export default function AdminStudentsPage({ pushToast }) {
  const user = getCurrentUser();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ page: 1, totalPages: 1, total: 0, items: [] });
  const [details, setDetails] = useState(null);
  const [editModel, setEditModel] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  async function loadStudents() {
    setLoading(true);
    try {
      const response = await apiRequest(
        buildQuery('/admin/students', { page, pageSize: PAGE_SIZE, search }),
        { token: user.token },
      );
      setData(response);
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function openDetails(studentId) {
    try {
      const response = await apiRequest(`/admin/students/${studentId}`, { token: user.token });
      setDetails(response);
    } catch (err) {
      pushToast(err.message, 'error');
    }
  }

  async function onSaveStudent(event) {
    event.preventDefault();
    if (!editModel) return;

    setSaving(true);
    try {
      await apiRequest(`/admin/students/${editModel.id}`, {
        method: 'PATCH',
        token: user.token,
        body: { name: editModel.name, email: editModel.email },
      });
      pushToast('Student updated successfully.', 'success');
      setEditModel(null);
      await loadStudents();
      if (details?.id === editModel.id) {
        await openDetails(editModel.id);
      }
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function onConfirmDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await apiRequest(`/admin/students/${deleteTarget.id}`, {
        method: 'DELETE',
        token: user.token,
      });
      pushToast('Student deleted successfully.', 'success');
      setDeleteTarget(null);
      setDetails((prev) => (prev?.id === deleteTarget.id ? null : prev));
      await loadStudents();
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadStudents();
  }, [page, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  return (
    <section className="stack admin-skin-page">
      <ProfileSidebar user={user} />

      <div className="card panel-head">
        <div>
          <h1>Student Management</h1>
          <p className="hint">Paginated searchable list with details, update, and safe deletion.</p>
        </div>
        <div className="row">
          <Link className="link-btn small-btn" to="/admin">
            Back to Admin
          </Link>
          <Link className="link-btn small-btn" to="/admin/formateurs">
            Formateurs
          </Link>
          <Link className="link-btn small-btn" to="/admin/formations">
            Formations
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="card-head-row">
          <h2>Students</h2>
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
                <th>Total Enrollments</th>
                <th>Total Paid</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((student) => (
                <tr key={student.id}>
                  <td>{student.id}</td>
                  <td>{student.name}</td>
                  <td>{student.email}</td>
                  <td>
                    <StatusBadge label={student.status} tone={statusTone(student.status)} />
                  </td>
                  <td>{student.totalEnrollments}</td>
                  <td>{formatMoney(student.totalAmountPaid)}</td>
                  <td>
                    <div className="row action-btn-group">
                      <button type="button" className="action-btn action-page" onClick={() => openDetails(student.id)}>
                        Details
                      </button>
                      <button
                        type="button"
                        className="action-btn action-approve"
                        onClick={() => setEditModel({ id: student.id, name: student.name, email: student.email })}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="action-btn action-reject"
                        onClick={() => setDeleteTarget(student)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={7}>{loading ? 'Loading students...' : 'No students found.'}</td>
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

      <Modal open={Boolean(details)} title={`Student #${details?.id || ''}`} onClose={() => setDetails(null)}>
        {details && (
          <div className="stack">
            <div className="admin-metric-grid">
              <article className="admin-metric-card">
                <p className="hint">Full Name</p>
                <strong>{details.name}</strong>
              </article>
              <article className="admin-metric-card">
                <p className="hint">Email</p>
                <strong>{details.email}</strong>
              </article>
              <article className="admin-metric-card">
                <p className="hint">Total Enrollments</p>
                <strong>{details.totalEnrollments}</strong>
              </article>
              <article className="admin-metric-card">
                <p className="hint">Total Paid</p>
                <strong>{formatMoney(details.totalAmountPaid)}</strong>
              </article>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Formation</th>
                    <th>Status</th>
                    <th>Requested</th>
                    <th>Invoice</th>
                  </tr>
                </thead>
                <tbody>
                  {(details.enrollments || []).map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.formation?.title || '-'}</td>
                      <td>
                        <StatusBadge label={entry.status} tone={statusTone(entry.status)} />
                      </td>
                      <td>{new Date(entry.createdAt).toLocaleString()}</td>
                      <td>{entry.invoice ? formatMoney(entry.invoice.amount) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={Boolean(editModel)} title={`Edit Student #${editModel?.id || ''}`} onClose={() => setEditModel(null)}>
        {editModel && (
          <form className="grid" onSubmit={onSaveStudent}>
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
            <div className="row">
              <button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button type="button" className="action-btn action-page" onClick={() => setEditModel(null)}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={Boolean(deleteTarget)} title="Delete Student" onClose={() => setDeleteTarget(null)}>
        <div className="grid">
          <p>Are you sure you want to delete this student? This action cannot be undone.</p>
          <div className="row">
            <button type="button" className="action-btn action-reject" onClick={onConfirmDelete} disabled={saving}>
              {saving ? 'Deleting...' : 'Confirm'}
            </button>
            <button type="button" className="action-btn modal-cancel-btn" onClick={() => setDeleteTarget(null)} disabled={saving}>
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
