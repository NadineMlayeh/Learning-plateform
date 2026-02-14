import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../api';
import { getCurrentUser } from '../auth';

export default function AdminAddLessonPage({ pushToast }) {
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
      pushToast('Lesson created.', 'success');
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
        <span>Back to Formation</span>
      </button>

      <section className="card">
        <h1>Add Lesson</h1>
        <form className="grid" onSubmit={handleSubmit}>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Lesson title" required />
          <input value={pdfUrl} onChange={(event) => setPdfUrl(event.target.value)} placeholder="PDF URL" required />
          <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create Lesson'}</button>
        </form>
      </section>
    </>
  );
}
