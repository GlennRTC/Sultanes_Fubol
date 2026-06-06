import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { FullScreenSpinner } from './FullScreenSpinner';

// Auth guard for protected routes.
// - While auth session is resolving: shows full-screen spinner (D-10)
// - If no user: redirects to /login preserving the intended URL in state.from (D-02, D-09)
// - If authenticated: renders children via <Outlet />
export function ProtectedRoute() {
  const { user, loading } = useAuthStore();
  const location = useLocation();

  if (loading) return <FullScreenSpinner />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
}
