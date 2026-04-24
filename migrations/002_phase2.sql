ALTER TABLE make.telemetry_event ADD COLUMN IF NOT EXISTS step_name TEXT;

CREATE INDEX IF NOT EXISTS idx_telemetry_event_step
    ON make.telemetry_event (event_name, step_name, event_ts DESC);