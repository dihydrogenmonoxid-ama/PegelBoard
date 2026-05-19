import type { FastifyInstance } from 'fastify';
import { fetchStationCurrent, fetchStationForecast, fetchStationHistory, fetchStations } from '../services/pegelonline.js';
import { db } from '../db/database.js';

interface DbStation {
  id: number;
  station_id: string;
  name: string;
  river: string | null;
  latitude: number | null;
  longitude: number | null;
  warning_low: number | null;
  warning_medium: number | null;
  warning_high: number | null;
  warning_extreme: number | null;
  sort_order: number;
  default_history_hours: number;
}

export async function gaugeRoutes(fastify: FastifyInstance) {
  // Vom Admin konfigurierte Stationen (öffentlich, für das Dashboard)
  fastify.get('/api/gauges/configured', async () => {
    return db.prepare('SELECT * FROM gauge_stations ORDER BY sort_order ASC, name ASC').all() as unknown as DbStation[];
  });

  // Alle PEGELONLINE-Stationen (Suche im Admin)
  fastify.get('/api/gauges/stations', async (_req, reply) => {
    try {
      return await fetchStations();
    } catch (err) {
      return reply.code(502).send({ error: 'PEGELONLINE nicht erreichbar', detail: String(err) });
    }
  });

  // Aktuelle Messung einer Station
  fastify.get<{ Params: { id: string } }>('/api/gauges/:id/current', async (req, reply) => {
    try {
      return await fetchStationCurrent(req.params.id);
    } catch (err) {
      return reply.code(502).send({ error: 'Messung nicht abrufbar', detail: String(err) });
    }
  });

  // Verlaufsdaten (Standard: 48h)
  fastify.get<{ Params: { id: string }; Querystring: { hours?: string } }>(
    '/api/gauges/:id/history',
    async (req, reply) => {
      const hours = Number(req.query.hours ?? 48);
      try {
        return await fetchStationHistory(req.params.id, hours);
      } catch (err) {
        return reply.code(502).send({ error: 'Verlauf nicht abrufbar', detail: String(err) });
      }
    }
  );

  // Prognose (leer wenn Station keine Prognose hat)
  fastify.get<{ Params: { id: string } }>('/api/gauges/:id/forecast', async (req) => {
    return fetchStationForecast(req.params.id);
  });
}
