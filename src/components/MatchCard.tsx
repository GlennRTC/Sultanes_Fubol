import { formatInTimeZone } from 'date-fns-tz';
import type { Match, Prediction } from '../types/index';

interface MatchCardProps {
  match: Match;
  prediction?: Prediction;
  timezone: string;
  onCardClick: (m: Match) => void;
}

// Match card with local time, status badge, and prediction badge (UI-SPEC §Match card)
// Card is always clickable, even for locked (live/finished) matches (D-05, D-09)
export function MatchCard({ match, prediction, timezone, onCardClick }: MatchCardProps) {
  const displayTime = formatInTimeZone(
    new Date(match.match_datetime),
    timezone,
    'd MMM · HH:mm zzz'
  );

  const statusBadge = {
    scheduled: { label: 'Programado', className: 'text-slate-400 bg-slate-700' },
    live:      { label: 'En vivo',    className: 'text-green-400 bg-green-900/50' },
    finished:  { label: 'Finalizado', className: 'text-slate-500 bg-slate-800' },
  }[match.status];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onCardClick(match)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onCardClick(match); }}
      className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-2 cursor-pointer hover:border-slate-500 transition-colors min-h-[72px] flex flex-col gap-1"
    >
      {/* Teams row */}
      <div className="flex items-center justify-between text-base text-slate-100">
        <span className="font-bold">{match.home_team}</span>
        {match.status === 'finished' ? (
          <span className="text-base font-bold text-slate-100 mx-2">
            {match.home_score} - {match.away_score}
          </span>
        ) : (
          <span className="text-sm text-slate-400 mx-2">vs</span>
        )}
        <span className="font-bold">{match.away_team}</span>
      </div>

      {/* Meta row: time + status badge */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <span>{displayTime}</span>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge.className}`}>
          {statusBadge.label}
        </span>

        {/* Prediction badge — shown when user has a prediction for this match */}
        {prediction && (
          <span className="inline-flex items-center bg-slate-700 rounded-full px-2 py-0.5 text-xs text-green-400">
            Tu predicción: {prediction.home_score_prediction}-{prediction.away_score_prediction}
          </span>
        )}
      </div>
    </div>
  );
}
