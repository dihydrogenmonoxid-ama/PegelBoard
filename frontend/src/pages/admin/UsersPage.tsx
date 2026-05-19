import { useState } from 'react';
import { api, ApiError } from '../../api';

const inputCls = 'bg-white/5 border border-white/10 rounded-lg px-3 h-10 text-white text-sm outline-none focus:border-pb-blue-light/60 focus:ring-1 focus:ring-pb-blue-light/40 transition-colors';

export default function UsersPage() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) { setFeedback({ ok: false, msg: 'Neues Passwort stimmt nicht überein' }); return; }
    if (next.length < 6) { setFeedback({ ok: false, msg: 'Passwort muss mindestens 6 Zeichen lang sein' }); return; }
    setSaving(true); setFeedback(null);
    try {
      await api.put('/api/admin/users/password', { currentPassword: current, newPassword: next });
      setFeedback({ ok: true, msg: 'Passwort geändert' });
      setCurrent(''); setNext(''); setConfirm('');
    } catch (err) {
      setFeedback({ ok: false, msg: err instanceof ApiError ? err.message : 'Fehler' });
    } finally { setSaving(false); }
  }

  return (
    <div className="flex flex-col gap-6 max-w-sm">
      <div>
        <h1 className="text-2xl font-bold text-white">Passwort ändern</h1>
        <p className="text-white/40 text-sm mt-1">Benutzerkonto: admin</p>
      </div>
      <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 flex flex-col gap-4">
        {[['Aktuelles Passwort', current, setCurrent, 'current-password'], ['Neues Passwort', next, setNext, 'new-password'], ['Bestätigen', confirm, setConfirm, 'new-password']].map(([label, value, setter, autoComplete]) => (
          <label key={label as string} className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-white/60 uppercase tracking-wider">{label as string}</span>
            <input className={inputCls} type="password" value={value as string}
              onChange={(e) => (setter as React.Dispatch<React.SetStateAction<string>>)(e.target.value)}
              autoComplete={autoComplete as string} required />
          </label>
        ))}
        {feedback && <p className={`text-sm rounded-lg px-4 py-2.5 ${feedback.ok ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>{feedback.msg}</p>}
        <button type="submit" disabled={saving}
          className="h-10 rounded-xl bg-pb-signal text-white text-sm font-semibold hover:bg-pb-signal/80 disabled:opacity-50 transition-colors mt-1">
          {saving ? 'Speichern …' : 'Passwort ändern'}
        </button>
      </form>
    </div>
  );
}
