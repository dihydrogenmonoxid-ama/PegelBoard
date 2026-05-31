import { useEffect, useRef, useState } from 'react';
import JSZip from 'jszip';
import { api, ApiError } from '../../api';

// ── Icon helpers (ZIP import) ─────────────────────────────────────────────────

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function extToMime(ext: string): string {
  const map: Record<string, string> = {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    gif: 'image/gif', svg: 'image/svg+xml', webp: 'image/webp',
  };
  return map[ext.toLowerCase()] ?? 'application/octet-stream';
}

async function resolveIconFile(zip: JSZip, path: string): Promise<string | null> {
  const entry = zip.file(path);
  if (!entry) return null;
  const bytes = await entry.async('uint8array');
  const ext = path.split('.').pop() ?? 'bin';
  return `data:${extToMime(ext)};base64,${uint8ArrayToBase64(bytes)}`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

type UpdateStatus = 'idle' | 'running' | 'done' | 'error';

interface CheckInfo {
  checked: boolean;
  upToDate: boolean;
  behindBy: number;
  commits: Array<{ hash: string; message: string; date: string }>;
  localCommit: string;
  remoteCommit: string;
  checkedAt: string | null;
  error?: string;
}

interface UpdateState {
  status: UpdateStatus;
  log: string[];
  startedAt: string | null;
  commit: string;
  check: CheckInfo;
}

interface ImportResult {
  ok: boolean;
  imported: Record<string, number>;
  warnings: string[];
}

interface BackupPreview {
  exportedAt: string;
  counts: Record<string, number>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' });
}

const inputCls =
  'bg-white/5 border border-white/10 rounded-lg px-3 h-9 text-sm text-white outline-none focus:border-white/30 transition-colors';

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SystemPage() {
  return (
    <div className="flex flex-col gap-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">System</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--theme-text-faint)' }}>
          Updates, Datensicherung und Passwort
        </p>
      </div>
      <UpdateSection />
      <BackupSection />
      <PasswordSection />
    </div>
  );
}

// ── Update section ────────────────────────────────────────────────────────────

function UpdateSection() {
  const emptyCheck: CheckInfo = {
    checked: false, upToDate: true, behindBy: 0,
    commits: [], localCommit: '', remoteCommit: '', checkedAt: null,
  };
  const [state, setState] = useState<UpdateState>({
    status: 'idle', log: [], startedAt: null, commit: '', check: emptyCheck,
  });
  const [isChecking, setIsChecking] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    api.get<UpdateState>('/api/admin/update/status').then(setState).catch(() => {});
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [state.log]);

  useEffect(() => {
    if (state.status === 'running') {
      pollRef.current = setInterval(() => {
        api.get<UpdateState>('/api/admin/update/status').then(setState).catch(() => {});
      }, 1500);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [state.status]);

  async function handleCheck() {
    setIsChecking(true);
    try {
      const check = await api.get<CheckInfo>('/api/admin/update/check');
      setState((s) => ({ ...s, check }));
    } catch {
      // ignore — backend error shown via check.error
    } finally {
      setIsChecking(false);
    }
  }

  async function handleUpdate() {
    await api.post('/api/admin/update/start', {}).catch(() => {});
    setState((s) => ({ ...s, status: 'running', log: ['Starte Update...'] }));
  }

  const { status, log, check, commit } = state;
  const isRunning = status === 'running';

  return (
    <section className="glass rounded-2xl p-4 flex flex-col gap-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>
        System-Update (GitHub)
      </h2>

      {/* Current commit */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs" style={{ color: 'var(--theme-text-faint)' }}>Aktueller Commit</span>
          <span className="font-mono text-sm text-white">{commit || '—'}</span>
        </div>
        <button
          onClick={handleCheck}
          disabled={isChecking || isRunning}
          className={`${inputCls} px-4 flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {isChecking ? (
            <>
              <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Prüfe…
            </>
          ) : 'Auf Updates prüfen'}
        </button>
      </div>

      {/* Check result */}
      {check.checked && (
        <CheckResult check={check} />
      )}

      {/* Update button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleUpdate}
          disabled={isRunning}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            status === 'done'
              ? 'bg-green-600/25 text-green-300 hover:bg-green-600/35'
              : status === 'error'
              ? 'bg-red-600/25 text-red-300 hover:bg-red-600/35'
              : check.checked && check.upToDate
              ? 'bg-white/10 text-white/60 hover:bg-white/15'
              : 'bg-pb-signal text-white hover:opacity-90'
          }`}
        >
          {isRunning
            ? 'Wird aktualisiert…'
            : status === 'done'
            ? 'Erneut aktualisieren'
            : status === 'error'
            ? 'Erneut versuchen'
            : 'Jetzt aktualisieren'}
        </button>
        {!isRunning && status === 'idle' && (
          <p className="text-xs" style={{ color: 'var(--theme-text-faint)' }}>
            git pull · npm install · npm run build
          </p>
        )}
      </div>

      {/* Log output */}
      {log.length > 0 && (
        <pre
          ref={logRef}
          className="text-xs rounded-xl p-4 max-h-64 overflow-y-auto leading-relaxed whitespace-pre-wrap"
          style={{
            background: 'rgba(0,0,0,0.4)',
            color: status === 'error' ? '#fca5a5' : 'var(--theme-text-muted)',
          }}
        >
          {log.join('\n')}
        </pre>
      )}

      {status === 'done' && (
        <p
          className="text-xs rounded-xl px-4 py-3"
          style={{ background: 'rgba(34,197,94,0.1)', color: '#86efac' }}
        >
          Update abgeschlossen. Server bitte neu starten, z.B.{' '}
          <code className="font-mono">sudo systemctl restart pegelboard</code>.
        </p>
      )}
    </section>
  );
}

function CheckResult({ check }: { check: CheckInfo }) {
  if (check.error) {
    return (
      <div className="rounded-xl px-4 py-3 text-xs" style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5' }}>
        Fehler beim Prüfen: {check.error}
      </div>
    );
  }
  if (check.upToDate) {
    return (
      <div className="rounded-xl px-4 py-3 text-xs flex items-center gap-2" style={{ background: 'rgba(34,197,94,0.08)', color: '#86efac' }}>
        <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
        Kein Update verfügbar — bereits aktuell.{' '}
        <span style={{ color: 'var(--theme-text-faint)' }}>Geprüft: {formatDate(check.checkedAt)}</span>
      </div>
    );
  }
  return (
    <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
      <div className="flex items-center gap-2 text-xs" style={{ color: '#fde68a' }}>
        <span className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" />
        <span className="font-medium">{check.behindBy} neuer Commit{check.behindBy !== 1 ? 's' : ''} verfügbar</span>
        <span style={{ color: 'var(--theme-text-faint)' }}>({formatDate(check.checkedAt)})</span>
      </div>
      <ul className="flex flex-col gap-1">
        {check.commits.slice(0, 10).map((c) => (
          <li key={c.hash} className="flex items-baseline gap-2 text-xs">
            <code className="font-mono shrink-0" style={{ color: 'var(--theme-text-faint)' }}>{c.hash}</code>
            <span style={{ color: 'var(--theme-text-muted)' }}>{c.message}</span>
          </li>
        ))}
        {check.commits.length > 10 && (
          <li className="text-xs" style={{ color: 'var(--theme-text-faint)' }}>… und {check.commits.length - 10} weitere</li>
        )}
      </ul>
    </div>
  );
}

// ── Backup section ────────────────────────────────────────────────────────────

function BackupSection() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [parsedBackup, setParsedBackup] = useState<unknown>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    try {
      const res = await fetch('/api/admin/backup/export', { credentials: 'include' });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cd = res.headers.get('Content-Disposition') ?? '';
      const match = cd.match(/filename="([^"]+)"/);
      a.download = match?.[1] ?? 'pegelboard-backup.zip';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export fehlgeschlagen: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsExporting(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(null);
    setParsedBackup(null);
    setParseError(null);
    setImportResult(null);
    setImportError(null);
    // Reset file input so the same file can be picked again
    e.target.value = '';

    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const jsonFile = zip.file('backup.json');
      if (!jsonFile) {
        setParseError('Keine backup.json in der ZIP-Datei gefunden.');
        return;
      }
      const jsonStr = await jsonFile.async('string');
      const data = JSON.parse(jsonStr);
      if (!data || typeof data !== 'object' || data.version !== 1) {
        setParseError('Keine gültige PegelBoard-Backup-Datei (Version 1 erwartet).');
        return;
      }

      // ── Resolve icon files back to base64 ──────────────────────────────

      // Logo
      if (typeof data.logo_file === 'string') {
        const logoDataUri = await resolveIconFile(zip, data.logo_file);
        if (logoDataUri) {
          if (!data.tables.config) data.tables.config = [];
          data.tables.config = (data.tables.config as Array<{ key: string }>)
            .filter((r) => r.key !== 'logo_base64');
          data.tables.config.push({ key: 'logo_base64', value: logoDataUri });
        }
      }

      // AAO icons
      if (Array.isArray(data.tables.aao_icons)) {
        for (const icon of data.tables.aao_icons as Array<Record<string, unknown>>) {
          if (typeof icon['icon_file'] === 'string' && !icon['data']) {
            const resolved = await resolveIconFile(zip, icon['icon_file'] as string);
            if (resolved) icon['data'] = resolved;
          }
        }
      }

      // Einsatzmittel icons
      if (Array.isArray(data.tables.einsatzmittel)) {
        for (const em of data.tables.einsatzmittel as Array<Record<string, unknown>>) {
          if (typeof em['icon_file'] === 'string' && !em['icon_data']) {
            const resolved = await resolveIconFile(zip, em['icon_file'] as string);
            if (resolved) em['icon_data'] = resolved;
          }
        }
      }

      // ── Preview counts ─────────────────────────────────────────────────

      const tables = data.tables ?? {};
      const counts: Record<string, number> = {};
      for (const key of ['config', 'gauge_stations', 'layouts', 'einsatzmittel', 'aao_icons', 'callsign_map']) {
        if (Array.isArray(tables[key])) counts[key] = (tables[key] as unknown[]).length;
      }
      setPreview({ exportedAt: data.exportedAt ?? '', counts });
      setParsedBackup(data);
    } catch {
      setParseError('Datei konnte nicht gelesen werden. Bitte eine gültige PegelBoard-ZIP-Datei wählen.');
    }
  }

  async function handleImport() {
    if (!parsedBackup) return;
    setIsImporting(true);
    setImportResult(null);
    setImportError(null);
    try {
      const result = await api.post<ImportResult>('/api/admin/backup/import', parsedBackup);
      setImportResult(result);
      setPreview(null);
      setParsedBackup(null);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsImporting(false);
    }
  }

  function clearPreview() {
    setPreview(null);
    setParsedBackup(null);
    setParseError(null);
  }

  const TABLE_LABELS: Record<string, string> = {
    config: 'Konfiguration',
    gauge_stations: 'Pegelstationen',
    layouts: 'Layouts',
    einsatzmittel: 'Einsatzmittel',
    aao_icons: 'AAO-Icons',
    callsign_map: 'Rufzeichen',
  };

  return (
    <section className="glass rounded-2xl p-4 flex flex-col gap-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>
        Datensicherung
      </h2>

      {/* Export */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-white">Konfiguration exportieren</p>
        <p className="text-xs" style={{ color: 'var(--theme-text-faint)' }}>
          Speichert Konfiguration, Pegelstationen, Einsatzmittel und AAO-Icons als ZIP-Archiv.
          Passwörter werden nicht exportiert.
        </p>
        <div>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="mt-1 px-4 py-2 rounded-xl text-sm font-medium bg-pb-signal text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isExporting ? 'Wird exportiert…' : 'Konfiguration exportieren'}
          </button>
        </div>
      </div>

      <div className="border-t" style={{ borderColor: 'var(--theme-border)' }} />

      {/* Import */}
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-white">Konfiguration importieren</p>
        <p className="text-xs" style={{ color: 'var(--theme-text-faint)' }}>
          Vorhandene Einträge werden aktualisiert, neue hinzugefügt — nichts wird gelöscht.
          Der Import läuft in einer Transaktion; bei Fehler wird alles zurückgerollt.
        </p>

        {/* File picker */}
        {!preview && !parseError && (
          <label
            className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-colors hover:border-white/30 py-8"
            style={{ borderColor: 'rgba(255,255,255,0.12)' }}
          >
            <span className="text-2xl" style={{ color: 'var(--theme-text-faint)' }}>↑</span>
            <span className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
              Backup-Datei auswählen
            </span>
            <span className="text-xs" style={{ color: 'var(--theme-text-faint)' }}>
              pegelboard-backup-*.zip
            </span>
            <input ref={fileInputRef} type="file" accept=".zip,application/zip" className="sr-only" onChange={handleFileChange} />
          </label>
        )}

        {/* Parse error */}
        {parseError && (
          <div className="rounded-xl px-4 py-3 text-xs flex items-start gap-2" style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5' }}>
            <span className="mt-0.5">✗</span>
            <div className="flex flex-col gap-1">
              <span>{parseError}</span>
              <button onClick={clearPreview} className="underline text-left" style={{ color: '#fca5a5' }}>Andere Datei wählen</button>
            </div>
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div className="rounded-xl p-4 flex flex-col gap-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Vorschau</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-faint)' }}>
                  Erstellt: {formatDate(preview.exportedAt)}
                </p>
              </div>
              <button onClick={clearPreview} className="text-xs hover:text-white transition-colors" style={{ color: 'var(--theme-text-faint)' }}>
                Abbrechen
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {Object.entries(preview.counts).map(([key, count]) => (
                <div key={key} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{TABLE_LABELS[key] ?? key}</span>
                  <span className="text-sm font-semibold tabular-nums text-white">{count}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleImport}
              disabled={isImporting}
              className="w-full py-2.5 rounded-xl text-sm font-medium bg-pb-signal text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isImporting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Wird importiert…
                </span>
              ) : 'Jetzt importieren'}
            </button>
          </div>
        )}

        {/* Import error */}
        {importError && (
          <div className="rounded-xl px-4 py-3 text-xs" style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5' }}>
            Import fehlgeschlagen: {importError}
          </div>
        )}

        {/* Import result */}
        {importResult && (
          <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <p className="text-sm font-medium" style={{ color: '#86efac' }}>Import abgeschlossen</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(importResult.imported).map(([key, count]) => (
                <div key={key} className="flex items-center justify-between rounded-lg px-3 py-1.5" style={{ background: 'rgba(34,197,94,0.06)' }}>
                  <span className="text-xs" style={{ color: 'var(--theme-text-muted)' }}>{TABLE_LABELS[key] ?? key}</span>
                  <span className="text-sm font-semibold tabular-nums" style={{ color: '#86efac' }}>{count}</span>
                </div>
              ))}
            </div>
            {importResult.warnings.length > 0 && (
              <div className="text-xs flex flex-col gap-1" style={{ color: '#fde68a' }}>
                <p className="font-medium">Hinweise:</p>
                {importResult.warnings.map((w, i) => <p key={i}>· {w}</p>)}
              </div>
            )}
            <button
              onClick={() => { setImportResult(null); }}
              className="text-xs self-start underline" style={{ color: 'var(--theme-text-faint)' }}
            >
              Weiteren Import durchführen
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Password section ──────────────────────────────────────────────────────────

function PasswordSection() {
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
    <section className="glass rounded-2xl p-4 flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>
          Passwort ändern
        </h2>
        <p className="text-xs mt-1" style={{ color: 'var(--theme-text-faint)' }}>Benutzerkonto: admin</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-sm">
        {(
          [
            ['Aktuelles Passwort', current, setCurrent, 'current-password'],
            ['Neues Passwort',     next,    setNext,    'new-password'],
            ['Bestätigen',         confirm, setConfirm, 'new-password'],
          ] as const
        ).map(([label, value, setter, autoComplete]) => (
          <label key={label} className="flex flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>{label}</span>
            <input
              className={inputCls}
              type="password"
              value={value}
              onChange={(e) => setter(e.target.value)}
              autoComplete={autoComplete}
              required
            />
          </label>
        ))}
        {feedback && (
          <p className={`text-sm rounded-lg px-4 py-2.5 ${feedback.ok ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
            {feedback.msg}
          </p>
        )}
        <button
          type="submit"
          disabled={saving}
          className="h-10 rounded-xl bg-pb-signal text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {saving ? 'Speichern …' : 'Passwort ändern'}
        </button>
      </form>
    </section>
  );
}
