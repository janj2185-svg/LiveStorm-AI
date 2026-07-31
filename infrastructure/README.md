# SYLORA infrastructure

This directory defines the local dependency stack, application image,
Kubernetes deployment, observability, backup tooling, and CI/CD templates.
Local Compose is for development only. Production uses managed stateful
services; the Kubernetes manifests intentionally deploy only the API, Celery
workers, Celery beat, and a migration Job.

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
the Dockerfile excludes development and secret material. The current repository
does not yet contain `services/api`; image builds and backend CI fail clearly
until that service is added.

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
the default profile.

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

Kafka's `INTERNAL` listener is used by containers and its `HOST` listener by
host tools. Elasticsearch security is enabled, but HTTP TLS and Kafka transport
encryption are deliberately omitted from this loopback-only local stack. They
are not production settings.

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
application bucket, and applies 30-day local backup expiration.

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
- an OpenTelemetry Collector when OTLP export is enabled;
- a CNI implementation that enforces NetworkPolicy.

`base/servicemonitor.yaml` is optional. Add it to the kustomization only when
the Prometheus Operator CRD exists. Stateful systems are deliberately absent;
single-node manifests would present false production resilience.

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
`promtool`, Kubernetes API dry runs, migrations, backup/restore operations, and
end-to-end smoke tests were therefore not executed there. CI performs the
container-backed validations once the backend build context exists.
