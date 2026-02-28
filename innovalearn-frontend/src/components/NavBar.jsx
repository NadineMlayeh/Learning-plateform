import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clearToken, getCurrentUser } from '../auth';

export default function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();
  const isAuthPage =
    location.pathname === '/login' || location.pathname === '/signup';

  function logout() {
    clearToken();
    navigate('/login');
  }

  return (
    <header className="topbar">
      <div className="brand">
        <img
          src="/images/logo2.png"
          alt="InnovaLearn Dashboard"
          className="brand-logo-wide"
        />
      </div>
      <nav className="topbar-nav">
        <div className="topbar-links">
          {!user && <Link to="/" className="topbar-link-underline">Home</Link>}
          {!user && (
            <Link to="/login" className={isAuthPage ? 'topbar-auth-action' : ''}>
              Login
            </Link>
          )}
          {!user && (
            <Link
              to="/signup"
              className={isAuthPage ? 'topbar-auth-action topbar-auth-signup' : ''}
            >
              Signup
            </Link>
          )}
          {user && <Link to="/" className="topbar-link-underline">Home</Link>}
          {user?.role === 'FORMATEUR' && (
            <Link to="/formateur" className="topbar-link-underline">
              Manage Content
            </Link>
          )}
          {user?.role === 'ADMIN' && <Link to="/admin">Admin Dashboard</Link>}
          {user?.role === 'STUDENT' && (
            <Link to="/student" className="topbar-link-underline">
              Student
            </Link>
          )}
        </div>
        {user && (
          <button type="button" onClick={logout} className="small-btn topbar-logout">
            Logout
          </button>
        )}
      </nav>
    </header>
  );
}
