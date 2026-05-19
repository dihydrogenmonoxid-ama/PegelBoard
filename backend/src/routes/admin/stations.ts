import type { FastifyInstance } from 'fastify';
import { db } from '../../db/database.js';
import { fetchStations, fetchCharacteristicValues } from '../../services/pegelonline.js';

interface StationRow {
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
  simulate_alarm: number;
  sort_order: number;
  default_history_hours: number;
}

export async function adminStationRoutes(fastify: FastifyInstance) {
  const auth = { onRequest: [fastify.authenticate] };

  fastify.get('/api/admin/stations', auth, async () => {
    return db.prepare('SELECT * FROM gauge_stations ORDER BY sort_order ASC, name ASC').all() as unknown as StationRow[];
  });

  fastify.post(
    '/api/admin/stations',
    {
      ...auth,
      schema: {
        body: {
          type: 'object',
          required: ['station_id', 'name'],
          properties: {
            station_id: { type: 'string' },
            name: { type: 'string' },
            river: { type: 'string' },
            latitude: { type: 'number' },
            longitude: { type: 'number' },
            warning_low: { type: 'number' },
            warning_medium: { type: 'number' },
            warning_high: { type: 'number' },
            warning_extreme: { type: 'number' },
          },
        },
      },
    },
    async (req, reply) => {
      const body = req.body as Partial<StationRow>;
      try {
        const result = db
          .prepare(
            `INSERT INTO gauge_stations (station_id, name, river, latitude, longitude, warning_low, warning_medium, warning_high, warning_extreme)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            body.station_id ?? '',
            body.name ?? '',
            body.river ?? null,
            body.latitude ?? null,
            body.longitude ?? null,
            body.warning_low ?? null,
            body.warning_medium ?? null,
            body.warning_high ?? null,
            body.warning_extreme ?? null
          );
        return { id: result.lastInsertRowid };
      } catch {
        return reply.code(409).send({ error: 'Station bereits vorhanden' });
      }
    }
  );

  fastify.put(
    '/api/admin/stations/:id',
    {
      ...auth,
      schema: {
        body: {
          type: 'object',
          properties: {
            warning_low: { type: ['number', 'null'] },
            warning_medium: { type: ['number', 'null'] },
            warning_high: { type: ['number', 'null'] },
            warning_extreme: { type: ['number', 'null'] },
            default_history_hours: { type: 'number' },
          },
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = req.body as Partial<StationRow>;
      const result = db
        .prepare(
          `UPDATE gauge_stations
           SET warning_low=?, warning_medium=?, warning_high=?, warning_extreme=?,
               default_history_hours=COALESCE(?, default_history_hours)
           WHERE id=?`
        )
        .run(
          body.warning_low ?? null,
          body.warning_medium ?? null,
          body.warning_high ?? null,
          body.warning_extreme ?? null,
          body.default_history_hours ?? null,
          id
        );
      if (result.changes === 0) return reply.code(404).send({ error: 'Nicht gefunden' });
      return { ok: true };
    }
  );

  // Reihenfolge aller Stationen setzen
  fastify.patch('/api/admin/stations/reorder', auth, async (req, reply) => {
    const { orderedIds } = req.body as { orderedIds: number[] };
    if (!Array.isArray(orderedIds)) return reply.code(400).send({ error: 'orderedIds required' });
    const upd = db.prepare('UPDATE gauge_stations SET sort_order=? WHERE id=?');
    orderedIds.forEach((id, idx) => upd.run(idx, id));
    return { ok: true };
  });

  // Schwellen automatisch aus PEGELONLINE Characteristic Values abrufen
  fastify.post('/api/admin/stations/:id/fetch-thresholds', auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const station = db.prepare('SELECT station_id FROM gauge_stations WHERE id=?').get(id) as { station_id: string } | undefined;
    if (!station) return reply.code(404).send({ error: 'Station nicht gefunden' });
    try {
      const vals = await fetchCharacteristicValues(station.station_id);
      return { thresholds: vals };
    } catch (err) {
      return reply.code(502).send({ error: 'Characteristic Values nicht abrufbar', detail: String(err) });
    }
  });

  fastify.patch('/api/admin/stations/simulate-alarm', auth, async (req) => {
    const { active } = req.body as { active: boolean };
    db.prepare('UPDATE gauge_stations SET simulate_alarm = ?').run(active ? 1 : 0);
    return { ok: true };
  });

  fastify.delete('/api/admin/stations/:id', auth, async (req, reply) => {
    const { id } = req.params as { id: string };
    const result = db.prepare('DELETE FROM gauge_stations WHERE id = ?').run(id);
    if (result.changes === 0) return reply.code(404).send({ error: 'Nicht gefunden' });
    return { ok: true };
  });

  // PEGELONLINE-Stationssuche (Proxy)
  fastify.get(
    '/api/admin/stations/search',
    {
      ...auth,
      schema: { querystring: { type: 'object', properties: { q: { type: 'string' } } } },
    },
    async (req, reply) => {
      const { q } = req.query as { q?: string };
      try {
        const all = await fetchStations();
        if (!q) return all.slice(0, 50);
        const term = q.toLowerCase();
        return all
          .filter(
            (s) =>
              s.longname.toLowerCase().includes(term) ||
              s.shortname.toLowerCase().includes(term) ||
              s.water.longname.toLowerCase().includes(term)
          )
          .slice(0, 50);
      } catch (err) {
        return reply.code(502).send({ error: 'PEGELONLINE nicht erreichbar', detail: String(err) });
      }
    }
  );
}
