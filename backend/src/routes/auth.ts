import type { FastifyInstance } from 'fastify';
import { db } from '../db/database.js';
import { hashPassword, verifyPassword } from '../lib/password.js';

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 60 * 60 * 8,
};

export async function authRoutes(fastify: FastifyInstance) {
  // Beim ersten Start: CHANGEME → echten Hash setzen
  const row = db.prepare('SELECT password_hash FROM users WHERE username = ?').get('admin') as
    | { password_hash: string }
    | undefined;
  if (row?.password_hash === 'CHANGEME') {
    db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(
      await hashPassword('wasser'),
      'admin'
    );
  }

  fastify.post(
    '/api/auth/login',
    {
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
      schema: {
        body: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string', maxLength: 64 },
            password: { type: 'string', maxLength: 128 },
          },
        },
      },
    },
    async (req, reply) => {
      const { username, password } = req.body as { username: string; password: string };
      const user = db
        .prepare('SELECT id, username, password_hash FROM users WHERE username = ?')
        .get(username) as { id: number; username: string; password_hash: string } | undefined;

      if (!user || !(await verifyPassword(password, user.password_hash))) {
        return reply.code(401).send({ error: 'Ungültige Zugangsdaten' });
      }

      const token = fastify.jwt.sign({ id: user.id, username: user.username });
      reply.setCookie('pb_token', token, COOKIE_OPTS);
      return { ok: true, username: user.username };
    }
  );

  fastify.post('/api/auth/logout', async (_req, reply) => {
    reply.clearCookie('pb_token', { path: '/' });
    return { ok: true };
  });

  fastify.get('/api/auth/me', { onRequest: [fastify.authenticate] }, async (req) => {
    const user = req.user as { username: string };
    return { username: user.username };
  });
}
