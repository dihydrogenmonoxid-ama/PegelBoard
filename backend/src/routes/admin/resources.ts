import type { FastifyInstance } from 'fastify';
import { db } from '../../db/database.js';

interface Einsatzmittel {
  id: number;
  name: string;
  klarname: string | null;
  typ: string | null;
  status: string;
  notizen: string | null;
  sort_order: number;
  issi: string | null;
  icon_data: string | null;
}

interface EinsatzmittelPublic extends Omit<Einsatzmittel, 'icon_data'> {
  has_icon: boolean;
}

const bodySchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 128 },
    klarname: { type: 'string', maxLength: 128, nullable: true },
    typ: { type: 'string', maxLength: 64 },
    status: { type: 'string', maxLength: 64 },
    notizen: { type: 'string', maxLength: 500 },
    sort_order: { type: 'integer' },
    issi: { type: 'string', maxLength: 20 },
  },
};

function toPublic(row: Einsatzmittel): EinsatzmittelPublic {
  const { icon_data, ...rest } = row;
  return { ...rest, has_icon: icon_data != null };
}

export async function adminResourcesRoutes(fastify: FastifyInstance) {
  // Öffentlich – Dashboard kann die Liste abrufen (ohne icon_data Blob)
  fastify.get('/api/einsatzmittel', async () => {
    const rows = db.prepare('SELECT * FROM einsatzmittel ORDER BY sort_order, name').all() as unknown as Einsatzmittel[];
    return rows.map(toPublic);
  });

  // Öffentlich – Icon für ein einzelnes Einsatzmittel
  fastify.get<{ Params: { id: string } }>('/api/einsatzmittel/:id/icon', async (req, reply) => {
    const row = db.prepare('SELECT icon_data FROM einsatzmittel WHERE id = ?').get(Number(req.params.id)) as { icon_data: string | null } | undefined;
    if (!row?.icon_data) return reply.code(404).send({ error: 'Kein Icon' });
    const [header, base64] = row.icon_data.split(',');
    const mime = header.match(/data:([^;]+)/)?.[1] ?? 'image/png';
    reply.header('Content-Type', mime).header('Cache-Control', 'max-age=3600');
    return reply.send(Buffer.from(base64, 'base64'));
  });

  fastify.get('/api/admin/einsatzmittel', { onRequest: [fastify.authenticate] }, async () => {
    const rows = db.prepare('SELECT * FROM einsatzmittel ORDER BY sort_order, name').all() as unknown as Einsatzmittel[];
    return rows.map(toPublic);
  });

  fastify.post(
    '/api/admin/einsatzmittel',
    { onRequest: [fastify.authenticate], schema: { body: { ...bodySchema, required: ['name'] } } },
    async (req) => {
      const { name, klarname, typ, status, notizen, sort_order, issi } = req.body as Einsatzmittel;
      const result = db
        .prepare('INSERT INTO einsatzmittel (name, klarname, typ, status, notizen, sort_order, issi) VALUES (?,?,?,?,?,?,?)')
        .run(name, klarname ?? null, typ ?? null, status ?? 'verfügbar', notizen ?? null, sort_order ?? 0, issi ?? null);
      const row = db.prepare('SELECT * FROM einsatzmittel WHERE id = ?').get(result.lastInsertRowid) as unknown as Einsatzmittel;
      return toPublic(row);
    }
  );

  fastify.put<{ Params: { id: string } }>(
    '/api/admin/einsatzmittel/:id',
    { onRequest: [fastify.authenticate], schema: { body: bodySchema } },
    async (req, reply) => {
      const { name, klarname, typ, status, notizen, sort_order, issi } = req.body as Partial<Einsatzmittel>;
      const result = db
        .prepare(
          `UPDATE einsatzmittel SET
            name = COALESCE(?, name),
            klarname = ?,
            typ = COALESCE(?, typ),
            status = COALESCE(?, status),
            notizen = COALESCE(?, notizen),
            sort_order = COALESCE(?, sort_order),
            issi = ?
          WHERE id = ?`
        )
        .run(name ?? null, klarname ?? null, typ ?? null, status ?? null, notizen ?? null, sort_order ?? null, issi ?? null, Number(req.params.id));
      if (result.changes === 0) return reply.code(404).send({ error: 'Nicht gefunden' });
      const row = db.prepare('SELECT * FROM einsatzmittel WHERE id = ?').get(Number(req.params.id)) as unknown as Einsatzmittel;
      return toPublic(row);
    }
  );

  // Icon-Upload (max 1 MB, base64 in DB speichern)
  fastify.post<{ Params: { id: string } }>(
    '/api/admin/einsatzmittel/:id/icon',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      const data = await req.file({ limits: { fileSize: 1 * 1024 * 1024 } });
      if (!data) return reply.code(400).send({ error: 'Kein Datei-Upload' });
      const buf = await data.toBuffer();
      const base64 = `data:${data.mimetype};base64,${buf.toString('base64')}`;
      const result = db.prepare('UPDATE einsatzmittel SET icon_data = ? WHERE id = ?').run(base64, Number(req.params.id));
      if (result.changes === 0) return reply.code(404).send({ error: 'Nicht gefunden' });
      return { ok: true };
    }
  );

  fastify.delete<{ Params: { id: string } }>(
    '/api/admin/einsatzmittel/:id/icon',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      const result = db.prepare('UPDATE einsatzmittel SET icon_data = NULL WHERE id = ?').run(Number(req.params.id));
      if (result.changes === 0) return reply.code(404).send({ error: 'Nicht gefunden' });
      return { ok: true };
    }
  );

  fastify.delete<{ Params: { id: string } }>(
    '/api/admin/einsatzmittel/:id',
    { onRequest: [fastify.authenticate] },
    async (req, reply) => {
      const result = db.prepare('DELETE FROM einsatzmittel WHERE id = ?').run(Number(req.params.id));
      if (result.changes === 0) return reply.code(404).send({ error: 'Nicht gefunden' });
      return { ok: true };
    }
  );
}
