import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../api';
import { getCurrentUser } from '../auth';
import StatusBadge from '../components/StatusBadge';

const PAGE_SIZE = 3;

export default function AdminPage({ pushToast }) {
  const user = getCurrentUser();

  const [formateurs, setFormateurs] = useState([]);
  const [enrollments, setEnrollments] = useState([]);

  const [processingFormateurId, setProcessingFormateurId] = useState(null);
  const [processingEnrollmentId, setProcessingEnrollmentId] =
    useState(null);
  const [enrollmentSearch, setEnrollmentSearch] = useState('');
  const [enrollmentSort, setEnrollmentSort] = useState('newest');
  const [enrollmentPage, setEnrollmentPage] = useState(1);
  const [formateurSearch, setFormateurSearch] = useState('');
  const [formateurSort, setFormateurSort] = useState('pending_first');
  const [formateurPage, setFormateurPage] = useState(1);

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

  async function approveFormateur(id) {
    setProcessingFormateurId(id);
    try {
      await apiRequest(`/admin/formateur/${id}/approve`, {
        method: 'PATCH',
        token: user.token,
      });
      pushToast(`Formateur #${id} approved.`, 'success');
      await loadFormateurs();
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
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setProcessingEnrollmentId(null);
    }
  }

  function statusTone(status) {
    if (status === 'APPROVED') return 'green';
    if (status === 'PENDING') return 'orange';
    if (status === 'REJECTED') return 'gray';
    return 'neutral';
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
        return new Date(b.createdAt) - new Date(a.createdAt);
      }

      if (enrollmentSort === 'oldest') {
        return new Date(a.createdAt) - new Date(b.createdAt);
      }

      const approvedPriority = { APPROVED: 0, PENDING: 1, REJECTED: 2 };
      const rejectedPriority = { REJECTED: 0, PENDING: 1, APPROVED: 2 };
      const priorityMap =
        enrollmentSort === 'approved_first'
          ? approvedPriority
          : rejectedPriority;

      const diff = priorityMap[a.status] - priorityMap[b.status];
      if (diff !== 0) return diff;
      return new Date(b.createdAt) - new Date(a.createdAt);
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
      const statusA = a.formateurStatus || 'PENDING';
      const statusB = b.formateurStatus || 'PENDING';
      const approvedPriority = { APPROVED: 0, PENDING: 1, REJECTED: 2 };
      const rejectedPriority = { REJECTED: 0, PENDING: 1, APPROVED: 2 };
      const pendingPriority = { PENDING: 0, APPROVED: 1, REJECTED: 2 };

      const priorityMap =
        formateurSort === 'approved_first'
          ? approvedPriority
          : formateurSort === 'rejected_first'
            ? rejectedPriority
            : pendingPriority;

      const diff = priorityMap[statusA] - priorityMap[statusB];
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name);
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

  useEffect(() => {
    loadFormateurs();
    loadEnrollments();
  }, []);

  useEffect(() => {
    setEnrollmentPage(1);
  }, [enrollmentSearch, enrollmentSort]);

  useEffect(() => {
    setFormateurPage(1);
  }, [formateurSearch, formateurSort]);

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

  return (
    <section className="stack">
      <div className="card panel-head">
        <div>
          <h1>Admin Dashboard</h1>
          <p className="hint">
            Manage student enrollment approvals and formateur account approvals.
          </p>
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
            <option value="oldest">Oldest First</option>
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
                const isProcessing =
                  processingEnrollmentId === entry.id;

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
                    <td>
                      {new Date(entry.createdAt).toLocaleString()}
                    </td>
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
            <option value="pending_first">Pending First</option>
            <option value="approved_first">Approved First</option>
            <option value="rejected_first">Rejected First</option>
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
                  <td>{entry.formateurStatus || '-'}</td>
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
    </section>
  );
}
