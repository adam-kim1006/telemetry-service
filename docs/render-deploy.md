# GitHub And Render Deployment

This guide takes the telemetry service from local Docker to a stable public URL on Render using an existing Postgres database.

## Before You Start

- Create a real `.env` locally and replace `change-me`.
- Confirm the service still works locally after the secret change.
- Make sure `.env` is not committed.

## Step 1: Create The GitHub Repo

1. Create a new GitHub repo, for example `telemetry-sidecar`.
2. From `C:\Users\AdamKim\Telemetry Service`, initialize git if needed.
3. Commit the current codebase.
4. Push the repo to GitHub.

Suggested initial commit contents:

- service source
- migrations
- Dockerfile
- `render.yaml`
- docs

Do not commit:

- `.env`
- local Docker volumes

## Step 2: Create The Render Blueprint

This repo includes a `render.yaml` blueprint at the repo root.

It creates:

- a Render web service named `telemetry-sidecar`

It expects you to provide:

- `DATABASE_URL` for your existing Postgres database
- `TELEMETRY_SHARED_SECRET` as a dashboard-entered secret

It also sets:

- `PORT=10000`
- `HOST=0.0.0.0`
- `AUTO_RUN_MIGRATIONS=true`

## Step 3: Deploy On Render

1. Sign in to Render.
2. Click `New`.
3. Click `Blueprint`.
4. Connect your GitHub account if needed.
5. Select the telemetry repo.
6. Render should detect `render.yaml`.
7. Review the resource:
   - web service: `telemetry-sidecar`
8. Enter a real value for `DATABASE_URL`.
9. Enter a real value for `TELEMETRY_SHARED_SECRET`.
10. Create the Blueprint.

## Step 4: Validate The Deploy

After the first deploy finishes:

1. Open the web service in Render.
2. Copy the public `onrender.com` URL.
3. Open `<service-url>/health`.
4. Confirm the response is:

```json
{"ok":true}
```

If the service fails to boot:

- check Render deploy logs
- confirm the app can reach your Postgres host from Render
- confirm `DATABASE_URL` and `TELEMETRY_SHARED_SECRET` are present in Render env vars
- confirm the database user has permission to create and modify tables in the `make` schema during migrations

## Step 5: Repoint Salesforce

1. Open Salesforce Named Credential `Telemetry_Service`.
2. Replace the Cloudflare tunnel URL with the Render public URL.
3. Update the `x-telemetry-secret` header value to match the Render secret.
4. Save.
5. Run the anonymous Apex smoke test.
6. Run one real flow and verify events arrive.

## Step 6: Retire The Tunnel

Once Salesforce is successfully sending events to Render:

- stop using the Cloudflare Quick Tunnel for normal testing
- keep it only for local development when needed

## Suggested First Production Follow-Ups

- move the telemetry tables out of the `make` schema once the long-term database home is decided
- add a dashboard layer such as Metabase
- add more milestone events from Apex, LWC, and the parsing microservice
