# Implementation Checklist

This checklist turns the current POC into a stable, queryable telemetry service for the Salesforce loan flow.

## Phase 1: Secure The POC

- [ ] Create a real `.env` from `.env.example`.
- [ ] Replace `TELEMETRY_SHARED_SECRET=change-me` with a real random secret.
- [ ] Keep `.env` out of git.
- [ ] Update the Salesforce External Credential header `x-telemetry-secret` to the same real secret.
- [ ] Verify `GET /health` still returns `{"ok":true}` after the secret change.
- [ ] Re-run the anonymous Apex smoke test.
- [ ] Re-run one real or mock flow and confirm the event still lands.

Suggested local `.env` shape:

```text
PORT=3000
HOST=0.0.0.0
DATABASE_URL=postgres://postgres:postgres@localhost:5432/telemetry
TELEMETRY_SHARED_SECRET=<replace-with-real-secret>
AUTO_RUN_MIGRATIONS=true
```

## Phase 2: Put The Repo Under Deployment Control

- [ ] Create a GitHub repo for `Telemetry Service`.
- [ ] Push the current codebase, excluding `.env`.
- [ ] Add a short deploy section to the repo README if needed.
- [ ] Decide the first real host:
  - Render for fastest stable public URL
  - Heroku if you want to keep this near existing Heroku operations
- [ ] Create a production environment with:
  - `DATABASE_URL`
  - `TELEMETRY_SHARED_SECRET`
  - `AUTO_RUN_MIGRATIONS=true`
  - `HOST=0.0.0.0`
  - provider-specific `PORT`
- [ ] Deploy the app.
- [ ] Confirm `/health` on the deployed URL.

## Phase 3: Point Salesforce At The Stable URL

- [ ] Replace the Cloudflare Quick Tunnel URL in Named Credential `Telemetry_Service` with the deployed URL.
- [ ] Keep the custom header on the External Credential or Named Credential, whichever is already working in your org.
- [ ] Re-test guest-user Apex callout behavior from the Experience Cloud site.
- [ ] Confirm guest profile still has Apex class access to `TelemetryController`.
- [ ] Run a real flow and verify events land in the deployed service.

## Phase 4: Expand Telemetry Coverage

### LWC

- [ ] Keep `loan_offer_rendered`.
- [ ] Confirm `decision_polling_started`.
- [ ] Confirm `decision_polling_ready`.
- [ ] Confirm `applicationcomplete_dispatched`.
- [ ] Confirm `bank_upload_success` on the real Plaid path.
- [ ] Decide whether mock-bank events should emit the same canonical event or a mock-specific one in payload only.

### Apex

- [ ] Confirm `plaid_webhook_received`.
- [ ] Confirm `bank_statements_uploaded_set`.
- [ ] Confirm `ile_materialized`.
- [ ] Confirm `de_started`.
- [ ] Confirm `de_finished`.
- [ ] Add `de_outcome_written` if it is still missing from the live path.

### Other microservice(s)

- [ ] Emit `asset_report_fetch_started`.
- [ ] Emit `asset_report_fetch_completed`.
- [ ] Emit `asset_report_parse_started`.
- [ ] Emit `asset_report_parse_completed`.
- [ ] Emit `microservice_completed`.
- [ ] Ensure the same `sessionId` and `oppId` are propagated end to end.
- [ ] Use deterministic `idempotencyKey` values for retries.

## Phase 5: Make The Data Easier To Use

- [ ] Add a simple SQL view or query set for phase durations.
- [ ] Add a first dashboarding layer on top of Postgres.
- [ ] Create three initial dashboards:
  - session timeline
  - latency by phase
  - bottlenecks by provider, origin, and brand
- [ ] Add a saved report for "slowest 25 sessions in the last 7 days".
- [ ] Add a saved report for "missing expected events by session".

## Phase 6: Add Basic Operations

- [ ] Add structured request logging if you want easier service troubleshooting.
- [ ] Add a production health check policy.
- [ ] Add alerting for:
  - service down
  - ingestion error spikes
  - no events received in an expected time window
- [ ] Decide whether to add OpenTelemetry in the telemetry service itself later.

## Recommended Execution Order

1. Replace the shared secret and update Salesforce.
2. Push the repo to GitHub.
3. Deploy to Render or Heroku.
4. Repoint Salesforce to the stable deployed URL.
5. Add the remaining LWC and Apex milestone events.
6. Add microservice events.
7. Add dashboards and alerts.

## First Success Definition

The implementation is in a good first state when:

- one real opportunity produces a full session timeline
- the timeline includes upload, parsing, webhook, DE, and render milestones
- the service runs at a stable public URL
- Salesforce no longer depends on a local tunnel
- you can identify where latency is spent from a single session view
