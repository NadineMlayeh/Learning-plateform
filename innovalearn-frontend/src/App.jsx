import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { getCurrentUser } from './auth';
import NavBar from './components/NavBar';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastViewport, useToast } from './components/Toast';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminFormationPage from './pages/AdminFormationPage';
import AdminAddFormationPage from './pages/AdminAddFormationPage';
import AdminAddCoursePage from './pages/AdminAddCoursePage';
import AdminAddLessonPage from './pages/AdminAddLessonPage';
import AdminAddQuizPage from './pages/AdminAddQuizPage';
import AdminStudentsPage from './pages/AdminStudentsPage';
import AdminFormateursPage from './pages/AdminFormateursPage';
import AdminFormationsPage from './pages/AdminFormationsPage';
import AdminRevenuePage from './pages/AdminRevenuePage';
import StudentPage from './pages/StudentPage';
import StudentFormationDetailsPage from './pages/StudentFormationDetailsPage';
import ForbiddenPage from './pages/ForbiddenPage';

export default function App() {
  const user = getCurrentUser();
  const { toasts, pushToast, removeToast } = useToast();
  const location = useLocation();
  const isLandingPage = location.pathname === '/';
  const isAuthPage =
    location.pathname === '/login' || location.pathname === '/signup';
  const isBackofficePage =
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/formateur');
  const isStudentPage = location.pathname.startsWith('/student');
  const isStudentFormationDetailsPage =
    location.pathname.startsWith('/student/formations/');

  useEffect(() => {
    document.body.classList.toggle('auth-wallpaper-active', isAuthPage);
    return () => {
      document.body.classList.remove('auth-wallpaper-active');
    };
  }, [isAuthPage]);

  useEffect(() => {
    document.body.classList.toggle(
      'backoffice-palette-active',
      isBackofficePage,
    );
    return () => {
      document.body.classList.remove('backoffice-palette-active');
    };
  }, [isBackofficePage]);

  useEffect(() => {
    document.body.classList.toggle(
      'student-wallpaper-active',
      isStudentPage,
    );
    return () => {
      document.body.classList.remove('student-wallpaper-active');
    };
  }, [isStudentPage]);

  function roleHome() {
    if (!user) return '/';
    if (user.role === 'ADMIN') return '/admin';
    if (user.role === 'FORMATEUR') return '/formateur';
    if (user.role === 'STUDENT') return '/student';
    return '/';
  }

  return (
    <div className="app-shell">
      {!isLandingPage && <NavBar />}
      <main
        className={
          isLandingPage
            ? 'landing-main'
            : isAuthPage
              ? 'auth-main'
              : isStudentFormationDetailsPage
                ? 'container container-wide'
                : 'container'
        }
      >
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminPage pushToast={pushToast} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/formateurs"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminFormateursPage pushToast={pushToast} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/students"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminStudentsPage pushToast={pushToast} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/formations"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminFormationsPage pushToast={pushToast} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/revenue"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminRevenuePage pushToast={pushToast} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/formateur"
            element={
              <ProtectedRoute allowedRoles={['FORMATEUR']}>
                <AdminDashboardPage pushToast={pushToast} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/formateur/formations/new"
            element={
              <ProtectedRoute allowedRoles={['FORMATEUR']}>
                <AdminAddFormationPage pushToast={pushToast} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/formateur/formations/:formationId"
            element={
              <ProtectedRoute allowedRoles={['FORMATEUR']}>
                <AdminFormationPage pushToast={pushToast} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/formateur/formations/:formationId/courses/new"
            element={
              <ProtectedRoute allowedRoles={['FORMATEUR']}>
                <AdminAddCoursePage pushToast={pushToast} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/formateur/courses/:courseId/lessons/new"
            element={
              <ProtectedRoute allowedRoles={['FORMATEUR']}>
                <AdminAddLessonPage pushToast={pushToast} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/formateur/courses/:courseId/quizzes/new"
            element={
              <ProtectedRoute allowedRoles={['FORMATEUR']}>
                <AdminAddQuizPage pushToast={pushToast} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <StudentPage pushToast={pushToast} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/formations/:formationId"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <StudentFormationDetailsPage pushToast={pushToast} />
              </ProtectedRoute>
            }
          />
          <Route path="/forbidden" element={<ForbiddenPage />} />
          <Route path="*" element={<Navigate to={roleHome()} replace />} />
        </Routes>
      </main>
      <ToastViewport toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
