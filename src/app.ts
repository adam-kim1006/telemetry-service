import path from 'node:path';
import { fileURLToPath } from 'node:url';

import Fastify from 'fastify';

import { config } from './config.js';
import { dbPlugin, pool } from './db.js';
import { eventsRoutes } from './routes/events.js';
import { oppRoutes } from './routes/opp.js';
import { sessionRoutes } from './routes/session.js';
import { runMigrations } from './services/migrations.js';
import { resolveFirstExistingPath } from './services/pathing.js';

declare module 'fastify' {
  interface FastifyInstance {
    config: typeof config;
  }
}

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = resolveFirstExistingPath(currentDir, ['../migrations', '../../migrations']);

export async function buildApp() {
  const app = Fastify({
    logger: true
  });

  app.decorate('config', config);
  await app.register(dbPlugin);

  app.get('/health', async () => {
    return { ok: true };
  });

  await app.register(eventsRoutes);
  await app.register(sessionRoutes);
  await app.register(oppRoutes);

  return app;
}

async function start() {
  if (config.autoRunMigrations) {
    await runMigrations(pool, migrationsDir);
  }

  const app = await buildApp();

  await app.listen({
    host: config.host,
    port: config.port
  });
}

start().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
