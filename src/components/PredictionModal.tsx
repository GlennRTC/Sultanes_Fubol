import { useState, useEffect } from 'react';
import { formatInTimeZone } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import type { Match, Prediction } from '../types/index';

interface PredictionModalProps {
  match: Match;
  existingPrediction?: Prediction;
  timezone: string;
  onClose: () => void;
  onSuccess: (p: { home_score_prediction: number; away_score_prediction: number }) => void;
}

// Two-step prediction modal wired to place_prediction RPC (UI-SPEC §Prediction Modal, §Confirmation Step)
// Three render modes: (a) existing read-only, (b) locked no-prediction, (c) editable two-step
export function PredictionModal({
  match,
  existingPrediction,
  timezone,
  onClose,
  onSuccess,
}: PredictionModalProps) {
  const [step, setStep] = useState<'input' | 'confirm'>('input');
  const [homeScore, setHomeScore] = useState(
    existingPrediction ? String(existingPrediction.home_score_prediction) : ''
  );
  const [awayScore, setAwayScore] = useState(
    existingPrediction ? String(existingPrediction.away_score_prediction) : ''
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isLocked = match.status !== 'scheduled' || new Date(match.match_datetime) <= new Date();

  // Close on Escape key (accessibility)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const displayDateTime = formatInTimeZone(
    new Date(match.match_datetime),
    timezone,
    "d 'de' MMMM · HH:mm zzz",
    { locale: es }
  );

  async function handleConfirm() {
    setLoading(true);
    setError('');
    const { error: rpcError } = await supabase.rpc('place_prediction', {
      p_match_id: match.id,
      p_home_score: parseInt(homeScore, 10),
      p_away_score: parseInt(awayScore, 10),
    });
    if (rpcError) {
      if (rpcError.message.includes('insufficient_tokens')) {
        setError('No tienes suficientes fichas para hacer esta predicción.');
      } else if (rpcError.message.includes('match_not_scheduled')) {
        setError('Este partido ya comenzó — no se aceptan predicciones.');
      } else if (rpcError.code === '23505') {
        setError('Ya tienes una predicción para este partido.');
      } else {
        setError('No se pudo guardar tu predicción. Intenta de nuevo.');
      }
      setStep('input');
      setLoading(false);
    } else {
      // Update Zustand store before closing to sync Navbar balance immediately (Pitfall 5)
      useAuthStore.getState().updateTokens(-20);
      onSuccess({
        home_score_prediction: parseInt(homeScore, 10),
        away_score_prediction: parseInt(awayScore, 10),
      });
      onClose();
    }
  }

  const headingId = `modal-heading-${match.id}`;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="relative bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-[480px] mx-auto"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-100 text-xl leading-none min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Cerrar"
        >
          ×
        </button>

        {/* Modal header */}
        <h2 id={headingId} className="text-xl font-bold text-zinc-100 mb-1 pr-10">
          {match.home_team} vs {match.away_team}
        </h2>
        <p className="text-sm text-zinc-400 mb-4">{displayDateTime}</p>

        {/* Error banner */}
        {error && (
          <div role="alert" className="bg-red-900/50 border border-red-700 rounded-lg px-4 py-3 mb-4">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Render mode (a): existing prediction — read-only */}
        {existingPrediction && (
          <>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex flex-col items-center gap-1">
                <label htmlFor="home-score-readonly" className="text-sm text-zinc-300">
                  Goles {match.home_team}
                </label>
                <input
                  id="home-score-readonly"
                  type="number"
                  min="0"
                  max="99"
                  value={homeScore}
                  disabled
                  aria-disabled="true"
                  readOnly
                  className="w-16 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-center text-base text-zinc-100 opacity-50 cursor-not-allowed"
                />
              </div>
              <span className="text-base text-zinc-400">–</span>
              <div className="flex flex-col items-center gap-1">
                <label htmlFor="away-score-readonly" className="text-sm text-zinc-300">
                  Goles {match.away_team}
                </label>
                <input
                  id="away-score-readonly"
                  type="number"
                  min="0"
                  max="99"
                  value={awayScore}
                  disabled
                  aria-disabled="true"
                  readOnly
                  className="w-16 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-center text-base text-zinc-100 opacity-50 cursor-not-allowed"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-zinc-400 hover:text-zinc-300 underline text-center block w-full"
            >
              Cerrar
            </button>
          </>
        )}

        {/* Render mode (b): locked match, no prediction */}
        {!existingPrediction && isLocked && (
          <>
            <p className="text-sm text-zinc-400 mb-4">
              Este partido ya comenzó — no se aceptan predicciones.
            </p>
            <div className="flex items-center gap-4 mb-4 opacity-50">
              <div className="flex flex-col items-center gap-1">
                <label htmlFor="home-score-locked" className="text-sm text-zinc-300">
                  Goles {match.home_team}
                </label>
                <input
                  id="home-score-locked"
                  type="number"
                  min="0"
                  max="99"
                  value=""
                  disabled
                  aria-disabled="true"
                  readOnly
                  className="w-16 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-center text-base text-zinc-100 cursor-not-allowed"
                />
              </div>
              <span className="text-base text-zinc-400">–</span>
              <div className="flex flex-col items-center gap-1">
                <label htmlFor="away-score-locked" className="text-sm text-zinc-300">
                  Goles {match.away_team}
                </label>
                <input
                  id="away-score-locked"
                  type="number"
                  min="0"
                  max="99"
                  value=""
                  disabled
                  aria-disabled="true"
                  readOnly
                  className="w-16 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-center text-base text-zinc-100 cursor-not-allowed"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-zinc-400 hover:text-zinc-300 underline text-center block w-full"
            >
              Cerrar
            </button>
          </>
        )}

        {/* Render mode (c): editable two-step — input step */}
        {!existingPrediction && !isLocked && step === 'input' && (
          <>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex flex-col items-center gap-1">
                <label htmlFor="home-score" className="text-sm text-zinc-300">
                  Goles {match.home_team}
                </label>
                <input
                  id="home-score"
                  type="number"
                  min="0"
                  max="99"
                  value={homeScore}
                  onChange={(e) => setHomeScore(e.target.value)}
                  className="w-16 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-center text-base text-zinc-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <span className="text-base text-zinc-400">–</span>
              <div className="flex flex-col items-center gap-1">
                <label htmlFor="away-score" className="text-sm text-zinc-300">
                  Goles {match.away_team}
                </label>
                <input
                  id="away-score"
                  type="number"
                  min="0"
                  max="99"
                  value={awayScore}
                  onChange={(e) => setAwayScore(e.target.value)}
                  className="w-16 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-center text-base text-zinc-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
            <p className="text-sm text-zinc-400 mb-4">Costo: 20 fichas</p>
            <button
              type="button"
              disabled={homeScore === '' || awayScore === ''}
              onClick={() => {
                const h = parseInt(homeScore, 10);
                const a = parseInt(awayScore, 10);
                if (
                  isNaN(h) || isNaN(a) ||
                  h < 0 || a < 0 ||
                  String(h) !== homeScore.trim() || String(a) !== awayScore.trim()
                ) {
                  setError('Ingresa números enteros válidos (0 o más).');
                  return;
                }
                setStep('confirm');
              }}
              className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base px-6 py-3 rounded-lg"
            >
              Confirmar predicción
            </button>
          </>
        )}

        {/* Render mode (c): editable two-step — confirm step */}
        {!existingPrediction && !isLocked && step === 'confirm' && (
          <>
            <p className="text-base text-zinc-100 mb-2">
              {match.home_team} <strong>{homeScore}</strong> – <strong>{awayScore}</strong> {match.away_team}
            </p>
            <p className="text-sm text-zinc-400 mb-4">
              ¿Estás seguro? Esta predicción no se puede cambiar. Se descontarán 20 fichas.
            </p>
            <button
              type="button"
              disabled={loading}
              aria-busy={loading}
              aria-disabled={loading}
              onClick={handleConfirm}
              className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base px-6 py-3 rounded-lg mb-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                </span>
              ) : (
                'Confirmar'
              )}
            </button>
            <button
              type="button"
              onClick={() => setStep('input')}
              className="text-sm text-zinc-400 hover:text-zinc-300 underline text-center block w-full"
            >
              Cancelar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
