import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { FullScreenSpinner } from './FullScreenSpinner';

// Auth guard for protected routes.
// - While auth session is resolving: shows full-screen spinner (D-10)
// - If no user: redirects to /login preserving the intended URL in state.from (D-02, D-09)
// - If user exists but profile is null: orphaned account — show contact-admin message
// - If blocked: redirects to /login (WR-02: is_blocked must be enforced on the frontend)
// - If authenticated and not blocked: renders children via <Outlet />
export function ProtectedRoute() {
  const { user, profile, loading, signOut } = useAuthStore();
  const location = useLocation();

  if (loading) return <FullScreenSpinner />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (user && !profile) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-zinc-300 text-sm text-center max-w-xs">
          Tu cuenta existe pero no tiene perfil asociado. Contacta al administrador para activarla.
        </p>
        <button
          onClick={signOut}
          className="text-sm text-emerald-400 hover:text-emerald-300 underline"
        >
          Cerrar sesión
        </button>
      </div>
    );
  }
  if (profile?.is_blocked) return <Navigate to="/login" replace />;
  return <Outlet />;
}
