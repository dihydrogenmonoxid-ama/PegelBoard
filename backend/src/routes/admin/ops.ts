import type { FastifyInstance } from 'fastify';
import { db } from '../../db/database.js';

interface OpsEntry {
  id: number;
  text: string;
  author: string;
  created_at: string;
}

export async function adminOpsRoutes(fastify: FastifyInstance) {
  fastify.get('/api/admin/ops-log', { onRequest: [fastify.authenticate] }, async () => {
    return db.prepare('SELECT * FROM einsatz_log ORDER BY created_at DESC LIMIT 50').all() as unknown as OpsEntry[];
  });

  fastify.post(
    '/api/admin/ops-log',
    {
      onRequest: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['text'],
          properties: {
            text: { type: 'string', minLength: 1, maxLength: 2000 },
            author: { type: 'string', maxLength: 64 },
          },
        },
      },
    },
    async (req) => {
      const { text, author } = req.body as { text: string; author?: string };
      const result = db.prepare('INSERT INTO einsatz_log (text, author) VALUES (?, ?)').run(text, author ?? 'admin');
      return db.prepare('SELECT * FROM einsatz_log WHERE id = ?').get(result.lastInsertRowid) as unknown as OpsEntry;
    }
  );

  fastify.delete<{ Params: { id: string } }>(
    '/api/admin/ops-log/:id',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      const result = db.prepare('DELETE FROM einsatz_log WHERE id = ?').run(Number(req.params.id));
      if (result.changes === 0) return reply.code(404).send({ error: 'Nicht gefunden' });
      return { ok: true };
    }
  );
}
