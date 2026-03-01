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

export default function AdminFormationPage({ pushToast }) {
  const user = getCurrentUser();
  const navigate = useNavigate();
  const { formationId } = useParams();
  const [formation, setFormation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [publishingFormation, setPublishingFormation] = useState(false);
  const [publishingCourseId, setPublishingCourseId] = useState(null);
  const [deletingCourseId, setDeletingCourseId] = useState(null);
  const [deletingLessonId, setDeletingLessonId] = useState(null);
  const [deletingQuizId, setDeletingQuizId] = useState(null);
  const [confirmDeleteCourseId, setConfirmDeleteCourseId] = useState(null);
  const [confirmDeleteLessonId, setConfirmDeleteLessonId] = useState(null);
  const [confirmDeleteQuizId, setConfirmDeleteQuizId] = useState(null);
  const [viewingQuiz, setViewingQuiz] = useState(null);

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
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [creatingCourse, setCreatingCourse] = useState(false);
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

  async function deletePendingCourse(courseId) {
    setDeletingCourseId(courseId);
    try {
      const response = await apiRequest(`/courses/${courseId}`, {
        method: 'DELETE',
        token: user.token,
      });
      await refreshFormation();
      setConfirmDeleteCourseId(null);
      pushToast(
        response?.message || 'Pending course deleted successfully.',
        'success',
      );
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setDeletingCourseId(null);
    }
  }

  function openDeleteCourseConfirmation(courseId) {
    setConfirmDeleteCourseId(courseId);
  }

  function closeDeleteCourseConfirmation() {
    if (deletingCourseId) return;
    setConfirmDeleteCourseId(null);
  }

  function openQuizViewer(course, quiz) {
    setViewingQuiz({
      courseTitle: course.title,
      quiz,
    });
  }

  function closeQuizViewer() {
    setViewingQuiz(null);
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

  function openAddCourseModal() {
    if (!canAddCourses) return;
    setIsAddCourseModalOpen(true);
    setNewCourseTitle('');
  }

  function closeAddCourseModal() {
    if (creatingCourse) return;
    setIsAddCourseModalOpen(false);
    setNewCourseTitle('');
  }

  async function createCourse(event) {
    event.preventDefault();

    const title = newCourseTitle.trim();
    if (!title) {
      pushToast('Course title is required.', 'error');
      return;
    }

    setCreatingCourse(true);
    try {
      await apiRequest(`/formations/${formation.id}/courses`, {
        method: 'POST',
        token: user.token,
        body: { title },
      });
      await refreshFormation();
      closeAddCourseModal();
      pushToast('Course created.', 'success');
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setCreatingCourse(false);
    }
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

  async function deleteLesson(lessonId) {
    setDeletingLessonId(lessonId);
    try {
      const response = await apiRequest(`/lessons/${lessonId}`, {
        method: 'DELETE',
        token: user.token,
      });
      await refreshFormation();
      if (editingLessonId === lessonId) {
        setEditingLessonId(null);
      }
      setConfirmDeleteLessonId(null);
      pushToast(response?.message || 'Lesson deleted.', 'success');
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setDeletingLessonId(null);
    }
  }

  function openDeleteLessonConfirmation(lessonId) {
    setConfirmDeleteLessonId(lessonId);
  }

  function closeDeleteLessonConfirmation() {
    if (deletingLessonId === confirmDeleteLessonId) return;
    setConfirmDeleteLessonId(null);
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

  async function deleteQuiz(quizId) {
    setDeletingQuizId(quizId);
    try {
      const response = await apiRequest(`/quizzes/${quizId}`, {
        method: 'DELETE',
        token: user.token,
      });
      await refreshFormation();
      if (editingQuizId === quizId) {
        setEditingQuizId(null);
      }
      setConfirmDeleteQuizId(null);
      pushToast(response?.message || 'Quiz deleted.', 'success');
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setDeletingQuizId(null);
    }
  }

  function openDeleteQuizConfirmation(quizId) {
    setConfirmDeleteQuizId(quizId);
  }

  function closeDeleteQuizConfirmation() {
    if (deletingQuizId === confirmDeleteQuizId) return;
    setConfirmDeleteQuizId(null);
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

  const courseToDelete = confirmDeleteCourseId
    ? courses.find((course) => course.id === confirmDeleteCourseId)
    : null;
  const lessonToDelete = confirmDeleteLessonId
    ? courses
        .flatMap((course) =>
          course.lessons.map((lesson) => ({
            ...lesson,
            courseTitle: course.title,
          })),
        )
        .find((lesson) => lesson.id === confirmDeleteLessonId)
    : null;
  const quizToDelete = confirmDeleteQuizId
    ? courses
        .flatMap((course) =>
          course.quizzes.map((quiz) => ({
            ...quiz,
            courseTitle: course.title,
          })),
        )
        .find((quiz) => quiz.id === confirmDeleteQuizId)
    : null;

  if (isLoading || !formation) {
    return (
      <section className="card">
        <p>{isLoading ? 'Loading formation...' : 'Formation not found.'}</p>
      </section>
    );
  }

  return (
    <section className="stack formation-manage-stack admin-skin-page">
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
          {formation.type === 'PRESENTIEL' && (
            <>
              <p className="hint formation-meta-line">
                <span>Location: {formation.location || '-'}</span>
              </p>
              <p className="hint formation-meta-line">
                <span>
                  Dates: {toDateOnlyLabel(formation.startDate)} -{' '}
                  {toDateOnlyLabel(formation.endDate)}
                </span>
              </p>
            </>
          )}
          <div className="row">
            <StatusBadge label={formation.type} tone={formation.type === 'ONLINE' ? 'blue' : 'orange'} />
          </div>
        </div>
        <div className="formation-head-actions">
          {formation.published ? (
            <div className="formation-head-published-status">
              <StatusBadge label="Published" tone="green" />
            </div>
          ) : (
            <LoadingButton
              className="btn-publish-formation formation-head-action-right"
              type="button"
              isLoading={publishingFormation}
              loadingText="Publishing..."
              disabled={false}
              onClick={publishFormation}
            >
              <img src="/images/send.png" alt="" className="btn-inline-icon" />
              Publish Formation
            </LoadingButton>
          )}
          {canAddCourses && (
            <div className="formation-head-bottom-action">
              <button
                type="button"
                className="formation-head-action-left formation-head-action-single"
                onClick={openAddCourseModal}
              >
                <img src="/images/courses.png" alt="" className="btn-inline-icon" />
                Add Course
              </button>
            </div>
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
                  <button type="submit" className="modal-save-btn" disabled={savingFormationField}>
                    {savingFormationField ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    className="modal-cancel-btn"
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
                  <button type="submit" className="modal-save-btn" disabled={creatingLesson}>
                    {creatingLesson ? 'Creating...' : 'Create Lesson'}
                  </button>
                  <button
                    type="button"
                    className="modal-cancel-btn"
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

      {isAddCourseModalOpen && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <button
            type="button"
            className="admin-modal-backdrop"
            onClick={closeAddCourseModal}
            aria-label="Close add course modal"
          />
          <article className="admin-modal-card">
            <div className="admin-modal-head">
              <h2>Add Course</h2>
              <button
                type="button"
                className="admin-modal-close"
                onClick={closeAddCourseModal}
                aria-label="Close add course modal"
              >
                x
              </button>
            </div>
            <div className="admin-modal-body">
              <p className="hint">Formation: {formation.title}</p>
              <form className="grid" onSubmit={createCourse}>
                <input
                  value={newCourseTitle}
                  onChange={(event) => setNewCourseTitle(event.target.value)}
                  placeholder="Course title"
                  required
                />
                <div className="row">
                  <button type="submit" className="modal-save-btn" disabled={creatingCourse}>
                    {creatingCourse ? 'Creating...' : 'Create Course'}
                  </button>
                  <button
                    type="button"
                    className="modal-cancel-btn"
                    onClick={closeAddCourseModal}
                    disabled={creatingCourse}
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
                  <button type="submit" className="modal-save-btn" disabled={creatingQuiz}>
                    {creatingQuiz ? 'Creating...' : 'Create Quiz'}
                  </button>
                  <button
                    type="button"
                    className="modal-cancel-btn"
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
                {!course.published && !formation.published && (
                  <LoadingButton
                    className="course-publish-btn"
                    type="button"
                    isLoading={publishingCourseId === course.id}
                    loadingText="Publishing..."
                    disabled={false}
                    onClick={() => publishCourse(course.id)}
                  >
                    <img src="/images/send.png" alt="" className="btn-inline-icon" />
                    Publish Course
                  </LoadingButton>
                )}
                {!isCourseLocked(course) && (
                  <button
                    type="button"
                    className="course-delete-showcase-btn"
                    aria-label="Delete pending course"
                    onClick={() => openDeleteCourseConfirmation(course.id)}
                    disabled={deletingCourseId === course.id}
                  >
                    <img
                      src="/images/trash.png"
                      alt=""
                      className="course-delete-showcase-icon"
                      aria-hidden="true"
                    />
                  </button>
                )}
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
                            <div className="row lesson-edit-actions">
                              <button
                                type="button"
                                className="modal-save-btn"
                                onClick={() => saveLessonEdit(course.id, lesson.id)}
                                disabled={savingLessonId === lesson.id}
                              >
                                {savingLessonId === lesson.id ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                type="button"
                                className="modal-cancel-btn"
                                onClick={() => setEditingLessonId(null)}
                                disabled={savingLessonId === lesson.id}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </article>
                      ) : isCourseLocked(course) ? (
                        <article key={lesson.id} className="item small-item">
                          <p><strong>{lesson.title}</strong></p>
                          <a href={lesson.pdfUrl} target="_blank" rel="noreferrer" className="hint">
                            Open PDF
                          </a>
                        </article>
                      ) : (
                        <article
                          key={lesson.id}
                          className="item small-item clickable-card item-with-inline-delete"
                          role="button"
                          tabIndex={0}
                          onClick={() => startLessonEdit(course, lesson)}
                        >
                          <p><strong>{lesson.title}</strong></p>
                          <a href={lesson.pdfUrl} target="_blank" rel="noreferrer" className="hint">
                            Open PDF
                          </a>
                          <button
                            type="button"
                            className="content-delete-btn-inline"
                            aria-label="Delete lesson"
                            onClick={(event) => {
                              event.stopPropagation();
                              openDeleteLessonConfirmation(lesson.id);
                            }}
                            disabled={deletingLessonId === lesson.id}
                          >
                            <img
                              src="/images/trash.png"
                              alt=""
                              className="content-delete-btn-icon"
                              aria-hidden="true"
                            />
                          </button>
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
                        <img src="/images/book.png" alt="" className="btn-inline-icon" />
                        Add Lesson
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

                              <div className="row quiz-edit-actions">
                                <button
                                  type="button"
                                  className="modal-save-btn"
                                  onClick={() => saveQuizEdit(course.id, quiz.id)}
                                  disabled={savingQuizId === quiz.id}
                                >
                                  {savingQuizId === quiz.id ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  type="button"
                                  className="modal-cancel-btn"
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

                      return isCourseLocked(course) ? (
                        <article
                          key={quiz.id}
                          className="item small-item clickable-card"
                          role="button"
                          tabIndex={0}
                          onClick={() => openQuizViewer(course, quiz)}
                        >
                          <p><strong>{quiz.title}</strong></p>
                          <p className="hint">
                            {primaryQuestion
                              ? primaryQuestion.text
                              : 'No question yet.'}
                          </p>
                        </article>
                      ) : (
                        <article
                          key={quiz.id}
                          className="item small-item clickable-card item-with-inline-delete"
                          role="button"
                          tabIndex={0}
                          onClick={() => startQuizEdit(course, quiz)}
                        >
                          <p><strong>{quiz.title}</strong></p>
                          <p className="hint">
                            {primaryQuestion
                              ? primaryQuestion.text
                              : 'No question yet.'}
                          </p>
                          <button
                            type="button"
                            className="content-delete-btn-inline"
                            aria-label="Delete quiz"
                            onClick={(event) => {
                              event.stopPropagation();
                              openDeleteQuizConfirmation(quiz.id);
                            }}
                            disabled={deletingQuizId === quiz.id}
                          >
                            <img
                              src="/images/trash.png"
                              alt=""
                              className="content-delete-btn-icon"
                              aria-hidden="true"
                            />
                          </button>
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
                        <img src="/images/brain.png" alt="" className="btn-inline-icon" />
                        Add Quiz
                      </button>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </article>
        ))}

        {confirmDeleteCourseId && (
          <div className="admin-modal-overlay" role="dialog" aria-modal="true">
            <button
              type="button"
              className="admin-modal-backdrop"
              onClick={closeDeleteCourseConfirmation}
              aria-label="Close delete confirmation"
              disabled={Boolean(deletingCourseId)}
            />
            <article className="admin-modal-card confirm-delete-modal">
              <div className="admin-modal-head">
                <h2>Delete Course</h2>
                <button
                  type="button"
                  className="admin-modal-close"
                  onClick={closeDeleteCourseConfirmation}
                  aria-label="Close delete confirmation"
                  disabled={Boolean(deletingCourseId)}
                >
                  x
                </button>
              </div>
              <div className="admin-modal-body">
                <p>
                  Are you sure you want to delete this pending course
                  {courseToDelete ? ` "${courseToDelete.title}"` : ''}?
                  This action cannot be undone.
                </p>
                <div className="row confirm-delete-actions">
                  <button
                    type="button"
                    className="modal-cancel-btn"
                    onClick={closeDeleteCourseConfirmation}
                    disabled={Boolean(deletingCourseId)}
                  >
                    Cancel
                  </button>
                  <LoadingButton
                    type="button"
                    className="action-btn action-delete"
                    isLoading={deletingCourseId === confirmDeleteCourseId}
                    loadingText="Deleting..."
                    disabled={false}
                    onClick={() => deletePendingCourse(confirmDeleteCourseId)}
                  >
                    Delete
                  </LoadingButton>
                </div>
              </div>
            </article>
          </div>
        )}

        {confirmDeleteLessonId && (
          <div className="admin-modal-overlay" role="dialog" aria-modal="true">
            <button
              type="button"
              className="admin-modal-backdrop"
              onClick={closeDeleteLessonConfirmation}
              aria-label="Close lesson delete confirmation"
              disabled={deletingLessonId === confirmDeleteLessonId}
            />
            <article className="admin-modal-card confirm-delete-modal">
              <div className="admin-modal-head">
                <h2>Delete Lesson</h2>
                <button
                  type="button"
                  className="admin-modal-close"
                  onClick={closeDeleteLessonConfirmation}
                  aria-label="Close lesson delete confirmation"
                  disabled={deletingLessonId === confirmDeleteLessonId}
                >
                  x
                </button>
              </div>
              <div className="admin-modal-body">
                <p>
                  Are you sure you want to delete this lesson
                  {lessonToDelete ? ` "${lessonToDelete.title}"` : ''}?
                  This action cannot be undone.
                </p>
                {lessonToDelete?.courseTitle && (
                  <p className="hint">Course: {lessonToDelete.courseTitle}</p>
                )}
                <div className="row confirm-delete-actions">
                  <button
                    type="button"
                    className="modal-cancel-btn"
                    onClick={closeDeleteLessonConfirmation}
                    disabled={deletingLessonId === confirmDeleteLessonId}
                  >
                    Cancel
                  </button>
                  <LoadingButton
                    type="button"
                    className="action-btn action-delete"
                    isLoading={deletingLessonId === confirmDeleteLessonId}
                    loadingText="Deleting..."
                    disabled={false}
                    onClick={() => deleteLesson(confirmDeleteLessonId)}
                  >
                    Delete
                  </LoadingButton>
                </div>
              </div>
            </article>
          </div>
        )}

        {confirmDeleteQuizId && (
          <div className="admin-modal-overlay" role="dialog" aria-modal="true">
            <button
              type="button"
              className="admin-modal-backdrop"
              onClick={closeDeleteQuizConfirmation}
              aria-label="Close quiz delete confirmation"
              disabled={deletingQuizId === confirmDeleteQuizId}
            />
            <article className="admin-modal-card confirm-delete-modal">
              <div className="admin-modal-head">
                <h2>Delete Quiz</h2>
                <button
                  type="button"
                  className="admin-modal-close"
                  onClick={closeDeleteQuizConfirmation}
                  aria-label="Close quiz delete confirmation"
                  disabled={deletingQuizId === confirmDeleteQuizId}
                >
                  x
                </button>
              </div>
              <div className="admin-modal-body">
                <p>
                  Are you sure you want to delete this quiz
                  {quizToDelete ? ` "${quizToDelete.title}"` : ''}?
                  This action cannot be undone.
                </p>
                {quizToDelete?.courseTitle && (
                  <p className="hint">Course: {quizToDelete.courseTitle}</p>
                )}
                <div className="row confirm-delete-actions">
                  <button
                    type="button"
                    className="modal-cancel-btn"
                    onClick={closeDeleteQuizConfirmation}
                    disabled={deletingQuizId === confirmDeleteQuizId}
                  >
                    Cancel
                  </button>
                  <LoadingButton
                    type="button"
                    className="action-btn action-delete"
                    isLoading={deletingQuizId === confirmDeleteQuizId}
                    loadingText="Deleting..."
                    disabled={false}
                    onClick={() => deleteQuiz(confirmDeleteQuizId)}
                  >
                    Delete
                  </LoadingButton>
                </div>
              </div>
            </article>
          </div>
        )}

        {viewingQuiz && (
          <div className="admin-modal-overlay" role="dialog" aria-modal="true">
            <button
              type="button"
              className="admin-modal-backdrop"
              onClick={closeQuizViewer}
              aria-label="Close quiz viewer"
            />
            <article className="admin-modal-card quiz-view-modal">
              <div className="admin-modal-head">
                <h2>Quiz Details</h2>
                <button
                  type="button"
                  className="admin-modal-close"
                  onClick={closeQuizViewer}
                  aria-label="Close quiz viewer"
                >
                  x
                </button>
              </div>
              <div className="admin-modal-body">
                <p className="hint">Course: {viewingQuiz.courseTitle}</p>
                <h3>{viewingQuiz.quiz.title}</h3>
                {(viewingQuiz.quiz.questions || []).length === 0 ? (
                  <p className="hint">No questions yet for this quiz.</p>
                ) : (
                  <div className="grid quiz-view-list">
                    {viewingQuiz.quiz.questions.map((question, questionIndex) => (
                      <article key={question.id} className="item small-item quiz-view-item">
                        <p>
                          <strong>
                            Q{questionIndex + 1}. {question.text}
                          </strong>
                        </p>
                        <ul className="quiz-view-choices">
                          {question.choices.map((choice) => (
                            <li
                              key={choice.id}
                              className={choice.isCorrect ? 'is-correct' : ''}
                            >
                              {choice.text}
                              {choice.isCorrect ? ' (Correct answer)' : ''}
                            </li>
                          ))}
                        </ul>
                      </article>
                    ))}
                  </div>
                )}
                <div className="row">
                  <button
                    type="button"
                    className="modal-cancel-btn"
                    onClick={closeQuizViewer}
                  >
                    Close
                  </button>
                </div>
              </div>
            </article>
          </div>
        )}

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


