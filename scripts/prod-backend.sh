#!/usr/bin/env bash
# Production launcher: one worker, loopback only, behind `tailscale serve`.
#
# --no-proxy-headers is required. uvicorn trusts X-Forwarded-For from 127.0.0.1 by default,
# and Tailscale Serve sets it to the phone's tailnet address, which would make the app's
# loopback check reject every owner request. Never widen FORWARDED_ALLOW_IPS.
set -euo pipefail

if [[ "${APP_ENV:-}" != "production" || "${AUTH_MODE:-}" != "tailscale" ]]; then
  echo "prod-backend.sh requires APP_ENV=production and AUTH_MODE=tailscale in the environment." >&2
  exit 1
fi

exec uvicorn backend.app.main:create_app --factory \
  --host 127.0.0.1 \
  --port "${PORT:-8000}" \
  --workers 1 \
  --no-proxy-headers
