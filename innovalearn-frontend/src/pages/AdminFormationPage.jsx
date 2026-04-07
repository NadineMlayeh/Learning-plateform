import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest, resolveApiAssetUrl } from '../api';
import { getCurrentUser } from '../auth';
import StatusBadge from '../components/StatusBadge';
import LoadingButton from '../components/LoadingButton';
import { useTranslation } from 'react-i18next';

const FORMATION_PUBLISH_TS_KEY = 'formateur_published_at_map_v1';

function readPublishedAtFallbackMap() {
  try {
    const raw = localStorage.getItem(FORMATION_PUBLISH_TS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writePublishedAtFallbackMap(map) {
  try {
    localStorage.setItem(FORMATION_PUBLISH_TS_KEY, JSON.stringify(map));
  } catch {
    // ignore storage failures
  }
}

function savePublishedAtFallback(formationId, iso) {
  if (!formationId || !iso) return;
  const map = readPublishedAtFallbackMap();
  map[String(formationId)] = iso;
  writePublishedAtFallbackMap(map);
}

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

function toDateInputValue(value) {
  if (!value) return '';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
}

export default function AdminFormationPage({ pushToast }) {
  const { t } = useTranslation();
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
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [thumbnailName, setThumbnailName] = useState('');
  const [formationDraftForm, setFormationDraftForm] = useState({
    title: '',
    description: '',
    price: '',
    location: '',
    startDate: '',
    endDate: '',
  });
  const [savingFormationDraft, setSavingFormationDraft] = useState(false);
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

  function syncDraftForm(nextFormation) {
    if (!nextFormation) return;
    setFormationDraftForm({
      title: nextFormation.title || '',
      description: nextFormation.description || '',
      price: String(nextFormation.price ?? ''),
      location: nextFormation.location || '',
      startDate: toDateInputValue(nextFormation.startDate),
      endDate: toDateInputValue(nextFormation.endDate),
    });
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
      const publishedIso = updated?.publishedAt || new Date().toISOString();
      savePublishedAtFallback(Number(formationId), publishedIso);
      setFormation((prev) => ({
        ...prev,
        published: updated.published,
        publishedAt: updated?.publishedAt || prev?.publishedAt || null,
      }));
      pushToast(t('formateur.manage.formationPublishedSuccess'), 'success');
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
      pushToast(t('formateur.manage.coursePublishedSuccess'), 'success');
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
        response?.message || t('formateur.manage.pendingCourseDeletedSuccess'),
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
      location: formation.location || '',
      startDate: toDateInputValue(formation.startDate),
      endDate: toDateInputValue(formation.endDate),
    };

    setEditingFormationField(field);
    setFormationFieldValue(valueMap[field] ?? '');
  }

  function closeFormationFieldEditor() {
    if (savingFormationField) return;
    setEditingFormationField(null);
    setFormationFieldValue('');
  }

  async function handleFormationThumbnailChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setThumbnailUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const upload = await apiRequest('/formations/thumbnail', {
        method: 'POST',
        token: user.token,
        body: formData,
      });
      const url = upload?.url || '';
      if (!url) {
        throw new Error('Thumbnail upload failed');
      }

      const updated = await apiRequest(`/formations/${formation.id}`, {
        method: 'PATCH',
        token: user.token,
        body: { profileImageUrl: url },
      });

      setFormation((prev) => ({ ...prev, ...updated, profileImageUrl: url }));
      setThumbnailName(file.name || 'thumbnail');
      pushToast(t('formateur.manage.thumbnailUpdatedSuccess'), 'success');
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setThumbnailUploading(false);
      event.target.value = '';
    }
  }

  async function saveFormationField(event) {
    event.preventDefault();
    if (!editingFormationField) return;

    const nextRaw = String(formationFieldValue || '').trim();
    const isDateField =
      editingFormationField === 'startDate' ||
      editingFormationField === 'endDate';

    if (
      (editingFormationField === 'title' ||
        editingFormationField === 'description') &&
      !nextRaw
    ) {
      pushToast(t('formateur.manage.fieldCannotBeEmpty'), 'error');
      return;
    }

    let payload;
    if (editingFormationField === 'price') {
      const parsed = Number(nextRaw);
      if (!Number.isFinite(parsed) || parsed < 0) {
        pushToast(t('formateur.manage.priceInvalid'), 'error');
        return;
      }
      payload = { price: parsed };
    } else if (isDateField) {
      payload = { [editingFormationField]: nextRaw || null };
    } else if (editingFormationField === 'location') {
      payload = { location: nextRaw || null };
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
      pushToast(t('formateur.manage.formationUpdatedSuccess'), 'success');
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
      pushToast(t('formateur.manage.courseTitleRequired'), 'error');
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
      pushToast(t('formateur.manage.courseCreatedSuccess'), 'success');
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
      pushToast(t('formateur.manage.lessonTitleAndPdfRequired'), 'error');
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
      pushToast(t('formateur.manage.lessonCreatedSuccess'), 'success');
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
      pushToast(t('formateur.manage.quizTitleRequired'), 'error');
      return;
    }

    if (!questionText) {
      pushToast(t('formateur.manage.questionRequired'), 'error');
      return;
    }

    if (choices.length < 2) {
      pushToast(t('formateur.manage.atLeastTwoChoices'), 'error');
      return;
    }

    const correctCount = choices.filter((choice) => choice.isCorrect).length;
    if (correctCount !== 1) {
      pushToast(t('formateur.manage.exactlyOneCorrectChoice'), 'error');
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
      pushToast(t('formateur.manage.quizCreatedSuccess'), 'success');
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
      pushToast(t('formateur.manage.lessonTitleAndPdfRequired'), 'error');
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
      pushToast(t('formateur.manage.lessonUpdatedSuccess'), 'success');
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
      pushToast(response?.message || t('formateur.manage.lessonDeletedSuccess'), 'success');
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
      return { error: t('formateur.manage.quizTitleRequired') };
    }

    if (!normalizedQuestion) {
      return { error: t('formateur.manage.questionRequired') };
    }

    if (normalizedChoices.length < 2) {
      return { error: t('formateur.manage.atLeastTwoChoices') };
    }

    const correctCount = normalizedChoices.filter(
      (choice) => choice.isCorrect,
    ).length;

    if (correctCount !== 1) {
      return {
        error: t('formateur.manage.exactlyOneCorrectChoice'),
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
      pushToast(t('formateur.manage.quizUpdatedSuccess'), 'success');
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
      pushToast(response?.message || t('formateur.manage.quizDeletedSuccess'), 'success');
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

  useEffect(() => {
    if (formation) {
      syncDraftForm(formation);
    }
  }, [formation]);

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

  function handleDraftFieldChange(event) {
    const { name, value } = event.target;
    setFormationDraftForm((prev) => ({ ...prev, [name]: value }));
  }

  function resetDraftForm() {
    syncDraftForm(formation);
  }

  async function saveDraftForm(event) {
    event.preventDefault();
    if (!formation || formation.published) return;

    const payload = {
      title: formationDraftForm.title.trim(),
      description: formationDraftForm.description.trim(),
      price: Number(formationDraftForm.price),
    };

    if (!payload.title || !payload.description) {
      pushToast(t('formateur.manage.titleAndDescriptionRequired'), 'error');
      return;
    }
    if (!Number.isFinite(payload.price) || payload.price < 0) {
      pushToast(t('formateur.manage.priceInvalid'), 'error');
      return;
    }

    if (formation.type === 'PRESENTIEL') {
      payload.location = formationDraftForm.location.trim();
      payload.startDate = formationDraftForm.startDate || null;
      payload.endDate = formationDraftForm.endDate || null;
    }

    setSavingFormationDraft(true);
    try {
      const updated = await apiRequest(`/formations/${formation.id}`, {
        method: 'PATCH',
        token: user.token,
        body: payload,
      });
      setFormation((prev) => ({ ...prev, ...updated }));
      pushToast(t('formateur.manage.formationUpdatedSuccess'), 'success');
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setSavingFormationDraft(false);
    }
  }

  if (isLoading || !formation) {
    return (
      <section className="card">
        <p>{isLoading ? t('admin.formations.loadingFormation') : t('student.formationDetails.formationNotFound')}</p>
      </section>
    );
  }

  return (
    <section className="stack formation-manage-stack admin-skin-page">
      <div className="card panel-head">
        <div className="formation-edit-layout">
          <aside className="formation-edit-summary">
            <div className="formation-thumb-block">
              <div className="formation-thumb-image">
                {formation.profileImageUrl ? (
                  <img
                    src={resolveApiAssetUrl(formation.profileImageUrl)}
                    alt={formation.title}
                  />
                ) : (
                  <div className="formation-thumb-placeholder">
                    <img src="/images/gallery.png" alt="" />
                  </div>
                )}
              </div>
              {!formation.published && (
                <>
                  <input
                    id="formation-thumb-input"
                    className="formation-thumb-input"
                    type="file"
                    accept="image/*"
                    onChange={handleFormationThumbnailChange}
                    disabled={thumbnailUploading}
                  />
                  <label
                    htmlFor="formation-thumb-input"
                    className="formation-thumb-link formation-thumb-link-compact"
                  >
                    <img src="/images/gallery.png" alt="" />
                    <span>
                      {thumbnailUploading
                        ? t('admin.dashboard.uploadingThumbnail')
                        : formation.profileImageUrl
                        ? t('admin.dashboard.changeThumbnail')
                        : t('admin.dashboard.addThumbnail')}
                    </span>
                  </label>
                  {thumbnailName ? (
                    <p className="hint formation-thumb-name">{thumbnailName}</p>
                  ) : null}
                </>
              )}
            </div>
            <div className="formation-summary-text">
              <h2>{formation.title}</h2>
              <p className="hint">{formation.description}</p>
              <p className="hint">{t('formateur.manage.priceLabel', { value: formation.price })}</p>
              {formation.type === 'PRESENTIEL' && (
                <>
                  <p className="hint">{t('formateur.manage.locationLabel', { value: formation.location || '-' })}</p>
                  <p className="hint">
                    {t('formateur.manage.startLabel', { value: toDateOnlyLabel(formation.startDate) })}
                  </p>
                  <p className="hint">{t('formateur.manage.endLabel', { value: toDateOnlyLabel(formation.endDate) })}</p>
                </>
              )}
              <div className="row">
                <StatusBadge
                  label={
                    formation.type === 'ONLINE'
                      ? t('formateur.manage.online')
                      : t('formateur.manage.presentiel')
                  }
                  tone={formation.type === 'ONLINE' ? 'blue' : 'orange'}
                />
              </div>
            </div>
          </aside>

          <div className="formation-edit-fields">
            <div className="formation-edit-head">
              {canAddCourses && (
                <button
                  type="button"
                  className="formation-head-action-left formation-head-action-single"
                  onClick={openAddCourseModal}
                >
                  <img src="/images/courses.png" alt="" className="btn-inline-icon" />
                  {t('formateur.manage.addCourse')}
                </button>
              )}
              {formation.published ? (
                <div className="formation-head-published-status">
                  <StatusBadge label={t('admin.dashboard.published')} tone="green" />
                </div>
              ) : (
                <LoadingButton
                  className="btn-publish-formation formation-head-action-right"
                  type="button"
                  isLoading={publishingFormation}
                  loadingText={t('admin.dashboard.publishing')}
                  disabled={false}
                  onClick={publishFormation}
                >
                  <img src="/images/send.png" alt="" className="btn-inline-icon" />
                  {t('formateur.manage.publishFormation')}
                </LoadingButton>
              )}
            </div>

            <form className="formation-edit-form" onSubmit={saveDraftForm}>
              <div className="formation-edit-row">
                <label>
                  <span>{t('admin.dashboard.formTitle')}</span>
                  <input
                    name="title"
                    value={formationDraftForm.title}
                    onChange={handleDraftFieldChange}
                    disabled={formation.published || savingFormationDraft}
                    required
                  />
                </label>
              </div>
              <div className="formation-edit-row">
                <label>
                  <span>{t('admin.dashboard.formDescription')}</span>
                  <textarea
                    name="description"
                    rows={4}
                    value={formationDraftForm.description}
                    onChange={handleDraftFieldChange}
                    disabled={formation.published || savingFormationDraft}
                    required
                  />
                </label>
              </div>
              <div className="formation-edit-row formation-edit-row-split">
                <label>
                  <span>{t('admin.dashboard.formPrice')}</span>
                  <input
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formationDraftForm.price}
                    onChange={handleDraftFieldChange}
                    disabled={formation.published || savingFormationDraft}
                    required
                  />
                </label>
                {formation.type === 'PRESENTIEL' && (
                  <label>
                    <span>{t('formateur.manage.location')}</span>
                    <input
                      name="location"
                      value={formationDraftForm.location}
                      onChange={handleDraftFieldChange}
                      disabled={formation.published || savingFormationDraft}
                    />
                  </label>
                )}
              </div>
              {formation.type === 'PRESENTIEL' && (
                <div className="formation-edit-row formation-edit-row-split">
                  <label>
                    <span>{t('formateur.manage.startDate')}</span>
                    <input
                      name="startDate"
                      type="date"
                      value={formationDraftForm.startDate}
                      onChange={handleDraftFieldChange}
                      disabled={formation.published || savingFormationDraft}
                    />
                  </label>
                  <label>
                    <span>{t('formateur.manage.endDate')}</span>
                    <input
                      name="endDate"
                      type="date"
                      value={formationDraftForm.endDate}
                      onChange={handleDraftFieldChange}
                      disabled={formation.published || savingFormationDraft}
                    />
                  </label>
                </div>
              )}
              {!formation.published && (
                <div className="formation-edit-actions">
                  <button
                    type="submit"
                    className="modal-save-btn"
                    disabled={savingFormationDraft}
                  >
                    {savingFormationDraft ? t('formateur.manage.saving') : t('formateur.manage.save')}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      {editingFormationField && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <button
            type="button"
            className="admin-modal-backdrop"
            onClick={closeFormationFieldEditor}
            aria-label={t('formateur.manage.closeEditModal')}
          />
          <article className="admin-modal-card">
            <div className="admin-modal-head">
              <h2>
                {t('formateur.manage.editFieldTitle', {
                  field:
                    editingFormationField === 'title'
                      ? t('admin.dashboard.formTitle')
                      : editingFormationField === 'description'
                        ? t('admin.dashboard.formDescription')
                        : editingFormationField === 'price'
                          ? t('admin.dashboard.formPrice')
                          : editingFormationField === 'location'
                            ? t('formateur.manage.location')
                            : editingFormationField === 'startDate'
                              ? t('formateur.manage.startDate')
                              : editingFormationField === 'endDate'
                                ? t('formateur.manage.endDate')
                                : t('formateur.manage.fieldFallback'),
                })}
              </h2>
              <button
                type="button"
                className="admin-modal-close"
                onClick={closeFormationFieldEditor}
                aria-label={t('formateur.manage.closeEditModal')}
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
                    type={
                      editingFormationField === 'price'
                        ? 'number'
                        : editingFormationField === 'startDate' ||
                            editingFormationField === 'endDate'
                          ? 'date'
                          : 'text'
                    }
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
                    {savingFormationField ? t('formateur.manage.saving') : t('formateur.manage.save')}
                  </button>
                  <button
                    type="button"
                    className="modal-cancel-btn"
                    onClick={closeFormationFieldEditor}
                    disabled={savingFormationField}
                  >
                    {t('formateur.manage.cancel')}
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
            aria-label={t('formateur.manage.closeLessonModal')}
          />
          <article className="admin-modal-card">
            <div className="admin-modal-head">
              <h2>{t('formateur.manage.addLessonTitle')}</h2>
              <button
                type="button"
                className="admin-modal-close"
                onClick={closeAddLessonModal}
                aria-label={t('formateur.manage.closeLessonModal')}
              >
                x
              </button>
            </div>
            <div className="admin-modal-body">
              <p className="hint">
                {t('formateur.manage.coursePrefix', {
                  name: addingLessonCourse?.title || `#${addingLessonCourseId}`,
                })}
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
                  placeholder={t('formateur.manage.lessonTitlePlaceholder')}
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
                  placeholder={t('formateur.manage.pdfUrlPlaceholder')}
                  required
                />
                <div className="row">
                  <button type="submit" className="modal-save-btn" disabled={creatingLesson}>
                    {creatingLesson ? t('formateur.manage.creating') : t('formateur.manage.createLesson')}
                  </button>
                  <button
                    type="button"
                    className="modal-cancel-btn"
                    onClick={closeAddLessonModal}
                    disabled={creatingLesson}
                  >
                    {t('formateur.manage.cancel')}
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
            aria-label={t('formateur.manage.closeAddCourseModal')}
          />
          <article className="admin-modal-card">
            <div className="admin-modal-head">
              <h2>{t('formateur.manage.addCourseTitle')}</h2>
              <button
                type="button"
                className="admin-modal-close"
                onClick={closeAddCourseModal}
                aria-label={t('formateur.manage.closeAddCourseModal')}
              >
                x
              </button>
            </div>
            <div className="admin-modal-body">
              <p className="hint">{t('formateur.manage.formationPrefix', { name: formation.title })}</p>
              <form className="grid" onSubmit={createCourse}>
                <input
                  value={newCourseTitle}
                  onChange={(event) => setNewCourseTitle(event.target.value)}
                  placeholder={t('formateur.manage.courseTitlePlaceholder')}
                  required
                />
                <div className="row">
                  <button type="submit" className="modal-save-btn" disabled={creatingCourse}>
                    {creatingCourse ? t('formateur.manage.creating') : t('formateur.manage.createCourse')}
                  </button>
                  <button
                    type="button"
                    className="modal-cancel-btn"
                    onClick={closeAddCourseModal}
                    disabled={creatingCourse}
                  >
                    {t('formateur.manage.cancel')}
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
            aria-label={t('formateur.manage.closeQuizModal')}
          />
          <article className="admin-modal-card">
            <div className="admin-modal-head">
              <h2>{t('formateur.manage.addQuizTitle')}</h2>
              <button
                type="button"
                className="admin-modal-close"
                onClick={closeAddQuizModal}
                aria-label={t('formateur.manage.closeQuizModal')}
              >
                x
              </button>
            </div>
            <div className="admin-modal-body">
              <p className="hint">
                {t('formateur.manage.coursePrefix', {
                  name: addingQuizCourse?.title || `#${addingQuizCourseId}`,
                })}
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
                  placeholder={t('formateur.manage.quizTitlePlaceholder')}
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
                  placeholder={t('formateur.manage.questionPlaceholder')}
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
                        placeholder={t('formateur.manage.choicePlaceholder', { index: index + 1 })}
                        required={index < 2}
                      />
                      <label className="hint">
                        <input
                          type="radio"
                          name="new-correct-choice"
                          checked={choice.isCorrect}
                          onChange={() => setNewCorrectChoice(index)}
                        />
                        {t('formateur.manage.correct')}
                      </label>
                    </div>
                  ))}
                </div>
                <div className="row">
                  <button type="submit" className="modal-save-btn" disabled={creatingQuiz}>
                    {creatingQuiz ? t('formateur.manage.creating') : t('formateur.manage.createQuiz')}
                  </button>
                  <button
                    type="button"
                    className="modal-cancel-btn"
                    onClick={closeAddQuizModal}
                    disabled={creatingQuiz}
                  >
                    {t('formateur.manage.cancel')}
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
              <h2 className="formation-course-title" title={t('formateur.manage.coursePrefix', { name: course.title })}>
                {t('formateur.manage.coursePrefix', { name: course.title })}
              </h2>
              <div className="row course-head-actions">
                {course.published && (
                  <StatusBadge
                    label={t('admin.dashboard.published')}
                    tone="green"
                  />
                )}
                {!course.published && !formation.published && (
                  <LoadingButton
                    className="course-publish-btn"
                    type="button"
                    isLoading={publishingCourseId === course.id}
                    loadingText={t('admin.dashboard.publishing')}
                    disabled={false}
                    onClick={() => publishCourse(course.id)}
                  >
                    <img src="/images/send.png" alt="" className="btn-inline-icon" />
                    {t('formateur.manage.publishCourse')}
                  </LoadingButton>
                )}
                {!isCourseLocked(course) && (
                  <button
                    type="button"
                    className="course-delete-showcase-btn"
                    aria-label={t('formateur.manage.deleteCourseTitle')}
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
                  <h3 className="formation-subsection-title">{t('formateur.manage.lessons')}</h3>
                </div>
                <div className="formation-subsection-body">
                  <div className="nested-grid formation-subsection-list">
                    {course.lessons.length === 0 && <p className="hint">{t('formateur.manage.noLessonsYet')}</p>}
                    {(course.published || formation.published) && (
                      <p className="hint">{t('formateur.manage.lockedHint')}</p>
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
                              placeholder={t('formateur.manage.lessonTitlePlaceholder')}
                            />
                            <input
                              value={lessonForm.pdfUrl}
                              onChange={(event) =>
                                setLessonForm((prev) => ({
                                  ...prev,
                                  pdfUrl: event.target.value,
                                }))
                              }
                              placeholder={t('formateur.manage.pdfUrlPlaceholder')}
                            />
                            <div className="row lesson-edit-actions">
                              <button
                                type="button"
                                className="modal-save-btn"
                                onClick={() => saveLessonEdit(course.id, lesson.id)}
                                disabled={savingLessonId === lesson.id}
                              >
                                {savingLessonId === lesson.id ? t('formateur.manage.saving') : t('formateur.manage.save')}
                              </button>
                              <button
                                type="button"
                                className="modal-cancel-btn"
                                onClick={() => setEditingLessonId(null)}
                                disabled={savingLessonId === lesson.id}
                              >
                                {t('formateur.manage.cancel')}
                              </button>
                            </div>
                          </div>
                        </article>
                      ) : isCourseLocked(course) ? (
                        <article key={lesson.id} className="item small-item">
                          <p><strong>{lesson.title}</strong></p>
                          <a href={lesson.pdfUrl} target="_blank" rel="noreferrer" className="hint">
                            {t('formateur.manage.openPdf')}
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
                            {t('formateur.manage.openPdf')}
                          </a>
                          <button
                            type="button"
                            className="content-delete-btn-inline"
                            aria-label={t('formateur.manage.deleteLessonAria')}
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
                        {t('formateur.manage.addLessonTitle')}
                      </button>
                    </div>
                  )}
                </div>
              </section>

              <section className="formation-subsection">
                <div className="formation-subsection-head">
                  <h3 className="formation-subsection-title">{t('formateur.manage.quizzes')}</h3>
                </div>
                <div className="formation-subsection-body">
                  <div className="nested-grid formation-subsection-list">
                    {course.quizzes.length === 0 && <p className="hint">{t('formateur.manage.noQuizzesYet')}</p>}
                    {(course.published || formation.published) && (
                      <p className="hint">{t('formateur.manage.lockedHint')}</p>
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
                                placeholder={t('formateur.manage.quizTitlePlaceholder')}
                              />
                              <textarea
                                value={quizForm.questionText}
                                onChange={(event) =>
                                  setQuizForm((prev) => ({
                                    ...prev,
                                    questionText: event.target.value,
                                  }))
                                }
                                placeholder={t('formateur.manage.questionPlaceholder')}
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
                                      placeholder={t('formateur.manage.choicePlaceholder', { index: index + 1 })}
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
                                      {t('formateur.manage.correct')}
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
                                  {savingQuizId === quiz.id ? t('formateur.manage.saving') : t('formateur.manage.save')}
                                </button>
                                <button
                                  type="button"
                                  className="modal-cancel-btn"
                                  onClick={() => setEditingQuizId(null)}
                                  disabled={savingQuizId === quiz.id}
                                >
                                  {t('formateur.manage.cancel')}
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
                              : t('formateur.manage.noQuestionYet')}
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
                              : t('formateur.manage.noQuestionYet')}
                          </p>
                          <button
                            type="button"
                            className="content-delete-btn-inline"
                            aria-label={t('formateur.manage.deleteQuizAria')}
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
                        {t('formateur.manage.addQuizTitle')}
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
              aria-label={t('formateur.manage.closeDeleteConfirmation')}
              disabled={Boolean(deletingCourseId)}
            />
            <article className="admin-modal-card confirm-delete-modal">
              <div className="admin-modal-head">
                <h2>{t('formateur.manage.deleteCourseTitle')}</h2>
                <button
                  type="button"
                  className="admin-modal-close"
                  onClick={closeDeleteCourseConfirmation}
                  aria-label={t('formateur.manage.closeDeleteConfirmation')}
                  disabled={Boolean(deletingCourseId)}
                >
                  x
                </button>
              </div>
              <div className="admin-modal-body">
                <p>{t('formateur.manage.deleteCourseConfirm', { name: courseToDelete?.title || '' })}</p>
                <div className="row confirm-delete-actions">
                  <button
                    type="button"
                    className="modal-cancel-btn"
                    onClick={closeDeleteCourseConfirmation}
                    disabled={Boolean(deletingCourseId)}
                  >
                    {t('formateur.manage.cancel')}
                  </button>
                  <LoadingButton
                    type="button"
                    className="action-btn action-delete"
                    isLoading={deletingCourseId === confirmDeleteCourseId}
                    loadingText={t('admin.dashboard.deleting')}
                    disabled={false}
                    onClick={() => deletePendingCourse(confirmDeleteCourseId)}
                  >
                    {t('admin.dashboard.deleteContent')}
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
              aria-label={t('formateur.manage.closeLessonDeleteConfirmation')}
              disabled={deletingLessonId === confirmDeleteLessonId}
            />
            <article className="admin-modal-card confirm-delete-modal">
              <div className="admin-modal-head">
                <h2>{t('formateur.manage.deleteLessonTitle')}</h2>
                <button
                  type="button"
                  className="admin-modal-close"
                  onClick={closeDeleteLessonConfirmation}
                  aria-label={t('formateur.manage.closeLessonDeleteConfirmation')}
                  disabled={deletingLessonId === confirmDeleteLessonId}
                >
                  x
                </button>
              </div>
              <div className="admin-modal-body">
                <p>{t('formateur.manage.deleteLessonConfirm', { name: lessonToDelete?.title || '' })}</p>
                {lessonToDelete?.courseTitle && (
                  <p className="hint">{t('formateur.manage.coursePrefix', { name: lessonToDelete.courseTitle })}</p>
                )}
                <div className="row confirm-delete-actions">
                  <button
                    type="button"
                    className="modal-cancel-btn"
                    onClick={closeDeleteLessonConfirmation}
                    disabled={deletingLessonId === confirmDeleteLessonId}
                  >
                    {t('formateur.manage.cancel')}
                  </button>
                  <LoadingButton
                    type="button"
                    className="action-btn action-delete"
                    isLoading={deletingLessonId === confirmDeleteLessonId}
                    loadingText={t('admin.dashboard.deleting')}
                    disabled={false}
                    onClick={() => deleteLesson(confirmDeleteLessonId)}
                  >
                    {t('admin.dashboard.deleteContent')}
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
              aria-label={t('formateur.manage.closeQuizDeleteConfirmation')}
              disabled={deletingQuizId === confirmDeleteQuizId}
            />
            <article className="admin-modal-card confirm-delete-modal">
              <div className="admin-modal-head">
                <h2>{t('formateur.manage.deleteQuizTitle')}</h2>
                <button
                  type="button"
                  className="admin-modal-close"
                  onClick={closeDeleteQuizConfirmation}
                  aria-label={t('formateur.manage.closeQuizDeleteConfirmation')}
                  disabled={deletingQuizId === confirmDeleteQuizId}
                >
                  x
                </button>
              </div>
              <div className="admin-modal-body">
                <p>{t('formateur.manage.deleteQuizConfirm', { name: quizToDelete?.title || '' })}</p>
                {quizToDelete?.courseTitle && (
                  <p className="hint">{t('formateur.manage.coursePrefix', { name: quizToDelete.courseTitle })}</p>
                )}
                <div className="row confirm-delete-actions">
                  <button
                    type="button"
                    className="modal-cancel-btn"
                    onClick={closeDeleteQuizConfirmation}
                    disabled={deletingQuizId === confirmDeleteQuizId}
                  >
                    {t('formateur.manage.cancel')}
                  </button>
                  <LoadingButton
                    type="button"
                    className="action-btn action-delete"
                    isLoading={deletingQuizId === confirmDeleteQuizId}
                    loadingText={t('admin.dashboard.deleting')}
                    disabled={false}
                    onClick={() => deleteQuiz(confirmDeleteQuizId)}
                  >
                    {t('admin.dashboard.deleteContent')}
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
              aria-label={t('formateur.manage.closeQuizViewer')}
            />
            <article className="admin-modal-card quiz-view-modal">
              <div className="admin-modal-head">
                <h2>{t('formateur.manage.quizDetailsTitle')}</h2>
                <button
                  type="button"
                  className="admin-modal-close"
                  onClick={closeQuizViewer}
                  aria-label={t('formateur.manage.closeQuizViewer')}
                >
                  x
                </button>
              </div>
              <div className="admin-modal-body">
                <p className="hint">{t('formateur.manage.coursePrefix', { name: viewingQuiz.courseTitle })}</p>
                <h3>{viewingQuiz.quiz.title}</h3>
                {(viewingQuiz.quiz.questions || []).length === 0 ? (
                  <p className="hint">{t('formateur.manage.noQuestionsYetForQuiz')}</p>
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
                              {choice.isCorrect ? t('formateur.manage.correctAnswerSuffix') : ''}
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
                    {t('formateur.manage.close')}
                  </button>
                </div>
              </div>
            </article>
          </div>
        )}

        {formation.courses.length === 0 && formation.type !== 'PRESENTIEL' && (
          <div className="card">
            <p className="hint">
              {t('formateur.manage.noCourseYetForFormation')}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}


