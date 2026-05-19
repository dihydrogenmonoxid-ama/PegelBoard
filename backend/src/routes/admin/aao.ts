import type { FastifyInstance } from 'fastify';
import { db } from '../../db/database.js';

export interface AaoMittel {
  einsatzmittel_id: number;
  reihenfolge: number;
}

export interface AaoStichwort {
  id: string;
  label: string;
  mittel: AaoMittel[];
}

export interface AaoConfig {
  stichwoerter: AaoStichwort[];
}

function loadAaoConfig(): AaoConfig {
  const row = db.prepare('SELECT value FROM config WHERE key = ?').get('aao_config') as { value: string } | undefined;
  if (!row?.value) return { stichwoerter: [] };
  try {
    const parsed = JSON.parse(row.value) as Record<string, unknown>;
    // Migrate old matrix format if present
    if (!parsed.stichwoerter) return { stichwoerter: [] };
    return parsed as unknown as AaoConfig;
  } catch {
    return { stichwoerter: [] };
  }
}

export async function adminAaoRoutes(fastify: FastifyInstance) {
  // Öffentlich – Dashboard liest AAO ohne Auth
  fastify.get('/api/aao', async () => {
    return loadAaoConfig();
  });

  fastify.get('/api/admin/aao', { onRequest: [fastify.authenticate] }, async () => {
    return loadAaoConfig();
  });

  fastify.put(
    '/api/admin/aao',
    {
      onRequest: [fastify.authenticate],
      schema: { body: { type: 'object', required: ['stichwoerter'] } },
    },
    async (req) => {
      const config = req.body as AaoConfig;
      db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run('aao_config', JSON.stringify(config));
      return { ok: true };
    }
  );
}
