import type { Pool } from 'pg';

import type {
  PhaseDuration,
  StoredTelemetryEvent,
  TelemetrySessionRecord
} from '../schema.js';
import { phaseDefinitions } from '../schema.js';

const sessionTable = 'make.telemetry_session';
const eventTable = 'make.telemetry_event';

interface SessionRow {
  session_id: string;
  opp_id: string;
  provider: string | null;
  origin: string | null;
  brand: string | null;
  applicant_flow: string | null;
  started_at: Date;
  last_event_at: Date;
  final_status: string | null;
  created_at: Date;
  updated_at: Date;
}

interface EventRow {
  id: number;
  session_id: string | null;
  opp_id: string;
  event_name: string;
  event_source: StoredTelemetryEvent['eventSource'];
  event_ts: Date;
  duration_ms: number | null;
  component: string | null;
  flow: string | null;
  brand: string | null;
  result: string | null;
  entity_type: string | null;
  entity_action: string | null;
  idempotency_key: string;
  payload_json: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface SessionTimelineResponse {
  session: TelemetrySessionRecord;
  events: StoredTelemetryEvent[];
  phaseDurations: PhaseDuration[];
}

export interface OpportunitySessionSummary {
  sessionId: string;
  oppId: string;
  provider: string | null;
  origin: string | null;
  brand: string | null;
  applicantFlow: string | null;
  startedAt: string;
  lastEventAt: string;
  finalStatus: string | null;
}

function mapSession(row: SessionRow): TelemetrySessionRecord {
  return {
    sessionId: row.session_id,
    oppId: row.opp_id,
    provider: row.provider,
    origin: row.origin,
    brand: row.brand,
    applicantFlow: row.applicant_flow,
    startedAt: row.started_at.toISOString(),
    lastEventAt: row.last_event_at.toISOString(),
    finalStatus: row.final_status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

function mapEvent(row: EventRow): StoredTelemetryEvent {
  return {
    id: row.id,
    sessionId: row.session_id,
    oppId: row.opp_id,
    eventName: row.event_name,
    eventSource: row.event_source,
    eventTs: row.event_ts.toISOString(),
    durationMs: row.duration_ms,
    component: row.component,
    flow: row.flow,
    brand: row.brand,
    result: row.result,
    entityType: row.entity_type,
    entityAction: row.entity_action,
    idempotencyKey: row.idempotency_key,
    payload: row.payload_json ?? {},
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

function computePhaseDurations(events: StoredTelemetryEvent[]): PhaseDuration[] {
  return phaseDefinitions.flatMap((phase): PhaseDuration[] => {
    const startEvent = events.find((event) => event.eventName === phase.startEvent);
    const endEvent = events.find((event) => event.eventName === phase.endEvent);

    if (!startEvent || !endEvent) {
      return [];
    }

    const startedAtMs = new Date(startEvent.eventTs).getTime();
    const endedAtMs = new Date(endEvent.eventTs).getTime();

    if (endedAtMs < startedAtMs) {
      return [];
    }

    return [
      {
        name: phase.name,
        startedAt: startEvent.eventTs,
        endedAt: endEvent.eventTs,
        durationMs: endedAtMs - startedAtMs
      }
    ];
  });
}

export async function getSessionTimeline(
  pool: Pool,
  sessionId: string
): Promise<SessionTimelineResponse | null> {
  const sessionResult = await pool.query<SessionRow>(
    `
      SELECT
        session_id,
        opp_id,
        provider,
        origin,
        brand,
        applicant_flow,
        started_at,
        last_event_at,
        final_status,
        created_at,
        updated_at
      FROM ${sessionTable}
      WHERE session_id = $1
    `,
    [sessionId]
  );

  if ((sessionResult.rowCount ?? 0) === 0) {
    return null;
  }

  const eventsResult = await pool.query<EventRow>(
    `
      SELECT
        id,
        session_id,
        opp_id,
        event_name,
        event_source,
        event_ts,
        duration_ms,
        component,
        flow,
        brand,
        result,
        entity_type,
        entity_action,
        idempotency_key,
        payload_json,
        created_at,
        updated_at
      FROM ${eventTable}
      WHERE session_id = $1
      ORDER BY event_ts ASC, id ASC
    `,
    [sessionId]
  );

  const events = eventsResult.rows.map(mapEvent);

  return {
    session: mapSession(sessionResult.rows[0]),
    events,
    phaseDurations: computePhaseDurations(events)
  };
}

export interface OppTimelineResponse {
  oppId: string;
  events: StoredTelemetryEvent[];
  phaseDurations: PhaseDuration[];
}

export async function getOppTimeline(
  pool: Pool,
  oppId: string
): Promise<OppTimelineResponse> {
  const result = await pool.query<EventRow>(
    `
      SELECT
        id,
        session_id,
        opp_id,
        event_name,
        event_source,
        event_ts,
        duration_ms,
        component,
        flow,
        brand,
        result,
        entity_type,
        entity_action,
        idempotency_key,
        payload_json,
        created_at,
        updated_at
      FROM ${eventTable}
      WHERE opp_id = $1
      ORDER BY event_ts ASC, id ASC
    `,
    [oppId]
  );

  const events = result.rows.map(mapEvent);

  return {
    oppId,
    events,
    phaseDurations: computePhaseDurations(events)
  };
}

export async function getSessionsByOpportunity(
  pool: Pool,
  oppId: string
): Promise<OpportunitySessionSummary[]> {
  const result = await pool.query<SessionRow>(
    `
      SELECT
        session_id,
        opp_id,
        provider,
        origin,
        brand,
        applicant_flow,
        started_at,
        last_event_at,
        final_status,
        created_at,
        updated_at
      FROM ${sessionTable}
      WHERE opp_id = $1
      ORDER BY last_event_at DESC, session_id DESC
    `,
    [oppId]
  );

  return result.rows.map((row) => {
    const session = mapSession(row);

    return {
      sessionId: session.sessionId,
      oppId: session.oppId,
      provider: session.provider,
      origin: session.origin,
      brand: session.brand,
      applicantFlow: session.applicantFlow,
      startedAt: session.startedAt,
      lastEventAt: session.lastEventAt,
      finalStatus: session.finalStatus
    };
  });
}
