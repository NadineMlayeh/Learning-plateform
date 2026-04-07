import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../api';
import { getCurrentUser } from '../auth';
import { useTranslation } from 'react-i18next';

export default function AdminAddLessonPage({ pushToast }) {
  const { t } = useTranslation();
  const user = getCurrentUser();
  const navigate = useNavigate();
  const { courseId } = useParams();
  const [searchParams] = useSearchParams();
  const formationId = searchParams.get('formationId');
  const [title, setTitle] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await apiRequest(`/courses/${courseId}/lessons`, {
        method: 'POST',
        token: user.token,
        body: { title, pdfUrl },
      });
      pushToast(t('formateur.manage.lessonCreatedSuccess'), 'success');
      navigate(formationId ? `/formateur/formations/${formationId}` : '/formateur');
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="floating-back-link"
        onClick={() =>
          navigate(
            formationId
              ? `/formateur/formations/${formationId}`
              : '/formateur',
          )
        }
      >
        <span aria-hidden="true">&lt;</span>
        <span>{t('formateur.manage.backToFormation')}</span>
      </button>

      <section className="card">
        <h1>{t('formateur.manage.addLessonTitle')}</h1>
        <form className="grid" onSubmit={handleSubmit}>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t('formateur.manage.lessonTitlePlaceholder')} required />
          <input value={pdfUrl} onChange={(event) => setPdfUrl(event.target.value)} placeholder={t('formateur.manage.pdfUrlPlaceholder')} required />
          <button type="submit" disabled={isSubmitting}>{isSubmitting ? t('formateur.manage.creating') : t('formateur.manage.createLesson')}</button>
        </form>
      </section>
    </>
  );
}
