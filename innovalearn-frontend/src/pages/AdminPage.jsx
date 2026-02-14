import { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import { getCurrentUser } from '../auth';

export default function AdminPage() {
  const user = getCurrentUser();
  const [formateurs, setFormateurs] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadFormateurs() {
    setError('');
    try {
      const users = await apiRequest('/users', { token: user.token });
      const list = users.filter((u) => u.role === 'FORMATEUR');
      setFormateurs(list);
    } catch (err) {
      setError(err.message);
    }
  }

  async function approve(id) {
    setMessage('');
    setError('');
    try {
      await apiRequest(`/admin/formateur/${id}/approve`, {
        method: 'PATCH',
        token: user.token,
      });
      setMessage(`Formateur #${id} approved.`);
      await loadFormateurs();
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadFormateurs();
  }, []);

  return (
    <section className="card">
      <h1>Admin - Formateur Approvals</h1>
      <button onClick={loadFormateurs}>Refresh list</button>
      {message && <p className="ok">{message}</p>}
      {error && <p className="error">{error}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {formateurs.map((f) => (
              <tr key={f.id}>
                <td>{f.id}</td>
                <td>{f.name}</td>
                <td>{f.email}</td>
                <td>{f.formateurStatus || '-'}</td>
                <td>
                  <button
                    disabled={f.formateurStatus === 'APPROVED'}
                    onClick={() => approve(f.id)}
                  >
                    Approve
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
