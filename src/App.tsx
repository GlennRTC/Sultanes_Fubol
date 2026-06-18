import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/authStore';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';
import { Navbar } from './components/Navbar';
import { FullScreenSpinner } from './components/FullScreenSpinner';
import { LoginPage } from './pages/LoginPage';
import { RegistroPage } from './pages/RegistroPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { CalendarPage } from './pages/CalendarPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { ApuestasPage } from './pages/ApuestasPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AdminMatchesPage } from './pages/AdminMatchesPage';
import { AdminPoolsPage } from './pages/AdminPoolsPage';
import { AdminReportsPage } from './pages/AdminReportsPage';

export function App() {
  const { setUser, setProfile, setLoading, setProfileLoading, loading } = useAuthStore();

  // D-10: wire onAuthStateChange — populates Zustand store, fires on page load.
  // Auth state (loading) clears immediately when session is known from localStorage.
  // Profile fetch (profileLoading) is a separate async step so a slow/cold Supabase
  // DB never hangs the whole app at the initial spinner.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email ?? '' });
          // Unblock the UI immediately — auth state is now known.
          setLoading(false);

          // Skip profile fetch if we already have it for this user (avoids double-fetch
          // when onAuthStateChange fires INITIAL_SESSION then TOKEN_REFRESHED).
          const { profile: current } = useAuthStore.getState();
          if (current?.id === session.user.id) return;

          setProfileLoading(true);
          const { data, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          setProfileLoading(false);

          if (!profileError) {
            setProfile(data);
          } else if (profileError.code !== 'PGRST116') {
            // Network / RLS error — do NOT sign out (could be a Supabase cold start).
            // ProtectedRoute handles profile === null with a retry-friendly message.
            console.error('Profile fetch failed:', profileError.message);
          }
          // PGRST116 = no profile row yet (signup race) — leave profile null,
          // ProtectedRoute shows the orphaned-account message without signing out.
        } else {
          setUser(null);
          setProfile(null);
          setProfileLoading(false);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [setUser, setProfile, setLoading, setProfileLoading]);

  // D-10: show full-screen spinner while auth session resolves on page load
  if (loading) {
    return <FullScreenSpinner />;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes — no Navbar */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegistroPage />} />
        <Route path="/restablecer-contrasena" element={<ResetPasswordPage />} />

        {/* Protected routes — wrapped by ProtectedRoute guard */}
        <Route element={<ProtectedRoute />}>
          {/* Layout route: renders Navbar above page content */}
          <Route
            element={
              <>
                <Navbar />
                <main className="min-h-[calc(100vh-56px)] bg-zinc-950">
                  <Outlet />
                </main>
              </>
            }
          >
            <Route path="/calendario" element={<CalendarPage />} />
            <Route path="/tabla" element={<LeaderboardPage />} />
            <Route path="/apuestas" element={<ApuestasPage />} />
            <Route element={<AdminRoute />}>
              <Route path="/admin/usuarios" element={<AdminUsersPage />} />
              <Route path="/admin/partidos" element={<AdminMatchesPage />} />
              <Route path="/admin/apuestas" element={<AdminPoolsPage />} />
              <Route path="/admin/reportes" element={<AdminReportsPage />} />
            </Route>
            <Route path="/" element={<Navigate to="/calendario" replace />} />
            <Route path="/bienvenido" element={<Navigate to="/calendario" replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
