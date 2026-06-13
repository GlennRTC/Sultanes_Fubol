import { Navigate, NavLink, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { FullScreenSpinner } from './FullScreenSpinner';

const adminTabs = [
  { to: '/admin/usuarios', label: 'Usuarios' },
  { to: '/admin/partidos', label: 'Partidos' },
  { to: '/admin/apuestas', label: 'Pools' },
  { to: '/admin/reportes', label: 'Reportes' },
];

export function AdminRoute() {
  const { profile, loading } = useAuthStore();
  if (loading) return <FullScreenSpinner />;
  if (!profile?.is_admin) return <Navigate to="/calendario" replace />;
  return (
    <>
      <nav className="bg-zinc-900 border-b border-zinc-700">
        <div className="max-w-4xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {adminTabs.map(tab => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </div>
      </nav>
      <Outlet />
    </>
  );
}
