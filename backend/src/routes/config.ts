import type { FastifyInstance } from 'fastify';
import { db } from '../db/database.js';

// Keys exposed to the unauthenticated dashboard
const PUBLIC_KEYS = new Set([
  'show_map',
  'show_news',
  'logo_base64',
  'color_warn_normal',
  'color_warn_elevated',
  'color_warn_critical',
  'color_warn_alarm',
  'location_lat',
  'location_lon',
  'location_bbox',
  'dashboard_layout',
  'daynight_mode',
  'opensky_enabled',
  'tagesnachricht',
  'map_style',
  'slipways_enabled',
  'radar_enabled',
  'aao_position',
  'em_name_mode',
]);

export async function publicConfigRoutes(fastify: FastifyInstance) {
  fastify.get('/api/config/public', async () => {
    const rows = db.prepare('SELECT key, value FROM config').all() as Array<{
      key: string;
      value: string;
    }>;
    return Object.fromEntries(rows.filter((r) => PUBLIC_KEYS.has(r.key)).map((r) => [r.key, r.value]));
  });
}
