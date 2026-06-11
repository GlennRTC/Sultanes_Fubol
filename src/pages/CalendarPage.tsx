import { useState, useEffect } from 'react';
import { toZonedTime, format } from 'date-fns-tz';
import { format as dateFnsFormat } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { MatchCard } from '../components/MatchCard';
import { PredictionModal } from '../components/PredictionModal';
import { TimezonePicker, detectTimezone, saveTimezone, SUPPORTED_TIMEZONES } from '../components/TimezonePicker';
import type { Match, Prediction } from '../types/index';

// WC 2026 has 12 groups A–L (verified: RESEARCH.md critical count correction)
const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

// Group matches by LOCAL date key (Pitfall 2 — never substring the UTC string)
function groupMatchesByLocalDate(matches: Match[], timezone: string): Map<string, Match[]> {
  const map = new Map<string, Match[]>();
  for (const match of matches) {
    const zonedDate = toZonedTime(new Date(match.match_datetime), timezone);
    const dateKey = format(zonedDate, 'yyyy-MM-dd', { timeZone: timezone });
    const existing = map.get(dateKey);
    if (existing) {
      existing.push(match);
    } else {
      map.set(dateKey, [match]);
    }
  }
  return map;
}

// Format a yyyy-MM-dd key as "12 de junio" in Spanish
function formatDateHeader(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return dateFnsFormat(date, "d 'de' MMMM", { locale: es });
}

export function CalendarPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [timezone, setTimezone] = useState<string>(() => detectTimezone());
  const [showTimezonePicker, setShowTimezonePicker] = useState(false);

  const [view, setView] = useState<'fecha' | 'grupo'>('fecha');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [activeGroup, setActiveGroup] = useState('A');

  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  // Fetch matches and predictions in parallel on mount (ANTI-PATTERN: never fetch in child — always at page level)
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [
        { data: matchData, error: matchError },
        { data: predData, error: predError },
      ] = await Promise.all([
        supabase.from('matches').select('*').order('match_datetime'),
        supabase.from('predictions').select('*'),
      ]);
      if (matchError) {
        setError('No se pudieron cargar los partidos. Recarga la página.');
        setLoading(false);
        return;
      }
      setMatches(matchData ?? []);
      if (predError) {
        console.warn('predictions fetch failed:', predError.message);
      }
      setPredictions(predData ?? []);
      setLoading(false);
    }
    fetchData();
  }, []);

  // Timezone bar display name
  const timezoneLabel = SUPPORTED_TIMEZONES.find((t) => t.iana === timezone)?.label ?? timezone;

  // Derive unique sorted team names for the Equipo filter
  const allTeamNames = Array.from(
    new Set(matches.flatMap((m) => [m.home_team, m.away_team]))
  ).sort((a, b) => a.localeCompare(b, 'es'));

  // Client-side filtering (Por fecha view)
  const filteredMatches = matches.filter((m) => {
    if (filterGroup && m.group_name !== filterGroup) return false;
    if (filterTeam && m.home_team !== filterTeam && m.away_team !== filterTeam) return false;
    return true;
  });

  // Lookup helpers
  function getPredictionForMatch(matchId: string): Prediction | undefined {
    return predictions.find((p) => p.match_id === matchId);
  }

  // After a successful prediction submission, add to local state immediately (D-08)
  function handlePredictionSuccess(p: { home_score_prediction: number; away_score_prediction: number }) {
    if (!selectedMatch) return;
    const newPrediction: Prediction = {
      id: `local-${Date.now()}`,
      user_id: '',
      match_id: selectedMatch.id,
      home_score_prediction: p.home_score_prediction,
      away_score_prediction: p.away_score_prediction,
      tokens_wagered: 20,
      tokens_awarded: null,
      points_earned: null,
      created_at: new Date().toISOString(),
    };
    setPredictions((prev) => [...prev, newPrediction]);
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-900 px-4 py-6">
      <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-slate-100 mb-4">Calendario</h1>

      {/* Timezone bar (D-14, D-15) */}
      <p className="text-sm text-slate-400 mb-4">
        Zona: {timezoneLabel} ·{' '}
        <button
          type="button"
          onClick={() => setShowTimezonePicker(true)}
          className="text-green-400 hover:text-green-300 underline text-sm"
        >
          Cambiar
        </button>
      </p>

      {/* Timezone picker modal */}
      {showTimezonePicker && (
        <TimezonePicker
          current={timezone}
          onSelect={(iana) => {
            saveTimezone(iana);
            setTimezone(iana);
          }}
          onClose={() => setShowTimezonePicker(false)}
        />
      )}

      {/* View toggle (D-01) */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setView('fecha')}
          className={`px-4 py-2 rounded-lg text-sm min-h-[44px] ${
            view === 'fecha'
              ? 'bg-slate-700 text-slate-100 font-bold'
              : 'bg-transparent text-slate-400 hover:text-slate-100'
          }`}
        >
          Por fecha
        </button>
        <button
          type="button"
          onClick={() => setView('grupo')}
          className={`px-4 py-2 rounded-lg text-sm min-h-[44px] ${
            view === 'grupo'
              ? 'bg-slate-700 text-slate-100 font-bold'
              : 'bg-transparent text-slate-400 hover:text-slate-100'
          }`}
        >
          Por grupo
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <span className="inline-block w-8 h-8 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div role="alert" className="bg-red-900/50 border border-red-700 rounded-lg px-4 py-3 mb-4">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Por fecha view */}
          {view === 'fecha' && (
            <>
              {/* Filter bar (D-03) */}
              <div className="flex gap-2 mb-4 flex-wrap">
                <select
                  value={filterGroup}
                  onChange={(e) => { setFilterGroup(e.target.value); setFilterTeam(''); }}
                  className="flex-1 min-w-[140px] bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 min-h-[44px] focus:outline-none focus:border-green-500"
                  aria-label="Grupo:"
                >
                  <option value="">Grupo: Todos</option>
                  {GROUPS.map((g) => (
                    <option key={g} value={g}>Grupo {g}</option>
                  ))}
                </select>
                <select
                  value={filterTeam}
                  onChange={(e) => setFilterTeam(e.target.value)}
                  className="flex-1 min-w-[140px] bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 min-h-[44px] focus:outline-none focus:border-green-500"
                  aria-label="Equipo:"
                >
                  <option value="">Equipo: Todos</option>
                  {allTeamNames.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              {/* Date-grouped matches (Pitfall 2 — group by LOCAL date, not UTC string) */}
              {filteredMatches.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-slate-100 font-bold mb-2">Sin partidos</p>
                  <p className="text-sm text-slate-400">
                    Ningún partido coincide con los filtros seleccionados. Selecciona «Todos» para ver todos.
                  </p>
                </div>
              ) : (
                Array.from(groupMatchesByLocalDate(filteredMatches, timezone)).map(([dateKey, dayMatches]) => (
                  <div key={dateKey}>
                    <h2 className="text-sm font-bold text-slate-300 mt-6 mb-2 uppercase tracking-wide">
                      {formatDateHeader(dateKey)}
                    </h2>
                    {dayMatches.map((m) => (
                      <MatchCard
                        key={m.id}
                        match={m}
                        prediction={getPredictionForMatch(m.id)}
                        timezone={timezone}
                        onCardClick={setSelectedMatch}
                      />
                    ))}
                  </div>
                ))
              )}
            </>
          )}

          {/* Por grupo view — 12 group tabs A–L (RESEARCH: WC2026 = 12 groups) */}
          {view === 'grupo' && (
            <>
              {/* Group tab row */}
              <div className="flex gap-1 overflow-x-auto mb-4">
                {GROUPS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setActiveGroup(g)}
                    className={`px-4 py-2 rounded-lg text-sm min-h-[44px] whitespace-nowrap shrink-0 ${
                      activeGroup === g
                        ? 'bg-slate-700 text-slate-100 font-bold'
                        : 'bg-transparent text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    Grupo {g}
                  </button>
                ))}
              </div>

              {/* Active group's matches */}
              {matches
                .filter((m) => m.group_name === activeGroup)
                .map((m) => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    prediction={getPredictionForMatch(m.id)}
                    timezone={timezone}
                    onCardClick={setSelectedMatch}
                  />
                ))}
            </>
          )}
        </>
      )}

      </div>{/* end max-w-3xl */}

      {/* Prediction modal (D-05) */}
      {selectedMatch && (
        <PredictionModal
          match={selectedMatch}
          existingPrediction={getPredictionForMatch(selectedMatch.id)}
          timezone={timezone}
          onClose={() => setSelectedMatch(null)}
          onSuccess={handlePredictionSuccess}
        />
      )}
    </div>
  );
}
