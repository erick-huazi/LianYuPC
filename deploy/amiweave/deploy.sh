#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ROOT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)
COMPOSE_FILE="$SCRIPT_DIR/compose.yml"

if [ ! -f "$ROOT_DIR/.env" ]; then
  echo "Missing $ROOT_DIR/.env" >&2
  exit 1
fi

docker compose \
  --project-name amiweave \
  --env-file "$ROOT_DIR/.env" \
  -f "$COMPOSE_FILE" \
  config --quiet

if [ "${AMIWEAVE_SKIP_BUILD:-0}" = "1" ]; then
  docker compose \
    --project-name amiweave \
    --env-file "$ROOT_DIR/.env" \
    -f "$COMPOSE_FILE" \
    up -d --no-build
else
  docker compose \
    --project-name amiweave \
    --env-file "$ROOT_DIR/.env" \
    -f "$COMPOSE_FILE" \
    up -d --build
fi

docker compose \
  --project-name amiweave \
  --env-file "$ROOT_DIR/.env" \
  -f "$COMPOSE_FILE" \
  ps
