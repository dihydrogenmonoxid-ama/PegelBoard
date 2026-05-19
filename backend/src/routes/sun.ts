import type { FastifyInstance } from 'fastify';
import SunCalc from 'suncalc';
import { db } from '../db/database.js';

export async function sunRoutes(fastify: FastifyInstance) {
  fastify.get('/api/sun', async (_req, reply) => {
    const latRow = db.prepare('SELECT value FROM config WHERE key = ?').get('location_lat') as { value: string } | undefined;
    const lonRow = db.prepare('SELECT value FROM config WHERE key = ?').get('location_lon') as { value: string } | undefined;

    if (!latRow || !lonRow) {
      return reply.code(400).send({ error: 'Standort nicht konfiguriert' });
    }

    const lat = Number(latRow.value);
    const lon = Number(lonRow.value);
    const now = new Date();
    const times = SunCalc.getTimes(now, lat, lon);

    return {
      sunrise: times.sunrise.toISOString(),
      sunset: times.sunset.toISOString(),
      solarNoon: times.solarNoon.toISOString(),
      now: now.toISOString(),
    };
  });
}
