import { useEffect, useState } from 'react';
import { api } from '../api';

// ── Types ──────────────────────────────────────────────────────────────────

interface NinaWarning {
  id: string;
  payload: {
    data: {
      headline: string;
      severity: 'Extreme' | 'Severe' | 'Moderate' | 'Minor';
      msgType: string;
      event?: string;
    };
  };
}

interface DwdWarning {
  headline: string;
  severity: number; // 0-4
  regionName: string;
  event?: string;
  end?: number;
}

interface DwdData {
  warnings: Record<string, DwdWarning[]>;
  vorabInformation: Record<string, DwdWarning[]>;
}

interface NewsItem {
  title: string;
}

// ── Severity helpers ───────────────────────────────────────────────────────

const SEVERITY_ORDER: Record<string, number> = {
  Extreme: 4, Severe: 3, Moderate: 2, Minor: 1,
};

const SEVERITY_COLOR: Record<string, string> = {
  Extreme: 'var(--color-warn-alarm)',
  Severe: 'var(--color-warn-alarm)',
  Moderate: 'var(--color-warn-critical)',
  Minor: 'var(--color-warn-elevated)',
};

const DWD_SEVERITY_COLOR = (s: number) =>
  s >= 3 ? 'var(--color-warn-alarm)' : s === 2 ? 'var(--color-warn-critical)' : 'var(--color-warn-elevated)';

// ── Warning section ────────────────────────────────────────────────────────

interface FlatWarning {
  key: string;
  headline: string;
  severity: string;
  color: string;
}

function WarnungenSection() {
  const [warnings, setWarnings] = useState<FlatWarning[]>([]);

  useEffect(() => {
    const load = async () => {
      const flat: FlatWarning[] = [];

      try {
        const nina = await api.get<NinaWarning[]>('/api/warnings/nina');
        for (const w of nina) {
          if (w.payload?.data?.msgType === 'Cancel') continue;
          flat.push({
            key: w.id,
            headline: w.payload.data.headline,
            severity: w.payload.data.severity,
            color: SEVERITY_COLOR[w.payload.data.severity] ?? 'var(--color-warn-elevated)',
          });
        }
      } catch { /* offline */ }

      try {
        const dwd = await api.get<DwdData>('/api/warnings/dwd');
        for (const ws of Object.values(dwd.warnings)) {
          for (const w of ws) {
            flat.push({
              key: `dwd-${w.headline}-${w.regionName}`,
              headline: w.headline,
              severity: w.severity >= 3 ? 'Severe' : w.severity === 2 ? 'Moderate' : 'Minor',
              color: DWD_SEVERITY_COLOR(w.severity),
            });
          }
        }
      } catch { /* offline */ }

      flat.sort((a, b) => (SEVERITY_ORDER[b.severity] ?? 0) - (SEVERITY_ORDER[a.severity] ?? 0));
      setWarnings(flat);
    };

    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col gap-1 overflow-hidden h-full">
      <p className="text-xs font-bold mb-1 flex-shrink-0" style={{ color: 'var(--color-pb-blue-light)' }}>
        WARNUNGEN
      </p>
      {warnings.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--theme-text-faint)' }}>Keine aktiven Warnungen</p>
      ) : (
        warnings.map((w) => (
          <div key={w.key} className="flex items-start gap-2 text-xs overflow-hidden flex-shrink-0"
            style={{ borderLeft: `3px solid ${w.color}`, paddingLeft: '6px' }}>
            <span className="font-bold flex-shrink-0" style={{ color: w.color }}>{w.severity}</span>
            <span className="truncate" style={{ color: 'var(--theme-text)' }}>{w.headline}</span>
          </div>
        ))
      )}
    </div>
  );
}

// ── Nachrichten section ────────────────────────────────────────────────────

function NachrichtenSection() {
  const [items, setItems] = useState<NewsItem[]>([]);

  useEffect(() => {
    const load = () => {
      api.get<NewsItem[]>('/api/news').then(setItems).catch(() => {});
    };
    load();
    const t = setInterval(load, 5 * 60_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col gap-1 overflow-hidden h-full">
      <p className="text-xs font-bold mb-1 flex-shrink-0" style={{ color: 'var(--color-pb-blue-light)' }}>
        NACHRICHTEN
      </p>
      {items.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--theme-text-faint)' }}>Keine Nachrichten</p>
      ) : (
        items.slice(0, 6).map((item, i) => (
          <p key={i} className="text-xs truncate flex-shrink-0" style={{ color: 'var(--theme-text)' }}>
            {item.title}
          </p>
        ))
      )}
    </div>
  );
}

// ── Tagesnachricht section ─────────────────────────────────────────────────

function TagesnachrichtSection({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-1 overflow-hidden h-full">
      <p className="text-xs font-bold mb-1 flex-shrink-0" style={{ color: 'var(--color-pb-blue-light)' }}>
        TAGESNACHRICHT
      </p>
      <p className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>{text}</p>
    </div>
  );
}

// ── BottomBar ──────────────────────────────────────────────────────────────

interface PublicConfig {
  show_news?: string;
  tagesnachricht?: string;
}

interface Einsatzmittel {
  id: number;
  name: string;
  typ: string | null;
  status: string;
  notizen: string | null;
  issi: string | null;
  has_icon: boolean;
}

const EM_STATUS_COLOR: Record<string, string> = {
  'im Einsatz':   'var(--color-warn-elevated)',
  'defekt':       'var(--color-warn-alarm)',
  'außer Dienst': 'var(--theme-text-faint)',
};

function EinsatzmittelSection() {
  const [items, setItems] = useState<Einsatzmittel[]>([]);

  useEffect(() => {
    const load = () => {
      api.get<Einsatzmittel[]>('/api/einsatzmittel').then((all) => {
        setItems(all.filter((e) => e.status !== 'verfügbar'));
      }).catch(() => {});
    };
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col gap-1 overflow-hidden h-full">
      <p className="text-xs font-bold mb-1 flex-shrink-0" style={{ color: 'var(--color-pb-blue-light)' }}>
        EINSATZMITTEL
      </p>
      {items.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--theme-text-faint)' }}>Alle Einsatzmittel verfügbar</p>
      ) : (
        items.map((e) => (
          <div key={e.id} className="flex items-center gap-2 text-xs overflow-hidden flex-shrink-0">
            {e.has_icon && (
              <img src={`/api/einsatzmittel/${e.id}/icon`} alt="" className="w-4 h-4 object-contain flex-shrink-0 rounded" />
            )}
            <span className="truncate flex-1" style={{ color: 'var(--theme-text)' }}>
              {e.name}{e.issi ? ` (ISSI: ${e.issi})` : ''}
            </span>
            <span className="flex-shrink-0 font-semibold" style={{ color: EM_STATUS_COLOR[e.status] ?? 'inherit' }}>
              {e.status}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

export default function BottomBar() {
  const [showNews, setShowNews] = useState(true);
  const [tagesnachricht, setTagesnachricht] = useState('');

  useEffect(() => {
    const load = () => {
      api.get<PublicConfig>('/api/config/public').then((cfg) => {
        setShowNews(cfg.show_news !== 'false');
        setTagesnachricht(cfg.tagesnachricht ?? '');
      }).catch(() => {});
    };
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  const sections = [
    { key: 'warnungen', show: true, content: <WarnungenSection /> },
    { key: 'nachrichten', show: showNews, content: <NachrichtenSection /> },
    { key: 'tagesnachricht', show: !!tagesnachricht, content: <TagesnachrichtSection text={tagesnachricht} /> },
    { key: 'einsatzmittel', show: true, content: <EinsatzmittelSection /> },
  ].filter((s) => s.show);

  return (
    <div
      className="glass rounded-2xl flex-shrink-0"
      style={{
        gridArea: 'bottom',
        display: 'grid',
        gridTemplateColumns: `repeat(${sections.length}, 1fr)`,
        minHeight: '140px',
        maxHeight: '200px',
        overflow: 'hidden',
      }}
    >
      {sections.map((s, i) => (
        <div
          key={s.key}
          className="p-3 overflow-hidden"
          style={i < sections.length - 1 ? { borderRight: '1px solid var(--theme-border)' } : undefined}
        >
          {s.content}
        </div>
      ))}
    </div>
  );
}
