import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { LeaderboardEntry } from '../types/index';

export function AdminReportsPage() {
  const [circulacion, setCirculacion] = useState<number | null>(null);
  const [totalGranted, setTotalGranted] = useState<number | null>(null);
  const [activeUsers, setActiveUsers] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchReports() {
      // Parallel fetch — separate queries to avoid Pitfall 5 double-counting
      const [profilesRes, txRes, lbRes] = await Promise.all([
        supabase.from('profiles').select('tokens, id'),
        supabase
          .from('token_transactions')
          .select('amount, type')
          .eq('type', 'admin_grant'),
        supabase
          .rpc('get_leaderboard'),
      ]);

      if (profilesRes.error) {
        setError('No se pudo cargar el reporte de fichas.');
      } else {
        const profData = profilesRes.data ?? [];
        const total = profData.reduce((sum, p) => sum + (p.tokens ?? 0), 0);
        setCirculacion(total);
        setActiveUsers(profData.filter(p => (p.tokens ?? 0) > 0).length);
      }

      // token_transactions SELECT is admin-only (token_transactions_select_admin policy).
      // If txRes.error, show 'N/A' for the granted stat rather than blocking the whole page.
      if (!txRes.error) {
        const granted = (txRes.data ?? [])
          .filter(t => t.type === 'admin_grant' && t.amount > 0)
          .reduce((sum, t) => sum + t.amount, 0);
        setTotalGranted(granted);
      }

      if (!lbRes.error) {
        setLeaderboard((lbRes.data ?? []) as LeaderboardEntry[]);
      }

      setLoading(false);
    }

    fetchReports();
  }, []);

  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-900 px-4 py-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold text-slate-100 mb-6">Reportes</h1>

      {error && (
        <div role="alert" className="bg-red-900/50 border border-red-700 rounded-lg px-4 py-3 mb-4">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 size={20} className="animate-spin" />
          <span>Cargando reportes...</span>
        </div>
      ) : (
        <>
          {/* SECTION 1 — Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {/* Card 1: Fichas en circulación (SUM profiles.tokens — current balances) */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-green-400">
                {circulacion !== null ? circulacion.toLocaleString('es') : '—'}
              </p>
              <p className="text-sm text-slate-100 mt-1">Fichas en circulación</p>
              <p className="text-xs text-slate-400 mt-1">Total en cuentas de usuarios</p>
            </div>

            {/* Card 2: Total fichas otorgadas por admin (SUM admin_grant positives only) */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-green-400">
                {totalGranted !== null ? totalGranted.toLocaleString('es') : '—'}
              </p>
              <p className="text-sm text-slate-100 mt-1">Total otorgadas por admin</p>
              <p className="text-xs text-slate-400 mt-1">Suma de otorgamientos de administrador</p>
            </div>

            {/* Card 3: Usuarios activos (COUNT profiles WHERE tokens > 0) */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-2xl font-bold text-green-400">
                {activeUsers !== null ? activeUsers : '—'}
              </p>
              <p className="text-sm text-slate-100 mt-1">Usuarios activos</p>
              <p className="text-xs text-slate-400 mt-1">Con más de 0 fichas en cuenta</p>
            </div>
          </div>

          {/* SECTION 2 — Leaderboard table */}
          <h2 className="text-base font-bold text-slate-100 mb-3">Top Predictores</h2>
          {leaderboard.length === 0 ? (
            <p className="text-slate-400 text-sm">Sin datos de tabla.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-xs text-slate-400 font-medium py-2 pr-4 text-left w-8">#</th>
                    <th className="text-xs text-slate-400 font-medium py-2 pr-4 text-left">Usuario</th>
                    <th className="text-xs text-slate-400 font-medium py-2 pr-4 text-left">Puntos</th>
                    <th className="text-xs text-slate-400 font-medium py-2 text-left">Fichas</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, i) => (
                    <tr key={entry.id} className="border-t border-slate-700">
                      <td className="text-slate-400 w-8 py-2 pr-4">{i + 1}</td>
                      <td className="text-slate-100 py-2 pr-4">{entry.username}</td>
                      <td className="text-green-400 py-2 pr-4">{entry.leaderboard_points}</td>
                      <td className="text-slate-300 py-2">{entry.tokens}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
