import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const activeClass = 'text-green-400';
const inactiveClass = 'text-slate-300 hover:text-white';

export function Navbar() {
  const { profile, signOut } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const desktopLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm px-3 py-1 rounded-lg min-h-[44px] flex items-center ${isActive ? activeClass : inactiveClass}`;

  const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-base py-3 border-b border-slate-700 block ${isActive ? activeClass + ' font-medium' : inactiveClass}`;

  return (
    <nav className="bg-slate-800 border-b border-slate-700 sticky top-0 z-40">
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
          <span className="text-slate-100">{profile?.username}</span>
          <span className="text-green-400">Fichas: {profile?.tokens ?? 0}</span>
          <button
            type="button"
            onClick={signOut}
            className="min-h-[44px] text-slate-300 hover:text-white bg-transparent border-none cursor-pointer"
          >
            Cerrar sesión
          </button>
        </div>

        {/* Mobile: fichas badge + hamburger — hidden on md+ */}
        <div className="flex md:hidden items-center gap-3">
          <span className="text-green-400 text-sm font-medium">
            Fichas: {profile?.tokens ?? 0}
          </span>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-300 hover:text-white"
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
        <div className="md:hidden border-t border-slate-700 px-4 pb-3 bg-slate-800">
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
            <span className="text-sm text-slate-400">{profile?.username}</span>
            <button
              type="button"
              onClick={() => { setMenuOpen(false); signOut(); }}
              className="text-sm text-slate-300 hover:text-white underline min-h-[44px] flex items-center"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
