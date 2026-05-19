import type { FastifyInstance } from 'fastify';
import { db } from '../../db/database.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';

export async function adminUserRoutes(fastify: FastifyInstance) {
  fastify.put(
    '/api/admin/users/password',
    {
      onRequest: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: { type: 'string', maxLength: 128 },
            newPassword: { type: 'string', minLength: 6, maxLength: 128 },
          },
        },
      },
    },
    async (req, reply) => {
      const { currentPassword, newPassword } = req.body as {
        currentPassword: string;
        newPassword: string;
      };
      const jwtUser = req.user as { id: number };
      const row = db
        .prepare('SELECT password_hash FROM users WHERE id = ?')
        .get(jwtUser.id) as { password_hash: string } | undefined;

      if (!row || !(await verifyPassword(currentPassword, row.password_hash))) {
        return reply.code(401).send({ error: 'Aktuelles Passwort falsch' });
      }

      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(
        await hashPassword(newPassword),
        jwtUser.id
      );
      return { ok: true };
    }
  );
}
