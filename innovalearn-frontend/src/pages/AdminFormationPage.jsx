import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  const [editingFormationField, setEditingFormationField] = useState(null);
  const [formationFieldValue, setFormationFieldValue] = useState('');
  const [savingFormationField, setSavingFormationField] = useState(false);
  const [addingLessonCourseId, setAddingLessonCourseId] = useState(null);
  const [newLessonForm, setNewLessonForm] = useState({
    title: '',
    pdfUrl: '',
  });
  const [creatingLesson, setCreatingLesson] = useState(false);
  const [addingQuizCourseId, setAddingQuizCourseId] = useState(null);
  const [newQuizForm, setNewQuizForm] = useState({
    title: '',
    questionText: '',
    choices: padChoices([]),
  });
  const [creatingQuiz, setCreatingQuiz] = useState(false);

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

  async function refreshFormation() {
    const data = await apiRequest(`/formations/${formationId}/manage`, {
      token: user.token,
    });
    setFormation(data);
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

  function openFormationFieldEditor(field) {
    if (formation.published) return;

    const valueMap = {
      title: formation.title || '',
      description: formation.description || '',
      price: String(formation.price ?? ''),
    };

    setEditingFormationField(field);
    setFormationFieldValue(valueMap[field] ?? '');
  }

  function closeFormationFieldEditor() {
    if (savingFormationField) return;
    setEditingFormationField(null);
    setFormationFieldValue('');
  }

  async function saveFormationField(event) {
    event.preventDefault();
    if (!editingFormationField) return;

    const nextRaw = String(formationFieldValue || '').trim();
    if (!nextRaw) {
      pushToast('This field cannot be empty.', 'error');
      return;
    }

    let payload;
    if (editingFormationField === 'price') {
      const parsed = Number(nextRaw);
      if (!Number.isFinite(parsed) || parsed < 0) {
        pushToast('Price must be a valid non-negative number.', 'error');
        return;
      }
      payload = { price: parsed };
    } else {
      payload = { [editingFormationField]: nextRaw };
    }

    setSavingFormationField(true);
    try {
      const updated = await apiRequest(`/formations/${formation.id}`, {
        method: 'PATCH',
        token: user.token,
        body: payload,
      });

      setFormation((prev) => ({
        ...prev,
        ...updated,
      }));
      setEditingFormationField(null);
      setFormationFieldValue('');
      pushToast('Formation updated.', 'success');
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setSavingFormationField(false);
    }
  }

  function isCourseLocked(course) {
    return course.published || formation.published;
  }

  function openAddLessonModal(course) {
    if (isCourseLocked(course)) return;
    setAddingLessonCourseId(course.id);
    setNewLessonForm({ title: '', pdfUrl: '' });
  }

  function closeAddLessonModal() {
    if (creatingLesson) return;
    setAddingLessonCourseId(null);
    setNewLessonForm({ title: '', pdfUrl: '' });
  }

  async function createLesson(event) {
    event.preventDefault();

    const title = newLessonForm.title.trim();
    const pdfUrl = newLessonForm.pdfUrl.trim();

    if (!title || !pdfUrl) {
      pushToast('Lesson title and PDF URL are required.', 'error');
      return;
    }

    setCreatingLesson(true);
    try {
      await apiRequest(`/courses/${addingLessonCourseId}/lessons`, {
        method: 'POST',
        token: user.token,
        body: { title, pdfUrl },
      });
      await refreshFormation();
      closeAddLessonModal();
      pushToast('Lesson created.', 'success');
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setCreatingLesson(false);
    }
  }

  function openAddQuizModal(course) {
    if (isCourseLocked(course)) return;
    setAddingQuizCourseId(course.id);
    setNewQuizForm({
      title: '',
      questionText: '',
      choices: padChoices([]),
    });
  }

  function closeAddQuizModal() {
    if (creatingQuiz) return;
    setAddingQuizCourseId(null);
    setNewQuizForm({
      title: '',
      questionText: '',
      choices: padChoices([]),
    });
  }

  function updateNewQuizChoice(index, key, value) {
    setNewQuizForm((prev) => ({
      ...prev,
      choices: prev.choices.map((choice, choiceIndex) =>
        choiceIndex === index ? { ...choice, [key]: value } : choice,
      ),
    }));
  }

  function setNewCorrectChoice(index) {
    setNewQuizForm((prev) => ({
      ...prev,
      choices: prev.choices.map((choice, choiceIndex) => ({
        ...choice,
        isCorrect: choiceIndex === index,
      })),
    }));
  }

  async function createQuiz(event) {
    event.preventDefault();

    const title = newQuizForm.title.trim();
    const questionText = newQuizForm.questionText.trim();
    const choices = newQuizForm.choices
      .map((choice) => ({
        text: choice.text.trim(),
        isCorrect: choice.isCorrect,
      }))
      .filter((choice) => choice.text);

    if (!title) {
      pushToast('Quiz title is required.', 'error');
      return;
    }

    if (!questionText) {
      pushToast('Question is required.', 'error');
      return;
    }

    if (choices.length < 2) {
      pushToast('At least 2 choices are required.', 'error');
      return;
    }

    const correctCount = choices.filter((choice) => choice.isCorrect).length;
    if (correctCount !== 1) {
      pushToast('You should select exactly one correct choice.', 'error');
      return;
    }

    setCreatingQuiz(true);
    try {
      const createdQuiz = await apiRequest(`/courses/${addingQuizCourseId}/quizzes`, {
        method: 'POST',
        token: user.token,
        body: { title },
      });

      await apiRequest(`/quizzes/${createdQuiz.id}/questions`, {
        method: 'POST',
        token: user.token,
        body: {
          text: questionText,
          choices,
        },
      });

      await refreshFormation();
      closeAddQuizModal();
      pushToast('Quiz created.', 'success');
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setCreatingQuiz(false);
    }
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
  const addingLessonCourse = courses.find(
    (course) => course.id === addingLessonCourseId,
  );
  const addingQuizCourse = courses.find(
    (course) => course.id === addingQuizCourseId,
  );

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
    <section className="stack formation-manage-stack">
      <div className="card panel-head">
        <div className="formation-meta-stack">
          <h1 className="formation-meta-line formation-meta-line-title">
            <span title={formation.title}>{formation.title}</span>
            {!formation.published && (
              <button
                type="button"
                className="formation-edit-icon-btn"
                onClick={() => openFormationFieldEditor('title')}
                aria-label="Edit formation title"
              >
                <span aria-hidden="true">{'\u270E'}</span>
              </button>
            )}
          </h1>
          <p className="formation-meta-line formation-meta-line-desc">
            <span title={formation.description}>{formation.description}</span>
            {!formation.published && (
              <button
                type="button"
                className="formation-edit-icon-btn"
                onClick={() => openFormationFieldEditor('description')}
                aria-label="Edit formation description"
              >
                <span aria-hidden="true">{'\u270E'}</span>
              </button>
            )}
          </p>
          <p className="hint formation-meta-line">
            <span>Price: {formation.price}</span>
            {!formation.published && (
              <button
                type="button"
                className="formation-edit-icon-btn"
                onClick={() => openFormationFieldEditor('price')}
                aria-label="Edit formation price"
              >
                <span aria-hidden="true">{'\u270E'}</span>
              </button>
            )}
          </p>
          <div className="row">
            <StatusBadge label={formation.type} tone={formation.type === 'ONLINE' ? 'blue' : 'orange'} />
            {formation.published && (
              <StatusBadge label="Published" tone="green" />
            )}
          </div>
        </div>
        <div className="formation-head-actions">
          <LoadingButton
            className="btn-publish-formation formation-head-action-right"
            type="button"
            isLoading={publishingFormation}
            loadingText="Publishing..."
            disabled={formation.published}
            onClick={publishFormation}
          >
            {formation.published
              ? 'Published'
              : `Publish Formation ${String.fromCodePoint(0x1f680)}`}
          </LoadingButton>
          {canAddCourses && (
            <div className="formation-head-bottom-action">
              <button
                type="button"
                className="formation-head-action-left formation-head-action-single"
                onClick={() =>
                  navigate(`/formateur/formations/${formation.id}/courses/new`)
                }
              >
                + Add Course
              </button>
            </div>
          )}

          {formation.type === 'PRESENTIEL' && (
            <p className="hint">
              Presentiel formations do not contain online courses.
            </p>
          )}
        </div>
      </div>

      {editingFormationField && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <button
            type="button"
            className="admin-modal-backdrop"
            onClick={closeFormationFieldEditor}
            aria-label="Close edit modal"
          />
          <article className="admin-modal-card">
            <div className="admin-modal-head">
              <h2>
                Edit{' '}
                {editingFormationField === 'title'
                  ? 'Title'
                  : editingFormationField === 'description'
                    ? 'Description'
                    : 'Price'}
              </h2>
              <button
                type="button"
                className="admin-modal-close"
                onClick={closeFormationFieldEditor}
                aria-label="Close edit modal"
              >
                x
              </button>
            </div>
            <div className="admin-modal-body">
              <form className="grid" onSubmit={saveFormationField}>
                {editingFormationField === 'description' ? (
                  <textarea
                    rows={5}
                    value={formationFieldValue}
                    onChange={(event) =>
                      setFormationFieldValue(event.target.value)
                    }
                    required
                  />
                ) : (
                  <input
                    type={editingFormationField === 'price' ? 'number' : 'text'}
                    min={editingFormationField === 'price' ? '0' : undefined}
                    step={editingFormationField === 'price' ? '0.01' : undefined}
                    value={formationFieldValue}
                    onChange={(event) =>
                      setFormationFieldValue(event.target.value)
                    }
                    required
                  />
                )}
                <div className="row">
                  <button type="submit" disabled={savingFormationField}>
                    {savingFormationField ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    className="action-btn action-page"
                    onClick={closeFormationFieldEditor}
                    disabled={savingFormationField}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </article>
        </div>
      )}

      {addingLessonCourseId && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <button
            type="button"
            className="admin-modal-backdrop"
            onClick={closeAddLessonModal}
            aria-label="Close lesson modal"
          />
          <article className="admin-modal-card">
            <div className="admin-modal-head">
              <h2>Add Lesson</h2>
              <button
                type="button"
                className="admin-modal-close"
                onClick={closeAddLessonModal}
                aria-label="Close lesson modal"
              >
                x
              </button>
            </div>
            <div className="admin-modal-body">
              <p className="hint">
                Course: {addingLessonCourse?.title || `#${addingLessonCourseId}`}
              </p>
              <form className="grid" onSubmit={createLesson}>
                <input
                  value={newLessonForm.title}
                  onChange={(event) =>
                    setNewLessonForm((prev) => ({
                      ...prev,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Lesson title"
                  required
                />
                <input
                  value={newLessonForm.pdfUrl}
                  onChange={(event) =>
                    setNewLessonForm((prev) => ({
                      ...prev,
                      pdfUrl: event.target.value,
                    }))
                  }
                  placeholder="PDF URL"
                  required
                />
                <div className="row">
                  <button type="submit" disabled={creatingLesson}>
                    {creatingLesson ? 'Creating...' : 'Create Lesson'}
                  </button>
                  <button
                    type="button"
                    className="action-btn action-page"
                    onClick={closeAddLessonModal}
                    disabled={creatingLesson}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </article>
        </div>
      )}

      {addingQuizCourseId && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <button
            type="button"
            className="admin-modal-backdrop"
            onClick={closeAddQuizModal}
            aria-label="Close quiz modal"
          />
          <article className="admin-modal-card">
            <div className="admin-modal-head">
              <h2>Add Quiz</h2>
              <button
                type="button"
                className="admin-modal-close"
                onClick={closeAddQuizModal}
                aria-label="Close quiz modal"
              >
                x
              </button>
            </div>
            <div className="admin-modal-body">
              <p className="hint">
                Course: {addingQuizCourse?.title || `#${addingQuizCourseId}`}
              </p>
              <form className="grid" onSubmit={createQuiz}>
                <input
                  value={newQuizForm.title}
                  onChange={(event) =>
                    setNewQuizForm((prev) => ({
                      ...prev,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Quiz title"
                  required
                />
                <textarea
                  value={newQuizForm.questionText}
                  onChange={(event) =>
                    setNewQuizForm((prev) => ({
                      ...prev,
                      questionText: event.target.value,
                    }))
                  }
                  placeholder="Question"
                  required
                />
                <div className="nested-grid">
                  {newQuizForm.choices.map((choice, index) => (
                    <div className="item small-item" key={index}>
                      <input
                        value={choice.text}
                        onChange={(event) =>
                          updateNewQuizChoice(index, 'text', event.target.value)
                        }
                        placeholder={`Choice ${index + 1}`}
                        required={index < 2}
                      />
                      <label className="hint">
                        <input
                          type="radio"
                          name="new-correct-choice"
                          checked={choice.isCorrect}
                          onChange={() => setNewCorrectChoice(index)}
                        />
                        Correct
                      </label>
                    </div>
                  ))}
                </div>
                <div className="row">
                  <button type="submit" disabled={creatingQuiz}>
                    {creatingQuiz ? 'Creating...' : 'Create Quiz'}
                  </button>
                  <button
                    type="button"
                    className="action-btn action-page"
                    onClick={closeAddQuizModal}
                    disabled={creatingQuiz}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </article>
        </div>
      )}

      <div className="stack formation-courses-stack">
        {sortedCourses.map((course) => (
          <article key={course.id} className="card course-card">
            <div className="card-head-row course-head-row">
              <h2 className="formation-course-title" title={`Course: ${course.title}`}>
                Course: {course.title}
              </h2>
              <div className="row course-head-actions">
                {course.published && (
                  <StatusBadge
                    label="Published"
                    tone="green"
                  />
                )}
                <LoadingButton
                  className="course-publish-btn"
                  type="button"
                  isLoading={publishingCourseId === course.id}
                  loadingText="Publishing..."
                  disabled={course.published || formation.published}
                  onClick={() => publishCourse(course.id)}
                >
                  {course.published
                    ? 'Published'
                    : `Publish Course ${String.fromCodePoint(0x1f680)}`}
                </LoadingButton>
              </div>
            </div>

            <div className="nested-sections">
              <section className="formation-subsection">
                <div className="formation-subsection-head">
                  <h3 className="formation-subsection-title">Lessons</h3>
                </div>
                <div className="formation-subsection-body">
                  <div className="nested-grid formation-subsection-list">
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

                  {!isCourseLocked(course) && (
                    <div className="formation-subsection-footer">
                      <button
                        type="button"
                        className="formation-inline-add-btn"
                        onClick={() => openAddLessonModal(course)}
                      >
                        + Add Lesson
                      </button>
                    </div>
                  )}
                </div>
              </section>

              <section className="formation-subsection">
                <div className="formation-subsection-head">
                  <h3 className="formation-subsection-title">Quizzes</h3>
                </div>
                <div className="formation-subsection-body">
                  <div className="nested-grid formation-subsection-list">
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

                  {!isCourseLocked(course) && (
                    <div className="formation-subsection-footer">
                      <button
                        type="button"
                        className="formation-inline-add-btn"
                        onClick={() => openAddQuizModal(course)}
                      >
                        + Add Quiz
                      </button>
                    </div>
                  )}
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


