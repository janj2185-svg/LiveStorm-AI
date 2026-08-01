# SYLORA infrastructure

This directory defines the local dependency stack, application image,
Kubernetes deployment, local streaming media plane, observability, backup
tooling, and CI/CD templates. Local Compose is for development only.
Production uses managed stateful services. Kubernetes includes the API workers
plus a deliberately single-replica MediaMTX recording origin and Coturn
foundation; production media routing constraints are documented rather than
hidden behind unsafe replica counts.

## Prerequisites

- Docker Engine 24+ with Docker Compose v2
- 12 GB RAM available to Docker for the complete stack
- Python 3.12 and PyYAML for static validation
- `kubectl` with Kustomize support for Kubernetes rendering
- `shellcheck` for shell validation
- PostgreSQL client tools and AWS CLI for backup operations

The API build context is `services/api`, with
`infrastructure/docker/api.Dockerfile` supplied via `-f`. This keeps the image
context limited to backend source. The Dockerfile-specific ignore file next to
the Dockerfile excludes development and secret material. The API source lives in `services/api`. Image builds use
`infrastructure/docker/api.Dockerfile` with that directory as build context.

## Secrets

Create the local environment file:

```bash
cp infrastructure/.env.example infrastructure/.env
```

Replace every `REPLACE_WITH_GENERATED` value. Examples:

```bash
openssl rand -base64 32
openssl rand -hex 64
python -c 'import base64,uuid; print(base64.urlsafe_b64encode(uuid.uuid4().bytes).decode().rstrip("="))'
```

The third command generates a Kafka KRaft cluster ID. Keep
`infrastructure/.env` out of version control and use a local secret store when
possible. Compose uses `${VAR:?message}` for every secret and refuses to render
when one is missing.

Kubernetes never applies `secret.example.yaml`. Provision
`sylora-api-secrets` through the platform secret manager. When External Secrets
Operator and its `ClusterSecretStore` are available, adapt
`base/external-secret.example.yaml` and add it to the environment
kustomization.

## Local stack

Start application dependencies, the API, and Celery:

```bash
docker compose \
  --env-file infrastructure/.env \
  -f infrastructure/compose/compose.yml \
  up -d --build
```

Add Prometheus, Grafana, exporters, host metrics, and container metrics:

```bash
docker compose \
  --env-file infrastructure/.env \
  -f infrastructure/compose/compose.yml \
  --profile observability \
  up -d --build
```

The observability profile is optional because cAdvisor requires privileged host
mounts and is Docker-specific. All stateful application dependencies remain in
the default profile. MediaMTX, Coturn, persistent fMP4 recording, and the
S3-compatible recording uploader are also in the default profile. Detailed OBS,
WHIP/WHEP, SRT, TURN, codec, and test guidance is in
`streaming/README.md`.

Stop services without deleting data:

```bash
docker compose \
  --env-file infrastructure/.env \
  -f infrastructure/compose/compose.yml \
  --profile observability \
  down
```

To deliberately destroy local data, append `--volumes` to `down` after
confirming no local data is needed.

## Local endpoints

All published ports bind to loopback.

| Service | URL or address | Authentication |
|---|---|---|
| API | `http://127.0.0.1:8000` | Application-defined |
| PostgreSQL | `127.0.0.1:5432` | `.env` user/password |
| Redis | `127.0.0.1:6379` | `.env` password |
| Kafka host listener | `127.0.0.1:9092` | Local plaintext only |
| Elasticsearch | `http://127.0.0.1:9200` | `elastic` / `.env` password |
| MinIO S3 API | `http://127.0.0.1:9000` | `.env` access/secret key |
| MinIO console | `http://127.0.0.1:9001` | `.env` access/secret key |
| Milvus | `http://127.0.0.1:19530` | Local network only |
| Mailpit SMTP | `127.0.0.1:1025` | No local authentication |
| Mailpit UI | `http://127.0.0.1:8025` | No local authentication |
| Prometheus | `http://127.0.0.1:9090` | Local profile only |
| Grafana | `http://127.0.0.1:3001` | `.env` admin credentials |
| RTMP ingest | `rtmp://127.0.0.1:1935` | `.env` publisher credentials |
| LL-HLS | `http://127.0.0.1:8888` | `.env` viewer credentials |
| WHIP/WHEP signaling | `http://127.0.0.1:8889` | `.env` publisher/viewer credentials |
| WebRTC ICE | `127.0.0.1:8189/udp` | DTLS/ICE session |
| SRT | `127.0.0.1:8890/udp` | `.env` publisher/viewer credentials |
| Recording playback | `http://127.0.0.1:9996` | `.env` viewer credentials |
| TURN/STUN | `127.0.0.1:3478` TCP/UDP | `.env` realm/user/secret |
| TURN relay | `127.0.0.1:49160-49200/udp` | Allocated through TURN |

Kafka's `INTERNAL` listener is used by containers and its `HOST` listener by
host tools. Elasticsearch security is enabled, but HTTP TLS and Kafka transport
encryption are deliberately omitted from this loopback-only local stack. They
are not production settings.

The MediaMTX control API (`9997`), MediaMTX metrics (`9998`), Coturn metrics
(`9641`), and recording-uploader metrics (`5572`) are internal container
endpoints and are not published to the host. Local HLS and WebRTC signaling use
HTTP explicitly; production requires trusted TLS termination. No extra edge
proxy is needed for loopback development.

The MinIO image is pinned to the last publicly distributed official community
container used by this stack. Scan it continuously and replace it with an
organization-built, patched image or managed S3 service for any non-local use.

## Health and troubleshooting

Inspect service state and health:

```bash
docker compose \
  --env-file infrastructure/.env \
  -f infrastructure/compose/compose.yml \
  --profile observability \
  ps
curl --fail http://127.0.0.1:8000/health/ready
curl --fail http://127.0.0.1:9000/minio/health/live
curl --fail http://127.0.0.1:9090/-/ready
```

Dependency-aware startup waits for PostgreSQL, Redis, Kafka, Elasticsearch,
MinIO initialization, etcd, and Milvus health before starting the application
processes. MinIO initialization creates private buckets, applies CORS to the
application bucket, creates the private recording bucket, and applies 30-day
local backup expiration. It also creates or rotates the dedicated recording
uploader identity and limits that identity to the recording bucket.

Linux hosts may need `vm.max_map_count=262144` for Elasticsearch. cAdvisor
mounts Docker-specific host paths and may need adjustments under rootless
Docker, Podman, macOS, or Windows.

## Kubernetes

Render overlays without applying them:

```bash
kubectl kustomize infrastructure/kubernetes/overlays/development
kubectl kustomize infrastructure/kubernetes/overlays/production
```

The development overlay points dependencies at `host.docker.internal`; this is
appropriate only for local Kubernetes implementations that provide that name.
The production overlay contains `.invalid` managed-service and hostname
placeholders by design. Replace all of them before deployment. The deployment
workflow checks rendered output and fails if placeholders remain.

Production requires:

- managed, multi-zone PostgreSQL, Redis, Kafka, Elasticsearch, Milvus, and
  S3-compatible storage;
- an ingress controller and TLS issuer;
- Metrics Server for HPA;
- a pre-provisioned `sylora-api-secrets`;
- a pre-provisioned `sylora-streaming-secrets`;
- static public media/TURN addresses and provider-specific UDP load balancing;
- path-aware routing before MediaMTX is allowed to scale above one replica;
- a recording StorageClass with snapshots and measured capacity;
- an OpenTelemetry Collector when OTLP export is enabled;
- a CNI implementation that enforces NetworkPolicy.

`base/servicemonitor.yaml` and `base/streaming-servicemonitor.yaml` are
optional. Add them only when the Prometheus Operator CRD exists. The streaming
StatefulSet and HPA are intentionally capped at one origin; see
`kubernetes/overlays/production/STREAMING.md` before changing this.

The migration Job is applied with each release. Migrations must preserve
compatibility with the previous application version during a rolling update.
Use expand/contract schema changes and test rollback behavior before
production.

## Deployment workflow

`deploy.yml` is manual and binds to a protected GitHub Environment. Select AWS,
Google Cloud, or Azure; each path uses GitHub OIDC and requires environment
variables identifying the workload identity. No long-lived cloud credential is
accepted by the template. The workflow builds and pushes an immutable image,
sets it in Kustomize, checks placeholders and the secret boundary, applies the
release, waits for migration and rollouts, and performs an HTTPS readiness
smoke test.

Configure environment approvals and restrict the OIDC trust policy to the
repository, workflow, branch, and GitHub Environment before first use.

## Backup and observability

- `docs/DISASTER_RECOVERY.md` defines unverified RPO/RTO assumptions and a
  restore drill.
- `docs/OBJECT_STORAGE.md` defines inventory, replication, and lifecycle
  boundaries.
- `docs/OBSERVABILITY.md` defines metrics, structured logging, tracing, and
  alert-routing contracts.
- `streaming/OBS_COMPANION.md` defines the signed outbound local companion
  boundary for OBS WebSocket 5.x control.
- `scripts/backup-postgres.sh`, `restore-postgres.sh`, and
  `verify-backup.sh` operate entirely from injected environment credentials.

## Static validation

```bash
python -m pip install PyYAML
python infrastructure/scripts/validate-static.py
for script in infrastructure/scripts/*.sh; do bash -n "$script"; done
shellcheck infrastructure/scripts/*.sh
kubectl kustomize infrastructure/kubernetes/overlays/development >/dev/null
kubectl kustomize infrastructure/kubernetes/overlays/production >/dev/null
```

Docker is not installed in the current implementation runner. Compose image
pulls, builds, container health checks, application startup, Prometheus
`promtool`, MediaMTX/Coturn/rclone runtime checks, media ingest/playback,
WebRTC/TURN traversal, Kubernetes API dry runs, migrations, backup/restore
operations, and end-to-end smoke tests were therefore not executed there. CI
performs the container-backed manifest validations once the backend build
context exists.
