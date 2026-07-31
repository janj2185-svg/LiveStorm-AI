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

MediaMTX exposes a second metrics contract at its internal port `9998`:

- `paths{name,state}` for path availability;
- `paths_readers{name,state,readerType}` for current viewers;
- `paths_inbound_bytes{name,state}` and `paths_outbound_bytes{name,state}` for
  bitrate derivation with `rate(...) * 8`;
- `paths_inbound_frames_in_error{name,state}` for malformed inbound frames;
- protocol session metrics such as `rtmp_conns`, `srt_conns`, and
  `webrtc_sessions`.

Coturn exports allocation/traffic metrics on internal port `9641`. The
recording uploader exports rclone metrics on internal port `5572`, including
`rclone_bytes_transferred_total`, `rclone_files_transferred_total`, and
`rclone_errors_total`. These ports are not public endpoints.

Grafana also provisions `SYLORA Streaming Media Plane`, with path, viewer,
bitrate, frame-error, protocol-session, and recording-upload panels.

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

Streaming alerts cover MediaMTX scrape failure, unavailable paths, no active
ingest, low inbound bitrate, malformed frames, viewer spikes/drops, Coturn
scrape failure, uploader failure, and Kubernetes recording-volume capacity.
The no-ingest alert must be routed only during scheduled live windows.

MediaMTX does not export a recording-write failure counter. Do not infer one.
Recording failure detection is split across MediaMTX error logs, rclone
transfer errors, uploader availability, and PVC free-space metrics. The PVC
alert requires kubelet volume statistics from the cluster monitoring stack;
it remains absent rather than firing in local Compose.
