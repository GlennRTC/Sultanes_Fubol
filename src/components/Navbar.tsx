import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

// Authenticated top navigation bar (D-12, D-13)
// Height: 56px (h-14), bg-slate-800, border-b border-slate-700
// Left: "Sultanes Del FUBOL" display text
// Right: username + "Fichas: [n]" + "Cerrar sesión" button
export function Navbar() {
  const { profile, signOut } = useAuthStore();

  return (
    <nav className="h-14 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4">
      {/* Left: brand */}
      <span
        className="text-3xl text-white tracking-wide"
        style={{ fontFamily: "'Bangers', cursive" }}
      >
        Sultanes Del FUBOL
      </span>

      {/* Center: nav links */}
      <div className="flex items-center gap-2">
        <NavLink
          to="/calendario"
          className={({ isActive }) =>
            isActive
              ? 'text-sm text-green-400 px-3 py-1 rounded-lg min-h-[44px] flex items-center'
              : 'text-sm text-slate-300 hover:text-white px-3 py-1 rounded-lg min-h-[44px] flex items-center'
          }
        >
          Calendario
        </NavLink>
        <NavLink
          to="/apuestas"
          className={({ isActive }) =>
            isActive
              ? 'text-sm text-green-400 px-3 py-1 rounded-lg min-h-[44px] flex items-center'
              : 'text-sm text-slate-300 hover:text-white px-3 py-1 rounded-lg min-h-[44px] flex items-center'
          }
        >
          Apuestas
        </NavLink>
        <NavLink
          to="/tabla"
          className={({ isActive }) =>
            isActive
              ? 'text-sm text-green-400 px-3 py-1 rounded-lg min-h-[44px] flex items-center'
              : 'text-sm text-slate-300 hover:text-white px-3 py-1 rounded-lg min-h-[44px] flex items-center'
          }
        >
          Tabla
        </NavLink>
      </div>

      {/* Right: user info + logout */}
      <div className="flex items-center gap-4">
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
    </nav>
  );
}
