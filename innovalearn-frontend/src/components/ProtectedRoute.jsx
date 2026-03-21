import { Navigate, useLocation } from 'react-router-dom';
import { consumeSessionTimeoutRedirectFlag, getCurrentUser } from '../auth';

export default function ProtectedRoute({ allowedRoles, children }) {
  const location = useLocation();
  const user = getCurrentUser();

  if (!user) {
    const shouldReturnHome = consumeSessionTimeoutRedirectFlag();
    if (shouldReturnHome) {
      return <Navigate to="/" replace />;
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/forbidden" replace />;
  }

  return children;
}
