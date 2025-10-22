import Fastify from 'fastify';
import pino from 'pino';

const server = Fastify({ logger: pino({ level: 'info' }) });

server.get('/health', async () => {
  return { status: 'ok' };
});

// Placeholder API base
server.get('/', async () => ({ service: 'tempiemail-api' }));

const port = Number(process.env.PORT || 4000);
server.listen({ port, host: '0.0.0.0' }).then(() => {
  server.log.info(`API listening on ${port}`);
}).catch((err) => {
  server.log.error(err);
  process.exit(1);
});
