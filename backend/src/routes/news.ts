import type { FastifyInstance } from 'fastify';
import { fetchMdrNews } from '../services/mdr.js';
import { recordFetchSuccess, recordFetchError } from '../lib/cache.js';

export async function newsRoutes(fastify: FastifyInstance) {
  fastify.get('/api/news', async (_req, reply) => {
    try {
      const result = await fetchMdrNews();
      recordFetchSuccess('mdr');
      return result;
    } catch (err) {
      recordFetchError('mdr', err);
      reply.code(502);
      return { error: 'Nachrichtenquelle nicht erreichbar', detail: String(err) };
    }
  });
}
