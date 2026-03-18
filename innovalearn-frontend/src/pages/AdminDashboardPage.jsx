import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api';
import { getCurrentUser } from '../auth';
import ProfileSidebar from '../components/ProfileSidebar';
import StatusBadge from '../components/StatusBadge';
import LoadingButton from '../components/LoadingButton';

const PAGE_SIZE = 3;
const ANALYTICS_STUDENT_PAGE_SIZE = 5;
const FORMATION_PUBLISH_TS_KEY = 'formateur_published_at_map_v1';
const INITIAL_FORMATION_FORM = {
  title: '',
  description: '',
  price: '',
  type: 'ONLINE',
  location: '',
  startDate: '',
  endDate: '',
  profileImageUrl: '',
};

function readPublishedAtFallbackMap() {
  try {
    const raw = localStorage.getItem(FORMATION_PUBLISH_TS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writePublishedAtFallbackMap(map) {
  try {
    localStorage.setItem(FORMATION_PUBLISH_TS_KEY, JSON.stringify(map));
  } catch {
    // ignore storage failures
  }
}

function savePublishedAtFallback(formationId, iso) {
  if (!formationId || !iso) return;
  const map = readPublishedAtFallbackMap();
  map[String(formationId)] = iso;
  writePublishedAtFallbackMap(map);
}

function createdTimestamp(item) {
  if (item?.createdAt) return new Date(item.createdAt).getTime();
  return item?.id || 0;
}

function publishedTimestamp(item) {
  if (item?.publishedAt) return new Date(item.publishedAt).getTime();
  if (item?.publishedAtClient) return new Date(item.publishedAtClient).getTime();
  if (item?.published) return 0;
  return createdTimestamp(item);
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
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteFormationId, setConfirmDeleteFormationId] = useState(null);
  const [titleSearch, setTitleSearch] = useState('');
  const [createdSort, setCreatedSort] = useState('newest_first');
  const [pendingTypeFilter, setPendingTypeFilter] = useState('ALL');
  const [publishedTypeFilter, setPublishedTypeFilter] = useState('ALL');
  const [pendingPage, setPendingPage] = useState(1);
  const [publishedPage, setPublishedPage] = useState(1);
  const [isCreateFormationModalOpen, setIsCreateFormationModalOpen] =
    useState(false);
  const [createFormationForm, setCreateFormationForm] = useState(
    INITIAL_FORMATION_FORM,
  );
  const [creatingFormation, setCreatingFormation] = useState(false);
  const [createFormationThumbUploading, setCreateFormationThumbUploading] =
    useState(false);
  const [createFormationThumbName, setCreateFormationThumbName] = useState('');

  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [selectedAnalyticsFormationId, setSelectedAnalyticsFormationId] =
    useState(null);
  const [analyticsStudentSearch, setAnalyticsStudentSearch] = useState('');
  const [analyticsStudentPage, setAnalyticsStudentPage] = useState(1);

  async function loadFormations() {
    try {
      const data = await apiRequest('/formations/manage', {
        token: user.token,
      });
      const fallbackMap = readPublishedAtFallbackMap();
      const normalized = (Array.isArray(data) ? data : []).map((formation) => {
        const fallbackPublishedAt = fallbackMap[String(formation.id)];
        if (formation?.publishedAt || !fallbackPublishedAt) return formation;
        return {
          ...formation,
          publishedAtClient: fallbackPublishedAt,
        };
      });
      setFormations(normalized);
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
      const publishedFormation = await apiRequest(
        `/formations/${formationId}/publish`,
        {
          method: 'PATCH',
          token: user.token,
        },
      );
      const publishedIso =
        publishedFormation?.publishedAt || new Date().toISOString();
      savePublishedAtFallback(formationId, publishedIso);

      setFormations((prev) =>
        prev.map((formation) =>
          formation.id === formationId
            ? {
                ...formation,
                published: true,
                publishedAt: publishedFormation?.publishedAt || formation.publishedAt || null,
                publishedAtClient: publishedIso,
              }
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

  async function deletePendingFormation(formationId) {
    setDeletingId(formationId);
    try {
      const response = await apiRequest(`/formations/${formationId}`, {
        method: 'DELETE',
        token: user.token,
      });

      setFormations((prev) =>
        prev.filter((formation) => formation.id !== formationId),
      );

      if (selectedAnalyticsFormationId === formationId) {
        setSelectedAnalyticsFormationId(null);
      }

      pushToast(
        response?.message || 'Pending formation deleted successfully.',
        'success',
      );
      setConfirmDeleteFormationId(null);
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    loadFormations();
    loadAnalytics();
  }, []);

  const filteredFormations = useMemo(
    () =>
      formations.filter((formation) =>
        String(formation.title || '')
          .toLowerCase()
          .includes(titleSearch.toLowerCase().trim()),
      ),
    [formations, titleSearch],
  );

  const pendingFormations = useMemo(
    () => {
      const list = filteredFormations.filter(
        (formation) =>
          !formation.published &&
          (pendingTypeFilter === 'ALL' || formation.type === pendingTypeFilter),
      );
      if (createdSort === 'oldest_first') {
        return list.sort((a, b) => createdTimestamp(a) - createdTimestamp(b));
      }
      return list.sort((a, b) => createdTimestamp(b) - createdTimestamp(a));
    },
    [filteredFormations, createdSort, pendingTypeFilter],
  );

  const publishedFormations = useMemo(
    () => {
      const list = filteredFormations.filter(
        (formation) =>
          formation.published &&
          (publishedTypeFilter === 'ALL' || formation.type === publishedTypeFilter),
      );
      if (createdSort === 'oldest_first') {
        return list.sort((a, b) => publishedTimestamp(a) - publishedTimestamp(b));
      }
      return list.sort((a, b) => publishedTimestamp(b) - publishedTimestamp(a));
    },
    [filteredFormations, createdSort, publishedTypeFilter],
  );

  const pendingTotalPages = Math.max(
    1,
    Math.ceil(pendingFormations.length / PAGE_SIZE),
  );
  const publishedTotalPages = Math.max(
    1,
    Math.ceil(publishedFormations.length / PAGE_SIZE),
  );

  const pendingRows = pendingFormations.slice(
    (pendingPage - 1) * PAGE_SIZE,
    pendingPage * PAGE_SIZE,
  );
  const publishedRows = publishedFormations.slice(
    (publishedPage - 1) * PAGE_SIZE,
    publishedPage * PAGE_SIZE,
  );

  useEffect(() => {
    if (pendingPage > pendingTotalPages) {
      setPendingPage(pendingTotalPages);
    }
  }, [pendingPage, pendingTotalPages]);

  useEffect(() => {
    if (publishedPage > publishedTotalPages) {
      setPublishedPage(publishedTotalPages);
    }
  }, [publishedPage, publishedTotalPages]);

  useEffect(() => {
    setPendingPage(1);
    setPublishedPage(1);
  }, [titleSearch, createdSort, pendingTypeFilter, publishedTypeFilter]);

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

  const filteredAnalyticsStudents = useMemo(() => {
    const rows = selectedAnalyticsEntry?.enrolledStudents || [];
    const query = analyticsStudentSearch.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((student) =>
      String(student.name || '').toLowerCase().includes(query),
    );
  }, [selectedAnalyticsEntry, analyticsStudentSearch]);

  const analyticsStudentTotalPages = Math.max(
    1,
    Math.ceil(filteredAnalyticsStudents.length / ANALYTICS_STUDENT_PAGE_SIZE),
  );
  const analyticsStudentRows = filteredAnalyticsStudents.slice(
    (analyticsStudentPage - 1) * ANALYTICS_STUDENT_PAGE_SIZE,
    analyticsStudentPage * ANALYTICS_STUDENT_PAGE_SIZE,
  );

  function openAnalyticsForFormation(formationId) {
    const exists = analyticsByFormationId.has(formationId);
    if (!exists) {
      pushToast('Analytics data for this formation is not ready yet.', 'error');
      return;
    }

    setAnalyticsStudentSearch('');
    setAnalyticsStudentPage(1);
    setSelectedAnalyticsFormationId(formationId);
  }

  function closeAnalyticsModal() {
    setAnalyticsStudentSearch('');
    setAnalyticsStudentPage(1);
    setSelectedAnalyticsFormationId(null);
  }

  function openDeleteConfirmation(formationId) {
    setConfirmDeleteFormationId(formationId);
  }

  function closeDeleteConfirmation() {
    if (deletingId) return;
    setConfirmDeleteFormationId(null);
  }

  function openCreateFormationModal() {
    setCreateFormationForm(INITIAL_FORMATION_FORM);
    setCreateFormationThumbName('');
    setIsCreateFormationModalOpen(true);
  }

  function closeCreateFormationModal(force = false) {
    if (creatingFormation && !force) return;
    setIsCreateFormationModalOpen(false);
  }

  function updateCreateFormationField(event) {
    const { name, value } = event.target;
    setCreateFormationForm((prev) => {
      if (name === 'type') {
        return {
          ...prev,
          type: value,
          location: value === 'PRESENTIEL' ? prev.location : '',
          startDate: value === 'PRESENTIEL' ? prev.startDate : '',
          endDate: value === 'PRESENTIEL' ? prev.endDate : '',
        };
      }

      return { ...prev, [name]: value };
    });
  }

  async function handleCreateFormationThumbnail(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setCreateFormationThumbUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const data = await apiRequest('/formations/thumbnail', {
        method: 'POST',
        token: user.token,
        body: formData,
      });
      const url = data?.url || '';
      setCreateFormationForm((prev) => ({ ...prev, profileImageUrl: url }));
      setCreateFormationThumbName(file.name || 'thumbnail');
      pushToast('Thumbnail uploaded.', 'success');
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setCreateFormationThumbUploading(false);
      event.target.value = '';
    }
  }

  async function createFormation(event) {
    event.preventDefault();
    setCreatingFormation(true);

    try {
      const payload = {
        title: createFormationForm.title,
        description: createFormationForm.description,
        price: Number(createFormationForm.price),
        type: createFormationForm.type,
      };

      if (createFormationForm.profileImageUrl) {
        payload.profileImageUrl = createFormationForm.profileImageUrl;
      }
      if (createFormationForm.location) payload.location = createFormationForm.location;
      if (createFormationForm.type === 'PRESENTIEL') {
        if (createFormationForm.startDate) payload.startDate = createFormationForm.startDate;
        if (createFormationForm.endDate) payload.endDate = createFormationForm.endDate;
      }

      await apiRequest('/formations', {
        method: 'POST',
        token: user.token,
        body: payload,
      });

      await loadFormations();
      await loadAnalytics();
      setPendingPage(1);
      closeCreateFormationModal(true);
      setCreateFormationThumbName('');
      pushToast('Formation created.', 'success');
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setCreatingFormation(false);
    }
  }

  const formationToDelete = confirmDeleteFormationId
    ? formations.find((item) => item.id === confirmDeleteFormationId)
    : null;

  useEffect(() => {
    setAnalyticsStudentPage(1);
  }, [analyticsStudentSearch, selectedAnalyticsFormationId]);

  useEffect(() => {
    if (analyticsStudentPage > analyticsStudentTotalPages) {
      setAnalyticsStudentPage(analyticsStudentTotalPages);
    }
  }, [analyticsStudentPage, analyticsStudentTotalPages]);

  return (
    <section className="stack formateur-dashboard-page admin-skin-page">
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
            onClick={openCreateFormationModal}
          >
            Add Formation
          </button>
        </div>
      </div>

      <div className="card formateur-formations-card">
        <div className="card-head-row">
          <h2>Pending Formations</h2>
          <StatusBadge
            label={`${pendingFormations.length} drafts`}
            tone={pendingFormations.length > 0 ? 'orange' : 'gray'}
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
            value={pendingTypeFilter}
            onChange={(event) => setPendingTypeFilter(event.target.value)}
          >
            <option value="ALL">All types</option>
            <option value="ONLINE">Online only</option>
            <option value="PRESENTIEL">Presentiel only</option>
          </select>
          <select
            value={createdSort}
            onChange={(event) => setCreatedSort(event.target.value)}
          >
            <option value="newest_first">Newest first (Default)</option>
            <option value="oldest_first">Oldest first</option>
          </select>
        </div>

        <div className="table-wrap">
          <table className="formateur-formations-table pending-formations-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Type</th>
                <th>Price</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingRows.map((formation) => (
                <tr key={formation.id}>
                  <td>{formation.id}</td>
                  <td
                    className="formateur-formation-title-cell"
                    title={formation.title}
                  >
                    {formation.title}
                  </td>
                  <td>
                    <StatusBadge
                      tone={formation.type === 'ONLINE' ? 'blue' : 'orange'}
                      label={formation.type}
                    />
                  </td>
                  <td>{formation.price}</td>
                  <td>
                    <StatusBadge
                      tone="gray"
                      label="Draft"
                    />
                  </td>
                  <td>
                    <div className="row action-btn-group">
                      <button
                        type="button"
                        className="action-btn action-page"
                        onClick={() =>
                          navigate(`/formateur/formations/${formation.id}`)
                        }
                      >
                        <img src="/images/share.png" alt="" className="btn-inline-icon" />
                        Open
                      </button>
                      <LoadingButton
                        className="action-btn action-publish"
                        type="button"
                        isLoading={publishingId === formation.id}
                        loadingText="Working..."
                        disabled={false}
                        onClick={() => publishFormation(formation.id)}
                      >
                        <img src="/images/send.png" alt="" className="btn-inline-icon" />
                        Publish
                      </LoadingButton>
                      <LoadingButton
                        className="action-btn action-delete pending-formation-delete-btn"
                        type="button"
                        isLoading={deletingId === formation.id}
                        loadingText="Deleting..."
                        disabled={false}
                        onClick={() => openDeleteConfirmation(formation.id)}
                      >
                        <span className="action-delete-icon" aria-hidden="true">
                          {'\uD83D\uDDD1'}
                        </span>
                        Delete
                      </LoadingButton>
                    </div>
                  </td>
                </tr>
              ))}
              {pendingRows.length === 0 && (
                <tr>
                  <td colSpan={6}>No pending draft formations.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar">
          <button
            type="button"
            className="action-btn action-page"
            onClick={() => setPendingPage((prev) => Math.max(1, prev - 1))}
            disabled={pendingPage === 1}
          >
            Prev
          </button>
          <span>
            Page {pendingPage} / {pendingTotalPages}
          </span>
          <button
            type="button"
            className="action-btn action-page"
            onClick={() =>
              setPendingPage((prev) => Math.min(pendingTotalPages, prev + 1))
            }
            disabled={pendingPage === pendingTotalPages}
          >
            Next
          </button>
        </div>
      </div>

      <div className="card formateur-formations-card">
        <div className="card-head-row">
          <h2>Formation Analytics</h2>
          <StatusBadge
            label={`${publishedFormations.length} published`}
            tone={publishedFormations.length > 0 ? 'green' : 'gray'}
          />
        </div>
        {analyticsData?.generatedAt && (
          <p className="hint">
            Last refresh: {new Date(analyticsData.generatedAt).toLocaleString()}
          </p>
        )}

        {analyticsLoading && <p className="hint">Loading analytics...</p>}
        <div className="table-toolbar">
          <input
            type="text"
            value={titleSearch}
            onChange={(event) => setTitleSearch(event.target.value)}
            placeholder="Search by formation title"
          />
          <select
            value={publishedTypeFilter}
            onChange={(event) => setPublishedTypeFilter(event.target.value)}
          >
            <option value="ALL">All types</option>
            <option value="ONLINE">Online only</option>
            <option value="PRESENTIEL">Presentiel only</option>
          </select>
          <select
            value={createdSort}
            onChange={(event) => setCreatedSort(event.target.value)}
          >
            <option value="newest_first">Newest first (Default)</option>
            <option value="oldest_first">Oldest first</option>
          </select>
        </div>
        <div className="table-wrap">
          <table className="formateur-formations-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Type</th>
                <th>Price</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {publishedRows.map((formation) => (
                <tr key={formation.id}>
                  <td>{formation.id}</td>
                  <td
                    className="formateur-formation-title-cell"
                    title={formation.title}
                  >
                    {formation.title}
                  </td>
                  <td>
                    <StatusBadge
                      tone={formation.type === 'ONLINE' ? 'blue' : 'orange'}
                      label={formation.type}
                    />
                  </td>
                  <td>{formation.price}</td>
                  <td>
                    <StatusBadge tone="green" label="Published" />
                  </td>
                  <td>
                    <div className="row action-btn-group">
                      <button
                        type="button"
                        className="action-btn action-page"
                        onClick={() =>
                          navigate(`/formateur/formations/${formation.id}`)
                        }
                      >
                        <img src="/images/analyzing.png" alt="" className="btn-inline-icon" />
                        View
                      </button>
                      <button
                        type="button"
                        className="action-btn action-page"
                        onClick={() => openAnalyticsForFormation(formation.id)}
                      >
                        <img src="/images/graph.png" alt="" className="btn-inline-icon" />
                        Stats
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {publishedRows.length === 0 && (
                <tr>
                  <td colSpan={6}>No published formations yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar">
          <button
            type="button"
            className="action-btn action-page"
            onClick={() => setPublishedPage((prev) => Math.max(1, prev - 1))}
            disabled={publishedPage === 1}
          >
            Prev
          </button>
          <span>
            Page {publishedPage} / {publishedTotalPages}
          </span>
          <button
            type="button"
            className="action-btn action-page"
            onClick={() =>
              setPublishedPage((prev) => Math.min(publishedTotalPages, prev + 1))
            }
            disabled={publishedPage === publishedTotalPages}
          >
            Next
          </button>
        </div>
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
                                      label={
                                        isCompleted ? 'Completed' : 'In Progress'
                                      }
                                      tone={isCompleted ? 'green' : 'orange'}
                                    />
                                  </td>
                                )}
                                {!isPresentiel && (
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

      {isCreateFormationModalOpen && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <button
            type="button"
            className="admin-modal-backdrop"
            onClick={closeCreateFormationModal}
            aria-label="Close create formation modal"
            disabled={creatingFormation}
          />
          <article className="admin-modal-card create-formation-modal">
            <div className="admin-modal-head">
              <h2>Create Formation</h2>
              <button
                type="button"
                className="admin-modal-close create-formation-close-btn"
                onClick={closeCreateFormationModal}
                aria-label="Close create formation modal"
                disabled={creatingFormation}
              >
                x
              </button>
            </div>
            <div className="admin-modal-body">
              <form className="grid" onSubmit={createFormation}>
                <input
                  id="create-formation-thumb"
                  className="formation-thumb-input"
                  type="file"
                  accept="image/*"
                  onChange={handleCreateFormationThumbnail}
                  disabled={creatingFormation || createFormationThumbUploading}
                />
                <label
                  htmlFor="create-formation-thumb"
                  className="formation-thumb-link"
                >
                  <img src="/images/gallery.png" alt="" />
                  <span>
                    {createFormationThumbUploading
                      ? 'Uploading thumbnail...'
                      : createFormationForm.profileImageUrl
                      ? 'Change Thumbnail Photo'
                      : 'Add Thumbnail Photo'}
                  </span>
                </label>
                {createFormationThumbName ? (
                  <p className="hint formation-thumb-name">
                    {createFormationThumbName}
                  </p>
                ) : null}
                <input
                  name="title"
                  value={createFormationForm.title}
                  onChange={updateCreateFormationField}
                  placeholder="Title"
                  required
                />
                <textarea
                  name="description"
                  value={createFormationForm.description}
                  onChange={updateCreateFormationField}
                  placeholder="Description"
                  required
                />
                <input
                  name="price"
                  type="number"
                  min="0"
                  value={createFormationForm.price}
                  onChange={updateCreateFormationField}
                  placeholder="Price"
                  required
                />
                <select
                  name="type"
                  value={createFormationForm.type}
                  onChange={updateCreateFormationField}
                >
                  <option value="ONLINE">ONLINE</option>
                  <option value="PRESENTIEL">PRESENTIEL</option>
                </select>
                {createFormationForm.type === 'PRESENTIEL' && (
                  <>
                    <input
                      name="location"
                      value={createFormationForm.location}
                      onChange={updateCreateFormationField}
                      placeholder="Location (optional)"
                    />
                    <input
                      name="startDate"
                      type="date"
                      value={createFormationForm.startDate}
                      onChange={updateCreateFormationField}
                    />
                    <input
                      name="endDate"
                      type="date"
                      value={createFormationForm.endDate}
                      onChange={updateCreateFormationField}
                    />
                  </>
                )}
                <div className="row create-formation-actions">
                  <button
                    type="submit"
                    className="action-btn modal-save-btn create-formation-save-btn formateur-popup-save-btn"
                    disabled={creatingFormation}
                  >
                    {creatingFormation ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    type="button"
                    className="action-btn modal-cancel-btn create-formation-cancel-btn formateur-popup-cancel-btn"
                    onClick={closeCreateFormationModal}
                    disabled={creatingFormation}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </article>
        </div>
      )}

      {confirmDeleteFormationId && (
        <div className="formateur-analytics-modal-backdrop" role="dialog" aria-modal="true">
          <article className="formateur-analytics-modal confirm-delete-modal">
            <div className="formateur-analytics-modal-head">
              <h2>Delete Formation</h2>
              <button
                type="button"
                className="formateur-analytics-modal-close"
                onClick={closeDeleteConfirmation}
                aria-label="Close delete confirmation"
                disabled={Boolean(deletingId)}
              >
                x
              </button>
            </div>

            <div className="grid">
              <p>
                Are you sure you want to delete this pending formation
                {formationToDelete ? ` "${formationToDelete.title}"` : ''}?
                This action cannot be undone.
              </p>
              <div className="row confirm-delete-actions">
                <button
                  type="button"
                  className="action-btn modal-cancel-btn formateur-confirm-cancel-btn"
                  onClick={closeDeleteConfirmation}
                  disabled={Boolean(deletingId)}
                >
                  Cancel
                </button>
                <LoadingButton
                  type="button"
                  className="action-btn action-delete formateur-confirm-delete-btn"
                  isLoading={deletingId === confirmDeleteFormationId}
                  loadingText="Deleting..."
                  disabled={false}
                  onClick={() => deletePendingFormation(confirmDeleteFormationId)}
                >
                  <span className="action-delete-icon" aria-hidden="true">
                    {'\uD83D\uDDD1'}
                  </span>
                  Delete
                </LoadingButton>
              </div>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
