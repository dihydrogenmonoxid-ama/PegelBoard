import { useEffect, useState } from 'react';
import { api } from '../api';

interface SunInfo {
  sunrise: string;
  sunset: string;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr';
}

export default function SunWidget() {
  const [sun, setSun] = useState<SunInfo | null>(null);

  useEffect(() => {
    const load = () => api.get<SunInfo>('/api/sun').then(setSun).catch(() => {});
    load();
    const t = setInterval(load, 60 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  if (!sun) return null;

  return (
    <div
      className="glass rounded-2xl flex-shrink-0 flex items-center justify-around px-4 py-2"
    >
      <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
        <span className="text-xl">🌅</span>
        <div>
          <div className="text-xs" style={{ color: 'var(--theme-text-faint)' }}>Aufgang</div>
          <div className="font-semibold tabular-nums" style={{ color: 'var(--theme-text)' }}>
            {formatTime(sun.sunrise)}
          </div>
        </div>
      </div>
      <div
        className="w-px self-stretch mx-2"
        style={{ backgroundColor: 'var(--theme-border)' }}
      />
      <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
        <span className="text-xl">🌇</span>
        <div>
          <div className="text-xs" style={{ color: 'var(--theme-text-faint)' }}>Untergang</div>
          <div className="font-semibold tabular-nums" style={{ color: 'var(--theme-text)' }}>
            {formatTime(sun.sunset)}
          </div>
        </div>
      </div>
    </div>
  );
}
