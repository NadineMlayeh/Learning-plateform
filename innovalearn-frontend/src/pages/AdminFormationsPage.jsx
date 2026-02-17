import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api';
import { getCurrentUser } from '../auth';
import ProfileSidebar from '../components/ProfileSidebar';
import StatusBadge from '../components/StatusBadge';

const PAGE_SIZE = 6;

function buildQuery(path, params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || String(value).trim() === '') return;
    query.set(key, String(value));
  });

  return `${path}?${query.toString()}`;
}

function money(value) {
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

export default function AdminFormationsPage({ pushToast }) {
  const user = getCurrentUser();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [data, setData] = useState({ page: 1, totalPages: 1, total: 0, items: [] });

  async function loadFormations() {
    setLoading(true);
    try {
      const response = await apiRequest(
        buildQuery('/admin/formations', { page, pageSize: PAGE_SIZE, search }),
        { token: user.token },
      );
      setData(response);
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function deleteFormation() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await apiRequest(`/admin/formations/${deleteTarget.id}`, {
        method: 'DELETE',
        token: user.token,
      });
      pushToast('Formation deleted successfully.', 'success');
      setDeleteTarget(null);
      await loadFormations();
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadFormations();
  }, [page, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  return (
    <section className="stack">
      <ProfileSidebar user={user} />

      <div className="card panel-head">
        <div>
          <h1>Formation Management</h1>
          <p className="hint">Track enrollments, completion rates, revenue, and delete formations safely.</p>
        </div>
        <div className="row">
          <Link className="link-btn small-btn" to="/admin">
            Back to Admin
          </Link>
          <Link className="link-btn small-btn" to="/admin/students">
            Students
          </Link>
          <Link className="link-btn small-btn" to="/admin/formateurs">
            Formateurs
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="card-head-row">
          <h2>Formations</h2>
          <StatusBadge label={`${data.total} total`} tone="blue" />
        </div>

        <div className="table-toolbar">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by formation title"
          />
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Type</th>
                <th>Status</th>
                <th>Formateur</th>
                <th>Students</th>
                <th>Completion</th>
                <th>Revenue</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((formation) => (
                <tr key={formation.id}>
                  <td>{formation.id}</td>
                  <td>
                    {formation.title}
                    <br />
                    <span className="hint">{formation.description || '-'}</span>
                  </td>
                  <td>{formation.type}</td>
                  <td>
                    <StatusBadge label={formation.published ? 'PUBLISHED' : 'DRAFT'} tone={formation.published ? 'green' : 'gray'} />
                  </td>
                  <td>{formation.formateur?.name || '-'}</td>
                  <td>{formation.totalStudentsEnrolled}</td>
                  <td>{Number(formation.completionRate || 0).toFixed(2)}%</td>
                  <td>{money(formation.revenueGenerated)}</td>
                  <td>
                    <button type="button" className="action-btn action-reject" onClick={() => setDeleteTarget(formation)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={9}>{loading ? 'Loading formations...' : 'No formations found.'}</td>
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

      <Modal open={Boolean(deleteTarget)} title="Delete Formation" onClose={() => setDeleteTarget(null)}>
        <div className="grid">
          <p>Are you sure you want to delete this formation? This action cannot be undone.</p>
          <div className="row">
            <button type="button" className="action-btn action-reject" onClick={deleteFormation} disabled={saving}>
              {saving ? 'Deleting...' : 'Confirm'}
            </button>
            <button type="button" className="action-btn action-page" onClick={() => setDeleteTarget(null)} disabled={saving}>
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
