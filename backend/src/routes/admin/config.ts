import type { FastifyInstance } from 'fastify';
import { db } from '../../db/database.js';

const ALLOWED_KEYS = new Set([
  // Standort & API
  'nina_ags_prefix',
  'poll_interval_ms',
  'dwd_region_filter',
  'location_lat',
  'location_lon',
  'location_name',
  'location_bbox',
  // Dashboard-Darstellung
  'logo_base64',
  'show_map',
  'show_news',
  'dashboard_layout',
  'tagesnachricht',
  'daynight_mode',
  // Warnfarben
  'color_warn_normal',
  'color_warn_elevated',
  'color_warn_critical',
  'color_warn_alarm',
  // GPIO
  'gpio_enabled',
  'gpio_pin_green',
  'gpio_pin_yellow',
  'gpio_pin_red',
  // Hubschrauber-Tracking
  'opensky_enabled',
  'opensky_api_key',
  'opensky_bbox',
  // AAO (wird über eigene Route gesetzt, aber hier auch erlaubt)
  'aao_config',
  // Nachrichtenquelle (RSS-URL)
  'news_feed_url',
]);

export async function adminConfigRoutes(fastify: FastifyInstance) {
  const auth = { onRequest: [fastify.authenticate] };

  fastify.get('/api/admin/config', auth, async () => {
    const rows = db.prepare('SELECT key, value FROM config').all() as Array<{
      key: string;
      value: string;
    }>;
    // Only return known keys to prevent stale/deprecated keys from being echoed back
    return Object.fromEntries(rows.filter((r) => ALLOWED_KEYS.has(r.key)).map((r) => [r.key, r.value]));
  });

  fastify.put(
    '/api/admin/config',
    {
      ...auth,
      schema: {
        body: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
    async (req, reply) => {
      const body = req.body as Record<string, string>;
      const upsert = db.prepare(
        'INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value'
      );

      for (const [key, value] of Object.entries(body)) {
        if (!ALLOWED_KEYS.has(key)) continue; // silently skip unknown/deprecated keys
        upsert.run(key, value);
      }
      return { ok: true };
    }
  );
}
