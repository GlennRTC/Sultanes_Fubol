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

  // Create match form
  const [homeTeam, setHomeTeam] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [groupLabel, setGroupLabel] = useState('');
  const [matchDatetime, setMatchDatetime] = useState(''); // datetime-local string (local time)
  const [venue, setVenue] = useState('');
  const [creating, setCreating] = useState(false);

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

  async function handleCreateMatch(e: React.FormEvent) {
    e.preventDefault();
    if (!homeTeam.trim() || !awayTeam.trim()) {
      setError('Ingresa ambos equipos.');
      return;
    }
    if (!groupLabel.trim()) {
      setError('Ingresa el grupo o ronda.');
      return;
    }
    if (!matchDatetime) {
      setError('Ingresa la fecha y hora del partido.');
      return;
    }
    // Convert datetime-local (local time) to UTC ISO string for the DB
    const matchDatetimeUtc = new Date(matchDatetime).toISOString();
    setCreating(true);
    setError('');
    setSuccess('');
    const { data: newMatchId, error: rpcErr } = await supabase.rpc('admin_create_match', {
      p_home_team: homeTeam.trim(),
      p_away_team: awayTeam.trim(),
      p_group_name: groupLabel.trim(),
      p_match_datetime: matchDatetimeUtc,
      p_venue: venue.trim() || null,
    });
    if (rpcErr) {
      setError(
        rpcErr.message === 'not_admin' ? 'No tienes permisos de administrador.' :
        rpcErr.message === 'invalid_teams' ? 'Ingresa ambos equipos.' :
        rpcErr.message === 'not_authenticated' ? 'Tu sesión expiró. Inicia sesión de nuevo.' :
        'Error al crear partido. Intenta de nuevo.'
      );
    } else {
      setSuccess('Partido creado correctamente.');
      const newMatch: Match = {
        id: newMatchId as string,
        home_team: homeTeam.trim(),
        away_team: awayTeam.trim(),
        group_name: groupLabel.trim(),
        match_datetime: matchDatetimeUtc,
        status: 'scheduled',
        home_score: null,
        away_score: null,
        venue: venue.trim() || null,
      };
      setMatches(prev => [newMatch, ...prev]);
      setScores(prev => ({ ...prev, [newMatch.id]: { home: '', away: '' } }));
      setHomeTeam('');
      setAwayTeam('');
      setGroupLabel('');
      setMatchDatetime('');
      setVenue('');
    }
    setCreating(false);
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-zinc-950 px-4 py-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold text-zinc-100 mb-4">Gestión de Partidos</h1>

      {error && (
        <div role="alert" className="bg-red-900/50 border border-red-700 rounded-lg px-4 py-3 mb-4">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}
      {success && (
        <div role="status" className="bg-emerald-950/80 border border-emerald-700/50 rounded-lg px-4 py-3 mb-4">
          <p className="text-sm text-emerald-300">{success}</p>
        </div>
      )}

      {/* SECTION 1 — Create Match */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 mb-6">
        <h2 className="text-base font-bold text-zinc-100 mb-4">Crear partido</h2>
        <form onSubmit={handleCreateMatch} className="flex flex-col gap-3">
          {/* Home team */}
          <input
            type="text"
            placeholder="Equipo local"
            value={homeTeam}
            onChange={e => setHomeTeam(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 min-h-[44px] focus:outline-none focus:border-emerald-500"
          />

          {/* Away team */}
          <input
            type="text"
            placeholder="Equipo visitante"
            value={awayTeam}
            onChange={e => setAwayTeam(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 min-h-[44px] focus:outline-none focus:border-emerald-500"
          />

          {/* Group/round label */}
          <div>
            <input
              type="text"
              placeholder="Grupo o ronda"
              value={groupLabel}
              onChange={e => setGroupLabel(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 min-h-[44px] focus:outline-none focus:border-emerald-500"
            />
            <p className="text-xs text-zinc-500 mt-1">A–L para grupos, o R16/QF/SF/F para eliminatorias</p>
          </div>

          {/* Datetime */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Fecha y hora</label>
            <input
              type="datetime-local"
              value={matchDatetime}
              onChange={e => setMatchDatetime(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 min-h-[44px] focus:outline-none focus:border-emerald-500"
            />
            <p className="text-xs text-zinc-500 mt-1">Hora local. Se guardará en UTC.</p>
          </div>

          {/* Venue (optional) */}
          <input
            type="text"
            placeholder="Sede (opcional)"
            value={venue}
            onChange={e => setVenue(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 min-h-[44px] focus:outline-none focus:border-emerald-500"
          />

          {/* Submit */}
          <button
            type="submit"
            disabled={creating}
            className="min-h-[44px] w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold rounded-lg flex items-center justify-center gap-2"
          >
            {creating ? <Loader2 size={18} className="animate-spin" /> : 'Crear partido'}
          </button>
        </form>
      </div>

      {/* SECTION 2 — Pending Results */}
      <h2 className="text-base font-bold text-zinc-100 mb-3">Resultados de Partidos</h2>

      {loading ? (
        <div className="flex items-center gap-2 text-zinc-400">
          <Loader2 size={20} className="animate-spin" />
          <span>Cargando partidos...</span>
        </div>
      ) : matches.length === 0 ? (
        <p className="text-zinc-400">No hay partidos pendientes de resultado.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {matches.map(match => (
            <div key={match.id} className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-zinc-100 text-sm font-bold">
                  {match.home_team} vs {match.away_team}
                </span>
                <span className="text-xs text-zinc-400">
                  {formatInTimeZone(new Date(match.match_datetime), tz, "d MMM · HH:mm zzz", { locale: es })}
                </span>
                <span className={`text-xs font-medium ${match.status === 'live' ? 'text-emerald-400' : 'text-zinc-400'}`}>
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
                  className="w-16 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-center text-zinc-100 text-sm focus:outline-none focus:border-emerald-500 min-h-[44px]"
                />
                <span className="text-zinc-400">–</span>
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
                  className="w-16 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-center text-zinc-100 text-sm focus:outline-none focus:border-emerald-500 min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => handleSetScore(match.id)}
                  disabled={submitting === match.id}
                  className="ml-2 min-h-[44px] px-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold text-sm rounded-lg flex items-center gap-1"
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

      <p className="text-xs text-zinc-500 mt-4">Los partidos finalizados no aparecen aquí.</p>
    </div>
  );
}
