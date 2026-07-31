# Object storage operations

## Buckets and access

The local initializer creates private `sylora-private`, `sylora-backups`,
`sylora-recordings`, and `milvus` buckets. Production should use separate
managed buckets and identities for application objects, database backups,
stream recordings, and Milvus. Deny public access at the account and bucket
layers. Grant the API only object-level access to its application prefix;
grant the backup principal write/list/delete access only to the backup prefix;
grant the recording uploader multipart/read/write access only to the
recording bucket and configured prefix. Enable versioning, server-side
encryption, access logging, and object-lock retention where policy requires it.

## Inventory

Enable the provider's native S3 Inventory for application, backup, and
recording buckets.
Deliver daily CSV or Parquet reports to a dedicated audit bucket in a different
account or project. Include object size, ETag, encryption status, version ID,
replication status, and object-lock status. Alert when:

- an application or backup object is unencrypted;
- a current backup has not replicated within the RPO;
- a completed recording has not uploaded within the streaming recovery window;
- inventory delivery is more than 36 hours old;
- delete markers or non-current versions grow unexpectedly.

For MinIO, schedule `mc stat`, `mc du`, and `mc admin heal --dry-run` from an
operations runner. Treat their aliases and credentials as runtime secrets; do
not store `~/.mc/config.json` in the repository.

## Replication

Production replication must cross a failure domain and preferably an account.
For managed S3, enable versioning on both ends, grant the provider replication
role, enable replication metrics, and replicate delete markers only when the
retention policy explicitly requires it.

For supported MinIO deployments, configure bucket replication using an alias
whose credentials are injected by the secret manager:

```bash
mc replicate add primary/sylora-backups \
  --remote-bucket 'https://REDACTED_DESTINATION/sylora-backups' \
  --replicate 'delete,delete-marker,existing-objects'
mc replicate status primary/sylora-backups
```

Do not use the local single-node MinIO instance as either side of a production
replication topology.

## Lifecycle

The local backup bucket expires objects after 30 days. The local recording
bucket has no automatic object lifecycle; local disk segments remain available
for seven days while the uploader copies completed segments. In production, manage
lifecycle as provider infrastructure so retention cannot silently diverge from
policy. Keep enough daily, weekly, and monthly restore points to satisfy the
documented RPO and legal requirements. Define recording retention from tenant,
privacy, and legal-hold policy. Ensure backup lifecycle applies to payload and
`.sha256` objects together. Object-lock retention takes precedence over
deletion attempted by the backup script.
