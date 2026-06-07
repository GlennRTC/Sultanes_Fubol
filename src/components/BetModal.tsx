import { useState, useEffect } from 'react';
import { formatInTimeZone } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { calcOdds } from '../lib/calcOdds';
import type { BetPool, Bet } from '../types/index';

interface BetModalProps {
  pool: BetPool;
  userBet?: Bet;
  betTotals: Record<string, number>;
  onClose: () => void;
  onSuccess: (bet: { optionId: string; amount: number }) => void;
}

export function BetModal({ pool, userBet, betTotals, onClose, onSuccess }: BetModalProps) {
  const [step, setStep] = useState<'input' | 'confirm'>('input');
  const [selectedOptionId, setSelectedOptionId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { profile } = useAuthStore();

  const isOpen = pool.status === 'open';
  const amountNum = parseInt(amount, 10);
  // Upper-bound guard: amount must not exceed user's current token balance (WR-02).
  // Prevents cryptic DB error code 22003 (integer out of range) and naturally enforces
  // "can't bet more than you have" at the UI layer before the RPC call.
  const canProceed =
    selectedOptionId !== '' &&
    !isNaN(amountNum) &&
    amountNum >= 10 &&
    amountNum <= (profile?.tokens ?? 0);

  // Close on Escape key (accessibility — same as PredictionModal lines 38-44)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const tz = localStorage.getItem('fubol_timezone') ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const headingId = 'bet-modal-' + pool.id;

  const sortedOptions = [...(pool.pool_options ?? [])].sort((a, b) => a.position - b.position);
  const oddsMap = calcOdds(pool.pool_options ?? [], betTotals);

  async function handleConfirm() {
    setLoading(true);
    setError('');
    const { error: rpcError } = await supabase.rpc('place_bet', {
      p_pool_id: pool.id,
      p_option_id: selectedOptionId,
      p_amount: amountNum,
    });
    if (rpcError) {
      if (rpcError.message.includes('insufficient_tokens')) {
        setError('No tienes suficientes fichas para esta apuesta.');
      } else if (
        rpcError.message.includes('pool_not_open') ||
        rpcError.message.includes('pool_deadline_passed')
      ) {
        setError('Esta apuesta ya no acepta fichas.');
      } else if (rpcError.message.includes('below_minimum_bet')) {
        setError('El mínimo es 10 fichas.');
      } else if (rpcError.code === '23505') {
        setError('Ya tienes una apuesta en este pool.');
      } else {
        setError('No se pudo registrar tu apuesta. Intenta de nuevo.');
      }
      setStep('input');
      setLoading(false);
    } else {
      // Update Zustand store ONLY in success branch (T-03-10 / Pitfall 5)
      useAuthStore.getState().updateTokens(-amountNum);
      onSuccess({ optionId: selectedOptionId, amount: amountNum });
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="relative bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-[480px] mx-auto"
      >
        {/* Close button — × is Unicode U+00D7, not ASCII X */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 text-xl leading-none min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          ×
        </button>

        {/* Modal header */}
        <h2 id={headingId} className="text-xl font-bold text-slate-100 mb-1 pr-10">
          {pool.question}
        </h2>

        {/* Deadline (open pools) */}
        {isOpen && (
          <p className="text-sm text-slate-400 mb-4">
            Cierra:{' '}
            {formatInTimeZone(new Date(pool.deadline), tz, "d 'de' MMMM · HH:mm zzz", {
              locale: es,
            })}
          </p>
        )}

        {/* Error banner */}
        {error && (
          <div role="alert" className="bg-red-900/50 border border-red-700 rounded-lg px-4 py-3 mb-4">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* MODE A — Read-only (user has already bet) */}
        {userBet && (
          <>
            <div className="flex flex-col gap-2 mb-4">
              {sortedOptions.map((option) => (
                <div
                  key={option.id}
                  className={
                    option.id === userBet.option_id
                      ? 'w-full text-left px-4 py-3 rounded-lg bg-slate-700 border border-green-500 text-sm text-slate-100 font-bold min-h-[44px]'
                      : 'w-full text-left px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-sm text-slate-300 min-h-[44px]'
                  }
                >
                  {option.label}
                </div>
              ))}
            </div>
            <p className="text-sm text-slate-400 mt-2 mb-4">
              Apostaste: {userBet.tokens_wagered} fichas
            </p>
            {pool.status === 'resolved' && userBet.tokens_won !== null && userBet.tokens_won > 0 && (
              <p className="text-sm text-green-400 font-bold mb-4">
                Ganaste: +{userBet.tokens_won} fichas
              </p>
            )}
            {pool.status === 'resolved' &&
              (userBet.tokens_won === null || userBet.tokens_won === 0) && (
                <p className="text-sm text-slate-500 mb-4">Perdiste</p>
              )}
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-slate-400 hover:text-slate-300 underline text-center block w-full"
            >
              Cerrar
            </button>
          </>
        )}

        {/* MODE B — Closed/resolved, no bet placed */}
        {!userBet && pool.status !== 'open' && (
          <>
            <p className="text-sm text-slate-400 mb-4">Esta apuesta ya no acepta fichas.</p>
            {pool.status === 'resolved' && (
              <div className="flex flex-col gap-2 mb-4">
                {sortedOptions.map((option) => {
                  const isWinning = option.id === pool.winning_option_id;
                  return (
                    <div
                      key={option.id}
                      className={
                        isWinning
                          ? 'w-full text-left px-4 py-3 rounded-lg bg-slate-700 border border-green-500 text-sm text-green-400 font-bold min-h-[44px]'
                          : 'w-full text-left px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-sm text-slate-300 min-h-[44px]'
                      }
                    >
                      {option.label}
                    </div>
                  );
                })}
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-slate-400 hover:text-slate-300 underline text-center block w-full"
            >
              Cerrar
            </button>
          </>
        )}

        {/* MODE C — Editable two-step (open pool, no bet) */}
        {!userBet && isOpen && (
          <>
            {/* STEP INPUT */}
            {step === 'input' && (
              <>
                {/* Options list with live odds */}
                <div className="flex flex-col gap-2 mb-4">
                  {sortedOptions.map((option) => {
                    const odds = oddsMap[option.id];
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSelectedOptionId(option.id)}
                        className={
                          selectedOptionId === option.id
                            ? 'w-full text-left px-4 py-3 rounded-lg bg-slate-700 border border-green-500 text-sm text-slate-100 font-bold min-h-[44px] transition-colors'
                            : 'w-full text-left px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-sm text-slate-300 hover:border-slate-500 min-h-[44px] transition-colors'
                        }
                      >
                        <span>{option.label}</span>
                        <span className="text-xs text-slate-400 ml-2">
                          {odds !== null ? `(actual: ${odds}%)` : '(actual: —)'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Token amount input */}
                <div className="flex flex-col mb-4">
                  <label htmlFor="bet-amount" className="text-sm text-slate-300 mb-1">
                    ¿Cuántas fichas apuestas?
                  </label>
                  <input
                    id="bet-amount"
                    type="number"
                    min="10"
                    max={profile?.tokens ?? 0}
                    step="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-24 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-center text-base text-slate-100 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                  />
                  <p className="text-xs text-slate-400 mt-1">Mín. 10 fichas</p>
                </div>

                {/* CTA button */}
                <button
                  type="button"
                  disabled={!canProceed}
                  onClick={() => setStep('confirm')}
                  className="w-full bg-green-500 hover:bg-green-600 active:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base px-6 py-3 rounded-lg"
                >
                  Confirmar apuesta
                </button>
              </>
            )}

            {/* STEP CONFIRM */}
            {step === 'confirm' && (
              <>
                <p className="text-base text-slate-100 mb-2">
                  {pool.pool_options?.find((o) => o.id === selectedOptionId)?.label ?? ''} ·{' '}
                  {amountNum} fichas
                </p>
                <p className="text-sm text-slate-400 mb-4">
                  ¿Estás seguro? Esta apuesta no se puede cambiar. Se descontarán {amountNum}{' '}
                  fichas.
                </p>
                <button
                  type="button"
                  disabled={loading}
                  aria-busy={loading}
                  aria-disabled={loading}
                  onClick={handleConfirm}
                  className="w-full bg-green-500 hover:bg-green-600 active:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base px-6 py-3 rounded-lg mb-2"
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
                  className="text-sm text-slate-400 hover:text-slate-300 underline text-center block w-full"
                >
                  Cancelar
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
