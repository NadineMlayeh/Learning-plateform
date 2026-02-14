import { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import { getCurrentUser } from '../auth';

export default function StudentPage() {
  const user = getCurrentUser();
  const [formations, setFormations] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadFormations() {
    setError('');
    try {
      const data = await apiRequest('/formations', { token: user.token });
      setFormations(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function loadEnrollments() {
    setError('');
    try {
      const data = await apiRequest('/enrollments', { token: user.token });
      setEnrollments(data);
    } catch (err) {
      setError(err.message);
    }
  }

  async function enroll(formationId) {
    setError('');
    setMessage('');
    try {
      await apiRequest(`/enrollments/${formationId}`, {
        method: 'POST',
        token: user.token,
      });
      setMessage(`Enrolled in formation #${formationId}`);
      await loadEnrollments();
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadFormations();
    loadEnrollments();
  }, []);

  return (
    <section className="stack">
      <div className="card">
        <h1>Student Workspace</h1>
        <div className="row">
          <button onClick={loadFormations}>Refresh formations</button>
          <button onClick={loadEnrollments}>Refresh enrollments</button>
        </div>
        {message && <p className="ok">{message}</p>}
        {error && <p className="error">{error}</p>}
      </div>

      <div className="card">
        <h2>Published Formations</h2>
        {formations.length === 0 && <p>No published formation yet.</p>}
        {formations.map((formation) => (
          <article key={formation.id} className="item">
            <p><strong>#{formation.id} {formation.title}</strong></p>
            <p>{formation.description}</p>
            <p>Type: {formation.type} | Price: {formation.price}</p>
            <button onClick={() => enroll(formation.id)}>Enroll</button>
          </article>
        ))}
      </div>

      <div className="card">
        <h2>My Enrollments</h2>
        {enrollments.length === 0 && <p>You are not enrolled yet.</p>}
        {enrollments.map((entry) => (
          <article key={entry.id} className="item">
            <p><strong>Enrollment #{entry.id}</strong></p>
            <p>Formation: {entry.formation?.title || entry.formationId}</p>
            <p>Date: {new Date(entry.createdAt).toLocaleString()}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
