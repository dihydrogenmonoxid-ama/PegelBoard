import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api';
import { PegelBoardMark } from '../components/PegelBoardMark';

const inputCls = 'bg-white/5 border border-white/10 rounded-lg px-3 h-10 text-white text-sm outline-none focus:border-pb-blue-light/60 focus:ring-1 focus:ring-pb-blue-light/40 transition-colors';

export default function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await api.post('/api/auth/login', { username, password });
      navigate('/admin');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Anmeldung fehlgeschlagen');
    } finally { setLoading(false); }
  }

  return (
    <div className="h-full flex items-center justify-center">
      <div className="glass rounded-2xl p-10 w-full max-w-sm flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <PegelBoardMark status="live" size={44} />
          <div>
            <div style={{ lineHeight: 1 }}>
              <span style={{ fontFamily: "Helvetica, 'Helvetica Neue', Arial, sans-serif", fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.015em', color: 'var(--theme-text)' }}>Pegel</span>
              <span style={{ fontFamily: "Helvetica, 'Helvetica Neue', Arial, sans-serif", fontSize: '1.4rem', fontWeight: 300, letterSpacing: '-0.015em', color: 'var(--theme-text-muted)' }}>Board</span>
            </div>
            <p className="text-sm mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>Administration</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-white/60 uppercase tracking-wider">Benutzer</span>
            <input className={inputCls} type="text" value={username}
              onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-white/60 uppercase tracking-wider">Passwort</span>
            <input className={inputCls} type="password" value={password}
              onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </label>
          {error && <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading}
            className="mt-2 h-11 rounded-xl bg-pb-signal text-white font-semibold hover:bg-pb-signal/80 disabled:opacity-50 transition-colors">
            {loading ? 'Anmelden …' : 'Anmelden'}
          </button>
        </form>
      </div>
    </div>
  );
}
