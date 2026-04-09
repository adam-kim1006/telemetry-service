# Telemetry Sidecar

Phase 1 external telemetry service for the Salesforce loan application flow. This service is intentionally narrow: it accepts correlated telemetry events, stores them idempotently, and returns ordered session timelines with stitched latency phases.

## What it includes

- `POST /telemetry/events` for single-event or batch ingestion
- `GET /telemetry/session/:sessionId` for ordered timeline retrieval
- `GET /telemetry/opp/:oppId` for session lookup by opportunity
- Postgres-backed `telemetry_session` and `telemetry_event` tables
- Deterministic event dedupe via unique `idempotency_key`
- Startup SQL migration runner
- Docker and `docker-compose` for local bring-up

## Phase 1 assumptions

- Every event must include `sessionId`, `oppId`, `eventName`, `eventSource`, `eventTs`, and `idempotencyKey`
- Batched events must belong to one `sessionId` and one `oppId`
- Server-side callers authenticate with `x-telemetry-secret`
- Session fields such as `provider`, `origin`, `brand`, and `applicantFlow` are upserted opportunistically as they arrive

## Local development

1. Copy `.env.example` to `.env`
2. Set a real `TELEMETRY_SHARED_SECRET`
3. Start Postgres and the app with Docker:

```bash
docker compose up --build
```

`docker compose` reads `DOCKER_DATABASE_URL`, while local non-Docker runs use `DATABASE_URL`.

If you prefer running the app outside Docker:

```bash
npm install
npm run migrate
npm run dev
```

## API

### `POST /telemetry/events`

Accepted body forms:

- a single event object
- an array of event objects
- `{ "events": [ ... ] }`

Example:

```json
{
  "sessionId": "sess-123",
  "oppId": "006ABC123",
  "provider": "plaid",
  "origin": "SunshineDE",
  "brand": "Sunshine",
  "applicantFlow": "offerFlowContainer",
  "eventName": "bank_upload_success",
  "eventSource": "lwc",
  "eventTs": "2026-04-08T12:00:00.000Z",
  "durationMs": 123,
  "idempotencyKey": "sess-123:bank_upload_success:2026-04-08T12:00:00.000Z",
  "payload": {}
}
```

Header:

```text
x-telemetry-secret: <shared secret>
```

Response:

```json
{
  "ok": true,
  "sessionId": "sess-123",
  "received": 1,
  "inserted": 1,
  "deduped": 0
}
```

### `GET /telemetry/session/:sessionId`

Returns:

- the session record
- all events in chronological order
- stitched phase durations for the initial milestone set

Current computed phases:

- `upload_to_fetch_start`
- `fetch_to_parse_complete`
- `parse_to_webhook`
- `webhook_to_de_start`
- `de_execution`
- `de_finish_to_offer_rendered`
- `end_to_end`

### `GET /telemetry/opp/:oppId`

Returns all known sessions for an opportunity, ordered by most recent activity first. This is useful when one opportunity has retries, multiple provider attempts, or sandbox replays tied to the same Salesforce opportunity.

## Suggested initial event set

- `bank_upload_success`
- `asset_report_fetch_started`
- `asset_report_parse_completed`
- `plaid_webhook_received`
- `de_started`
- `de_finished`
- `loan_offer_rendered`

## Repo path

This service is scaffolded at:

`C:\Users\AdamKim\Telemetry Service`
