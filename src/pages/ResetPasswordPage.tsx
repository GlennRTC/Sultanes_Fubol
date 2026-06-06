import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  // D-11: redirect authenticated users away from reset page to /bienvenido
  useEffect(() => {
    if (user) {
      navigate('/bienvenido', { replace: true });
    }
  }, [user, navigate]);

  // Render nothing during redirect
  if (user) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    // D-04: redirectTo lands on /login; user must log in after resetting — no auto-login
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/login',
    });

    if (resetError) {
      setError('Algo salió mal. Intenta de nuevo.');
      setLoading(false);
      return;
    }

    // Switch to confirmation state (State 2)
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 w-full max-w-[400px]">

        {sent ? (
          /* State 2: Confirmation */
          <>
            <h1 className="text-xl font-bold text-slate-100 mb-4">Revisa tu correo</h1>
            <p className="text-sm text-slate-400">
              Enviamos un enlace a tu correo. Revísalo y sigue las instrucciones.
            </p>
            <p className="mt-6 text-sm text-slate-400 text-center">
              <Link to="/login" className="text-green-400 hover:text-green-300 underline">
                Volver al inicio de sesión
              </Link>
            </p>
          </>
        ) : (
          /* State 1: Email input form */
          <>
            <h1 className="text-xl font-bold text-slate-100 mb-6">Restablecer contraseña</h1>

            {error && (
              <div
                role="alert"
                className="bg-red-900/50 border border-red-700 rounded-lg px-4 py-3 mb-4"
              >
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
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
                  'Enviar enlace'
                )}
              </button>
            </form>

            <p className="mt-4 text-sm text-slate-400 text-center">
              <Link to="/login" className="text-green-400 hover:text-green-300 underline">
                Volver al inicio de sesión
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
