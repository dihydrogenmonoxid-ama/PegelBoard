import { useEffect, useState } from 'react';
import { api } from '../api';

// NINA-API ist öffentlich und kostenlos, kein API-Key nötig.
// Sie enthält DWD-Wetterwarnungen, BBK-Katastrophenschutz, Hochwasserwarnungen u.v.m.

interface NinaWarning {
  id: string;
  payload: {
    data: {
      headline: string;
      severity: 'Minor' | 'Moderate' | 'Severe' | 'Extreme';
      msgType: string;
      event: string;
      description?: string;
    };
    sent?: string;
    expires?: string;
  };
  i18nTitle?: Record<string, string>;
}

const SEV_COLOR: Record<string, string> = {
  Minor: '#fbbf24',
  Moderate: '#f97316',
  Severe: '#E30613',
  Extreme: '#9333ea',
};
const SEV_LABEL: Record<string, string> = {
  Minor: 'Vorabinfo',
  Moderate: 'Warnung',
  Severe: 'Schwere Warnung',
  Extreme: 'Extreme Warnung',
};

export default function WarningsWidget() {
  const [warnings, setWarnings] = useState<NinaWarning[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => {
      api.get<NinaWarning[]>('/api/warnings/nina')
        .then((data) => {
          // Nur aktive Warnungen (kein Cancel), nach Schwere sortiert
          const active = data
            .filter((w) => w.payload.data.msgType !== 'Cancel')
            .sort((a, b) => {
              const order = { Extreme: 0, Severe: 1, Moderate: 2, Minor: 3 };
              return (order[a.payload.data.severity] ?? 4) - (order[b.payload.data.severity] ?? 4);
            });
          setWarnings(active);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    };

    load();
    const interval = setInterval(load, 60_000); // jede Minute neu laden
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass rounded-2xl h-full flex flex-col overflow-hidden">
      <div className="px-4 pt-3 pb-2 border-b border-white/5 flex items-center justify-between flex-shrink-0">
        <p className="text-xs uppercase tracking-widest text-white/40">Warnungen</p>
        {warnings.length > 0 && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-warn-alarm/20 text-warn-alarm">
            {warnings.length}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="h-full flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
        )}
        {!loading && warnings.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center gap-1">
            <span className="text-2xl">✓</span>
            <p className="text-white/30 text-sm">Keine aktiven Warnungen</p>
          </div>
        )}
        {warnings.map((w) => (
          <WarningRow key={w.id} warning={w} />
        ))}
      </div>
    </div>
  );
}

function WarningRow({ warning: w }: { warning: NinaWarning }) {
  const color = SEV_COLOR[w.payload.data.severity] ?? '#fbbf24';
  const label = SEV_LABEL[w.payload.data.severity] ?? w.payload.data.severity;
  const title = w.i18nTitle?.['de-DE'] ?? w.payload.data.headline;

  return (
    <div className="flex gap-3 px-4 py-3 border-b border-white/5 last:border-0">
      <div className="w-1 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: color, minHeight: '1.5rem' }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-semibold" style={{ color }}>{label}</span>
          <span className="text-xs text-white/30">{w.payload.data.event}</span>
        </div>
        <p className="text-sm text-white leading-snug line-clamp-2">{title}</p>
      </div>
    </div>
  );
}
