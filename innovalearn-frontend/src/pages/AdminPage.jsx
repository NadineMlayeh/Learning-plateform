import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { apiRequest, resolveApiAssetUrl } from '../api';
import { getCurrentUser } from '../auth';
import StatusBadge from '../components/StatusBadge';
import AdminStudentsPage from './AdminStudentsPage';
import AdminFormateursPage from './AdminFormateursPage';
import AdminFormationsPage from './AdminFormationsPage';
import AdminRevenuePage from './AdminRevenuePage';

const PAGE_SIZE = 3;

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
  const user = getCurrentUser();
  const location = useLocation();
  const currentAdminPath = location.pathname.replace(/\/+$/, '') || '/admin';
  const isDashboardSection = currentAdminPath === '/admin';

  const [globalOverview, setGlobalOverview] = useState(null);
  const [formateurs, setFormateurs] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [adminInvoices, setAdminInvoices] = useState([]);

  const [processingFormateurId, setProcessingFormateurId] = useState(null);
  const [processingEnrollmentId, setProcessingEnrollmentId] =
    useState(null);

  const [enrollmentSearch, setEnrollmentSearch] = useState('');
  const [enrollmentSort, setEnrollmentSort] = useState('newest');
  const [enrollmentPage, setEnrollmentPage] = useState(1);

  const [formateurSearch, setFormateurSearch] = useState('');
  const [formateurSort, setFormateurSort] = useState('newest');
  const [formateurPage, setFormateurPage] = useState(1);

  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceGroupSort, setInvoiceGroupSort] = useState('newest');
  const [invoicePage, setInvoicePage] = useState(1);
  const [expandedInvoiceStudentId, setExpandedInvoiceStudentId] =
    useState(null);

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

  async function approveFormateur(id) {
    setProcessingFormateurId(id);
    try {
      await apiRequest(`/admin/formateur/${id}/approve`, {
        method: 'PATCH',
        token: user.token,
      });
      pushToast(`Formateur #${id} approved.`, 'success');
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
      pushToast(`Formateur #${id} rejected.`, 'success');
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
        `Enrollment #${enrollmentId} ${action}d successfully.`,
        'success',
      );

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

  useEffect(() => {
    if (!isDashboardSection) return;
    loadOverview();
    loadFormateurs();
    loadEnrollments();
    loadAdminInvoices();
  }, [isDashboardSection]);

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

  function navItemClass(path) {
    return currentAdminPath === path
      ? 'admin-saas-nav-item is-active'
      : 'admin-saas-nav-item';
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
            Dashboard
          </Link>
          <Link className={navItemClass('/admin/students')} to="/admin/students">
            <span className="admin-saas-nav-icon" aria-hidden="true">
              <img src="/images/person.png" alt="" className="admin-saas-nav-icon-img" />
            </span>
            Students
          </Link>
          <Link className={navItemClass('/admin/formateurs')} to="/admin/formateurs">
            <span className="admin-saas-nav-icon" aria-hidden="true">
              <img src="/images/userr.png" alt="" className="admin-saas-nav-icon-img" />
            </span>
            Formateurs
          </Link>
          <Link className={navItemClass('/admin/formations')} to="/admin/formations">
            <span className="admin-saas-nav-icon" aria-hidden="true">
              <img src="/images/school.png" alt="" className="admin-saas-nav-icon-img" />
            </span>
            Formations
          </Link>
          <Link className={navItemClass('/admin/revenue')} to="/admin/revenue">
            <span className="admin-saas-nav-icon" aria-hidden="true">
              <img src="/images/euro.png" alt="" className="admin-saas-nav-icon-img" />
            </span>
            Revenue
          </Link>
        </nav>

        <div className="admin-saas-sidebar-bottom">
          <div className="admin-saas-nav-item admin-saas-settings-btn">
            <span className="admin-saas-nav-icon" aria-hidden="true">
              <img src="/images/gear.png" alt="" className="admin-saas-nav-icon-img" />
            </span>
            Settings
          </div>
        </div>
      </aside>

      <div className="admin-saas-main">
        <div className="card panel-head admin-saas-top-header">
          <div>
            <h1>Admin Dashboard</h1>
            <p className="hint">
              Manage approvals and use dedicated sections for users, formations, and revenue.
            </p>
          </div>
          <div className="admin-saas-quick-actions">
            <Link className="link-btn small-btn" to="/admin/students">
              Students
            </Link>
            <Link className="link-btn small-btn" to="/admin/formateurs">
              Formateurs
            </Link>
            <Link className="link-btn small-btn" to="/admin/formations">
              Formations
            </Link>
            <Link className="link-btn small-btn" to="/admin/revenue">
              Revenue
            </Link>
          </div>
        </div>

        {isDashboardSection ? (
          <>
        <div className="card admin-saas-section admin-saas-overview">
          <div className="card-head-row">
            <h2>Global Overview</h2>
            <button
              type="button"
              className="admin-reload-icon-btn"
              onClick={loadOverview}
              aria-label="Refresh overview"
              title="Refresh overview"
            >
              <img src="/images/refresh.png" alt="" className="admin-reload-icon" />
            </button>
          </div>
          <div className="admin-metric-grid admin-saas-kpi-grid">
            <article className="admin-metric-card admin-saas-kpi-card">
              <p className="hint">Total Students</p>
              <strong>{globalOverview?.totalStudents ?? '-'}</strong>
              <span className="admin-saas-kpi-icon" aria-hidden="true">
                <img src="/images/grad.png" alt="" className="admin-saas-kpi-icon-img" />
              </span>
            </article>
            <article className="admin-metric-card admin-saas-kpi-card">
              <p className="hint">Total Formateurs</p>
              <strong>{globalOverview?.totalFormateurs ?? '-'}</strong>
              <span className="admin-saas-kpi-icon" aria-hidden="true">
                <img src="/images/user.png" alt="" className="admin-saas-kpi-icon-img" />
              </span>
            </article>
            <article className="admin-metric-card admin-saas-kpi-card">
              <p className="hint">Total Formations</p>
              <strong>{globalOverview?.totalFormations ?? '-'}</strong>
              <span className="admin-saas-kpi-icon" aria-hidden="true">
                <img src="/images/agreement.png" alt="" className="admin-saas-kpi-icon-img" />
              </span>
            </article>
            <article className="admin-metric-card admin-saas-kpi-card">
              <p className="hint">Total Enrollments</p>
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
              <p className="hint">Total Revenue</p>
              <strong>{Number(globalOverview?.totalRevenue || 0).toFixed(2)} TND</strong>
            </article>
            <article className="admin-metric-card admin-saas-highlight-card">
              <span className="admin-saas-highlight-accent" />
              <span className="admin-saas-highlight-badge" aria-hidden="true">%</span>
              <p className="hint">Average Completion Rate</p>
              <strong>{Number(globalOverview?.averageCompletionRate || 0).toFixed(2)}%</strong>
            </article>
          </div>
        </div>

        <div className="card admin-saas-section">
          <div className="card-head-row">
            <h2>Student Enrollments</h2>
            <StatusBadge
              label={`${pendingCount} Pending`}
              tone={pendingCount > 0 ? 'orange' : 'gray'}
            />
          </div>
          <div className="table-toolbar">
            <input
              type="text"
              value={enrollmentSearch}
              onChange={(event) => setEnrollmentSearch(event.target.value)}
              placeholder="Search by student name"
            />
            <select
              value={enrollmentSort}
              onChange={(event) => setEnrollmentSort(event.target.value)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="pending_only">Pending Only</option>
              <option value="rejected_only">Rejected Only</option>
              <option value="approved_only">Approved Only</option>
            </select>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Student</th>
                  <th>Formation</th>
                  <th>Status</th>
                  <th>Requested</th>
                  <th>Action</th>
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
                              {isProcessing ? 'Working...' : 'Approve'}
                            </button>
                            <button
                              type="button"
                              className="action-btn action-reject"
                              disabled={!isPending || isProcessing}
                              onClick={() =>
                                updateEnrollmentStatus(entry.id, 'reject')
                              }
                            >
                              Reject
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
                              ? 'Approved ✔'
                              : entry.status === 'REJECTED'
                                ? 'Rejected ✖'
                                : entry.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {enrollmentPageRows.length === 0 && (
                  <tr>
                    <td colSpan={6}>No enrollments match this filter.</td>
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
              Prev
            </button>
            <span>
              Page {enrollmentPage} / {enrollmentTotalPages}
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
              Next
            </button>
          </div>
        </div>

        <div className="card admin-saas-section">
          <h2>Formateur Approvals</h2>
        <div className="table-toolbar">
          <input
            type="text"
            value={formateurSearch}
            onChange={(event) => setFormateurSearch(event.target.value)}
            placeholder="Search by formateur name"
          />
          <select
            value={formateurSort}
            onChange={(event) => setFormateurSort(event.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="pending_only">Pending Only</option>
            <option value="approved_only">Approved Only</option>
            <option value="rejected_only">Refused Only</option>
          </select>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
                <th>Action</th>
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
                    {(entry.formateurStatus || 'PENDING') === 'PENDING' ? (
                      <div className="row action-btn-group">
                        <button
                          type="button"
                          className="action-btn action-approve"
                          disabled={processingFormateurId === entry.id}
                          onClick={() => approveFormateur(entry.id)}
                        >
                          {processingFormateurId === entry.id
                            ? 'Working...'
                            : 'Approve'}
                        </button>
                        <button
                          type="button"
                          className="action-btn action-reject"
                          disabled={processingFormateurId === entry.id}
                          onClick={() => rejectFormateur(entry.id)}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`admin-enrollment-result ${
                          (entry.formateurStatus || 'PENDING') === 'APPROVED'
                            ? 'is-approved'
                            : (entry.formateurStatus || 'PENDING') === 'REJECTED'
                              ? 'is-rejected'
                              : ''
                        }`}
                      >
                        {(entry.formateurStatus || 'PENDING') === 'APPROVED'
                          ? 'Approved ✔'
                          : (entry.formateurStatus || 'PENDING') === 'REJECTED'
                            ? 'Refused ✖'
                            : entry.formateurStatus || 'PENDING'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {formateurPageRows.length === 0 && (
                <tr>
                  <td colSpan={5}>No formateurs match this filter.</td>
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
            Prev
          </button>
          <span>
            Page {formateurPage} / {formateurTotalPages}
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
            Next
          </button>
        </div>
        </div>

        <div className="card admin-saas-section">
          <div className="card-head-row">
            <h2>Students Invoices</h2>
            <StatusBadge
              label={`${groupedInvoices.length} students`}
              tone={groupedInvoices.length > 0 ? 'blue' : 'gray'}
            />
          </div>

        <div className="table-toolbar">
          <input
            type="text"
            value={invoiceSearch}
            onChange={(event) => setInvoiceSearch(event.target.value)}
            placeholder="Search by student or formation title"
          />
          <select
            value={invoiceGroupSort}
            onChange={(event) => setInvoiceGroupSort(event.target.value)}
          >
            <option value="newest">Newest Invoices</option>
            <option value="oldest">Oldest Invoices</option>
            <option value="highest_amount">Invoices with Highest Amount</option>
          </select>
        </div>

        {invoicePageRows.length === 0 && (
          <p className="hint">No student invoices match this filter.</p>
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
                    <p className="hint">Phone: {group.studentPhone}</p>
                  </div>
                  <div className="row admin-invoice-head-badges">
                    <StatusBadge
                      label={`${group.invoices.length} invoices`}
                      tone="blue"
                    />
                    <StatusBadge
                      label={`Total ${group.totalAmount.toFixed(2)} TND`}
                      tone="green"
                    />
                  </div>
                </div>

                <div className="admin-invoice-meta-row">
                  <p className="hint">
                    Latest invoice: {new Date(group.latestIssuedAt).toLocaleString()}
                  </p>
                  <button
                    type="button"
                    className="action-btn action-page"
                    onClick={() =>
                      setExpandedInvoiceStudentId((prev) =>
                        prev === group.studentId
                          ? null
                          : group.studentId,
                      )
                    }
                  >
                    {isExpanded ? 'Hide Details' : 'View Invoices'}
                  </button>
                </div>

                {isExpanded && (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Invoice</th>
                          <th>Formation</th>
                          <th>Type</th>
                          <th>Amount</th>
                          <th>Issued</th>
                          <th>Download</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.invoices.map((entry) => (
                          <tr key={entry.id}>
                            <td>#{entry.id}</td>
                            <td>{entry.enrollment?.formation?.title || '-'}</td>
                            <td>{entry.enrollment?.formation?.type || '-'}</td>
                            <td>{Number(entry.amount || 0).toFixed(2)} TND</td>
                            <td>
                              {new Date(entry.createdAt).toLocaleString()}
                            </td>
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
                      </tbody>
                    </table>
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
            Prev
          </button>
          <span>
            Page {invoicePage} / {invoiceTotalPages}
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
            Next
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
        ) : (
          <div className="card admin-saas-section">
            <p className="hint">Section not found.</p>
          </div>
        )}
      </div>
    </section>
  );
}
