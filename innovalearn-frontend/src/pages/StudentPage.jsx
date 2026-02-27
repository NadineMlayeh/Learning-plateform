import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, resolveApiAssetUrl } from '../api';
import { getCurrentUser } from '../auth';
import ProfileSidebar from '../components/ProfileSidebar';
import StatusBadge from '../components/StatusBadge';

const INVOICE_PAGE_SIZE = 3;
const STREAK_TARGET_DAYS = 5;
const DASH_SECTIONS = {
  COURSES: 'courses',
  CERTIFICATES: 'certificates',
  PAYMENTS: 'payments',
  PENDING: 'pending',
};

const COURSE_THUMBNAILS = [
  '/images/authbackground.jpg',
  '/images/backstudent.jpg',
  '/images/backstudents.png',
  '/images/coursereal.jpg',
  '/images/facture.png',
  '/images/yeah.png',
  '/images/yeahh.jpg',
];

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

function IconAward() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="4.2" />
      <path d="M8.4 12.2L7 21l5-2.2L17 21l-1.4-8.8" />
    </svg>
  );
}

function IconInvoice() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3h10v18l-2.5-1.5L12 21l-2.5-1.5L7 21V3z" />
      <path d="M9 8h6M9 12h6M9 16h4" />
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

function IconPlay() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 6l10 6-10 6V6z" />
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

function IconCloudDownload() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      aria-hidden="true"
    >
      <path fill="none" d="M0 0h24v24H0z" />
      <path
        fill="currentColor"
        d="M1 14.5a6.496 6.496 0 0 1 3.064-5.519 8.001 8.001 0 0 1 15.872 0 6.5 6.5 0 0 1-2.936 12L7 21c-3.356-.274-6-3.078-6-6.5zm15.848 4.487a4.5 4.5 0 0 0 2.03-8.309l-.807-.503-.12-.942a6.001 6.001 0 0 0-11.903 0l-.12.942-.805.503a4.5 4.5 0 0 0 2.029 8.309l.173.013h9.35l.173-.013zM13 12h3l-4 5-4-5h3V8h2v4z"
      />
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

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" />
      <path d="M7.5 2.8v3.4M16.5 2.8v3.4M3.5 9h17" />
    </svg>
  );
}

function thumbnailFor(itemId) {
  const safe = Math.abs(Number(itemId || 0));
  return COURSE_THUMBNAILS[safe % COURSE_THUMBNAILS.length];
}

function shortText(value, max = 120) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}...`;
}

function toDateLabel(value) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return '-';
  }
}

function toDateOnlyLabel(value) {
  if (!value) return '-';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString();
  } catch {
    return '-';
  }
}

function toLocalDayStamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getFormationProgress(entry) {
  const formation = entry?.formation;
  if (!formation) {
    return {
      percent: 0,
      finalizedCourses: 0,
      passedCourses: 0,
      totalCourses: 0,
      completed: false,
    };
  }

  if (formation.type === 'PRESENTIEL') {
    return {
      percent: 100,
      finalizedCourses: 0,
      passedCourses: 0,
      totalCourses: 0,
      completed: true,
    };
  }

  const courses = formation.courses || [];
  const totalCourses = courses.length;
  const finalizedCourses = courses.filter((course) => course.results?.[0]).length;
  const passedCourses = courses.filter((course) => course.results?.[0]?.passed).length;
  const hasFormationResult = Boolean(formation.results?.[0]);
  const percent = totalCourses > 0 ? Math.round((finalizedCourses / totalCourses) * 100) : 0;

  return {
    percent: hasFormationResult ? 100 : percent,
    finalizedCourses,
    passedCourses,
    totalCourses,
    completed: hasFormationResult,
    success: Boolean(formation.results?.[0]?.completed),
  };
}

function QuickActionCard({
  iconSrc,
  iconAlt,
  title,
  metric,
  subtitle,
  cta,
  active,
  onClick,
}) {
  return (
    <button
      type="button"
      className={`student-v2-quick-card ${active ? 'is-active' : ''}`}
      onClick={onClick}
    >
      <span className="student-v2-quick-icon">
        <img src={iconSrc} alt={iconAlt || title} />
      </span>
      <div className="student-v2-quick-main">
        <h3>{title}</h3>
        <strong>{metric}</strong>
        <p>{subtitle}</p>
        <span className="student-v2-quick-cta">{cta}</span>
      </div>
    </button>
  );
}

export default function StudentPage({ pushToast }) {
  const user = getCurrentUser();
  const navigate = useNavigate();

  const [studentName, setStudentName] = useState('Student');
  const [formations, setFormations] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [invoicePage, setInvoicePage] = useState(1);
  const [enrollingFormationId, setEnrollingFormationId] = useState(null);
  const [activeSection, setActiveSection] = useState(DASH_SECTIONS.COURSES);
  const [streakDays, setStreakDays] = useState(1);

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

  async function loadInvoices() {
    setLoadingInvoices(true);
    try {
      const data = await apiRequest('/invoices/my', { token: user.token });
      setInvoices(data || []);
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setLoadingInvoices(false);
    }
  }

  async function loadStudentProfile() {
    try {
      const profile = await apiRequest('/users/me', { token: user.token });
      const name = String(profile?.name || '').trim();
      if (name) {
        setStudentName(name);
        return;
      }
    } catch {
      // fallback to /users for compatibility
    }

    try {
      const users = await apiRequest('/users', { token: user.token });
      const current = (users || []).find(
        (entry) => Number(entry.id) === Number(user.userId),
      );
      const name = String(current?.name || '').trim();
      if (name) setStudentName(name);
    } catch {
      // keep default "Student"
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
        const exists = prev.some((entry) => entry.formationId === formationId);
        if (exists) return prev;

        return [
          ...prev,
          {
            ...enrollment,
            formation: formations.find((formation) => formation.id === formationId),
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
      formations
        .filter((formation) => !enrollmentByFormation.has(formation.id))
        .sort((a, b) => {
          const left = a.createdAt ? new Date(a.createdAt).getTime() : a.id;
          const right = b.createdAt ? new Date(b.createdAt).getTime() : b.id;
          return right - left;
        }),
    [formations, enrollmentByFormation],
  );

  const approvedEnrollments = useMemo(
    () =>
      enrollments
        .filter((entry) => entry.status === 'APPROVED')
        .sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
    [enrollments],
  );

  const pendingEnrollments = useMemo(
    () =>
      enrollments
        .filter((entry) => entry.status === 'PENDING')
        .sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
    [enrollments],
  );

  const sortedInvoices = useMemo(
    () =>
      [...invoices].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [invoices],
  );

  const invoiceTotalPages = Math.max(
    1,
    Math.ceil(sortedInvoices.length / INVOICE_PAGE_SIZE),
  );
  const invoicePageRows = sortedInvoices.slice(
    (invoicePage - 1) * INVOICE_PAGE_SIZE,
    invoicePage * INVOICE_PAGE_SIZE,
  );

  const certificateCount = useMemo(
    () =>
      approvedEnrollments.filter((entry) => entry.formation?.results?.[0]?.certificateUrl)
        .length,
    [approvedEnrollments],
  );

  const badgeCount = useMemo(
    () =>
      approvedEnrollments.reduce((sum, entry) => {
        const courses = entry.formation?.courses || [];
        const earned = courses.filter((course) => course.results?.[0]?.badgeUrl).length;
        return sum + earned;
      }, 0),
    [approvedEnrollments],
  );

  const pendingInvoicesCount = useMemo(
    () =>
      invoices.filter(
        (invoice) => String(invoice.status || '').toUpperCase() === 'PENDING',
      ).length,
    [invoices],
  );

  const recentApprovedName = approvedEnrollments[0]?.formation?.title || 'No active course yet';

  const overallProgress = useMemo(() => {
    if (approvedEnrollments.length === 0) return 0;
    const total = approvedEnrollments.reduce(
      (sum, entry) => sum + getFormationProgress(entry).percent,
      0,
    );
    return Math.round(total / approvedEnrollments.length);
  }, [approvedEnrollments]);

  const streakPercent = useMemo(() => {
    const safe = Math.max(1, Math.min(STREAK_TARGET_DAYS, Number(streakDays || 1)));
    if (STREAK_TARGET_DAYS <= 1) return 100;
    return ((safe - 1) / (STREAK_TARGET_DAYS - 1)) * 100;
  }, [streakDays]);

  const achievementRows = useMemo(() => {
    return approvedEnrollments
      .map((entry) => {
        const formation = entry.formation;
        const formationResult = formation?.results?.[0] || null;
        const earnedBadges = (formation?.courses || [])
          .map((course) => ({
            courseId: course.id,
            courseTitle: course.title,
            badgeUrl: course.results?.[0]?.badgeUrl || null,
          }))
          .filter((badge) => badge.badgeUrl);

        if (!formationResult?.certificateUrl && earnedBadges.length === 0) return null;

        return {
          enrollmentId: entry.id,
          formationId: formation?.id || entry.formationId,
          formationTitle: formation?.title || `Formation #${entry.formationId}`,
          certificateUrl: formationResult?.certificateUrl || null,
          badges: earnedBadges,
        };
      })
      .filter(Boolean);
  }, [approvedEnrollments]);

  const quickCards = [
    {
      key: DASH_SECTIONS.COURSES,
      iconSrc: '/images/course.png',
      iconAlt: 'Courses',
      title: 'My Courses',
      metric: `${approvedEnrollments.length} enrolled`,
      subtitle: `Recent: ${recentApprovedName}`,
      cta: 'Continue Learning',
    },
    {
      key: DASH_SECTIONS.CERTIFICATES,
      iconSrc: '/images/certif.png',
      iconAlt: 'Certificates',
      title: 'My Certificates',
      metric: `${certificateCount + badgeCount} earned`,
      subtitle: `${certificateCount} certificates • ${badgeCount} badges`,
      cta: 'View Certificates',
    },
    {
      key: DASH_SECTIONS.PAYMENTS,
      iconSrc: '/images/facture.png',
      iconAlt: 'Payments',
      title: 'My Payments',
      metric: `${sortedInvoices.length} invoices`,
      subtitle: `${pendingInvoicesCount} pending`,
      cta: 'View Invoices',
    },
    {
      key: DASH_SECTIONS.PENDING,
      iconSrc: '/images/pending.png',
      iconAlt: 'Pending',
      title: 'Pending Requests',
      metric: `${pendingEnrollments.length} pending`,
      subtitle: 'Waiting for admin review',
      cta: 'Track Status',
    },
  ];

  function renderCoursesSection() {
    return (
      <div className="student-v2-section-stack">
        {approvedEnrollments.length === 0 && (
          <div className="student-v2-empty-state">
            <div className="student-v2-empty-illustration">
              <IconRocket />
            </div>
            <h3>You haven&apos;t enrolled in a course yet. Let&apos;s start your learning journey!</h3>
            <p className="hint">Pick a formation below and send your enrollment request.</p>
          </div>
        )}

        {approvedEnrollments.length > 0 && (
          <div className="student-v2-group student-v2-enrolled-group">
            <div className="student-v2-group-head">
              <h3>Enrolled Courses</h3>
              <p className="hint">Open online content and continue where you left off.</p>
            </div>
            <div className="student-v2-course-grid">
              {approvedEnrollments.map((entry) => {
                const formation = entry.formation;
                const progress = getFormationProgress(entry);
                const completedBadgeLabel = progress.completed
                  ? progress.success === false
                    ? 'Completed'
                    : 'Completed'
                  : null;

                return (
                  <article key={entry.id} className="student-v2-course-card">
                    <div className="student-v2-course-thumb">
                      <img
                        src={thumbnailFor(formation?.id || entry.formationId)}
                        alt={formation?.title || 'Course'}
                      />
                    </div>
                    <div className="student-v2-course-body">
                      <div className="student-v2-course-head">
                        <h4>{formation?.title || `Formation #${entry.formationId}`}</h4>
                        <div className="row student-v2-badges">
                          {completedBadgeLabel && (
                            <StatusBadge
                              label={completedBadgeLabel}
                              tone={progress.success === false ? 'red' : 'green'}
                            />
                          )}
                        </div>
                      </div>

                      {formation?.description && (
                        <p className="hint">{shortText(formation.description, 108)}</p>
                      )}

                      <div className="student-v2-meta-line">
                        <span className="student-v2-inline-icon">
                          <IconSpark />
                        </span>
                        <span>{progress.percent}% overall progress</span>
                      </div>

                      {formation?.type === 'ONLINE' && (
                        <div className="student-v2-meta-line">
                          <span className="student-v2-inline-icon">
                            <IconRocket />
                          </span>
                          <span>
                            {progress.finalizedCourses}/{progress.totalCourses} courses finalized
                          </span>
                        </div>
                      )}

                      {formation?.type === 'PRESENTIEL' && formation?.location && (
                        <div className="student-v2-meta-line">
                          <span className="student-v2-inline-icon">
                            <IconLocation />
                          </span>
                          <span>Location: {formation.location}</span>
                        </div>
                      )}

                      {formation?.type === 'PRESENTIEL' && (
                        <div className="student-v2-meta-line">
                          <span className="student-v2-inline-icon">
                            <IconCalendar />
                          </span>
                          <span>
                            Dates: {toDateOnlyLabel(formation?.startDate)} -{' '}
                            {toDateOnlyLabel(formation?.endDate)}
                          </span>
                        </div>
                      )}

                      <div className="student-v2-card-actions">
                        {formation?.type === 'ONLINE' ? (
                          <button
                            type="button"
                            className="student-v2-primary-btn student-v2-open-content-btn"
                            onClick={() => navigate(`/student/formations/${entry.formationId}`)}
                          >
                            <span className="student-v2-inline-icon">
                              <IconPlay />
                            </span>
                            Open Content
                          </button>
                        ) : (
                          <span className="student-v2-soft-pill">On-site Formation</span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        <div className="student-v2-group">
          <div className="student-v2-group-head">
            <h3>Discover New Formations</h3>
            <p className="hint">Explore and enroll in newly published formations.</p>
          </div>
          {unenrolledFormations.length === 0 ? (
            <p className="hint">You are already enrolled in all currently published formations.</p>
          ) : (
            <div className="student-v2-course-grid">
              {unenrolledFormations.map((formation) => (
                <article key={formation.id} className="student-v2-course-card">
                  <div className="student-v2-course-thumb">
                    <img src={thumbnailFor(formation.id)} alt={formation.title} />
                  </div>
                  <div className="student-v2-course-body">
                    <div className="student-v2-course-head">
                      <h4>{formation.title}</h4>
                      <StatusBadge
                        label={formation.type}
                        tone={formation.type === 'ONLINE' ? 'blue' : 'orange'}
                      />
                    </div>

                    <p className="hint">{shortText(formation.description, 100)}</p>

                    <div className="student-v2-meta-line">
                      <span className="student-v2-inline-icon">
                        <IconCoin />
                      </span>
                      <span>Price: {formation.price}</span>
                    </div>

                    {formation.type === 'PRESENTIEL' && formation.location && (
                      <div className="student-v2-meta-line">
                        <span className="student-v2-inline-icon">
                          <IconLocation />
                        </span>
                        <span>Location: {formation.location}</span>
                      </div>
                    )}

                    {formation.type === 'PRESENTIEL' && (
                      <div className="student-v2-meta-line">
                        <span className="student-v2-inline-icon">
                          <IconCalendar />
                        </span>
                        <span>
                          Dates: {toDateOnlyLabel(formation.startDate)} -{' '}
                          {toDateOnlyLabel(formation.endDate)}
                        </span>
                      </div>
                    )}

                    <div className="student-v2-card-actions">
                      <button
                        type="button"
                        className="student-v2-primary-btn"
                        onClick={() => enroll(formation.id)}
                        disabled={enrollingFormationId === formation.id}
                      >
                        {enrollingFormationId === formation.id ? 'Enrolling...' : 'Enroll'}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderCertificatesSection() {
    return (
      <div className="student-v2-section-stack">
        <div className="student-v2-group">
          <div className="student-v2-group-head">
            <h3>Certificates and Badges</h3>
            <p className="hint">
              Your achievements are saved and can be downloaded any time.
            </p>
          </div>

          {achievementRows.length === 0 ? (
            <p className="hint">No certificates or badges earned yet. Keep going!</p>
          ) : (
            <div className="student-v2-achievement-grid">
              {achievementRows.map((row) => (
                <article key={row.enrollmentId} className="student-v2-achievement-card">
                  <h4>{row.formationTitle}</h4>

                  <div className="student-v2-achievement-block">
                    <p className="student-v2-achievement-block-title">
                      <img
                        src="/images/certificate.png"
                        alt=""
                        className="student-v2-achievement-title-icon student-v2-achievement-title-icon-cert"
                      />
                      <span>Certificate Section</span>
                    </p>
                    {row.certificateUrl ? (
                      <a
                        className="student-v2-doc-link student-v2-doc-link-cert"
                        href={resolveApiAssetUrl(row.certificateUrl)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open Certificate
                      </a>
                    ) : (
                      <span className="student-v2-soft-pill">
                        Final certificate not generated yet
                      </span>
                    )}
                  </div>

                  <div className="student-v2-achievement-block">
                    <p className="student-v2-achievement-block-title">
                      <span className="student-v2-achievement-title-emoji" aria-hidden="true">
                        🏆
                      </span>
                      <span>Badges Earned :</span>
                    </p>
                    {row.badges.length > 0 ? (
                      <div className="student-v2-achievement-badge-row">
                        {row.badges.map((badge) => (
                          <a
                            key={`${row.enrollmentId}-${badge.courseId}`}
                            className="student-v2-doc-link-badge-bg"
                            href={resolveApiAssetUrl(badge.badgeUrl)}
                            target="_blank"
                            rel="noreferrer"
                            title={badge.courseTitle}
                          >
                            Badge
                          </a>
                        ))}
                      </div>
                    ) : (
                      <span className="student-v2-soft-pill">No badge earned yet</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderPaymentsSection() {
    return (
      <div className="student-v2-section-stack">
        <div className="student-v2-group">
          <div className="student-v2-group-head">
            <h3>My Invoices</h3>
            <p className="hint">Most recent invoices appear first. Download any invoice instantly.</p>
          </div>

          {loadingInvoices && <p className="hint">Loading invoices...</p>}

          {!loadingInvoices && sortedInvoices.length === 0 && (
            <p className="hint">No invoice available yet. It appears after admin approval.</p>
          )}

          {!loadingInvoices && sortedInvoices.length > 0 && (
            <>
              <div className="student-v2-invoice-grid">
                {invoicePageRows.map((invoice) => (
                  <article key={invoice.id} className="student-v2-invoice-card">
                    <h4>
                      {invoice.enrollment?.formation?.title ||
                        `Formation #${invoice.enrollment?.formation?.id || '-'}`}
                    </h4>
                    <p className="hint student-v2-invoice-meta">
                      Amount: {Number(invoice.amount || 0).toFixed(2)} EUR
                    </p>
                    <p className="hint student-v2-invoice-meta">
                      Issued: {toDateLabel(invoice.createdAt)}
                    </p>
                    <a
                      className="student-v2-doc-link student-v2-invoice-open-btn"
                      href={resolveApiAssetUrl(invoice.pdfUrl)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span className="student-v2-inline-icon" aria-hidden="true">
                        <IconCloudDownload />
                      </span>
                      <span>Open Invoice</span>
                    </a>
                  </article>
                ))}
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
                  onClick={() => setInvoicePage((prev) => Math.min(invoiceTotalPages, prev + 1))}
                  disabled={invoicePage === invoiceTotalPages}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  function renderPendingSection() {
    return (
      <div className="student-v2-section-stack">
        <div className="student-v2-group">
          <div className="student-v2-group-head">
            <h3>Pending Enrollment Requests</h3>
            <p className="hint">These requests are waiting for admin validation.</p>
          </div>

          {pendingEnrollments.length === 0 ? (
            <p className="hint">No pending requests right now.</p>
          ) : (
            <div className="student-v2-pending-grid">
              {pendingEnrollments.map((entry) => (
                <article key={entry.id} className="student-v2-pending-card">
                  <div className="student-v2-pending-thumb">
                    <img
                      src={thumbnailFor(entry.formation?.id || entry.formationId)}
                      alt={entry.formation?.title || 'Pending formation'}
                    />
                  </div>
                  <div className="student-v2-pending-body">
                    <div className="student-v2-course-head">
                      <h4>{entry.formation?.title || `Formation #${entry.formationId}`}</h4>
                      <StatusBadge label="PENDING" tone="orange" />
                    </div>
                    <p className="hint">Type: {entry.formation?.type || '-'}</p>
                    <p className="hint">Requested: {toDateLabel(entry.createdAt)}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderDynamicContent() {
    if (activeSection === DASH_SECTIONS.CERTIFICATES) return renderCertificatesSection();
    if (activeSection === DASH_SECTIONS.PAYMENTS) return renderPaymentsSection();
    if (activeSection === DASH_SECTIONS.PENDING) return renderPendingSection();
    return renderCoursesSection();
  }

  useEffect(() => {
    loadStudentProfile();
    loadFormations();
    loadEnrollments();
    loadInvoices();
  }, []);

  useEffect(() => {
    if (!user?.userId) return;

    const streakKey = `innova_streak_user_${user.userId}`;
    const today = toLocalDayStamp();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = toLocalDayStamp(yesterdayDate);

    let nextStreak = 1;

    try {
      const savedRaw = localStorage.getItem(streakKey);
      const saved = savedRaw ? JSON.parse(savedRaw) : null;
      const savedCount = Number(saved?.count || 0);
      const lastVisit = String(saved?.lastVisit || '');

      if (lastVisit === today) {
        nextStreak = Math.max(1, Math.min(STREAK_TARGET_DAYS, savedCount || 1));
      } else if (lastVisit === yesterday) {
        nextStreak = Math.max(1, Math.min(STREAK_TARGET_DAYS, savedCount + 1));
      } else {
        nextStreak = 1;
      }
    } catch {
      nextStreak = 1;
    }

    localStorage.setItem(
      streakKey,
      JSON.stringify({
        count: nextStreak,
        lastVisit: today,
      }),
    );

    setStreakDays(nextStreak);
  }, [user?.userId]);

  useEffect(() => {
    setInvoicePage(1);
  }, [sortedInvoices.length]);

  useEffect(() => {
    if (invoicePage > invoiceTotalPages) {
      setInvoicePage(invoiceTotalPages);
    }
  }, [invoicePage, invoiceTotalPages]);

  return (
    <section className="student-v2 stack">
      <ProfileSidebar user={user} />

      <article className="student-v2-hero">
        <div className="student-v2-hero-edge-avatar" aria-hidden="true">
          <img src="/images/student.png" alt="Student avatar" />
        </div>

        <div className="student-v2-hero-main">
          <div className="student-v2-hero-text">
            <h1>Welcome back, {studentName} 👋</h1>
            <p>Keep learning. You&apos;re making great progress!</p>
          </div>

          <div
            className={`student-v2-streak ${streakDays >= STREAK_TARGET_DAYS ? 'is-complete' : ''}`}
          >
            <div className="student-v2-streak-head">
              <strong>{streakDays}/{STREAK_TARGET_DAYS} day streak</strong>
              <span>
                {streakDays >= STREAK_TARGET_DAYS
                  ? "Congrats, you've been on track for 5 days straight!"
                  : 'Come back tomorrow to move your streak flame forward.'}
              </span>
            </div>

            <div className="student-v2-streak-track">
              <div className="student-v2-streak-line" />
              <div className="student-v2-streak-steps">
                {Array.from({ length: STREAK_TARGET_DAYS }, (_, index) => {
                  const day = index + 1;
                  return (
                    <span
                      key={day}
                      className={`student-v2-streak-step ${day <= streakDays ? 'is-active' : ''}`}
                    >
                      {day}
                    </span>
                  );
                })}
              </div>
              <span
                className="student-v2-streak-fire"
                style={{ left: `${streakPercent}%` }}
                aria-label={`${streakDays} day streak`}
              >
                🔥
              </span>
            </div>
          </div>
        </div>

        <div className="student-v2-hero-progress">
          <div
            className="student-v2-progress-ring"
            style={{
              background: `conic-gradient(#0ac4e0 ${overallProgress}%, #d9e5f3 ${overallProgress}% 100%)`,
            }}
          >
            <div className="student-v2-progress-inner">
              <strong>{overallProgress}%</strong>
              <span>Completed</span>
            </div>
          </div>
        </div>
      </article>

      <section className="student-v2-quick-grid">
        {quickCards.map((card) => (
          <QuickActionCard
            key={card.key}
            iconSrc={card.iconSrc}
            iconAlt={card.iconAlt}
            title={card.title}
            metric={card.metric}
            subtitle={card.subtitle}
            cta={card.cta}
            active={activeSection === card.key}
            onClick={() => setActiveSection(card.key)}
          />
        ))}
      </section>

      <article className="student-v2-content card">
        {renderDynamicContent()}
      </article>
    </section>
  );
}
