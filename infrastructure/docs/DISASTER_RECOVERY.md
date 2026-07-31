# Disaster recovery

## Assumptions and targets

These are planning targets, not measured guarantees:

| System | Assumed recovery source | Target RPO | Target RTO |
|---|---|---:|---:|
| PostgreSQL | Managed PITR plus daily encrypted `pg_dump` | 15 min with PITR; 24 h from dump | 4 h |
| S3-compatible objects | Versioning and cross-domain replication | 15 min | 4 h |
| Kafka | Multi-zone managed replication and topic retention | 15 min | 4 h |
| Redis | Rebuild from authoritative PostgreSQL/events | Best effort | 2 h |
| Elasticsearch | Snapshot repository or reindex from source | 24 h | 8 h |
| Milvus | Managed backup/snapshot plus replicated object data | 24 h | 8 h |

Product owners must refine these targets after data classification and load
testing. Production managed-service retention, point-in-time recovery,
cross-region replication, encryption keys, and restore permissions are
platform responsibilities.

## PostgreSQL backup

Run `scripts/backup-postgres.sh` from a controlled backup runner with
PostgreSQL client tools, AWS CLI, and an injected database password and S3
identity. Prefer `BACKUP_ENCRYPTION=age` with a recipient whose private key is
held outside the workload cluster. Monitor job completion and the age of the
latest payload and checksum.

The script creates a custom-format dump, encrypts it when configured, generates
a SHA-256 checksum, uploads both objects, and removes objects older than the
configured retention. Provider lifecycle and object lock remain the primary
retention controls.

## Quarterly restore drill

1. Open an incident or change record and assign a drill owner, observer, and
   rollback decision maker.
2. Select a recovery point and record the object URI, timestamp, source
   database version, expected RPO, and encryption-key identifier.
3. Create an isolated network and a disposable PostgreSQL instance with the
   same major version and sufficient storage. Never target production.
4. Export temporary credentials through the approved secret manager. Run:

   ```bash
   BACKUP_URI='s3://bucket/prefix/database_timestamp.dump.age' \
   AGE_IDENTITY_FILE='/secure/path/to/identity' \
   infrastructure/scripts/verify-backup.sh
   ```

5. Set the disposable database connection variables, then require explicit
   confirmation:

   ```bash
   RESTORE_CONFIRMATION='RESTORE sylora_restore_drill' \
   BACKUP_URI='s3://bucket/prefix/database_timestamp.dump.age' \
   PGDATABASE='sylora_restore_drill' \
   infrastructure/scripts/restore-postgres.sh
   ```

6. Run migration status checks, row-count and referential-integrity checks,
   application smoke tests, and representative object lookups. Compare counts
   and checksums against independently recorded source metrics.
7. Record actual backup age, download time, restore time, validation time,
   errors, and achieved RPO/RTO. A checksum-only verification is not a restore
   drill.
8. Destroy the disposable environment through the approved process, revoke
   temporary credentials, and retain sanitized evidence.
9. Create tracked remediation for every missed target or manual dependency.

No restore drill or runtime backup has been executed by the configuration in
this repository.

## Regional recovery order

1. Establish identity, encryption-key access, DNS, networking, and the target
   Kubernetes cluster.
2. Restore or fail over managed PostgreSQL and object storage.
3. Restore Kafka, Elasticsearch, and Milvus according to provider runbooks.
   Rebuild Redis only after authoritative stores are available.
4. Provision `sylora-api-secrets` from the secret manager and configure
   production endpoints.
5. Run the migration Job with the exact application image being deployed.
6. Deploy workers, then the API, and keep external traffic disabled until
   readiness and data-integrity checks pass.
7. Enable a small traffic percentage, monitor errors, latency, queue depth,
   database saturation, and replication lag, then increase gradually.
8. Update DNS only after the incident commander approves cutover.

## Failure and rollback

Stop a restore immediately on checksum failure, decryption failure, an
unexpected PostgreSQL major version, insufficient storage, or a target identity
that cannot be proven disposable. Preserve logs without credentials. For a
failed application rollout, roll back the image only when the migration is
backward compatible; otherwise use the migration-specific recovery procedure
developed with that schema change.
