-- Phase 2: multi-source event support
-- session_id becomes nullable so Apex and webhook events (which have no browser session) can be ingested.
-- The FK to telemetry_session is retained but nullable — Postgres supports nullable FKs.
-- The Apex ingest path must never insert a session row when session_id is null.

ALTER TABLE make.telemetry_event ALTER COLUMN session_id DROP NOT NULL;

-- Promoted columns for common Metabase filters.
-- flow and brand are already top-level on the session table; duplicated here so event-only
-- queries (e.g. Apex events with no session) can still filter without a JOIN.
ALTER TABLE make.telemetry_event ADD COLUMN IF NOT EXISTS flow          TEXT;
ALTER TABLE make.telemetry_event ADD COLUMN IF NOT EXISTS brand         TEXT;
ALTER TABLE make.telemetry_event ADD COLUMN IF NOT EXISTS result        TEXT;
ALTER TABLE make.telemetry_event ADD COLUMN IF NOT EXISTS entity_type   TEXT;
ALTER TABLE make.telemetry_event ADD COLUMN IF NOT EXISTS entity_action TEXT;