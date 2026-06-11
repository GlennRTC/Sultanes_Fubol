import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
// Username validation constants (D-05, D-08)
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
const USERNAME_MIN = 3;
const USERNAME_MAX = 20;

function validateUsername(value: string): string {
  if (value.length < USERNAME_MIN) {
    return 'El nombre de usuario debe tener al menos 3 caracteres.';
  }
  if (value.length > USERNAME_MAX) {
    return 'El nombre de usuario no puede tener más de 20 caracteres.';
  }
  if (!USERNAME_REGEX.test(value)) {
    return 'Solo se permiten letras, números y guión bajo (_).';
  }
  return '';
}

function validatePassword(value: string): string {
  if (value.length < 6) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }
  return '';
}

export function RegistroPage() {
  const navigate = useNavigate();
  const { user, setProfile } = useAuthStore();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);

  // D-11: redirect already-authenticated users away from /registro to /calendario.
  // Guard with !loading so we don't redirect mid-registration: signUp auto-signs in the
  // user (when email confirmation is OFF), which sets `user` before the profile INSERT runs.
  useEffect(() => {
    if (user && !loading) {
      navigate('/calendario', { replace: true });
    }
  }, [user, loading, navigate]);

  // Render nothing during redirect — but only when not mid-registration (loading=true).
  if (user && !loading) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Client-side validation
    const uErr = validateUsername(username);
    const pErr = validatePassword(password);
    setUsernameError(uErr);
    setPasswordError(pErr);
    if (uErr || pErr) return;

    setLoading(true);
    setError('');

    // Step 1: Sign up with Supabase Auth
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });

    if (signUpError) {
      if (
        signUpError.message.includes('already registered') ||
        signUpError.message.includes('User already registered')
      ) {
        setError('Este correo ya está registrado. ¿Olvidaste tu contraseña?');
      } else {
        setError('Algo salió mal. Intenta de nuevo.');
      }
      setLoading(false);
      return;
    }

    if (!data.user) {
      setError('Algo salió mal. Intenta de nuevo.');
      setLoading(false);
      return;
    }

    // Step 2: INSERT profile row (D-07: direct INSERT, no trigger)
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: data.user.id,
        username,
        tokens: 0,
        is_admin: false,
        is_blocked: false,
      });

    if (profileError) {
      // Sign out to clear the orphaned auth session — the auth user still
      // exists in auth.users but at least the next /registro attempt will
      // fail at signUp rather than silently proceeding with no profile row.
      await supabase.auth.signOut();
      if (profileError.code === '23505') {
        // PostgreSQL unique violation on username (D-06)
        setError('Este nombre de usuario ya está en uso. Elige otro.');
      } else {
        setError('Algo salió mal al crear tu perfil. Intenta de nuevo.');
      }
      setLoading(false);
      return;
    }

    // Fetch the newly-created profile and hydrate the store so ProtectedRoute sees it.
    // The user is already signed in (signUp auto-signed them in), so this SELECT
    // will satisfy the RLS `auth.uid() = id` policy.
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
    if (profileData) setProfile(profileData);

    navigate('/calendario', { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 w-full max-w-[400px]">
        <h1 className="text-xl font-bold text-slate-100 mb-6">Crear cuenta</h1>

        {/* Form-level error banner */}
        {error && (
          <div
            role="alert"
            className="bg-red-900/50 border border-red-700 rounded-lg px-4 py-3 mb-4"
          >
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username (D-05) */}
          <div>
            <label htmlFor="username" className="block text-sm text-slate-300 mb-1">
              Nombre de usuario
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setUsernameError('');
              }}
              required
              className={`w-full bg-slate-700 border rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 ${
                usernameError ? 'border-red-500' : 'border-slate-600'
              }`}
            />
            <p className="mt-1 text-xs text-slate-400">
              Solo letras, números y guión bajo. No se puede cambiar.
            </p>
            {usernameError && (
              <p className="mt-1 text-xs text-red-400">{usernameError}</p>
            )}
          </div>

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
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError('');
              }}
              required
              className={`w-full bg-slate-700 border rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 ${
                passwordError ? 'border-red-500' : 'border-slate-600'
              }`}
            />
            {passwordError && (
              <p className="mt-1 text-xs text-red-400">{passwordError}</p>
            )}
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
              'Crear cuenta'
            )}
          </button>
        </form>

        {/* Crosslink to /login (D-03) */}
        <p className="mt-4 text-sm text-slate-400 text-center">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-green-400 hover:text-green-300 underline">
            Ingresa
          </Link>
        </p>
      </div>
    </div>
  );
}
