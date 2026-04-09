# Salesforce Setup Notes

## Named Credential

The Apex forwarding code expects a Named Credential with this developer name:

`Telemetry_Service`

Its base URL should point at the telemetry service host, for example:

- a deployed environment URL, or
- a temporary public tunnel URL for local testing

## Auth header

Configure the Named Credential to send:

- header: `x-telemetry-secret`
- value: the same shared secret used by the Node telemetry service

## Important local-testing constraint

Salesforce cloud callouts cannot reach `localhost` or your local Docker network directly.

That means this will **not** work from Apex:

- `http://localhost:3000`
- `http://host.docker.internal:3000`

For Salesforce-driven end-to-end testing, use one of:

- a deployed telemetry environment
- a public tunnel in front of your local service

## What this patch wires today

- LWC events forward through Apex to the external telemetry service
- Plaid microservice requests forward `Session-Id` so the webhook can preserve correlation
- Webhook and ILE telemetry emit only when that session header is present
- DE start/finish emit on the `Plaid_BankStatement` kickoff path when a correlated session is available

## Known limitation

Some deeper async DE paths still need stronger session persistence if you want perfect correlation for every branch. This patch avoids inventing fake session IDs and keeps those telemetry emits best-effort.
