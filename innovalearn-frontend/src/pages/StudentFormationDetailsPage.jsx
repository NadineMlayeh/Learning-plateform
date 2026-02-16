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

  async function startQuizzes(course) {
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

  if (isLoading || !formation) {
    return (
      <section className="card">
        <p>{isLoading ? 'Loading formation content...' : 'Formation not found.'}</p>
      </section>
    );
  }

  return (
    <section className="stack student-details-page">
      <button
        type="button"
        className="floating-back-link"
        onClick={() => navigate('/student')}
      >
        <span aria-hidden="true">&lt;</span>
        <span>Back to Student Dashboard</span>
      </button>

      <div className="card student-details-hero">
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
                  : 'gray'
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

      <div className="stack">
        {formation.courses.length > 0 && (
          <div className="card student-course-switcher">
            <h2>Courses</h2>
            <div className="student-course-switcher-controls">
              <button
                type="button"
                className="student-quiz-nav-btn"
                onClick={() =>
                  navigateCourse(-1, formation.courses.length)
                }
                disabled={activeCourseIndex === 0}
              >
                &lt;
              </button>
              <span className="student-quiz-indicator">
                {Math.min(activeCourseIndex + 1, formation.courses.length)}/{formation.courses.length}
              </span>
              <button
                type="button"
                className="student-quiz-nav-btn"
                onClick={() =>
                  navigateCourse(1, formation.courses.length)
                }
                disabled={activeCourseIndex >= formation.courses.length - 1}
              >
                &gt;
              </button>
            </div>
          </div>
        )}

        {formation.courses.length > 0 && (() => {
          const safeCourseIndex = Math.min(
            activeCourseIndex,
            formation.courses.length - 1,
          );
          const course = formation.courses[safeCourseIndex];
          const activeLesson = course.lessons?.[0];
          const hasQuizzes = course.quizzes.length > 0;
          const totalQuizzes = course.quizzes.length;
          const showQuizzes = Boolean(showQuizzesByCourse[course.id]);
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

          return (
            <article
              key={course.id}
              className="card course-card student-course-shell"
            >
              <div className="card-head-row">
                <h2>Course: {course.title}</h2>
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

              <section className="student-viewer-center">
                <h3>Lesson Viewer</h3>
                {!activeLesson && (
                  <p className="hint">
                    No lesson available for this course yet.
                  </p>
                )}

                {activeLesson && (
                  <div className="student-pdf-shell">
                    <div className="student-pdf-head">
                      <div>
                        <p className="student-pdf-title">
                          {activeLesson.title}
                        </p>
                        <p className="hint">
                          Scroll the document here, then start quizzes.
                        </p>
                        {course.lessons.length > 1 && (
                          <p className="hint">
                            Showing lesson 1 of {course.lessons.length}.
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
                        <a
                          className="student-doc-link is-ghost"
                          href={resolveApiAssetUrl(activeLesson.pdfUrl)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open Source
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

                    <button
                      type="button"
                      className="student-start-quiz-btn"
                      onClick={() => startQuizzes(course)}
                      disabled={!hasQuizzes || loadingAnswers}
                    >
                      {loadingAnswers
                        ? 'Loading quizzes...'
                        : courseLocked
                          ? 'View Submitted Quizzes'
                          : showQuizzes
                            ? 'Quizzes Ready Below'
                            : 'Start the Quizzes'}
                    </button>
                  </div>
                )}
              </section>

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

                                  return (
                                    <label
                                      key={choice.id}
                                      className={`student-choice-card ${selected ? 'is-selected' : ''} ${lockedCorrectHighlight ? 'is-correct-answer' : ''}`}
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

                        {isLastQuiz && (
                          <div className="student-final-submit-wrap">
                            <button
                              type="button"
                              className="student-final-submit-btn"
                              disabled={
                                courseLocked ||
                                submittingCourseId === course.id
                              }
                              onClick={() => submitCourseAnswers(course)}
                            >
                              {submittingCourseId === course.id
                                ? 'Submitting Final Answers...'
                                : courseLocked
                                  ? 'Final Submission Completed'
                                  : 'Submit Final Answers'}
                            </button>
                            {courseLocked && (
                              <p className="hint">
                                Submitted answers are now view-only.
                              </p>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })()}
                </section>
              )}
            </article>
          );
        })()}

        {formation.courses.length === 0 && (
          <div className="card">
            <p className="hint">No published online courses yet.</p>
          </div>
        )}
      </div>

      <ResultPopup result={resultModal} onClose={() => setResultModal(null)} />
    </section>
  );
}
