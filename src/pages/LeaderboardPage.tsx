import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { LeaderboardEntry } from '../types/index';

export function LeaderboardPage() {
  const { user } = useAuthStore();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true);
      setError('');
      const { data, error: fetchError } = await supabase
        .from('leaderboard_view')
        .select('id, username, tokens, leaderboard_points')
        .order('leaderboard_points', { ascending: false })
        .limit(100);
      if (fetchError) {
        setError('No se pudo cargar la tabla. Recarga la página.');
      } else {
        setEntries(data ?? []);
      }
      setLoading(false);
    }
    fetchLeaderboard();
  }, []);

  // Determine whether all entries have zero points (empty-state condition)
  const hasScores = entries.some((e) => e.leaderboard_points > 0);

  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-900 px-4 py-6">
      <h1 className="text-xl font-bold text-slate-100 mb-4">Tabla de posiciones</h1>

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="bg-red-900/50 border border-red-700 rounded-lg px-4 py-3 mb-4"
        >
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <span className="inline-block w-6 h-6 rounded-full border-2 border-green-500 border-t-transparent animate-spin" />
        </div>
      )}

      {/* Loaded state */}
      {!loading && !error && (
        <>
          {entries.length === 0 || !hasScores ? (
            /* Empty state */
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
              <h2 className="text-base font-bold text-slate-100 mb-2">
                Aún no hay puntos registrados
              </h2>
              <p className="text-sm text-slate-400">
                Los puntos se actualizan cuando el administrador ingresa los resultados de los partidos.
              </p>
            </div>
          ) : (
            /* Leaderboard table */
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              {/* Header row */}
              <div className="flex items-center px-4 py-2 text-sm font-bold text-slate-300 border-b border-slate-700 bg-slate-800">
                <span className="w-8">#</span>
                <span className="flex-1">Usuario</span>
                <span className="w-20 text-right">Puntos</span>
                <span className="w-20 text-right">Fichas</span>
              </div>

              {/* Data rows */}
              {entries.map((entry, index) => {
                const isOwnRow = user?.id === entry.id;
                return (
                  <div
                    key={entry.id}
                    className={`flex items-center px-4 py-3 text-base text-slate-100 border-b border-slate-700 last:border-b-0 hover:bg-slate-700/30 ${
                      isOwnRow ? 'bg-slate-700/50' : ''
                    }`}
                  >
                    <span className="w-8 text-sm text-slate-400">{index + 1}</span>
                    <span className="flex-1 text-slate-100">{entry.username}</span>
                    <span className="w-20 text-right text-slate-100 font-bold">
                      {entry.leaderboard_points}
                    </span>
                    <span className="w-20 text-right text-slate-400">{entry.tokens}</span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
