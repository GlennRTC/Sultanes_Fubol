import { getCountryCode } from '../lib/countryCode';
import type { Match, Prediction } from '../types/index';

interface FinishedMatchRowProps {
  match: Match;
  prediction?: Prediction;
  timezone: string;
  onCardClick: (m: Match) => void;
}

export function FinishedMatchRow({ match, prediction, onCardClick }: FinishedMatchRowProps) {
  const homeCode = getCountryCode(match.home_team);
  const awayCode = getCountryCode(match.away_team);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onCardClick(match)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onCardClick(match); }}
      className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 mb-1.5 cursor-pointer hover:border-zinc-500 transition-colors flex items-center"
    >
      <div className="grid grid-cols-[1fr_44px_1fr] items-center gap-1.5 w-full">
        {/* Home team */}
        <div className="flex items-center justify-end gap-1.5 min-w-0">
          {homeCode && (
            <span
              className={`fi fi-${homeCode} text-sm rounded-sm shrink-0`}
              aria-hidden="true"
            />
          )}
          <span className="text-xs font-semibold text-zinc-200 truncate">
            {match.home_team}
          </span>
        </div>

        {/* Score */}
        <div className="text-sm font-bold text-zinc-100 tabular-nums text-center">
          {match.home_score}–{match.away_score}
        </div>

        {/* Away team */}
        <div className="flex items-center justify-start gap-1.5 min-w-0">
          <span className="text-xs font-semibold text-zinc-200 truncate">
            {match.away_team}
          </span>
          {awayCode && (
            <span
              className={`fi fi-${awayCode} text-sm rounded-sm shrink-0`}
              aria-hidden="true"
            />
          )}
        </div>
      </div>

      {prediction && (
        <span
          className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 ml-2"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
