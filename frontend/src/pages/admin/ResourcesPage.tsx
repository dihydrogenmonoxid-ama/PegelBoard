import { useEffect, useRef, useState } from 'react';
import { api } from '../../api';

// ── Einsatzmittel ──────────────────────────────────────────────────────────

interface Einsatzmittel {
  id: number;
  name: string;
  klarname: string | null;
  typ: string | null;
  status: string;
  notizen: string | null;
  sort_order: number;
  issi: string | null;
  has_icon: boolean;
}

const STATUS_OPTIONS = ['verfügbar', 'im Einsatz', 'defekt', 'außer Dienst'];

const STATUS_COLOR: Record<string, string> = {
  'verfügbar':     'var(--color-warn-normal)',
  'im Einsatz':    'var(--color-warn-elevated)',
  'defekt':        'var(--color-warn-alarm)',
  'außer Dienst':  'var(--theme-text-faint)',
};

const EMPTY: Omit<Einsatzmittel, 'id' | 'has_icon'> = {
  name: '', klarname: '', typ: '', status: 'verfügbar', notizen: '', sort_order: 0, issi: '',
};

// ── AAO ───────────────────────────────────────────────────────────────────

interface AaoMittel { einsatzmittel_id: number; reihenfolge: number }
interface AaoStichwort { id: string; label: string; mittel: AaoMittel[] }
interface AaoConfig { stichwoerter: AaoStichwort[] }

function genId() { return Math.random().toString(36).slice(2, 10); }

// ── Main Component ─────────────────────────────────────────────────────────

export default function ResourcesPage() {
  // Einsatzmittel state
  const [items, setItems] = useState<Einsatzmittel[]>([]);
  const [editing, setEditing] = useState<Record<number, Partial<Einsatzmittel>>>({});
  const [newItem, setNewItem] = useState<typeof EMPTY>({ ...EMPTY });
  const [emFeedback, setEmFeedback] = useState('');
  const iconRefs = useRef<Record<number, HTMLInputElement | null>>({});

  // AAO state
  const [aaoConfig, setAaoConfig] = useState<AaoConfig>({ stichwoerter: [] });
  const [aaoSaving, setAaoSaving] = useState(false);
  const [aaoFeedback, setAaoFeedback] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const loadItems = () => {
    api.get<Einsatzmittel[]>('/api/admin/einsatzmittel').then(setItems).catch(() => {});
  };

  useEffect(() => {
    loadItems();
    api.get<AaoConfig>('/api/admin/aao').then(setAaoConfig).catch(() => {});
  }, []);

  // ── Einsatzmittel handlers ───────────────────────────────────────────────

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name.trim()) return;
    try {
      await api.post('/api/admin/einsatzmittel', {
        ...newItem,
        klarname: newItem.klarname || null,
        issi: newItem.issi || null,
      });
      setNewItem({ ...EMPTY });
      loadItems();
      setEmFeedback('Einsatzmittel hinzugefügt.');
    } catch {
      setEmFeedback('Fehler.');
    }
  };

  const handleSave = async (id: number) => {
    try {
      const data = editing[id] ?? {};
      await api.put(`/api/admin/einsatzmittel/${id}`, {
        ...data,
        klarname: data.klarname || null,
        issi: data.issi || null,
      });
      setEditing((prev) => { const n = { ...prev }; delete n[id]; return n; });
      loadItems();
      setEmFeedback('Gespeichert.');
    } catch {
      setEmFeedback('Fehler.');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.del(`/api/admin/einsatzmittel/${id}`);
      loadItems();
    } catch {
      setEmFeedback('Fehler beim Löschen.');
    }
  };

  const handleIconUpload = async (id: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    try {
      await fetch(`/api/admin/einsatzmittel/${id}/icon`, {
        method: 'POST', credentials: 'include', body: form,
      });
      loadItems();
      setEmFeedback('Icon gespeichert.');
    } catch {
      setEmFeedback('Icon-Upload fehlgeschlagen.');
    }
  };

  const handleIconDelete = async (id: number) => {
    try {
      await api.del(`/api/admin/einsatzmittel/${id}/icon`);
      loadItems();
    } catch { /* ignore */ }
  };

  const startEdit = (item: Einsatzmittel) => {
    setEditing((prev) => ({ ...prev, [item.id]: { ...item } }));
  };

  const updateEdit = (id: number, field: keyof Einsatzmittel, value: string | number | null) => {
    setEditing((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  // ── AAO handlers ─────────────────────────────────────────────────────────

  const handleAaoSave = async () => {
    setAaoSaving(true);
    try {
      await api.put('/api/admin/aao', aaoConfig);
      setAaoFeedback('AAO gespeichert.');
    } catch {
      setAaoFeedback('Fehler beim Speichern.');
    } finally {
      setAaoSaving(false);
    }
  };

  const addStichwort = () => {
    if (!newLabel.trim()) return;
    const s: AaoStichwort = { id: genId(), label: newLabel.trim(), mittel: [] };
    setAaoConfig((c) => ({ stichwoerter: [...c.stichwoerter, s] }));
    setExpanded((e) => new Set(e).add(s.id));
    setNewLabel('');
  };

  const deleteStichwort = (id: string) => {
    setAaoConfig((c) => ({ stichwoerter: c.stichwoerter.filter((s) => s.id !== id) }));
  };

  const renameLabel = (id: string, label: string) => {
    setAaoConfig((c) => ({
      stichwoerter: c.stichwoerter.map((s) => s.id === id ? { ...s, label } : s),
    }));
  };

  const toggleMittel = (stichId: string, emId: number) => {
    setAaoConfig((c) => ({
      stichwoerter: c.stichwoerter.map((s) => {
        if (s.id !== stichId) return s;
        const exists = s.mittel.some((m) => m.einsatzmittel_id === emId);
        const mittel = exists
          ? s.mittel.filter((m) => m.einsatzmittel_id !== emId)
          : [...s.mittel, { einsatzmittel_id: emId, reihenfolge: s.mittel.length }];
        return { ...s, mittel };
      }),
    }));
  };

  const moveMittel = (stichId: string, idx: number, dir: -1 | 1) => {
    setAaoConfig((c) => ({
      stichwoerter: c.stichwoerter.map((s) => {
        if (s.id !== stichId) return s;
        const mittel = [...s.mittel];
        const target = idx + dir;
        if (target < 0 || target >= mittel.length) return s;
        [mittel[idx], mittel[target]] = [mittel[target], mittel[idx]];
        return { ...s, mittel: mittel.map((m, i) => ({ ...m, reihenfolge: i })) };
      }),
    }));
  };

  const toggleExpand = (id: string) => {
    setExpanded((e) => {
      const n = new Set(e);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  // ── Styles ────────────────────────────────────────────────────────────────

  const inputStyle = {
    background: 'var(--theme-bg)',
    color: 'var(--theme-text)',
    border: '1px solid var(--theme-border)',
    borderRadius: '6px',
    padding: '4px 8px',
    fontSize: '13px',
    width: '100%',
  };

  const aaoInputStyle = {
    background: 'var(--theme-bg)',
    color: 'var(--theme-text)',
    border: '1px solid var(--theme-border)',
    borderRadius: '6px',
    padding: '4px 8px',
    fontSize: '13px',
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 max-w-5xl flex flex-col gap-5">

      {/* ── Einsatzmittel ── */}
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-bold" style={{ color: 'var(--theme-text)' }}>Einsatzmittel und AAO</h1>

        {/* Add form */}
        <form onSubmit={handleAdd} className="glass rounded-xl p-4">
          <p className="text-xs font-bold mb-3" style={{ color: 'var(--color-pb-blue-light)' }}>NEUES EINSATZMITTEL</p>
          <div className="grid gap-3" style={{ gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr 1fr auto' }}>
            <input placeholder="Name *" value={newItem.name}
              onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
              style={inputStyle} required />
            <input placeholder="Klarname (Funkrufname)" value={newItem.klarname ?? ''}
              onChange={(e) => setNewItem((p) => ({ ...p, klarname: e.target.value }))}
              style={inputStyle} />
            <input placeholder="Typ" value={newItem.typ ?? ''}
              onChange={(e) => setNewItem((p) => ({ ...p, typ: e.target.value }))}
              style={inputStyle} />
            <select value={newItem.status}
              onChange={(e) => setNewItem((p) => ({ ...p, status: e.target.value }))}
              style={inputStyle}>
              {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
            <input placeholder="ISSI" value={newItem.issi ?? ''}
              onChange={(e) => setNewItem((p) => ({ ...p, issi: e.target.value }))}
              style={inputStyle} />
            <input placeholder="Notizen" value={newItem.notizen ?? ''}
              onChange={(e) => setNewItem((p) => ({ ...p, notizen: e.target.value }))}
              style={inputStyle} />
            <button type="submit" className="px-4 rounded-lg text-sm font-semibold"
              style={{ background: 'var(--color-pb-signal)', color: '#fff' }}>
              Hinzufügen
            </button>
          </div>
          {emFeedback && <p className="text-xs mt-2" style={{ color: 'var(--color-warn-normal)' }}>{emFeedback}</p>}
        </form>

        {/* Table */}
        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--theme-border)' }}>
                {['Icon', 'Name', 'Klarname', 'Typ', 'Status', 'ISSI', 'Notizen', ''].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-bold"
                    style={{ color: 'var(--theme-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const ed = editing[item.id];
                return (
                  <tr key={item.id} className="border-b last:border-0" style={{ borderColor: 'var(--theme-border)' }}>
                    {/* Icon */}
                    <td className="px-3 py-2 w-12">
                      {ed ? (
                        <div className="flex flex-col items-center gap-1">
                          {item.has_icon && (
                            <img src={`/api/einsatzmittel/${item.id}/icon`} alt=""
                              className="w-7 h-7 object-contain rounded" />
                          )}
                          <input
                            ref={(el) => { iconRefs.current[item.id] = el; }}
                            type="file" accept="image/*" className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleIconUpload(item.id, f); }}
                          />
                          <button type="button" onClick={() => iconRefs.current[item.id]?.click()}
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{ background: 'var(--theme-border)', color: 'var(--theme-text-muted)', whiteSpace: 'nowrap' }}>
                            {item.has_icon ? '↻' : '+ Icon'}
                          </button>
                          {item.has_icon && (
                            <button type="button" onClick={() => handleIconDelete(item.id)}
                              className="text-xs px-1.5 py-0.5 rounded"
                              style={{ color: 'var(--color-warn-alarm)' }}>✕</button>
                          )}
                        </div>
                      ) : (
                        item.has_icon
                          ? <img src={`/api/einsatzmittel/${item.id}/icon`} alt="" className="w-7 h-7 object-contain rounded" />
                          : <span style={{ color: 'var(--theme-text-faint)', fontSize: 16 }}>—</span>
                      )}
                    </td>
                    {/* Name */}
                    <td className="px-3 py-2">
                      {ed
                        ? <input value={ed.name ?? ''} onChange={(e) => updateEdit(item.id, 'name', e.target.value)} style={inputStyle} />
                        : <span style={{ color: 'var(--theme-text)' }}>{item.name}</span>
                      }
                    </td>
                    {/* Klarname */}
                    <td className="px-3 py-2">
                      {ed
                        ? <input value={ed.klarname ?? ''} onChange={(e) => updateEdit(item.id, 'klarname', e.target.value)} placeholder="Klarname" style={inputStyle} />
                        : <span style={{ color: 'var(--theme-text-muted)' }}>{item.klarname ?? '–'}</span>
                      }
                    </td>
                    {/* Typ */}
                    <td className="px-3 py-2">
                      {ed
                        ? <input value={ed.typ ?? ''} onChange={(e) => updateEdit(item.id, 'typ', e.target.value)} style={inputStyle} />
                        : <span style={{ color: 'var(--theme-text-muted)' }}>{item.typ ?? '–'}</span>
                      }
                    </td>
                    {/* Status */}
                    <td className="px-3 py-2">
                      {ed
                        ? <select value={ed.status ?? 'verfügbar'} onChange={(e) => updateEdit(item.id, 'status', e.target.value)} style={inputStyle}>
                            {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
                          </select>
                        : <span className="font-semibold" style={{ color: STATUS_COLOR[item.status] ?? 'inherit' }}>
                            {item.status}
                          </span>
                      }
                    </td>
                    {/* ISSI */}
                    <td className="px-3 py-2">
                      {ed
                        ? <input value={ed.issi ?? ''} onChange={(e) => updateEdit(item.id, 'issi', e.target.value || null)}
                            placeholder="ISSI" style={{ ...inputStyle, width: '90px' }} />
                        : <span className="font-mono text-xs" style={{ color: 'var(--theme-text-muted)' }}>{item.issi ?? '–'}</span>
                      }
                    </td>
                    {/* Notizen */}
                    <td className="px-3 py-2">
                      {ed
                        ? <input value={ed.notizen ?? ''} onChange={(e) => updateEdit(item.id, 'notizen', e.target.value)} style={inputStyle} />
                        : <span style={{ color: 'var(--theme-text-muted)' }}>{item.notizen ?? '–'}</span>
                      }
                    </td>
                    {/* Actions */}
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        {ed ? (
                          <>
                            <button onClick={() => handleSave(item.id)} className="text-xs px-2 py-1 rounded"
                              style={{ background: 'var(--color-warn-normal)', color: '#fff' }}>✓</button>
                            <button onClick={() => setEditing((p) => { const n = { ...p }; delete n[item.id]; return n; })}
                              className="text-xs px-2 py-1 rounded" style={{ background: 'var(--theme-border)', color: 'var(--theme-text)' }}>✕</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(item)} className="text-xs px-2 py-1 rounded"
                              style={{ background: 'var(--theme-border)', color: 'var(--theme-text)' }}>✎</button>
                            <button onClick={() => handleDelete(item.id)} className="text-xs px-2 py-1 rounded"
                              style={{ background: 'var(--color-warn-alarm)', color: '#fff' }}>✕</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-6 text-center text-sm" style={{ color: 'var(--theme-text-faint)' }}>
                  Keine Einsatzmittel erfasst.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── AAO ── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold" style={{ color: 'var(--theme-text)' }}>Alarm- und Ausrückordnung</h2>
          <div className="flex items-center gap-3">
            {aaoFeedback && <span className="text-xs" style={{ color: 'var(--color-warn-normal)' }}>{aaoFeedback}</span>}
            <button
              onClick={handleAaoSave}
              disabled={aaoSaving}
              className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50"
              style={{ background: 'var(--color-pb-signal)', color: '#fff' }}
            >
              {aaoSaving ? 'Speichern…' : 'AAO speichern'}
            </button>
          </div>
        </div>

        {/* Neues Stichwort */}
        <div className="glass rounded-xl p-4 flex gap-2">
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addStichwort()}
            placeholder="Stichwort (z.B. Hochwasser Stufe 1)"
            style={{ ...aaoInputStyle, flex: 1 }}
          />
          <button
            onClick={addStichwort}
            disabled={!newLabel.trim()}
            className="px-4 rounded-lg text-sm font-semibold disabled:opacity-40"
            style={{ background: 'var(--color-pb-signal)', color: '#fff' }}
          >
            + Stichwort anlegen
          </button>
        </div>

        {/* Stichwort-Liste */}
        {aaoConfig.stichwoerter.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--theme-text-faint)' }}>
            Noch keine Stichwörter angelegt.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {aaoConfig.stichwoerter.map((s) => {
              const isOpen = expanded.has(s.id);
              const assignedIds = new Set(s.mittel.map((m) => m.einsatzmittel_id));
              const assignedMittel = s.mittel
                .slice()
                .sort((a, b) => a.reihenfolge - b.reihenfolge)
                .map((m) => items.find((r) => r.id === m.einsatzmittel_id))
                .filter(Boolean) as Einsatzmittel[];

              return (
                <div key={s.id} className="glass rounded-xl overflow-hidden">
                  <div className="px-4 py-3 flex items-center gap-3">
                    <button onClick={() => toggleExpand(s.id)}
                      className="text-sm font-medium flex-shrink-0"
                      style={{ color: 'var(--theme-text-muted)' }}>
                      {isOpen ? '▼' : '▶'}
                    </button>
                    <input
                      value={s.label}
                      onChange={(e) => renameLabel(s.id, e.target.value)}
                      style={{ ...aaoInputStyle, flex: 1, fontWeight: 600 }}
                    />
                    {!isOpen && assignedMittel.length > 0 && (
                      <span className="text-xs flex-shrink-0" style={{ color: 'var(--theme-text-faint)' }}>
                        {assignedMittel.map((r) => r.klarname ?? r.name).join(', ')}
                      </span>
                    )}
                    <button onClick={() => deleteStichwort(s.id)}
                      className="text-xs px-2 py-1 rounded flex-shrink-0"
                      style={{ background: 'var(--color-warn-alarm)', color: '#fff' }}>
                      Löschen
                    </button>
                  </div>

                  {isOpen && (
                    <div className="border-t px-4 py-3 flex gap-6" style={{ borderColor: 'var(--theme-border)' }}>
                      <div className="flex-1">
                        <p className="text-xs font-bold mb-2" style={{ color: 'var(--color-pb-blue-light)' }}>
                          EINSATZMITTEL AUSWÄHLEN
                        </p>
                        {items.length === 0 ? (
                          <p className="text-xs" style={{ color: 'var(--theme-text-faint)' }}>Keine Einsatzmittel erfasst.</p>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {items.map((r) => (
                              <label key={r.id} className="flex items-center gap-2 cursor-pointer text-sm">
                                <input
                                  type="checkbox"
                                  checked={assignedIds.has(r.id)}
                                  onChange={() => toggleMittel(s.id, r.id)}
                                />
                                <span style={{ color: 'var(--theme-text)' }}>{r.name}</span>
                                {r.klarname && (
                                  <span className="text-xs" style={{ color: 'var(--color-pb-blue-light)' }}>({r.klarname})</span>
                                )}
                                {r.typ && (
                                  <span className="text-xs" style={{ color: 'var(--theme-text-faint)' }}>{r.typ}</span>
                                )}
                              </label>
                            ))}
                          </div>
                        )}
                      </div>

                      {assignedMittel.length > 0 && (
                        <div className="flex-1">
                          <p className="text-xs font-bold mb-2" style={{ color: 'var(--color-pb-blue-light)' }}>
                            REIHENFOLGE
                          </p>
                          <div className="flex flex-col gap-1">
                            {assignedMittel.map((r, i) => (
                              <div key={r.id} className="flex items-center gap-2 text-sm">
                                <div className="flex flex-col gap-0.5">
                                  <button onClick={() => moveMittel(s.id, i, -1)} disabled={i === 0}
                                    className="text-xs leading-none disabled:opacity-20"
                                    style={{ color: 'var(--theme-text-muted)' }}>▲</button>
                                  <button onClick={() => moveMittel(s.id, i, 1)} disabled={i === assignedMittel.length - 1}
                                    className="text-xs leading-none disabled:opacity-20"
                                    style={{ color: 'var(--theme-text-muted)' }}>▼</button>
                                </div>
                                <span style={{ color: 'var(--theme-text)' }}>{r.klarname ?? r.name}</span>
                                {r.klarname && (
                                  <span className="text-xs" style={{ color: 'var(--theme-text-faint)' }}>({r.name})</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
