#!/bin/sh
set -eu

: "${RECORDING_S3_BUCKET:?RECORDING_S3_BUCKET is required}"
: "${UPLOAD_INTERVAL_SECONDS:=30}"
: "${RECORDING_S3_PREFIX:=streams}"

case "${UPLOAD_INTERVAL_SECONDS}" in
  *[!0-9]* | 0)
    echo "UPLOAD_INTERVAL_SECONDS must be a positive integer" >&2
    exit 64
    ;;
esac

rc_url=http://127.0.0.1:5572
rclone rcd \
  --rc-addr=0.0.0.0:5572 \
  --rc-no-auth \
  --rc-enable-metrics \
  --log-level=INFO &
rcd_pid=$!

shutdown() {
  kill "${rcd_pid}" 2>/dev/null || true
  wait "${rcd_pid}" 2>/dev/null || true
}
trap shutdown EXIT INT TERM

until rclone rc --url "${rc_url}" core/version >/dev/null 2>&1; do
  if ! kill -0 "${rcd_pid}" 2>/dev/null; then
    wait "${rcd_pid}"
    exit $?
  fi
  sleep 1
done

while kill -0 "${rcd_pid}" 2>/dev/null; do
  if ! rclone rc \
    --url "${rc_url}" \
    sync/copy \
    srcFs=/recordings \
    dstFs="recordings:${RECORDING_S3_BUCKET}/${RECORDING_S3_PREFIX}" \
    '_filter={"MinAge":"2m"}'; then
    echo "recording upload pass failed; files remain on persistent storage" >&2
  fi
  sleep "${UPLOAD_INTERVAL_SECONDS}"
done

wait "${rcd_pid}"
