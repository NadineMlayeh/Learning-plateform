import { Navigate, Route, Routes } from 'react-router-dom';
import { getCurrentUser } from './auth';
import NavBar from './components/NavBar';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import FormateurPage from './pages/FormateurPage';
import StudentPage from './pages/StudentPage';
import ForbiddenPage from './pages/ForbiddenPage';

export default function App() {
  const user = getCurrentUser();

  function roleHome() {
    if (!user) return '/login';
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
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/formateur"
            element={
              <ProtectedRoute allowedRoles={['FORMATEUR']}>
                <FormateurPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <StudentPage />
              </ProtectedRoute>
            }
          />
          <Route path="/forbidden" element={<ForbiddenPage />} />
          <Route path="*" element={<Navigate to={roleHome()} replace />} />
        </Routes>
      </main>
    </div>
  );
}
