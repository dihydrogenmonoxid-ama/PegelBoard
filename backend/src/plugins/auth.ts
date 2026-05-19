import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const JWT_SECRET = process.env.JWT_SECRET ?? 'pegelboard-dev-secret-CHANGE-IN-PRODUCTION';

// fp() deaktiviert Fastify-Kapselung → alle Decorators (cookie, jwt, authenticate)
// sind auf dem Root-Scope verfügbar und damit in allen Route-Plugins nutzbar.
export const authPlugin = fp(async function authPlugin(fastify: FastifyInstance) {
  await fastify.register(cookie);
  await fastify.register(jwt, {
    secret: JWT_SECRET,
    cookie: { cookieName: 'pb_token', signed: false },
  });

  fastify.decorate('authenticate', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
    } catch {
      reply.code(401).send({ error: 'Nicht authentifiziert' });
    }
  });
});
