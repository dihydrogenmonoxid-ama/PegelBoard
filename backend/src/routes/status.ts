import type { FastifyInstance } from 'fastify';
import { db } from '../db/database.js';

interface SourceStatus {
  source_key: string;
  last_ok: string | null;
  last_attempt: string | null;
  last_error: string | null;
}

export async function statusRoutes(fastify: FastifyInstance) {
  fastify.get('/api/status', async () => {
    const rows = db.prepare('SELECT * FROM source_status').all() as unknown as SourceStatus[];
    return { sources: rows };
  });
}
