import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { PegelBoardMark, type MarkStatus } from './PegelBoardMark';

interface SunInfo {
  sunrise: string;
  sunset: string;
  now: string;
}

interface SourceStatus {
  source_key: string;
  last_ok: string | null;
}

interface StatusResponse {
  sources: SourceStatus[];
  poll_interval_ms: number;
}

interface TopBarProps {
  wsConnected: boolean;
  onThemeChange?: (theme: 'dark' | 'light') => void;
  daynightMode?: string; // 'auto' | 'dark' | 'light'
  markStatus?: MarkStatus;
  logo?: string; // base64 logo from public config
}

function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="text-2xl font-black tabular-nums tracking-tight" style={{ color: 'var(--theme-text)' }}>
      {time.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} Uhr
    </span>
  );
}

export default function TopBar({ wsConnected, onThemeChange, daynightMode = 'auto', markStatus, logo }: TopBarProps) {
  const [stale, setStale] = useState(false);

  // Daynight-mode: fetch sun times to auto-switch theme
  useEffect(() => {
    const applyAutoTheme = (s: SunInfo) => {
      if (daynightMode === 'auto') {
        const now = Date.now();
        const rise = new Date(s.sunrise).getTime();
        const set = new Date(s.sunset).getTime();
        const theme = now >= rise && now < set ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        onThemeChange?.(theme);
      }
    };
    const load = () => api.get<SunInfo>('/api/sun').then(applyAutoTheme).catch(() => {});
    load();
    const t = setInterval(load, 60 * 60 * 1000);
    return () => clearInterval(t);
  }, [daynightMode, onThemeChange]);

  useEffect(() => {
    if (daynightMode === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      onThemeChange?.('dark');
    } else if (daynightMode === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      onThemeChange?.('light');
    }
  }, [daynightMode, onThemeChange]);

  useEffect(() => {
    const checkStatus = () => {
      api.get<StatusResponse>('/api/status').then(({ sources, poll_interval_ms }) => {
        const pegelonline = sources.find((s) => s.source_key === 'pegelonline');
        const threshold = Date.now() - poll_interval_ms;
        const isStale =
          !pegelonline?.last_ok ||
          new Date(pegelonline.last_ok).getTime() < threshold;
        setStale(isStale);
      }).catch(() => setStale(true));
    };
    checkStatus();
    const t = setInterval(checkStatus, 30_000);
    return () => clearInterval(t);
  }, []);

  const derivedStatus: MarkStatus = stale ? 'alarm' : 'live';
  const effectiveStatus: MarkStatus = markStatus ?? derivedStatus;

  return (
    <header
      className="glass rounded-2xl flex items-center px-5 py-3 flex-shrink-0 gap-4"
      style={{ gridArea: 'top' }}
    >
      {/* Links: blinder Admin-Link (PegelBoard-Wortmarke) */}
      <div className="flex-1">
        <Link
          to="/admin"
          className="flex items-center gap-3 w-fit"
          style={{ textDecoration: 'none' }}
        >
          <PegelBoardMark status={effectiveStatus} size={36} />
          <span
            style={{
              fontFamily: "Helvetica, 'Helvetica Neue', Arial, sans-serif",
              fontSize: '1.35rem',
              letterSpacing: '-0.015em',
              lineHeight: 1,
            }}
          >
            <span style={{ fontWeight: 700, color: 'var(--theme-text)' }}>Pegel</span>
            <span style={{ fontWeight: 300, color: 'var(--theme-text-muted)' }}>Board</span>
          </span>
        </Link>
      </div>

      {/* Mitte: Logo (falls konfiguriert) */}
      <div className="flex-1 flex justify-center">
        {logo && (
          <img
            src={logo}
            alt="Logo"
            style={{ maxHeight: '40px', maxWidth: '160px', objectFit: 'contain' }}
          />
        )}
      </div>

      {/* Rechts: Datenstatus-Badge + Uhr */}
      <div className="flex items-center gap-4 flex-1 justify-end">
        {stale ? (
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-warn-alarm)' }}>
            <div className="w-2 h-2 rounded-full animate-pulse-glow" style={{ backgroundColor: 'var(--color-warn-alarm)' }} />
            <span>Daten veraltet</span>
          </div>
        ) : !wsConnected ? (
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-warn-elevated)' }}>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-warn-elevated)' }} />
            <span>Offline</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-warn-normal)' }}>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-warn-normal)' }} />
            <span>Aktuell</span>
          </div>
        )}
        <Clock />
      </div>
    </header>
  );
}
