# Knowledge Transfer

This document is for the next developer taking over the telemetry service project.

It covers:

- what the system does
- where it lives
- how the deployed service works
- how Salesforce is wired into it
- where events are currently emitted
- what is already verified
- what is still missing

## 1. What This Project Is

This is a small external telemetry sidecar for the Salesforce loan application flow.

Its purpose is to capture latency checkpoints across:

- LWC
- Apex
- external microservice
- webhook return
- DE 2.0

It does **not** replace any Salesforce business logic. It only collects correlated telemetry events and returns stitched timelines.

## 2. Repo Locations

### Telemetry service repo

- `C:\Users\AdamKim\Telemetry Service`

### Salesforce repo

- `C:\Users\AdamKim\SANDBOX`

## 3. Telemetry Service Stack

The telemetry service uses:

- Node.js
- Fastify
- TypeScript
- PostgreSQL
- Docker / Docker Compose
- Render for the deployed POC environment

## 4. Telemetry Service API

### Ingestion

- `POST /telemetry/events`

Accepts:

- one event object
- an array of event objects
- `{ "events": [ ... ] }`

Requires header:

- `x-telemetry-secret`

### Query

- `GET /telemetry/session/:sessionId`
- `GET /telemetry/opp/:oppId`

### Health

- `GET /health`

## 5. Deployed Environment

The service is deployed on Render.

Current deployment model:

- Render Web Service for the app
- Render Postgres for the database

The local Docker setup still exists for local development and smoke tests.

Relevant files:

- [render.yaml](C:/Users/AdamKim/Telemetry%20Service/render.yaml)
- [docker-compose.yml](C:/Users/AdamKim/Telemetry%20Service/docker-compose.yml)
- [Dockerfile](C:/Users/AdamKim/Telemetry%20Service/Dockerfile)
- [render-deploy.md](C:/Users/AdamKim/Telemetry%20Service/docs/render-deploy.md)

## 6. Environment Variables

Telemetry service environment variables:

- `PORT`
- `HOST`
- `DATABASE_URL`
- `TELEMETRY_SHARED_SECRET`
- `AUTO_RUN_MIGRATIONS`

Local example:

- [.env.example](C:/Users/AdamKim/Telemetry%20Service/.env.example)

Important:

- `.env` should not be committed
- the Render secret and Salesforce `x-telemetry-secret` must match

## 7. Database Model

Current tables:

- `make.telemetry_session`
- `make.telemetry_event`

Important note:

- the current migration creates these tables in schema `make`
- this was done as a practical POC accommodation and may be moved later

Relevant file:

- [001_init.sql](C:/Users/AdamKim/Telemetry%20Service/migrations/001_init.sql)

## 8. How Salesforce Calls The Telemetry Service

The browser does **not** call the telemetry service directly with a raw secret.

The flow is:

1. LWC calls Apex
2. Apex forwards the event to the telemetry service
3. Apex uses the Named Credential / External Credential for auth

This avoids exposing the shared secret in the browser.

### Core Apex plumbing

- [TelemetryController.cls](C:/Users/AdamKim/SANDBOX/force-app/main/default/classes/TelemetryController.cls)
- [TelemetryService.cls](C:/Users/AdamKim/SANDBOX/force-app/main/default/classes/TelemetryService.cls)

### Core LWC helper

- [offerFlowTelemetry.js](C:/Users/AdamKim/SANDBOX/force-app/main/default/lwc/offerFlowTelemetry/offerFlowTelemetry.js)

How it works:

- LWCs call `emitTelemetryEvent(...)`
- the helper calls `TelemetryController.emitEvent(...)`
- Apex enqueues a queueable callout through `TelemetryService.emitAsync(...)`
- the telemetry service writes the event into Postgres

## 9. Salesforce Credential Setup

Salesforce uses:

- External Credential
- Named Credential named `Telemetry_Service`
- custom header `x-telemetry-secret`

Important detail discovered during implementation:

- the live Experience Cloud flow runs as a **guest user**
- the guest user profile needed Apex class access to `TelemetryController`

Reference doc:

- [salesforce-setup.md](C:/Users/AdamKim/Telemetry%20Service/docs/salesforce-setup.md)

## 10. Current Event Emit Locations

This section lists the current emit points that were added during implementation.

## LWC emits

### Loan offer render

- [offerFlowContainer.js](C:/Users/AdamKim/SANDBOX/force-app/main/default/lwc/offerFlowContainer/offerFlowContainer.js)
  - emits `loan_offer_rendered`
  - emits fallback `applicationcomplete_dispatched`

### Application variant A

- [offerFlowApplicationLWC.js](C:/Users/AdamKim/SANDBOX/force-app/main/default/lwc/offerFlowApplicationLWC/offerFlowApplicationLWC.js)
  - emits `decision_polling_started`
  - emits `decision_polling_ready`
  - emits `applicationcomplete_dispatched`

### Application variant B

- [offerFlowApplicationLWCVB.js](C:/Users/AdamKim/SANDBOX/force-app/main/default/lwc/offerFlowApplicationLWCVB/offerFlowApplicationLWCVB.js)
  - emits `decision_polling_started`
  - emits `decision_polling_ready`
  - emits `applicationcomplete_dispatched`

### Sandbox application variant

- [offerFlowApplicationLWCSandbox.js](C:/Users/AdamKim/SANDBOX/force-app/main/default/lwc/offerFlowApplicationLWCSandbox/offerFlowApplicationLWCSandbox.js)
  - emits `decision_polling_started`
  - emits `decision_polling_ready`
  - emits `applicationcomplete_dispatched`

### Plaid success

- [plaidBankConnect.js](C:/Users/AdamKim/SANDBOX/force-app/main/default/lwc/plaidBankConnect/plaidBankConnect.js)
  - emits `bank_upload_success`

## Apex emits / forwards

### Shared telemetry transport

- [TelemetryController.cls](C:/Users/AdamKim/SANDBOX/force-app/main/default/classes/TelemetryController.cls)
- [TelemetryService.cls](C:/Users/AdamKim/SANDBOX/force-app/main/default/classes/TelemetryService.cls)

### Session propagation to microservice

- [PlaidLWCController.cls](C:/Users/AdamKim/SANDBOX/force-app/main/default/classes/PlaidLWCController.cls)
  - passes `sessionId` into the microservice request setup

- [Plaid_Helper.cls](C:/Users/AdamKim/SANDBOX/force-app/main/default/classes/Plaid_Helper.cls)
  - sets outbound request header `Session-Id`
  - emits `ile_materialized`

### Webhook and DE

- [Plaid_Webhook.cls](C:/Users/AdamKim/SANDBOX/force-app/main/default/classes/Plaid_Webhook.cls)
  - reads `Session-Id` / `X-Session-Id`
  - emits `plaid_webhook_received`
  - emits `bank_statements_uploaded_set`
  - routes into telemetry-aware DE kickoff paths when session is available

- [Plaid_BankStatement.cls](C:/Users/AdamKim/SANDBOX/force-app/main/default/classes/Plaid_BankStatement.cls)
  - exposes `initiateDEWithTelemetry(...)`
  - emits `de_started`
  - emits `de_finished`

- [SolutionByText_Queuable.cls](C:/Users/AdamKim/SANDBOX/force-app/main/default/classes/SolutionByText_Queuable.cls)
  - carries `telemetrySessionId`
  - uses telemetry-aware DE entrypoint when available

## 11. What Has Been Verified

## Verified service behavior

- local Docker service works
- Render service works
- `/health` works on Render
- Salesforce can authenticate to Render-hosted telemetry service
- guest-user Experience Cloud path can call Apex telemetry controller

## Verified live event chain

Verified on live Render-backed sessions:

- `bank_upload_success`
- `decision_polling_started`
- `decision_polling_ready`
- `applicationcomplete_dispatched`
- `loan_offer_rendered`

The following frontend timings were successfully measured:

- polling wait
- decision-ready to application-complete
- application-complete to offer-render

## 12. What Is Still Missing

The backend/microservice middle of the timeline is not fully implemented yet.

Missing or not yet verified end to end:

- `asset_report_fetch_started`
- `asset_report_fetch_completed`
- `asset_report_parse_started`
- `asset_report_parse_completed`
- `microservice_completed`
- real end-to-end presence of:
  - `plaid_webhook_received`
  - `de_started`
  - `de_finished`

The current conclusion is:

- frontend telemetry is working
- Salesforce entrypoint correlation is working
- the next implementation step is microservice instrumentation

Reference:

- [microservice-integration-guide.md](C:/Users/AdamKim/Telemetry%20Service/docs/microservice-integration-guide.md)

## 13. Useful Verification Scripts

### Verify first two LWC polling events

- [verify-live-events.ps1](C:/Users/AdamKim/Telemetry%20Service/scripts/verify-live-events.ps1)

### Verify the broader chain

- [verify-live-chain.ps1](C:/Users/AdamKim/Telemetry%20Service/scripts/verify-live-chain.ps1)

### Verification docs

- [live-render-verification.md](C:/Users/AdamKim/Telemetry%20Service/docs/live-render-verification.md)
- [full-chain-verification.md](C:/Users/AdamKim/Telemetry%20Service/docs/full-chain-verification.md)

## 14. Recommended Next Steps For The New Developer

1. Review the telemetry service repo and confirm local startup.
2. Review the Salesforce helper path:
   - LWC helper
   - Apex controller
   - Apex queueable transport
3. Review the current emit locations listed above.
4. Read the microservice integration guide.
5. Instrument the external microservice to emit fetch/parse milestones.
6. Run a real Plaid flow and verify the backend events appear in the same session.
7. Start a simple dashboard layer on top of Postgres.

## 15. Related Docs

- [implementation-checklist.md](C:/Users/AdamKim/Telemetry%20Service/docs/implementation-checklist.md)
- [next-event-emission-plan.md](C:/Users/AdamKim/Telemetry%20Service/docs/next-event-emission-plan.md)
- [future-directions.md](C:/Users/AdamKim/Telemetry%20Service/docs/future-directions.md)
- [platform-options.md](C:/Users/AdamKim/Telemetry%20Service/docs/platform-options.md)
- [salesforce-telemetry-touchpoints.md](C:/Users/AdamKim/Telemetry%20Service/docs/salesforce-telemetry-touchpoints.md)
