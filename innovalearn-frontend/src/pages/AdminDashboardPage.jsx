import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api';
import { getCurrentUser } from '../auth';
import ProfileSidebar from '../components/ProfileSidebar';
import StatusBadge from '../components/StatusBadge';
import LoadingButton from '../components/LoadingButton';
import {
  hasLocalTourDone,
  markTourSeen,
  startOnboardingTour,
} from '../tour/onboardingTour';

const PAGE_SIZE = 3;
const ANALYTICS_STUDENT_PAGE_SIZE = 5;
const FORMATION_PUBLISH_TS_KEY = 'formateur_published_at_map_v1';
const FORMATEUR_DASHBOARD_RETURN_SECTION_KEY = 'formateur_dashboard_return_section';
const FORMATEUR_DASHBOARD_STATE_KEY = 'formateur_dashboard_state_v1';
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

function readFormateurDashboardState() {
  try {
    const raw = sessionStorage.getItem(FORMATEUR_DASHBOARD_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeFormateurDashboardState(nextState) {
  try {
    sessionStorage.setItem(
      FORMATEUR_DASHBOARD_STATE_KEY,
      JSON.stringify(nextState),
    );
  } catch {
    // ignore storage failures
  }
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
  const formateurTourRef = useRef(null);
  const formateurAutoTourStartedRef = useRef(false);
  const restoredDashboardState = useMemo(
    () => readFormateurDashboardState(),
    [],
  );

  const [formations, setFormations] = useState([]);
  const [formationsLoaded, setFormationsLoaded] = useState(false);
  const [hasSeenTour, setHasSeenTour] = useState(true);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [publishingId, setPublishingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteFormationId, setConfirmDeleteFormationId] = useState(null);
  const [titleSearch, setTitleSearch] = useState(
    String(restoredDashboardState?.titleSearch || ''),
  );
  const [createdSort, setCreatedSort] = useState(
    restoredDashboardState?.createdSort === 'oldest_first'
      ? 'oldest_first'
      : 'newest_first',
  );
  const [pendingTypeFilter, setPendingTypeFilter] = useState(
    restoredDashboardState?.pendingTypeFilter || 'ALL',
  );
  const [publishedTypeFilter, setPublishedTypeFilter] = useState(
    restoredDashboardState?.publishedTypeFilter || 'ALL',
  );
  const [pendingPage, setPendingPage] = useState(
    Math.max(1, Number(restoredDashboardState?.pendingPage || 1)),
  );
  const [publishedPage, setPublishedPage] = useState(
    Math.max(1, Number(restoredDashboardState?.publishedPage || 1)),
  );
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
  const pendingSectionRef = useRef(null);
  const analyticsSectionRef = useRef(null);
  const skipFirstFilterResetRef = useRef(true);
  const restoredScrollDoneRef = useRef(false);
  const restoredPaginationAppliedRef = useRef(false);

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
    } finally {
      setFormationsLoaded(true);
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

  async function loadTourStatus() {
    try {
      const profile = await apiRequest('/users/me', {
        token: user.token,
      });
      setHasSeenTour(Boolean(profile?.hasSeenTour));
    } catch {
      // keep default true to avoid unwanted auto popups on failures
    }
  }

  function launchFormateurTour() {
    const tour = startOnboardingTour({
      steps: [
        {
          element: '[data-tour="formateur-header-card"]',
          popover: {
            title: 'Dashboard header',
            description:
              'Welcome! This is your Formateur Dashboard where you manage all your formations.',
          },
        },
        {
          element: '[data-tour="formateur-kpi-cards"]',
          popover: {
            title: 'KPI cards',
            description:
              'These show your total formations, published count, drafts and enrolled students at a glance.',
          },
        },
        {
          element: '[data-tour="formateur-pending-table"]',
          popover: {
            title: 'Pending formations',
            description:
              'Your draft formations appear here. Open, publish or delete them from this table.',
          },
        },
        {
          element: '[data-tour="formateur-analytics-table"]',
          popover: {
            title: 'Formation analytics',
            description:
              'Your published formations are here. Click Stats to see detailed student performance analytics.',
          },
        },
        {
          element: '[data-tour="formateur-add-formation-btn"]',
          popover: {
            title: 'Create formation',
            description:
              'Ready to create? Click here to add a new formation and start building your course content.',
          },
        },
      ],
    onFinish: () => {
      setHasSeenTour(true); // ← add this line
      markTourSeen({ token: user?.token, userId: user?.userId });
    },
  });
  if (tour) formateurTourRef.current = tour;
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

  function persistDashboardSnapshot(overrides = {}) {
    const existing = readFormateurDashboardState() || {};
    const nextSnapshot = {
      titleSearch,
      createdSort,
      pendingTypeFilter,
      publishedTypeFilter,
      pendingPage,
      publishedPage,
      returnSection:
        overrides.returnSection ??
        existing.returnSection ??
        sessionStorage.getItem(FORMATEUR_DASHBOARD_RETURN_SECTION_KEY) ??
        'pending',
      scrollY:
        Number.isFinite(overrides.scrollY) && overrides.scrollY >= 0
          ? overrides.scrollY
          : typeof window !== 'undefined'
            ? window.scrollY
            : Number(existing.scrollY || 0),
    };
    writeFormateurDashboardState(nextSnapshot);
  }

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      await Promise.all([loadFormations(), loadAnalytics(), loadTourStatus()]);
      if (active) setInitialDataLoaded(true);
    }

    bootstrap();

    return () => {
      active = false;
      if (formateurTourRef.current?.isActive?.()) {
        formateurTourRef.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (!user?.userId || !initialDataLoaded) return;
    if (formateurAutoTourStartedRef.current) return;
    if (hasSeenTour || hasLocalTourDone(user.userId)) return;

    const timeoutId = setTimeout(() => {
      formateurAutoTourStartedRef.current = true;
      launchFormateurTour();
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [hasSeenTour, initialDataLoaded, user?.userId]);

  useEffect(() => {
    if (!initialDataLoaded) return;

    let forced = false;
    try {
      forced = sessionStorage.getItem('innova_force_tour') === '1';
      if (forced) sessionStorage.removeItem('innova_force_tour');
    } catch {
      forced = false;
    }

    if (!forced) return;

    formateurAutoTourStartedRef.current = true;
    if (formateurTourRef.current?.isActive?.()) {
      formateurTourRef.current.destroy();
    }
    launchFormateurTour();
  }, [initialDataLoaded]);

  useEffect(() => {
    function handleManualTourStart() {
      formateurAutoTourStartedRef.current = true;
      if (formateurTourRef.current?.isActive?.()) {
        formateurTourRef.current.destroy();
      }
      launchFormateurTour();
    }

    window.addEventListener('innova:start-tour', handleManualTourStart);
    return () =>
      window.removeEventListener('innova:start-tour', handleManualTourStart);
  }, []);

  useEffect(() => {
    persistDashboardSnapshot();
  }, [
    titleSearch,
    createdSort,
    pendingTypeFilter,
    publishedTypeFilter,
    pendingPage,
    publishedPage,
  ]);

  useEffect(() => {
    if (restoredScrollDoneRef.current) return undefined;

    const sectionFromClick = sessionStorage.getItem(
      FORMATEUR_DASHBOARD_RETURN_SECTION_KEY,
    );
    const restoredSection = sectionFromClick || restoredDashboardState?.returnSection;
    const restoredScrollY = Number(restoredDashboardState?.scrollY);

    if (
      Number.isFinite(restoredScrollY) &&
      restoredScrollY > 0 &&
      formations.length === 0
    ) {
      return undefined;
    }

    let timeoutId = null;
    const frame = requestAnimationFrame(() => {
      const restore = () => {
        if (Number.isFinite(restoredScrollY) && restoredScrollY >= 0) {
          window.scrollTo({ top: restoredScrollY, behavior: 'auto' });
        } else if (restoredSection) {
          const target =
            restoredSection === 'analytics'
              ? analyticsSectionRef.current
              : pendingSectionRef.current;
          target?.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
      };

      restore();
      timeoutId = setTimeout(restore, 120);
      sessionStorage.removeItem(FORMATEUR_DASHBOARD_RETURN_SECTION_KEY);
      restoredScrollDoneRef.current = true;
    });

    return () => {
      cancelAnimationFrame(frame);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [formations.length, restoredDashboardState]);

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
    if (!formationsLoaded) return;
    if (pendingPage > pendingTotalPages) {
      setPendingPage(pendingTotalPages);
    }
  }, [pendingPage, pendingTotalPages, formationsLoaded]);

  useEffect(() => {
    if (!formationsLoaded) return;
    if (publishedPage > publishedTotalPages) {
      setPublishedPage(publishedTotalPages);
    }
  }, [publishedPage, publishedTotalPages, formationsLoaded]);

  useEffect(() => {
    if (!formationsLoaded || restoredPaginationAppliedRef.current) return;

    const saved = readFormateurDashboardState();
    if (saved) {
      const savedPendingPage = Math.max(1, Number(saved.pendingPage || 1));
      const savedPublishedPage = Math.max(1, Number(saved.publishedPage || 1));
      setPendingPage(savedPendingPage);
      setPublishedPage(savedPublishedPage);
    }

    restoredPaginationAppliedRef.current = true;
  }, [formationsLoaded]);

  useEffect(() => {
    if (skipFirstFilterResetRef.current) {
      skipFirstFilterResetRef.current = false;
      return;
    }
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

  const globalOverview = useMemo(() => {
    const totalFormations = analyticsFormations.length;
    const publishedFormations = analyticsFormations.filter(
      (entry) => Boolean(entry?.formation?.published),
    ).length;
    const totalCourses = analyticsFormations.reduce(
      (sum, entry) => sum + (entry.courseStatistics?.length || 0),
      0,
    );

    let totalStudentsEnrolled = 0;
    let totalApprovedStudents = 0;
    let totalCompletedStudents = 0;
    let weightedSuccessCompleted = 0;

    analyticsFormations.forEach((entry) => {
      const stats = entry.statistics || {};
      const approved = Number(stats.totalApprovedStudents || 0);
      const completed = Number(stats.totalCompletedStudents || 0);
      const enrolled = Number(stats.totalStudentsEnrolled || 0);
      const successRate = Number(stats.successRate || 0);

      totalStudentsEnrolled += enrolled;
      totalApprovedStudents += approved;
      totalCompletedStudents += completed;
      weightedSuccessCompleted += (approved * successRate) / 100;
    });

    const completionRate =
      totalApprovedStudents === 0
        ? 0
        : (totalCompletedStudents / totalApprovedStudents) * 100;
    const successRate =
      totalApprovedStudents === 0
        ? 0
        : (weightedSuccessCompleted / totalApprovedStudents) * 100;

    return {
      totalFormations,
      publishedFormations,
      draftFormations: Math.max(totalFormations - publishedFormations, 0),
      totalCourses,
      totalStudentsEnrolled,
      totalApprovedStudents,
      completionRate,
      successRate,
    };
  }, [analyticsFormations]);

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

      <div
        className="card panel-head formateur-dashboard-head"
        data-tour="formateur-header-card"
      >
        <span className="admin-saas-header-accent" aria-hidden="true" />
        <div className="admin-saas-header-intro">
          <span className="admin-saas-header-icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="#1263b9" strokeWidth="1.6" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="#1263b9" strokeWidth="1.6" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="#1263b9" strokeWidth="1.6" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="#1263b9" strokeWidth="1.6" />
            </svg>
          </span>
          <div className="admin-saas-header-copy">
            <h1>Formateur Dashboard</h1>
            <p className="hint">
              Manage your formations and monitor student learning analytics.
            </p>
          </div>
        </div>
        <div className="row formateur-dashboard-head-actions">
          <button
            type="button"
            className="formateur-add-formation-btn"
            data-tour="formateur-add-formation-btn"
            onClick={openCreateFormationModal}
          >
            +  Add Formation
          </button>
        </div>
      </div>

      <div className="card formateur-global-overview-card">
        <div className="card-head-row">
          <h2>Global Overview</h2>
          <div className="row">
            <StatusBadge
              label={`${globalOverview.totalFormations} formations`}
              tone={globalOverview.totalFormations > 0 ? 'blue' : 'gray'}
            />
            {analyticsLoading && (
              <span className="hint formateur-overview-loading">
                Refreshing...
              </span>
            )}
          </div>
        </div>
        <div
          className="admin-saas-kpi-grid formateur-overview-kpi-grid"
          data-tour="formateur-kpi-cards"
        >
          <article className="admin-saas-kpi-card">
            <p className="hint">Total Formations</p>
            <strong>{globalOverview.totalFormations}</strong>
            <span className="admin-saas-kpi-icon" aria-hidden="true">
              <img src="/images/learning.png" alt="" className="admin-saas-kpi-icon-img" />
            </span>
          </article>
          <article className="admin-saas-kpi-card">
            <p className="hint">Published</p>
            <strong>{globalOverview.publishedFormations}</strong>
            <span className="admin-saas-kpi-icon" aria-hidden="true">
              <img src="/images/send.png" alt="" className="admin-saas-kpi-icon-img" />
            </span>
          </article>
          <article className="admin-saas-kpi-card">
            <p className="hint">Draft</p>
            <strong>{globalOverview.draftFormations}</strong>
            <span className="admin-saas-kpi-icon" aria-hidden="true">
              <img src="/images/draft.png" alt="" className="admin-saas-kpi-icon-img" />
            </span>
          </article>
          <article className="admin-saas-kpi-card">
            <p className="hint">Students Enrolled</p>
            <strong>{globalOverview.totalStudentsEnrolled}</strong>
            <span className="admin-saas-kpi-icon" aria-hidden="true">
              <img src="/images/grad.png" alt="" className="admin-saas-kpi-icon-img" />
            </span>
          </article>
        </div>

        <div className="admin-saas-highlight-grid formateur-overview-highlight-grid">
          <article className="admin-saas-highlight-card">
            <span className="admin-saas-highlight-accent" aria-hidden="true" />
            <span className="admin-saas-highlight-badge" aria-hidden="true">
              %
            </span>
            <p className="hint">Completion Rate</p>
            <strong>{globalOverview.completionRate.toFixed(2)}%</strong>
          </article>
          <article className="admin-saas-highlight-card">
            <span className="admin-saas-highlight-accent" aria-hidden="true" />
            <span className="admin-saas-highlight-badge" aria-hidden="true">
              %
            </span>
            <p className="hint">Success Rate</p>
            <strong>{globalOverview.successRate.toFixed(2)}%</strong>
          </article>
        </div>
      </div>

      <div
        className="card formateur-formations-card"
        ref={pendingSectionRef}
        data-tour="formateur-pending-table"
      >
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
                        onClick={() => {
                          persistDashboardSnapshot({
                            returnSection: 'pending',
                            scrollY: window.scrollY,
                          });
                          sessionStorage.setItem(
                            FORMATEUR_DASHBOARD_RETURN_SECTION_KEY,
                            'pending',
                          );
                          navigate(`/formateur/formations/${formation.id}`);
                        }}
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

      <div
        className="card formateur-formations-card"
        ref={analyticsSectionRef}
        data-tour="formateur-analytics-table"
      >
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
                        onClick={() => {
                          persistDashboardSnapshot({
                            returnSection: 'analytics',
                            scrollY: window.scrollY,
                          });
                          sessionStorage.setItem(
                            FORMATEUR_DASHBOARD_RETURN_SECTION_KEY,
                            'analytics',
                          );
                          navigate(`/formateur/formations/${formation.id}`);
                        }}
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
