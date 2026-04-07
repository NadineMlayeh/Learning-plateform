import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { apiRequest, resolveApiAssetUrl } from '../api';
import { getCurrentUser } from '../auth';
import StatusBadge from '../components/StatusBadge';
import { useTranslation } from 'react-i18next';
import AdminStudentsPage from './AdminStudentsPage';
import AdminFormateursPage from './AdminFormateursPage';
import AdminFormationsPage from './AdminFormationsPage';
import AdminRevenuePage from './AdminRevenuePage';

const PAGE_SIZE = 3;
const INVOICE_DETAILS_PAGE_SIZE = 5;
const REVIEWS_PAGE_SIZE = 5;

function statusTone(status) {
  if (status === 'APPROVED') return 'green';
  if (status === 'PENDING') return 'orange';
  if (status === 'REJECTED') return 'red';
  return 'neutral';
}

function createdTimestamp(value, fallback = 0) {
  if (!value) return fallback;
  return new Date(value).getTime();
}

export default function AdminPage({ pushToast }) {
  const { t } = useTranslation();
  const user = getCurrentUser();
  const location = useLocation();
  const currentAdminPath = location.pathname.replace(/\/+$/, '') || '/admin';
  const dashboardAnchorMap = {
    '/admin/enrollments': 'students-enrollments',
    '/admin/formateur-approvals': 'formateur-approvals',
    '/admin/invoices': 'invoices',
  };
  const dashboardAnchor =
    dashboardAnchorMap[currentAdminPath] || location.hash.replace('#', '');
  const isDashboardSection =
    currentAdminPath === '/admin' || Boolean(dashboardAnchorMap[currentAdminPath]);
  const isStudentsGroupActive =
    currentAdminPath === '/admin/students' ||
    dashboardAnchor === 'students-enrollments';
  const isFormateursGroupActive =
    currentAdminPath === '/admin/formateurs' ||
    dashboardAnchor === 'formateur-approvals';
  const isInvoicesAnchorActive = dashboardAnchor === 'invoices';
  const isReviewsActive = currentAdminPath === '/admin/reviews';
  const isSettingsActive = currentAdminPath === '/admin/settings';

  const [globalOverview, setGlobalOverview] = useState(null);
  const [formateurs, setFormateurs] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [adminInvoices, setAdminInvoices] = useState([]);
  const [adminReviews, setAdminReviews] = useState([]);

  const [processingFormateurId, setProcessingFormateurId] = useState(null);
  const [processingEnrollmentId, setProcessingEnrollmentId] =
    useState(null);

  const [enrollmentSearch, setEnrollmentSearch] = useState('');
  const [enrollmentSort, setEnrollmentSort] = useState('newest');
  const [enrollmentPage, setEnrollmentPage] = useState(1);
  const [confirmRejectEnrollment, setConfirmRejectEnrollment] = useState(null);

  const [formateurSearch, setFormateurSearch] = useState('');
  const [formateurSort, setFormateurSort] = useState('newest');
  const [formateurPage, setFormateurPage] = useState(1);
  const [formateurPreview, setFormateurPreview] = useState(null);
  const [confirmRejectFormateur, setConfirmRejectFormateur] = useState(null);
  const [confirmResolveFormateur, setConfirmResolveFormateur] = useState(null);
  const [confirmDeleteRejectedFormateur, setConfirmDeleteRejectedFormateur] =
    useState(null);

  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceGroupSort, setInvoiceGroupSort] = useState('newest');
  const [invoicePage, setInvoicePage] = useState(1);
  const [expandedInvoiceStudentId, setExpandedInvoiceStudentId] =
    useState(null);
  const [invoiceDetailsSearch, setInvoiceDetailsSearch] = useState('');
  const [invoiceDetailsPage, setInvoiceDetailsPage] = useState(1);
  const [reviewsSearch, setReviewsSearch] = useState('');
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsTotalPages, setReviewsTotalPages] = useState(1);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [adminSettingsEmail, setAdminSettingsEmail] = useState('');
  const [adminPasswordForm, setAdminPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [savingAdminPassword, setSavingAdminPassword] = useState(false);
  const [adminPasswordError, setAdminPasswordError] = useState('');
  const [adminPasswordSuccess, setAdminPasswordSuccess] = useState('');

  async function loadFormateurs() {
    try {
      const users = await apiRequest('/users', { token: user.token });
      setFormateurs(users.filter((entry) => entry.role === 'FORMATEUR'));
    } catch (err) {
      pushToast(err.message, 'error');
    }
  }

  async function loadEnrollments() {
    try {
      const data = await apiRequest('/enrollments/admin/all', {
        token: user.token,
      });
      setEnrollments(data);
    } catch (err) {
      pushToast(err.message, 'error');
    }
  }

  async function loadAdminInvoices() {
    try {
      const data = await apiRequest('/invoices/admin', {
        token: user.token,
      });
      setAdminInvoices(data);
    } catch (err) {
      pushToast(err.message, 'error');
    }
  }

  async function loadAdminReviews(page = reviewsPage, search = reviewsSearch) {
    setLoadingReviews(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(REVIEWS_PAGE_SIZE),
      });
      if (search.trim()) {
        params.set('search', search.trim());
      }
      const data = await apiRequest(`/contact/admin/reviews?${params.toString()}`, {
        token: user.token,
      });
      setAdminReviews(Array.isArray(data?.rows) ? data.rows : []);
      setReviewsTotal(Number(data?.total || 0));
      setReviewsTotalPages(Math.max(1, Number(data?.totalPages || 1)));
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setLoadingReviews(false);
    }
  }

  async function loadOverview() {
    try {
      const data = await apiRequest('/admin/analytics/overview', {
        token: user.token,
      });
      setGlobalOverview(data);
    } catch (err) {
      pushToast(err.message, 'error');
    }
  }

  async function loadAdminSettingsProfile() {
    try {
      const current = await apiRequest('/users/me', { token: user.token });
      setAdminSettingsEmail(current?.email || '');
    } catch (err) {
      pushToast(err.message, 'error');
    }
  }

  async function saveAdminPassword(event) {
    event.preventDefault();
    setAdminPasswordError('');
    setAdminPasswordSuccess('');

    if (adminPasswordForm.newPassword !== adminPasswordForm.confirmNewPassword) {
      setAdminPasswordError(t('admin.adminPage.settings.passwordMatchError'));
      return;
    }

    setSavingAdminPassword(true);
    try {
      await apiRequest('/users/me/password', {
        method: 'PATCH',
        token: user.token,
        body: {
          email: adminSettingsEmail,
          oldPassword: adminPasswordForm.oldPassword,
          newPassword: adminPasswordForm.newPassword,
          confirmNewPassword: adminPasswordForm.confirmNewPassword,
        },
      });
      setAdminPasswordSuccess(t('admin.adminPage.settings.updateSuccess'));
      setAdminPasswordForm({
        oldPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });
    } catch (err) {
      setAdminPasswordError(err.message || t('admin.adminPage.settings.errorTitle'));
    } finally {
      setSavingAdminPassword(false);
    }
  }

  async function approveFormateur(id) {
    setProcessingFormateurId(id);
    try {
      await apiRequest(`/admin/formateur/${id}/approve`, {
        method: 'PATCH',
        token: user.token,
      });
      pushToast(t('admin.adminPage.formateurApprovals.approveSuccess', { id }), 'success');
      await loadFormateurs();
      await loadOverview();
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setProcessingFormateurId(null);
    }
  }

  async function rejectFormateur(id) {
    setProcessingFormateurId(id);
    try {
      await apiRequest(`/admin/formateur/${id}/reject`, {
        method: 'PATCH',
        token: user.token,
      });
      pushToast(t('admin.adminPage.formateurApprovals.rejectSuccess', { id }), 'success');
      setConfirmRejectFormateur(null);
      await loadFormateurs();
      await loadOverview();
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setProcessingFormateurId(null);
    }
  }

  async function resolveRejectedFormateur(id, role) {
    setProcessingFormateurId(id);
    try {
      await apiRequest(`/admin/formateur/${id}/resolve-rejected`, {
        method: 'PATCH',
        token: user.token,
        body: { role },
      });
      pushToast(
        role === 'STUDENT'
          ? t('admin.adminPage.formateurApprovals.resolveStudentSuccess', { id })
          : t('admin.adminPage.formateurApprovals.resolveFormateurSuccess', { id }),
        'success',
      );
      setConfirmResolveFormateur(null);
      await loadFormateurs();
      await loadOverview();
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setProcessingFormateurId(null);
    }
  }

  async function deleteRejectedFormateur(id) {
    setProcessingFormateurId(id);
    try {
      await apiRequest(`/admin/formateurs/${id}`, {
        method: 'DELETE',
        token: user.token,
      });
      pushToast(t('admin.adminPage.formateurApprovals.deleteSuccess', { id }), 'success');
      setConfirmDeleteRejectedFormateur(null);
      await loadFormateurs();
      await loadOverview();
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setProcessingFormateurId(null);
    }
  }

  async function updateEnrollmentStatus(enrollmentId, action) {
    setProcessingEnrollmentId(enrollmentId);

    try {
      await apiRequest(`/admin/enrollment/${enrollmentId}/${action}`, {
        method: 'PATCH',
        token: user.token,
      });

      pushToast(
        t('admin.adminPage.enrollments.actionSuccess', { id: enrollmentId, action }),
        'success',
      );

      if (action === 'reject') {
        setConfirmRejectEnrollment(null);
      }

      await loadEnrollments();
      await loadAdminInvoices();
      await loadOverview();
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setProcessingEnrollmentId(null);
    }
  }

  const pendingCount = useMemo(
    () => enrollments.filter((entry) => entry.status === 'PENDING').length,
    [enrollments],
  );

  const visibleEnrollments = useMemo(() => {
    let filtered = enrollments.filter((entry) =>
      (entry.student?.name || '')
        .toLowerCase()
        .includes(enrollmentSearch.toLowerCase().trim()),
    );

    if (enrollmentSort === 'approved_only') {
      filtered = filtered.filter((entry) => entry.status === 'APPROVED');
    } else if (enrollmentSort === 'rejected_only') {
      filtered = filtered.filter((entry) => entry.status === 'REJECTED');
    } else if (enrollmentSort === 'pending_only') {
      filtered = filtered.filter((entry) => entry.status === 'PENDING');
    }

    filtered.sort((a, b) => {
      if (enrollmentSort === 'oldest') {
        return createdTimestamp(a.createdAt, a.id) - createdTimestamp(b.createdAt, b.id);
      }
      return createdTimestamp(b.createdAt, b.id) - createdTimestamp(a.createdAt, a.id);
    });

    return filtered;
  }, [enrollments, enrollmentSearch, enrollmentSort]);

  const enrollmentTotalPages = Math.max(
    1,
    Math.ceil(visibleEnrollments.length / PAGE_SIZE),
  );
  const enrollmentPageRows = visibleEnrollments.slice(
    (enrollmentPage - 1) * PAGE_SIZE,
    enrollmentPage * PAGE_SIZE,
  );

  const visibleFormateurs = useMemo(() => {
    let filtered = formateurs.filter((entry) =>
      (entry.name || '')
        .toLowerCase()
        .includes(formateurSearch.toLowerCase().trim()),
    );

    if (formateurSort === 'approved_only') {
      filtered = filtered.filter((entry) => entry.formateurStatus === 'APPROVED');
    } else if (formateurSort === 'rejected_only') {
      filtered = filtered.filter((entry) => entry.formateurStatus === 'REJECTED');
    } else if (formateurSort === 'pending_only') {
      filtered = filtered.filter((entry) => entry.formateurStatus === 'PENDING');
    }

    filtered.sort((a, b) => {
      if (formateurSort === 'oldest') {
        return createdTimestamp(a.createdAt, a.id) - createdTimestamp(b.createdAt, b.id);
      }

      return createdTimestamp(b.createdAt, b.id) - createdTimestamp(a.createdAt, a.id);
    });

    return filtered;
  }, [formateurs, formateurSearch, formateurSort]);

  const formateurTotalPages = Math.max(
    1,
    Math.ceil(visibleFormateurs.length / PAGE_SIZE),
  );
  const formateurPageRows = visibleFormateurs.slice(
    (formateurPage - 1) * PAGE_SIZE,
    formateurPage * PAGE_SIZE,
  );

  const groupedInvoices = useMemo(() => {
    const groupsMap = new Map();

    adminInvoices.forEach((entry) => {
      const studentId = entry.student?.id ?? `student-${entry.id}`;
      if (!groupsMap.has(studentId)) {
        groupsMap.set(studentId, {
          studentId,
          studentName: entry.student?.name || 'Unknown student',
          studentEmail: entry.student?.email || '-',
          studentPhone:
            entry.student?.phoneNumber || entry.student?.phone || '-',
          invoices: [],
          totalAmount: 0,
          latestIssuedAt: null,
        });
      }

      const group = groupsMap.get(studentId);
      group.invoices.push(entry);
      group.totalAmount += Number(entry.amount || 0);
      if (
        !group.latestIssuedAt ||
        createdTimestamp(entry.createdAt) >
          createdTimestamp(group.latestIssuedAt)
      ) {
        group.latestIssuedAt = entry.createdAt;
      }
    });

    let groups = Array.from(groupsMap.values()).map((group) => ({
      ...group,
      invoices: [...group.invoices].sort(
        (a, b) => createdTimestamp(b.createdAt, b.id) - createdTimestamp(a.createdAt, a.id),
      ),
      highestInvoiceAmount: Math.max(
        0,
        ...group.invoices.map((entry) => Number(entry.amount || 0)),
      ),
    }));

    const q = invoiceSearch.toLowerCase().trim();
    if (q) {
      groups = groups.filter((group) => {
        const inStudent = group.studentName.toLowerCase().includes(q);
        const inAnyFormation = group.invoices.some((entry) =>
          (entry.enrollment?.formation?.title || '')
            .toLowerCase()
            .includes(q),
        );

        return inStudent || inAnyFormation;
      });
    }

    groups.sort((a, b) => {
      if (invoiceGroupSort === 'oldest') {
        return createdTimestamp(a.latestIssuedAt) - createdTimestamp(b.latestIssuedAt);
      }

      if (invoiceGroupSort === 'highest_amount') {
        const diff = b.highestInvoiceAmount - a.highestInvoiceAmount;
        if (diff !== 0) return diff;
      }

      return createdTimestamp(b.latestIssuedAt) - createdTimestamp(a.latestIssuedAt);
    });

    return groups;
  }, [adminInvoices, invoiceSearch, invoiceGroupSort]);

  const invoiceTotalPages = Math.max(
    1,
    Math.ceil(groupedInvoices.length / PAGE_SIZE),
  );
  const invoicePageRows = groupedInvoices.slice(
    (invoicePage - 1) * PAGE_SIZE,
    invoicePage * PAGE_SIZE,
  );
  const expandedInvoiceGroup = useMemo(
    () =>
      groupedInvoices.find(
        (group) => group.studentId === expandedInvoiceStudentId,
      ) || null,
    [groupedInvoices, expandedInvoiceStudentId],
  );
  const filteredExpandedInvoiceRows = useMemo(() => {
    if (!expandedInvoiceGroup) return [];
    const query = invoiceDetailsSearch.trim().toLowerCase();
    if (!query) return expandedInvoiceGroup.invoices;
    return expandedInvoiceGroup.invoices.filter((entry) =>
      (entry.enrollment?.formation?.title || '').toLowerCase().includes(query),
    );
  }, [expandedInvoiceGroup, invoiceDetailsSearch]);
  const invoiceDetailsTotalPages = Math.max(
    1,
    Math.ceil(filteredExpandedInvoiceRows.length / INVOICE_DETAILS_PAGE_SIZE),
  );
  const invoiceDetailsRows = filteredExpandedInvoiceRows.slice(
    (invoiceDetailsPage - 1) * INVOICE_DETAILS_PAGE_SIZE,
    invoiceDetailsPage * INVOICE_DETAILS_PAGE_SIZE,
  );

  useEffect(() => {
    if (!isDashboardSection) return;
    loadOverview();
    loadFormateurs();
    loadEnrollments();
    loadAdminInvoices();
  }, [isDashboardSection]);

  useEffect(() => {
    if (!isSettingsActive) return;
    loadAdminSettingsProfile();
  }, [isSettingsActive]);

  useEffect(() => {
    if (!isReviewsActive) return;
    loadAdminReviews(reviewsPage, reviewsSearch);
  }, [isReviewsActive, reviewsPage, reviewsSearch]);

  useEffect(() => {
    if (!isDashboardSection) return;
    if (!dashboardAnchor) return;
    const section = document.getElementById(dashboardAnchor);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isDashboardSection, dashboardAnchor]);

  useEffect(() => {
    setEnrollmentPage(1);
  }, [enrollmentSearch, enrollmentSort]);

  useEffect(() => {
    setFormateurPage(1);
  }, [formateurSearch, formateurSort]);

  useEffect(() => {
    setInvoicePage(1);
    setExpandedInvoiceStudentId(null);
  }, [invoiceSearch, invoiceGroupSort]);

  useEffect(() => {
    setInvoiceDetailsSearch('');
    setInvoiceDetailsPage(1);
  }, [expandedInvoiceStudentId]);

  useEffect(() => {
    setInvoiceDetailsPage(1);
  }, [invoiceDetailsSearch]);

  useEffect(() => {
    setReviewsPage(1);
  }, [reviewsSearch]);

  useEffect(() => {
    if (enrollmentPage > enrollmentTotalPages) {
      setEnrollmentPage(enrollmentTotalPages);
    }
  }, [enrollmentPage, enrollmentTotalPages]);

  useEffect(() => {
    if (formateurPage > formateurTotalPages) {
      setFormateurPage(formateurTotalPages);
    }
  }, [formateurPage, formateurTotalPages]);

  useEffect(() => {
    if (invoicePage > invoiceTotalPages) {
      setInvoicePage(invoiceTotalPages);
    }
  }, [invoicePage, invoiceTotalPages]);

  useEffect(() => {
    if (invoiceDetailsPage > invoiceDetailsTotalPages) {
      setInvoiceDetailsPage(invoiceDetailsTotalPages);
    }
  }, [invoiceDetailsPage, invoiceDetailsTotalPages]);

  useEffect(() => {
    if (reviewsPage > reviewsTotalPages) {
      setReviewsPage(reviewsTotalPages);
    }
  }, [reviewsPage, reviewsTotalPages]);

  function navItemClass(path) {
    return currentAdminPath === path
      ? 'admin-saas-nav-item is-active'
      : 'admin-saas-nav-item';
  }

  function previewImageUrl(entry) {
    if (!entry?.profileImageUrl) return '/images/student.png';
    return resolveApiAssetUrl(entry.profileImageUrl);
  }

  return (
    <section className="admin-saas-page admin-skin-page">
      <aside className="admin-saas-sidebar">
        <div className="admin-saas-profile">
          <div className="admin-saas-avatar-wrap">
            <img
              src={resolveApiAssetUrl(user.profilePictureUrl) || '/images/student.png'}
              alt={user.name || 'Admin user'}
              className="admin-saas-avatar"
            />
          </div>
          <div>
            <h3>{user.name || 'Admin User'}</h3>
            <p>{user.role || 'ADMIN'}</p>
          </div>
        </div>

        <nav className="admin-saas-nav">
          <Link className={navItemClass('/admin')} to="/admin">
            <span className="admin-saas-nav-icon" aria-hidden="true">
              <img src="/images/dashboard.png" alt="" className="admin-saas-nav-icon-img" />
            </span>
            {t('admin.adminPage.sidebar.dashboard')}
          </Link>
          <div className={`admin-saas-nav-group${isStudentsGroupActive ? ' is-active' : ''}`}>
            <Link className="admin-saas-nav-item admin-saas-nav-parent" to="/admin/students">
              <span className="admin-saas-nav-icon" aria-hidden="true">
                <img src="/images/person.png" alt="" className="admin-saas-nav-icon-img" />
              </span>
              {t('admin.adminPage.sidebar.students')}
            </Link>
            <div className="admin-saas-subnav">
              <Link className="admin-saas-subnav-item" to="/admin/students">
                {t('admin.adminPage.sidebar.studentsManagement')}
              </Link>
              <Link className="admin-saas-subnav-item" to="/admin#students-enrollments">
                {t('admin.adminPage.sidebar.studentsEnrollments')}
              </Link>
            </div>
          </div>
          <div className={`admin-saas-nav-group${isFormateursGroupActive ? ' is-active' : ''}`}>
            <Link className="admin-saas-nav-item admin-saas-nav-parent" to="/admin/formateurs">
              <span className="admin-saas-nav-icon" aria-hidden="true">
                <img src="/images/userr.png" alt="" className="admin-saas-nav-icon-img" />
              </span>
              {t('admin.adminPage.sidebar.formateurs')}
            </Link>
            <div className="admin-saas-subnav">
              <Link className="admin-saas-subnav-item" to="/admin/formateurs">
                {t('admin.adminPage.sidebar.formateursManagement')}
              </Link>
              <Link className="admin-saas-subnav-item" to="/admin#formateur-approvals">
                {t('admin.adminPage.sidebar.formateurApprovals')}
              </Link>
            </div>
          </div>
          <Link className={navItemClass('/admin/formations')} to="/admin/formations">
            <span className="admin-saas-nav-icon" aria-hidden="true">
              <img src="/images/school.png" alt="" className="admin-saas-nav-icon-img" />
            </span>
            {t('admin.adminPage.sidebar.formations')}
          </Link>
          <Link className={navItemClass('/admin/revenue')} to="/admin/revenue">
            <span className="admin-saas-nav-icon" aria-hidden="true">
              <img src="/images/euro.png" alt="" className="admin-saas-nav-icon-img" />
            </span>
            {t('admin.adminPage.sidebar.revenue')}
          </Link>
          <Link className={navItemClass('/admin/reviews')} to="/admin/reviews">
            <span className="admin-saas-nav-icon" aria-hidden="true">
              <img src="/images/rating.png" alt="" className="admin-saas-nav-icon-img" />
            </span>
            {t('admin.adminPage.sidebar.reviews')}
          </Link>
          <Link
            className={`admin-saas-nav-item${isInvoicesAnchorActive ? ' is-active' : ''}`}
            to="/admin#invoices"
          >
            <span className="admin-saas-nav-icon" aria-hidden="true">
              <img src="/images/bill.png" alt="" className="admin-saas-nav-icon-img" />
            </span>
            {t('admin.adminPage.sidebar.invoices')}
          </Link>
        </nav>

        <div className="admin-saas-sidebar-bottom">
          <Link className={navItemClass('/admin/settings')} to="/admin/settings">
            <span className="admin-saas-nav-icon" aria-hidden="true">
              <img src="/images/gear.png" alt="" className="admin-saas-nav-icon-img" />
            </span>
            {t('admin.adminPage.sidebar.settings')}
          </Link>
        </div>
      </aside>

      <div className="admin-saas-main">
        <div className="card panel-head admin-saas-top-header">
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
              <h1>{t('admin.adminPage.header.title')}</h1>
              <p className="hint">
                {t('admin.adminPage.header.subtitle')}
              </p>
            </div>
          </div>
          <div className="admin-saas-quick-actions">
            <Link className="link-btn small-btn" to="/admin/students">
              {t('admin.adminPage.sidebar.students')}
            </Link>
            <Link className="link-btn small-btn" to="/admin/formateurs">
              {t('admin.adminPage.sidebar.formateurs')}
            </Link>
            <Link className="link-btn small-btn" to="/admin/formations">
              {t('admin.adminPage.sidebar.formations')}
            </Link>
            <Link className="link-btn small-btn" to="/admin/revenue">
              {t('admin.adminPage.sidebar.revenue')}
            </Link>
          </div>
        </div>

        {isDashboardSection ? (
          <>
        <div className="card admin-saas-section admin-saas-overview">
          <div className="card-head-row">
            <h2>{t('admin.adminPage.overview.title')}</h2>
            <button
              type="button"
              className="admin-reload-icon-btn"
              onClick={loadOverview}
              aria-label={t('admin.adminPage.overview.refreshOptions')}
              title={t('admin.adminPage.overview.refreshOptions')}
            >
              <img src="/images/refresh.png" alt="" className="admin-reload-icon" />
            </button>
          </div>
          <div className="admin-metric-grid admin-saas-kpi-grid">
            <article className="admin-metric-card admin-saas-kpi-card">
              <p className="hint">{t('admin.adminPage.overview.totalStudents')}</p>
              <strong>{globalOverview?.totalStudents ?? '-'}</strong>
              <span className="admin-saas-kpi-icon" aria-hidden="true">
                <img src="/images/grad.png" alt="" className="admin-saas-kpi-icon-img" />
              </span>
            </article>
            <article className="admin-metric-card admin-saas-kpi-card">
              <p className="hint">{t('admin.adminPage.overview.totalFormateurs')}</p>
              <strong>{globalOverview?.totalFormateurs ?? '-'}</strong>
              <span className="admin-saas-kpi-icon" aria-hidden="true">
                <img src="/images/user.png" alt="" className="admin-saas-kpi-icon-img" />
              </span>
            </article>
            <article className="admin-metric-card admin-saas-kpi-card">
              <p className="hint">{t('admin.adminPage.overview.totalFormations')}</p>
              <strong>{globalOverview?.totalFormations ?? '-'}</strong>
              <span className="admin-saas-kpi-icon" aria-hidden="true">
                <img src="/images/agreement.png" alt="" className="admin-saas-kpi-icon-img" />
              </span>
            </article>
            <article className="admin-metric-card admin-saas-kpi-card">
              <p className="hint">{t('admin.adminPage.overview.totalEnrollments')}</p>
              <strong>{globalOverview?.totalEnrollments ?? '-'}</strong>
              <span className="admin-saas-kpi-icon" aria-hidden="true">
                <img src="/images/enroll.png" alt="" className="admin-saas-kpi-icon-img" />
              </span>
            </article>
          </div>
          <div className="admin-saas-highlight-grid">
            <article className="admin-metric-card admin-saas-highlight-card">
              <span className="admin-saas-highlight-accent" />
              <span className="admin-saas-highlight-badge" aria-hidden="true">$</span>
              <p className="hint">{t('admin.adminPage.overview.totalRevenue')}</p>
              <strong>{Number(globalOverview?.totalRevenue || 0).toFixed(2)} TND</strong>
            </article>
            <article className="admin-metric-card admin-saas-highlight-card">
              <span className="admin-saas-highlight-accent" />
              <span className="admin-saas-highlight-badge" aria-hidden="true">%</span>
              <p className="hint">{t('admin.adminPage.overview.averageCompletionRate')}</p>
              <strong>{Number(globalOverview?.averageCompletionRate || 0).toFixed(2)}%</strong>
            </article>
          </div>
        </div>

        <div className="card admin-saas-section" id="students-enrollments">
          <div className="card-head-row">
            <h2>{t('admin.adminPage.enrollments.title')}</h2>
            <StatusBadge
              label={t('admin.adminPage.enrollments.pendingCount', { count: pendingCount })}
              tone={pendingCount > 0 ? 'orange' : 'gray'}
            />
          </div>
          <div className="table-toolbar">
            <input
              type="text"
              value={enrollmentSearch}
              onChange={(event) => setEnrollmentSearch(event.target.value)}
              placeholder={t('admin.adminPage.enrollments.searchPlaceholder')}
            />
            <select
              value={enrollmentSort}
              onChange={(event) => setEnrollmentSort(event.target.value)}
            >
              <option value="newest">{t('admin.adminPage.enrollments.sortNewest')}</option>
              <option value="oldest">{t('admin.adminPage.enrollments.sortOldest')}</option>
              <option value="pending_only">{t('admin.adminPage.enrollments.sortPending')}</option>
              <option value="rejected_only">{t('admin.adminPage.enrollments.sortRejected')}</option>
              <option value="approved_only">{t('admin.adminPage.enrollments.sortApproved')}</option>
            </select>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t('admin.tables.id')}</th>
                  <th>{t('admin.adminPage.enrollments.student')}</th>
                  <th>{t('admin.adminPage.enrollments.formation')}</th>
                  <th>{t('admin.tables.status')}</th>
                  <th>{t('admin.adminPage.enrollments.requested')}</th>
                  <th>{t('admin.tables.action')}</th>
                </tr>
              </thead>
              <tbody>
                {enrollmentPageRows.map((entry) => {
                  const isPending = entry.status === 'PENDING';
                  const isProcessing = processingEnrollmentId === entry.id;

                  return (
                    <tr key={entry.id}>
                      <td>{entry.id}</td>
                      <td>
                        {entry.student?.name}
                        <br />
                        <span className="hint">{entry.student?.email}</span>
                      </td>
                      <td>{entry.formation?.title}</td>
                      <td>
                        <StatusBadge
                          label={entry.status}
                          tone={statusTone(entry.status)}
                        />
                      </td>
                      <td>{new Date(entry.createdAt).toLocaleString()}</td>
                      <td>
                        {isPending ? (
                          <div className="row action-btn-group">
                            <button
                              type="button"
                              className="action-btn action-approve"
                              disabled={!isPending || isProcessing}
                              onClick={() =>
                                updateEnrollmentStatus(entry.id, 'approve')
                              }
                            >
                              {isProcessing ? t('admin.adminPage.enrollments.working') : t('admin.adminPage.enrollments.approveBtn')}
                            </button>
                            <button
                              type="button"
                              className="action-btn action-reject"
                              disabled={!isPending || isProcessing}
                              onClick={() => setConfirmRejectEnrollment(entry)}
                            >
                              {t('admin.adminPage.enrollments.rejectBtn')}
                            </button>
                          </div>
                        ) : (
                          <span
                            className={`admin-enrollment-result ${
                              entry.status === 'APPROVED'
                                ? 'is-approved'
                                : entry.status === 'REJECTED'
                                  ? 'is-rejected'
                                  : ''
                            }`}
                          >
                            {entry.status === 'APPROVED'
                              ? t('admin.adminPage.enrollments.approvedCheck')
                              : entry.status === 'REJECTED'
                                ? t('admin.adminPage.enrollments.rejectedCross')
                                : entry.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {enrollmentPageRows.length === 0 && (
                  <tr>
                    <td colSpan={6}>{t('admin.adminPage.enrollments.noEnrollments')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="pagination-bar">
            <button
              type="button"
              className="action-btn action-page"
              onClick={() => setEnrollmentPage((prev) => Math.max(1, prev - 1))}
              disabled={enrollmentPage === 1}
            >
              {t('admin.pagination.prev')}
            </button>
            <span>
              {t('admin.pagination.page', { current: enrollmentPage, total: enrollmentTotalPages })}
            </span>
            <button
              type="button"
              className="action-btn action-page"
              onClick={() =>
                setEnrollmentPage((prev) =>
                  Math.min(enrollmentTotalPages, prev + 1),
                )
              }
              disabled={enrollmentPage === enrollmentTotalPages}
            >
              {t('admin.pagination.next')}
            </button>
          </div>
        </div>

        <div className="card admin-saas-section" id="formateur-approvals">
          <h2>{t('admin.adminPage.formateurApprovals.title')}</h2>
        <div className="table-toolbar">
          <input
            type="text"
            value={formateurSearch}
            onChange={(event) => setFormateurSearch(event.target.value)}
            placeholder={t('admin.adminPage.formateurApprovals.searchPlaceholder')}
          />
          <select
            value={formateurSort}
            onChange={(event) => setFormateurSort(event.target.value)}
          >
            <option value="newest">{t('admin.adminPage.enrollments.sortNewest')}</option>
            <option value="oldest">{t('admin.adminPage.enrollments.sortOldest')}</option>
            <option value="pending_only">{t('admin.adminPage.enrollments.sortPending')}</option>
            <option value="approved_only">{t('admin.adminPage.enrollments.sortApproved')}</option>
            <option value="rejected_only">{t('admin.adminPage.formateurApprovals.sortRefused')}</option>
          </select>
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
              {formateurPageRows.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.id}</td>
                  <td>{entry.name}</td>
                  <td>{entry.email}</td>
                  <td>
                    <StatusBadge
                      label={entry.formateurStatus || 'PENDING'}
                      tone={statusTone(entry.formateurStatus || 'PENDING')}
                    />
                  </td>
                  <td>
                    <div className="row action-btn-group">
                      <button
                        type="button"
                        className="action-btn action-view-lite"
                        onClick={() => setFormateurPreview(entry)}
                      >
                        {t('admin.adminPage.formateurApprovals.viewBtn')}
                      </button>
                      {(entry.formateurStatus || 'PENDING') === 'PENDING' ? (
                        <>
                          <button
                            type="button"
                            className="action-btn action-approve"
                            disabled={processingFormateurId === entry.id}
                            onClick={() => approveFormateur(entry.id)}
                          >
                            {processingFormateurId === entry.id
                              ? t('admin.adminPage.enrollments.working')
                              : t('admin.adminPage.enrollments.approveBtn')}
                          </button>
                          <button
                            type="button"
                            className="action-btn action-reject"
                            disabled={processingFormateurId === entry.id}
                            onClick={() => setConfirmRejectFormateur(entry)}
                          >
                            {t('admin.adminPage.enrollments.rejectBtn')}
                          </button>
                        </>
                      ) : (entry.formateurStatus || 'PENDING') === 'REJECTED' ? (
                        <>
                          <button
                            type="button"
                            className="action-btn action-approve action-approve-as"
                            disabled={processingFormateurId === entry.id}
                            onClick={() =>
                              setConfirmResolveFormateur({
                                entry,
                                role: 'FORMATEUR',
                              })
                            }
                          >
                            {t('admin.adminPage.formateurApprovals.approveAsBtn')}
                          </button>
                          <button
                            type="button"
                            className="action-btn admin-circular-delete-btn"
                            disabled={processingFormateurId === entry.id}
                            onClick={() =>
                              setConfirmDeleteRejectedFormateur(entry)
                            }
                            aria-label="Delete rejected formateur"
                          >
                            <img
                              src="/images/trash.png"
                              alt=""
                              className="admin-circular-delete-icon"
                            />
                          </button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {formateurPageRows.length === 0 && (
                <tr>
                  <td colSpan={5}>{t('admin.adminPage.formateurApprovals.noFormateurs')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="pagination-bar">
          <button
            type="button"
            className="action-btn action-page"
            onClick={() => setFormateurPage((prev) => Math.max(1, prev - 1))}
            disabled={formateurPage === 1}
          >
            {t('admin.pagination.prev')}
          </button>
          <span>
            {t('admin.pagination.page', { current: formateurPage, total: formateurTotalPages })}
          </span>
          <button
            type="button"
            className="action-btn action-page"
            onClick={() =>
              setFormateurPage((prev) =>
                Math.min(formateurTotalPages, prev + 1),
              )
            }
            disabled={formateurPage === formateurTotalPages}
          >
            {t('admin.pagination.next')}
          </button>
        </div>
        </div>

        <div className="card admin-saas-section" id="invoices">
          <div className="card-head-row">
            <h2>{t('admin.adminPage.studentsInvoices.title')}</h2>
            <StatusBadge
              label={t('admin.adminPage.studentsInvoices.studentsCount', { count: groupedInvoices.length })}
              tone={groupedInvoices.length > 0 ? 'blue' : 'gray'}
            />
          </div>

        <div className="table-toolbar">
          <input
            type="text"
            value={invoiceSearch}
            onChange={(event) => setInvoiceSearch(event.target.value)}
            placeholder={t('admin.adminPage.studentsInvoices.searchPlaceholder')}
          />
          <select
            value={invoiceGroupSort}
            onChange={(event) => setInvoiceGroupSort(event.target.value)}
          >
            <option value="newest">{t('admin.adminPage.studentsInvoices.sortNewest')}</option>
            <option value="oldest">{t('admin.adminPage.studentsInvoices.sortOldest')}</option>
            <option value="highest_amount">{t('admin.adminPage.studentsInvoices.sortHighest')}</option>
          </select>
        </div>

        {invoicePageRows.length === 0 && (
          <p className="hint">{t('admin.adminPage.studentsInvoices.noInvoicesFilter')}</p>
        )}

        <div className="admin-invoice-group-list">
          {invoicePageRows.map((group) => {
            const isExpanded =
              expandedInvoiceStudentId === group.studentId;

            return (
              <article key={group.studentId} className="admin-invoice-group">
                <div className="card-head-row">
                  <div>
                    <h3>{group.studentName}</h3>
                    <p className="hint">{group.studentEmail}</p>
                    <p className="hint">{t('admin.adminPage.studentsInvoices.phoneLabel', { phone: group.studentPhone })}</p>
                  </div>
                  <div className="row admin-invoice-head-badges">
                    <StatusBadge
                      label={t('admin.adminPage.studentsInvoices.invoicesCount', { count: group.invoices.length })}
                      tone="blue"
                    />
                    <StatusBadge
                      label={t('admin.adminPage.studentsInvoices.totalAmount', { amount: group.totalAmount.toFixed(2) })}
                      tone="green"
                    />
                  </div>
                </div>

                <div className="admin-invoice-meta-row">
                  <p className="hint">
                    {t('admin.adminPage.studentsInvoices.latestInvoice', { date: new Date(group.latestIssuedAt).toLocaleString() })}
                  </p>
                  <button
                    type="button"
                    className="action-btn action-page"
                    onClick={() =>
                      setExpandedInvoiceStudentId((prev) =>
                        prev === group.studentId ? null : group.studentId,
                      )
                    }
                  >
                    {isExpanded ? t('admin.adminPage.studentsInvoices.hideDetails') : t('admin.adminPage.studentsInvoices.viewInvoices')}
                  </button>
                </div>

                {isExpanded && (
                  <div className="stack">
                    <div className="table-toolbar admin-details-table-toolbar">
                      <input
                        type="text"
                        value={invoiceDetailsSearch}
                        onChange={(event) =>
                          setInvoiceDetailsSearch(event.target.value)
                        }
                        placeholder={t('admin.adminPage.studentsInvoices.searchFormation')}
                      />
                    </div>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>{t('admin.adminPage.studentsInvoices.invoiceCol')}</th>
                            <th>{t('admin.adminPage.enrollments.formation')}</th>
                            <th>{t('admin.adminPage.studentsInvoices.typeCol')}</th>
                            <th>{t('admin.adminPage.studentsInvoices.amountCol')}</th>
                            <th>{t('admin.adminPage.studentsInvoices.issuedCol')}</th>
                            <th>{t('admin.adminPage.studentsInvoices.downloadCol')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoiceDetailsRows.map((entry) => (
                            <tr key={entry.id}>
                              <td>#{entry.id}</td>
                              <td>{entry.enrollment?.formation?.title || '-'}</td>
                              <td>{entry.enrollment?.formation?.type || '-'}</td>
                              <td>{Number(entry.amount || 0).toFixed(2)} TND</td>
                              <td>{new Date(entry.createdAt).toLocaleString()}</td>
                              <td>
                                <a
                                  className="admin-invoice-download-link"
                                  href={resolveApiAssetUrl(entry.pdfUrl)}
                                  target="_blank"
                                  rel="noreferrer"
                                  aria-label="Download invoice PDF"
                                  title="Download invoice PDF"
                                >
                                  <img
                                    src="/images/download.png"
                                    alt=""
                                    className="admin-invoice-download-icon"
                                  />
                                </a>
                              </td>
                            </tr>
                          ))}
                          {invoiceDetailsRows.length === 0 && (
                            <tr>
                              <td colSpan={6}>{t('admin.adminPage.studentsInvoices.noInvoicesFormation')}</td>
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
                          setInvoiceDetailsPage((prev) => Math.max(1, prev - 1))
                        }
                        disabled={invoiceDetailsPage === 1}
                      >
                        {t('admin.pagination.prev')}
                      </button>
                      <span>
                        {t('admin.pagination.page', { current: invoiceDetailsPage, total: invoiceDetailsTotalPages })}
                      </span>
                      <button
                        type="button"
                        className="action-btn action-page"
                        onClick={() =>
                          setInvoiceDetailsPage((prev) =>
                            Math.min(invoiceDetailsTotalPages, prev + 1),
                          )
                        }
                        disabled={invoiceDetailsPage === invoiceDetailsTotalPages}
                      >
                        {t('admin.pagination.next')}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        <div className="pagination-bar">
          <button
            type="button"
            className="action-btn action-page"
            onClick={() => setInvoicePage((prev) => Math.max(1, prev - 1))}
            disabled={invoicePage === 1}
          >
            {t('admin.pagination.prev')}
          </button>
          <span>
            {t('admin.pagination.page', { current: invoicePage, total: invoiceTotalPages })}
          </span>
          <button
            type="button"
            className="action-btn action-page"
            onClick={() =>
              setInvoicePage((prev) =>
                Math.min(invoiceTotalPages, prev + 1),
              )
            }
            disabled={invoicePage === invoiceTotalPages}
          >
            {t('admin.pagination.next')}
          </button>
        </div>
        </div>
          </>
        ) : currentAdminPath === '/admin/students' ? (
          <AdminStudentsPage pushToast={pushToast} embedded />
        ) : currentAdminPath === '/admin/formateurs' ? (
          <AdminFormateursPage pushToast={pushToast} embedded />
        ) : currentAdminPath === '/admin/formations' ? (
          <AdminFormationsPage pushToast={pushToast} embedded />
        ) : currentAdminPath === '/admin/revenue' ? (
          <AdminRevenuePage pushToast={pushToast} embedded />
        ) : currentAdminPath === '/admin/reviews' ? (
          <div className="card admin-saas-section">
            <div className="card-head-row">
              <h2>Reviews</h2>
              <StatusBadge
                label={`${reviewsTotal} reviews`}
                tone={reviewsTotal > 0 ? 'blue' : 'gray'}
              />
            </div>

            <div className="table-toolbar">
              <input
                type="text"
                value={reviewsSearch}
                onChange={(event) => setReviewsSearch(event.target.value)}
                placeholder="Search by email"
              />
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Note Description</th>
                    <th>Stars</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {adminReviews.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.email}</td>
                      <td>{entry.noteDescription}</td>
                      <td>
                        <span aria-label={`${entry.rating} out of 5 stars`}>
                          {'★'.repeat(Number(entry.rating || 0))}
                          {'☆'.repeat(Math.max(0, 5 - Number(entry.rating || 0)))}
                        </span>
                      </td>
                      <td>{new Date(entry.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                  {!loadingReviews && adminReviews.length === 0 && (
                    <tr>
                      <td colSpan={4}>No reviews match your search.</td>
                    </tr>
                  )}
                  {loadingReviews && (
                    <tr>
                      <td colSpan={4}>Loading reviews...</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="pagination-bar">
              <button
                type="button"
                className="action-btn action-page"
                onClick={() => setReviewsPage((prev) => Math.max(1, prev - 1))}
                disabled={reviewsPage === 1 || loadingReviews}
              >
                Prev
              </button>
              <span>
                Page {reviewsPage} / {reviewsTotalPages}
              </span>
              <button
                type="button"
                className="action-btn action-page"
                onClick={() =>
                  setReviewsPage((prev) => Math.min(reviewsTotalPages, prev + 1))
                }
                disabled={reviewsPage === reviewsTotalPages || loadingReviews}
              >
                Next
              </button>
            </div>
          </div>
        ) : currentAdminPath === '/admin/settings' ? (
          <div className="card admin-saas-section admin-settings-section">
            
            <h2> Password Settings</h2>
            <form className="admin-settings-password-form" onSubmit={saveAdminPassword}>
              <label className="profile-edit-field">
                <span>Email</span>
                <input
                  type="email"
                  value={adminSettingsEmail}
                  onChange={(event) => setAdminSettingsEmail(event.target.value)}
                  required
                />
              </label>

              <label className="profile-edit-field">
                <span>Old password</span>
                <input
                  type="password"
                  value={adminPasswordForm.oldPassword}
                  onChange={(event) =>
                    setAdminPasswordForm((prev) => ({
                      ...prev,
                      oldPassword: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label className="profile-edit-field">
                <span>New password</span>
                <input
                  type="password"
                  value={adminPasswordForm.newPassword}
                  onChange={(event) =>
                    setAdminPasswordForm((prev) => ({
                      ...prev,
                      newPassword: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label className="profile-edit-field">
                <span>Confirm password</span>
                <input
                  type="password"
                  value={adminPasswordForm.confirmNewPassword}
                  onChange={(event) =>
                    setAdminPasswordForm((prev) => ({
                      ...prev,
                      confirmNewPassword: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              {adminPasswordError && (
                <article className="auth-error-box" role="alert" aria-live="assertive">
                  <p className="auth-error-title">⚠ Password Reset Failed</p>
                  <p className="auth-error-body">{adminPasswordError}</p>
                </article>
              )}
              {adminPasswordSuccess && (
                <p className="hint admin-password-success">{adminPasswordSuccess}</p>
              )}

              <div className="admin-settings-password-actions">
                <button
                  type="submit"
                  className="profile-save-btn"
                  disabled={savingAdminPassword}
                >
                  {savingAdminPassword ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  className="profile-glass-cancel-btn"
                  onClick={() => {
                    if (savingAdminPassword) return;
                    setAdminPasswordForm({
                      oldPassword: '',
                      newPassword: '',
                      confirmNewPassword: '',
                    });
                    setAdminPasswordError('');
                    setAdminPasswordSuccess('');
                  }}
                  disabled={savingAdminPassword}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="card admin-saas-section">
            <p className="hint">Section not found.</p>
          </div>
        )}
      </div>

      {formateurPreview && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <button
            type="button"
            className="admin-modal-backdrop"
            aria-label="Close formateur preview"
            onClick={() => setFormateurPreview(null)}
          />
          <article className="admin-modal-card admin-formateur-preview-card">
            <div className="admin-modal-head">
              <h2>Formateur Preview</h2>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setFormateurPreview(null)}
                aria-label="Close"
              >
                x
              </button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-formateur-preview-hero">
                <div className="admin-formateur-preview-avatar">
                  <img
                    src={previewImageUrl(formateurPreview)}
                    alt={formateurPreview.name || 'Formateur'}
                  />
                </div>
                <div className="admin-formateur-preview-main">
                  <h3>{formateurPreview.name || '-'}</h3>
                  <p>Formateur</p>
                  <StatusBadge
                    label={formateurPreview.formateurStatus || 'PENDING'}
                    tone={statusTone(formateurPreview.formateurStatus || 'PENDING')}
                  />
                </div>
              </div>

              <div className="admin-metric-grid admin-user-detail-cards">
                <article className="admin-metric-card">
                  <p className="hint">Email</p>
                  <strong>{formateurPreview.email || '-'}</strong>
                </article>
                <article className="admin-metric-card">
                  <p className="hint">Phone Number</p>
                  <strong>{formateurPreview.phoneNumber || '-'}</strong>
                </article>
                <article className="admin-metric-card">
                  <p className="hint">Date of Birth</p>
                  <strong>
                    {formateurPreview.dateOfBirth
                      ? new Date(formateurPreview.dateOfBirth).toLocaleDateString()
                      : '-'}
                  </strong>
                </article>
                <article className="admin-metric-card">
                  <p className="hint">Member Since</p>
                  <strong>
                    {formateurPreview.createdAt
                      ? new Date(formateurPreview.createdAt).toLocaleDateString()
                      : '-'}
                  </strong>
                </article>
                <article className="admin-metric-card admin-formateur-preview-bio-card">
                  <p className="hint">Bio</p>
                  <strong>{formateurPreview.bio?.trim() || '-'}</strong>
                </article>
              </div>
            </div>
          </article>
        </div>
      )}

      {confirmRejectEnrollment && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <button
            type="button"
            className="admin-modal-backdrop"
            aria-label="Close enrollment reject confirmation"
            onClick={() => setConfirmRejectEnrollment(null)}
            disabled={Boolean(processingEnrollmentId)}
          />
          <article className="admin-modal-card confirm-delete-modal">
            <div className="admin-modal-head">
              <h2>Reject Student</h2>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setConfirmRejectEnrollment(null)}
                aria-label="Close enrollment reject confirmation"
                disabled={Boolean(processingEnrollmentId)}
              >
                x
              </button>
            </div>
            <div className="admin-modal-body">
              <p>
                Are you sure you want to reject this student
                {confirmRejectEnrollment?.student?.name
                  ? ` "${confirmRejectEnrollment.student.name}"`
                  : ''}
                ?
              </p>
              <div className="row confirm-delete-actions">
                <button
                  type="button"
                  className="action-btn modal-cancel-btn"
                  onClick={() => setConfirmRejectEnrollment(null)}
                  disabled={Boolean(processingEnrollmentId)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="action-btn action-delete"
                  onClick={() =>
                    updateEnrollmentStatus(confirmRejectEnrollment.id, 'reject')
                  }
                  disabled={processingEnrollmentId === confirmRejectEnrollment.id}
                >
                  {processingEnrollmentId === confirmRejectEnrollment.id
                    ? 'Rejecting...'
                    : 'Reject'}
                </button>
              </div>
            </div>
          </article>
        </div>
      )}

      {confirmRejectFormateur && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <button
            type="button"
            className="admin-modal-backdrop"
            aria-label="Close reject confirmation"
            onClick={() => setConfirmRejectFormateur(null)}
            disabled={Boolean(processingFormateurId)}
          />
          <article className="admin-modal-card confirm-delete-modal">
            <div className="admin-modal-head">
              <h2>Reject Formateur</h2>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setConfirmRejectFormateur(null)}
                aria-label="Close reject confirmation"
                disabled={Boolean(processingFormateurId)}
              >
                x
              </button>
            </div>
            <div className="admin-modal-body">
              <p>
                Are you sure you want to reject this formateur
                {confirmRejectFormateur?.name
                  ? ` "${confirmRejectFormateur.name}"`
                  : ''}
                ?
              </p>
              <div className="row confirm-delete-actions">
                <button
                  type="button"
                  className="action-btn modal-cancel-btn"
                  onClick={() => setConfirmRejectFormateur(null)}
                  disabled={Boolean(processingFormateurId)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="action-btn action-delete"
                  onClick={() => rejectFormateur(confirmRejectFormateur.id)}
                  disabled={processingFormateurId === confirmRejectFormateur.id}
                >
                  {processingFormateurId === confirmRejectFormateur.id
                    ? 'Rejecting...'
                    : 'Reject'}
                </button>
              </div>
            </div>
          </article>
        </div>
      )}

      {confirmResolveFormateur && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <button
            type="button"
            className="admin-modal-backdrop"
            aria-label="Close approval confirmation"
            onClick={() => setConfirmResolveFormateur(null)}
            disabled={Boolean(processingFormateurId)}
          />
          <article className="admin-modal-card confirm-delete-modal">
            <div className="admin-modal-head">
              <h2>Approve Rejected Formateur</h2>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setConfirmResolveFormateur(null)}
                aria-label="Close approval confirmation"
                disabled={Boolean(processingFormateurId)}
              >
                x
              </button>
            </div>
            <div className="admin-modal-body">
              <p>
                Choose how you want to approve this previously rejected
                formateur
                {confirmResolveFormateur?.entry?.name
                  ? ` "${confirmResolveFormateur.entry.name}"`
                  : ''}
                .
              </p>
              <div className="admin-approve-role-options">
                <label
                  className={`admin-approve-role-option${
                    confirmResolveFormateur?.role === 'FORMATEUR'
                      ? ' is-active'
                      : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="resolve-formateur-role"
                    value="FORMATEUR"
                    checked={confirmResolveFormateur?.role === 'FORMATEUR'}
                    onChange={() =>
                      setConfirmResolveFormateur((current) =>
                        current
                          ? { ...current, role: 'FORMATEUR' }
                          : current,
                      )
                    }
                    disabled={Boolean(processingFormateurId)}
                  />
                  <span className="admin-approve-role-radio" aria-hidden="true" />
                  <span>Approve as formateur</span>
                </label>
                <label
                  className={`admin-approve-role-option${
                    confirmResolveFormateur?.role === 'STUDENT'
                      ? ' is-active'
                      : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="resolve-formateur-role"
                    value="STUDENT"
                    checked={confirmResolveFormateur?.role === 'STUDENT'}
                    onChange={() =>
                      setConfirmResolveFormateur((current) =>
                        current ? { ...current, role: 'STUDENT' } : current,
                      )
                    }
                    disabled={Boolean(processingFormateurId)}
                  />
                  <span className="admin-approve-role-radio" aria-hidden="true" />
                  <span>Approve as student</span>
                </label>
              </div>
              <div className="row confirm-delete-actions">
                <button
                  type="button"
                  className="action-btn modal-cancel-btn"
                  onClick={() => setConfirmResolveFormateur(null)}
                  disabled={Boolean(processingFormateurId)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="action-btn action-approve"
                  onClick={() =>
                    resolveRejectedFormateur(
                      confirmResolveFormateur.entry.id,
                      confirmResolveFormateur.role,
                    )
                  }
                  disabled={
                    processingFormateurId === confirmResolveFormateur.entry.id
                  }
                >
                  {processingFormateurId === confirmResolveFormateur.entry.id
                    ? 'Approving...'
                    : 'Confirm'}
                </button>
              </div>
            </div>
          </article>
        </div>
      )}

      {confirmDeleteRejectedFormateur && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <button
            type="button"
            className="admin-modal-backdrop"
            aria-label="Close delete rejected formateur confirmation"
            onClick={() => setConfirmDeleteRejectedFormateur(null)}
            disabled={Boolean(processingFormateurId)}
          />
          <article className="admin-modal-card confirm-delete-modal">
            <div className="admin-modal-head">
              <h2>Delete Rejected Formateur</h2>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setConfirmDeleteRejectedFormateur(null)}
                aria-label="Close delete rejected formateur confirmation"
                disabled={Boolean(processingFormateurId)}
              >
                x
              </button>
            </div>
            <div className="admin-modal-body">
              <p>
                Are you sure you want to delete the rejected instructor
                {confirmDeleteRejectedFormateur?.name
                  ? ` ${confirmDeleteRejectedFormateur.name}`
                  : ''}
                ?
                <br />
                Deleting this instructor will remove the email restriction,
                allowing them to submit a new request for a Formateur account
                through the signup form.
              </p>
              <div className="row confirm-delete-actions">
                <button
                  type="button"
                  className="action-btn modal-cancel-btn"
                  onClick={() => setConfirmDeleteRejectedFormateur(null)}
                  disabled={Boolean(processingFormateurId)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="action-btn action-delete"
                  onClick={() =>
                    deleteRejectedFormateur(confirmDeleteRejectedFormateur.id)
                  }
                  disabled={
                    processingFormateurId === confirmDeleteRejectedFormateur.id
                  }
                >
                  {processingFormateurId === confirmDeleteRejectedFormateur.id
                    ? 'Deleting...'
                    : 'Delete'}
                </button>
              </div>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
