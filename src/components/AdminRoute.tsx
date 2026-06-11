import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { FullScreenSpinner } from './FullScreenSpinner';

// Admin route guard — parallel to ProtectedRoute.
// - While auth session is resolving: shows full-screen spinner
// - If not admin (or unauthenticated — already caught by outer ProtectedRoute): redirects to /calendario
// - If admin: renders children via <Outlet />
// NOTE: This is a UI convenience guard only. Real security is in the SECURITY DEFINER SQL functions.
export function AdminRoute() {
  const { profile, loading } = useAuthStore();
  if (loading) return <FullScreenSpinner />;
  if (!profile?.is_admin) return <Navigate to="/calendario" replace />;
  return <Outlet />;
}
