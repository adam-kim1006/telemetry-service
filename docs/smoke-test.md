# Smoke Test

Use this against the running local service on port `3000`.

## Single event

```bash
curl -X POST http://localhost:3000/telemetry/events \
  -H "Content-Type: application/json" \
  -H "x-telemetry-secret: change-me" \
  -d '{
    "sessionId": "sess-demo-001",
    "oppId": "006DEMO0000001",
    "provider": "plaid",
    "origin": "SunshineDE",
    "brand": "Sunshine",
    "applicantFlow": "offerFlowContainer",
    "eventName": "bank_upload_success",
    "eventSource": "lwc",
    "eventTs": "2026-04-08T21:05:00.000Z",
    "idempotencyKey": "sess-demo-001:bank_upload_success:2026-04-08T21:05:00.000Z",
    "payload": {
      "institutionName": "Demo Bank"
    }
  }'
```

## Full milestone timeline

```bash
curl -X POST http://localhost:3000/telemetry/events \
  -H "Content-Type: application/json" \
  -H "x-telemetry-secret: change-me" \
  -d '{
    "events": [
      {
        "sessionId": "sess-demo-001",
        "oppId": "006DEMO0000001",
        "provider": "plaid",
        "origin": "SunshineDE",
        "brand": "Sunshine",
        "applicantFlow": "offerFlowContainer",
        "eventName": "bank_upload_success",
        "eventSource": "lwc",
        "eventTs": "2026-04-08T21:05:00.000Z",
        "idempotencyKey": "sess-demo-001:bank_upload_success:2026-04-08T21:05:00.000Z",
        "payload": {
          "institutionName": "Demo Bank"
        }
      },
      {
        "sessionId": "sess-demo-001",
        "oppId": "006DEMO0000001",
        "provider": "plaid",
        "origin": "SunshineDE",
        "brand": "Sunshine",
        "applicantFlow": "offerFlowContainer",
        "eventName": "asset_report_fetch_started",
        "eventSource": "microservice",
        "eventTs": "2026-04-08T21:05:04.000Z",
        "idempotencyKey": "sess-demo-001:asset_report_fetch_started:2026-04-08T21:05:04.000Z",
        "payload": {}
      },
      {
        "sessionId": "sess-demo-001",
        "oppId": "006DEMO0000001",
        "provider": "plaid",
        "origin": "SunshineDE",
        "brand": "Sunshine",
        "applicantFlow": "offerFlowContainer",
        "eventName": "asset_report_parse_completed",
        "eventSource": "microservice",
        "eventTs": "2026-04-08T21:05:09.000Z",
        "idempotencyKey": "sess-demo-001:asset_report_parse_completed:2026-04-08T21:05:09.000Z",
        "durationMs": 5000,
        "payload": {}
      },
      {
        "sessionId": "sess-demo-001",
        "oppId": "006DEMO0000001",
        "provider": "plaid",
        "origin": "SunshineDE",
        "brand": "Sunshine",
        "applicantFlow": "offerFlowContainer",
        "eventName": "plaid_webhook_received",
        "eventSource": "webhook",
        "eventTs": "2026-04-08T21:05:12.000Z",
        "idempotencyKey": "sess-demo-001:plaid_webhook_received:2026-04-08T21:05:12.000Z",
        "payload": {}
      },
      {
        "sessionId": "sess-demo-001",
        "oppId": "006DEMO0000001",
        "provider": "plaid",
        "origin": "SunshineDE",
        "brand": "Sunshine",
        "applicantFlow": "offerFlowContainer",
        "eventName": "de_started",
        "eventSource": "de",
        "eventTs": "2026-04-08T21:05:13.000Z",
        "idempotencyKey": "sess-demo-001:de_started:2026-04-08T21:05:13.000Z",
        "payload": {}
      },
      {
        "sessionId": "sess-demo-001",
        "oppId": "006DEMO0000001",
        "provider": "plaid",
        "origin": "SunshineDE",
        "brand": "Sunshine",
        "applicantFlow": "offerFlowContainer",
        "eventName": "de_finished",
        "eventSource": "de",
        "eventTs": "2026-04-08T21:05:17.000Z",
        "idempotencyKey": "sess-demo-001:de_finished:2026-04-08T21:05:17.000Z",
        "durationMs": 4000,
        "payload": {
          "finalStage": "Loan Amount Offered"
        }
      },
      {
        "sessionId": "sess-demo-001",
        "oppId": "006DEMO0000001",
        "provider": "plaid",
        "origin": "SunshineDE",
        "brand": "Sunshine",
        "applicantFlow": "offerFlowContainer",
        "eventName": "loan_offer_rendered",
        "eventSource": "lwc",
        "eventTs": "2026-04-08T21:05:20.000Z",
        "idempotencyKey": "sess-demo-001:loan_offer_rendered:2026-04-08T21:05:20.000Z",
        "finalStatus": "offer_rendered",
        "payload": {
          "loanOfferStep": "Amount Offered"
        }
      }
    ]
  }'
```

## Read the stitched timeline

```bash
curl http://localhost:3000/telemetry/session/sess-demo-001 \
  -H "x-telemetry-secret: change-me"
```

## Check all sessions for one opportunity

```bash
curl http://localhost:3000/telemetry/opp/006DEMO0000001 \
  -H "x-telemetry-secret: change-me"
```
