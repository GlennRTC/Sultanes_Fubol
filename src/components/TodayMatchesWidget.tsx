import { useState, useEffect } from 'react';
import { toZonedTime, format } from 'date-fns-tz';
import { supabase } from '../lib/supabase';
import type { Match } from '../types/index';

export function TodayMatchesWidget({ timezone }: { timezone: string }) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<boolean>(() => {
    const stored = localStorage.getItem('fubol_today_widget_open');
    return stored === null ? true : stored === 'true';
  });

  // Initial fetch — today's matches in UTC date range
  useEffect(() => {
    async function fetchTodayMatches() {
      const now = new Date();
      const todayStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0)
      ).toISOString();
      const todayEnd = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59)
      ).toISOString();

      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .gte('match_datetime', todayStart)
        .lte('match_datetime', todayEnd)
        .order('match_datetime');

      if (error) {
        console.error('TodayMatchesWidget fetch error:', error.message);
      } else {
        setMatches(data ?? []);
      }
      setLoading(false);
    }

    fetchTodayMatches();
  }, []);

  // Realtime subscription — UPDATE events on matches table (follows ApuestasPage pattern)
  useEffect(() => {
    const channel = supabase
      .channel('matches-today')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches' },
        (payload) => {
          const updated = payload.new as Match;
          setMatches((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function handleToggle() {
    setOpen((prev) => {
      const next = !prev;
      localStorage.setItem('fubol_today_widget_open', String(next));
      return next;
    });
  }

  function formatMatchTime(match: Match): string {
    const zoned = toZonedTime(new Date(match.match_datetime), timezone);
    return format(zoned, 'HH:mm', { timeZone: timezone });
  }

  // Hidden entirely when no matches today and not loading
  if (!loading && matches.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      {/* Header bar — always visible, toggles collapse */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-slate-800 rounded-t-lg border border-slate-700 cursor-pointer"
        onClick={handleToggle}
        role="button"
        aria-expanded={open}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleToggle(); }}
      >
        <span className="text-sm font-bold text-slate-100">Partidos de hoy</span>
        {/* Chevron rotates 180deg when expanded */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {/* Collapsible body */}
      {open && (
        <div className="border-x border-b border-slate-700 rounded-b-lg overflow-hidden">
          {loading ? (
            /* Loading skeleton */
            <div className="h-24 bg-slate-800 rounded-b-lg animate-pulse border-t border-slate-700" />
          ) : (
            <div className="flex gap-3 overflow-x-auto px-3 py-3">
              {matches.map((match) => (
                <div
                  key={match.id}
                  className="shrink-0 w-40 bg-slate-700 rounded-lg px-3 py-3 flex flex-col gap-1"
                >
                  {/* Status badge */}
                  {match.status === 'live' && (
                    <span className="text-green-400 font-bold text-xs">🟢 EN VIVO</span>
                  )}
                  {match.status === 'finished' && (
                    <span className="text-slate-400 text-xs">✅ FINALIZADO</span>
                  )}
                  {match.status === 'scheduled' && (
                    <span className="text-slate-400 text-xs">⏰ {formatMatchTime(match)}</span>
                  )}

                  {/* Home team */}
                  <p className="text-slate-100 text-sm font-medium truncate">{match.home_team}</p>

                  {/* Score row — only for live or finished */}
                  {match.status === 'live' && (
                    <p className="text-slate-300 font-mono text-sm">? – ?</p>
                  )}
                  {match.status === 'finished' && (
                    <p className="text-slate-100 font-bold font-mono text-sm">
                      {match.home_score} – {match.away_score}
                    </p>
                  )}

                  {/* Away team */}
                  <p className="text-slate-100 text-sm font-medium truncate">{match.away_team}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
