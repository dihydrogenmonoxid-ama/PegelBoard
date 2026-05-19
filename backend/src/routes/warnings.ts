import type { FastifyInstance } from 'fastify';
import { db } from '../db/database.js';
import { fetchDwdWarnings } from '../services/dwd.js';
import { fetchNinaWarnings } from '../services/nina.js';
import { fetchLhpAlerts } from '../services/lhp.js';
import { recordFetchSuccess, recordFetchError } from '../lib/cache.js';

function getConfigValue(key: string): string | undefined {
  const row = db.prepare('SELECT value FROM config WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  return row?.value;
}

export async function warningRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { region?: string } }>('/api/warnings/dwd', async (req, reply) => {
    try {
      const data = await fetchDwdWarnings();
      recordFetchSuccess('dwd');
      const region = req.query.region ?? getConfigValue('dwd_region_filter');
      if (!region) return data;
      const filter = region.toLowerCase();
      const filterWarnings = (rec: Record<string, typeof data.warnings[string]>) =>
        Object.fromEntries(
          Object.entries(rec)
            .map(([k, ws]) => [k, ws.filter((w) => w.regionName.toLowerCase().includes(filter))] as const)
            .filter(([, ws]) => ws.length > 0)
        );
      return { ...data, warnings: filterWarnings(data.warnings), vorabInformation: filterWarnings(data.vorabInformation) };
    } catch (err) {
      recordFetchError('dwd', err);
      reply.code(502);
      return { error: 'DWD nicht erreichbar', detail: String(err) };
    }
  });

  fastify.get<{ Querystring: { ars?: string } }>('/api/warnings/nina', async (req, reply) => {
    const ars = req.query.ars ?? getConfigValue('nina_ags_prefix');
    try {
      const result = await fetchNinaWarnings(ars);
      recordFetchSuccess('nina');
      return result;
    } catch (err) {
      recordFetchError('nina', err);
      reply.code(502);
      return { error: 'NINA nicht erreichbar', detail: String(err) };
    }
  });

  // LHP Hochwasserwarnungen – gefiltert nach konfigurierten Gewässern
  fastify.get('/api/warnings/lhp', async (_req, reply) => {
    try {
      const alerts = await fetchLhpAlerts();
      recordFetchSuccess('lhp');
      // Gewässer der konfigurierten Stationen als Filter
      const rows = db.prepare('SELECT river FROM gauge_stations WHERE river IS NOT NULL').all() as Array<{ river: string }>;
      const rivers = new Set(rows.map((r) => r.river.toLowerCase()));
      const filtered = rivers.size === 0
        ? alerts
        : alerts.filter((a) => !a.river || rivers.has(a.river.toLowerCase()));
      return filtered;
    } catch (err) {
      recordFetchError('lhp', err);
      reply.code(502);
      return { error: 'LHP nicht erreichbar', detail: String(err) };
    }
  });
}
