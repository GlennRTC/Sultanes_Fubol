import { formatInTimeZone } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import type { BetPool, PoolOption, Bet } from '../types/index';

interface PoolCardProps {
  pool: BetPool;
  userBet?: Bet;
  betTotals: Record<string, number>;
  onOpen: (pool: BetPool) => void;
}

// Division-by-zero guard: returns null for all options when poolTotal === 0 (Pitfall 4)
function calcOdds(
  _poolId: string,
  options: PoolOption[],
  betTotals: Record<string, number>
): Record<string, number | null> {
  const poolTotal = options.reduce((sum, opt) => sum + (betTotals[opt.id] ?? 0), 0);
  if (poolTotal === 0) return Object.fromEntries(options.map((o) => [o.id, null]));
  return Object.fromEntries(
    options.map((o) => [o.id, Math.round(((betTotals[o.id] ?? 0) / poolTotal) * 100)])
  );
}

function statusBadge(status: 'open' | 'closed' | 'resolved'): JSX.Element {
  if (status === 'open') {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-green-400 bg-green-900/50">
        Abierta
      </span>
    );
  }
  if (status === 'closed') {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-slate-400 bg-slate-700">
        Cerrada
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-slate-500 bg-slate-800">
      Resuelta
    </span>
  );
}

export function PoolCard({ pool, userBet, betTotals, onOpen }: PoolCardProps) {
  const tz = localStorage.getItem('fubol_timezone') ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const sortedOptions = [...(pool.pool_options ?? [])].sort((a, b) => a.position - b.position);
  const oddsMap = calcOdds(pool.id, sortedOptions, betTotals);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(pool)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(pool);
        }
      }}
      className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-3 cursor-pointer hover:border-slate-500 transition-colors min-h-[80px] flex flex-col gap-2"
    >
      {/* Pool question */}
      <p className="text-base text-slate-100 font-bold mb-1">{pool.question}</p>

      {/* Status + deadline row */}
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
        {statusBadge(pool.status)}
        {pool.status === 'open' && (
          <span className="text-xs text-slate-400">
            Cierra:{' '}
            {formatInTimeZone(new Date(pool.deadline), tz, "d 'de' MMMM · HH:mm zzz", { locale: es })}
          </span>
        )}
        {pool.status === 'resolved' && pool.winning_option_id && (
          <span className="text-xs text-slate-500">
            Resultado:{' '}
            {pool.pool_options?.find((o) => o.id === pool.winning_option_id)?.label ?? ''}
          </span>
        )}
      </div>

      {/* Options list */}
      <div className="flex flex-col gap-1">
        {sortedOptions.map((option) => {
          const odds = oddsMap[option.id];
          const isWinning =
            pool.status === 'resolved' && option.id === pool.winning_option_id;
          return (
            <div key={option.id} className="flex items-center justify-between text-sm">
              <span className={isWinning ? 'text-green-400 font-bold' : 'text-slate-300'}>
                {option.label}
              </span>
              <span className={isWinning ? 'text-green-400 font-bold' : 'text-slate-400'}>
                {odds !== null ? `${odds}%` : '—'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Bet badge */}
      {userBet && (
        <>
          {pool.status === 'resolved' &&
          userBet.tokens_won !== null &&
          userBet.tokens_won > 0 ? (
            <span className="inline-flex items-center bg-slate-700 rounded-full px-2 py-0.5 text-xs text-green-400 mt-1">
              Ganaste: +{userBet.tokens_won} fichas
            </span>
          ) : pool.status === 'resolved' ? (
            <span className="inline-flex items-center bg-slate-700 rounded-full px-2 py-0.5 text-xs text-slate-500 mt-1">
              Perdiste
            </span>
          ) : (
            <span className="inline-flex items-center bg-slate-700 rounded-full px-2 py-0.5 text-xs text-green-400 mt-1">
              Tu apuesta:{' '}
              {pool.pool_options?.find((o) => o.id === userBet.option_id)?.label ?? ''} ·{' '}
              {userBet.tokens_wagered} fichas
            </span>
          )}
        </>
      )}
    </div>
  );
}
