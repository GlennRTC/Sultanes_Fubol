import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

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

const features = [
  {
    icon: '🎯',
    title: 'Predice marcadores',
    desc: 'Adivina el resultado exacto de cada partido antes del pitazo. ¡Cada acierto suma puntos y llena tu billetera de fichas!',
  },
  {
    icon: '🎰',
    title: 'Apuestas parimutuel',
    desc: 'Elige al ganador en los pools de apuestas. Si aciertas, te repartes las fichas de todos los que se equivocaron.',
  },
  {
    icon: '🏆',
    title: 'Escala la tabla',
    desc: 'Acumula puntos y fichas para coronarte Sultán del Fútbol entre tus cuates. ¡El que más sabe, más gana!',
  },
];

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/calendario';
  const passwordReset = (location.state as { passwordReset?: boolean })?.passwordReset === true;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate('/calendario', { replace: true });
  }, [user, navigate]);

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
      navigate(from, { replace: true });
    }
  }

  return (
    <div className="login-bg min-h-screen flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-8 lg:gap-14 lg:items-center">

        {/* ── Left column: hero + form ── */}
        <div className="w-full lg:max-w-[420px] flex flex-col gap-6">

          {/* Hero brand */}
          <div className="text-center animate-fade-down">
            <span className="text-5xl inline-block animate-float select-none" aria-hidden="true">
              ⚽
            </span>
            <h1
              className="text-5xl lg:text-6xl text-white tracking-wide leading-tight brand-glow mt-1"
              style={{ fontFamily: "'Bangers', cursive" }}
            >
              Sultanes Del FUBOL
            </h1>
            <p className="text-green-400 text-xs tracking-[0.25em] uppercase mt-2 font-medium">
              Copa Mundial 2026
            </p>
          </div>

          {/* Login form card */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-7 animate-fade-up">
            <h2 className="text-lg font-bold text-slate-100 mb-5">Iniciar sesión</h2>

            {passwordReset && (
              <div role="alert" className="bg-green-900/50 border border-green-700 rounded-lg px-4 py-3 mb-4">
                <p className="text-sm text-green-300">Contraseña actualizada. Puedes iniciar sesión.</p>
              </div>
            )}

            {error && (
              <div role="alert" className="bg-red-900/50 border border-red-700 rounded-lg px-4 py-3 mb-4">
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

              <div className="text-right">
                <Link to="/restablecer-contrasena" className="text-sm text-green-400 hover:text-green-300 underline">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                aria-busy={loading}
                aria-disabled={loading}
                className="w-full bg-green-500 hover:bg-green-600 active:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base px-6 py-3 rounded-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <span className="inline-block w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  </span>
                ) : (
                  'Entrar'
                )}
              </button>
            </form>

            <p className="mt-4 text-sm text-slate-400 text-center">
              ¿No tienes cuenta?{' '}
              <Link to="/registro" className="text-green-400 hover:text-green-300 underline">
                Regístrate
              </Link>
            </p>
          </div>
        </div>

        {/* ── Right column: info card ── */}
        <div className="w-full lg:flex-1 animate-fade-up-delay">
          <div className="bg-slate-800/70 border border-green-500/25 rounded-2xl p-7 lg:p-9">

            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl" aria-hidden="true">🏆</span>
              <h2 className="text-xl font-bold text-white">Tu quiniela del Mundial 2026</h2>
            </div>

            <p className="text-slate-300 text-sm leading-relaxed mb-6">
              Bienvenido a la competencia más épica de tu grupo.{' '}
              <span className="text-green-400 font-medium">Predice, apuesta y demuestra</span>{' '}
              que sabes más de fútbol que nadie — todo en un solo lugar, gratis y en español.
            </p>

            <ul className="flex flex-col gap-5 mb-7">
              {features.map((f) => (
                <li key={f.title} className="flex gap-4">
                  <span className="text-2xl shrink-0 mt-0.5" aria-hidden="true">{f.icon}</span>
                  <div>
                    <p className="text-slate-100 font-semibold text-sm mb-0.5">{f.title}</p>
                    <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-slate-700 pt-5">
              <p className="text-slate-400 text-xs leading-relaxed">
                💡{' '}
                <span className="text-slate-300">
                  El admin reparte fichas al inicio de la competencia.
                </span>{' '}
                Adminístralas bien — son tu munición para todo el torneo.{' '}
                <span className="text-green-400 font-medium">¡Que empiece el Mundial! 🔥</span>
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
