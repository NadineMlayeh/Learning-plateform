import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clearToken, getCurrentUser } from '../auth';
import { useState } from 'react';
import NotebookModal from './NotebookModal';

const FORCE_TOUR_KEY = 'innova_force_tour';

export default function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();
  const [isNotebookOpen, setIsNotebookOpen] = useState(false);
  const isAuthPage =
    location.pathname === '/login' ||
    location.pathname === '/signup' ||
    location.pathname === '/forgot-password' ||
    location.pathname === '/reset-password';
  const isDashboardArea =
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/formateur') ||
    location.pathname.startsWith('/student');
  const showNotebook = Boolean(user) && isDashboardArea;
  const showGuideMe =
    Boolean(user) &&
    (user.role === 'STUDENT' || user.role === 'FORMATEUR');

  function logout() {
    clearToken();
    navigate('/login');
  }

  function openGuide() {
    try {
      sessionStorage.setItem(FORCE_TOUR_KEY, '1');
    } catch {
      // ignore storage failures
    }

    const isStudentDashboard = location.pathname.startsWith('/student');
    const isFormateurDashboard = location.pathname.startsWith('/formateur');

    if (user?.role === 'STUDENT' && !isStudentDashboard) {
      navigate('/student');
      setTimeout(() => window.dispatchEvent(new Event('innova:start-tour')), 160);
      return;
    }

    if (user?.role === 'FORMATEUR' && !isFormateurDashboard) {
      navigate('/formateur');
      setTimeout(() => window.dispatchEvent(new Event('innova:start-tour')), 160);
      return;
    }

    window.dispatchEvent(new Event('innova:start-tour'));
  }

  return (
    <header className="topbar" data-tour="app-navbar">
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
              Dashboard
            </Link>
          )}
          {user?.role === 'ADMIN' && (
            <Link to="/admin" className="topbar-link-underline">
              Dashboard
            </Link>
          )}
          {user?.role === 'STUDENT' && (
            <Link to="/student" className="topbar-link-underline">
              Dashboard
            </Link>
          )}
          {showNotebook && (
            <button
              type="button"
              className="topbar-link-underline topbar-notebook-trigger"
              data-tour="navbar-notebook"
              onClick={() => setIsNotebookOpen(true)}
            >
              My Notebook
            </button>
          )}
          {showGuideMe && (
            <button
              type="button"
              className="topbar-link-underline topbar-guide-trigger"
              onClick={openGuide}
            >
              Guide me
            </button>
          )}
        </div>
        {user && (
          <button type="button" onClick={logout} className="small-btn topbar-logout">
            Logout
          </button>
        )}
      </nav>
      <NotebookModal
        isOpen={isNotebookOpen && showNotebook}
        onClose={() => setIsNotebookOpen(false)}
        token={user?.token}
      />
    </header>
  );
}
