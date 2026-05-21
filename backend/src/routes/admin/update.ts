import type { FastifyInstance } from 'fastify';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../../..');

// ── Update state ────────────────────────────────────────────────────────────

type UpdateStatus = 'idle' | 'running' | 'done' | 'error';

const updateState: { status: UpdateStatus; log: string[]; startedAt: string | null } = {
  status: 'idle',
  log: [],
  startedAt: null,
};

// ── Check state ─────────────────────────────────────────────────────────────

export type CheckInfo = {
  checked: boolean;
  upToDate: boolean;
  behindBy: number;
  commits: Array<{ hash: string; message: string; date: string }>;
  localCommit: string;
  remoteCommit: string;
  checkedAt: string | null;
  error?: string;
};

let lastCheck: CheckInfo = {
  checked: false,
  upToDate: true,
  behindBy: 0,
  commits: [],
  localCommit: '',
  remoteCommit: '',
  checkedAt: null,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function git(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('git', args, { cwd: PROJECT_ROOT });
    let out = '';
    let err = '';
    proc.stdout.on('data', (d: Buffer) => { out += String(d); });
    proc.stderr.on('data', (d: Buffer) => { err += String(d); });
    proc.on('close', (code) => (code === 0 ? resolve(out.trim()) : reject(new Error(err.trim() || `git exited ${code}`))));
    proc.on('error', reject);
  });
}

function execCmd(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { cwd: PROJECT_ROOT, env: { ...process.env, FORCE_COLOR: '0' } });
    proc.stdout.on('data', (d: Buffer) => updateState.log.push(...String(d).split('\n').filter(Boolean)));
    proc.stderr.on('data', (d: Buffer) => updateState.log.push(...String(d).split('\n').filter(Boolean)));
    proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited with code ${code}`))));
  });
}

async function getRemoteBranch(): Promise<string> {
  return git(['symbolic-ref', 'refs/remotes/origin/HEAD', '--short']).catch(() => 'origin/main');
}

// ── GitHub update check ──────────────────────────────────────────────────────

async function checkForUpdates(): Promise<CheckInfo> {
  const FETCH_TIMEOUT_MS = 20_000;
  try {
    await Promise.race([
      git(['fetch', 'origin', '--quiet']),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('git fetch: Timeout nach 20 s')), FETCH_TIMEOUT_MS)),
    ]);

    const remoteBranch = await getRemoteBranch();
    const [localCommit, remoteCommit, logOutput] = await Promise.all([
      git(['rev-parse', '--short', 'HEAD']),
      git(['rev-parse', '--short', remoteBranch]).catch(() => ''),
      git(['log', `HEAD..${remoteBranch}`, '--format=%h|%s|%aI', '--no-merges']).catch(() => ''),
    ]);

    const commits = logOutput
      ? logOutput.split('\n').filter(Boolean).map((line) => {
          const parts = line.split('|');
          const date = parts.pop() ?? '';
          const hash = parts.shift() ?? '';
          const message = parts.join('|');
          return { hash, message, date };
        })
      : [];

    lastCheck = {
      checked: true,
      upToDate: commits.length === 0,
      behindBy: commits.length,
      commits,
      localCommit,
      remoteCommit,
      checkedAt: new Date().toISOString(),
    };
  } catch (err) {
    lastCheck = {
      checked: true,
      upToDate: true,
      behindBy: 0,
      commits: [],
      localCommit: lastCheck.localCommit,
      remoteCommit: '',
      checkedAt: new Date().toISOString(),
      error: err instanceof Error ? err.message : String(err),
    };
  }
  return lastCheck;
}

// ── Update runner ────────────────────────────────────────────────────────────

async function runUpdate() {
  updateState.status = 'running';
  updateState.log = ['Starte Update...'];
  updateState.startedAt = new Date().toISOString();
  try {
    updateState.log.push('$ git pull');
    await execCmd('git', ['pull']);
    updateState.log.push('$ npm install');
    await execCmd('npm', ['install']);
    updateState.log.push('$ npm run build');
    await execCmd('npm', ['run', 'build']);
    updateState.log.push('');
    updateState.log.push('✓ Update abgeschlossen.');
    updateState.log.push('  Server wird beendet — bitte manuell neu starten (oder systemd/PM2 übernimmt).');
    updateState.status = 'done';
    setTimeout(() => process.exit(0), 3000);
  } catch (err) {
    updateState.log.push(`✗ Fehler: ${err instanceof Error ? err.message : String(err)}`);
    updateState.status = 'error';
  }
}

// ── Routes ───────────────────────────────────────────────────────────────────

export async function adminUpdateRoutes(fastify: FastifyInstance) {
  const auth = { onRequest: [fastify.authenticate] };

  fastify.get('/api/admin/update/status', auth, async () => {
    const commit = await git(['rev-parse', '--short', 'HEAD']).catch(() => '');
    return { status: updateState.status, log: updateState.log, startedAt: updateState.startedAt, commit, check: lastCheck };
  });

  fastify.get('/api/admin/update/check', auth, async () => {
    return checkForUpdates();
  });

  fastify.post('/api/admin/update/start', auth, async (_req, reply) => {
    if (updateState.status === 'running') {
      return reply.code(409).send({ error: 'Update läuft bereits' });
    }
    runUpdate();
    return { ok: true };
  });
}
