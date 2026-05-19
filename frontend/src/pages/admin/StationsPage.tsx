import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../../api';

interface Station {
  id: number; station_id: string; name: string; river: string | null;
  latitude: number | null; longitude: number | null;
  warning_low: number | null; warning_medium: number | null;
  warning_high: number | null; warning_extreme: number | null;
  simulate_alarm: number; sort_order: number; default_history_hours: number;
}
interface SearchResult { uuid: string; longname: string; shortname: string; water: { longname: string }; km: number; agency: string; latitude: number; longitude: number; }
interface CharacteristicValue { shortname: string; longname: string; unit: string; value: number; }

const input = 'bg-white/5 border border-white/10 rounded-lg px-3 h-9 text-white text-sm outline-none focus:border-pb-blue-light/60 transition-colors w-full';

const HISTORY_OPTIONS = [
  { value: 24,  label: '24 h' },
  { value: 48,  label: '48 h' },
  { value: 72,  label: '72 h' },
  { value: 168, label: '7 Tage' },
];

export default function StationsPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<Station>>({});
  const [feedback, setFeedback] = useState('');
  const [fetchingThresholds, setFetchingThresholds] = useState<number | null>(null);

  const load = useCallback(() => { api.get<Station[]>('/api/admin/stations').then(setStations).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);

  const simulationActive = stations.some((s) => s.simulate_alarm);

  async function toggleSimulation() {
    await api.patch('/api/admin/stations/simulate-alarm', { active: !simulationActive });
    load();
  }

  async function search() {
    if (!query.trim()) return;
    setSearching(true);
    try { setResults(await api.get<SearchResult[]>(`/api/admin/stations/search?q=${encodeURIComponent(query)}`)); }
    finally { setSearching(false); }
  }

  async function addStation(r: SearchResult) {
    try {
      await api.post('/api/admin/stations', { station_id: r.uuid, name: r.longname, river: r.water.longname, latitude: r.latitude, longitude: r.longitude });
      setFeedback(`„${r.longname}" hinzugefügt`);
      setShowModal(false); setResults([]); setQuery(''); load();
    } catch (err) { setFeedback(err instanceof ApiError ? err.message : 'Fehler'); }
  }

  async function saveThresholds(id: number) {
    await api.put(`/api/admin/stations/${id}`, editData);
    setEditId(null); load();
  }

  async function fetchThresholds(id: number) {
    setFetchingThresholds(id);
    try {
      const res = await api.post<{ thresholds: CharacteristicValue[] }>(`/api/admin/stations/${id}/fetch-thresholds`, {});
      const vals = res.thresholds;
      // Map known shortnames to warning levels
      const find = (names: string[]) => vals.find((v) => names.some(n => v.shortname.toLowerCase().includes(n.toLowerCase())))?.value ?? null;
      setEditData((d) => ({
        ...d,
        warning_low:    find(['MNW', 'NNW']) ?? d.warning_low,
        warning_medium: find(['MW', 'MHW'])  ?? d.warning_medium,
        warning_high:   find(['HSW', 'HHW']) ?? d.warning_high,
        warning_extreme: find(['HQ', 'HQ100', 'Alarm']) ?? d.warning_extreme,
      }));
      setFeedback(`${vals.length} Richtwerte gefunden`);
    } catch { setFeedback('Richtwerte nicht abrufbar'); }
    finally { setFetchingThresholds(null); }
  }

  async function moveStation(idx: number, dir: -1 | 1) {
    const newList = [...stations];
    const target = idx + dir;
    if (target < 0 || target >= newList.length) return;
    [newList[idx], newList[target]] = [newList[target], newList[idx]];
    setStations(newList);
    await api.patch('/api/admin/stations/reorder', { orderedIds: newList.map((s) => s.id) });
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Pegelstationen</h1>
          <p className="text-white/40 text-sm mt-1">{stations.length} konfiguriert</p>
        </div>
        <button onClick={() => setShowModal(true)} className="h-9 px-4 rounded-xl bg-pb-signal text-white text-sm font-medium hover:bg-pb-signal/80 transition-colors">+ Station hinzufügen</button>
      </div>

      {/* Simulation */}
      <div className="glass rounded-2xl px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white">Simulation Warnmodus</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-faint)' }}>Aktiviert den Alarmmodus auf dem Dashboard</p>
        </div>
        <button type="button" onClick={toggleSimulation} disabled={stations.length === 0}
          className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ml-6 disabled:opacity-30 ${simulationActive ? 'bg-warn-alarm' : 'bg-white/10'}`}>
          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${simulationActive ? 'left-6' : 'left-1'}`} />
        </button>
      </div>

      {feedback && <p className="text-sm text-green-400 bg-green-400/10 rounded-lg px-4 py-2.5 cursor-pointer" onClick={() => setFeedback('')}>{feedback}</p>}

      <div className="glass rounded-2xl overflow-hidden">
        {stations.length === 0
          ? <div className="p-12 text-center text-white/30 text-sm">Noch keine Stationen konfiguriert.</div>
          : <table className="w-full text-sm">
              <thead><tr className="border-b border-white/5 text-white/40 text-xs uppercase tracking-wider">
                <th className="px-3 py-3 w-16 text-center">Reihenf.</th>
                <th className="text-left px-4 py-3">Station</th>
                <th className="text-left px-4 py-3">Gewässer</th>
                <th className="text-right px-4 py-3">Warnstufen cm</th>
                <th className="text-center px-4 py-3">Verlauf</th>
                <th className="px-4 py-3" />
              </tr></thead>
              <tbody>
                {stations.map((s, idx) => (
                  <tr key={s.id} className="border-b border-white/5 last:border-0">
                    {/* Sort order */}
                    <td className="px-3 py-3">
                      <div className="flex flex-col items-center gap-0.5">
                        <button onClick={() => moveStation(idx, -1)} disabled={idx === 0}
                          className="text-white/30 hover:text-white disabled:opacity-20 text-xs leading-none transition-colors">▲</button>
                        <button onClick={() => moveStation(idx, 1)} disabled={idx === stations.length - 1}
                          className="text-white/30 hover:text-white disabled:opacity-20 text-xs leading-none transition-colors">▼</button>
                      </div>
                    </td>
                    <td className="px-4 py-3"><p className="font-medium text-white">{s.name}</p><p className="text-white/30 text-xs font-mono">{s.station_id.slice(0, 8)}…</p></td>
                    <td className="px-4 py-3 text-white/60">{s.river ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      {editId === s.id
                        ? <div className="flex flex-col gap-2">
                            <div className="flex gap-2 justify-end">
                              {(['warning_low','warning_medium','warning_high','warning_extreme'] as const).map((k, i) => (
                                <input key={k} type="number" placeholder={['Low','Mid','High','Ext'][i]}
                                  value={editData[k] ?? ''} onChange={(e) => setEditData((d) => ({ ...d, [k]: e.target.value ? Number(e.target.value) : null }))}
                                  className="w-16 bg-white/5 border border-white/10 rounded px-2 h-7 text-xs text-white text-right outline-none focus:border-pb-blue-light/60" />
                              ))}
                            </div>
                            <button onClick={() => fetchThresholds(s.id)} disabled={fetchingThresholds === s.id}
                              className="text-xs px-3 h-6 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-colors self-end">
                              {fetchingThresholds === s.id ? '…' : '⬇ Richtwerte abrufen'}
                            </button>
                          </div>
                        : <span className="text-white/40 text-xs tabular-nums">{[s.warning_low,s.warning_medium,s.warning_high,s.warning_extreme].map((v) => v ?? '—').join(' / ')}</span>
                      }
                    </td>
                    {/* History hours */}
                    <td className="px-4 py-3 text-center">
                      {editId === s.id
                        ? <select value={editData.default_history_hours ?? s.default_history_hours}
                            onChange={(e) => setEditData((d) => ({ ...d, default_history_hours: Number(e.target.value) }))}
                            className="bg-white/5 border border-white/10 rounded px-2 h-7 text-xs text-white outline-none focus:border-pb-blue-light/60">
                            {HISTORY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        : <span className="text-white/40 text-xs">{HISTORY_OPTIONS.find((o) => o.value === s.default_history_hours)?.label ?? '7 Tage'}</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        {editId === s.id
                          ? <><button onClick={() => saveThresholds(s.id)} className="text-xs px-3 h-7 rounded-lg bg-green-400/20 text-green-400 hover:bg-green-400/30 transition-colors">Speichern</button>
                              <button onClick={() => setEditId(null)} className="text-xs px-3 h-7 rounded-lg bg-white/5 text-white/40 hover:text-white transition-colors">Abbruch</button></>
                          : <><button onClick={() => { setEditId(s.id); setEditData({ warning_low: s.warning_low, warning_medium: s.warning_medium, warning_high: s.warning_high, warning_extreme: s.warning_extreme, default_history_hours: s.default_history_hours }); }}
                              className="text-xs px-3 h-7 rounded-lg bg-white/5 text-white/60 hover:text-white transition-colors">Bearbeiten</button>
                              <button onClick={async () => { if (confirm(`„${s.name}" entfernen?`)) { await api.del(`/api/admin/stations/${s.id}`); load(); } }}
                                className="text-xs px-3 h-7 rounded-lg bg-white/5 text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-colors">Entfernen</button></>
                        }
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="glass rounded-2xl p-6 w-full max-w-lg flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-white">Station suchen (PEGELONLINE)</h2>
            <div className="flex gap-2">
              <input className={input} type="text" placeholder="Name, Gewässer …" value={query}
                onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} />
              <button onClick={search} disabled={searching}
                className="px-4 h-9 rounded-lg bg-pb-signal text-white text-sm font-medium hover:bg-pb-signal/80 disabled:opacity-50 transition-colors">
                {searching ? '…' : 'Suchen'}
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto flex flex-col gap-1">
              {results.map((r) => (
                <button key={r.uuid} onClick={() => addStation(r)} className="text-left px-4 py-3 rounded-xl hover:bg-white/5 transition-colors group">
                  <p className="text-sm font-medium text-white group-hover:text-pb-blue-light transition-colors">{r.longname}</p>
                  <p className="text-xs text-white/40">{r.water.longname} · km {r.km} · {r.agency}</p>
                </button>
              ))}
              {results.length === 0 && query && !searching && <p className="text-sm text-white/30 text-center py-6">Keine Ergebnisse</p>}
            </div>
            <button onClick={() => setShowModal(false)} className="text-sm text-white/40 hover:text-white transition-colors self-end">Schließen</button>
          </div>
        </div>
      )}
    </div>
  );
}
