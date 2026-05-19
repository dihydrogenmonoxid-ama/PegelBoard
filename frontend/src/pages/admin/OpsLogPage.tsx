import { useEffect, useState } from 'react';
import { api } from '../../api';

interface OpsEntry {
  id: number;
  text: string;
  author: string;
  created_at: string;
}

export default function OpsLogPage() {
  const [entries, setEntries] = useState<OpsEntry[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');

  const load = () => {
    api.get<OpsEntry[]>('/api/admin/ops-log').then(setEntries).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    try {
      await api.post('/api/admin/ops-log', { text: text.trim() });
      setText('');
      load();
      setFeedback('Eintrag gespeichert.');
    } catch {
      setFeedback('Fehler beim Speichern.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.del(`/api/admin/ops-log/${id}`);
      load();
    } catch {
      setFeedback('Fehler beim Löschen.');
    }
  };

  return (
    <div className="p-6 max-w-2xl flex flex-col gap-6">
      <h1 className="text-xl font-bold" style={{ color: 'var(--theme-text)' }}>Einsatzanmerkungen</h1>

      <form onSubmit={handleSubmit} className="glass rounded-xl p-4 flex flex-col gap-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Neue Anmerkung..."
          rows={3}
          className="w-full rounded-lg p-3 text-sm resize-none"
          style={{
            background: 'var(--theme-bg)',
            color: 'var(--theme-text)',
            border: '1px solid var(--theme-border)',
          }}
        />
        <div className="flex items-center justify-between">
          {feedback && <span className="text-xs" style={{ color: 'var(--color-warn-normal)' }}>{feedback}</span>}
          <button
            type="submit"
            disabled={loading || !text.trim()}
            className="ml-auto px-4 py-2 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{ background: 'var(--color-pb-signal)', color: '#fff' }}
          >
            {loading ? 'Speichern…' : 'Eintragen'}
          </button>
        </div>
      </form>

      <div className="flex flex-col gap-2">
        {entries.length === 0 && (
          <p className="text-sm" style={{ color: 'var(--theme-text-faint)' }}>Keine Einträge.</p>
        )}
        {entries.map((e) => (
          <div key={e.id} className="glass rounded-xl p-4 flex gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs mb-1" style={{ color: 'var(--theme-text-muted)' }}>
                {new Date(e.created_at).toLocaleString('de-DE')} · {e.author}
              </p>
              <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--theme-text)' }}>{e.text}</p>
            </div>
            <button
              onClick={() => handleDelete(e.id)}
              className="text-xs flex-shrink-0 hover:opacity-70 transition-opacity"
              style={{ color: 'var(--color-warn-alarm)' }}
              title="Löschen"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
