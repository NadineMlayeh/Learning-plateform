import { Navigate, Route, Routes } from 'react-router-dom';
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
import StudentPage from './pages/StudentPage';
import StudentFormationDetailsPage from './pages/StudentFormationDetailsPage';
import StudentAchievementsPage from './pages/StudentAchievementsPage';
import ForbiddenPage from './pages/ForbiddenPage';

export default function App() {
  const user = getCurrentUser();
  const { toasts, pushToast, removeToast } = useToast();

  function roleHome() {
    if (!user) return '/';
    if (user.role === 'ADMIN') return '/admin';
    if (user.role === 'FORMATEUR') return '/formateur';
    if (user.role === 'STUDENT') return '/student';
    return '/';
  }

  return (
    <div className="app-shell">
      <NavBar />
      <main className="container">
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
                <AdminPage pushToast={pushToast} />
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
          <Route
            path="/student/achievements"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <StudentAchievementsPage pushToast={pushToast} />
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
