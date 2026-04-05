import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clearToken, getCurrentUser } from '../auth';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import NotebookModal from './NotebookModal';
import LanguageSwitcher from './LanguageSwitcher';

const FORCE_TOUR_KEY = 'innova_force_tour';

export default function NavBar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();
  const [isNotebookOpen, setIsNotebookOpen] = useState(false);
  const isAuthStyledPage =
    location.pathname === '/login' ||
    location.pathname === '/signup' ||
    location.pathname === '/forgot-password' ||
    location.pathname === '/reset-password' ||
    location.pathname === '/contact';
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
    const isStudentDashboard = location.pathname.startsWith('/student');
    const isFormateurDashboard = location.pathname.startsWith('/formateur');

    if (user?.role === 'STUDENT' && !isStudentDashboard) {
      try {
        sessionStorage.setItem(FORCE_TOUR_KEY, '1');
      } catch {
        // ignore storage failures
      }
      navigate('/student');
      setTimeout(() => window.dispatchEvent(new Event('innova:start-tour')), 160);
      return;
    }

    if (user?.role === 'FORMATEUR' && !isFormateurDashboard) {
      try {
        sessionStorage.setItem(FORCE_TOUR_KEY, '1');
      } catch {
        // ignore storage failures
      }
      navigate('/formateur');
      setTimeout(() => window.dispatchEvent(new Event('innova:start-tour')), 160);
      return;
    }

    try {
      sessionStorage.removeItem(FORCE_TOUR_KEY);
    } catch {
      // ignore storage failures
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
          {!user && <Link to="/" className="topbar-link-underline">{t('nav.home')}</Link>}
          <Link to="/contact" className="topbar-link-underline">{t('nav.contact')}</Link>
          {!user && (
            <Link to="/login" className={isAuthStyledPage ? 'topbar-auth-action' : ''}>
              {t('common.actions.login')}
            </Link>
          )}
          {!user && (
            <Link
              to="/signup"
              className={isAuthStyledPage ? 'topbar-auth-action topbar-auth-signup' : ''}
            >
              {t('common.actions.signup')}
            </Link>
          )}
          {user?.role === 'FORMATEUR' && (
            <Link to="/formateur" className="topbar-link-underline">
              {t('nav.dashboard')}
            </Link>
          )}
          {user?.role === 'ADMIN' && (
            <Link to="/admin" className="topbar-link-underline">
              {t('nav.dashboard')}
            </Link>
          )}
          {user?.role === 'STUDENT' && (
            <Link to="/student" className="topbar-link-underline">
              {t('nav.dashboard')}
            </Link>
          )}
          {showNotebook && (
            <button
              type="button"
              className="topbar-link-underline topbar-notebook-trigger"
              data-tour="navbar-notebook"
              onClick={() => setIsNotebookOpen(true)}
            >
              {t('nav.myNotebook')}
            </button>
          )}
          {showGuideMe && (
            <button
              type="button"
              className="topbar-link-underline topbar-guide-trigger"
              onClick={openGuide}
            >
              {t('nav.guideMe')}
            </button>
          )}
        </div>
        <LanguageSwitcher variant="topbar" />
        {user && (
          <button type="button" onClick={logout} className="small-btn topbar-logout">
            {t('common.actions.logout')}
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
