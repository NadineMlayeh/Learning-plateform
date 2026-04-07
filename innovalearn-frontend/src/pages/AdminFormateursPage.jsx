import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, resolveApiAssetUrl } from '../api';
import { getCurrentUser } from '../auth';
import ProfileSidebar from '../components/ProfileSidebar';
import StatusBadge from '../components/StatusBadge';
import { useTranslation } from 'react-i18next';

const PAGE_SIZE = 6;
const DETAILS_TABLE_PAGE_SIZE = 4;

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
  const { t } = useTranslation();
  const user = getCurrentUser();
  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => Array.from({ length: 5 }, (_, i) => currentYear - i), [currentYear]);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ page: 1, totalPages: 1, total: 0, items: [] });
  const [details, setDetails] = useState(null);
  const [detailsFormationSearch, setDetailsFormationSearch] = useState('');
  const [detailsFormationPage, setDetailsFormationPage] = useState(1);
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
      setDetailsFormationSearch('');
      setDetailsFormationPage(1);
      setDetails(response);
    } catch (err) {
      pushToast(err.message, 'error');
    }
  }

  const filteredDetailsFormations = useMemo(() => {
    const rows = details?.formations || [];
    const query = detailsFormationSearch.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((formation) =>
      (formation.title || '').toLowerCase().includes(query),
    );
  }, [details, detailsFormationSearch]);

  const detailsFormationTotalPages = Math.max(
    1,
    Math.ceil(filteredDetailsFormations.length / DETAILS_TABLE_PAGE_SIZE),
  );
  const detailsFormationRows = filteredDetailsFormations.slice(
    (detailsFormationPage - 1) * DETAILS_TABLE_PAGE_SIZE,
    detailsFormationPage * DETAILS_TABLE_PAGE_SIZE,
  );

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
      pushToast(t('admin.formateursPage.updateSuccess'), 'success');
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
      pushToast(t('admin.formateursPage.deleteSuccess'), 'success');
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
          ? t('admin.formateursPage.suspendSuccess')
          : t('admin.formateursPage.unsuspendSuccess'),
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

  useEffect(() => {
    setDetailsFormationPage(1);
  }, [detailsFormationSearch, details?.id]);

  useEffect(() => {
    if (detailsFormationPage > detailsFormationTotalPages) {
      setDetailsFormationPage(detailsFormationTotalPages);
    }
  }, [detailsFormationPage, detailsFormationTotalPages]);

  return (
    <section className={embedded ? 'stack admin-skin-page admin-embedded-content' : 'stack admin-skin-page'}>
      {!embedded && <ProfileSidebar user={user} />}

      {!embedded && (
      <div className="card panel-head">
        <div>
          <h1>{t('admin.formateursPage.title')}</h1>
          <p className="hint">{t('admin.formateursPage.subtitle')}</p>
        </div>
        <div className="row">
          <Link className="link-btn small-btn" to="/admin">
            {t('admin.formationsPage.backToAdmin')}
          </Link>
          <Link className="link-btn small-btn" to="/admin/students">
            {t('admin.formateursPage.studentsBtn')}
          </Link>
          <Link className="link-btn small-btn" to="/admin/formations">
            {t('admin.formateursPage.formationsBtn')}
          </Link>
        </div>
      </div>
      )}

      <div className={embedded ? 'card admin-saas-section' : 'card'}>
        <div className="card-head-row">
          <h2>{t('admin.formateursPage.formateurs')}</h2>
          <StatusBadge label={t('admin.formationsPage.totalCount', { total: data.total })} tone="blue" />
        </div>

        <div className="table-toolbar">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('admin.formateursPage.searchFormateur')}
          />
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('admin.tables.id')}</th>
                <th>{t('admin.formateursPage.name')}</th>
                <th>{t('admin.formateursPage.email')}</th>
                <th>{t('admin.tables.status')}</th>
                <th>{t('admin.tables.action')}</th>
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
                        {t('admin.formateursPage.detailsBtn')}
                      </button>
                      <button
                        type="button"
                        className="action-btn action-analytics"
                        onClick={() => openAnalytics(entry.id)}
                      >
                        {t('admin.formateursPage.analyticsBtn')}
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
                        {t('admin.formateursPage.editBtn')}
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
                          ? t('admin.formateursPage.working')
                          : entry.isSuspended
                            ? t('admin.formateursPage.unsuspend')
                            : t('admin.formateursPage.suspend')}
                      </button>
                      <button
                        type="button"
                        className="action-btn admin-square-trash-btn"
                        aria-label={t('admin.formateursPage.deleteFormateur')}
                        title={t('admin.formateursPage.deleteFormateur')}
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
                  <td colSpan={5}>{loading ? t('admin.formateursPage.loadingFormateurs') : t('admin.formateursPage.noFormateursFound')}</td>
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
            {t('admin.pagination.prev')}
          </button>
          <span>
            {t('admin.pagination.page', { current: data.page, total: data.totalPages })}
          </span>
          <button
            type="button"
            className="action-btn action-page"
            disabled={page >= data.totalPages}
            onClick={() => setPage((prev) => Math.min(data.totalPages, prev + 1))}
          >
            {t('admin.pagination.next')}
          </button>
        </div>
      </div>

      <Modal open={Boolean(details)} title={t('admin.formateursPage.formateurModalTitle', { id: details?.id || '' })} onClose={() => setDetails(null)}>
        {details && (
          <div className="stack">
            <div className="admin-user-detail-identity">
              <div className="admin-user-detail-avatar">
                <img
                  src={resolveApiAssetUrl(details.profileImageUrl) || '/images/student.png'}
                  alt={details.name || 'Formateur'}
                />
              </div>
              <div className="admin-user-detail-text">
                <strong>{details.name}</strong>
                <p className="hint">{details.email}</p>
              </div>
            </div>
            <div className="admin-metric-grid admin-user-detail-cards">
              <article className="admin-metric-card">
                <p className="hint">{t('admin.formateursPage.phoneNumber')}</p>
                <strong>{details.phoneNumber || '-'}</strong>
              </article>
              <article className="admin-metric-card">
                <p className="hint">{t('admin.formateursPage.dateOfBirth')}</p>
                <strong>{formatDateOfBirth(details.dateOfBirth)}</strong>
              </article>
            </div>
            <div className="table-wrap">
              <div className="table-toolbar admin-details-table-toolbar">
                <input
                  type="text"
                  value={detailsFormationSearch}
                  onChange={(event) => setDetailsFormationSearch(event.target.value)}
                  placeholder={t('admin.formateursPage.searchFormation')}
                />
              </div>
              <table>
                <thead>
                  <tr>
                    <th>{t('admin.formateursPage.formationId')}</th>
                    <th>{t('admin.formateursPage.formationName')}</th>
                    <th>{t('admin.formateursPage.price')}</th>
                    <th>{t('admin.formateursPage.type')}</th>
                    <th>{t('admin.formateursPage.enrollments')}</th>
                    <th>{t('admin.formateursPage.successRate')}</th>
                  </tr>
                </thead>
                <tbody>
                  {detailsFormationRows.map((formation) => (
                    <tr key={formation.id}>
                      <td>{formation.id}</td>
                      <td>{formation.title}</td>
                      <td>{money(formation.price)}</td>
                      <td>{formation.type}</td>
                      <td>{formation.enrollmentsCount ?? 0}</td>
                      <td>{Number(formation.successRate || 0).toFixed(2)}%</td>
                    </tr>
                  ))}
                  {detailsFormationRows.length === 0 && (
                    <tr>
                      <td colSpan={6}>{t('admin.formateursPage.noFormationsFound')}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="pagination-bar admin-details-pagination">
              <button
                type="button"
                className="action-btn action-page"
                onClick={() =>
                  setDetailsFormationPage((prev) => Math.max(1, prev - 1))
                }
                disabled={detailsFormationPage === 1}
              >
                {t('admin.pagination.prev')}
              </button>
              <span>
                {t('admin.pagination.page', { current: detailsFormationPage, total: detailsFormationTotalPages })}
              </span>
              <button
                type="button"
                className="action-btn action-page"
                onClick={() =>
                  setDetailsFormationPage((prev) =>
                    Math.min(detailsFormationTotalPages, prev + 1),
                  )
                }
                disabled={detailsFormationPage === detailsFormationTotalPages}
              >
                {t('admin.pagination.next')}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(suspendTarget)}
        title={suspendTarget?.isSuspended ? t('admin.formateursPage.unsuspendModalTitle') : t('admin.formateursPage.suspendModalTitle')}
        onClose={() => setSuspendTarget(null)}
      >
        <div className="grid">
          <p>
            {suspendTarget?.isSuspended ? t('admin.formateursPage.confirmUnsuspend') : t('admin.formateursPage.confirmSuspend')}
          </p>
          <div className="row">
            <button
              type="button"
              className="action-btn action-reject"
              onClick={() => toggleFormateurSuspend(suspendTarget)}
              disabled={!suspendTarget || suspendingId === suspendTarget.id}
            >
              {suspendTarget && suspendingId === suspendTarget.id
                ? t('admin.formateursPage.working')
                : t('admin.formationsPage.confirmBtn')}
            </button>
            <button
              type="button"
              className="action-btn modal-cancel-btn"
              onClick={() => setSuspendTarget(null)}
              disabled={suspendTarget && suspendingId === suspendTarget.id}
            >
              {t('admin.formationsPage.cancelBtn')}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={Boolean(editModel)} title={t('admin.formateursPage.editModalTitle', { id: editModel?.id || '' })} onClose={() => setEditModel(null)}>
        {editModel && (
          <form className="grid" onSubmit={saveFormateur}>
            <label className="grid">
              <span>{t('admin.formateursPage.name')}</span>
              <input
                type="text"
                value={editModel.name}
                onChange={(event) => setEditModel((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
            </label>
            <label className="grid">
              <span>{t('admin.formateursPage.email')}</span>
              <input
                type="email"
                value={editModel.email}
                onChange={(event) => setEditModel((prev) => ({ ...prev, email: event.target.value }))}
                required
              />
            </label>
            <label className="grid">
              <span>{t('admin.formateursPage.phoneNumber')}</span>
              <input
                type="text"
                value={editModel.phoneNumber || ''}
                onChange={(event) =>
                  setEditModel((prev) => ({ ...prev, phoneNumber: event.target.value }))
                }
              />
            </label>
            <label className="grid">
              <span>{t('admin.formateursPage.dateOfBirth')}</span>
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
                {saving ? t('admin.formationsPage.saving') : t('admin.formationsPage.saveBtn')}
              </button>
              <button
                type="button"
                className="action-btn admin-student-edit-cancel"
                onClick={() => setEditModel(null)}
              >
                {t('admin.formationsPage.cancelBtn')}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={Boolean(deleteTarget)} title={t('admin.formateursPage.deleteModalTitle')} onClose={() => setDeleteTarget(null)}>
        <div className="grid">
          <p>{t('admin.formateursPage.confirmDeleteFormateur')}</p>
          <div className="row">
            <button type="button" className="action-btn action-reject" onClick={deleteFormateur} disabled={saving}>
              {saving ? t('admin.formationsPage.deleting') : t('admin.formationsPage.confirmBtn')}
            </button>
            <button type="button" className="action-btn modal-cancel-btn" onClick={() => setDeleteTarget(null)} disabled={saving}>
              {t('admin.formationsPage.cancelBtn')}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={analytics.open}
        title={t('admin.formateursPage.analyticsModalTitle')}
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

          {analytics.loading && <p className="hint">{t('admin.formateursPage.loadingAnalytics')}</p>}

          {analytics.data && (
            <>
              <div className="admin-metric-grid">
                <article className="admin-metric-card">
                  <p className="hint">{t('admin.formateursPage.numberOfFormations')}</p>
                  <strong>{analytics.data.numberOfFormations}</strong>
                </article>
                <article className="admin-metric-card">
                  <p className="hint">{t('admin.formateursPage.totalStudentsEnrolled')}</p>
                  <strong>{analytics.data.totalStudentsEnrolled}</strong>
                </article>
                <article className="admin-metric-card">
                  <p className="hint">{t('admin.formateursPage.totalRevenueGenerated')}</p>
                  <strong>{money(analytics.data.totalRevenueGenerated)}</strong>
                </article>
                <Donut value={analytics.data.completionRate} label={t('admin.formateursPage.completionRate')} />
              </div>

              <div className="admin-analytics-grid">
                <MiniBars title={t('admin.formateursPage.monthlyRevenue')} data={analytics.data.monthlyRevenue || []} valueKey="revenue" />
                <MiniBars title={t('admin.formateursPage.monthlyEnrollments')} data={analytics.data.monthlyEnrollments || []} valueKey="enrollments" />
              </div>
            </>
          )}
        </div>
      </Modal>
    </section>
  );
}
