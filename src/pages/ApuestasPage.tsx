import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { PoolCard } from '../components/PoolCard';
import { BetModal } from '../components/BetModal';
import { FullScreenSpinner } from '../components/FullScreenSpinner';
import type { BetPool, Bet, PoolOptionTotal } from '../types/index';

export function ApuestasPage() {
  const [pools, setPools] = useState<BetPool[]>([]);
  const [bets, setBets] = useState<Bet[]>([]);
  const [betTotals, setBetTotals] = useState<Record<string, Record<string, number>>>({});
  // Shape: { [pool_id]: { [option_id]: tokens_total } }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPool, setSelectedPool] = useState<BetPool | null>(null);

  const { user } = useAuthStore();

  // Initial data fetch (parallel — mirrors CalendarPage lines 54-77)
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [poolResult, betResult, totalsResult] = await Promise.all([
        supabase.from('bet_pools').select('*, pool_options!pool_options_pool_id_fkey(*)').order('deadline'),
        supabase.from('bets').select('*').eq('user_id', user!.id),
        supabase.from('pool_option_totals').select('*'),
      ]);

      if (poolResult.error) {
        setError('No se pudieron cargar las apuestas. Recarga la página.');
        setLoading(false);
        return;
      }

      // Cast required: Supabase client type for nested select doesn't reflect the join
      // because the Database type doesn't declare bet_pools→pool_options relationship.
      // The runtime data shape matches BetPool (with pool_options embedded).
      setPools((poolResult.data ?? []) as unknown as BetPool[]);

      if (betResult.error) {
        // Treat as non-recoverable: if bet history is missing, getBetForPool()
        // returns undefined for every pool and BetModal opens in editable mode
        // even for pools the user already bet on — the DB unique constraint would
        // then reject the attempt with a confusing "Ya tienes una apuesta" error.
        setError('No se pudo cargar tu historial de apuestas. Recarga la página.');
        setLoading(false);
        return;
      }
      setBets(betResult.data ?? []);

      // Build initial betTotals map from pool_option_totals view
      const initialTotals: Record<string, Record<string, number>> = {};
      for (const row of (totalsResult.data ?? []) as PoolOptionTotal[]) {
        if (!initialTotals[row.pool_id]) initialTotals[row.pool_id] = {};
        initialTotals[row.pool_id][row.option_id] = row.tokens_total;
      }
      setBetTotals(initialTotals);

      setLoading(false);
    }
    fetchData();
  }, [user]);

  // Realtime subscription (RESEARCH.md Pattern 3, Pitfall 1 + 7)
  useEffect(() => {
    const channel = supabase
      .channel('bets-all')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bets' },
        (payload) => {
          const newBet = payload.new as {
            pool_id: string;
            option_id: string;
            tokens_wagered: number;
          };
          setBetTotals((prev) => {
            const updated = { ...prev };
            const poolTotals = { ...(updated[newBet.pool_id] ?? {}) };
            poolTotals[newBet.option_id] =
              (poolTotals[newBet.option_id] ?? 0) + newBet.tokens_wagered;
            updated[newBet.pool_id] = poolTotals;
            return updated;
          });
        }
      )
      .subscribe();

    // Pitfall 7: cleanup on unmount (T-03-11)
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Optimistic badge update after successful bet (RESEARCH.md Pattern 5)
  function handleBetSuccess({ optionId, amount }: { optionId: string; amount: number }) {
    if (!selectedPool) return;
    const newBet: Bet = {
      id: 'local-' + Date.now(),
      user_id: user!.id,
      pool_id: selectedPool.id,
      option_id: optionId,
      tokens_wagered: amount,
      tokens_won: null,
      created_at: new Date().toISOString(),
    };
    setBets((prev) => [...prev, newBet]);
    // updateTokens is called inside BetModal.handleConfirm on success (not here — avoids double call)
  }

  function getBetForPool(poolId: string): Bet | undefined {
    return bets.find((b) => b.pool_id === poolId);
  }

  function getFlatTotals(poolId: string): Record<string, number> {
    return betTotals[poolId] ?? {};
  }

  // Derived arrays — "Activas" includes open AND closed; "Cerradas" includes resolved (D-09)
  const activePools = pools.filter((p) => p.status === 'open' || p.status === 'closed');
  const closedPools = pools.filter((p) => p.status === 'resolved');

  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-900 px-4 py-6">
      <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-slate-100 mb-4">Apuestas</h1>

      {loading && <FullScreenSpinner />}

      {error && (
        <div role="alert" className="bg-red-900/50 border border-red-700 rounded-lg px-4 py-3 mb-4">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* ACTIVAS SECTION */}
          {activePools.length === 0 ? (
            <div>
              <p className="text-base text-slate-400 font-bold mb-1">Sin apuestas activas</p>
              <p className="text-sm text-slate-400">
                El administrador no ha creado ninguna apuesta abierta todavía.
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-sm font-bold text-slate-300 mt-2 mb-3 uppercase tracking-wide">
                Activas
              </h2>
              {activePools.map((pool) => (
                <PoolCard
                  key={pool.id}
                  pool={pool}
                  userBet={getBetForPool(pool.id)}
                  betTotals={getFlatTotals(pool.id)}
                  onOpen={setSelectedPool}
                />
              ))}
            </>
          )}

          {/* CERRADAS SECTION — hidden when empty (UI-SPEC: "section is simply hidden if empty") */}
          {closedPools.length > 0 && (
            <>
              <h2 className="text-sm font-bold text-slate-300 mt-6 mb-3 uppercase tracking-wide">
                Cerradas
              </h2>
              {closedPools.map((pool) => (
                <PoolCard
                  key={pool.id}
                  pool={pool}
                  userBet={getBetForPool(pool.id)}
                  betTotals={getFlatTotals(pool.id)}
                  onOpen={setSelectedPool}
                />
              ))}
            </>
          )}
        </>
      )}

      </div>{/* end max-w-3xl */}

      {/* Bet modal */}
      {selectedPool && (
        <BetModal
          pool={selectedPool}
          userBet={getBetForPool(selectedPool.id)}
          betTotals={getFlatTotals(selectedPool.id)}
          onClose={() => setSelectedPool(null)}
          onSuccess={handleBetSuccess}
        />
      )}
    </div>
  );
}
