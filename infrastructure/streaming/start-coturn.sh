#!/bin/sh
set -eu

: "${TURN_REALM:?TURN_REALM is required}"
: "${TURN_USERNAME:?TURN_USERNAME is required}"
: "${TURN_SECRET:?TURN_SECRET is required}"
: "${TURN_PUBLIC_IP:?TURN_PUBLIC_IP is required}"

case "${TURN_REALM}" in
  *[!A-Za-z0-9.-]*)
    echo "TURN_REALM must contain only letters, digits, dots, and hyphens" >&2
    exit 64
    ;;
esac
case "${TURN_USERNAME}" in
  *[!A-Za-z0-9_.-]*)
    echo "TURN_USERNAME must be URL-safe" >&2
    exit 64
    ;;
esac
case "${TURN_SECRET}" in
  *[!A-Fa-f0-9]*)
    echo "TURN_SECRET must be a hexadecimal value" >&2
    exit 64
    ;;
esac
case "${TURN_PUBLIC_IP}" in
  *[!0-9.]*)
    echo "TURN_PUBLIC_IP must be an IPv4 address" >&2
    exit 64
    ;;
esac

runtime_config=/tmp/turnserver.runtime.conf
cp /etc/coturn/turnserver.conf "${runtime_config}"
{
  printf 'realm=%s\n' "${TURN_REALM}"
  printf 'user=%s:%s\n' "${TURN_USERNAME}" "${TURN_SECRET}"
  printf 'external-ip=%s\n' "${TURN_PUBLIC_IP}"
} >>"${runtime_config}"
chmod 600 "${runtime_config}"

exec /usr/bin/turnserver -c "${runtime_config}"
