# Local streaming media plane

This directory defines a local-first media plane using official MediaMTX,
Coturn, and rclone images. MediaMTX accepts RTMP, WHIP, and SRT publishers;
fans each path out to HLS, WHEP/WebRTC, and other readers; records fMP4
segments to persistent storage; and exposes an authenticated internal control
API plus Prometheus metrics.

MediaMTX does not write directly to S3-compatible object storage. The
`recording-uploader` process is a real worker boundary: MediaMTX writes
one-minute segments to the shared recording volume, while a persistent rclone
daemon copies only files older than two minutes to object storage. Failed
uploads leave source files in place and increment rclone error metrics.
Successful local segments remain available to MediaMTX playback until its
seven-day retention removes them.

## Required local configuration

Copy `infrastructure/.env.example` to `infrastructure/.env`, replace every
generated value, and set the streaming values to addresses reachable from the
publishing/viewing machine. In particular:

- `MEDIAMTX_WEBRTC_ADDITIONAL_HOSTS` is a comma-separated list of the host's
  LAN/public names or IP addresses advertised as WebRTC ICE candidates.
- `TURN_PUBLIC_HOST` is the name or IP browsers use for TURN.
- `TURN_PUBLIC_IP` is Coturn's externally reachable IPv4 address. NAT must
  preserve and forward UDP ports `49160-49200` one-to-one.
- `TURN_REALM`, `TURN_USERNAME`, and `TURN_SECRET` are mandatory. The local
  stack uses Coturn's WebRTC-compatible long-term credential mechanism.
  Use a DNS-style realm, a URL-safe username, and a hexadecimal secret.
- `MEDIAMTX_API_USERNAME` and `MEDIAMTX_API_PASSWORD` protect the internal
  control API. Port `9997` is not published to the host.
- `RECORDING_S3_*` configures the uploader. Local MinIO uses
  `http://minio:9000` and bucket `sylora-recordings`.

Publisher and viewer credentials are global local-development credentials.
Production should issue path-scoped short-lived credentials through
MediaMTX's HTTP or JWT authentication boundary instead of sharing them.

SYLORA conferences and live guests use a **contribution gallery** model:
each publisher gets an isolated WHIP path, and peers subscribe with WHEP to
those paths. This is intentionally not an SFU composite program feed.
Deployments that enforce the API-minted JWTs should validate `path` + `type`
claims (`*_whip_publish` / `*_whep_subscribe`) at the MediaMTX authHTTP or
JWT edge before accepting WHIP/WHEP sessions.

Start only the media plane and its local object storage:

```bash
docker compose \
  --env-file infrastructure/.env \
  -f infrastructure/compose/compose.yml \
  up -d minio minio-init mediamtx coturn recording-uploader
```

**Host mode (no Docker):** from the repo root:

```bash
./scripts/start-mediamtx-local.sh
./verify-live.sh
```

This downloads MediaMTX v1.19.3 into `.sylora-local/bin/`, writes API credentials to
`.sylora-local/mediamtx.env`, and sets `MEDIAMTX_CONTROL_*` in the gitignored API `.env`.
Restart the API after the first run so it loads the control URL.

Add `prometheus` and `grafana` with the `observability` profile when metrics
and dashboards are needed. These commands are documented procedures and were
not run in the Docker-unavailable implementation environment.

## OBS RTMP setup

In OBS Studio, open **Settings → Stream** and choose **Custom**:

- Server: `rtmp://127.0.0.1:1935`
- Stream key:
  `live/<opaque-stream-key>?user=<publisher>&pass=<publisher-password>`

The complete MediaMTX path is `live/<opaque-stream-key>`. Treat both the
opaque key and publisher password as secrets. MediaMTX requires RTMP
credentials in the query string; OBS's separate authentication checkbox is
not used for this server. Use URL-safe hex credentials or percent-encode query
values.

For broad browser compatibility, configure OBS for H.264 without B-frames and
AAC audio. A practical baseline is H.264 main or baseline profile, keyframes
every two seconds, `yuv420p`, and AAC-LC stereo. WebRTC readers commonly fail
with H.264 B-frames, and H.265 browser support remains platform dependent.

OBS can alternatively publish WHIP to:

```text
http://127.0.0.1:8889/live/<opaque-stream-key>/whip
```

For OBS's WHIP service, set **Bearer Token** to
`<publisher>:<publisher-password>`. Other WHIP clients can use HTTP Basic
authentication. RTMP remains the recommended OBS ingest path for this local
stack.

## Read and playback endpoints

For path `live/<opaque-stream-key>`:

| Purpose | Endpoint |
|---|---|
| LL-HLS | `http://127.0.0.1:8888/live/<opaque-stream-key>/index.m3u8` |
| Browser WebRTC page | `http://127.0.0.1:8889/live/<opaque-stream-key>` |
| WHEP | `http://127.0.0.1:8889/live/<opaque-stream-key>/whep` |
| Recording list | `http://127.0.0.1:9996/list?path=live%2F<opaque-stream-key>` |
| Recording download | `http://127.0.0.1:9996/get?path=live%2F<opaque-stream-key>&start=<url-encoded-rfc3339>&duration=60&format=mp4` |

Reader credentials use HTTP Basic authentication for HLS, WHEP, and playback.
The bundled browser page prompts when authentication is required.

Local signaling and HLS are intentionally plain HTTP because all Compose
ports bind to loopback. WebRTC media remains DTLS/SRTP encrypted after its
HTTP handshake. Production must terminate trusted HTTPS/WSS at an ingress or
load balancer, preserve upgrade/forwarding headers, and route a WebRTC or HLS
session consistently to one MediaMTX replica. RTMP/SRT and TURN stay on
Layer-4 listeners; an HTTP reverse proxy is not needed for this local stack.

## SRT

An authenticated SRT publisher can use:

```text
srt://127.0.0.1:8890?streamid=publish:live/STREAM_KEY:PUBLISHER:PASSWORD&pkt_size=1316
```

SRT stream IDs have a 512-character limit. Avoid credentials containing
characters that need ambiguous stream-ID escaping.

## Reconnect behavior

MediaMTX accepts a replacement publisher on the same path because
`overridePublisher` is enabled. OBS should use automatic reconnect with a
short initial retry delay and increasing backoff. Existing HLS/WebRTC readers
lose live media while the publisher is absent and must retry; the server does
not synthesize an offline stream. Completed recording segments survive a
publisher reconnect. At most the active one-second fMP4 part can be lost on a
process or host failure.

The `all_others` path rule supports multiple concurrent independent stream
paths. One ingest can have many HLS, WHEP, or SRT readers without duplicating
the publisher. Sending copies to third-party platforms requires
destination-authorized egress workers or explicit forwarding paths; this
foundation does not scrape platforms or claim that social multistream
delivery is configured.

## Suggested manual tests

These commands are operator procedures; they were not run in the
Docker-unavailable implementation environment.

Publish a generated H.264/AAC RTMP stream:

```bash
ffmpeg -re \
  -f lavfi -i testsrc2=size=1280x720:rate=30 \
  -f lavfi -i sine=frequency=1000:sample_rate=48000 \
  -c:v libx264 -preset veryfast -profile:v main -pix_fmt yuv420p \
  -g 60 -keyint_min 60 -bf 0 -c:a aac -b:a 128k \
  -f flv \
  "rtmp://127.0.0.1:1935/live/test?user=${STREAM_PUBLISH_USERNAME}&pass=${STREAM_PUBLISH_PASSWORD}"
```

Inspect HLS and recording playback:

```bash
ffprobe -v error \
  -show_entries stream=index,codec_name,codec_type \
  -of json \
  "http://127.0.0.1:8888/live/test/index.m3u8?user=${STREAM_READ_USERNAME}&pass=${STREAM_READ_PASSWORD}"

curl --fail --user "${STREAM_READ_USERNAME}:${STREAM_READ_PASSWORD}" \
  "http://127.0.0.1:9996/list?path=live%2Ftest"
```

Publish SRT with GStreamer when the required plugins are installed:

```bash
gst-launch-1.0 -v \
  videotestsrc is-live=true ! videoconvert ! \
  x264enc tune=zerolatency key-int-max=60 bframes=0 ! h264parse ! \
  mpegtsmux ! \
  srtsink uri="srt://127.0.0.1:8890?streamid=publish:live/gst:${STREAM_PUBLISH_USERNAME}:${STREAM_PUBLISH_PASSWORD}&pkt_size=1316"
```

Check internal metrics from the Prometheus container or Kubernetes monitoring
namespace, not from a public interface:

```bash
curl --fail http://mediamtx:9998/metrics
curl --fail http://coturn:9641/metrics
curl --fail http://recording-uploader:5572/metrics
```

TURN relay validation needs a client outside the server network and an actual
public/LAN address; a loopback-only test does not validate NAT traversal.
Use Coturn's `turnutils_uclient` with the injected realm/user/secret and verify
both allocation and relayed traffic.

## Production boundaries

See `infrastructure/kubernetes/overlays/production/STREAMING.md` for
load-balancer, static-IP, replica-routing, and storage constraints. See
`OBS_COMPANION.md` for the outbound local companion architecture required to
control OBS WebSocket 5.x safely.
