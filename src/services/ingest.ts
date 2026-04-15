import type { PoolClient } from 'pg';

import type { EventSource, TelemetryEventInput } from '../schema.js';
import { allowedEventSources } from '../schema.js';
import { withTransaction } from '../db.js';

const sessionTable = 'make.telemetry_session';
const eventTable = 'make.telemetry_event';

export interface IngestResult {
  sessionId: string;
  received: number;
  inserted: number;
  deduped: number;
}

function normalizeTimestamp(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid eventTs: ${value}`);
  }

  return date.toISOString();
}

function assertInput(event: TelemetryEventInput): TelemetryEventInput {
  if (!event.sessionId?.trim()) {
    throw new Error('sessionId is required');
  }

  if (!event.oppId?.trim()) {
    throw new Error('oppId is required');
  }

  if (!event.eventName?.trim()) {
    throw new Error('eventName is required');
  }

  if (!event.eventSource?.trim()) {
    throw new Error('eventSource is required');
  }

  if (!event.idempotencyKey?.trim()) {
    throw new Error('idempotencyKey is required');
  }

  if (!event.eventTs?.trim()) {
    throw new Error('eventTs is required');
  }

  if (!allowedEventSources.includes(event.eventSource as EventSource)) {
    throw new Error(`eventSource must be one of: ${allowedEventSources.join(', ')}`);
  }

  if (event.durationMs !== undefined && event.durationMs !== null) {
    if (!Number.isFinite(event.durationMs) || event.durationMs < 0) {
      throw new Error('durationMs must be a non-negative number');
    }
  }

  if (event.payload !== undefined && (event.payload === null || Array.isArray(event.payload))) {
    throw new Error('payload must be an object when provided');
  }

  return {
    ...event,
    eventTs: normalizeTimestamp(event.eventTs),
    payload: event.payload ?? {}
  };
}

async function upsertSession(client: PoolClient, events: TelemetryEventInput[]): Promise<void> {
  const firstEvent = events[0];
  const lastEventWithSessionMetadata = [...events]
    .reverse()
    .find(
      (event) =>
        event.provider ||
        event.origin ||
        event.brand ||
        event.applicantFlow ||
        event.finalStatus
    );
  const sortedEventTimes = events
    .map((event) => new Date(event.eventTs).toISOString())
    .sort((left, right) => left.localeCompare(right));

  const startedAt = sortedEventTimes[0];
  const lastEventAt = sortedEventTimes[sortedEventTimes.length - 1];

  await client.query(
    `
      INSERT INTO ${sessionTable} (
        session_id,
        opp_id,
        provider,
        origin,
        brand,
        applicant_flow,
        started_at,
        last_event_at,
        final_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (session_id)
      DO UPDATE
      SET
        opp_id = EXCLUDED.opp_id,
        provider = COALESCE(EXCLUDED.provider, ${sessionTable}.provider),
        origin = COALESCE(EXCLUDED.origin, ${sessionTable}.origin),
        brand = COALESCE(EXCLUDED.brand, ${sessionTable}.brand),
        applicant_flow = COALESCE(EXCLUDED.applicant_flow, ${sessionTable}.applicant_flow),
        started_at = LEAST(${sessionTable}.started_at, EXCLUDED.started_at),
        last_event_at = GREATEST(${sessionTable}.last_event_at, EXCLUDED.last_event_at),
        final_status = COALESCE(EXCLUDED.final_status, ${sessionTable}.final_status),
        updated_at = NOW()
    `,
    [
      firstEvent.sessionId,
      firstEvent.oppId,
      lastEventWithSessionMetadata?.provider ?? firstEvent.provider ?? null,
      lastEventWithSessionMetadata?.origin ?? firstEvent.origin ?? null,
      lastEventWithSessionMetadata?.brand ?? firstEvent.brand ?? null,
      lastEventWithSessionMetadata?.applicantFlow ?? firstEvent.applicantFlow ?? null,
      startedAt,
      lastEventAt,
      lastEventWithSessionMetadata?.finalStatus ?? firstEvent.finalStatus ?? null
    ]
  );
}

async function insertEvents(client: PoolClient, events: TelemetryEventInput[]): Promise<number> {
  let inserted = 0;

  for (const event of events) {
    const result = await client.query(
      `
        INSERT INTO ${eventTable} (
          session_id,
          opp_id,
          event_name,
          event_source,
          event_ts,
          duration_ms,
          idempotency_key,
          component,
          payload_json
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
        ON CONFLICT (idempotency_key)
        DO NOTHING
      `,
      [
        event.sessionId,
        event.oppId,
        event.eventName,
        event.eventSource,
        event.eventTs,
        event.durationMs ?? null,
        event.idempotencyKey,
        event.component ?? null,
        JSON.stringify(event.payload ?? {})
      ]
    );

    inserted += result.rowCount ?? 0;
  }

  return inserted;
}

export async function ingestEvents(inputEvents: TelemetryEventInput[]): Promise<IngestResult> {
  if (inputEvents.length === 0) {
    throw new Error('At least one event is required');
  }

  const events = inputEvents.map(assertInput);
  const firstSessionId = events[0].sessionId;
  const firstOppId = events[0].oppId;

  for (const event of events) {
    if (event.sessionId !== firstSessionId) {
      throw new Error('All batched events must share the same sessionId');
    }

    if (event.oppId !== firstOppId) {
      throw new Error('All batched events must share the same oppId');
    }
  }

  const inserted = await withTransaction(async (client) => {
    await upsertSession(client, events);
    return insertEvents(client, events);
  });

  return {
    sessionId: firstSessionId,
    received: events.length,
    inserted,
    deduped: events.length - inserted
  };
}
