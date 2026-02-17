import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '../api';
import { getCurrentUser } from '../auth';
import StatusBadge from '../components/StatusBadge';
import LoadingButton from '../components/LoadingButton';

function padChoices(choices) {
  const next = [...choices];
  while (next.length < 3) {
    next.push({ text: '', isCorrect: false });
  }
  return next;
}

export default function AdminFormationPage({ pushToast }) {
  const user = getCurrentUser();
  const navigate = useNavigate();
  const { formationId } = useParams();
  const [formation, setFormation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [publishingFormation, setPublishingFormation] = useState(false);
  const [publishingCourseId, setPublishingCourseId] = useState(null);

  const [editingLessonId, setEditingLessonId] = useState(null);
  const [lessonForm, setLessonForm] = useState({ title: '', pdfUrl: '' });
  const [savingLessonId, setSavingLessonId] = useState(null);

  const [editingQuizId, setEditingQuizId] = useState(null);
  const [quizForm, setQuizForm] = useState({
    title: '',
    questionText: '',
    choices: padChoices([]),
  });
  const [savingQuizId, setSavingQuizId] = useState(null);

  async function loadFormation() {
    setIsLoading(true);
    try {
      const data = await apiRequest(`/formations/${formationId}/manage`, {
        token: user.token,
      });
      setFormation(data);
    } catch (err) {
      pushToast(err.message, 'error');
      navigate('/formateur');
    } finally {
      setIsLoading(false);
    }
  }

  async function publishFormation() {
    setPublishingFormation(true);
    try {
      const updated = await apiRequest(`/formations/${formationId}/publish`, {
        method: 'PATCH',
        token: user.token,
      });
      setFormation((prev) => ({ ...prev, published: updated.published }));
      pushToast('Formation published.', 'success');
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setPublishingFormation(false);
    }
  }

  async function publishCourse(courseId) {
    setPublishingCourseId(courseId);
    try {
      const updated = await apiRequest(`/courses/${courseId}/publish`, {
        method: 'PATCH',
        token: user.token,
      });
      setFormation((prev) => ({
        ...prev,
        courses: prev.courses.map((course) =>
          course.id === courseId
            ? { ...course, published: updated.published }
            : course,
        ),
      }));
      pushToast('Course published.', 'success');
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setPublishingCourseId(null);
    }
  }

  function isCourseLocked(course) {
    return course.published || formation.published;
  }

  function startLessonEdit(course, lesson) {
    if (isCourseLocked(course)) return;
    setEditingLessonId(lesson.id);
    setLessonForm({
      title: lesson.title,
      pdfUrl: lesson.pdfUrl,
    });
  }

  async function saveLessonEdit(courseId, lessonId) {
    if (!lessonForm.title.trim() || !lessonForm.pdfUrl.trim()) {
      pushToast('Lesson title and PDF URL are required.', 'error');
      return;
    }

    setSavingLessonId(lessonId);
    try {
      const updatedLesson = await apiRequest(`/lessons/${lessonId}`, {
        method: 'PATCH',
        token: user.token,
        body: {
          title: lessonForm.title.trim(),
          pdfUrl: lessonForm.pdfUrl.trim(),
        },
      });

      setFormation((prev) => ({
        ...prev,
        courses: prev.courses.map((course) =>
          course.id === courseId
            ? {
                ...course,
                lessons: course.lessons.map((lesson) =>
                  lesson.id === lessonId ? updatedLesson : lesson,
                ),
              }
            : course,
        ),
      }));

      setEditingLessonId(null);
      pushToast('Lesson updated.', 'success');
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setSavingLessonId(null);
    }
  }

  function startQuizEdit(course, quiz) {
    if (isCourseLocked(course)) return;

    const primaryQuestion = quiz.questions[0];
    const existingChoices =
      primaryQuestion?.choices?.map((choice) => ({
        text: choice.text,
        isCorrect: choice.isCorrect,
      })) ?? [];

    setEditingQuizId(quiz.id);
    setQuizForm({
      title: quiz.title,
      questionText: primaryQuestion?.text ?? '',
      choices: padChoices(existingChoices),
    });
  }

  function updateQuizChoice(index, key, value) {
    setQuizForm((prev) => ({
      ...prev,
      choices: prev.choices.map((choice, choiceIndex) =>
        choiceIndex === index
          ? { ...choice, [key]: value }
          : choice,
      ),
    }));
  }

  function setCorrectQuizChoice(index) {
    setQuizForm((prev) => ({
      ...prev,
      choices: prev.choices.map((choice, choiceIndex) => ({
        ...choice,
        isCorrect: choiceIndex === index,
      })),
    }));
  }

  function validateQuizForm() {
    const normalizedQuestion = quizForm.questionText.trim();
    const normalizedChoices = quizForm.choices
      .map((choice) => ({
        text: choice.text.trim(),
        isCorrect: choice.isCorrect,
      }))
      .filter((choice) => choice.text);

    if (!quizForm.title.trim()) {
      return { error: 'Quiz title is required.' };
    }

    if (!normalizedQuestion) {
      return { error: 'Question is required.' };
    }

    if (normalizedChoices.length < 2) {
      return { error: 'At least 2 choices are required.' };
    }

    const correctCount = normalizedChoices.filter(
      (choice) => choice.isCorrect,
    ).length;

    if (correctCount !== 1) {
      return {
        error: 'You should select exactly one correct choice.',
      };
    }

    return {
      data: {
        title: quizForm.title.trim(),
        questionText: normalizedQuestion,
        choices: normalizedChoices,
      },
    };
  }

  async function saveQuizEdit(courseId, quizId) {
    const result = validateQuizForm();
    if (result.error) {
      pushToast(result.error, 'error');
      return;
    }

    setSavingQuizId(quizId);
    try {
      const updatedQuiz = await apiRequest(`/quizzes/${quizId}`, {
        method: 'PATCH',
        token: user.token,
        body: result.data,
      });

      setFormation((prev) => ({
        ...prev,
        courses: prev.courses.map((course) =>
          course.id === courseId
            ? {
                ...course,
                quizzes: course.quizzes.map((quiz) =>
                  quiz.id === quizId ? updatedQuiz : quiz,
                ),
              }
            : course,
        ),
      }));

      setEditingQuizId(null);
      pushToast('Quiz updated.', 'success');
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setSavingQuizId(null);
    }
  }

  useEffect(() => {
    loadFormation();
  }, [formationId]);

  const courses = formation?.courses ?? [];
  const canAddCourses =
    formation?.type === 'ONLINE' && !formation?.published;

  const sortedCourses = useMemo(() => {
    return [...courses].sort((a, b) => b.id - a.id);
  }, [courses]);

  if (isLoading || !formation) {
    return (
      <section className="card">
        <p>{isLoading ? 'Loading formation...' : 'Formation not found.'}</p>
      </section>
    );
  }

  return (
    <section className="stack">
      <div className="card panel-head">
        <div>
          <h1>{formation.title}</h1>
          <p>{formation.description}</p>
          <p className="hint">Price: {formation.price}</p>
          <div className="row">
            <StatusBadge label={formation.type} tone={formation.type === 'ONLINE' ? 'blue' : 'orange'} />
            <StatusBadge label={formation.published ? 'Published' : 'Draft'} tone={formation.published ? 'green' : 'gray'} />
          </div>
        </div>
        <div className="row">
          {canAddCourses && (
            <button type="button" onClick={() => navigate(`/formateur/formations/${formation.id}/courses/new`)}>
              + Add Course
            </button>
          )}
          {formation.type === 'PRESENTIEL' && (
            <p className="hint">Presentiel formations do not contain online courses.</p>
          )}
          <LoadingButton
            className="btn-publish-formation"
            type="button"
            isLoading={publishingFormation}
            loadingText="Publishing..."
            disabled={formation.published}
            onClick={publishFormation}
          >
            {formation.published ? 'Published' : 'Publish Formation'}
          </LoadingButton>
        </div>
      </div>

      <div className="stack">
        {sortedCourses.map((course) => (
          <article key={course.id} className="card course-card">
            <div className="card-head-row">
              <h2>Course: {course.title}</h2>
              <div className="row">
                <StatusBadge
                  label={course.published ? 'Published' : 'Draft'}
                  tone={course.published ? 'green' : 'gray'}
                />
                <LoadingButton
                  type="button"
                  isLoading={publishingCourseId === course.id}
                  loadingText="Publishing..."
                  disabled={course.published || formation.published}
                  onClick={() => publishCourse(course.id)}
                >
                  {course.published ? 'Published' : 'Publish Course'}
                </LoadingButton>
              </div>
            </div>

            <div className="nested-sections">
              <section>
                <div className="card-head-row">
                  <h3>Lessons</h3>
                  {!course.published && !formation.published && (
                    <Link
                      className="link-btn"
                      to={`/formateur/courses/${course.id}/lessons/new?formationId=${formation.id}`}
                    >
                      +
                    </Link>
                  )}
                </div>
                <div className="nested-grid">
                  {course.lessons.length === 0 && <p className="hint">No lessons yet.</p>}
                  {(course.published || formation.published) && (
                    <p className="hint">Locked: published content is view only.</p>
                  )}

                  {course.lessons.map((lesson) => (
                    editingLessonId === lesson.id ? (
                      <article key={lesson.id} className="item small-item">
                        <div className="grid">
                          <input
                            value={lessonForm.title}
                            onChange={(event) =>
                              setLessonForm((prev) => ({
                                ...prev,
                                title: event.target.value,
                              }))
                            }
                            placeholder="Lesson title"
                          />
                          <input
                            value={lessonForm.pdfUrl}
                            onChange={(event) =>
                              setLessonForm((prev) => ({
                                ...prev,
                                pdfUrl: event.target.value,
                              }))
                            }
                            placeholder="PDF URL"
                          />
                          <div className="row">
                            <button
                              type="button"
                              onClick={() => saveLessonEdit(course.id, lesson.id)}
                              disabled={savingLessonId === lesson.id}
                            >
                              {savingLessonId === lesson.id ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              type="button"
                              className="btn-muted"
                              onClick={() => setEditingLessonId(null)}
                              disabled={savingLessonId === lesson.id}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </article>
                    ) : (
                      <article
                        key={lesson.id}
                        className={`item small-item ${!isCourseLocked(course) ? 'clickable-card' : ''}`}
                        role={!isCourseLocked(course) ? 'button' : undefined}
                        tabIndex={!isCourseLocked(course) ? 0 : undefined}
                        onClick={() => startLessonEdit(course, lesson)}
                      >
                        <p><strong>{lesson.title}</strong></p>
                        <a href={lesson.pdfUrl} target="_blank" rel="noreferrer" className="hint">
                          Open PDF
                        </a>
                      </article>
                    )
                  ))}
                </div>
              </section>

              <section>
                <div className="card-head-row">
                  <h3>Quizzes</h3>
                  {!course.published && !formation.published && (
                    <Link
                      className="link-btn"
                      to={`/formateur/courses/${course.id}/quizzes/new?formationId=${formation.id}`}
                    >
                      +
                    </Link>
                  )}
                </div>
                <div className="nested-grid">
                  {course.quizzes.length === 0 && <p className="hint">No quizzes yet.</p>}
                  {(course.published || formation.published) && (
                    <p className="hint">Locked: published content is view only.</p>
                  )}

                  {course.quizzes.map((quiz) => {
                    const primaryQuestion = quiz.questions[0];

                    if (editingQuizId === quiz.id) {
                      return (
                        <article key={quiz.id} className="item small-item">
                          <div className="grid">
                            <input
                              value={quizForm.title}
                              onChange={(event) =>
                                setQuizForm((prev) => ({
                                  ...prev,
                                  title: event.target.value,
                                }))
                              }
                              placeholder="Quiz title"
                            />
                            <textarea
                              value={quizForm.questionText}
                              onChange={(event) =>
                                setQuizForm((prev) => ({
                                  ...prev,
                                  questionText: event.target.value,
                                }))
                              }
                              placeholder="Question"
                            />

                            <div className="nested-grid">
                              {quizForm.choices.map((choice, index) => (
                                <div className="item small-item" key={index}>
                                  <input
                                    value={choice.text}
                                    onChange={(event) =>
                                      updateQuizChoice(
                                        index,
                                        'text',
                                        event.target.value,
                                      )
                                    }
                                    placeholder={`Choice ${index + 1}`}
                                  />
                                  <label className="hint">
                                    <input
                                      type="radio"
                                      name={`quiz-edit-correct-${quiz.id}`}
                                      checked={choice.isCorrect}
                                      onChange={() =>
                                        setCorrectQuizChoice(index)
                                      }
                                    />
                                    Correct
                                  </label>
                                </div>
                              ))}
                            </div>

                            <div className="row">
                              <button
                                type="button"
                                onClick={() => saveQuizEdit(course.id, quiz.id)}
                                disabled={savingQuizId === quiz.id}
                              >
                                {savingQuizId === quiz.id ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                type="button"
                                className="btn-muted"
                                onClick={() => setEditingQuizId(null)}
                                disabled={savingQuizId === quiz.id}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    }

                    return (
                      <article
                        key={quiz.id}
                        className={`item small-item ${!isCourseLocked(course) ? 'clickable-card' : ''}`}
                        role={!isCourseLocked(course) ? 'button' : undefined}
                        tabIndex={!isCourseLocked(course) ? 0 : undefined}
                        onClick={() => startQuizEdit(course, quiz)}
                      >
                        <p><strong>{quiz.title}</strong></p>
                        <p className="hint">
                          {primaryQuestion
                            ? primaryQuestion.text
                            : 'No question yet.'}
                        </p>
                      </article>
                    );
                  })}
                </div>
              </section>
            </div>
          </article>
        ))}

        {formation.courses.length === 0 && (
          <div className="card">
            <p className="hint">
              {formation.type === 'PRESENTIEL'
                ? 'Presentiel formation: no online courses.'
                : 'No course yet for this formation.'}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
