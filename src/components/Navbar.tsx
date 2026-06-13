import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const activeClass = 'text-emerald-400';
const inactiveClass = 'text-zinc-300 hover:text-white';

export function Navbar() {
  const { profile, signOut } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const desktopLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm px-3 py-1 rounded-lg min-h-[44px] flex items-center ${isActive ? activeClass : inactiveClass}`;

  const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-base py-3 border-b border-zinc-700 block ${isActive ? activeClass + ' font-medium' : inactiveClass}`;

  return (
    <nav className="bg-zinc-950 border-b border-emerald-500/20 sticky top-0 z-40">
      {/* Top bar — always visible, fixed at h-14 */}
      <div className="h-14 flex items-center justify-between px-4">
        {/* Brand */}
        <span
          className="text-3xl text-white tracking-wide shrink-0"
          style={{ fontFamily: "'Bangers', cursive" }}
        >
          Sultanes Del FUBOL
        </span>

        {/* Desktop: nav links — hidden below md */}
        <div className="hidden md:flex items-center gap-2">
          <NavLink to="/calendario" className={desktopLinkClass}>Calendario</NavLink>
          <NavLink to="/apuestas" className={desktopLinkClass}>Apuestas</NavLink>
          <NavLink to="/tabla" className={desktopLinkClass}>Tabla</NavLink>
          {profile?.is_admin && (
            <NavLink to="/admin/usuarios" className={desktopLinkClass}>Admin</NavLink>
          )}
        </div>

        {/* Desktop: user info — hidden below md */}
        <div className="hidden md:flex items-center gap-4">
          <span className="text-zinc-100">{profile?.username}</span>
          <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full px-2 py-0.5 text-xs font-bold">Fichas: {profile?.tokens ?? 0}</span>
          <button
            type="button"
            onClick={signOut}
            className="min-h-[44px] text-zinc-300 hover:text-white bg-transparent border-none cursor-pointer"
          >
            Cerrar sesión
          </button>
        </div>

        {/* Mobile: fichas badge + hamburger — hidden on md+ */}
        <div className="flex md:hidden items-center gap-3">
          <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full px-2 py-0.5 text-xs font-bold">
            Fichas: {profile?.tokens ?? 0}
          </span>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-300 hover:text-white"
          >
            {menuOpen
              ? <X size={22} strokeWidth={1.75} aria-hidden="true" />
              : <Menu size={22} strokeWidth={1.75} aria-hidden="true" />
            }
          </button>
        </div>
      </div>

      {/* Mobile dropdown — shown when menuOpen, hidden on md+ */}
      {menuOpen && (
        <div className="md:hidden border-t border-zinc-700 px-4 pb-3 bg-zinc-950">
          <NavLink to="/calendario" className={mobileLinkClass} onClick={() => setMenuOpen(false)}>
            Calendario
          </NavLink>
          <NavLink to="/apuestas" className={mobileLinkClass} onClick={() => setMenuOpen(false)}>
            Apuestas
          </NavLink>
          <NavLink to="/tabla" className={mobileLinkClass} onClick={() => setMenuOpen(false)}>
            Tabla
          </NavLink>
          {profile?.is_admin && (
            <NavLink
              to="/admin/usuarios"
              className={mobileLinkClass}
              onClick={() => setMenuOpen(false)}
            >
              Admin
            </NavLink>
          )}
          <div className="flex items-center justify-between pt-3">
            <span className="text-sm text-zinc-400">{profile?.username}</span>
            <button
              type="button"
              onClick={() => { setMenuOpen(false); signOut(); }}
              className="text-sm text-zinc-300 hover:text-white underline min-h-[44px] flex items-center"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
