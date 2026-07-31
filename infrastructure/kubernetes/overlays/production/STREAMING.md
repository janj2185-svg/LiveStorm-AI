# Production streaming overlay requirements

The base intentionally runs one MediaMTX StatefulSet pod and one Coturn pod.
The MediaMTX HPA is capped at one replica. This is a safety guard, not a claim
of horizontal media scaling.

## Required environment patches

Before deployment, patch `sylora-streaming-config` with:

- the public WebRTC host names/IPs advertised through
  `MEDIAMTX_WEBRTC_ADDITIONAL_HOSTS`;
- the production TURN realm and the static public IPv4 address assigned to
  the Coturn load balancer;
- the object-storage provider, region, bucket, prefix, and upload interval.

Provision `sylora-streaming-secrets` from the platform secret manager with
these keys:

```text
publisher-username
publisher-password
viewer-username
viewer-password
mediamtx-api-username
mediamtx-api-password
turn-url
turn-username
turn-secret
recording-s3-access-key-id
recording-s3-secret-access-key
recording-s3-endpoint
```

`turn-url` is the browser-reachable URI, including port and transport, such as
`turn:turn.example.net:3478?transport=udp`. The username and secret must match
Coturn. Use a bucket-scoped object-storage identity that can read and create
objects only under the configured recording prefix. Patch the PVC storage class,
capacity, snapshot policy, and availability zone for measured ingest bitrate
and worst-case upload outage.

Replace global publisher/viewer credentials with MediaMTX HTTP or JWT
authentication before admitting multiple tenants. Keep the control API
ClusterIP-only and allow port `9997` solely from the application control
plane.

## Load balancing and public addresses

Reserve static public IPs. Coturn's advertised `external-ip` must exactly
match its public IP, and NAT must preserve every UDP relay port one-to-one.
The base Service enumerates UDP `49160-49200`; verify that the cloud load
balancer supports UDP, preserves flows, and permits this many listeners.
Providers that cannot route a TURN allocation and its relay port to the same
pod need a dedicated public IP per Coturn pod, a provider-specific UDP load
balancer, or host networking on dedicated nodes. Increasing Coturn replicas
behind a generic Service is not sufficient.

Use Layer 4 listeners for RTMP, SRT, WebRTC ICE UDP, and TURN. Terminate
trusted TLS at a supported ingress/load balancer for HLS, WHEP/WHIP
signaling, recording playback, and any companion WebSocket gateway.
Production RTMP ingest should use RTMPS at a trusted TLS endpoint when the
publisher crosses an untrusted network.

## Why MediaMTX remains single replica

An active RTMP/SRT publisher is stateful and exists in one process. Readers
must reach the process holding that path. HLS and WebRTC sessions also span
multiple HTTP requests and require Layer 7 stickiness. A normal Kubernetes
Service can route the publisher, signaling requests, ICE traffic, and readers
to different pods. ReadWriteOnce recording storage further binds recordings
to one pod.

Do not raise the HPA maximum until the platform adds path-aware routing. A
supported scale-out design needs:

- deterministic assignment of each publish path to one origin;
- API/control-plane awareness of that assignment;
- Layer 4 routing of RTMP/SRT and ICE flows to the assigned origin;
- sticky Layer 7 routing for HLS and WHEP/WHIP;
- origin-to-read-replica proxying for fan-out;
- one recording writer per path and independently durable upload state;
- drain logic that blocks new publishers and lets active sessions finish.

MediaMTX's documented origin/read-replica design can satisfy these constraints
when implemented with explicit routing. Merely increasing a Deployment or
StatefulSet replica count cannot.

## Monitoring

Install `streaming-servicemonitor.yaml` only after the Prometheus Operator CRD
exists. The alerts use MediaMTX's exported path/read/byte/error metrics and
rclone's transfer metrics. MediaMTX does not export recording-write failure
metrics; recording coverage therefore relies on uploader errors, uploader
availability, persistent-volume free space, and log alerts from MediaMTX.
Route "no ingest" only during scheduled live windows to avoid expected idle
periods paging operators.
