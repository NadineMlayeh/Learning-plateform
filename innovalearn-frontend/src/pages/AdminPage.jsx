import { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import { getCurrentUser } from '../auth';

export default function AdminPage({ pushToast }) {
  const user = getCurrentUser();
  const [formateurs, setFormateurs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [approvingId, setApprovingId] = useState(null);

  async function loadFormateurs() {
    setIsLoading(true);
    try {
      const users = await apiRequest('/users', { token: user.token });
      setFormateurs(users.filter((entry) => entry.role === 'FORMATEUR'));
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }

  async function approve(id) {
    setApprovingId(id);
    try {
      await apiRequest(`/admin/formateur/${id}/approve`, {
        method: 'PATCH',
        token: user.token,
      });
      pushToast(`Formateur #${id} approved.`, 'success');
      await loadFormateurs();
    } catch (err) {
      pushToast(err.message, 'error');
    } finally {
      setApprovingId(null);
    }
  }

  useEffect(() => {
    loadFormateurs();
  }, []);

  return (
    <section className="card">
      <h1>Formateur Approvals</h1>
      <button type="button" onClick={loadFormateurs} disabled={isLoading}>
        {isLoading ? 'Refreshing...' : 'Refresh List'}
      </button>

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
            {formateurs.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.id}</td>
                <td>{entry.name}</td>
                <td>{entry.email}</td>
                <td>{entry.formateurStatus || '-'}</td>
                <td>
                  <button
                    type="button"
                    disabled={entry.formateurStatus === 'APPROVED' || approvingId === entry.id}
                    onClick={() => approve(entry.id)}
                  >
                    {approvingId === entry.id ? 'Approving...' : 'Approve'}
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
