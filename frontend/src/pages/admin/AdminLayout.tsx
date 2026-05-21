import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { api } from '../../api';
import { PegelBoardMark } from '../../components/PegelBoardMark';

const NAV = [
  { to: '/admin/stations',  label: 'Pegelstationen',        icon: '〰' },
  { to: '/admin/config',    label: 'Konfiguration',         icon: '⚙' },
  { to: '/admin/resources', label: 'Einsatzmittel und AAO', icon: '🚤' },
  { to: '/admin/system',    label: 'System & Backup',       icon: '↻' },
];

export default function AdminLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    api.get<{ daynight_mode?: string }>('/api/config/public').then((cfg) => {
      const mode = cfg.daynight_mode ?? 'dark';
      // For admin area, use explicit mode; 'auto' defaults to dark
      document.documentElement.setAttribute('data-theme', mode === 'light' ? 'light' : 'dark');
    }).catch(() => {});
  }, []);

  async function logout() {
    await api.post('/api/auth/logout', {}).catch(() => {});
    navigate('/admin/login');
  }

  return (
    <div className="h-full flex">
      <aside className="w-56 shrink-0 glass border-r flex flex-col py-6 px-3 gap-1" style={{ borderColor: 'var(--theme-border)' }}>
        <div className="px-3 mb-6 flex items-center gap-2.5">
          <PegelBoardMark status="live" size={30} />
          <div>
            <div style={{ lineHeight: 1 }}>
              <span style={{ fontFamily: "Helvetica, 'Helvetica Neue', Arial, sans-serif", fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.015em', color: 'var(--theme-text)' }}>Pegel</span>
              <span style={{ fontFamily: "Helvetica, 'Helvetica Neue', Arial, sans-serif", fontSize: '1rem', fontWeight: 300, letterSpacing: '-0.015em', color: 'var(--theme-text-muted)' }}>Board</span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-faint)' }}>Administration</p>
          </div>
        </div>
        {NAV.map(({ to, label, icon }) => (
          <NavLink key={to} to={to} end
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                isActive ? 'bg-pb-signal text-white font-medium' : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}>
            <span className="w-4 text-center">{icon}</span>
            {label}
          </NavLink>
        ))}
        <div className="mt-auto flex flex-col gap-1">
          <p className="px-3 pb-1 text-xs" style={{ color: 'var(--theme-text-faint)' }}>
            v{__APP_VERSION__}
          </p>
          <NavLink to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/40 hover:text-white/60 transition-colors">
            <span className="w-4 text-center">←</span>Dashboard
          </NavLink>
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/40 hover:text-red-400 transition-colors">
            <span className="w-4 text-center">⏻</span>Abmelden
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8"><Outlet /></main>
    </div>
  );
}
