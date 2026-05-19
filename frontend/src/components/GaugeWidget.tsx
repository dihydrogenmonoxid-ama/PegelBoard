import { useCallback, useEffect, useState } from 'react';
import {
  AreaChart, Area, Line, ComposedChart, ResponsiveContainer, ReferenceLine,
  XAxis, YAxis,
} from 'recharts';
import { api } from '../api';

// ── Types ──────────────────────────────────────────────────────────────────

interface DbStation {
  id: number;
  station_id: string;
  name: string;
  river: string | null;
  latitude: number | null;
  longitude: number | null;
  warning_low: number | null;
  warning_medium: number | null;
  warning_high: number | null;
  warning_extreme: number | null;
  simulate_alarm: number;
  default_history_hours: number;
}

export interface GaugeReading {
  stationId: string;
  name: string;
  river: string | null;
  latitude: number | null;
  longitude: number | null;
  value: number | null;
  waterTemp: number | null;
  trend: number | null;
  unit: string;
  ts: string | null;
  warnLevel: 'normal' | 'elevated' | 'critical' | 'alarm';
  simulateAlarm: boolean;
  thresholds: { low: number | null; medium: number | null; high: number | null; extreme: number | null };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function getWarnLevel(value: number | null, s: DbStation): GaugeReading['warnLevel'] {
  if (value == null) return 'normal';
  if (s.warning_extreme != null && value >= s.warning_extreme) return 'alarm';
  if (s.warning_high    != null && value >= s.warning_high)    return 'critical';
  if (s.warning_medium  != null && value >= s.warning_medium)  return 'elevated';
  return 'normal';
}

const WARN_COLOR: Record<GaugeReading['warnLevel'], string> = {
  normal:   'var(--color-warn-normal)',
  elevated: 'var(--color-warn-elevated)',
  critical: 'var(--color-warn-critical)',
  alarm:    'var(--color-warn-alarm)',
};

const TREND_ICON: Record<string, string> = { '-1': '↓', '0': '→', '1': '↑' };

// ── Main widget ────────────────────────────────────────────────────────────

interface Props {
  onReadingsChange?: (readings: GaugeReading[]) => void;
  liveUpdates?: Map<string, number>;
}

export default function GaugeWidget({ onReadingsChange, liveUpdates }: Props) {
  const [stations, setStations] = useState<DbStation[]>([]);
  const [readings, setReadings] = useState<Map<string, GaugeReading>>(new Map());
  const [lhpAlerts, setLhpAlerts] = useState<LhpAlert[]>([]);

  useEffect(() => {
    api.get<DbStation[]>('/api/gauges/configured').then(setStations).catch(() => {});
  }, []);

  useEffect(() => {
    const load = () => api.get<LhpAlert[]>('/api/warnings/lhp').then(setLhpAlerts).catch(() => {});
    load();
    const t = setInterval(load, 5 * 60_000);
    return () => clearInterval(t);
  }, []);

  const fetchAll = useCallback(async (stns: DbStation[]) => {
    const updated = new Map<string, GaugeReading>();
    await Promise.all(
      stns.map(async (s) => {
        try {
          const data = await api.get<{
            timeseries?: Array<{
              shortname: string;
              unit: string;
              currentMeasurement?: { value: number; trend: number; timestamp: string };
            }>;
          }>(`/api/gauges/${s.station_id}/current`);

          const ts   = data.timeseries?.find((t) => t.shortname === 'W');
          const tsWT = data.timeseries?.find((t) => t.shortname === 'WT' || t.shortname === 'T');
          const value = ts?.currentMeasurement?.value ?? null;

          const simulateAlarm = !!s.simulate_alarm;
          updated.set(s.station_id, {
            stationId: s.station_id,
            name:      s.name,
            river:     s.river,
            latitude:  s.latitude,
            longitude: s.longitude,
            value,
            waterTemp: tsWT?.currentMeasurement?.value ?? null,
            trend:     ts?.currentMeasurement?.trend ?? null,
            unit:      ts?.unit ?? 'cm',
            ts:        ts?.currentMeasurement?.timestamp ?? null,
            warnLevel: simulateAlarm ? 'alarm' : getWarnLevel(value, s),
            simulateAlarm,
            thresholds: {
              low:     s.warning_low,
              medium:  s.warning_medium,
              high:    s.warning_high,
              extreme: s.warning_extreme,
            },
          });
        } catch { /* Station vorübergehend nicht erreichbar */ }
      })
    );
    setReadings(new Map(updated));
  }, []);

  useEffect(() => {
    if (stations.length === 0) return;
    fetchAll(stations);
  }, [stations, fetchAll]);

  // Apply live WebSocket updates
  useEffect(() => {
    if (!liveUpdates || liveUpdates.size === 0) return;
    setReadings((prev) => {
      const next = new Map(prev);
      liveUpdates.forEach((value, stationId) => {
        const existing = next.get(stationId);
        if (existing) {
          const s = stations.find((st) => st.station_id === stationId);
          next.set(stationId, {
            ...existing,
            value,
            warnLevel: existing.simulateAlarm ? 'alarm' : (s ? getWarnLevel(value, s) : existing.warnLevel),
          });
        }
      });
      return next;
    });
  }, [liveUpdates, stations]);

  useEffect(() => {
    onReadingsChange?.(Array.from(readings.values()));
  }, [readings, onReadingsChange]);

  const list = Array.from(readings.values());

  if (stations.length === 0) {
    return (
      <div className="glass rounded-2xl h-full flex flex-col items-center justify-center gap-2">
        <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--theme-text-faint)' }}>Pegel</p>
        <p className="text-sm" style={{ color: 'var(--theme-text-faint)' }}>Keine Stationen konfiguriert</p>
        <a href="/admin/stations" className="text-xs hover:opacity-80 transition-opacity" style={{ color: 'var(--color-pb-blue-light)' }}>
          → Admin
        </a>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl h-full flex flex-col overflow-hidden">
      <div className="px-4 pt-3 pb-2 border-b flex-shrink-0" style={{ borderColor: 'var(--theme-border)' }}>
        <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--theme-text-muted)' }}>
          Pegelstände
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {list.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <div className="w-5 h-5 border-2 rounded-full animate-spin"
              style={{ borderColor: 'var(--theme-border)', borderTopColor: 'var(--theme-text-muted)' }} />
          </div>
        )}
        {list.map((r) => {
          const stationObj = stations.find((s) => s.station_id === r.stationId) ?? null;
          const riverAlerts = r.river
            ? lhpAlerts.filter((a) => !a.river || a.river.toLowerCase() === r.river!.toLowerCase())
            : [];
          return (
            <GaugeRow
              key={r.stationId}
              reading={r}
              station={stationObj}
              lhpAlerts={riverAlerts}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── GaugeRow ───────────────────────────────────────────────────────────────

type SparklineHours = 24 | 48 | 168;

interface HistoryPoint { timestamp: string; value: number }
interface ForecastPoint { timestamp: string; value: number }
interface LhpAlert { id: string; severity: number; headline: string; river?: string }

interface GaugeRowProps {
  reading: GaugeReading;
  station: DbStation | null;
  lhpAlerts: LhpAlert[];
}

function GaugeRow({ reading: r, station, lhpAlerts }: GaugeRowProps) {
  const hours = (station?.default_history_hours ?? 168) as SparklineHours;
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [forecast, setForecast] = useState<ForecastPoint[]>([]);
  const color = WARN_COLOR[r.warnLevel];
  const trend = r.trend != null ? (TREND_ICON[String(r.trend)] ?? '→') : '—';

  useEffect(() => {
    api.get<HistoryPoint[]>(`/api/gauges/${r.stationId}/history?hours=${hours}`)
      .then(setHistory)
      .catch(() => {});
    api.get<ForecastPoint[]>(`/api/gauges/${r.stationId}/forecast`)
      .then(setForecast)
      .catch(() => {});
  }, [r.stationId, hours]);

  // Δ cm/h: compare current value vs reading closest to 60 min ago
  const deltaPerHour = (() => {
    if (r.value == null || history.length < 2) return null;
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const closest = history.reduce((best, pt) => {
      const diff = Math.abs(new Date(pt.timestamp).getTime() - oneHourAgo);
      const bestDiff = Math.abs(new Date(best.timestamp).getTime() - oneHourAgo);
      return diff < bestDiff ? pt : best;
    });
    return r.value - closest.value;
  })();

  return (
    <div
      className="border-b last:border-0"
      style={{ borderColor: 'var(--theme-border)' }}
    >
      <div className="px-4 pt-3 pb-1">
        {/* Top row: dot + name + value + trend */}
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--theme-text)' }}>{r.name}</p>
            {r.river && (
              <p className="text-xs truncate" style={{ color: 'var(--theme-text-muted)' }}>{r.river}</p>
            )}
          </div>
          <div className="flex items-baseline gap-1 flex-shrink-0">
            <span className="text-2xl font-bold tabular-nums" style={{ color }}>
              {r.value != null ? r.value.toFixed(0) : '—'}
            </span>
            <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{r.unit}</span>
            <span className="text-lg ml-0.5" style={{ color }}>{trend}</span>
          </div>
        </div>

        {/* Secondary row: water temp + Δ cm/h */}
        {(r.waterTemp != null || deltaPerHour != null) && (
          <div className="flex gap-3 mt-0.5 ml-5.5 text-xs" style={{ color: 'var(--theme-text-muted)' }}>
            {r.waterTemp != null && <span>🌡 {r.waterTemp.toFixed(1)} °C</span>}
            {deltaPerHour != null && (
              <span style={{ color: Math.abs(deltaPerHour) > 10 ? 'var(--color-warn-critical)' : 'inherit' }}>
                {deltaPerHour >= 0 ? '+' : ''}{deltaPerHour.toFixed(1)} cm/h
              </span>
            )}
          </div>
        )}
      </div>

      {/* LHP Hochwasserwarnungen */}
      {lhpAlerts.length > 0 && (
        <div className="px-4 pb-2 flex flex-col gap-0.5">
          {lhpAlerts.map((a) => {
            const color = a.severity >= 4 ? 'var(--color-warn-alarm)'
              : a.severity === 3 ? 'var(--color-warn-critical)'
              : a.severity === 2 ? 'var(--color-warn-elevated)'
              : 'var(--color-warn-normal)';
            return (
              <div key={a.id} className="flex items-start gap-1.5 text-xs"
                style={{ borderLeft: `2px solid ${color}`, paddingLeft: 6 }}>
                <span className="truncate" style={{ color: 'var(--theme-text)' }}>{a.headline}</span>
              </div>
            );
          })}
          <span className="text-xs mt-0.5" style={{ color: 'var(--theme-text-faint)' }}>© LHP</span>
        </div>
      )}

      {/* Sparkline */}
      {history.length > 2 && (() => {
        const histSet = new Set(history.map((p) => p.timestamp));
        const chartData = [
          ...history.map((p) => ({ timestamp: p.timestamp, value: p.value, fc: undefined as number | undefined })),
          ...forecast.filter((p) => !histSet.has(p.timestamp)).map((p) => ({ timestamp: p.timestamp, value: undefined as number | undefined, fc: p.value })),
        ];
        return (
          <div className="px-4 pb-3">
            <div style={{ width: '100%', height: 52 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
                  <defs>
                    <linearGradient id={`sg-${r.stationId}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={color} stopOpacity={0.5} />
                      <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="timestamp" hide />
                  <YAxis domain={['auto', 'auto']} hide />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    fill={`url(#sg-${r.stationId})`}
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                    connectNulls={false}
                  />
                  {forecast.length > 0 && (
                    <Line
                      type="monotone"
                      dataKey="fc"
                      stroke={color}
                      strokeWidth={1.5}
                      strokeDasharray="4 2"
                      strokeOpacity={0.6}
                      dot={false}
                      isAnimationActive={false}
                      connectNulls={false}
                    />
                  )}
                  {/* HQ100-Linie (warning_extreme) */}
                  {station?.warning_extreme != null && (
                    <ReferenceLine
                      y={station.warning_extreme}
                      stroke="var(--color-warn-alarm)"
                      strokeDasharray="4 2"
                      strokeWidth={1}
                      label={{ value: 'HQ100', fill: 'var(--color-warn-alarm)', fontSize: 9, position: 'insideTopLeft' }}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
