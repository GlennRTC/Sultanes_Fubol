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
      <nav className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-4xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {adminTabs.map(tab => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-green-400 text-green-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
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
