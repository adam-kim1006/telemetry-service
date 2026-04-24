CREATE INDEX IF NOT EXISTS idx_telemetry_event_name_result
    ON make.telemetry_event (event_name, result);

CREATE INDEX IF NOT EXISTS idx_telemetry_event_ts_brin
    ON make.telemetry_event USING BRIN (event_ts);

-- Index for funnel queries: count events by name in a time window.
CREATE INDEX IF NOT EXISTS idx_telemetry_event_name_ts
    ON make.telemetry_event (event_name, event_ts DESC);

-- Index for brand/flow segmentation queries (Metabase dashboards).
CREATE INDEX IF NOT EXISTS idx_telemetry_event_brand_flow
    ON make.telemetry_event (brand, flow);

CREATE INDEX IF NOT EXISTS idx_telemetry_event_step
    ON make.telemetry_event (event_name, step_name, event_ts DESC);

CREATE INDEX IF NOT EXISTS idx_telemetry_session_opp_id
  ON make.telemetry_session (opp_id);

CREATE INDEX IF NOT EXISTS idx_telemetry_event_session_id
  ON make.telemetry_event (session_id, event_ts);

CREATE INDEX IF NOT EXISTS idx_telemetry_event_opp_id
  ON make.telemetry_event (opp_id, event_ts);

CREATE UNIQUE INDEX IF NOT EXISTS uq_telemetry_event_idempotency_key
  ON make.telemetry_event (idempotency_key);