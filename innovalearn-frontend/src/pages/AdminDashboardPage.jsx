import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api';
import { getCurrentUser } from '../auth';
import StatusBadge from '../components/StatusBadge';
import LoadingButton from '../components/LoadingButton';

const PAGE_SIZE = 3;

export default function AdminDashboardPage({ pushToast }) {
  const user = getCurrentUser();
  const navigate = useNavigate();
  const [formations, setFormations] = useState([]);
  const [publishingId, setPublishingId] = useState(null);
  const [filterMode, setFilterMode] = useState('latest_added');
  const [titleSearch, setTitleSearch] = useState('');
  const [page, setPage] = useState(1);

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
      pushToast('Formation published successfully.', 'success');
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setPublishingId(null);
    }
  }

  useEffect(() => {
    loadFormations();
  }, []);

  const visibleFormations = useMemo(() => {
    function createdTimestamp(formation) {
      if (formation.createdAt) {
        return new Date(formation.createdAt).getTime();
      }
      return formation.id;
    }

    const list = formations.filter((formation) =>
      (formation.title || '')
        .toLowerCase()
        .includes(titleSearch.toLowerCase().trim()),
    );

    if (filterMode === 'published_only') {
      return list
        .filter((formation) => formation.published)
        .sort((a, b) => createdTimestamp(b) - createdTimestamp(a));
    }

    if (filterMode === 'draft_only') {
      return list
        .filter((formation) => !formation.published)
        .sort((a, b) => createdTimestamp(b) - createdTimestamp(a));
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

    if (filterMode === 'oldest_added') {
      return list.sort((a, b) => createdTimestamp(a) - createdTimestamp(b));
    }

    return list.sort((a, b) => createdTimestamp(b) - createdTimestamp(a));
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

  return (
    <section className="stack">
      <div className="card panel-head">
        <div>
          <h1>Formateur Dashboard</h1>
          <p className="hint">
            Manage your formations, courses, lessons, and quizzes.
          </p>
        </div>
        <div className="row">
          <button type="button" onClick={() => navigate('/formateur/formations/new')}>
            Add Formation
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-head-row">
          <h2>Formations</h2>
          <StatusBadge label={`${visibleFormations.length} total`} tone="neutral" />
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
            <option value="oldest_added">Added Oldest</option>
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
    </section>
  );
}
