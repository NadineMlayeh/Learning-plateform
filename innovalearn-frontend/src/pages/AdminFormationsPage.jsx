import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api';
import { getCurrentUser } from '../auth';
import ProfileSidebar from '../components/ProfileSidebar';
import StatusBadge from '../components/StatusBadge';
import { useTranslation } from 'react-i18next';

const PAGE_SIZE = 6;
const ANALYTICS_STUDENT_PAGE_SIZE = 5;

function buildQuery(path, params) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || String(value).trim() === '') return;
    query.set(key, String(value));
  });

  return `${path}?${query.toString()}`;
}

function money(value) {
  return `${Number(value || 0).toFixed(2)} TND`;
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
}

function formatDateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function Modal({ open, title, onClose, children, wide = false }) {
  if (!open) return null;

  return (
    <div className="admin-modal-overlay" role="dialog" aria-modal="true">
      <button
        type="button"
        className="admin-modal-backdrop"
        onClick={onClose}
        aria-label="Close modal"
      />
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

function DonutChart({ segments, label, valueText, size = 120, thickness = 20 }) {
  const total = segments.reduce((sum, segment) => sum + Number(segment.value || 0), 0);

  let cursor = 0;
  const gradient =
    total <= 0
      ? '#e8eff8 0 100%'
      : segments
          .map((segment) => {
            const value = Number(segment.value || 0);
            const start = (cursor / total) * 100;
            cursor += value;
            const end = (cursor / total) * 100;
            return `${segment.color} ${start}% ${end}%`;
          })
          .join(', ');

  const innerSize = Math.max(0, size - thickness * 2);

  return (
    <article className="formateur-donut-card">
      <div
        className="formateur-donut"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          background: `conic-gradient(${gradient})`,
        }}
      >
        <div
          className="formateur-donut-inner"
          style={{ width: `${innerSize}px`, height: `${innerSize}px` }}
        >
          <strong>{valueText}</strong>
        </div>
      </div>
      <p className="hint">{label}</p>
    </article>
  );
}

export default function AdminFormationsPage({ pushToast, embedded = false }) {
  const { t } = useTranslation();
  const user = getCurrentUser();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [detailsTarget, setDetailsTarget] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [courseContentTarget, setCourseContentTarget] = useState(null);
  const [editModel, setEditModel] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [courseDeletingId, setCourseDeletingId] = useState(null);
  const [data, setData] = useState({ page: 1, totalPages: 1, total: 0, items: [] });
  const [analytics, setAnalytics] = useState({
    open: false,
    loading: false,
    formationId: null,
    data: null,
  });
  const [analyticsStudentSearch, setAnalyticsStudentSearch] = useState('');
  const [analyticsStudentPage, setAnalyticsStudentPage] = useState(1);

  async function loadFormations() {
    setLoading(true);
    try {
      const response = await apiRequest(
        buildQuery('/admin/formations', {
          page,
          pageSize: PAGE_SIZE,
          search,
          status: statusFilter === 'ALL' ? null : statusFilter,
          type: typeFilter === 'ALL' ? null : typeFilter,
        }),
        { token: user.token },
      );
      setData(response);
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function openAnalytics(formationId) {
    setAnalyticsStudentSearch('');
    setAnalyticsStudentPage(1);
    setAnalytics({
      open: true,
      loading: true,
      formationId,
      data: null,
    });

    try {
      const response = await apiRequest(`/admin/formations/${formationId}/analytics`, {
        token: user.token,
      });
      setAnalytics((prev) => ({
        ...prev,
        loading: false,
        data: response,
      }));
    } catch (err) {
      setAnalytics((prev) => ({ ...prev, loading: false }));
      pushToast(err.message, 'error');
    }
  }

  async function openDetails(formationId) {
    setDetailsOpen(true);
    setDetailsLoading(true);
    try {
      const response = await apiRequest(`/admin/formations/${formationId}`, {
        token: user.token,
      });
      setDetailsTarget(response);
    } catch (err) {
      pushToast(err.message, 'error');
      setDetailsOpen(false);
      setDetailsTarget(null);
    } finally {
      setDetailsLoading(false);
    }
  }

  function closeDetails() {
    setDetailsOpen(false);
    setDetailsTarget(null);
    setCourseContentTarget(null);
  }

  function closeAnalytics() {
    setAnalyticsStudentSearch('');
    setAnalyticsStudentPage(1);
    setAnalytics({
      open: false,
      loading: false,
      formationId: null,
      data: null,
    });
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
      setDetailsTarget((prev) => (prev?.id === deleteTarget.id ? null : prev));
      if (detailsTarget?.id === deleteTarget.id) {
        closeDetails();
      }
      if (analytics.formationId === deleteTarget.id) {
        closeAnalytics();
      }
      await loadFormations();
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function onSaveFormation(event) {
    event.preventDefault();
    if (!editModel) return;

    setUpdating(true);
    try {
      await apiRequest(`/admin/formations/${editModel.id}`, {
        method: 'PATCH',
        token: user.token,
        body:
          editModel.type === 'PRESENTIEL'
            ? {
                title: editModel.title,
                description: editModel.description,
                price: Number(editModel.price),
                location: editModel.location || null,
                startDate: editModel.startDate || null,
                endDate: editModel.endDate || null,
              }
            : {
                title: editModel.title,
                description: editModel.description,
                price: Number(editModel.price),
              },
      });

      if (editModel.type === 'ONLINE') {
        for (const course of editModel.courses || []) {
          await apiRequest(`/admin/courses/${course.id}`, {
            method: 'PATCH',
            token: user.token,
            body: { title: course.title },
          });
        }
      }

      pushToast('Formation updated successfully.', 'success');
      setEditModel(null);
      await loadFormations();
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setUpdating(false);
    }
  }

  async function openEditFormation(formationId) {
    setEditLoading(true);
    try {
      const response = await apiRequest(`/admin/formations/${formationId}`, {
        token: user.token,
      });

      setEditModel({
        id: response.id,
        type: response.type,
        title: response.title || '',
        description: response.description || '',
        price: String(response.price ?? ''),
        location: response.location || '',
        startDate: formatDateInput(response.startDate),
        endDate: formatDateInput(response.endDate),
        courses: (response.courses || []).map((course) => ({
          id: course.id,
          title: course.courseName || '',
          published: Boolean(course.published),
        })),
      });
    } catch (err) {
      pushToast(err.message, 'error');
      setEditModel(null);
    } finally {
      setEditLoading(false);
    }
  }

  function updateEditCourseTitle(courseId, title) {
    setEditModel((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        courses: (prev.courses || []).map((course) =>
          course.id === courseId ? { ...course, title } : course,
        ),
      };
    });
  }

  async function deleteEditCourse(courseId) {
    if (!editModel) return;
    if (!window.confirm('Are you sure you want to delete this course?')) {
      return;
    }

    setCourseDeletingId(courseId);
    try {
      await apiRequest(`/admin/courses/${courseId}`, {
        method: 'DELETE',
        token: user.token,
      });
      setEditModel((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          courses: (prev.courses || []).filter((course) => course.id !== courseId),
        };
      });
      pushToast('Course deleted successfully.', 'success');
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setCourseDeletingId(null);
    }
  }

  useEffect(() => {
    loadFormations();
  }, [page, search, statusFilter, typeFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, typeFilter]);

  const filteredAnalyticsStudents = useMemo(() => {
    const rows = analytics.data?.enrolledStudents || [];
    const query = analyticsStudentSearch.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((student) =>
      String(student.name || '').toLowerCase().includes(query),
    );
  }, [analytics.data, analyticsStudentSearch]);

  const analyticsStudentTotalPages = Math.max(
    1,
    Math.ceil(filteredAnalyticsStudents.length / ANALYTICS_STUDENT_PAGE_SIZE),
  );
  const analyticsStudentRows = filteredAnalyticsStudents.slice(
    (analyticsStudentPage - 1) * ANALYTICS_STUDENT_PAGE_SIZE,
    analyticsStudentPage * ANALYTICS_STUDENT_PAGE_SIZE,
  );

  useEffect(() => {
    setAnalyticsStudentPage(1);
  }, [analyticsStudentSearch, analytics.data?.formation?.id]);

  useEffect(() => {
    if (analyticsStudentPage > analyticsStudentTotalPages) {
      setAnalyticsStudentPage(analyticsStudentTotalPages);
    }
  }, [analyticsStudentPage, analyticsStudentTotalPages]);

  return (
    <section className={embedded ? 'stack admin-skin-page admin-embedded-content' : 'stack admin-skin-page'}>
      {!embedded && <ProfileSidebar user={user} />}

      {!embedded && (
        <div className="card panel-head">
          <div>
            <h1>{t('admin.formationsPage.title')}</h1>
            <p className="hint">{t('admin.formationsPage.subtitle')}</p>
          </div>
          <div className="row">
            <Link className="link-btn small-btn" to="/admin">
              {t('admin.formationsPage.backToAdmin')}
            </Link>
            <Link className="link-btn small-btn" to="/admin/students">
              {t('admin.formationsPage.studentsBtn')}
            </Link>
            <Link className="link-btn small-btn" to="/admin/formateurs">
              {t('admin.formationsPage.formateursBtn')}
            </Link>
          </div>
        </div>
      )}

      <div className={embedded ? 'card admin-saas-section' : 'card'}>
        <div className="card-head-row">
          <h2>{t('admin.formationsPage.formations')}</h2>
          <StatusBadge label={t('admin.formationsPage.totalCount', { total: data.total })} tone="blue" />
        </div>

        <div className="table-toolbar">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('admin.dashboard.searchByTitle')}
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="ALL">{t('admin.formationsPage.allStatuses')}</option>
            <option value="DRAFT">{t('admin.formationsPage.draftOnly')}</option>
            <option value="PUBLISHED">{t('admin.formationsPage.publishedOnly')}</option>
          </select>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="ALL">{t('admin.dashboard.allTypes')}</option>
            <option value="ONLINE">{t('admin.dashboard.onlineOnly')}</option>
            <option value="PRESENTIEL">{t('admin.dashboard.presentielOnly')}</option>
          </select>
        </div>

        <div className="table-wrap">
          <table className="admin-formations-table">
            <thead>
              <tr>
                <th>{t('admin.tables.id')}</th>
                <th>{t('admin.tables.title')}</th>
                <th>{t('admin.tables.type')}</th>
                <th>{t('admin.tables.status')}</th>
                <th className="action-col">{t('admin.tables.action')}</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((formation) => (
                <tr key={formation.id}>
                  <td>{formation.id}</td>
                  <td>
                    <span
                      className="admin-formation-table-title"
                      title={formation.description || ''}
                    >
                      {formation.title}
                    </span>
                  </td>
                  <td>{formation.type}</td>
                  <td>
                    <span
                      className={`admin-formation-status-pill ${
                        formation.published ? 'is-published' : 'is-draft'
                      }`}
                    >
                      {formation.published ? 'PUBLISHED' : 'DRAFT'}
                    </span>
                  </td>
                  <td className="action-col">
                    <div className="row action-btn-group">
                      <button
                        type="button"
                        className="action-btn action-page"
                        onClick={() => openDetails(formation.id)}
                      >
                        {t('admin.formationsPage.detailsBtn')}
                      </button>
                      <button
                        type="button"
                        className="action-btn action-analytics"
                        onClick={() => openAnalytics(formation.id)}
                      >
                        {t('admin.formationsPage.analyticsBtn')}
                      </button>
                      <button
                        type="button"
                        className="action-btn action-approve"
                        onClick={() => openEditFormation(formation.id)}
                      >
                        {t('admin.formationsPage.editBtn')}
                      </button>
                      <button
                        type="button"
                        className="action-btn admin-square-trash-btn"
                        aria-label={t('admin.dashboard.deleteContent')}
                        title={t('admin.dashboard.deleteContent')}
                        onClick={() => setDeleteTarget(formation)}
                      >
                        <img src="/images/trash.png" alt="" className="admin-square-trash-icon" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={5}>{loading ? t('admin.formationsPage.loadingFormations') : t('admin.formationsPage.noFormations')}</td>
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

      <Modal
        open={detailsOpen}
        title={t('admin.formationsPage.formationModalTitle', { id: detailsTarget?.id || '' })}
        onClose={closeDetails}
        wide
      >
        {detailsLoading && <p className="hint">{t('admin.formationsPage.loadingDetails')}</p>}
        {detailsTarget && !detailsLoading && (
          <div className="stack">
            <div className="admin-metric-grid admin-user-detail-cards">
              <article className="admin-metric-card">
                <p className="hint">{t('admin.details.title')}</p>
                <strong>{detailsTarget.title}</strong>
              </article>
              <article className="admin-metric-card">
                <p className="hint">{t('admin.details.type')}</p>
                <strong>{detailsTarget.type}</strong>
              </article>
              <article className="admin-metric-card">
                <p className="hint">{t('admin.details.status')}</p>
                <strong>{detailsTarget.published ? 'PUBLISHED' : 'DRAFT'}</strong>
              </article>
              <article className="admin-metric-card">
                <p className="hint">{t('admin.details.formateur')}</p>
                <strong>{detailsTarget.formateur?.name || '-'}</strong>
              </article>
              <article className="admin-metric-card">
                <p className="hint">{t('admin.dashboard.studentsEnrolled')}</p>
                <strong>{detailsTarget.totalStudentsEnrolled ?? 0}</strong>
              </article>
              <article className="admin-metric-card">
                <p className="hint">{t('admin.details.revenue')}</p>
                <strong>{money(detailsTarget.revenueGenerated)}</strong>
              </article>
              {detailsTarget.type === 'PRESENTIEL' && (
                <article className="admin-metric-card">
                  <p className="hint">{t('admin.details.startEndDates')}</p>
                  <strong>
                    {formatDate(detailsTarget.startDate)} - {formatDate(detailsTarget.endDate)}
                  </strong>
                </article>
              )}
              {detailsTarget.type === 'PRESENTIEL' && (
                <article className="admin-metric-card">
                  <p className="hint">{t('admin.details.location')}</p>
                  <strong>{detailsTarget.location || '-'}</strong>
                </article>
              )}
            </div>

            {detailsTarget.type === 'ONLINE' && (
              <section className="table-wrap admin-formation-course-table">
                <table>
                  <thead>
                    <tr>
                      <th>{t('admin.details.courseId')}</th>
                      <th>{t('admin.details.courseName')}</th>
                      <th>{t('admin.details.description')}</th>
                      <th>{t('admin.details.status')}</th>
                      <th>{t('admin.details.lessonsAndQuizzes')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detailsTarget.courses || []).map((course) => (
                      <tr key={course.id}>
                        <td>{course.id}</td>
                        <td>{course.courseName}</td>
                        <td>{course.description || '-'}</td>
                        <td>
                          <span
                            className={`admin-formation-status-pill ${
                              course.published ? 'is-published' : 'is-draft'
                            }`}
                          >
                            {course.published ? 'PUBLISHED' : 'DRAFT'}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="action-btn action-page"
                            onClick={() => setCourseContentTarget(course)}
                          >
                            {t('admin.dashboard.viewBtn')}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(detailsTarget.courses || []).length === 0 && (
                      <tr>
                        <td colSpan={5}>{t('admin.details.noCourses')}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </section>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(courseContentTarget)}
        title={t('admin.details.courseContentTitle', { id: courseContentTarget?.id || '' })}
        onClose={() => setCourseContentTarget(null)}
        wide
      >
        {courseContentTarget && (
          <div className="admin-course-content-grid">
            <section className="admin-course-content-column">
              <h3>{t('admin.details.lessons')}</h3>
              {(courseContentTarget.lessons || []).length === 0 && (
                <p className="hint">{t('admin.details.noLessons')}</p>
              )}
              {(courseContentTarget.lessons || []).map((lesson) => (
                <article key={lesson.id} className="admin-course-content-item">
                  <strong>{lesson.title}</strong>
                  <a href={lesson.pdfUrl} target="_blank" rel="noreferrer">
                    {t('admin.details.openPdf')}
                  </a>
                </article>
              ))}
            </section>

            <section className="admin-course-content-column">
              <h3>{t('admin.details.quizzes')}</h3>
              {(courseContentTarget.quizzes || []).length === 0 && (
                <p className="hint">{t('admin.details.noQuizzes')}</p>
              )}
              {(courseContentTarget.quizzes || []).map((quiz) => (
                <article key={quiz.id} className="admin-course-content-item">
                  <strong>{quiz.title}</strong>
                  {(quiz.questions || []).map((question, questionIndex) => (
                    <div key={question.id} className="admin-quiz-question-block">
                      <p>
                        Q{questionIndex + 1}. {question.text}
                      </p>
                      <ul className="admin-quiz-choice-list">
                        {(question.choices || []).map((choice) => (
                          <li
                            key={choice.id}
                            className={choice.isCorrect ? 'is-correct' : ''}
                          >
                            {choice.text}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </article>
              ))}
            </section>
          </div>
        )}
      </Modal>

      {analytics.open && (
        <div className="formateur-analytics-modal-backdrop" role="dialog" aria-modal="true">
          <article className="formateur-analytics-modal">
            <div className="formateur-analytics-modal-head">
              <h2>{t('admin.dashboard.formationAnalytics')}</h2>
              <button
                type="button"
                className="formateur-analytics-modal-close"
                onClick={closeAnalytics}
                aria-label="Close analytics window"
              >
                x
              </button>
            </div>

            {analytics.loading && <p className="hint">{t('admin.dashboard.loadingAnalytics')}</p>}

            {analytics.data && (() => {
              const entry = analytics.data;
              const formation = entry.formation;
              const stats = entry.statistics;
              const courses = entry.courseStatistics || [];
              const isPresentiel = formation.type === 'PRESENTIEL';
              const approvedTotal = stats.totalApprovedStudents || 0;
              const completedTotal = stats.totalCompletedStudents || 0;

              return (
                <div className="formateur-analytics-grid">
                  <article className="formateur-analytics-card">
                    <div className="card-head-row">
                      <div>
                        <h3 className="formateur-analytics-title" title={formation.title}>
                          {formation.title}
                        </h3>
                        <p className="hint">{formation.type} | {t('admin.dashboard.formPrice')}: {formation.price}</p>
                      </div>
                      <div className="row">
                        <StatusBadge
                          label={formation.published ? t('admin.dashboard.published') : t('admin.dashboard.draft')}
                          tone={formation.published ? 'green' : 'gray'}
                        />
                        <StatusBadge label={`${courses.length} ${t('admin.tables.course').toLowerCase()}s`} tone="blue" />
                      </div>
                    </div>

                    <div className="formateur-metric-grid">
                      <article>
                        <span>{t('admin.dashboard.studentsEnrolled')}</span>
                        <strong>{stats.totalStudentsEnrolled}</strong>
                      </article>
                      <article>
                        <span>Approved</span>
                        <strong>{stats.totalApprovedStudents}</strong>
                      </article>
                      {!isPresentiel && (
                        <>
                          <article>
                            <span>{t('admin.tables.completed')}</span>
                            <strong>{stats.totalCompletedStudents}</strong>
                          </article>
                          <article>
                            <span>{t('admin.dashboard.completionRate')}</span>
                            <strong>{Number(stats.completionRate || 0).toFixed(2)}%</strong>
                          </article>
                          <article>
                            <span>{t('admin.dashboard.successRate')}</span>
                            <strong>{Number(stats.successRate || 0).toFixed(2)}%</strong>
                          </article>
                        </>
                      )}
                    </div>

                    {!isPresentiel && (
                      <div className="formateur-chart-row">
                        <DonutChart
                          label={t('admin.dashboard.completionRate')}
                          valueText={`${Number(stats.completionRate || 0).toFixed(1)}%`}
                          segments={[
                            { value: completedTotal, color: '#1ca36a' },
                            { value: Math.max(approvedTotal - completedTotal, 0), color: '#dce8f8' },
                          ]}
                        />

                        <div className="formateur-bars">
                          <h4>Average Score per Course</h4>
                          {courses.length === 0 && (
                            <p className="hint">{t('admin.tables.noCourseStats')}</p>
                          )}
                          {courses.map((course) => (
                            <div key={course.id} className="formateur-bar-row">
                              <span>{course.title}</span>
                              <div className="formateur-bar-track">
                                <div
                                  className="formateur-bar-fill"
                                  style={{
                                    width: `${Math.max(
                                      0,
                                      Math.min(Number(course.averageScore || 0), 100),
                                    )}%`,
                                  }}
                                />
                              </div>
                              <strong>{Number(course.averageScore || 0).toFixed(2)}%</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <section className="table-wrap formateur-analytics-table">
                      <div className="table-toolbar admin-details-table-toolbar">
                        <input
                          type="text"
                          value={analyticsStudentSearch}
                          onChange={(event) =>
                            setAnalyticsStudentSearch(event.target.value)
                          }
                          placeholder={t('admin.tables.searchStudent')}
                        />
                      </div>
                      <table>
                        <thead>
                          <tr>
                            <th>{t('admin.tables.student')}</th>
                            <th>{t('admin.tables.email')}</th>
                            <th>{t('admin.tables.phoneNumber')}</th>
                            {!isPresentiel && <th>{t('admin.tables.completion')}</th>}
                            {!isPresentiel && <th>{t('admin.tables.certificate')}</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {analyticsStudentRows.map((student) => {
                            const isCompleted =
                              student.completionStatus !== 'IN_PROGRESS';
                            return (
                              <tr key={student.id}>
                                <td className="formateur-ellipsis-cell" title={student.name}>
                                  {student.name}
                                </td>
                                <td className="formateur-ellipsis-cell" title={student.email}>
                                  {student.email}
                                </td>
                                <td>{student.phoneNumber || '-'}</td>
                                {!isPresentiel && (
                                  <td>
                                    <StatusBadge
                                      label={isCompleted ? t('admin.tables.completed') : t('admin.tables.inProgress')}
                                      tone={isCompleted ? 'green' : 'orange'}
                                    />
                                  </td>
                                )}
                                {!isPresentiel && (
                                  <td>
                                    <StatusBadge
                                      label={student.certificateIssued ? t('admin.tables.yes') : t('admin.tables.no')}
                                      tone={student.certificateIssued ? 'green' : 'gray'}
                                    />
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                          {analyticsStudentRows.length === 0 && (
                            <tr>
                              <td colSpan={isPresentiel ? 3 : 5}>
                                {t('admin.tables.noStudents')}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </section>
                    <div className="pagination-bar admin-details-pagination">
                      <button
                        type="button"
                        className="action-btn action-page"
                        onClick={() =>
                          setAnalyticsStudentPage((prev) => Math.max(1, prev - 1))
                        }
                        disabled={analyticsStudentPage === 1}
                      >
                        {t('admin.pagination.prev')}
                      </button>
                      <span>
                        {t('admin.pagination.page', { current: analyticsStudentPage, total: analyticsStudentTotalPages })}
                      </span>
                      <button
                        type="button"
                        className="action-btn action-page"
                        onClick={() =>
                          setAnalyticsStudentPage((prev) =>
                            Math.min(analyticsStudentTotalPages, prev + 1),
                          )
                        }
                        disabled={analyticsStudentPage === analyticsStudentTotalPages}
                      >
                        {t('admin.pagination.next')}
                      </button>
                    </div>

                    {!isPresentiel && (
                      <section className="table-wrap formateur-analytics-table">
                        <table>
                          <thead>
                            <tr>
                              <th>{t('admin.tables.course')}</th>
                              <th>{t('admin.tables.passed')}</th>
                              <th>{t('admin.tables.failed')}</th>
                              <th>{t('admin.tables.averageScore')}</th>
                              <th>{t('admin.tables.passFail')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {courses.map((course) => (
                              <tr key={course.id}>
                                <td className="formateur-ellipsis-cell" title={course.title}>
                                  {course.title}
                                </td>
                                <td>{course.passedStudents}</td>
                                <td>{course.failedStudents}</td>
                                <td>{Number(course.averageScore || 0).toFixed(2)}%</td>
                                <td>
                                  <DonutChart
                                    size={54}
                                    thickness={11}
                                    label=""
                                    valueText={`${course.passedStudents}/${course.failedStudents}`}
                                    segments={[
                                      { value: course.passedStudents, color: '#169f63' },
                                      { value: course.failedStudents, color: '#f26969' },
                                    ]}
                                  />
                                </td>
                              </tr>
                            ))}
                            {courses.length === 0 && (
                              <tr>
                                <td colSpan={5}>{t('admin.tables.noCourseStats')}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </section>
                    )}
                  </article>
                </div>
              );
            })()}
          </article>
        </div>
      )}

      <Modal
        open={Boolean(editModel) || editLoading}
        title={t('admin.formationsPage.editModalTitle', { id: editModel?.id || '' })}
        onClose={() => {
          if (updating || editLoading || courseDeletingId) return;
          setEditModel(null);
        }}
      >
        {editLoading && <p className="hint">{t('admin.formationsPage.loadingFormation')}</p>}
        {editModel && (
          <form className="grid" onSubmit={onSaveFormation}>
            <label className="grid">
              <span>{t('admin.dashboard.formTitle')}</span>
              <input
                type="text"
                value={editModel.title}
                onChange={(event) =>
                  setEditModel((prev) => ({ ...prev, title: event.target.value }))
                }
                required
              />
            </label>
            <label className="grid">
              <span>{t('admin.dashboard.formDescription')}</span>
              <textarea
                value={editModel.description}
                onChange={(event) =>
                  setEditModel((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                required
              />
            </label>
            <label className="grid">
              <span>{t('admin.dashboard.formPrice')}</span>
              <input
                type="number"
                min="0"
                value={editModel.price}
                onChange={(event) =>
                  setEditModel((prev) => ({ ...prev, price: event.target.value }))
                }
                required
              />
            </label>
            <label className="grid">
              <span>{t('admin.details.type')}</span>
              <input type="text" value={editModel.type} disabled />
            </label>
            {editModel.type === 'PRESENTIEL' && (
              <>
                <label className="grid">
                  <span>{t('admin.details.location')}</span>
                  <input
                    type="text"
                    value={editModel.location}
                    onChange={(event) =>
                      setEditModel((prev) => ({ ...prev, location: event.target.value }))
                    }
                  />
                </label>
                <label className="grid">
                  <span>{t('admin.details.startEndDates').split('/')[0].trim()}</span>
                  <input
                    type="date"
                    value={editModel.startDate}
                    onChange={(event) =>
                      setEditModel((prev) => ({ ...prev, startDate: event.target.value }))
                    }
                  />
                </label>
                <label className="grid">
                  <span>{t('admin.details.startEndDates').split('/')[1]?.trim() || 'End Date'}</span>
                  <input
                    type="date"
                    value={editModel.endDate}
                    onChange={(event) =>
                      setEditModel((prev) => ({ ...prev, endDate: event.target.value }))
                    }
                  />
                </label>
              </>
            )}
            {editModel.type === 'ONLINE' && (
              <div className="grid admin-edit-course-list">
                <h3>{t('admin.formationsPage.courses')}</h3>
                {(editModel.courses || []).length === 0 && (
                  <p className="hint">{t('admin.formationsPage.noCoursesInFormation')}</p>
                )}
                {(editModel.courses || []).map((course) => (
                  <div key={course.id} className="admin-edit-course-row">
                    <input
                      type="text"
                      value={course.title}
                      onChange={(event) =>
                        updateEditCourseTitle(course.id, event.target.value)
                      }
                      required
                    />
                    <button
                      type="button"
                      className="action-btn admin-edit-course-trash-btn"
                      aria-label={t('admin.formationsPage.deleteCourseBtn')}
                      title={t('admin.formationsPage.deleteCourseBtn')}
                      onClick={() => deleteEditCourse(course.id)}
                      disabled={Boolean(courseDeletingId)}
                    >
                      <img src="/images/trash.png" alt="" className="admin-square-trash-icon" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="row">
              <button
                type="submit"
                className="action-btn admin-student-edit-save"
                disabled={updating || Boolean(courseDeletingId)}
              >
                {updating ? t('admin.formationsPage.saving') : t('admin.formationsPage.saveBtn')}
              </button>
              <button
                type="button"
                className="action-btn admin-student-edit-cancel"
                onClick={() => setEditModel(null)}
                disabled={updating || Boolean(courseDeletingId)}
              >
                {t('admin.formationsPage.cancelBtn')}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={Boolean(deleteTarget)} title={t('admin.formationsPage.deleteModalTitle')} onClose={() => setDeleteTarget(null)}>
        <div className="grid">
          <p>{t('admin.formationsPage.confirmDeleteFormation')}</p>
          <div className="row">
            <button
              type="button"
              className="action-btn action-reject"
              onClick={deleteFormation}
              disabled={saving}
            >
              {saving ? t('admin.formationsPage.deleting') : t('admin.formationsPage.confirmBtn')}
            </button>
            <button
              type="button"
              className="action-btn modal-cancel-btn"
              onClick={() => setDeleteTarget(null)}
              disabled={saving}
            >
              {t('admin.formationsPage.cancelBtn')}
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
