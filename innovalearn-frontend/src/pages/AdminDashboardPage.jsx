import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api';
import { getCurrentUser } from '../auth';
import ProfileSidebar from '../components/ProfileSidebar';
import StatusBadge from '../components/StatusBadge';
import LoadingButton from '../components/LoadingButton';

const PAGE_SIZE = 3;

function createdTimestamp(item) {
  if (item?.createdAt) return new Date(item.createdAt).getTime();
  return item?.id || 0;
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

export default function AdminDashboardPage({ pushToast }) {
  const user = getCurrentUser();
  const navigate = useNavigate();

  const [formations, setFormations] = useState([]);
  const [publishingId, setPublishingId] = useState(null);
  const [filterMode, setFilterMode] = useState('latest_added');
  const [titleSearch, setTitleSearch] = useState('');
  const [page, setPage] = useState(1);

  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [selectedAnalyticsFormationId, setSelectedAnalyticsFormationId] =
    useState(null);

  async function loadFormations() {
    try {
      const data = await apiRequest('/formations/manage', {
        token: user.token,
      });
      setFormations(data);
    } catch (err) {
      pushToast(err.message, 'error');
    }
  }

  async function loadAnalytics() {
    setAnalyticsLoading(true);
    try {
      const data = await apiRequest('/formations/manage/analytics', {
        token: user.token,
      });
      setAnalyticsData(data);
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setAnalyticsLoading(false);
    }
  }

  async function publishFormation(formationId) {
    setPublishingId(formationId);
    try {
      await apiRequest(`/formations/${formationId}/publish`, {
        method: 'PATCH',
        token: user.token,
      });
      setFormations((prev) =>
        prev.map((formation) =>
          formation.id === formationId
            ? { ...formation, published: true }
            : formation,
        ),
      );
      await loadAnalytics();
      pushToast('Formation published successfully.', 'success');
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setPublishingId(null);
    }
  }

  useEffect(() => {
    loadFormations();
    loadAnalytics();
  }, []);

  const visibleFormations = useMemo(() => {
    const list = formations
      .filter((formation) =>
        (formation.title || '')
          .toLowerCase()
          .includes(titleSearch.toLowerCase().trim()),
      )
      .sort((a, b) => createdTimestamp(b) - createdTimestamp(a));

    if (filterMode === 'published_only') {
      return list.filter((formation) => formation.published);
    }

    if (filterMode === 'draft_only') {
      return list.filter((formation) => !formation.published);
    }

    if (
      filterMode === 'online_first' ||
      filterMode === 'presentiel_first'
    ) {
      const onlineFirst = { ONLINE: 0, PRESENTIEL: 1 };
      const presentielFirst = { PRESENTIEL: 0, ONLINE: 1 };
      const priority =
        filterMode === 'online_first'
          ? onlineFirst
          : presentielFirst;

      return list.sort((a, b) => {
        const typeDiff = priority[a.type] - priority[b.type];
        if (typeDiff !== 0) return typeDiff;
        return createdTimestamp(b) - createdTimestamp(a);
      });
    }

    return list;
  }, [formations, filterMode, titleSearch]);

  const totalPages = Math.max(
    1,
    Math.ceil(visibleFormations.length / PAGE_SIZE),
  );
  const pageRows = visibleFormations.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [filterMode, titleSearch]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const analyticsFormations = analyticsData?.formations || [];

  const analyticsByFormationId = useMemo(
    () =>
      new Map(
        analyticsFormations.map((entry) => [entry.formation.id, entry]),
      ),
    [analyticsFormations],
  );

  const selectedAnalyticsEntry = selectedAnalyticsFormationId
    ? analyticsByFormationId.get(selectedAnalyticsFormationId)
    : null;

  function openAnalyticsForFormation(formationId) {
    const exists = analyticsByFormationId.has(formationId);
    if (!exists) {
      pushToast('Analytics data for this formation is not ready yet.', 'error');
      return;
    }

    setSelectedAnalyticsFormationId(formationId);
  }

  function closeAnalyticsModal() {
    setSelectedAnalyticsFormationId(null);
  }

  return (
    <section className="stack">
      <ProfileSidebar user={user} />

      <div className="card panel-head">
        <div>
          <h1>Formateur Dashboard</h1>
          <p className="hint">
            Manage your formations and monitor student learning analytics.
          </p>
        </div>
        <div className="row">
          <button
            type="button"
            onClick={() => navigate('/formateur/formations/new')}
          >
            Add Formation
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-head-row">
          <h2>Formations</h2>
          <StatusBadge
            label={`${visibleFormations.length} total`}
            tone="neutral"
          />
        </div>

        <div className="table-toolbar">
          <input
            type="text"
            value={titleSearch}
            onChange={(event) => setTitleSearch(event.target.value)}
            placeholder="Search by formation title"
          />
          <select
            value={filterMode}
            onChange={(event) => setFilterMode(event.target.value)}
          >
            <option value="latest_added">Added Latest (Default)</option>
            <option value="published_only">Published Only</option>
            <option value="draft_only">Draft Only</option>
            <option value="online_first">Online First</option>
            <option value="presentiel_first">Presentiel First</option>
          </select>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Type</th>
                <th>Status</th>
                <th>Price</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((formation) => (
                <tr key={formation.id}>
                  <td>{formation.id}</td>
                  <td>{formation.title}</td>
                  <td>
                    <StatusBadge
                      tone={formation.type === 'ONLINE' ? 'blue' : 'orange'}
                      label={formation.type}
                    />
                  </td>
                  <td>
                    <StatusBadge
                      tone={formation.published ? 'green' : 'gray'}
                      label={formation.published ? 'Published' : 'Draft'}
                    />
                  </td>
                  <td>{formation.price}</td>
                  <td>
                    <div className="row action-btn-group">
                      <LoadingButton
                        className="action-btn action-approve"
                        type="button"
                        isLoading={publishingId === formation.id}
                        loadingText="Working..."
                        disabled={formation.published}
                        onClick={() => publishFormation(formation.id)}
                      >
                        {formation.published ? 'Published' : 'Publish'}
                      </LoadingButton>
                      <button
                        type="button"
                        className="action-btn action-page"
                        onClick={() =>
                          navigate(`/formateur/formations/${formation.id}`)
                        }
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        className="action-btn action-page"
                        onClick={() => openAnalyticsForFormation(formation.id)}
                      >
                        Stats
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={6}>No formations match this filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar">
          <button
            type="button"
            className="action-btn action-page"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page === 1}
          >
            Prev
          </button>
          <span>
            Page {page} / {totalPages}
          </span>
          <button
            type="button"
            className="action-btn action-page"
            onClick={() =>
              setPage((prev) => Math.min(totalPages, prev + 1))
            }
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-head-row">
          <h2>Formation Analytics</h2>
          <StatusBadge
            label={`${analyticsFormations.length} formations`}
            tone={analyticsFormations.length > 0 ? 'blue' : 'gray'}
          />
        </div>
        {analyticsData?.generatedAt && (
          <p className="hint">
            Last refresh: {new Date(analyticsData.generatedAt).toLocaleString()}
          </p>
        )}

        {analyticsLoading && <p className="hint">Loading analytics...</p>}
        {!analyticsLoading && analyticsFormations.length > 0 && (
          <p className="hint">
            Click the `Stats` button on any formation row to open a detailed analytics window.
          </p>
        )}

        {!analyticsLoading && analyticsFormations.length === 0 && (
          <p className="hint">No analytics available yet for your formations.</p>
        )}
      </div>

      {selectedAnalyticsEntry && (
        <div className="formateur-analytics-modal-backdrop" role="dialog" aria-modal="true">
          <article className="formateur-analytics-modal">
            <div className="formateur-analytics-modal-head">
              <h2>Formation Analytics</h2>
              <button
                type="button"
                className="formateur-analytics-modal-close"
                onClick={closeAnalyticsModal}
                aria-label="Close analytics window"
              >
                x
              </button>
            </div>

            {(() => {
              const entry = selectedAnalyticsEntry;
              const formation = entry.formation;
              const stats = entry.statistics;
              const courses = entry.courseStatistics || [];
              const approvedTotal = stats.totalApprovedStudents || 0;
              const completedTotal = stats.totalCompletedStudents || 0;

              return (
                <div className="formateur-analytics-grid">
                  <article className="formateur-analytics-card">
                    <div className="card-head-row">
                      <div>
                        <h3>{formation.title}</h3>
                        <p className="hint">{formation.type} | Price: {formation.price}</p>
                      </div>
                      <div className="row">
                        <StatusBadge
                          label={formation.published ? 'Published' : 'Draft'}
                          tone={formation.published ? 'green' : 'gray'}
                        />
                        <StatusBadge
                          label={`${courses.length} courses`}
                          tone="blue"
                        />
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
                    </div>

                    <div className="formateur-chart-row">
                      <DonutChart
                        label="Completion Rate"
                        valueText={`${Number(stats.completionRate || 0).toFixed(1)}%`}
                        segments={[
                          { value: completedTotal, color: '#1ca36a' },
                          {
                            value: Math.max(approvedTotal - completedTotal, 0),
                            color: '#dce8f8',
                          },
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
                            <strong>
                              {Number(course.averageScore || 0).toFixed(2)}%
                            </strong>
                          </div>
                        ))}
                      </div>
                    </div>

                    <section className="table-wrap formateur-analytics-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Student</th>
                            <th>Email</th>
                            <th>Completion</th>
                            <th>Certificate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(entry.enrolledStudents || []).map((student) => {
                            const isCompleted =
                              student.completionStatus !== 'IN_PROGRESS';
                            return (
                              <tr key={student.id}>
                                <td>{student.name}</td>
                                <td>{student.email}</td>
                                <td>
                                  <StatusBadge
                                    label={
                                      isCompleted ? 'Completed' : 'In Progress'
                                    }
                                    tone={isCompleted ? 'green' : 'orange'}
                                  />
                                </td>
                                <td>
                                  <StatusBadge
                                    label={
                                      student.certificateIssued ? 'Yes' : 'No'
                                    }
                                    tone={
                                      student.certificateIssued
                                        ? 'green'
                                        : 'gray'
                                    }
                                  />
                                </td>
                              </tr>
                            );
                          })}
                          {(entry.enrolledStudents || []).length === 0 && (
                            <tr>
                              <td colSpan={4}>No approved students yet.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </section>

                    <section className="table-wrap formateur-analytics-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Course</th>
                            <th>Passed</th>
                            <th>Failed</th>
                            <th>Average Score</th>
                            <th>Total Attempts</th>
                            <th>Pass/Fail</th>
                          </tr>
                        </thead>
                        <tbody>
                          {courses.map((course) => (
                            <tr key={course.id}>
                              <td>{course.title}</td>
                              <td>{course.passedStudents}</td>
                              <td>{course.failedStudents}</td>
                              <td>{Number(course.averageScore || 0).toFixed(2)}%</td>
                              <td>{course.totalAttempts}</td>
                              <td>
                                <DonutChart
                                  size={54}
                                  thickness={11}
                                  label=""
                                  valueText={`${course.totalAttempts}`}
                                  segments={[
                                    {
                                      value: course.passedStudents,
                                      color: '#169f63',
                                    },
                                    {
                                      value: course.failedStudents,
                                      color: '#f26969',
                                    },
                                  ]}
                                />
                              </td>
                            </tr>
                          ))}
                          {courses.length === 0 && (
                            <tr>
                              <td colSpan={6}>No course statistics yet.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </section>
                  </article>
                </div>
              );
            })()}
          </article>
        </div>
      )}
    </section>
  );
}
