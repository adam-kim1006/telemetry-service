# Platform Options

This note compares the most likely monitoring and hosting choices for this telemetry service.

## Datadog vs Grafana

### Datadog is stronger when you want:

- one integrated observability product
- faster APM and tracing setup
- built-in correlation between traces, logs, metrics, dashboards, and monitors
- lower setup friction for teams that prefer a managed platform

### Grafana is stronger when you want:

- more control over where data lives
- a flexible dashboard and alerting layer across many backends
- lower platform lock-in
- the option to start with dashboards first and add deeper observability later

### Best fit for this telemetry service

- For the telemetry data stored in Postgres, start with **Metabase** or simple SQL-backed dashboards first.
- If you later want infrastructure and service observability for the Node service itself, **Grafana** is a better next step than Datadog for a small sidecar.
- If your wider engineering org already runs Datadog, then Datadog becomes more attractive because it can unify this service with the rest of your fleet.

## Render vs Heroku

### Render is a strong fit when you want:

- a simple Docker-based deploy from GitHub
- a stable public URL quickly
- a straightforward managed Postgres pairing
- fewer platform-specific constraints to think about

### Heroku is a strong fit when you want:

- to keep this service near an existing Heroku microservice estate
- familiar app + config-var workflows
- easy add-on based Postgres provisioning

### Heroku caveats for this app

- If you deploy with Docker on Heroku, the app must listen on `$PORT`, not just `3000`.
- Heroku dyno filesystems are ephemeral, so persistence must stay in Postgres.
- Heroku’s container stack works, but Heroku explicitly recommends its default buildpack flow unless you specifically need custom Docker images.

### Bottom line

- **Render** is the easiest clean productionization path for this repo as it exists today.
- **Heroku** is still a valid home, especially if you already operate another microservice there and want operational consistency.
