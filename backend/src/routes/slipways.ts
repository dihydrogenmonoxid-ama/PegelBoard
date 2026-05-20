import type { FastifyInstance } from 'fastify';
import { fetchSlipways } from '../services/overpass.js';
import { recordFetchSuccess, recordFetchError } from '../lib/cache.js';

export async function slipwayRoutes(fastify: FastifyInstance) {
  fastify.get('/api/slipways', async (req, reply) => {
    const { bbox } = req.query as { bbox?: string };
    if (!bbox) return reply.status(400).send({ error: 'bbox parameter required (south,west,north,east)' });

    const parts = bbox.split(',').map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) {
      return reply.status(400).send({ error: 'Invalid bbox – expected south,west,north,east as numbers' });
    }

    const [south, west, north, east] = parts;

    if (north - south > 5 || east - west > 5) {
      return reply.status(400).send({ error: 'Bounding box too large (max 5°)' });
    }

    try {
      const slipways = await fetchSlipways(south, west, north, east);
      recordFetchSuccess('overpass');
      return slipways;
    } catch (err) {
      recordFetchError('overpass', err);
      return reply.status(502).send({ error: 'Overpass nicht erreichbar', detail: String(err) });
    }
  });
}
