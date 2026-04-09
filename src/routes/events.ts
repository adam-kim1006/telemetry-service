import type { FastifyPluginAsync } from 'fastify';

import type { TelemetryEventInput } from '../schema.js';
import { ingestEvents } from '../services/ingest.js';
import { requireSharedSecret } from './auth.js';

type EventsBody = TelemetryEventInput | TelemetryEventInput[] | { events: TelemetryEventInput[] };

function hasEventBatchShape(body: EventsBody): body is { events: TelemetryEventInput[] } {
  return !Array.isArray(body) && 'events' in body && Array.isArray(body.events);
}

function normalizeBody(body: EventsBody): TelemetryEventInput[] {
  if (Array.isArray(body)) {
    return body;
  }

  if (hasEventBatchShape(body)) {
    return body.events;
  }

  return [body];
}

export const eventsRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: EventsBody }>('/telemetry/events', async (request, reply) => {
    if (!requireSharedSecret(request, reply, app.config.sharedSecret)) {
      return;
    }

    try {
      const events = normalizeBody(request.body);
      const result = await ingestEvents(events);

      return reply.code(202).send({
        ok: true,
        ...result
      });
    } catch (error) {
      request.log.error({ err: error }, 'Failed to ingest telemetry events');

      return reply.code(400).send({
        error: error instanceof Error ? error.message : 'Failed to ingest events'
      });
    }
  });
};
