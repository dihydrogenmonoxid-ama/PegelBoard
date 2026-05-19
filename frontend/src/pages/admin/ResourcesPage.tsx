import { useEffect, useRef, useState } from 'react';
import { api } from '../../api';

interface Einsatzmittel {
  id: number;
  name: string;
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
  name: '', typ: '', status: 'verfügbar', notizen: '', sort_order: 0, issi: '',
};

export default function ResourcesPage() {
  const [items, setItems] = useState<Einsatzmittel[]>([]);
  const [editing, setEditing] = useState<Record<number, Partial<Einsatzmittel>>>({});
  const [newItem, setNewItem] = useState<typeof EMPTY>({ ...EMPTY });
  const [feedback, setFeedback] = useState('');
  const iconRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const load = () => {
    api.get<Einsatzmittel[]>('/api/admin/einsatzmittel').then(setItems).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name.trim()) return;
    try {
      await api.post('/api/admin/einsatzmittel', { ...newItem, issi: newItem.issi || null });
      setNewItem({ ...EMPTY });
      load();
      setFeedback('Einsatzmittel hinzugefügt.');
    } catch {
      setFeedback('Fehler.');
    }
  };

  const handleSave = async (id: number) => {
    try {
      const data = editing[id] ?? {};
      await api.put(`/api/admin/einsatzmittel/${id}`, { ...data, issi: data.issi || null });
      setEditing((prev) => { const n = { ...prev }; delete n[id]; return n; });
      load();
      setFeedback('Gespeichert.');
    } catch {
      setFeedback('Fehler.');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.del(`/api/admin/einsatzmittel/${id}`);
      load();
    } catch {
      setFeedback('Fehler beim Löschen.');
    }
  };

  const handleIconUpload = async (id: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    try {
      await fetch(`/api/admin/einsatzmittel/${id}/icon`, {
        method: 'POST', credentials: 'include', body: form,
      });
      load();
      setFeedback('Icon gespeichert.');
    } catch {
      setFeedback('Icon-Upload fehlgeschlagen.');
    }
  };

  const handleIconDelete = async (id: number) => {
    try {
      await api.del(`/api/admin/einsatzmittel/${id}/icon`);
      load();
    } catch { /* ignore */ }
  };

  const startEdit = (item: Einsatzmittel) => {
    setEditing((prev) => ({ ...prev, [item.id]: { ...item } }));
  };

  const updateEdit = (id: number, field: keyof Einsatzmittel, value: string | number | null) => {
    setEditing((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const inputStyle = {
    background: 'var(--theme-bg)',
    color: 'var(--theme-text)',
    border: '1px solid var(--theme-border)',
    borderRadius: '6px',
    padding: '4px 8px',
    fontSize: '13px',
    width: '100%',
  };

  return (
    <div className="p-6 max-w-5xl flex flex-col gap-6">
      <h1 className="text-xl font-bold" style={{ color: 'var(--theme-text)' }}>Einsatzmittel</h1>

      {/* Add form */}
      <form onSubmit={handleAdd} className="glass rounded-xl p-4">
        <p className="text-xs font-bold mb-3" style={{ color: 'var(--color-pb-blue-light)' }}>NEUES EINSATZMITTEL</p>
        <div className="grid gap-3" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto' }}>
          <input placeholder="Name *" value={newItem.name}
            onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
            style={inputStyle} required />
          <input placeholder="Typ (z.B. Boot)" value={newItem.typ ?? ''}
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
        {feedback && <p className="text-xs mt-2" style={{ color: 'var(--color-warn-normal)' }}>{feedback}</p>}
      </form>

      {/* Table */}
      <div className="glass rounded-xl overflow-hidden">
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--theme-border)' }}>
              {['Icon', 'Name', 'Typ', 'Status', 'ISSI', 'Notizen', ''].map((h) => (
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
                          <img
                            src={`/api/einsatzmittel/${item.id}/icon`}
                            alt=""
                            className="w-7 h-7 object-contain rounded"
                          />
                        )}
                        <input
                          ref={(el) => { iconRefs.current[item.id] = el; }}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleIconUpload(item.id, file);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => iconRefs.current[item.id]?.click()}
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{ background: 'var(--theme-border)', color: 'var(--theme-text-muted)', whiteSpace: 'nowrap' }}
                        >
                          {item.has_icon ? '↻' : '+ Icon'}
                        </button>
                        {item.has_icon && (
                          <button
                            type="button"
                            onClick={() => handleIconDelete(item.id)}
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{ color: 'var(--color-warn-alarm)' }}
                          >
                            ✕
                          </button>
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
              <tr><td colSpan={7} className="px-4 py-6 text-center text-sm" style={{ color: 'var(--theme-text-faint)' }}>
                Keine Einsatzmittel erfasst.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
