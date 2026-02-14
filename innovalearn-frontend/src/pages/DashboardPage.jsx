import { Link } from 'react-router-dom';
import { getCurrentUser } from '../auth';

export default function DashboardPage() {
  const user = getCurrentUser();

  if (!user) {
    return (
      <section className="card">
        <h1>Welcome</h1>
        <p>Use login/signup to start testing your backend with UI pages.</p>
      </section>
    );
  }

  return (
    <section className="card">
      <h1>Dashboard</h1>
      <p><strong>User ID:</strong> {user.userId}</p>
      <p><strong>Role:</strong> {user.role}</p>
      {user.role === 'ADMIN' && <p><Link to="/admin">Open Admin page</Link></p>}
      {user.role === 'FORMATEUR' && <p><Link to="/formateur">Open Formateur page</Link></p>}
      {user.role === 'STUDENT' && <p><Link to="/student">Open Student page</Link></p>}
    </section>
  );
}
