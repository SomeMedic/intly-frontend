#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE=${COMPOSE_FILE:-compose.yaml}
SERVICE_NAME=${SERVICE_NAME:-frontend}
HEALTH_URL=${HEALTH_URL:-http://127.0.0.1:3000/}
HEALTH_TIMEOUT_SECONDS=${HEALTH_TIMEOUT_SECONDS:-90}
INTLY_FRONTEND_ENV_FILE=${INTLY_FRONTEND_ENV_FILE:-.env.production}
IMAGE_REF=${IMAGE_REF:-${INTLY_FRONTEND_IMAGE:-}}

if [[ -z "$IMAGE_REF" ]]; then
  echo "IMAGE_REF or INTLY_FRONTEND_IMAGE is required" >&2
  exit 2
fi

if [[ "$IMAGE_REF" == *":latest" ]]; then
  echo "Refusing latest-only image tag; use sha-<40-hex-commit> or @sha256:<64-hex-digest>" >&2
  exit 2
fi

if [[ ! "$IMAGE_REF" =~ :sha-[0-9a-fA-F]{40}$ && ! "$IMAGE_REF" =~ @sha256:[0-9a-fA-F]{64}$ ]]; then
  echo "Refusing mutable image ref: $IMAGE_REF" >&2
  echo "Expected an immutable ref such as ghcr.io/org/intly-frontend:sha-<40-hex-commit> or image@sha256:<64-hex-digest>." >&2
  exit 2
fi

if [[ ! "$HEALTH_TIMEOUT_SECONDS" =~ ^[1-9][0-9]*$ ]]; then
  echo "HEALTH_TIMEOUT_SECONDS must be a positive integer number of seconds" >&2
  exit 2
fi

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Compose file not found: $COMPOSE_FILE" >&2
  exit 2
fi

if [[ ! -f "$INTLY_FRONTEND_ENV_FILE" ]]; then
  echo "INTLY_FRONTEND_ENV_FILE not found: $INTLY_FRONTEND_ENV_FILE" >&2
  exit 2
fi

export INTLY_FRONTEND_IMAGE="$IMAGE_REF"
export INTLY_FRONTEND_ENV_FILE

docker compose --env-file "$INTLY_FRONTEND_ENV_FILE" -f "$COMPOSE_FILE" config --quiet
docker compose --env-file "$INTLY_FRONTEND_ENV_FILE" -f "$COMPOSE_FILE" pull "$SERVICE_NAME"
docker compose --env-file "$INTLY_FRONTEND_ENV_FILE" -f "$COMPOSE_FILE" up -d --no-build "$SERVICE_NAME"

deadline=$((SECONDS + HEALTH_TIMEOUT_SECONDS))
until curl --fail --silent --show-error --max-time 5 "$HEALTH_URL" >/dev/null; do
  if (( SECONDS >= deadline )); then
    echo "Frontend health check failed: $HEALTH_URL" >&2
    docker compose --env-file "$INTLY_FRONTEND_ENV_FILE" -f "$COMPOSE_FILE" ps "$SERVICE_NAME" >&2 || true
    exit 1
  fi
  sleep 3
done

echo "Frontend deployed and healthy at $HEALTH_URL"
