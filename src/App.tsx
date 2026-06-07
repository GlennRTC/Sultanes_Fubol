import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/authStore';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { FullScreenSpinner } from './components/FullScreenSpinner';
import { LoginPage } from './pages/LoginPage';
import { RegistroPage } from './pages/RegistroPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { CalendarPage } from './pages/CalendarPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { ApuestasPage } from './pages/ApuestasPage';

export function App() {
  const { setUser, setProfile, setLoading, loading } = useAuthStore();

  // D-10: wire onAuthStateChange — populates Zustand store, fires on page load
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email ?? '' });
          const { data, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          if (profileError) {
            // Profile fetch failed (RLS misconfiguration, network error, cold-start timeout).
            // Sign out to avoid an authenticated-but-profileless state where Navbar shows
            // empty username and ApuestasPage proceeds with a null profile in the store.
            // The user will be redirected to /login and can retry immediately (WR-05).
            console.error('Profile fetch failed:', profileError.message);
            await supabase.auth.signOut();
            return;
          }
          setProfile(data);
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [setUser, setProfile, setLoading]);

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
                <main className="min-h-[calc(100vh-56px)] bg-slate-900">
                  <Outlet />
                </main>
              </>
            }
          >
            <Route path="/calendario" element={<CalendarPage />} />
            <Route path="/tabla" element={<LeaderboardPage />} />
            <Route path="/apuestas" element={<ApuestasPage />} />
            <Route path="/" element={<Navigate to="/calendario" replace />} />
            <Route path="/bienvenido" element={<Navigate to="/calendario" replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
