import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from './api';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import AdminLayout from './pages/admin/AdminLayout';
import AdminOverview from './pages/admin/AdminOverview';
import StationsPage from './pages/admin/StationsPage';
import ConfigPage from './pages/admin/ConfigPage';
import UsersPage from './pages/admin/UsersPage';
import OpsLogPage from './pages/admin/OpsLogPage';
import ResourcesPage from './pages/admin/ResourcesPage';
import AaoPage from './pages/admin/AaoPage';

function ProtectedRoute() {
  const [auth, setAuth] = useState<'loading' | 'ok' | 'fail'>('loading');

  useEffect(() => {
    api.get('/api/auth/me').then(() => setAuth('ok')).catch(() => setAuth('fail'));
  }, []);

  if (auth === 'loading') return (
    <div className="h-full flex items-center justify-center text-sm" style={{ color: 'var(--theme-text-muted)' }}>
      Prüfe Sitzung …
    </div>
  );
  if (auth === 'fail') return <Navigate to="/admin/login" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/admin/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminOverview />} />
            <Route path="stations" element={<StationsPage />} />
            <Route path="config" element={<ConfigPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="ops" element={<OpsLogPage />} />
            <Route path="resources" element={<ResourcesPage />} />
            <Route path="aao" element={<AaoPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
