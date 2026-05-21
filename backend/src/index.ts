import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { authPlugin } from './plugins/auth.js';
import { websocketPlugin, broadcast } from './plugins/websocket.js';
import { gaugeRoutes } from './routes/gauges.js';
import { warningRoutes } from './routes/warnings.js';
import { authRoutes } from './routes/auth.js';
import { newsRoutes } from './routes/news.js';
import { publicConfigRoutes } from './routes/config.js';
import { sunRoutes } from './routes/sun.js';
import { statusRoutes } from './routes/status.js';
import { helicopterRoutes } from './routes/helicopters.js';
import { adminStationRoutes } from './routes/admin/stations.js';
import { adminConfigRoutes } from './routes/admin/config.js';
import { adminUserRoutes } from './routes/admin/users.js';
import { adminOpsRoutes } from './routes/admin/ops.js';
import { adminResourcesRoutes } from './routes/admin/resources.js';
import { adminAaoRoutes } from './routes/admin/aao.js';
import { adminGeocodeRoutes } from './routes/admin/geocode.js';
import { adminCallsignRoutes } from './routes/admin/callsigns.js';
import { adminUpdateRoutes } from './routes/admin/update.js';
import { adminBackupRoutes } from './routes/admin/backup.js';
import { weatherRoutes } from './routes/weather.js';
import { slipwayRoutes } from './routes/slipways.js';
import { fetchStationCurrent } from './services/pegelonline.js';
import { db } from './db/database.js';
import { recordFetchSuccess, recordFetchError } from './lib/cache.js';
import { setGpioLevel } from './lib/gpio.js';

const PORT = Number(process.env.PORT ?? 4000);
const HOST = process.env.HOST ?? '0.0.0.0';
const IS_DEV = process.env.NODE_ENV !== 'production';

const fastify = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' } });

await fastify.register(cors, {
  origin: IS_DEV ? (process.env.FRONTEND_URL ?? 'http://localhost:3000') : false,
  credentials: true,
});
await fastify.register(rateLimit, { global: false });
await fastify.register(multipart, { limits: { fileSize: 2 * 1024 * 1024 } }); // 2 MB
await fastify.register(authPlugin);
await fastify.register(websocketPlugin);

// Public routes
await fastify.register(authRoutes);
await fastify.register(gaugeRoutes);
await fastify.register(warningRoutes);
await fastify.register(newsRoutes);
await fastify.register(publicConfigRoutes);
await fastify.register(sunRoutes);
await fastify.register(statusRoutes);
await fastify.register(helicopterRoutes);
await fastify.register(weatherRoutes);
await fastify.register(slipwayRoutes);

// Admin routes
await fastify.register(adminStationRoutes);
await fastify.register(adminConfigRoutes);
await fastify.register(adminUserRoutes);
await fastify.register(adminOpsRoutes);
await fastify.register(adminResourcesRoutes);
await fastify.register(adminAaoRoutes);
await fastify.register(adminGeocodeRoutes);
await fastify.register(adminCallsignRoutes);
await fastify.register(adminUpdateRoutes);
await fastify.register(adminBackupRoutes);

fastify.get('/api/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));

// Serve built frontend in production
if (!IS_DEV) {
  const { default: staticPlugin } = await import('@fastify/static');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const __dir = dirname(fileURLToPath(import.meta.url));
  const distPath = join(__dir, '../../frontend/dist');

  await fastify.register(staticPlugin, { root: distPath, wildcard: false });
  fastify.get('/*', (_req, reply) => reply.sendFile('index.html'));
}

// GPIO: determine pin states from alert level
function applyGpio(maxWarnLevel: number) {
  const enabled = (db.prepare('SELECT value FROM config WHERE key=?').get('gpio_enabled') as { value: string } | undefined)?.value;
  if (enabled !== 'true') return;

  const pinGreen  = Number((db.prepare('SELECT value FROM config WHERE key=?').get('gpio_pin_green')  as { value: string } | undefined)?.value ?? 0);
  const pinYellow = Number((db.prepare('SELECT value FROM config WHERE key=?').get('gpio_pin_yellow') as { value: string } | undefined)?.value ?? 0);
  const pinRed    = Number((db.prepare('SELECT value FROM config WHERE key=?').get('gpio_pin_red')    as { value: string } | undefined)?.value ?? 0);

  if (pinGreen)  setGpioLevel(pinGreen,  maxWarnLevel <= 1 ? 1 : 0);
  if (pinYellow) setGpioLevel(pinYellow, maxWarnLevel === 2 ? 1 : 0);
  if (pinRed)    setGpioLevel(pinRed,    maxWarnLevel >= 3 ? 1 : 0);
}

function startPolling() {
  const getInterval = () => {
    const row = db.prepare('SELECT value FROM config WHERE key = ?').get('poll_interval_ms') as
      | { value: string }
      | undefined;
    return Number(row?.value ?? process.env.POLL_INTERVAL_MS ?? 120_000);
  };

  const poll = async () => {
    const rows = db.prepare('SELECT station_id FROM gauge_stations').all() as Array<{
      station_id: string;
    }>;

    let maxWarnLevel = 0;

    for (const { station_id } of rows) {
      try {
        const data = await fetchStationCurrent(station_id);
        recordFetchSuccess('pegelonline');
        broadcast('gauge:update', data);

        // Determine alert level for GPIO
        const station = db.prepare('SELECT * FROM gauge_stations WHERE station_id = ?').get(station_id) as {
          warning_low: number | null;
          warning_medium: number | null;
          warning_high: number | null;
          warning_extreme: number | null;
        } | undefined;

        if (station) {
          const value = data.timeseries?.find((t) => t.shortname === 'W')?.currentMeasurement?.value ?? 0;
          let level = 0;
          if (station.warning_low    != null && value >= station.warning_low)    level = 1;
          if (station.warning_medium != null && value >= station.warning_medium) level = 2;
          if (station.warning_high   != null && value >= station.warning_high)   level = 3;
          if (station.warning_extreme != null && value >= station.warning_extreme) level = 4;
          if (level > maxWarnLevel) maxWarnLevel = level;
        }
      } catch (err) {
        recordFetchError('pegelonline', err);
      }
    }

    applyGpio(maxWarnLevel);
    setTimeout(poll, getInterval());
  };

  setTimeout(poll, getInterval());
}

await fastify.listen({ port: PORT, host: HOST });
startPolling();
