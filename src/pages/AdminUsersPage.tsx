import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { AdminUser } from '../types/index';

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // Token grant form state
  const [grantUserId, setGrantUserId] = useState('');
  const [grantAmount, setGrantAmount] = useState('');
  const [grantNote, setGrantNote] = useState('');

  useEffect(() => {
    async function fetchUsers() {
      const { data, error: fetchErr } = await supabase
        .from('profiles')
        .select('*')
        .order('username');
      if (fetchErr) {
        setError('No se pudieron cargar los usuarios.');
      } else {
        setUsers(data ?? []);
      }
      setLoading(false);
    }
    fetchUsers();
  }, []);

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  async function handleBlockToggle(userId: string, currentBlocked: boolean) {
    setActionLoading(userId);
    setError('');
    setSuccess('');
    const { error: rpcErr } = await supabase.rpc('admin_block_user', {
      p_target_user_id: userId,
      p_blocked: !currentBlocked,
    });
    if (rpcErr) {
      setError(
        rpcErr.message === 'not_admin'
          ? 'No tienes permisos de administrador.'
          : 'Error al actualizar usuario. Intenta de nuevo.'
      );
    } else {
      setSuccess(!currentBlocked ? 'Usuario bloqueado.' : 'Usuario desbloqueado.');
      setUsers(prev =>
        prev.map(u => u.id === userId ? { ...u, is_blocked: !currentBlocked } : u)
      );
    }
    setActionLoading(null);
  }

  async function handleGrantTokens(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseInt(grantAmount, 10);
    if (isNaN(amount) || amount === 0) {
      setError('Ingresa un monto válido (distinto de cero).');
      return;
    }
    if (!grantUserId) {
      setError('Selecciona un usuario.');
      return;
    }
    setActionLoading(grantUserId);
    setError('');
    setSuccess('');
    const { error: rpcErr } = await supabase.rpc('admin_grant_tokens', {
      p_target_user_id: grantUserId,
      p_amount: amount,
      p_note: grantNote,
    });
    if (rpcErr) {
      const msg = rpcErr.message;
      setError(
        msg === 'not_admin' ? 'No tienes permisos de administrador.' :
        msg === 'user_not_found' ? 'Usuario no encontrado.' :
        msg === 'amount_cannot_be_zero' ? 'El monto no puede ser cero.' :
        msg === 'insufficient_tokens' ? 'El usuario no tiene suficientes fichas para remover esa cantidad.' :
        'Error al actualizar fichas. Intenta de nuevo.'
      );
    } else {
      setSuccess(`${amount > 0 ? '+' : ''}${amount} fichas aplicadas a ${grantUserId}.`);
      const { data } = await supabase.from('profiles').select('*').order('username');
      if (data) setUsers(data);
      setGrantAmount('');
      setGrantNote('');
    }
    setActionLoading(null);
  }

  async function handleResetPassword(userId: string, username: string) {
    setActionLoading(userId);
    setError('');
    setSuccess('');
    const { error: fnErr } = await supabase.functions.invoke('admin-reset-password', {
      body: { userId },
    });
    if (fnErr) {
      setError('No se pudo enviar el correo de restablecimiento. Intenta de nuevo.');
    } else {
      setSuccess(`Correo de restablecimiento enviado para ${username}.`);
    }
    setActionLoading(null);
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-slate-900 px-4 py-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold text-slate-100 mb-4">Gestión de Usuarios</h1>

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

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 size={20} className="animate-spin" />
          <span>Cargando usuarios...</span>
        </div>
      ) : (
        <>
          <input
            type="text"
            placeholder="Buscar usuario..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 mb-4 focus:outline-none focus:border-green-500"
          />

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-xs text-slate-400 font-medium py-2 pr-4">Usuario</th>
                  <th className="text-xs text-slate-400 font-medium py-2 pr-4">Fichas</th>
                  <th className="text-xs text-slate-400 font-medium py-2 pr-4">Estado</th>
                  <th className="text-xs text-slate-400 font-medium py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(user => (
                  <tr key={user.id} className="border-b border-slate-800">
                    <td className="text-slate-100 text-sm whitespace-nowrap py-3 pr-4">
                      {user.username}
                    </td>
                    <td className="text-green-400 text-sm py-3 pr-4">
                      {user.tokens}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs ${user.is_blocked ? 'text-red-400' : 'text-green-400'}`}>
                        {user.is_blocked ? 'Bloqueado' : 'Activo'}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleBlockToggle(user.id, user.is_blocked)}
                          disabled={actionLoading === user.id}
                          className={`min-h-[44px] px-3 text-xs rounded-lg text-white disabled:opacity-50 ${
                            user.is_blocked
                              ? 'bg-green-800 hover:bg-green-700'
                              : 'bg-red-800 hover:bg-red-700'
                          }`}
                        >
                          {user.is_blocked ? 'Desbloquear' : 'Bloquear'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResetPassword(user.id, user.username)}
                          disabled={actionLoading === user.id}
                          className="min-h-[44px] px-3 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg disabled:opacity-50 flex items-center gap-1"
                        >
                          {actionLoading === user.id
                            ? <Loader2 size={14} className="animate-spin" />
                            : 'Reset contraseña'
                          }
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Token grant / remove section */}
          <div className="mt-6 border-t border-slate-700 pt-6">
            <h2 className="text-base font-bold text-slate-100 mb-3">Otorgar / Remover Fichas</h2>
            <form onSubmit={handleGrantTokens}>
              <select
                value={grantUserId}
                onChange={e => setGrantUserId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 mb-3 min-h-[44px] focus:outline-none focus:border-green-500"
              >
                <option value="">Selecciona usuario</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.username} ({u.tokens} fichas)
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="-100 para remover, +100 para otorgar"
                value={grantAmount}
                onChange={e => setGrantAmount(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 mb-3 min-h-[44px] focus:outline-none focus:border-green-500"
              />
              <input
                type="text"
                placeholder="Nota (opcional)"
                value={grantNote}
                onChange={e => setGrantNote(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 mb-3 min-h-[44px] focus:outline-none focus:border-green-500"
              />
              <button
                type="submit"
                disabled={actionLoading !== null}
                className="min-h-[44px] w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-lg font-bold text-sm"
              >
                Aplicar fichas
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
