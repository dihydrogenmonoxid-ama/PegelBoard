import type { FastifyInstance } from 'fastify';
import { db } from '../db/database.js';
import { fetchHelicopters } from '../services/opensky.js';
import { recordFetchSuccess, recordFetchError } from '../lib/cache.js';

interface CallsignMap {
  icao24: string | null;
  callsign_pattern: string | null;
  display_name: string;
}

function resolveDisplayName(icao24: string, callsign: string, mappings: CallsignMap[]): string | undefined {
  // Exact icao24 match first
  const byIcao = mappings.find((m) => m.icao24 && m.icao24.toLowerCase() === icao24.toLowerCase());
  if (byIcao) return byIcao.display_name;
  // callsign_pattern match (prefix)
  const byCallsign = mappings.find((m) => m.callsign_pattern && callsign.toLowerCase().startsWith(m.callsign_pattern.toLowerCase()));
  if (byCallsign) return byCallsign.display_name;
  return undefined;
}

export async function helicopterRoutes(fastify: FastifyInstance) {
  fastify.get('/api/helicopters', async (_req, reply) => {
    const enabledRow = db.prepare('SELECT value FROM config WHERE key = ?').get('opensky_enabled') as { value: string } | undefined;
    if (enabledRow?.value !== 'true') return [];

    const bboxRow = db.prepare('SELECT value FROM config WHERE key = ?').get('opensky_bbox') as { value: string } | undefined;
    const apiKeyRow = db.prepare('SELECT value FROM config WHERE key = ?').get('opensky_api_key') as { value: string } | undefined;

    let bbox = { lamin: 47.0, lomin: 5.5, lamax: 55.5, lomax: 15.5 };
    if (bboxRow?.value) {
      try { bbox = JSON.parse(bboxRow.value) as typeof bbox; } catch { /* ungültig, Standard verwenden */ }
    }

    const mappings = db.prepare('SELECT icao24, callsign_pattern, display_name FROM callsign_map').all() as unknown as CallsignMap[];

    try {
      const helicopters = await fetchHelicopters(bbox, apiKeyRow?.value);
      recordFetchSuccess('opensky');
      return helicopters.map((h) => ({
        ...h,
        display_name: resolveDisplayName(h.icao24, h.callsign, mappings),
      }));
    } catch (err) {
      recordFetchError('opensky', err);
      return reply.code(502).send({ error: 'OpenSky nicht erreichbar', detail: String(err) });
    }
  });
}
