# Salesforce Instrumentation Map

This is the smallest useful Phase 1 wiring plan for the current Salesforce flow.

## Correlation contract

Every emitted event should include:

- `sessionId`
- `oppId`
- `provider`
- `origin`
- `brand`
- `applicantFlow`

For the existing flow, the good defaults are:

- `sessionId`: existing container/application `sessionId`
- `oppId`: `oppId` or `opportunityId`
- `origin`: `oppOrigin`
- `brand`: `brandData.ORIGIN` or brand label already available in component context
- `applicantFlow`: `offerFlowContainer`, `offerFlowApplicationLWC`, or `offerFlowApplicationLWCVB`

## Initial event emit points

### `bank_upload_success`

Emit after the server-side Plaid success call returns `result.success === true`.

Source:

- [plaidBankConnect.js](C:/Users/AdamKim/SANDBOX/force-app/main/default/lwc/plaidBankConnect/plaidBankConnect.js)

Recommended spot:

- inside `handlePlaidSuccess(...)`, immediately before dispatching `bankconnected`

Why this spot:

- it measures user-perceived success only after the Apex round-trip succeeds
- it avoids false positives from Plaid UI callbacks that never finish backend processing

### `decision_polling_started`

Emit once right before the first poll cycle begins.

Sources:

- [offerFlowApplicationLWC.js](C:/Users/AdamKim/SANDBOX/force-app/main/default/lwc/offerFlowApplicationLWC/offerFlowApplicationLWC.js)
- [offerFlowApplicationLWCVB.js](C:/Users/AdamKim/SANDBOX/force-app/main/default/lwc/offerFlowApplicationLWCVB/offerFlowApplicationLWCVB.js)

Recommended spot:

- at the top of `startDecisionPolling()`

Guard:

- use a boolean like `hasEmittedDecisionPollingStarted` so refresh flows do not spam duplicate “started” events

### `decision_polling_ready`

Emit when polling first sees `result.status === 'ready'`.

Sources:

- [offerFlowApplicationLWC.js](C:/Users/AdamKim/SANDBOX/force-app/main/default/lwc/offerFlowApplicationLWC/offerFlowApplicationLWC.js)
- [offerFlowApplicationLWCVB.js](C:/Users/AdamKim/SANDBOX/force-app/main/default/lwc/offerFlowApplicationLWCVB/offerFlowApplicationLWCVB.js)

Recommended spot:

- inside `pollForDecision()` in the `result.status === 'ready'` branch

Payload ideas:

- `stage`
- `isApproved`
- `pollingCount`

### `applicationcomplete_dispatched`

Emit immediately before `dispatchEvent(new CustomEvent('applicationcomplete', ...))`.

Sources:

- [offerFlowApplicationLWC.js](C:/Users/AdamKim/SANDBOX/force-app/main/default/lwc/offerFlowApplicationLWC/offerFlowApplicationLWC.js)
- [offerFlowApplicationLWCVB.js](C:/Users/AdamKim/SANDBOX/force-app/main/default/lwc/offerFlowApplicationLWCVB/offerFlowApplicationLWCVB.js)

There are two real paths to cover:

- `handlePollingComplete()` when approval arrives during active polling
- `checkRedirectToLoanOfferFlow()` when the page loads and the decision is already ready

### `loan_offer_rendered`

Emit when the container has switched to loan-offer mode and set the first visible offer step.

Source:

- [offerFlowContainer.js](C:/Users/AdamKim/SANDBOX/force-app/main/default/lwc/offerFlowContainer/offerFlowContainer.js)

Recommended spots:

- in `handleApplicationComplete(...)` after `currentFlow = 'Loan Offered'` and `loanOfferStep = 'Amount Offered'`
- in `getChildComponentStep()` when `currentFlow == 'Loan Offered'` and the user lands directly on the offer page

Why both:

- one covers same-session redirect from application flow
- the other covers resume/direct-link page loads

## Apex and DE Phase 1 emit points

### `plaid_webhook_received`

Emit at the start of the webhook after `oppID` is resolved from headers or payload.

Source:

- [Plaid_Webhook.cls](C:/Users/AdamKim/SANDBOX/force-app/main/default/classes/Plaid_Webhook.cls)

### `bank_statements_uploaded_set`

Emit in the success path where stage is advanced to `Bank Statements Uploaded`.

Source:

- [Plaid_Webhook.cls](C:/Users/AdamKim/SANDBOX/force-app/main/default/classes/Plaid_Webhook.cls)

### `ile_materialized`

Emit after `Plaid_Helper.plaidCreateILE(...)` completes.

Source:

- [Plaid_Helper.cls](C:/Users/AdamKim/SANDBOX/force-app/main/default/classes/Plaid_Helper.cls)

### `de_started`

Emit at the beginning of DE orchestration.

Sources:

- [Plaid_BankStatement.cls](C:/Users/AdamKim/SANDBOX/force-app/main/default/classes/Plaid_BankStatement.cls)
- [DE_Orchestrator.cls](C:/Users/AdamKim/SANDBOX/force-app/main/default/classes/decision_engine/core/DE_Orchestrator.cls)

Preferred first cut:

- emit inside `DE_Orchestrator.processOpportunities(...)` so DE 2.0 runs are captured in one place

### `de_finished`

Emit after `persistExecutionAnalytics(...)` work is reached or right before `processContextMap(...)` returns for a given opp.

Source:

- [DE_Orchestrator.cls](C:/Users/AdamKim/SANDBOX/force-app/main/default/classes/decision_engine/core/DE_Orchestrator.cls)

Payload ideas:

- `finalStage`
- `finalOutput`
- `totalDurationMs`

## Implementation pattern

### Browser side

Do not post directly from the browser with a long-lived shared secret.

Safer first cut:

- LWC calls Apex helper like `TelemetryController.emitEvent(...)`
- Apex adds the shared secret and forwards to the Node service

### Apex side

Use a tiny forwarding helper rather than duplicating HTTP callout code in each class.

Suggested shape:

```apex
public with sharing class TelemetryService {
    public static void emit(
        String sessionId,
        Id oppId,
        String provider,
        String origin,
        String brand,
        String applicantFlow,
        String eventName,
        String eventSource,
        Datetime eventTs,
        Integer durationMs,
        String finalStatus,
        Map<String, Object> payload
    ) {
        // Queueable or future callout recommended.
    }
}
```

### Idempotency

Use a deterministic key everywhere:

```text
sessionId:eventName:yyyy-MM-ddTHH:mm:ss.SSSZ
```

For events that can happen more than once in one session, keep the timestamp in the key.

## Best first real rollout

Ship these seven events first:

- `bank_upload_success`
- `asset_report_fetch_started`
- `asset_report_parse_completed`
- `plaid_webhook_received`
- `de_started`
- `de_finished`
- `loan_offer_rendered`

That gives you an end-to-end latency chain quickly without needing full business-flow instrumentation on day one.
