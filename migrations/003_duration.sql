ALTER TABLE make.telemetry_event
    DROP COLUMN IF EXISTS duration_s;

ALTER TABLE make.telemetry_event
    ADD COLUMN duration_s NUMERIC
    GENERATED ALWAYS AS (ROUND(duration_ms / 1000.0, 1)) STORED;