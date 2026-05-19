import { useEffect, useState } from 'react';
import { api } from '../../api';

interface Einsatzmittel { id: number; name: string; typ: string | null; status: string }

interface AaoMittel { einsatzmittel_id: number; reihenfolge: number }
interface AaoStichwort { id: string; label: string; mittel: AaoMittel[] }
interface AaoConfig { stichwoerter: AaoStichwort[] }

function genId() { return Math.random().toString(36).slice(2, 10); }

export default function AaoPage() {
  const [config, setConfig] = useState<AaoConfig>({ stichwoerter: [] });
  const [resources, setResources] = useState<Einsatzmittel[]>([]);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.get<AaoConfig>('/api/admin/aao').then(setConfig).catch(() => {});
    api.get<Einsatzmittel[]>('/api/admin/einsatzmittel').then(setResources).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/admin/aao', config);
      setFeedback('AAO gespeichert.');
    } catch {
      setFeedback('Fehler beim Speichern.');
    } finally {
      setSaving(false);
    }
  };

  const addStichwort = () => {
    if (!newLabel.trim()) return;
    const s: AaoStichwort = { id: genId(), label: newLabel.trim(), mittel: [] };
    setConfig((c) => ({ stichwoerter: [...c.stichwoerter, s] }));
    setExpanded((e) => new Set(e).add(s.id));
    setNewLabel('');
  };

  const deleteStichwort = (id: string) => {
    setConfig((c) => ({ stichwoerter: c.stichwoerter.filter((s) => s.id !== id) }));
  };

  const renameLabel = (id: string, label: string) => {
    setConfig((c) => ({
      stichwoerter: c.stichwoerter.map((s) => s.id === id ? { ...s, label } : s),
    }));
  };

  const toggleMittel = (stichId: string, emId: number) => {
    setConfig((c) => ({
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
    setConfig((c) => ({
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

  const inputStyle = {
    background: 'var(--theme-bg)',
    color: 'var(--theme-text)',
    border: '1px solid var(--theme-border)',
    borderRadius: '6px',
    padding: '4px 8px',
    fontSize: '13px',
  };

  return (
    <div className="p-6 flex flex-col gap-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold" style={{ color: 'var(--theme-text)' }}>Alarm- und Ausrückordnung</h1>
        <div className="flex items-center gap-3">
          {feedback && <span className="text-xs" style={{ color: 'var(--color-warn-normal)' }}>{feedback}</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{ background: 'var(--color-pb-signal)', color: '#fff' }}
          >
            {saving ? 'Speichern…' : 'Speichern'}
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
          style={{ ...inputStyle, flex: 1 }}
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
      {config.stichwoerter.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: 'var(--theme-text-faint)' }}>
          Noch keine Stichwörter angelegt.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {config.stichwoerter.map((s) => {
            const isOpen = expanded.has(s.id);
            const assignedIds = new Set(s.mittel.map((m) => m.einsatzmittel_id));
            const assignedMittel = s.mittel
              .slice()
              .sort((a, b) => a.reihenfolge - b.reihenfolge)
              .map((m) => resources.find((r) => r.id === m.einsatzmittel_id))
              .filter(Boolean) as Einsatzmittel[];

            return (
              <div key={s.id} className="glass rounded-xl overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 flex items-center gap-3">
                  <button
                    onClick={() => toggleExpand(s.id)}
                    className="text-sm font-medium flex-shrink-0"
                    style={{ color: 'var(--theme-text-muted)' }}
                  >
                    {isOpen ? '▼' : '▶'}
                  </button>
                  <input
                    value={s.label}
                    onChange={(e) => renameLabel(s.id, e.target.value)}
                    style={{ ...inputStyle, flex: 1, fontWeight: 600 }}
                  />
                  {!isOpen && assignedMittel.length > 0 && (
                    <span className="text-xs flex-shrink-0" style={{ color: 'var(--theme-text-faint)' }}>
                      {assignedMittel.map((r) => r.name).join(', ')}
                    </span>
                  )}
                  <button
                    onClick={() => deleteStichwort(s.id)}
                    className="text-xs px-2 py-1 rounded flex-shrink-0"
                    style={{ background: 'var(--color-warn-alarm)', color: '#fff' }}
                  >
                    Löschen
                  </button>
                </div>

                {/* Einsatzmittel-Auswahl */}
                {isOpen && (
                  <div className="border-t px-4 py-3 flex gap-6" style={{ borderColor: 'var(--theme-border)' }}>
                    {/* Auswahl-Checkboxen */}
                    <div className="flex-1">
                      <p className="text-xs font-bold mb-2" style={{ color: 'var(--color-pb-blue-light)' }}>
                        EINSATZMITTEL AUSWÄHLEN
                      </p>
                      {resources.length === 0 ? (
                        <p className="text-xs" style={{ color: 'var(--theme-text-faint)' }}>Keine Einsatzmittel erfasst.</p>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {resources.map((r) => (
                            <label key={r.id} className="flex items-center gap-2 cursor-pointer text-sm">
                              <input
                                type="checkbox"
                                checked={assignedIds.has(r.id)}
                                onChange={() => toggleMittel(s.id, r.id)}
                              />
                              <span style={{ color: 'var(--theme-text)' }}>{r.name}</span>
                              {r.typ && (
                                <span className="text-xs" style={{ color: 'var(--theme-text-faint)' }}>({r.typ})</span>
                              )}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Reihenfolge */}
                    {assignedMittel.length > 0 && (
                      <div className="flex-1">
                        <p className="text-xs font-bold mb-2" style={{ color: 'var(--color-pb-blue-light)' }}>
                          REIHENFOLGE
                        </p>
                        <div className="flex flex-col gap-1">
                          {assignedMittel.map((r, i) => (
                            <div key={r.id} className="flex items-center gap-2 text-sm">
                              <div className="flex flex-col gap-0.5">
                                <button
                                  onClick={() => moveMittel(s.id, i, -1)}
                                  disabled={i === 0}
                                  className="text-xs leading-none disabled:opacity-20"
                                  style={{ color: 'var(--theme-text-muted)' }}
                                >▲</button>
                                <button
                                  onClick={() => moveMittel(s.id, i, 1)}
                                  disabled={i === assignedMittel.length - 1}
                                  className="text-xs leading-none disabled:opacity-20"
                                  style={{ color: 'var(--theme-text-muted)' }}
                                >▼</button>
                              </div>
                              <span style={{ color: 'var(--theme-text)' }}>{r.name}</span>
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
  );
}
