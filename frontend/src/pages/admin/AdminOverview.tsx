import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api';

export default function AdminOverview() {
  const [stationCount, setStationCount] = useState<number | null>(null);
  const [configKeys, setConfigKeys] = useState<string[]>([]);

  useEffect(() => {
    api.get<unknown[]>('/api/admin/stations').then((s) => setStationCount(s.length)).catch(() => {});
    api.get<Record<string, string>>('/api/admin/config')
      .then((c) => setConfigKeys(Object.keys(c).filter((k) => c[k])))
      .catch(() => {});
  }, []);

  const hasLocation = configKeys.includes('location_lat');

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Übersicht</h1>
        <p className="text-white/40 text-sm mt-1">Systemstatus auf einen Blick</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Stat label="Pegelstationen" value={stationCount ?? '—'} ok={stationCount != null && stationCount > 0} />
        <Stat label="API / Standort konfiguriert" value={configKeys.length} ok={hasLocation} />
      </div>
      <div className="glass rounded-2xl p-6 flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Erste Schritte</h2>
        <Step done={hasLocation} label="Standort (Breitengrad/Längengrad) setzen" to="/admin/config" />
        <Step done={stationCount != null && stationCount > 0} label="Pegelstationen hinzufügen" to="/admin/stations" />
        <Step done={false} label="Standard-Passwort ändern (admin / wasser)" to="/admin/users" />
      </div>
      <Link
        to="/admin/system"
        className="glass rounded-2xl p-5 flex items-center justify-between group hover:bg-white/5 transition-colors"
      >
        <div>
          <p className="text-sm font-medium text-white">System & Backup</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-faint)' }}>
            Updates von GitHub, Konfiguration exportieren und importieren
          </p>
        </div>
        <span className="text-lg group-hover:translate-x-1 transition-transform" style={{ color: 'var(--theme-text-faint)' }}>→</span>
      </Link>
    </div>
  );
}

function Stat({ label, value, ok }: { label: string; value: number | string; ok: boolean }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2 h-2 rounded-full ${ok ? 'bg-warn-normal' : 'bg-yellow-400'}`} />
        <span className="text-xs uppercase tracking-widest text-white/40">{label}</span>
      </div>
      <p className="text-4xl font-bold text-white tabular-nums">{value}</p>
    </div>
  );
}

function Step({ done, label, to }: { done: boolean; label: string; to: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 group">
      <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs flex-shrink-0 transition-colors
        ${done ? 'bg-warn-normal border-warn-normal text-black' : 'border-white/20 text-transparent group-hover:border-white/40'}`}>✓</span>
      <span className={`text-sm transition-colors ${done ? 'text-white/40 line-through' : 'text-white group-hover:text-pb-blue-light'}`}>
        {label}
      </span>
    </Link>
  );
}
