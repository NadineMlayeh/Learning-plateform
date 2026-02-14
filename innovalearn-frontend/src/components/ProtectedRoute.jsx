import { Navigate, useLocation } from 'react-router-dom';
import { getCurrentUser } from '../auth';

export default function ProtectedRoute({ allowedRoles, children }) {
  const location = useLocation();
  const user = getCurrentUser();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/forbidden" replace />;
  }

  return children;
}
