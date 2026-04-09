import type { FastifyPluginAsync } from 'fastify';

import { requireSharedSecret } from './auth.js';
import { getSessionTimeline } from '../services/query.js';

export const sessionRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { sessionId: string } }>(
    '/telemetry/session/:sessionId',
    async (request, reply) => {
      if (!requireSharedSecret(request, reply, app.config.sharedSecret)) {
        return;
      }

      const result = await getSessionTimeline(app.db, request.params.sessionId);

      if (!result) {
        return reply.code(404).send({
          error: 'Session not found'
        });
      }

      return reply.send(result);
    }
  );
};
