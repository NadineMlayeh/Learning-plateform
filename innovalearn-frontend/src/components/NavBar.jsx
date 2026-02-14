import { Link, useNavigate } from 'react-router-dom';
import { clearToken, getCurrentUser } from '../auth';

export default function NavBar() {
  const navigate = useNavigate();
  const user = getCurrentUser();

  function logout() {
    clearToken();
    navigate('/login');
  }

  return (
    <header className="topbar">
      <div className="brand">InnovaLearn Test UI</div>
      <nav>
        {!user && <Link to="/login">Login</Link>}
        {!user && <Link to="/signup">Signup</Link>}
        {user && <Link to="/">Dashboard</Link>}
        {user?.role === 'ADMIN' && <Link to="/admin">Admin</Link>}
        {user?.role === 'FORMATEUR' && <Link to="/formateur">Formateur</Link>}
        {user?.role === 'STUDENT' && <Link to="/student">Student</Link>}
        {user && (
          <button type="button" onClick={logout} className="small-btn">
            Logout
          </button>
        )}
      </nav>
    </header>
  );
}
