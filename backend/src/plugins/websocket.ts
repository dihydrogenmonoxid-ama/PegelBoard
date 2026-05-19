import type { FastifyInstance } from 'fastify';

type Client = { send: (data: string) => void; readyState: number };

const clients = new Set<Client>();

export function broadcast(event: string, data: unknown) {
  const message = JSON.stringify({ event, data, ts: Date.now() });
  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(message);
    }
  }
}

export async function websocketPlugin(fastify: FastifyInstance) {
  await fastify.register(import('@fastify/websocket'));

  fastify.get('/ws', { websocket: true }, (socket) => {
    clients.add(socket);
    socket.send(JSON.stringify({ event: 'connected', ts: Date.now() }));

    socket.on('close', () => {
      clients.delete(socket);
    });
  });
}
