import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api';
import { getCurrentUser } from '../auth';
import StatusBadge from '../components/StatusBadge';
import LoadingButton from '../components/LoadingButton';

export default function AdminDashboardPage({ pushToast }) {
  const user = getCurrentUser();
  const navigate = useNavigate();
  const [formations, setFormations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [publishingId, setPublishingId] = useState(null);

  async function loadFormations() {
    setIsLoading(true);
    try {
      const data = await apiRequest('/formations/manage', {
        token: user.token,
      });
      setFormations(data);
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setIsLoading(false);
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

  const sortedFormations = useMemo(() => {
    return [...formations].sort((a, b) => {
      if (a.published === b.published) return b.id - a.id;
      return Number(a.published) - Number(b.published);
    });
  }, [formations]);

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
          <button type="button" onClick={loadFormations} disabled={isLoading}>
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="dashboard-grid">
        {sortedFormations.map((formation) => (
          <article key={formation.id} className="card formation-card">
            <div className="card-head-row">
              <h2>{formation.title}</h2>
              <StatusBadge
                tone={formation.type === 'ONLINE' ? 'blue' : 'orange'}
                label={formation.type}
              />
            </div>

            <p>{formation.description}</p>
            <p className="hint">Price: {formation.price}</p>

            <div className="row card-actions">
              <StatusBadge
                tone={formation.published ? 'green' : 'gray'}
                label={formation.published ? 'Published' : 'Draft'}
              />
              <LoadingButton
                className="btn-publish-formation"
                type="button"
                isLoading={publishingId === formation.id}
                loadingText="Publishing..."
                disabled={formation.published}
                onClick={() => publishFormation(formation.id)}
              >
                {formation.published ? 'Published' : 'Publish'}
              </LoadingButton>
              <Link className="link-btn" to={`/formateur/formations/${formation.id}`}>
                Open
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
