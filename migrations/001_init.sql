CREATE SCHEMA IF NOT EXISTS make;

CREATE TABLE IF NOT EXISTS make.telemetry_session (
  session_id TEXT PRIMARY KEY,
  opp_id TEXT NOT NULL,
  provider TEXT,
  origin TEXT,
  brand TEXT,
  applicant_flow TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  last_event_at TIMESTAMPTZ NOT NULL,
  final_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS make.telemetry_event (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES make.telemetry_session(session_id) ON DELETE CASCADE,
  opp_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_source TEXT NOT NULL,
  event_ts TIMESTAMPTZ NOT NULL,
  duration_ms INTEGER,
  component TEXT,
  idempotency_key TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_session_opp_id
  ON make.telemetry_session (opp_id);

CREATE INDEX IF NOT EXISTS idx_telemetry_event_session_id
  ON make.telemetry_event (session_id, event_ts);

CREATE INDEX IF NOT EXISTS idx_telemetry_event_opp_id
  ON make.telemetry_event (opp_id, event_ts);

CREATE UNIQUE INDEX IF NOT EXISTS uq_telemetry_event_idempotency_key
  ON make.telemetry_event (idempotency_key);
