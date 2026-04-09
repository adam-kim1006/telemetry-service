# Salesforce Telemetry Touchpoints

This artifact lists every Salesforce file currently touched by the telemetry additions, what changed in each one, and which events or responsibilities it now owns.

## Shared telemetry plumbing

### Apex

#### [TelemetryService.cls](C:/Users/AdamKim/SANDBOX/force-app/main/default/classes/TelemetryService.cls)

- New best-effort Apex forwarding service for external telemetry.
- Builds canonical event payloads.
- Dispatches events asynchronously through a queueable callout to the Named Credential endpoint.

#### [TelemetryController.cls](C:/Users/AdamKim/SANDBOX/force-app/main/default/classes/TelemetryController.cls)

- New `@AuraEnabled` facade for LWCs.
- Accepts serialized telemetry event JSON from browser code.
- Deserializes and forwards to `TelemetryService`.

### LWC shared helper

#### [offerFlowTelemetry.js](C:/Users/AdamKim/SANDBOX/force-app/main/default/lwc/offerFlowTelemetry/offerFlowTelemetry.js)

- New shared browser-side helper for emitting telemetry without duplicating payload-building logic.
- Normalizes event shape and computes a deterministic `idempotencyKey` when the caller does not provide one.
- Calls `TelemetryController.emitEvent(...)`.

## LWCs touched

#### [plaidBankConnect.js](C:/Users/AdamKim/SANDBOX/force-app/main/default/lwc/plaidBankConnect/plaidBankConnect.js)

- Added import of `emitTelemetryEvent`.
- Emits `bank_upload_success` after `processPlaidSuccess(...)` returns success.
- Uses `sessionId`, `opportunityId`, brand context, and institution name in payload.

#### [offerFlowApplicationLWC.js](C:/Users/AdamKim/SANDBOX/force-app/main/default/lwc/offerFlowApplicationLWC/offerFlowApplicationLWC.js)

- Added import of `emitTelemetryEvent`.
- Added one-shot guards for polling telemetry.
- Emits `decision_polling_started` in `startDecisionPolling()`.
- Emits `decision_polling_ready` when polling first receives a ready decision.
- Emits `applicationcomplete_dispatched` immediately before dispatching the `applicationcomplete` event.
- Added helper methods to derive provider and construct telemetry payloads consistently.

#### [offerFlowApplicationLWCVB.js](C:/Users/AdamKim/SANDBOX/force-app/main/default/lwc/offerFlowApplicationLWCVB/offerFlowApplicationLWCVB.js)

- Same telemetry additions as `offerFlowApplicationLWC.js`.
- Emits `decision_polling_started`, `decision_polling_ready`, and `applicationcomplete_dispatched`.
- Includes helper methods for provider resolution and payload construction.

#### [offerFlowContainer.js](C:/Users/AdamKim/SANDBOX/force-app/main/default/lwc/offerFlowContainer/offerFlowContainer.js)

- Added import of `emitTelemetryEvent`.
- Added a one-shot guard for offer rendering telemetry.
- Emits `loan_offer_rendered` when the container transitions to the loan offer flow.
- Covers both direct page-load offer rendering and application-complete redirect rendering.

## Apex business-flow files touched

#### [PlaidLWCController.cls](C:/Users/AdamKim/SANDBOX/force-app/main/default/classes/PlaidLWCController.cls)

- Added `sessionId` to the token map passed into the Plaid microservice extraction path.
- This is the bridge that lets correlation leave the LWC/Apex request path and continue downstream.

#### [Plaid_Helper.cls](C:/Users/AdamKim/SANDBOX/force-app/main/default/classes/Plaid_Helper.cls)

- Adds `Session-Id` header forwarding to the external parsing/microservice request.
- Emits `ile_materialized` after the ILE record is inserted, but only when a correlated `sessionId` is present in `extraParams`.

#### [Plaid_Webhook.cls](C:/Users/AdamKim/SANDBOX/force-app/main/default/classes/Plaid_Webhook.cls)

- Reads `Session-Id` or `X-Session-Id` from webhook headers.
- Emits `plaid_webhook_received` when a correlated session is available.
- Emits `bank_statements_uploaded_set` when the stage advances to `Bank Statements Uploaded`.
- Passes telemetry context into `plaidCreateILE(...)`.
- Uses telemetry-aware DE kickoff where session correlation is available.

#### [Plaid_BankStatement.cls](C:/Users/AdamKim/SANDBOX/force-app/main/default/classes/Plaid_BankStatement.cls)

- Added `initiateDEWithTelemetry(...)` alongside the existing `initiateDE(...)`.
- Emits `de_started` before DE kickoff when a correlated session is present.
- Emits `de_finished` after DE work returns on the paths instrumented here.
- Keeps the original `initiateDE(...)` entrypoint intact for non-telemetry callers.

#### [SolutionByText_Queuable.cls](C:/Users/AdamKim/SANDBOX/force-app/main/default/classes/SolutionByText_Queuable.cls)

- Added `telemetrySessionId` state to the queueable.
- Added telemetry-aware constructor overload:
  - `SolutionByText_Queuable(Integer callout, List<Id> ids, String orgName, String telemetrySessionId)`
- Updates the `Bank Statements Uploaded` DE kickoff path to call `Plaid_BankStatement.initiateDEWithTelemetry(...)` when a correlated session is available.
- Falls back to the original `initiateDE(...)` behavior when no session is present.

## Event coverage from current patch

These canonical events are wired now:

- `bank_upload_success`
- `decision_polling_started`
- `decision_polling_ready`
- `applicationcomplete_dispatched`
- `loan_offer_rendered`
- `plaid_webhook_received`
- `bank_statements_uploaded_set`
- `ile_materialized`
- `de_started`
- `de_finished`

## Important limitations

- Correlation is strongest on the offer-flow and Plaid microservice/webhook path because `sessionId` is available there.
- Some deeper async DE branches still do not have a durable session source outside the paths explicitly patched here.
- The Apex forwarding code depends on a Salesforce Named Credential called `Telemetry_Service`.

## Related setup note

See [salesforce-setup.md](C:/Users/AdamKim/Telemetry%20Service/docs/salesforce-setup.md) for the Named Credential and public-endpoint requirement.
