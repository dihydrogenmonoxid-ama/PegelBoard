import { useEffect, useState } from 'react';
import { api } from '../api';

interface ForecastHour {
  timestamp: string;
  temperature: number | null;
  wind_speed: number | null;
  wind_direction: number | null;
  condition: string | null;
  precipitation_60: number | null;
}

const CONDITION_EMOJI: Record<string, string> = {
  dry: '☀️',
  fog: '🌫️',
  rain: '🌧️',
  sleet: '🌨️',
  snow: '❄️',
  hail: '🌩️',
  thunderstorm: '⛈️',
};

function formatHour(iso: string) {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

export default function ForecastWidget() {
  const [hours, setHours] = useState<ForecastHour[]>([]);

  useEffect(() => {
    const load = () => {
      api.get<ForecastHour[]>('/api/weather/forecast?hours=12').then((data) => {
        // Pick one entry per hour
        const seen = new Set<string>();
        const filtered = data.filter((h) => {
          const key = new Date(h.timestamp).toISOString().slice(0, 13);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setHours(filtered.slice(0, 6));
      }).catch(() => {});
    };
    load();
    const t = setInterval(load, 30 * 60_000);
    return () => clearInterval(t);
  }, []);

  if (hours.length === 0) return null;

  return (
    <div className="glass rounded-xl p-2 flex-shrink-0">
      <p className="text-xs font-bold mb-1.5 px-1" style={{ color: 'var(--color-pb-blue-light)' }}>VORHERSAGE</p>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${hours.length}, 1fr)` }}>
        {hours.map((h) => (
          <div key={h.timestamp} className="flex flex-col items-center gap-0.5 text-center">
            <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{formatHour(h.timestamp)}</span>
            <span className="text-base leading-none">{CONDITION_EMOJI[h.condition ?? ''] ?? '–'}</span>
            <span className="text-xs font-bold" style={{ color: 'var(--theme-text)' }}>
              {h.temperature != null ? `${Math.round(h.temperature)}°` : '–'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
