import type { FastifyInstance } from 'fastify';
import { db } from '../../db/database.js';

// ── Backup format ─────────────────────────────────────────────────────────────

export interface BackupV1 {
  version: 1;
  exportedAt: string;
  tables: {
    config: Array<{ key: string; value: string }>;
    gauge_stations: Array<Record<string, unknown>>;
    layouts: Array<Record<string, unknown>>;
    einsatzmittel: Array<Record<string, unknown>>;
    aao_icons: Array<Record<string, unknown>>;
    callsign_map: Array<Record<string, unknown>>;
  };
}

// ── Validation helpers ────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown, fallback: string | null = null): string | null {
  return typeof v === 'string' ? v : fallback;
}

function num(v: unknown, fallback: number | null = null): number | null {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v !== '' && !isNaN(Number(v))) return Number(v);
  return fallback;
}

// ── Routes ────────────────────────────────────────────────────────────────────

export async function adminBackupRoutes(fastify: FastifyInstance) {
  const auth = { onRequest: [fastify.authenticate] };

  // ── Export ────────────────────────────────────────────────────────────────

  fastify.get('/api/admin/backup/export', auth, async (_req, reply) => {
    const backup: BackupV1 = {
      version: 1,
      exportedAt: new Date().toISOString(),
      tables: {
        config: db.prepare('SELECT key, value FROM config').all() as BackupV1['tables']['config'],
        gauge_stations: db.prepare('SELECT * FROM gauge_stations').all() as BackupV1['tables']['gauge_stations'],
        layouts: db.prepare('SELECT * FROM layouts').all() as BackupV1['tables']['layouts'],
        einsatzmittel: db.prepare('SELECT * FROM einsatzmittel').all() as BackupV1['tables']['einsatzmittel'],
        aao_icons: db.prepare('SELECT * FROM aao_icons').all() as BackupV1['tables']['aao_icons'],
        callsign_map: db.prepare('SELECT * FROM callsign_map').all() as BackupV1['tables']['callsign_map'],
      },
    };

    const date = new Date().toISOString().slice(0, 10);
    reply.header('Content-Disposition', `attachment; filename="pegelboard-backup-${date}.json"`);
    reply.header('Content-Type', 'application/json; charset=utf-8');
    return reply.send(JSON.stringify(backup, null, 2));
  });

  // ── Import ────────────────────────────────────────────────────────────────

  fastify.post(
    '/api/admin/backup/import',
    {
      ...auth,
      bodyLimit: 50 * 1024 * 1024, // 50 MB — aao_icons can be large base64 blobs
      schema: { body: { type: 'object', additionalProperties: true } },
    },
    async (req, reply) => {
      const body = req.body as unknown;

      // ── Structural validation ──────────────────────────────────────────

      if (!isRecord(body)) {
        return reply.code(400).send({ error: 'Ungültiges Format: kein JSON-Objekt' });
      }
      if (body.version !== 1) {
        return reply.code(400).send({
          error: `Backup-Version "${body.version}" wird nicht unterstützt. Erwartet: 1`,
        });
      }
      if (!isRecord(body.tables)) {
        return reply.code(400).send({ error: 'Backup enthält keine Tabellen' });
      }

      const tables = body.tables;
      const knownTables = ['config', 'gauge_stations', 'layouts', 'einsatzmittel', 'aao_icons', 'callsign_map'] as const;

      for (const name of knownTables) {
        if (tables[name] !== undefined && !Array.isArray(tables[name])) {
          return reply.code(400).send({ error: `Tabelle "${name}" ist kein Array` });
        }
      }

      // ── Transactional import ───────────────────────────────────────────

      const warnings: string[] = [];
      const imported: Record<string, number> = {};

      db.exec('BEGIN TRANSACTION');
      try {

        // config — upsert by key
        if (Array.isArray(tables.config)) {
          const upsert = db.prepare(
            'INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value'
          );
          let n = 0;
          for (const row of tables.config as unknown[]) {
            if (!isRecord(row) || typeof row.key !== 'string' || typeof row.value !== 'string') {
              warnings.push('config: Zeile ohne key/value übersprungen');
              continue;
            }
            upsert.run(row.key, row.value);
            n++;
          }
          imported.config = n;
        }

        // gauge_stations — upsert by station_id
        if (Array.isArray(tables.gauge_stations)) {
          const upsert = db.prepare(`
            INSERT INTO gauge_stations
              (station_id, name, river, latitude, longitude,
               warning_low, warning_medium, warning_high, warning_extreme,
               simulate_alarm, sort_order, default_history_hours)
            VALUES (?,?,?,?,?, ?,?,?,?, ?,?,?)
            ON CONFLICT(station_id) DO UPDATE SET
              name=excluded.name, river=excluded.river,
              latitude=excluded.latitude, longitude=excluded.longitude,
              warning_low=excluded.warning_low, warning_medium=excluded.warning_medium,
              warning_high=excluded.warning_high, warning_extreme=excluded.warning_extreme,
              simulate_alarm=excluded.simulate_alarm, sort_order=excluded.sort_order,
              default_history_hours=excluded.default_history_hours
          `);
          let n = 0;
          for (const row of tables.gauge_stations as unknown[]) {
            if (!isRecord(row) || typeof row.station_id !== 'string' || !row.station_id) {
              warnings.push('gauge_stations: Zeile ohne station_id übersprungen');
              continue;
            }
            upsert.run(
              row.station_id, str(row.name, '') ?? '',
              str(row.river), num(row.latitude), num(row.longitude),
              num(row.warning_low), num(row.warning_medium),
              num(row.warning_high), num(row.warning_extreme),
              num(row.simulate_alarm, 0), num(row.sort_order, 0),
              num(row.default_history_hours, 168),
            );
            n++;
          }
          imported.gauge_stations = n;
        }

        // layouts — upsert by name
        if (Array.isArray(tables.layouts)) {
          const upsert = db.prepare(`
            INSERT INTO layouts (name, config, created_at, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(name) DO UPDATE SET config=excluded.config, updated_at=excluded.updated_at
          `);
          let n = 0;
          for (const row of tables.layouts as unknown[]) {
            if (!isRecord(row) || typeof row.name !== 'string' || typeof row.config !== 'string') {
              warnings.push('layouts: Zeile ohne name/config übersprungen');
              continue;
            }
            const now = new Date().toISOString();
            upsert.run(row.name, row.config, str(row.created_at, now), str(row.updated_at, now));
            n++;
          }
          imported.layouts = n;
        }

        // einsatzmittel — upsert by name
        if (Array.isArray(tables.einsatzmittel)) {
          let n = 0;
          for (const row of tables.einsatzmittel as unknown[]) {
            if (!isRecord(row) || typeof row.name !== 'string') {
              warnings.push('einsatzmittel: Zeile ohne name übersprungen');
              continue;
            }
            const existing = db
              .prepare('SELECT id FROM einsatzmittel WHERE name = ?')
              .get(row.name) as { id: number } | undefined;

            if (existing) {
              db.prepare(`
                UPDATE einsatzmittel
                SET typ=?, status=?, notizen=?, sort_order=?, issi=?, icon_data=?, klarname=?
                WHERE id=?
              `).run(
                str(row.typ), str(row.status, 'verfügbar'), str(row.notizen),
                num(row.sort_order, 0), str(row.issi), str(row.icon_data), str(row.klarname),
                existing.id,
              );
            } else {
              db.prepare(`
                INSERT INTO einsatzmittel (name, typ, status, notizen, sort_order, issi, icon_data, klarname)
                VALUES (?,?,?,?,?,?,?,?)
              `).run(
                row.name, str(row.typ), str(row.status, 'verfügbar'), str(row.notizen),
                num(row.sort_order, 0), str(row.issi), str(row.icon_data), str(row.klarname),
              );
            }
            n++;
          }
          imported.einsatzmittel = n;
        }

        // aao_icons — upsert by name
        if (Array.isArray(tables.aao_icons)) {
          let n = 0;
          for (const row of tables.aao_icons as unknown[]) {
            if (!isRecord(row) || typeof row.name !== 'string' || typeof row.data !== 'string') {
              warnings.push('aao_icons: Zeile ohne name/data übersprungen');
              continue;
            }
            const existing = db
              .prepare('SELECT id FROM aao_icons WHERE name = ?')
              .get(row.name) as { id: number } | undefined;

            if (existing) {
              db.prepare('UPDATE aao_icons SET data=? WHERE id=?').run(row.data, existing.id);
            } else {
              db.prepare('INSERT INTO aao_icons (name, data) VALUES (?,?)').run(row.name, row.data);
            }
            n++;
          }
          imported.aao_icons = n;
        }

        // callsign_map — insert-only when no matching row exists (display_name + pattern combo)
        if (Array.isArray(tables.callsign_map)) {
          let n = 0;
          for (const row of tables.callsign_map as unknown[]) {
            if (!isRecord(row) || typeof row.display_name !== 'string') {
              warnings.push('callsign_map: Zeile ohne display_name übersprungen');
              continue;
            }
            const icao24 = str(row.icao24);
            const pattern = str(row.callsign_pattern);
            const existing = db.prepare(`
              SELECT id FROM callsign_map
              WHERE display_name=?
                AND (icao24 IS ? OR icao24=?)
                AND (callsign_pattern IS ? OR callsign_pattern=?)
            `).get(row.display_name, icao24, icao24, pattern, pattern);

            if (!existing) {
              db.prepare('INSERT INTO callsign_map (icao24, callsign_pattern, display_name) VALUES (?,?,?)').run(
                icao24, pattern, row.display_name,
              );
              n++;
            }
          }
          imported.callsign_map = n;
        }

        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        fastify.log.error(err, 'backup import failed');
        return reply.code(500).send({
          error: 'Import fehlgeschlagen: ' + (err instanceof Error ? err.message : String(err)),
        });
      }

      return { ok: true, imported, warnings };
    },
  );
}
