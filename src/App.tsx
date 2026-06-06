import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { useAuthStore } from './store/authStore';
import { HomePage } from './pages/HomePage';

export function App() {
  const { setUser, setProfile, setLoading, loading } = useAuthStore();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email! });
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
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
    return (
      <div
        className="min-h-screen bg-slate-900 flex items-center justify-center"
        role="status"
        aria-label="Cargando…"
      >
        <div className="w-10 h-10 rounded-full border-4 border-green-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Plan 01-01: single route to prove the DB-read path.
            ProtectedRoute, Navbar, and auth pages are added in plan 01-02. */}
        <Route path="/bienvenido" element={<HomePage />} />
        <Route path="/" element={<Navigate to="/bienvenido" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
