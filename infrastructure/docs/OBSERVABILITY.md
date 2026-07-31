# Observability

## Metrics contract

The API must expose Prometheus metrics at `/metrics` and health endpoints at
`/health/live` and `/health/ready`. The supplied alerts and dashboard expect:

- `http_server_requests_total{method,route,status_code}`
- `http_server_request_duration_seconds_bucket{method,route,le}`
- Celery Exporter metrics `celery_workers`, `celery_queue_length`, and
  `celery_tasks_total{state}`

Keep `route` as the normalized route template, never the raw URL, to avoid
unbounded label cardinality. Do not put user IDs, object IDs, email addresses,
or trace IDs in metric labels.

Prometheus probes readiness through Blackbox Exporter. Grafana is provisioned
with Prometheus and loads the `SYLORA Operations Overview` dashboard
automatically.

## Structured logs

API and worker processes write newline-delimited JSON to stdout/stderr. Each
event should include `timestamp`, `level`, `service`, `environment`, `message`,
`request_id`, `trace_id`, and `span_id` where available. HTTP events should add
the normalized `route`, `method`, `status_code`, and `duration_ms`.

Never log authorization headers, cookies, passwords, tokens, full request
bodies, signed object URLs, or connection strings. Hash or tokenize user
identifiers before logging. Configure the cluster log agent (for example,
Fluent Bit, Vector, or an OpenTelemetry Collector) to enrich records with
Kubernetes metadata and deliver them to the organization-owned log store. Log
storage, retention, tenant access, and legal holds remain platform boundaries
and are not installed by this application manifest.

## Traces

The production overlay enables OTLP/gRPC export and parent-based 10% trace
sampling. Deploy an OpenTelemetry Collector in the observability namespace,
use TLS or in-cluster network policy, and configure tail sampling there for
errors and unusually slow requests. Override sampling per environment without
rebuilding the image.

Correlate logs and traces with W3C `traceparent`; propagate it through Kafka
messages and Celery task headers. Do not treat tracing backends as a location
for sensitive payloads.

## Alert routing

`alerts.yml` defines symptoms rather than paging policy. Connect Prometheus to
an Alertmanager managed by the platform team. Route critical readiness,
database, and Redis alerts to the on-call service; route warning latency,
queue, and task-failure alerts to the service channel. Add runbook URLs after
the organization chooses its incident-management system.
