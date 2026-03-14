import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest, resolveApiAssetUrl } from '../api';
import { getCurrentUser } from '../auth';
import StatusBadge from '../components/StatusBadge';

function extractDriveFileId(url) {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('drive.google.com')) return null;

    const pathMatch = parsed.pathname.match(/\/file\/d\/([^/]+)/);
    if (pathMatch?.[1]) return pathMatch[1];

    const queryId = parsed.searchParams.get('id');
    if (queryId) return queryId;

    return null;
  } catch {
    return null;
  }
}

function getLessonPdfLinks(pdfUrl) {
  const driveId = extractDriveFileId(pdfUrl);

  if (!driveId) {
    return {
      viewUrl: resolveApiAssetUrl(pdfUrl),
      downloadUrl: resolveApiAssetUrl(pdfUrl),
      isDrive: false,
    };
  }

  return {
    viewUrl: `https://drive.google.com/file/d/${driveId}/preview`,
    downloadUrl: `https://drive.google.com/uc?export=download&id=${driveId}`,
    isDrive: true,
  };
}

function getCourseQuestions(course) {
  return (course.quizzes || []).flatMap((quiz) =>
    (quiz.questions || []).map((question) => ({
      quizId: quiz.id,
      questionId: question.id,
    })),
  );
}

function formatScore(value) {
  if (value == null || Number.isNaN(Number(value))) return '0.00';
  return Number(value).toFixed(2);
}

function normalizeCourseResultFromFinalize(result) {
  return {
    score: result.score,
    passed: result.passed,
    badgeUrl: result.badgeUrl || null,
    correctAnswers: result.correctAnswers,
    totalQuestions: result.totalQuestions,
    requiredCorrect: result.requiredCorrect,
    review: result.review || [],
  };
}

function ResultPopup({ result, onClose }) {
  if (!result) return null;

  const passed = Boolean(result.passed);

  return (
    <div className="result-modal-backdrop" onClick={onClose}>
      <div
        className={`result-modal-card ${passed ? 'is-pass' : 'is-fail'}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="card-head-row">
          <h2>{passed ? 'Great Job!' : 'Keep Going!'}</h2>
          <StatusBadge label={passed ? 'PASSED' : 'FAILED'} tone={passed ? 'green' : 'orange'} />
        </div>

        <p className="hint">
          <strong>Course:</strong> {result.courseTitle}
        </p>

        <div className="result-stats-grid">
          <article>
            <span>Score</span>
            <strong>{formatScore(result.score)}%</strong>
          </article>
          <article>
            <span>Correct</span>
            <strong>
              {result.correctAnswers}/{result.totalQuestions}
            </strong>
          </article>
          <article>
            <span>Required</span>
            <strong>{result.requiredCorrect}</strong>
          </article>
        </div>

        {result.badgeUrl && (
          <a
            className="student-doc-link"
            href={resolveApiAssetUrl(result.badgeUrl)}
            target="_blank"
            rel="noreferrer"
          >
            Download Badge
          </a>
        )}

        {result.formationResult?.allCoursesFinalized && (
          <div className="result-formation-note">
            <p className="hint">
              Formation is now marked as{' '}
              <strong>
                {result.formationResult.completed
                  ? 'COMPLETED (SUCCESS)'
                  : 'COMPLETED (FAIL)'}
              </strong>
              .
            </p>
            {result.formationResult.certificateUrl && (
              <a
                className="student-doc-link"
                href={resolveApiAssetUrl(result.formationResult.certificateUrl)}
                target="_blank"
                rel="noreferrer"
              >
                Download Final Certificate
              </a>
            )}
          </div>
        )}

        <button
          type="button"
          className="student-final-submit-btn"
          onClick={onClose}
        >
          Close Review
        </button>
      </div>
    </div>
  );
}

export default function StudentFormationDetailsPage({ pushToast }) {
  const user = getCurrentUser();
  const navigate = useNavigate();
  const { formationId } = useParams();

  const [formation, setFormation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCourseIndex, setActiveCourseIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('lessons');
  const [activeLessonIdByCourse, setActiveLessonIdByCourse] = useState({});
  const [lessonViewByCourse, setLessonViewByCourse] = useState({});
  const [showQuizzesByCourse, setShowQuizzesByCourse] = useState({});
  const [quizIndexByCourse, setQuizIndexByCourse] = useState({});
  const [selectedChoiceByQuestion, setSelectedChoiceByQuestion] = useState({});
  const [loadedAnswersByQuiz, setLoadedAnswersByQuiz] = useState({});
  const [loadingAnswersByQuiz, setLoadingAnswersByQuiz] = useState({});
  const [submittingCourseId, setSubmittingCourseId] = useState(null);
  const [lockedCourseById, setLockedCourseById] = useState({});
  const [courseResultByCourse, setCourseResultByCourse] = useState({});
  const [formationResult, setFormationResult] = useState(null);
  const [resultModal, setResultModal] = useState(null);

  async function loadDetails() {
    setIsLoading(true);
    try {
      const data = await apiRequest(`/formations/${formationId}/details`, {
        token: user.token,
      });
      setFormation(data);
      setActiveCourseIndex(0);
      setActiveTab('lessons');

      const initialLocks = {};
      const initialCourseResults = {};

      (data.courses || []).forEach((course) => {
        const existingResult = course.results?.[0];
        if (existingResult) {
          initialLocks[course.id] = true;
          initialCourseResults[course.id] = {
            score: existingResult.score,
            passed: existingResult.passed,
            badgeUrl: existingResult.badgeUrl,
            review: [],
          };
        }
      });

      setLockedCourseById(initialLocks);
      setCourseResultByCourse(initialCourseResults);
      setFormationResult(data.results?.[0] || null);
    } catch (err) {
      pushToast(err.message, 'error');
      navigate('/student');
    } finally {
      setIsLoading(false);
    }
  }

  function isCourseLocked(courseId) {
    return Boolean(lockedCourseById[courseId]);
  }

  function selectChoice(courseId, questionId, choiceId) {
    if (isCourseLocked(courseId)) return;

    setSelectedChoiceByQuestion((prev) => ({
      ...prev,
      [questionId]: choiceId,
    }));
  }

  async function preloadCourseAnswers(course) {
    const quizzesToLoad = (course.quizzes || []).filter(
      (quiz) => !loadedAnswersByQuiz[quiz.id],
    );

    if (quizzesToLoad.length === 0) return;

    setLoadingAnswersByQuiz((prev) => {
      const next = { ...prev };
      quizzesToLoad.forEach((quiz) => {
        next[quiz.id] = true;
      });
      return next;
    });

    const results = await Promise.allSettled(
      quizzesToLoad.map((quiz) =>
        apiRequest(`/quizzes/${quiz.id}/my-answers`, {
          token: user.token,
        }),
      ),
    );

    const selectedPatch = {};
    const loadedPatch = {};
    let hasFailure = false;

    results.forEach((result, index) => {
      const quizId = quizzesToLoad[index].id;
      if (result.status === 'rejected') {
        hasFailure = true;
        return;
      }

      loadedPatch[quizId] = true;

      const answers = Array.isArray(result.value) ? result.value : [];
      answers.forEach((answer) => {
        selectedPatch[answer.questionId] = answer.choiceId;
      });
    });

    setLoadedAnswersByQuiz((prev) => ({ ...prev, ...loadedPatch }));
    setSelectedChoiceByQuestion((prev) => ({
      ...prev,
      ...selectedPatch,
    }));

    setLoadingAnswersByQuiz((prev) => {
      const next = { ...prev };
      quizzesToLoad.forEach((quiz) => {
        next[quiz.id] = false;
      });
      return next;
    });

    if (hasFailure) {
      pushToast('Could not load some previous quiz answers.', 'error');
    }
  }

  async function loadLockedReview(course) {
    const existing = courseResultByCourse[course.id];
    if (!isCourseLocked(course.id) || existing?.review?.length > 0) return;

    const lastQuiz = course.quizzes?.[course.quizzes.length - 1];
    if (!lastQuiz) return;

    try {
      const result = await apiRequest(`/quizzes/${lastQuiz.id}/finalize`, {
        method: 'POST',
        token: user.token,
      });

      setCourseResultByCourse((prev) => ({
        ...prev,
        [course.id]: normalizeCourseResultFromFinalize(result),
      }));

      if (result.formationResult?.allCoursesFinalized) {
        setFormationResult({
          completed: Boolean(result.formationResult.completed),
          certificateUrl:
            result.formationResult.certificateUrl || null,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      pushToast(err.message, 'error');
    }
  }

  async function toggleQuizzes(course, isVisible) {
    if (isVisible) {
      setShowQuizzesByCourse((prev) => ({
        ...prev,
        [course.id]: false,
      }));
      return;
    }

    setShowQuizzesByCourse((prev) => ({
      ...prev,
      [course.id]: true,
    }));
    setQuizIndexByCourse((prev) => ({
      ...prev,
      [course.id]: prev[course.id] ?? 0,
    }));

    await preloadCourseAnswers(course);
    await loadLockedReview(course);
  }

  function navigateQuiz(courseId, direction, totalQuizzes) {
    setQuizIndexByCourse((prev) => {
      const current = prev[courseId] ?? 0;
      const next = Math.min(
        Math.max(current + direction, 0),
        Math.max(totalQuizzes - 1, 0),
      );

      return {
        ...prev,
        [courseId]: next,
      };
    });
  }

  function navigateCourse(direction, totalCourses) {
    setActiveCourseIndex((prev) =>
      Math.min(Math.max(prev + direction, 0), Math.max(totalCourses - 1, 0)),
    );
  }

  function reviewForQuestion(courseId, questionId) {
    const reviewQuizzes = courseResultByCourse[courseId]?.review || [];

    for (const quiz of reviewQuizzes) {
      const question = (quiz.questions || []).find(
        (entry) => entry.questionId === questionId,
      );
      if (question) return question;
    }

    return null;
  }

  async function submitCourseAnswers(course) {
    if (isCourseLocked(course.id)) {
      pushToast('This course is already finalized and locked.', 'error');
      return;
    }

    const questions = getCourseQuestions(course);

    if (questions.length === 0) {
      pushToast('No quiz questions found for this course.', 'error');
      return;
    }

    const missingQuestion = questions.find(
      ({ questionId }) => selectedChoiceByQuestion[questionId] == null,
    );

    if (missingQuestion) {
      pushToast(
        'Choose one answer for every question before final submit.',
        'error',
      );
      return;
    }

    const lastQuiz = course.quizzes?.[course.quizzes.length - 1];
    if (!lastQuiz) {
      pushToast('No quiz found to finalize this course.', 'error');
      return;
    }

    setSubmittingCourseId(course.id);

    try {
      await Promise.all(
        questions.map(({ quizId, questionId }) =>
          apiRequest(`/quizzes/${quizId}/answer/${questionId}`, {
            method: 'POST',
            token: user.token,
            body: {
              choiceId: Number(selectedChoiceByQuestion[questionId]),
            },
          }),
        ),
      );

      const finalizeResult = await apiRequest(
        `/quizzes/${lastQuiz.id}/finalize`,
        {
          method: 'POST',
          token: user.token,
        },
      );

      const normalized = normalizeCourseResultFromFinalize(
        finalizeResult,
      );

      setLockedCourseById((prev) => ({
        ...prev,
        [course.id]: true,
      }));
      setCourseResultByCourse((prev) => ({
        ...prev,
        [course.id]: normalized,
      }));

      if (finalizeResult.formationResult?.allCoursesFinalized) {
        setFormationResult({
          completed: Boolean(finalizeResult.formationResult.completed),
          certificateUrl:
            finalizeResult.formationResult.certificateUrl || null,
          createdAt: new Date().toISOString(),
        });
      }

      setResultModal({
        ...finalizeResult,
        courseTitle: course.title,
      });

      pushToast(
        finalizeResult.passed
          ? 'Course finalized successfully.'
          : 'Course finalized. Review the correct answers.',
        'success',
      );
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setSubmittingCourseId(null);
    }
  }

  useEffect(() => {
    loadDetails();
  }, [formationId]);

  useEffect(() => {
    if (!formation?.courses?.length) return;
    const safeCourseIndex = Math.min(
      activeCourseIndex,
      formation.courses.length - 1,
    );
    const course = formation.courses[safeCourseIndex];
    if (!course) return;

    if (activeTab === 'quizzes') {
      if (!showQuizzesByCourse[course.id] && course.quizzes.length > 0) {
        toggleQuizzes(course, false);
      }
    } else if (showQuizzesByCourse[course.id]) {
      setShowQuizzesByCourse((prev) => ({
        ...prev,
        [course.id]: false,
      }));
    }
  }, [activeTab, activeCourseIndex, formation, showQuizzesByCourse]);

  if (isLoading || !formation) {
    return (
      <section className="card">
        <p>{isLoading ? 'Loading formation content...' : 'Formation not found.'}</p>
      </section>
    );
  }

  return (
    <section className="stack student-details-page">
      <div className="student-formation-shell">
        <div className="card student-details-hero student-details-glass">
          <div className="card-head-row">
            <h1>{formation.title}</h1>
            <StatusBadge
              label={
                formationResult
                  ? formationResult.completed
                    ? 'Completed (Success)'
                    : 'Completed (Fail)'
                  : 'In progress'
              }
              tone={
                formationResult
                  ? formationResult.completed
                    ? 'green'
                    : 'red'
                  : 'orange'
              }
            />
          </div>
          <p>{formation.description}</p>
          <p className="hint">Price: {formation.price}</p>
          {formationResult?.certificateUrl && (
            <a
              className="student-doc-link"
              href={resolveApiAssetUrl(formationResult.certificateUrl)}
              target="_blank"
              rel="noreferrer"
            >
              Download Final Certificate
            </a>
          )}
        </div>

        {formation.courses.length > 0 ? (
          <div className="student-formation-layout">
            <aside className="card student-details-glass student-course-sidebar">
              <div className="student-course-sidebar-head">
                <div className="student-course-sidebar-title">
                  <span className="student-course-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M4 6.5h16M4 12h16M4 17.5h10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </span>
                  <h3>Courses</h3>
                </div>
                <span className="hint">
                  {Math.min(activeCourseIndex + 1, formation.courses.length)}/{formation.courses.length}
                </span>
              </div>
                    <div className="student-course-list">
                      {formation.courses.map((course, index) => {
                        const courseResult = courseResultByCourse[course.id] || null;
                        const statusClass = courseResult
                          ? courseResult.passed
                            ? 'is-pass'
                            : 'is-fail'
                          : 'is-pending';
                        return (
                          <div
                            key={course.id}
                            className={`student-course-item ${index === activeCourseIndex ? 'is-active' : ''}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              setActiveCourseIndex(index);
                              setActiveTab('lessons');
                            }}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                setActiveCourseIndex(index);
                                setActiveTab('lessons');
                              }
                            }}
                          >
                            <span className="student-course-title">{course.title}</span>
                            <span className={`student-course-status ${statusClass}`}>
                              {statusClass === 'is-pass' && (
                                <svg viewBox="0 0 16 16" aria-hidden="true">
                                  <path d="M3.2 8.4l2.6 2.6 6.2-6.2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                              {statusClass === 'is-fail' && (
                                <svg viewBox="0 0 16 16" aria-hidden="true">
                                  <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
            </aside>

            {(() => {
              const safeCourseIndex = Math.min(
                activeCourseIndex,
                formation.courses.length - 1,
              );
              const course = formation.courses[safeCourseIndex];
              const activeLessonId =
                activeLessonIdByCourse[course.id] ?? course.lessons?.[0]?.id ?? null;
              const activeLesson = course.lessons?.find(
                (lesson) => lesson.id === activeLessonId,
              );
              const hasQuizzes = course.quizzes.length > 0;
              const totalQuizzes = course.quizzes.length;
              const showQuizzes = activeTab === 'quizzes' && Boolean(showQuizzesByCourse[course.id]);
              const quizIndex = Math.min(
                quizIndexByCourse[course.id] ?? 0,
                Math.max(totalQuizzes - 1, 0),
              );
              const activeQuiz =
                totalQuizzes > 0 ? course.quizzes[quizIndex] : null;
              const isLastQuiz =
                totalQuizzes > 0 && quizIndex === totalQuizzes - 1;
              const loadingAnswers = course.quizzes.some(
                (quiz) => loadingAnswersByQuiz[quiz.id],
              );
              const courseLocked = isCourseLocked(course.id);
              const courseResult = courseResultByCourse[course.id] || null;
              const lessonViewActive = Boolean(lessonViewByCourse[course.id]);

              return (
                <main className="card student-details-glass student-course-content">
                  <div className="student-tab-switcher" data-active={activeTab}>
                    <button
                      type="button"
                      className={`student-tab-btn ${activeTab === 'lessons' ? 'is-active' : ''}`}
                      onClick={() => setActiveTab('lessons')}
                    >
                      Lessons
                    </button>
                    <button
                      type="button"
                      className={`student-tab-btn ${activeTab === 'quizzes' ? 'is-active' : ''}`}
                      onClick={() => setActiveTab('quizzes')}
                    >
                      Quizzes
                    </button>
                    <span className="student-tab-indicator" aria-hidden="true" />
                  </div>

                  <div className="student-course-head">
                    <div>
                      <h2>{course.title}</h2>
                      
                    </div>
                    {courseResult && (
                      <StatusBadge
                        label={`${formatScore(courseResult.score)}%`}
                        tone={courseResult.passed ? 'green' : 'orange'}
                      />
                    )}
                  </div>

                  {courseResult?.badgeUrl && (
                    <a
                      className="student-doc-link"
                      href={resolveApiAssetUrl(courseResult.badgeUrl)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Download Badge
                    </a>
                  )}


                  {activeTab === 'lessons' && (
                    <div className="student-tab-panel student-lessons-panel">
                      <div className={`student-lesson-deck ${lessonViewActive ? 'is-viewer' : ''}`}>
                        <div className="student-lesson-list">
                          {course.lessons.length === 0 && (
                            <p className="hint">No lesson available for this course yet.</p>
                          )}
                          {course.lessons.map((lesson) => (
                            <article key={lesson.id} className="student-lesson-card">
                              <div className="student-lesson-card-text">
                                <h4>{lesson.title}</h4>
                                {lesson.description && (
                                  <p className="hint">{lesson.description}</p>
                                )}
                              </div>
                              <button
                                type="button"
                                className="student-open-content-btn"
                                onClick={() => {
                                  setActiveLessonIdByCourse((prev) => ({
                                    ...prev,
                                    [course.id]: lesson.id,
                                  }));
                                  setLessonViewByCourse((prev) => ({
                                    ...prev,
                                    [course.id]: true,
                                  }));
                                }}
                              >
                                Open Content
                              </button>
                            </article>
                          ))}
                        </div>

                        <div className="student-lesson-viewer">
                          {activeLesson && (
                            <div className="student-pdf-shell">
                              <div className="student-pdf-head">
                                <div>
                                  <p className="student-pdf-title">
                                    {activeLesson.title}
                                  </p>
                                  <p className="hint">Scroll the document here.</p>
                                  {course.lessons.length > 1 && (
                                    <p className="hint">
                                      Showing lesson {course.lessons.findIndex((l) => l.id === activeLesson.id) + 1} of {course.lessons.length}.
                                    </p>
                                  )}
                                </div>
                                <div className="row">
                                  <a
                                    className="student-doc-link"
                                    href={getLessonPdfLinks(activeLesson.pdfUrl).downloadUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    Download PDF
                                  </a>
                                </div>
                              </div>

                              <div className="student-pdf-container">
                                <iframe
                                  className="student-pdf-frame"
                                  src={getLessonPdfLinks(activeLesson.pdfUrl).viewUrl}
                                  title={`PDF ${activeLesson.title}`}
                                  loading="lazy"
                                />
                              </div>

                              {getLessonPdfLinks(activeLesson.pdfUrl).isDrive && (
                                <p className="hint">
                                  Google Drive preview mode is used for inline view.
                                </p>
                              )}
                            </div>
                          )}

                          <div className="student-lesson-actions">
                            <button
                              type="button"
                              className="student-back-btn"
                              onClick={() =>
                                setLessonViewByCourse((prev) => ({
                                  ...prev,
                                  [course.id]: false,
                                }))
                              }
                            >
                              Back to lessons
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'quizzes' && (
                    <div className="student-tab-panel student-quizzes-panel">
                      {loadingAnswers && !showQuizzes && (
                        <p className="hint">Loading quizzes...</p>
                      )}
                      {!hasQuizzes && (
                        <p className="hint">No quizzes in this course.</p>
                      )}

                      {showQuizzes && (
                        <section className="student-quiz-stack">
                  <div className="student-quiz-toolbar">
                    <h3>Quizzes for this lesson</h3>
                    {totalQuizzes > 0 && (
                      <div className="student-quiz-pager">
                        <button
                          type="button"
                          className="student-quiz-nav-btn"
                          onClick={() =>
                            navigateQuiz(course.id, -1, totalQuizzes)
                          }
                          disabled={quizIndex === 0}
                        >
                          &lt;
                        </button>
                        <span className="student-quiz-indicator">
                          {quizIndex + 1}/{totalQuizzes}
                        </span>
                        <button
                          type="button"
                          className="student-quiz-nav-btn"
                          onClick={() =>
                            navigateQuiz(course.id, 1, totalQuizzes)
                          }
                          disabled={quizIndex === totalQuizzes - 1}
                        >
                          &gt;
                        </button>
                      </div>
                    )}
                  </div>

                  {totalQuizzes === 0 && (
                    <p className="hint">No quizzes in this course.</p>
                  )}

                  {activeQuiz && (() => {
                    const quiz = activeQuiz;
                    const fullyAnswered =
                      quiz.questions.length > 0 &&
                      quiz.questions.every(
                        (question) =>
                          selectedChoiceByQuestion[question.id] != null,
                      );

                    return (
                      <article key={quiz.id} className="student-quiz-card">
                        <div className="card-head-row">
                          <h3>{quiz.title}</h3>
                          <StatusBadge
                            label={
                              courseLocked
                                ? 'Locked'
                                : fullyAnswered
                                  ? 'Answered'
                                  : 'In progress'
                            }
                            tone={
                              courseLocked || fullyAnswered
                                ? 'green'
                                : 'orange'
                            }
                          />
                        </div>

                        <div className="student-quiz-motion-line" />

                        {quiz.questions.map((question, questionIndex) => {
                          const reviewQuestion = reviewForQuestion(
                            course.id,
                            question.id,
                          );

                          return (
                            <div
                              key={question.id}
                              className="student-quiz-question"
                            >
                              <p className="student-question-title">
                                <strong>
                                  Question {questionIndex + 1}:
                                </strong>{' '}
                                {question.text}
                              </p>

                              <div className="student-choice-grid">
                                {question.choices.map((choice) => {
                                  const selected =
                                    selectedChoiceByQuestion[question.id] ===
                                    choice.id;
                                  const isCorrectChoice = Boolean(
                                    choice.isCorrect,
                                  );
                                  const lockedCorrectHighlight =
                                    courseLocked && isCorrectChoice;
                                  const lockedWrongHighlight =
                                    courseLocked && selected && !isCorrectChoice;

                                  return (
                                    <label
                                      key={choice.id}
                                      className={`student-choice-card ${selected ? 'is-selected' : ''} ${lockedCorrectHighlight ? 'is-correct-answer' : ''} ${lockedWrongHighlight ? 'is-wrong-answer' : ''}`}
                                    >
                                      <input
                                        type="radio"
                                        name={`question-${question.id}`}
                                        checked={selected}
                                        disabled={courseLocked}
                                        onChange={() =>
                                          selectChoice(
                                            course.id,
                                            question.id,
                                            choice.id,
                                          )
                                        }
                                      />
                                      <span>{choice.text}</span>
                                    </label>
                                  );
                                })}
                              </div>

                              {courseLocked && reviewQuestion && (
                                <p
                                  className={`student-review-note ${reviewQuestion.isCorrect ? 'is-ok' : 'is-bad'}`}
                                >
                                  Your answer:{' '}
                                  {reviewQuestion.selectedChoiceText || '-'}
                                  {' | '}
                                  Correct:{' '}
                                  {reviewQuestion.correctChoiceText || '-'}
                                </p>
                              )}
                            </div>
                          );
                        })}

                        {!courseLocked && !isLastQuiz && (
                          <p className="hint">
                            Go to the next quiz to unlock final submission.
                          </p>
                        )}

                        {isLastQuiz && !courseLocked && (
                          <div className="student-final-submit-wrap">
                            <button
                              type="button"
                              className="student-final-submit-btn"
                              disabled={submittingCourseId === course.id}
                              onClick={() => submitCourseAnswers(course)}
                            >
                              {submittingCourseId === course.id
                                ? 'Submitting Final Answers...'
                                : 'Submit Final Answers'}
                            </button>

                          </div>
                        )}
                      </article>
                    );
                  })()}
                        </section>
                      )}
                    </div>
                  )}
                </main>
              );
            })()}
          </div>
        ) : (
          <div className="card student-details-glass">
            <p className="hint">No published online courses yet.</p>
          </div>
        )}
      </div>

      <ResultPopup result={resultModal} onClose={() => setResultModal(null)} />
    </section>
  );
}
