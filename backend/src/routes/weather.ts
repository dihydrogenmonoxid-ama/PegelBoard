import type { FastifyInstance } from 'fastify';
import { fetchCurrentWeather, fetchForecast } from '../services/brightsky.js';
import { db } from '../db/database.js';
import { recordFetchSuccess, recordFetchError } from '../lib/cache.js';

function getConfiguredLocation() {
  const cfgLat = db.prepare("SELECT value FROM config WHERE key='location_lat'").get() as { value: string } | undefined;
  const cfgLon = db.prepare("SELECT value FROM config WHERE key='location_lon'").get() as { value: string } | undefined;
  return {
    lat: Number(cfgLat?.value ?? 51.0),
    lon: Number(cfgLon?.value ?? 10.5),
  };
}

export async function weatherRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { lat?: string; lon?: string } }>(
    '/api/weather',
    async (req, reply) => {
      const cfg = getConfiguredLocation();
      const lat = Number(req.query.lat ?? cfg.lat);
      const lon = Number(req.query.lon ?? cfg.lon);

      try {
        const result = await fetchCurrentWeather(lat, lon);
        recordFetchSuccess('brightsky');
        return result;
      } catch (err) {
        recordFetchError('brightsky', err);
        return reply.code(502).send({ error: 'Bright Sky nicht erreichbar', detail: String(err) });
      }
    }
  );

  fastify.get<{ Querystring: { lat?: string; lon?: string; hours?: string } }>(
    '/api/weather/forecast',
    async (req, reply) => {
      const cfg = getConfiguredLocation();
      const lat = Number(req.query.lat ?? cfg.lat);
      const lon = Number(req.query.lon ?? cfg.lon);
      const hours = Number(req.query.hours ?? 24);

      try {
        return await fetchForecast(lat, lon, hours);
      } catch (err) {
        return reply.code(502).send({ error: 'Vorhersage nicht verfügbar', detail: String(err) });
      }
    }
  );
}
