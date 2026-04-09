import type { FastifyPluginAsync } from 'fastify';

import { requireSharedSecret } from './auth.js';
import { getSessionsByOpportunity } from '../services/query.js';

export const oppRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { oppId: string } }>('/telemetry/opp/:oppId', async (request, reply) => {
    if (!requireSharedSecret(request, reply, app.config.sharedSecret)) {
      return;
    }

    const result = await getSessionsByOpportunity(app.db, request.params.oppId);

    return reply.send({
      oppId: request.params.oppId,
      sessions: result
    });
  });
};
