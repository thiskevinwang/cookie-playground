#!/bin/sh

# Ensure host.docker.internal resolves on platforms where it doesn't by default
HOST_DOMAIN="host.docker.internal"

# If we can't reach the host domain, try to add a mapping to the default gateway
if ! ping -c 1 "$HOST_DOMAIN" >/dev/null 2>&1; then
  HOST_IP=$(ip route 2>/dev/null | awk 'NR==1 {print $3}')
  # Fallback if `ip` isn't available
  [ -z "$HOST_IP" ] && HOST_IP=$(route -n 2>/dev/null | awk '/^0.0.0.0/ {print $2; exit}')
  if [ -n "$HOST_IP" ]; then
    printf '%s\t%s\n' "$HOST_IP" "$HOST_DOMAIN" >> /etc/hosts
  fi
fi

exec /docker-entrypoint.sh "$@"
