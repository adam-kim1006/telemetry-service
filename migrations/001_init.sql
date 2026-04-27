CREATE SCHEMA IF NOT EXISTS make;

CREATE TABLE IF NOT EXISTS make.telemetry_session (
  session_id TEXT PRIMARY KEY,
  opp_id TEXT NOT NULL,
  service_provider TEXT,
  origin TEXT,
  brand TEXT,
  flow TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  last_event_at TIMESTAMPTZ NOT NULL,
  final_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS make.telemetry_event (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT REFERENCES make.telemetry_session(session_id) ON DELETE CASCADE,
  opp_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  event_source TEXT NOT NULL,
  event_ts TIMESTAMPTZ NOT NULL,
  duration_ms INTEGER,
  component TEXT,
  step_name TEXT,
  idempotency_key TEXT NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::JSONB,
  flow TEXT,
  brand TEXT,
  result TEXT,
  entity_type TEXT,
  entity_action TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);