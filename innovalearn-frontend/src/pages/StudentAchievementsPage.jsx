import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, resolveApiAssetUrl } from '../api';
import { getCurrentUser } from '../auth';
import StatusBadge from '../components/StatusBadge';

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

export default function StudentAchievementsPage({ pushToast }) {
  const user = getCurrentUser();
  const navigate = useNavigate();

  const [enrollments, setEnrollments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState('all');

  async function loadData() {
    setIsLoading(true);
    try {
      const data = await apiRequest('/enrollments', { token: user.token });
      setEnrollments(data);
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const achievementGroups = useMemo(() => {
    return [...enrollments]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime(),
      )
      .filter((entry) => entry.status === 'APPROVED')
      .map((entry) => {
        const formation = entry.formation;
        const formationResult = formation?.results?.[0] || null;
        const courses = formation?.courses || [];
        const badges = courses
          .map((course) => ({
            courseId: course.id,
            courseTitle: course.title,
            badgeUrl: course.results?.[0]?.badgeUrl || null,
            score: course.results?.[0]?.score ?? null,
            passed: course.results?.[0]?.passed ?? null,
            createdAt: course.results?.[0]?.createdAt || null,
          }))
          .filter((badge) => badge.badgeUrl);

        const history = [];
        badges.forEach((badge) => {
          history.push({
            type: 'BADGE',
            label: `${badge.courseTitle} badge`,
            url: badge.badgeUrl,
            createdAt: badge.createdAt,
          });
        });

        if (formationResult?.certificateUrl) {
          history.push({
            type: 'CERTIFICATE',
            label: `${formation.title} certificate`,
            url: formationResult.certificateUrl,
            createdAt: formationResult.createdAt,
          });
        }

        history.sort(
          (a, b) =>
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime(),
        );

        const statusKey = formationResult
          ? formationResult.completed
            ? 'completed_success'
            : 'completed_fail'
          : 'in_progress';

        return {
          enrollmentId: entry.id,
          formationId: formation?.id,
          formationTitle: formation?.title || `Formation #${entry.formationId}`,
          formationType: formation?.type || '-',
          statusKey,
          formationResult,
          badges,
          history,
          requestedAt: entry.createdAt,
        };
      });
  }, [enrollments]);

  const visibleGroups = useMemo(() => {
    return achievementGroups.filter((group) => {
      const matchesSearch = group.formationTitle
        .toLowerCase()
        .includes(search.toLowerCase().trim());

      if (!matchesSearch) return false;

      if (filterMode === 'all') return true;
      if (filterMode === 'has_badges') return group.badges.length > 0;
      return group.statusKey === filterMode;
    });
  }, [achievementGroups, search, filterMode]);

  return (
    <section className="stack achievements-page">
      <button
        type="button"
        className="floating-back-link"
        onClick={() => navigate('/student')}
      >
        <span aria-hidden="true">&lt;</span>
        <span>Back to Student Dashboard</span>
      </button>

      <div className="card achievements-hero">
        <h1>My Certificates and Badges</h1>
        <p className="hint">
          Browse all earned badges and final certificates, grouped by formation with download history.
        </p>
      </div>

      <div className="card achievements-toolbar">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by formation title"
        />
        <select
          value={filterMode}
          onChange={(event) => setFilterMode(event.target.value)}
        >
          <option value="all">All</option>
          <option value="completed_success">Completed Success</option>
          <option value="completed_fail">Completed Fail</option>
          <option value="in_progress">In Progress</option>
          <option value="has_badges">Has Badges</option>
        </select>
      </div>

      {isLoading && (
        <section className="card">
          <p>Loading achievements...</p>
        </section>
      )}

      {!isLoading && visibleGroups.length === 0 && (
        <section className="card">
          <p className="hint">No formations match this filter.</p>
        </section>
      )}

      <div className="achievements-grid">
        {visibleGroups.map((group) => (
          <article key={group.enrollmentId} className="card achievement-card">
            <div className="card-head-row">
              <h2>{group.formationTitle}</h2>
              <div className="row">
                <StatusBadge
                  label={group.formationType}
                  tone={group.formationType === 'ONLINE' ? 'blue' : 'orange'}
                />
                {group.statusKey === 'completed_success' && (
                  <StatusBadge label="Completed (Success)" tone="green" />
                )}
                {group.statusKey === 'completed_fail' && (
                  <StatusBadge label="Completed (Fail)" tone="gray" />
                )}
                {group.statusKey === 'in_progress' && (
                  <StatusBadge label="In Progress" tone="orange" />
                )}
              </div>
            </div>

            <p className="hint">Approved/Requested: {formatDate(group.requestedAt)}</p>
            <div className="achievement-section">
              <h3>Course Badges</h3>
              {group.badges.length === 0 && (
                <p className="hint">No badge earned yet in this formation.</p>
              )}
              {group.badges.map((badge) => (
                <div key={badge.courseId} className="achievement-row">
                  <div>
                    <strong>{badge.courseTitle}</strong>
                    <p className="hint">
                      Score: {badge.score == null ? '-' : `${Number(badge.score).toFixed(2)}%`}
                      {' | '}
                      {badge.passed ? 'Passed' : 'Failed'}
                    </p>
                  </div>
                  <a
                    className="student-doc-link is-ghost"
                    href={resolveApiAssetUrl(badge.badgeUrl)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Download Badge
                  </a>
                </div>
              ))}
              {group.formationResult?.certificateUrl && (
              <a
                className="student-doc-link"
                href={resolveApiAssetUrl(group.formationResult.certificateUrl)}
                target="_blank"
                rel="noreferrer"
              >
                Download Final Certificate
              </a>
            )}
            </div>

          </article>
          
        ))}
        
      </div>
    </section>
  );
}
