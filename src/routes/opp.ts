import type { FastifyPluginAsync } from 'fastify';

import { requireSharedSecret } from './auth.js';
import { getOppTimeline, getSessionsByOpportunity } from '../services/query.js';

export const oppRoutes: FastifyPluginAsync = async (app) => {
  // Stitched timeline — all events for an opp across all sources, ordered by time.
  // Primary endpoint for Postman inspection and Metabase Application Timeline dashboard.
  app.get<{ Params: { oppId: string } }>('/telemetry/opp/:oppId/timeline', async (request, reply) => {
    if (!requireSharedSecret(request, reply, app.config.sharedSecret)) {
      return;
    }

    const result = await getOppTimeline(app.db, request.params.oppId);

    return reply.send(result);
  });

  // Session index — list of browser sessions for an opp, without events.
  // Use GET /telemetry/session/:sessionId to drill into a specific session.
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
