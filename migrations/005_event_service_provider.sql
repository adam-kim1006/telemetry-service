ALTER TABLE make.telemetry_event
  DROP COLUMN IF EXISTS entity_type,
  DROP COLUMN IF EXISTS entity_action,
  ADD COLUMN IF NOT EXISTS service_provider TEXT;
