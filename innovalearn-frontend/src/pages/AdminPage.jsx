import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, resolveApiAssetUrl } from '../api';
import { getCurrentUser } from '../auth';
import ProfileSidebar from '../components/ProfileSidebar';
import StatusBadge from '../components/StatusBadge';

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
  const [invoiceGroupFilter, setInvoiceGroupFilter] = useState('all');
  const [invoiceGroupSort, setInvoiceGroupSort] = useState('recent');
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
    const filtered = enrollments.filter((entry) =>
      (entry.student?.name || '')
        .toLowerCase()
        .includes(enrollmentSearch.toLowerCase().trim()),
    );

    filtered.sort((a, b) => {
      if (enrollmentSort === 'newest') {
        return createdTimestamp(b.createdAt, b.id) - createdTimestamp(a.createdAt, a.id);
      }

      const approvedPriority = { APPROVED: 0, PENDING: 1, REJECTED: 2 };
      const rejectedPriority = { REJECTED: 0, PENDING: 1, APPROVED: 2 };
      const priorityMap =
        enrollmentSort === 'approved_first'
          ? approvedPriority
          : rejectedPriority;

      const diff = priorityMap[a.status] - priorityMap[b.status];
      if (diff !== 0) return diff;

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
    const filtered = formateurs.filter((entry) =>
      (entry.name || '')
        .toLowerCase()
        .includes(formateurSearch.toLowerCase().trim()),
    );

    filtered.sort((a, b) => {
      if (formateurSort === 'pending_only') {
        const pendingFirstDiff =
          Number(b.formateurStatus === 'PENDING') -
          Number(a.formateurStatus === 'PENDING');
        if (pendingFirstDiff !== 0) return pendingFirstDiff;
      }

      if (formateurSort === 'approved_only') {
        const approvedFirstDiff =
          Number(b.formateurStatus === 'APPROVED') -
          Number(a.formateurStatus === 'APPROVED');
        if (approvedFirstDiff !== 0) return approvedFirstDiff;
      }

      if (formateurSort === 'rejected_only') {
        const rejectedFirstDiff =
          Number(b.formateurStatus === 'REJECTED') -
          Number(a.formateurStatus === 'REJECTED');
        if (rejectedFirstDiff !== 0) return rejectedFirstDiff;
      }

      return (
        createdTimestamp(b.createdAt, b.id) -
        createdTimestamp(a.createdAt, a.id)
      );
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

    if (invoiceGroupFilter === 'multi') {
      groups = groups.filter((group) => group.invoices.length > 1);
    } else if (invoiceGroupFilter === 'single') {
      groups = groups.filter((group) => group.invoices.length === 1);
    } else if (invoiceGroupFilter === 'high_value') {
      groups = groups.filter((group) => group.totalAmount >= 500);
    }

    groups.sort((a, b) => {
      if (invoiceGroupSort === 'invoice_count') {
        const diff = b.invoices.length - a.invoices.length;
        if (diff !== 0) return diff;
      }

      if (invoiceGroupSort === 'total_amount') {
        const diff = b.totalAmount - a.totalAmount;
        if (diff !== 0) return diff;
      }

      return createdTimestamp(b.latestIssuedAt) - createdTimestamp(a.latestIssuedAt);
    });

    return groups;
  }, [adminInvoices, invoiceSearch, invoiceGroupFilter, invoiceGroupSort]);

  const invoiceTotalPages = Math.max(
    1,
    Math.ceil(groupedInvoices.length / PAGE_SIZE),
  );
  const invoicePageRows = groupedInvoices.slice(
    (invoicePage - 1) * PAGE_SIZE,
    invoicePage * PAGE_SIZE,
  );

  useEffect(() => {
    loadOverview();
    loadFormateurs();
    loadEnrollments();
    loadAdminInvoices();
  }, []);

  useEffect(() => {
    setEnrollmentPage(1);
  }, [enrollmentSearch, enrollmentSort]);

  useEffect(() => {
    setFormateurPage(1);
  }, [formateurSearch, formateurSort]);

  useEffect(() => {
    setInvoicePage(1);
    setExpandedInvoiceStudentId(null);
  }, [invoiceSearch, invoiceGroupFilter, invoiceGroupSort]);

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

  return (
    <section className="stack">
      <ProfileSidebar user={user} />

      <div className="card panel-head">
        <div>
          <h1>Admin Dashboard</h1>
          <p className="hint">
            Manage approvals here, and use dedicated sections for full users, formations, and revenue management.
          </p>
        </div>
        <div className="row">
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

      <div className="card">
        <div className="card-head-row">
          <h2>Global Overview</h2>
          <button type="button" className="action-btn action-page" onClick={loadOverview}>
            Reload
          </button>
        </div>
        <div className="admin-metric-grid">
          <article className="admin-metric-card">
            <p className="hint">Total Users</p>
            <strong>{globalOverview?.totalUsers ?? '-'}</strong>
          </article>
          <article className="admin-metric-card">
            <p className="hint">Total Students</p>
            <strong>{globalOverview?.totalStudents ?? '-'}</strong>
          </article>
          <article className="admin-metric-card">
            <p className="hint">Total Formateurs</p>
            <strong>{globalOverview?.totalFormateurs ?? '-'}</strong>
          </article>
          <article className="admin-metric-card">
            <p className="hint">Total Formations</p>
            <strong>{globalOverview?.totalFormations ?? '-'}</strong>
          </article>
          <article className="admin-metric-card">
            <p className="hint">Total Enrollments</p>
            <strong>{globalOverview?.totalEnrollments ?? '-'}</strong>
          </article>
          <article className="admin-metric-card">
            <p className="hint">Total Revenue</p>
            <strong>{Number(globalOverview?.totalRevenue || 0).toFixed(2)} EUR</strong>
          </article>
          <article className="admin-metric-card">
            <p className="hint">Average Completion Rate</p>
            <strong>{Number(globalOverview?.averageCompletionRate || 0).toFixed(2)}%</strong>
          </article>
        </div>
      </div>

      <div className="card">
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
            <option value="approved_first">Approved First</option>
            <option value="rejected_first">Rejected First</option>
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

      <div className="card">
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
            <option value="pending_only">Pending First</option>
            <option value="approved_only">Approved First</option>
            <option value="rejected_only">Rejected First</option>
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
                    <div className="row action-btn-group">
                      <button
                        type="button"
                        className="action-btn action-approve"
                        disabled={
                          entry.formateurStatus === 'APPROVED' ||
                          processingFormateurId === entry.id
                        }
                        onClick={() => approveFormateur(entry.id)}
                      >
                        {processingFormateurId === entry.id
                          ? 'Working...'
                          : 'Approve'}
                      </button>
                      <button
                        type="button"
                        className="action-btn action-reject"
                        disabled={
                          entry.formateurStatus === 'REJECTED' ||
                          processingFormateurId === entry.id
                        }
                        onClick={() => rejectFormateur(entry.id)}
                      >
                        Reject
                      </button>
                    </div>
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

      <div className="card">
        <div className="card-head-row">
          <h2>Approved Students and Invoices</h2>
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
            value={invoiceGroupFilter}
            onChange={(event) => setInvoiceGroupFilter(event.target.value)}
          >
            <option value="all">All Students</option>
            <option value="multi">Students with Multiple Invoices</option>
            <option value="single">Students with One Invoice</option>
            <option value="high_value">High Value (at least 500 EUR)</option>
          </select>
          <select
            value={invoiceGroupSort}
            onChange={(event) => setInvoiceGroupSort(event.target.value)}
          >
            <option value="recent">Most Recent Invoice</option>
            <option value="invoice_count">Most Invoices</option>
            <option value="total_amount">Highest Total Amount</option>
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
                  </div>
                  <div className="row">
                    <StatusBadge
                      label={`${group.invoices.length} invoices`}
                      tone="blue"
                    />
                    <StatusBadge
                      label={`Total ${group.totalAmount.toFixed(2)} EUR`}
                      tone="green"
                    />
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
                </div>

                <p className="hint">
                  Latest invoice: {new Date(group.latestIssuedAt).toLocaleString()}
                </p>

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
                            <td>{Number(entry.amount || 0).toFixed(2)} EUR</td>
                            <td>
                              {new Date(entry.createdAt).toLocaleString()}
                            </td>
                            <td>
                              <a
                                className="link-btn small-btn"
                                href={resolveApiAssetUrl(entry.pdfUrl)}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Open PDF
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
    </section>
  );
}
