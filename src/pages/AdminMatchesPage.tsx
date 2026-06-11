import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { formatInTimeZone } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import type { Match } from '../types/index';

export function AdminMatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // Per-match score inputs: { [matchId]: { home: string; away: string } }
  const [scores, setScores] = useState<Record<string, { home: string; away: string }>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  const tz = localStorage.getItem('fubol_timezone') ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    async function fetchMatches() {
      const { data, error: fetchErr } = await supabase
        .from('matches')
        .select('*')
        .in('status', ['scheduled', 'live'])
        .order('match_datetime');
      if (fetchErr) {
        setError('No se pudieron cargar los partidos.');
      } else {
        setMatches(data ?? []);
        const initial: Record<string, { home: string; away: string }> = {};
        for (const m of data ?? []) {
          initial[m.id] = { home: '', away: '' };
        }
        setScores(initial);
      }
      setLoading(false);
    }
    fetchMatches();
  }, []);

  async function handleSetScore(matchId: string) {
    const s = scores[matchId];
    const home = parseInt(s?.home ?? '', 10);
    const away = parseInt(s?.away ?? '', 10);
    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) {
      setError('Ingresa marcadores válidos (números enteros >= 0).');
      return;
    }
    setSubmitting(matchId);
    setError('');
    setSuccess('');
    const { error: rpcErr } = await supabase.rpc('admin_set_match_result', {
      p_match_id: matchId,
      p_home_score: home,
      p_away_score: away,
    });
    if (rpcErr) {
      setError(
        rpcErr.message === 'not_admin' ? 'No tienes permisos de administrador.' :
        rpcErr.message === 'match_not_found' ? 'Partido no encontrado.' :
        rpcErr.message === 'invalid_score' ? 'Los marcadores deben ser >= 0.' :
        'Error al registrar resultado. Intenta de nuevo.'
      );
    } else {
      setSuccess('Resultado registrado. Los puntos de quiniela se actualizaron automáticamente.');
      setMatches(prev => prev.filter(m => m.id !== matchId));
    }
    setSubmitting(null);
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-900 px-4 py-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold text-slate-100 mb-4">Resultados de Partidos</h1>

      {error && (
        <div role="alert" className="bg-red-900/50 border border-red-700 rounded-lg px-4 py-3 mb-4">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}
      {success && (
        <div role="status" className="bg-green-900/50 border border-green-700 rounded-lg px-4 py-3 mb-4">
          <p className="text-sm text-green-300">{success}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 size={20} className="animate-spin" />
          <span>Cargando partidos...</span>
        </div>
      ) : matches.length === 0 ? (
        <p className="text-slate-400">No hay partidos pendientes de resultado.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {matches.map(match => (
            <div key={match.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-100 text-sm font-bold">
                  {match.home_team} vs {match.away_team}
                </span>
                <span className="text-xs text-slate-400">
                  {formatInTimeZone(new Date(match.match_datetime), tz, "d MMM · HH:mm zzz", { locale: es })}
                </span>
                <span className={`text-xs font-medium ${match.status === 'live' ? 'text-green-400' : 'text-slate-400'}`}>
                  {match.status === 'live' ? 'EN VIVO' : 'Programado'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="99"
                  step="1"
                  value={scores[match.id]?.home ?? ''}
                  onChange={e =>
                    setScores(prev => ({
                      ...prev,
                      [match.id]: { ...prev[match.id], home: e.target.value },
                    }))
                  }
                  placeholder="0"
                  className="w-16 bg-slate-700 border border-slate-600 rounded-lg px-2 py-2 text-center text-slate-100 text-sm focus:outline-none focus:border-green-500 min-h-[44px]"
                />
                <span className="text-slate-400">–</span>
                <input
                  type="number"
                  min="0"
                  max="99"
                  step="1"
                  value={scores[match.id]?.away ?? ''}
                  onChange={e =>
                    setScores(prev => ({
                      ...prev,
                      [match.id]: { ...prev[match.id], away: e.target.value },
                    }))
                  }
                  placeholder="0"
                  className="w-16 bg-slate-700 border border-slate-600 rounded-lg px-2 py-2 text-center text-slate-100 text-sm focus:outline-none focus:border-green-500 min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => handleSetScore(match.id)}
                  disabled={submitting === match.id}
                  className="ml-2 min-h-[44px] px-4 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold text-sm rounded-lg flex items-center gap-1"
                >
                  {submitting === match.id
                    ? <Loader2 size={16} className="animate-spin" />
                    : 'Registrar'
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-500 mt-4">Los partidos finalizados no aparecen aquí.</p>
    </div>
  );
}
