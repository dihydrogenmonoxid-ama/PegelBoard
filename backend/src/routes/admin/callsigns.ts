import type { FastifyInstance } from 'fastify';
import { db } from '../../db/database.js';

interface CallsignMap {
  id: number;
  icao24: string | null;
  callsign_pattern: string | null;
  display_name: string;
}

const bodySchema = {
  type: 'object',
  properties: {
    icao24:           { type: 'string', maxLength: 6 },
    callsign_pattern: { type: 'string', maxLength: 20 },
    display_name:     { type: 'string', minLength: 1, maxLength: 64 },
  },
};

export async function adminCallsignRoutes(fastify: FastifyInstance) {
  fastify.get('/api/admin/callsign-map', { onRequest: [fastify.authenticate] }, async () => {
    return db.prepare('SELECT * FROM callsign_map ORDER BY display_name').all() as unknown as CallsignMap[];
  });

  fastify.post(
    '/api/admin/callsign-map',
    { onRequest: [fastify.authenticate], schema: { body: { ...bodySchema, required: ['display_name'] } } },
    async (req) => {
      const { icao24, callsign_pattern, display_name } = req.body as Partial<CallsignMap>;
      const result = db
        .prepare('INSERT INTO callsign_map (icao24, callsign_pattern, display_name) VALUES (?,?,?)')
        .run(icao24 ?? null, callsign_pattern ?? null, display_name!);
      return db.prepare('SELECT * FROM callsign_map WHERE id = ?').get(result.lastInsertRowid) as unknown as CallsignMap;
    }
  );

  fastify.put<{ Params: { id: string } }>(
    '/api/admin/callsign-map/:id',
    { onRequest: [fastify.authenticate], schema: { body: bodySchema } },
    async (req, reply) => {
      const { icao24, callsign_pattern, display_name } = req.body as Partial<CallsignMap>;
      const result = db
        .prepare(
          `UPDATE callsign_map SET
            icao24 = ?,
            callsign_pattern = ?,
            display_name = COALESCE(?, display_name)
          WHERE id = ?`
        )
        .run(icao24 ?? null, callsign_pattern ?? null, display_name ?? null, Number(req.params.id));
      if (result.changes === 0) return reply.code(404).send({ error: 'Nicht gefunden' });
      return db.prepare('SELECT * FROM callsign_map WHERE id = ?').get(Number(req.params.id)) as unknown as CallsignMap;
    }
  );

  fastify.delete<{ Params: { id: string } }>(
    '/api/admin/callsign-map/:id',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      const result = db.prepare('DELETE FROM callsign_map WHERE id = ?').run(Number(req.params.id));
      if (result.changes === 0) return reply.code(404).send({ error: 'Nicht gefunden' });
      return { ok: true };
    }
  );
}
