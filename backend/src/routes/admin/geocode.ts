import type { FastifyInstance } from 'fastify';
import { geocode } from '../../services/geocoding.js';

export async function adminGeocodeRoutes(fastify: FastifyInstance) {
  const auth = { onRequest: [fastify.authenticate] };

  fastify.get('/api/admin/geocode', auth, async (req, reply) => {
    const { q } = req.query as { q?: string };
    if (!q || q.trim().length < 2) {
      return reply.code(400).send({ error: 'Suchbegriff zu kurz' });
    }
    try {
      const results = await geocode(q.trim());
      return results;
    } catch (err) {
      return reply.code(502).send({ error: 'Geocoding nicht erreichbar', detail: String(err) });
    }
  });
}
