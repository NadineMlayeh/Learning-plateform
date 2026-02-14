import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '../api';
import { getCurrentUser } from '../auth';

export default function AdminAddCoursePage({ pushToast }) {
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
      pushToast('Course created.', 'success');
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
        aria-label="Back to formation"
        onClick={() => navigate(`/formateur/formations/${formationId}`)}
      >
        <span aria-hidden="true">&lt;</span>
        <span>Back to Formation</span>
      </button>

      <section className="card">
        <h1>Add Course</h1>
        <form className="grid" onSubmit={handleSubmit}>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Course title" required />
          <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create Course'}</button>
        </form>
      </section>
    </>
  );
}
