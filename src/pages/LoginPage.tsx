import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

// Spanish error map over Supabase English strings (canonical map per PATTERNS)
const errorMap: Record<string, string> = {
  'Invalid login credentials': 'Correo o contraseña incorrectos. Intenta de nuevo.',
  'Email not confirmed': 'Confirma tu correo antes de ingresar.',
  'User already registered': 'Este correo ya está registrado. ¿Olvidaste tu contraseña?',
};

function mapError(msg: string): string {
  for (const [key, value] of Object.entries(errorMap)) {
    if (msg.includes(key)) return value;
  }
  return 'Algo salió mal. Intenta de nuevo.';
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();

  // D-09: navigate to intended URL after login, default /calendario
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/calendario';

  // Check if arriving from a completed password reset (D-04)
  const passwordReset = (location.state as { passwordReset?: boolean })?.passwordReset === true;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // D-11: redirect authenticated users away from /login to /calendario (must be in useEffect, not inline)
  useEffect(() => {
    if (user) {
      navigate('/calendario', { replace: true });
    }
  }, [user, navigate]);

  // Render nothing during redirect
  if (user) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError(mapError(authError.message));
      setLoading(false);
    } else {
      navigate(from, { replace: true }); // D-09
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 w-full max-w-[400px]">
        <h1 className="text-xl font-bold text-slate-100 mb-6">Iniciar sesión</h1>

        {/* Success banner after password reset (D-04) */}
        {passwordReset && (
          <div
            role="alert"
            className="bg-green-900/50 border border-green-700 rounded-lg px-4 py-3 mb-4"
          >
            <p className="text-sm text-green-300">
              Contraseña actualizada. Puedes iniciar sesión.
            </p>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div
            role="alert"
            className="bg-red-900/50 border border-red-700 rounded-lg px-4 py-3 mb-4"
          >
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm text-slate-300 mb-1">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm text-slate-300 mb-1">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
            />
          </div>

          {/* Forgot password */}
          <div className="text-right">
            <Link
              to="/restablecer-contrasena"
              className="text-sm text-green-400 hover:text-green-300 underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            aria-disabled={loading}
            className="w-full bg-green-500 hover:bg-green-600 active:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base px-6 py-3 rounded-lg"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              </span>
            ) : (
              'Iniciar sesión'
            )}
          </button>
        </form>

        {/* Crosslink to /registro (D-03) */}
        <p className="mt-4 text-sm text-slate-400 text-center">
          ¿No tienes cuenta?{' '}
          <Link to="/registro" className="text-green-400 hover:text-green-300 underline">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
}
