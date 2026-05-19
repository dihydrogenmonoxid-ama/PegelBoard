import { useEffect, useState } from 'react';
import { api } from '../api';

interface Weather {
  temperature: number | null;
  wind_speed: number | null;
  wind_direction: number | null;
  wind_gust_speed: number | null;
  condition: string | null;
  cloud_cover: number | null;
  relative_humidity: number | null;
  precipitation_60: number | null;
  pressure_msl: number | null;
  visibility: number | null;
}

const CONDITION_ICON: Record<string, string> = {
  dry: '☀', fog: '🌫', rain: '🌧', sleet: '🌨',
  snow: '❄', hail: '🌨', thunderstorm: '⛈',
};

function conditionLabel(c: string | null): string {
  const labels: Record<string, string> = {
    dry: 'Trocken', fog: 'Nebel', rain: 'Regen', sleet: 'Schneeregen',
    snow: 'Schnee', hail: 'Hagel', thunderstorm: 'Gewitter',
  };
  return labels[c ?? ''] ?? '—';
}

function windDir(deg: number | null): string {
  if (deg == null) return '—';
  const dirs = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

function beaufort(kmh: number | null): number {
  if (kmh == null) return 0;
  const thresholds = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118];
  const idx = thresholds.findIndex((t) => kmh < t);
  return idx === -1 ? 12 : idx;
}

const BEAU_LABEL = [
  'Stille', 'Zug', 'Leichte Brise', 'Schwache Brise', 'Mäßige Brise',
  'Frische Brise', 'Starker Wind', 'Steifer Wind', 'Stürmischer Wind',
  'Sturm', 'Starker Sturm', 'Orkanartiger Sturm', 'Orkan',
];

export default function WeatherWidget() {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [station, setStation] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    const load = () => {
      api.get<{ weather: Weather; sources: Array<{ station_name: string }> }>('/api/weather')
        .then((d) => { setWeather(d.weather); setStation(d.sources[0]?.station_name ?? ''); })
        .catch(() => setError(true));
    };
    load();
    const t = setInterval(load, 5 * 60_000);
    return () => clearInterval(t);
  }, []);

  if (error) return (
    <div className="glass rounded-2xl h-full flex items-center justify-center">
      <p className="text-xs" style={{ color: 'var(--theme-text-faint)' }}>Wetter nicht verfügbar</p>
    </div>
  );

  if (!weather) return (
    <div className="glass rounded-2xl h-full flex items-center justify-center">
      <div className="w-5 h-5 border-2 rounded-full animate-spin"
        style={{ borderColor: 'var(--theme-border)', borderTopColor: 'var(--theme-text-muted)' }} />
    </div>
  );

  const icon = CONDITION_ICON[weather.condition ?? ''] ?? '☁';
  const bft = beaufort(weather.wind_speed);
  const bftColor = bft <= 3 ? 'var(--color-warn-normal)'
    : bft <= 5 ? 'var(--color-warn-elevated)'
    : bft <= 7 ? 'var(--color-warn-critical)'
    : 'var(--color-warn-alarm)';

  return (
    <div className="glass rounded-2xl h-full flex flex-col p-4 gap-3 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--theme-text-muted)' }}>Wetter</p>
        {station && <p className="text-xs truncate max-w-32" style={{ color: 'var(--theme-text-faint)' }}>{station}</p>}
      </div>

      {/* Temperature + Condition + Compass */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Temp & condition */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-3xl flex-shrink-0">{icon}</span>
          <div className="min-w-0">
            <p className="text-3xl font-bold tabular-nums leading-none" style={{ color: 'var(--theme-text)' }}>
              {weather.temperature != null ? `${weather.temperature.toFixed(1)}°` : '—'}
            </p>
            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--theme-text-muted)' }}>{conditionLabel(weather.condition)}</p>
          </div>
        </div>

        {/* Compass rose */}
        <div className="relative w-16 h-16 flex-shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full" style={{ opacity: 0.25 }}>
            <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="1.5" />
            {['N', 'O', 'S', 'W'].map((d, i) => (
              <text key={d} x="50" y="50" fill="currentColor" fontSize="12" textAnchor="middle" dominantBaseline="central"
                transform={`rotate(${i * 90} 50 50) translate(0 -36)`}>{d}</text>
            ))}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center transition-transform duration-500"
            style={{ transform: `rotate(${(weather.wind_direction ?? 0) + 180}deg)` }}>
            <svg viewBox="0 0 24 24" className="w-7 h-7" style={{ color: bftColor }}>
              <path d="M12 2 L8 18 L12 15 L16 18 Z" fill="currentColor" />
            </svg>
          </div>
        </div>
      </div>

      {/* Wind row */}
      <div className="flex-shrink-0 rounded-xl px-3 py-2" style={{ background: 'var(--theme-bg)', border: '1px solid var(--theme-border)' }}>
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>Wind</span>
          <span className="text-sm font-bold tabular-nums" style={{ color: bftColor }}>
            {weather.wind_speed != null ? `${weather.wind_speed.toFixed(0)} km/h` : '—'}
            <span className="text-xs ml-1" style={{ color: 'var(--theme-text-faint)' }}>{windDir(weather.wind_direction)}</span>
          </span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-xs" style={{ color: 'var(--theme-text-faint)' }}>{BEAU_LABEL[bft]} (Bft {bft})</span>
          {weather.wind_gust_speed != null && (
            <span className="text-xs" style={{ color: 'var(--theme-text-faint)' }}>
              Böen {weather.wind_gust_speed.toFixed(0)} km/h
            </span>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-1.5 flex-1 content-start">
        <Stat label="Feuchte" value={weather.relative_humidity != null ? `${weather.relative_humidity.toFixed(0)} %` : '—'} />
        <Stat label="Niederschlag" value={weather.precipitation_60 != null ? `${weather.precipitation_60.toFixed(1)} mm` : '—'} sub="60 min" />
        <Stat label="Luftdruck" value={weather.pressure_msl != null ? `${weather.pressure_msl.toFixed(0)} hPa` : '—'} />
        <Stat label="Sichtweite" value={weather.visibility != null ? `${(weather.visibility / 1000).toFixed(1)} km` : '—'} />
      </div>

      {/* Attribution */}
      <p className="text-xs flex-shrink-0" style={{ color: 'var(--theme-text-faint)' }}>
        Quelle: Brightsky / © DWD
      </p>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl px-3 py-2" style={{ background: 'var(--theme-bg)', border: '1px solid var(--theme-border)' }}>
      <p className="text-xs" style={{ color: 'var(--theme-text-faint)' }}>{label}</p>
      <p className="text-sm font-semibold tabular-nums" style={{ color: 'var(--theme-text)' }}>{value}</p>
      {sub && <p className="text-xs" style={{ color: 'var(--theme-text-faint)' }}>{sub}</p>}
    </div>
  );
}
