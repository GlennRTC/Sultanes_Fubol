import { formatInTimeZone } from 'date-fns-tz';
import type { Match, Prediction } from '../types/index';

interface MatchCardProps {
  match: Match;
  prediction?: Prediction;
  timezone: string;
  onCardClick: (m: Match) => void;
}

export function MatchCard({ match, prediction, timezone, onCardClick }: MatchCardProps) {
  const displayTime = formatInTimeZone(
    new Date(match.match_datetime),
    timezone,
    'd MMM · HH:mm zzz'
  );

  const statusBadge = {
    scheduled: { label: 'Programado', className: 'text-slate-400 bg-slate-700' },
    live:      { label: 'En vivo',    className: 'text-green-400 bg-green-900/50' },
    finished:  { label: 'Finalizado', className: 'text-slate-500 bg-slate-800 border border-slate-700' },
  }[match.status];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onCardClick(match)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onCardClick(match); }}
      className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 mb-2 cursor-pointer hover:border-slate-500 transition-colors"
    >
      {/* Matchup row: home | score/vs | away — 3-column grid, centered */}
      <div className="grid grid-cols-[1fr_68px_1fr] items-center gap-2 mb-2">
        <span className="font-bold text-slate-100 text-right text-sm leading-tight truncate">
          {match.home_team}
        </span>

        <div className="flex items-center justify-center">
          {match.status === 'finished' ? (
            <span className="text-base font-bold text-slate-100 tabular-nums tracking-tight">
              {match.home_score}–{match.away_score}
            </span>
          ) : (
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
              vs
            </span>
          )}
        </div>

        <span className="font-bold text-slate-100 text-left text-sm leading-tight truncate">
          {match.away_team}
        </span>
      </div>

      {/* Meta row: time · status badge · prediction badge */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <span className="text-xs text-slate-400">{displayTime}</span>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge.className}`}
        >
          {statusBadge.label}
        </span>
        {prediction && (
          <span className="inline-flex items-center bg-slate-700 rounded-full px-2 py-0.5 text-xs text-green-400">
            {prediction.home_score_prediction}–{prediction.away_score_prediction}
          </span>
        )}
      </div>
    </div>
  );
}
