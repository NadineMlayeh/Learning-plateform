import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api';
import { getCurrentUser } from '../auth';
import StatusBadge from '../components/StatusBadge';

function IconSpark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
    </svg>
  );
}

function IconRocket() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 3c3 0 6 3 6 6-2 4-5 7-9 9-3 0-6-3-6-6 2-4 5-7 9-9z" />
      <path d="M9 15l-3 6 6-3" />
      <circle cx="14.5" cy="9.5" r="1.5" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3l7 3v6c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V6l7-3z" />
      <path d="M9.5 12.5l1.8 1.8 3.5-3.5" />
    </svg>
  );
}

function IconHourglass() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3h10M7 21h10M8 3c0 4 4 4.5 4 9s-4 5-4 9M16 3c0 4-4 4.5-4 9s4 5 4 9" />
    </svg>
  );
}

function IconCoin() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <ellipse cx="12" cy="8" rx="6.5" ry="3.5" />
      <path d="M5.5 8v8c0 1.9 2.9 3.5 6.5 3.5s6.5-1.6 6.5-3.5V8" />
      <path d="M9.2 12h5.6" />
    </svg>
  );
}

function IconLocation() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21s6-5.4 6-10a6 6 0 10-12 0c0 4.6 6 10 6 10z" />
      <circle cx="12" cy="11" r="2.2" />
    </svg>
  );
}

function IconPlay() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 6l10 6-10 6V6z" />
    </svg>
  );
}

function StudentCarouselSection({
  sectionKey,
  title,
  subtitle,
  icon,
  items,
  emptyMessage,
  themeClass,
  onScroll,
  setRailRef,
  renderCard,
}) {
  return (
    <section className={`card student-carousel-section ${themeClass}`}>
      <div className="student-carousel-head">
        <div className="student-section-title">
          <span className="student-section-icon">{icon}</span>
          <div>
            <h2>{title}</h2>
            {subtitle && <p className="hint">{subtitle}</p>}
          </div>
        </div>
        <div className="carousel-controls">
          <button
            type="button"
            className="carousel-arrow"
            onClick={() => onScroll(sectionKey, -1)}
            aria-label={`Scroll ${title} left`}
          >
            &lt;
          </button>
          <button
            type="button"
            className="carousel-arrow"
            onClick={() => onScroll(sectionKey, 1)}
            aria-label={`Scroll ${title} right`}
          >
            &gt;
          </button>
        </div>
      </div>

      <div
        className="carousel-track"
        ref={(node) => setRailRef(sectionKey, node)}
      >
        {items.length === 0 && (
          <article className="student-card student-empty-card">
            <p className="hint">{emptyMessage}</p>
          </article>
        )}

        {items.map(renderCard)}
      </div>
    </section>
  );
}

export default function StudentPage({ pushToast }) {
  const user = getCurrentUser();
  const navigate = useNavigate();

  const [formations, setFormations] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [enrollingFormationId, setEnrollingFormationId] = useState(null);

  const railRefs = useRef({});

  async function loadFormations() {
    try {
      const data = await apiRequest('/formations', { token: user.token });
      setFormations(data);
    } catch (err) {
      pushToast(err.message, 'error');
    }
  }

  async function loadEnrollments() {
    try {
      const data = await apiRequest('/enrollments', { token: user.token });
      setEnrollments(data);
    } catch (err) {
      pushToast(err.message, 'error');
    }
  }

  async function enroll(formationId) {
    setEnrollingFormationId(formationId);
    try {
      const enrollment = await apiRequest(`/enrollments/${formationId}`, {
        method: 'POST',
        token: user.token,
      });

      setEnrollments((prev) => {
        const exists = prev.some(
          (entry) => entry.formationId === formationId,
        );

        if (exists) return prev;

        return [
          ...prev,
          {
            ...enrollment,
            formation: formations.find((f) => f.id === formationId),
          },
        ];
      });

      pushToast('Enrollment submitted. Status is now PENDING.', 'success');
      await loadEnrollments();
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setEnrollingFormationId(null);
    }
  }

  const enrollmentByFormation = useMemo(() => {
    const map = new Map();
    for (const enrollment of enrollments) {
      map.set(enrollment.formationId, enrollment);
    }
    return map;
  }, [enrollments]);

  const unenrolledFormations = useMemo(
    () =>
      formations.filter(
        (formation) => !enrollmentByFormation.has(formation.id),
      ),
    [formations, enrollmentByFormation],
  );

  const approvedEnrollments = useMemo(
    () => enrollments.filter((entry) => entry.status === 'APPROVED'),
    [enrollments],
  );

  const pendingEnrollments = useMemo(
    () => enrollments.filter((entry) => entry.status === 'PENDING'),
    [enrollments],
  );

  function setRailRef(sectionKey, node) {
    railRefs.current[sectionKey] = node;
  }

  function onScroll(sectionKey, direction) {
    const rail = railRefs.current[sectionKey];
    if (!rail) return;

    rail.scrollBy({
      left: direction * 360,
      behavior: 'smooth',
    });
  }

  useEffect(() => {
    loadFormations();
    loadEnrollments();
  }, []);

  return (
    <section className="student-dashboard stack">
      <div className="card student-hero">
        <div className="student-hero-main">
          <span className="student-hero-icon">
            <IconSpark />
          </span>
          <div>
            <h1>Student Adventure Hub</h1>
            <p className="hint">
              Discover formations, enroll in your favorites, and unlock online lessons after admin approval.
            </p>
          </div>
        </div>
        <div className="student-hero-stats">
          <article>
            <strong>{unenrolledFormations.length}</strong>
            <span>Ready to Explore</span>
          </article>
          <article>
            <strong>{approvedEnrollments.length}</strong>
            <span>Unlocked</span>
          </article>
          <article>
            <strong>{pendingEnrollments.length}</strong>
            <span>Pending</span>
          </article>
        </div>
      </div>

      <StudentCarouselSection
        sectionKey="unenrolled"
        title="Discover New Formations"
        subtitle="Swipe or use arrows to explore options you can still enroll in."
        icon={<IconRocket />}
        items={unenrolledFormations}
        emptyMessage="You are already enrolled in all currently published formations."
        themeClass="student-theme-discover"
        onScroll={onScroll}
        setRailRef={setRailRef}
        renderCard={(formation) => (
          <article key={formation.id} className="student-card student-card-discover">
            <div className="card-head-row">
              <h3>{formation.title}</h3>
              <StatusBadge
                label={formation.type}
                tone={formation.type === 'ONLINE' ? 'blue' : 'orange'}
              />
            </div>
            <p>{formation.description}</p>
            <p className="hint student-meta">
              <span className="student-meta-icon">
                <IconCoin />
              </span>
              Price: {formation.price}
            </p>
            {formation.type === 'PRESENTIEL' && formation.location && (
              <p className="hint student-meta">
                <span className="student-meta-icon">
                  <IconLocation />
                </span>
                Location: {formation.location}
              </p>
            )}
            <button
              type="button"
              className="student-primary-btn"
              onClick={() => enroll(formation.id)}
              disabled={enrollingFormationId === formation.id}
            >
              {enrollingFormationId === formation.id ? 'Enrolling...' : 'Enroll'}
            </button>
          </article>
        )}
      />

      <StudentCarouselSection
        sectionKey="approved"
        title="Approved Formations"
        subtitle="These formations are unlocked for you."
        icon={<IconShield />}
        items={approvedEnrollments}
        emptyMessage="No approved formations yet."
        themeClass="student-theme-approved"
        onScroll={onScroll}
        setRailRef={setRailRef}
        renderCard={(entry) => {
          const formation = entry.formation;
          const canOpenOnline = formation?.type === 'ONLINE';

          return (
            <article key={entry.id} className="student-card student-card-approved">
              <div className="card-head-row">
                <h3>{formation?.title || `Formation #${entry.formationId}`}</h3>
                <StatusBadge label="APPROVED" tone="green" />
              </div>
              <p className="hint student-meta">
                <span className="student-meta-icon">
                  <IconSpark />
                </span>
                Requested: {new Date(entry.createdAt).toLocaleString()}
              </p>
              <p className="hint student-meta">
                <span className="student-meta-icon">
                  <IconRocket />
                </span>
                Type: {formation?.type || '-'}
              </p>
              {formation?.type === 'PRESENTIEL' && formation?.location && (
                <p className="hint student-meta">
                  <span className="student-meta-icon">
                    <IconLocation />
                  </span>
                  Location: {formation.location}
                </p>
              )}
              {canOpenOnline ? (
                <button
                  type="button"
                  className="student-primary-btn"
                  onClick={() =>
                    navigate(`/student/formations/${entry.formationId}`)
                  }
                >
                  <span className="student-btn-icon">
                    <IconPlay />
                  </span>
                  Open Online Content
                </button>
              ) : (
                <p className="hint">Presentiel formation. No online lessons to open.</p>
              )}
            </article>
          );
        }}
      />

      <StudentCarouselSection
        sectionKey="pending"
        title="Pending Requests"
        subtitle="Waiting for admin review."
        icon={<IconHourglass />}
        items={pendingEnrollments}
        emptyMessage="No pending enrollment requests."
        themeClass="student-theme-pending"
        onScroll={onScroll}
        setRailRef={setRailRef}
        renderCard={(entry) => (
          <article key={entry.id} className="student-card student-card-pending">
            <div className="card-head-row">
              <h3>{entry.formation?.title || `Formation #${entry.formationId}`}</h3>
              <StatusBadge label="PENDING" tone="orange" />
            </div>
            <p className="hint student-meta">
              <span className="student-meta-icon">
                <IconRocket />
              </span>
              Type: {entry.formation?.type || '-'}
            </p>
            <p className="hint student-meta">
              <span className="student-meta-icon">
                <IconSpark />
              </span>
              Requested: {new Date(entry.createdAt).toLocaleString()}
            </p>
            <p className="hint">Please wait for admin approval to unlock access.</p>
          </article>
        )}
      />
    </section>
  );
}
