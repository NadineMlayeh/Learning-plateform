import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api';
import { getCurrentUser } from '../auth';
import ProfileSidebar from '../components/ProfileSidebar';
import StatusBadge from '../components/StatusBadge';

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
            <h1>Formation Management</h1>
            <p className="hint">Filter formations and inspect details and analytics by formation.</p>
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
      )}

      <div className={embedded ? 'card admin-saas-section' : 'card'}>
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
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="ALL">All statuses</option>
            <option value="DRAFT">Draft only</option>
            <option value="PUBLISHED">Published only</option>
          </select>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="ALL">All types</option>
            <option value="ONLINE">Online only</option>
            <option value="PRESENTIEL">Presentiel only</option>
          </select>
        </div>

        <div className="table-wrap">
          <table className="admin-formations-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Type</th>
                <th>Status</th>
                <th className="action-col">Action</th>
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
                        Details
                      </button>
                      <button
                        type="button"
                        className="action-btn action-analytics"
                        onClick={() => openAnalytics(formation.id)}
                      >
                        Analytics
                      </button>
                      <button
                        type="button"
                        className="action-btn action-approve"
                        onClick={() => openEditFormation(formation.id)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="action-btn admin-square-trash-btn"
                        aria-label={`Delete formation ${formation.title}`}
                        title="Delete"
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
                  <td colSpan={5}>{loading ? 'Loading formations...' : 'No formations found.'}</td>
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

      <Modal
        open={detailsOpen}
        title={`Formation #${detailsTarget?.id || ''}`}
        onClose={closeDetails}
        wide
      >
        {detailsLoading && <p className="hint">Loading formation details...</p>}
        {detailsTarget && !detailsLoading && (
          <div className="stack">
            <div className="admin-metric-grid admin-user-detail-cards">
              <article className="admin-metric-card">
                <p className="hint">Title</p>
                <strong>{detailsTarget.title}</strong>
              </article>
              <article className="admin-metric-card">
                <p className="hint">Type</p>
                <strong>{detailsTarget.type}</strong>
              </article>
              <article className="admin-metric-card">
                <p className="hint">Status</p>
                <strong>{detailsTarget.published ? 'PUBLISHED' : 'DRAFT'}</strong>
              </article>
              <article className="admin-metric-card">
                <p className="hint">Formateur</p>
                <strong>{detailsTarget.formateur?.name || '-'}</strong>
              </article>
              <article className="admin-metric-card">
                <p className="hint">Students Enrolled</p>
                <strong>{detailsTarget.totalStudentsEnrolled ?? 0}</strong>
              </article>
              <article className="admin-metric-card">
                <p className="hint">Revenue</p>
                <strong>{money(detailsTarget.revenueGenerated)}</strong>
              </article>
              {detailsTarget.type === 'PRESENTIEL' && (
                <article className="admin-metric-card">
                  <p className="hint">Start / End Dates</p>
                  <strong>
                    {formatDate(detailsTarget.startDate)} - {formatDate(detailsTarget.endDate)}
                  </strong>
                </article>
              )}
              {detailsTarget.type === 'PRESENTIEL' && (
                <article className="admin-metric-card">
                  <p className="hint">Location</p>
                  <strong>{detailsTarget.location || '-'}</strong>
                </article>
              )}
            </div>

            {detailsTarget.type === 'ONLINE' && (
              <section className="table-wrap admin-formation-course-table">
                <table>
                  <thead>
                    <tr>
                      <th>Course ID</th>
                      <th>Course Name</th>
                      <th>Description</th>
                      <th>Status</th>
                      <th>Lessons & Quizzes</th>
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
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(detailsTarget.courses || []).length === 0 && (
                      <tr>
                        <td colSpan={5}>No courses found for this formation.</td>
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
        title={`Course Content #${courseContentTarget?.id || ''}`}
        onClose={() => setCourseContentTarget(null)}
        wide
      >
        {courseContentTarget && (
          <div className="admin-course-content-grid">
            <section className="admin-course-content-column">
              <h3>Lessons</h3>
              {(courseContentTarget.lessons || []).length === 0 && (
                <p className="hint">No lessons in this course.</p>
              )}
              {(courseContentTarget.lessons || []).map((lesson) => (
                <article key={lesson.id} className="admin-course-content-item">
                  <strong>{lesson.title}</strong>
                  <a href={lesson.pdfUrl} target="_blank" rel="noreferrer">
                    Open PDF
                  </a>
                </article>
              ))}
            </section>

            <section className="admin-course-content-column">
              <h3>Quizzes</h3>
              {(courseContentTarget.quizzes || []).length === 0 && (
                <p className="hint">No quizzes in this course.</p>
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
              <h2>Formation Analytics</h2>
              <button
                type="button"
                className="formateur-analytics-modal-close"
                onClick={closeAnalytics}
                aria-label="Close analytics window"
              >
                x
              </button>
            </div>

            {analytics.loading && <p className="hint">Loading analytics...</p>}

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
                        <p className="hint">{formation.type} | Price: {formation.price}</p>
                      </div>
                      <div className="row">
                        <StatusBadge
                          label={formation.published ? 'Published' : 'Draft'}
                          tone={formation.published ? 'green' : 'gray'}
                        />
                        <StatusBadge label={`${courses.length} courses`} tone="blue" />
                      </div>
                    </div>

                    <div className="formateur-metric-grid">
                      <article>
                        <span>Total Enrolled</span>
                        <strong>{stats.totalStudentsEnrolled}</strong>
                      </article>
                      <article>
                        <span>Approved</span>
                        <strong>{stats.totalApprovedStudents}</strong>
                      </article>
                      {!isPresentiel && (
                        <>
                          <article>
                            <span>Completed</span>
                            <strong>{stats.totalCompletedStudents}</strong>
                          </article>
                          <article>
                            <span>Completion Rate</span>
                            <strong>{Number(stats.completionRate || 0).toFixed(2)}%</strong>
                          </article>
                          <article>
                            <span>Success Rate</span>
                            <strong>{Number(stats.successRate || 0).toFixed(2)}%</strong>
                          </article>
                        </>
                      )}
                    </div>

                    {!isPresentiel && (
                      <div className="formateur-chart-row">
                        <DonutChart
                          label="Completion Rate"
                          valueText={`${Number(stats.completionRate || 0).toFixed(1)}%`}
                          segments={[
                            { value: completedTotal, color: '#1ca36a' },
                            { value: Math.max(approvedTotal - completedTotal, 0), color: '#dce8f8' },
                          ]}
                        />

                        <div className="formateur-bars">
                          <h4>Average Score per Course</h4>
                          {courses.length === 0 && (
                            <p className="hint">No course statistics yet.</p>
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
                          placeholder="Search student by name"
                        />
                      </div>
                      <table>
                        <thead>
                          <tr>
                            <th>Student</th>
                            <th>Email</th>
                            <th>Phone Number</th>
                            {!isPresentiel && <th>Completion</th>}
                            {!isPresentiel && <th>Certificate</th>}
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
                                      label={isCompleted ? 'Completed' : 'In Progress'}
                                      tone={isCompleted ? 'green' : 'orange'}
                                    />
                                  </td>
                                )}
                                {!isPresentiel && (
                                  <td>
                                    <StatusBadge
                                      label={student.certificateIssued ? 'Yes' : 'No'}
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
                                No students match this search.
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
                        Prev
                      </button>
                      <span>
                        Page {analyticsStudentPage} / {analyticsStudentTotalPages}
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
                        Next
                      </button>
                    </div>

                    {!isPresentiel && (
                      <section className="table-wrap formateur-analytics-table">
                        <table>
                          <thead>
                            <tr>
                              <th>Course</th>
                              <th>Passed</th>
                              <th>Failed</th>
                              <th>Average Score</th>
                              <th>Pass/Fail</th>
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
                                <td colSpan={5}>No course statistics yet.</td>
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
        title={`Edit Formation #${editModel?.id || ''}`}
        onClose={() => {
          if (updating || editLoading || courseDeletingId) return;
          setEditModel(null);
        }}
      >
        {editLoading && <p className="hint">Loading formation...</p>}
        {editModel && (
          <form className="grid" onSubmit={onSaveFormation}>
            <label className="grid">
              <span>Title</span>
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
              <span>Description</span>
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
              <span>Price</span>
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
              <span>Type</span>
              <input type="text" value={editModel.type} disabled />
            </label>
            {editModel.type === 'PRESENTIEL' && (
              <>
                <label className="grid">
                  <span>Location</span>
                  <input
                    type="text"
                    value={editModel.location}
                    onChange={(event) =>
                      setEditModel((prev) => ({ ...prev, location: event.target.value }))
                    }
                  />
                </label>
                <label className="grid">
                  <span>Start Date</span>
                  <input
                    type="date"
                    value={editModel.startDate}
                    onChange={(event) =>
                      setEditModel((prev) => ({ ...prev, startDate: event.target.value }))
                    }
                  />
                </label>
                <label className="grid">
                  <span>End Date</span>
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
                <h3>Courses</h3>
                {(editModel.courses || []).length === 0 && (
                  <p className="hint">No courses in this formation.</p>
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
                      aria-label={`Delete course ${course.title}`}
                      title="Delete course"
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
                {updating ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                className="action-btn admin-student-edit-cancel"
                onClick={() => setEditModel(null)}
                disabled={updating || Boolean(courseDeletingId)}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={Boolean(deleteTarget)} title="Delete Formation" onClose={() => setDeleteTarget(null)}>
        <div className="grid">
          <p>Are you sure you want to delete this formation? This action cannot be undone.</p>
          <div className="row">
            <button
              type="button"
              className="action-btn action-reject"
              onClick={deleteFormation}
              disabled={saving}
            >
              {saving ? 'Deleting...' : 'Confirm'}
            </button>
            <button
              type="button"
              className="action-btn modal-cancel-btn"
              onClick={() => setDeleteTarget(null)}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
