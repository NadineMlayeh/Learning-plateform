import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, resolveApiAssetUrl } from '../api';
import { getCurrentUser } from '../auth';
import ProfileSidebar from '../components/ProfileSidebar';
import StatusBadge from '../components/StatusBadge';
import { useTranslation } from 'react-i18next';
import { getErrorTranslationKey } from '../errorTranslations';

const PAGE_SIZE = 6;
const DETAILS_TABLE_PAGE_SIZE = 4;

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

export default function AdminStudentsPage({ pushToast, embedded = false }) {
  const { t } = useTranslation();
  const user = getCurrentUser();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ page: 1, totalPages: 1, total: 0, items: [] });
  const [details, setDetails] = useState(null);
  const [detailsEnrollmentSearch, setDetailsEnrollmentSearch] = useState('');
  const [detailsEnrollmentPage, setDetailsEnrollmentPage] = useState(1);
  const [editModel, setEditModel] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [suspendTarget, setSuspendTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [suspendingId, setSuspendingId] = useState(null);

  async function loadStudents() {
    setLoading(true);
    try {
      const response = await apiRequest(
        buildQuery('/admin/students', { page, pageSize: PAGE_SIZE, search }),
        { token: user.token },
      );
      setData(response);
    } catch (err) {
      const errorKey = getErrorTranslationKey(err.message);
      pushToast(errorKey ? t(`formateur.manage.errors.${errorKey}`) : err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function openDetails(studentId) {
    try {
      const response = await apiRequest(`/admin/students/${studentId}`, { token: user.token });
      setDetailsEnrollmentSearch('');
      setDetailsEnrollmentPage(1);
      setDetails(response);
    } catch (err) {
      const errorKey = getErrorTranslationKey(err.message);
      pushToast(errorKey ? t(`formateur.manage.errors.${errorKey}`) : err.message, 'error');
    }
  }

  const filteredDetailsEnrollments = useMemo(() => {
    const rows = details?.enrollments || [];
    const query = detailsEnrollmentSearch.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((entry) =>
      (entry.formation?.title || '').toLowerCase().includes(query),
    );
  }, [details, detailsEnrollmentSearch]);

  const detailsEnrollmentTotalPages = Math.max(
    1,
    Math.ceil(filteredDetailsEnrollments.length / DETAILS_TABLE_PAGE_SIZE),
  );
  const detailsEnrollmentRows = filteredDetailsEnrollments.slice(
    (detailsEnrollmentPage - 1) * DETAILS_TABLE_PAGE_SIZE,
    detailsEnrollmentPage * DETAILS_TABLE_PAGE_SIZE,
  );

  async function onSaveStudent(event) {
    event.preventDefault();
    if (!editModel) return;

    setSaving(true);
    try {
      await apiRequest(`/admin/students/${editModel.id}`, {
        method: 'PATCH',
        token: user.token,
        body: {
          name: editModel.name,
          email: editModel.email,
          phoneNumber: editModel.phoneNumber,
          dateOfBirth: editModel.dateOfBirth || null,
        },
      });
      pushToast(t('admin.studentsPage.updateSuccess'), 'success');
      setEditModel(null);
      await loadStudents();
      if (details?.id === editModel.id) {
        await openDetails(editModel.id);
      }
    } catch (err) {
      const errorKey = getErrorTranslationKey(err.message);
      pushToast(errorKey ? t(`formateur.manage.errors.${errorKey}`) : err.message, 'error');
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
      pushToast(t('admin.studentsPage.deleteSuccess'), 'success');
      setDeleteTarget(null);
      setDetails((prev) => (prev?.id === deleteTarget.id ? null : prev));
      await loadStudents();
    } catch (err) {
      const errorKey = getErrorTranslationKey(err.message);
      pushToast(errorKey ? t(`formateur.manage.errors.${errorKey}`) : err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStudentSuspend(target) {
    if (!target) return;
    const action = target.isSuspended ? 'unsuspend' : 'suspend';
    setSuspendingId(target.id);
    try {
      await apiRequest(`/admin/students/${target.id}/${action}`, {
        method: 'PATCH',
        token: user.token,
      });
      pushToast(
        action === 'suspend'
          ? t('admin.studentsPage.suspendSuccess')
          : t('admin.studentsPage.unsuspendSuccess'),
        'success',
      );
      setSuspendTarget(null);
      await loadStudents();
      if (details?.id === target.id) {
        await openDetails(target.id);
      }
    } catch (err) {
      const errorKey = getErrorTranslationKey(err.message);
      pushToast(errorKey ? t(`formateur.manage.errors.${errorKey}`) : err.message, 'error');
    } finally {
      setSuspendingId((prev) => (prev === target.id ? null : prev));
    }
  }

  useEffect(() => {
    loadStudents();
  }, [page, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    setDetailsEnrollmentPage(1);
  }, [detailsEnrollmentSearch, details?.id]);

  useEffect(() => {
    if (detailsEnrollmentPage > detailsEnrollmentTotalPages) {
      setDetailsEnrollmentPage(detailsEnrollmentTotalPages);
    }
  }, [detailsEnrollmentPage, detailsEnrollmentTotalPages]);

  return (
    <section className={embedded ? 'stack admin-skin-page admin-embedded-content' : 'stack admin-skin-page'}>
      {!embedded && <ProfileSidebar user={user} />}

      {!embedded && (
      <div className="card panel-head">
        <div>
          <h1>{t('admin.studentsPage.title')}</h1>
          <p className="hint">{t('admin.studentsPage.subtitle')}</p>
        </div>
        <div className="row">
          <Link className="link-btn small-btn" to="/admin">
            {t('admin.formationsPage.backToAdmin')}
          </Link>
          <Link className="link-btn small-btn" to="/admin/formateurs">
            {t('admin.formationsPage.formateursBtn')}
          </Link>
          <Link className="link-btn small-btn" to="/admin/formations">
            {t('admin.studentsPage.formationsBtn')}
          </Link>
        </div>
      </div>
      )}

      <div className={embedded ? 'card admin-saas-section' : 'card'}>
        <div className="card-head-row">
          <h2>{t('admin.studentsPage.students')}</h2>
          <StatusBadge label={t('admin.formationsPage.totalCount', { total: data.total })} tone="blue" />
        </div>
        <div className="table-toolbar">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('admin.studentsPage.searchStudent')}
          />
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('admin.tables.id')}</th>
                <th>{t('admin.studentsPage.name')}</th>
                <th>{t('admin.studentsPage.email')}</th>
                <th>{t('admin.studentsPage.phoneNumber')}</th>
                <th>{t('admin.tables.action')}</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((student) => (
                <tr key={student.id}>
                  <td>{student.id}</td>
                  <td>{student.name}</td>
                  <td>{student.email}</td>
                  <td>{student.phoneNumber || '-'}</td>
                  <td>
                    <div className="row action-btn-group">
                      <button type="button" className="action-btn action-page" onClick={() => openDetails(student.id)}>
                        {t('admin.formationsPage.detailsBtn')}
                      </button>
                      <button
                        type="button"
                        className="action-btn action-approve"
                        onClick={() =>
                          setEditModel({
                            id: student.id,
                            name: student.name || '',
                            email: student.email || '',
                            phoneNumber: student.phoneNumber || '',
                            dateOfBirth: toDateInputValue(student.dateOfBirth),
                          })
                        }
                      >
                        {t('admin.formationsPage.editBtn')}
                      </button>
                      <button
                        type="button"
                        className={`action-btn action-suspend ${
                          student.isSuspended ? 'is-unsuspend' : ''
                        }`}
                        onClick={() =>
                          setSuspendTarget({
                            id: student.id,
                            name: student.name,
                            isSuspended: Boolean(student.isSuspended),
                          })
                        }
                        disabled={suspendingId === student.id}
                      >
                        {suspendingId === student.id
                          ? t('admin.studentsPage.working')
                          : student.isSuspended
                            ? t('admin.studentsPage.unsuspend')
                            : t('admin.studentsPage.suspend')}
                      </button>
                      <button
                        type="button"
                        className="action-btn admin-square-trash-btn"
                        aria-label={t('admin.dashboard.deleteContent')}
                        title={t('admin.dashboard.deleteContent')}
                        onClick={() => setDeleteTarget(student)}
                      >
                        <img src="/images/trash.png" alt="" className="admin-square-trash-icon" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={5}>{loading ? t('admin.studentsPage.loadingStudents') : t('admin.studentsPage.noStudentsFound')}</td>
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

      <Modal open={Boolean(details)} title={t('admin.studentsPage.studentModalTitle', { id: details?.id || '' })} onClose={() => setDetails(null)}>
        {details && (
          <div className="stack">
            <div className="admin-user-detail-identity">
              <div className="admin-user-detail-avatar">
                <img
                  src={resolveApiAssetUrl(details.profileImageUrl) || '/images/student.png'}
                  alt={details.name || 'Student'}
                />
              </div>
              <div className="admin-user-detail-text">
                <strong>{details.name}</strong>
                <p className="hint">{details.email}</p>
              </div>
            </div>
            <div className="admin-metric-grid admin-user-detail-cards">
              <article className="admin-metric-card">
                <p className="hint">{t('admin.studentsPage.phoneNumber')}</p>
                <strong>{details.phoneNumber || '-'}</strong>
              </article>
              <article className="admin-metric-card">
                <p className="hint">{t('admin.studentsPage.dateOfBirth')}</p>
                <strong>{formatDateOfBirth(details.dateOfBirth)}</strong>
              </article>
              <article className="admin-metric-card">
                <p className="hint">{t('admin.studentsPage.totalEnrollments')}</p>
                <strong>{details.totalEnrollments}</strong>
              </article>
              <article className="admin-metric-card">
                <p className="hint">{t('admin.studentsPage.totalPaid')}</p>
                <strong>{formatMoney(details.totalAmountPaid)}</strong>
              </article>
            </div>
            <div className="table-wrap">
              <div className="table-toolbar admin-details-table-toolbar">
                <input
                  type="text"
                  value={detailsEnrollmentSearch}
                  onChange={(event) => setDetailsEnrollmentSearch(event.target.value)}
                  placeholder={t('admin.studentsPage.searchFormation')}
                />
              </div>
              <table>
                <thead>
                  <tr>
                    <th>{t('admin.studentsPage.formation')}</th>
                    <th>{t('admin.studentsPage.status')}</th>
                    <th>{t('admin.studentsPage.requested')}</th>
                    <th>{t('admin.studentsPage.invoice')}</th>
                  </tr>
                </thead>
                <tbody>
                  {detailsEnrollmentRows.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.formation?.title || '-'}</td>
                      <td>
                        <StatusBadge label={entry.status} tone={statusTone(entry.status)} />
                      </td>
                      <td>{new Date(entry.createdAt).toLocaleString()}</td>
                      <td>{entry.invoice ? formatMoney(entry.invoice.amount) : '-'}</td>
                    </tr>
                  ))}
                  {detailsEnrollmentRows.length === 0 && (
                    <tr>
                      <td colSpan={4}>{t('admin.studentsPage.noFormationsFound')}</td>
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
                  setDetailsEnrollmentPage((prev) => Math.max(1, prev - 1))
                }
                disabled={detailsEnrollmentPage === 1}
              >
                {t('admin.pagination.prev')}
              </button>
              <span>
                {t('admin.pagination.page', { current: detailsEnrollmentPage, total: detailsEnrollmentTotalPages })}
              </span>
              <button
                type="button"
                className="action-btn action-page"
                onClick={() =>
                  setDetailsEnrollmentPage((prev) =>
                    Math.min(detailsEnrollmentTotalPages, prev + 1),
                  )
                }
                disabled={detailsEnrollmentPage === detailsEnrollmentTotalPages}
              >
                {t('admin.pagination.next')}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(suspendTarget)}
        title={suspendTarget?.isSuspended ? t('admin.studentsPage.unsuspendModalTitle') : t('admin.studentsPage.suspendModalTitle')}
        onClose={() => setSuspendTarget(null)}
      >
        <div className="grid">
          <p>
            {suspendTarget?.isSuspended ? t('admin.studentsPage.confirmUnsuspend') : t('admin.studentsPage.confirmSuspend')}
          </p>
          <div className="row">
            <button
              type="button"
              className="action-btn action-reject"
              onClick={() => toggleStudentSuspend(suspendTarget)}
              disabled={!suspendTarget || suspendingId === suspendTarget.id}
            >
              {suspendTarget && suspendingId === suspendTarget.id
                ? t('admin.studentsPage.working')
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

      <Modal open={Boolean(editModel)} title={t('admin.studentsPage.editModalTitle', { id: editModel?.id || '' })} onClose={() => setEditModel(null)}>
        {editModel && (
          <form className="grid" onSubmit={onSaveStudent}>
            <label className="grid">
              <span>{t('admin.studentsPage.name')}</span>
              <input
                type="text"
                value={editModel.name}
                onChange={(event) => setEditModel((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
            </label>
            <label className="grid">
              <span>{t('admin.studentsPage.email')}</span>
              <input
                type="email"
                value={editModel.email}
                onChange={(event) => setEditModel((prev) => ({ ...prev, email: event.target.value }))}
                required
              />
            </label>
            <label className="grid">
              <span>{t('admin.studentsPage.phoneNumber')}</span>
              <input
                type="text"
                value={editModel.phoneNumber || ''}
                onChange={(event) =>
                  setEditModel((prev) => ({ ...prev, phoneNumber: event.target.value }))
                }
              />
            </label>
            <label className="grid">
              <span>{t('admin.studentsPage.dateOfBirth')}</span>
              <input
                type="date"
                value={editModel.dateOfBirth || ''}
                onChange={(event) =>
                  setEditModel((prev) => ({ ...prev, dateOfBirth: event.target.value }))
                }
              />
            </label>
            <div className="row">
              <button type="submit" className="action-btn admin-student-edit-save" disabled={saving}>
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

      <Modal open={Boolean(deleteTarget)} title={t('admin.studentsPage.deleteModalTitle')} onClose={() => setDeleteTarget(null)}>
        <div className="grid">
          <p>{t('admin.studentsPage.confirmDeleteStudent')}</p>
          <div className="row">
            <button type="button" className="action-btn action-reject" onClick={onConfirmDelete} disabled={saving}>
              {saving ? t('admin.formationsPage.deleting') : t('admin.formationsPage.confirmBtn')}
            </button>
            <button type="button" className="action-btn modal-cancel-btn" onClick={() => setDeleteTarget(null)} disabled={saving}>
              {t('admin.formationsPage.cancelBtn')}
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
