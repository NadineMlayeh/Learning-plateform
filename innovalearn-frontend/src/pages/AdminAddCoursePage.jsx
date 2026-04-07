import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '../api';
import { getCurrentUser } from '../auth';
import { useTranslation } from 'react-i18next';

export default function AdminAddCoursePage({ pushToast }) {
  const { t } = useTranslation();
  const user = getCurrentUser();
  const navigate = useNavigate();
  const { formationId } = useParams();
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await apiRequest(`/formations/${formationId}/courses`, {
        method: 'POST',
        token: user.token,
        body: { title },
      });
      pushToast(t('formateur.manage.courseCreatedSuccess'), 'success');
      navigate(`/formateur/formations/${formationId}`);
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
        aria-label={t('formateur.manage.backToFormation')}
        onClick={() => navigate(`/formateur/formations/${formationId}`)}
      >
        <span aria-hidden="true">&lt;</span>
        <span>{t('formateur.manage.backToFormation')}</span>
      </button>

      <section className="card">
        <h1>{t('formateur.manage.addCourseTitle')}</h1>
        <form className="grid" onSubmit={handleSubmit}>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t('formateur.manage.courseTitlePlaceholder')} required />
          <button type="submit" disabled={isSubmitting}>{isSubmitting ? t('formateur.manage.creating') : t('formateur.manage.createCourse')}</button>
        </form>
      </section>
    </>
  );
}
