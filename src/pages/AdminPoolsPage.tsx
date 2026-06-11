import { useState, useEffect } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { formatInTimeZone } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import type { BetPool, PoolOption } from '../types/index';

export function AdminPoolsPage() {
  // Create pool form
  const [question, setQuestion] = useState('');
  const [poolType, setPoolType] = useState<'binary' | 'multiple_exclusive'>('binary');
  const [deadline, setDeadline] = useState(''); // datetime-local string (local time)
  const [options, setOptions] = useState<string[]>(['', '']); // min 2 option labels
  const [creating, setCreating] = useState(false);

  // Resolve section
  const [pools, setPools] = useState<(BetPool & { pool_options: PoolOption[] })[]>([]);
  const [loadingPools, setLoadingPools] = useState(true);
  const [resolveSelections, setResolveSelections] = useState<Record<string, string>>({}); // poolId -> optionId
  const [resolving, setResolving] = useState<string | null>(null);

  // Shared feedback
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const tz = localStorage.getItem('fubol_timezone') ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

  async function fetchPools() {
    const { data, error: fetchErr } = await supabase
      .from('bet_pools')
      .select('*, pool_options(*)')
      .in('status', ['open', 'closed'])
      .order('deadline');
    if (fetchErr) {
      setError(`No se pudieron cargar los pools. (${fetchErr.message})`);
    } else {
      setPools((data ?? []) as unknown as (BetPool & { pool_options: PoolOption[] })[]);
    }
    setLoadingPools(false);
  }

  useEffect(() => {
    fetchPools();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Option list helpers
  function addOption() {
    if (options.length < 4) setOptions(prev => [...prev, '']);
  }

  function removeOption(i: number) {
    if (options.length > 2) setOptions(prev => prev.filter((_, idx) => idx !== i));
  }

  function updateOption(i: number, val: string) {
    setOptions(prev => prev.map((o, idx) => (idx === i ? val : o)));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const nonEmpty = options.filter(o => o.trim() !== '');
    if (nonEmpty.length < 2) {
      setError('Ingresa al menos 2 opciones.');
      return;
    }
    if (!question.trim()) {
      setError('Ingresa la pregunta del pool.');
      return;
    }
    if (!deadline) {
      setError('Ingresa la fecha y hora límite.');
      return;
    }
    // Convert datetime-local (local time) to UTC ISO string for the DB
    const deadlineUtc = new Date(deadline).toISOString();
    if (new Date(deadlineUtc) <= new Date()) {
      setError('La fecha límite debe ser futura.');
      return;
    }
    setCreating(true);
    setError('');
    setSuccess('');
    const { data: poolId, error: rpcErr } = await supabase.rpc('create_bet_pool', {
      p_question: question.trim(),
      p_type: poolType,
      p_deadline: deadlineUtc,
      p_options: nonEmpty,
    });
    if (rpcErr) {
      setError(
        rpcErr.message === 'not_admin'
          ? 'No tienes permisos de administrador.'
          : rpcErr.message === 'invalid_pool_type'
          ? 'Tipo de pool no válido.'
          : rpcErr.message === 'pool_needs_at_least_two_options'
          ? 'Se necesitan al menos 2 opciones.'
          : rpcErr.message === 'deadline_must_be_future'
          ? 'La fecha límite debe ser futura.'
          : 'Error al crear pool. Intenta de nuevo.'
      );
    } else {
      setSuccess(`Pool creado correctamente. ID: ${poolId}`);
      // Reset form
      setQuestion('');
      setDeadline('');
      setOptions(['', '']);
      setPoolType('binary');
      await fetchPools();
    }
    setCreating(false);
  }

  async function handleResolve(poolId: string) {
    const winningOptionId = resolveSelections[poolId];
    if (!winningOptionId) {
      setError('Selecciona la opción ganadora.');
      return;
    }
    setResolving(poolId);
    setError('');
    setSuccess('');
    const { error: rpcErr } = await supabase.rpc('admin_resolve_pool', {
      p_pool_id: poolId,
      p_winning_option_id: winningOptionId,
    });
    if (rpcErr) {
      setError(
        rpcErr.message === 'not_admin'
          ? 'No tienes permisos de administrador.'
          : rpcErr.message === 'pool_not_open_or_not_found'
          ? 'El pool no está abierto o no existe.'
          : rpcErr.message === 'winning_option_not_found'
          ? 'Opción ganadora no encontrada en este pool.'
          : 'Error al resolver pool. Intenta de nuevo.'
      );
    } else {
      setSuccess('Pool resuelto. Los pagos se distribuyeron automáticamente.');
      await fetchPools();
    }
    setResolving(null);
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-900 px-4 py-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold text-slate-100 mb-6">Gestión de Apuestas</h1>

      {error && (
        <div role="alert" className="bg-red-900/50 border border-red-700 rounded-lg px-4 py-3 mb-4">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}
      {success && (
        <div role="status" className="bg-green-900/50 border border-green-700 rounded-lg px-4 py-3 mb-4">
          <p className="text-sm text-green-300">{success}</p>
        </div>
      )}

      {/* SECTION 1 — Create Pool */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
        <h2 className="text-base font-bold text-slate-100 mb-4">Crear Pool</h2>
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          {/* Question */}
          <textarea
            rows={2}
            placeholder="Pregunta del pool"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-green-500 resize-none"
          />

          {/* Type */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Tipo</label>
            <select
              value={poolType}
              onChange={e => setPoolType(e.target.value as 'binary' | 'multiple_exclusive')}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 min-h-[44px] focus:outline-none focus:border-green-500"
            >
              <option value="binary">Binario (Sí/No)</option>
              <option value="multiple_exclusive">Opción múltiple</option>
            </select>
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Fecha límite</label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 min-h-[44px] focus:outline-none focus:border-green-500"
            />
            <p className="text-xs text-slate-500 mt-1">Hora local. Se guardará en UTC.</p>
          </div>

          {/* Options */}
          <div>
            <label className="block text-xs text-slate-400 mb-2">Opciones (min. 2, max. 4)</label>
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2 items-center mb-2">
                <input
                  type="text"
                  placeholder={`Opción ${i + 1}`}
                  value={opt}
                  onChange={e => updateOption(i, e.target.value)}
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 min-h-[44px] focus:outline-none focus:border-green-500"
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    aria-label="Eliminar opción"
                    className="text-red-400 hover:text-red-300 min-h-[44px] min-w-[44px] shrink-0 flex items-center justify-center"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            {options.length < 4 && (
              <button
                type="button"
                onClick={addOption}
                className="flex items-center gap-1 text-sm text-green-400 hover:text-green-300 mt-1 min-h-[44px]"
              >
                <Plus size={16} />
                Agregar opción
              </button>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={creating}
            className="min-h-[44px] w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold rounded-lg flex items-center justify-center gap-2"
          >
            {creating ? <Loader2 size={18} className="animate-spin" /> : 'Crear pool'}
          </button>
        </form>
      </div>

      {/* SECTION 2 — Active Pools */}
      <div className="mt-2">
        <h2 className="text-base font-bold text-slate-100 mb-3">Pools Activos</h2>
        {loadingPools ? (
          <div className="flex items-center gap-2 text-slate-400">
            <Loader2 size={20} className="animate-spin" />
            <span>Cargando pools...</span>
          </div>
        ) : pools.length === 0 ? (
          <p className="text-slate-400 text-sm">No hay pools abiertos o cerrados actualmente.</p>
        ) : (
          pools.map(pool => (
            <div key={pool.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-3">
              <p className="text-sm font-bold text-slate-100 mb-1">{pool.question}</p>
              <p className="text-xs text-slate-400 mb-3">
                <span className={pool.status === 'open' ? 'text-green-400' : 'text-slate-400'}>
                  {pool.status === 'open' ? 'Abierta' : 'Cerrada'}
                </span>
                {' · Cierre: '}
                {formatInTimeZone(new Date(pool.deadline), tz, "d MMM HH:mm zzz", { locale: es })}
              </p>
              <div className="flex flex-col gap-2">
                <select
                  value={resolveSelections[pool.id] ?? ''}
                  onChange={e =>
                    setResolveSelections(prev => ({ ...prev, [pool.id]: e.target.value }))
                  }
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 min-h-[44px] focus:outline-none focus:border-green-500"
                >
                  <option value="">Selecciona opción ganadora</option>
                  {[...pool.pool_options]
                    .sort((a, b) => a.position - b.position)
                    .map(opt => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleResolve(pool.id)}
                  disabled={resolving === pool.id || !resolveSelections[pool.id]}
                  className="min-h-[44px] px-4 bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-white text-sm font-bold rounded-lg flex items-center justify-center gap-2"
                >
                  {resolving === pool.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    'Resolver pool'
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
