#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ROOT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)
COMPOSE_FILE="$SCRIPT_DIR/compose.yml"
INFRA_SERVICES="mysql redis rabbitmq minio"

if [ ! -f "$ROOT_DIR/.env" ]; then
  echo "Missing $ROOT_DIR/.env" >&2
  exit 1
fi

case "${AMIWEAVE_SKIP_BUILD:-0}" in
  0|1) ;;
  *) echo "AMIWEAVE_SKIP_BUILD must be 0 or 1" >&2; exit 2 ;;
esac

case "${AMIWEAVE_REFRESH_INFRA:-0}" in
  0|1) ;;
  *) echo "AMIWEAVE_REFRESH_INFRA must be 0 or 1" >&2; exit 2 ;;
esac

compose() {
  docker compose \
    --project-name amiweave \
    --env-file "$ROOT_DIR/.env" \
    -f "$COMPOSE_FILE" \
    "$@"
}

wait_healthy() {
  service="$1"
  timeout="$2"
  deadline=$(( $(date +%s) + timeout ))

  while [ "$(date +%s)" -lt "$deadline" ]; do
    container_id=$(compose ps -a -q "$service")
    if [ -n "$container_id" ]; then
      status=$(docker inspect \
        --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' \
        "$container_id" 2>/dev/null || true)
      case "$status" in
        healthy|running) return 0 ;;
        unhealthy|exited|dead)
          echo "$service entered state: $status" >&2
          compose logs --no-color --tail=100 "$service" >&2 || true
          return 1
          ;;
      esac
    fi
    sleep 3
  done

  echo "Timed out waiting for $service to become healthy" >&2
  compose logs --no-color --tail=100 "$service" >&2 || true
  return 1
}

compose config --quiet

infra_targets=""
for service in $INFRA_SERVICES; do
  if [ "${AMIWEAVE_REFRESH_INFRA:-0}" = "1" ] || [ -z "$(compose ps -a -q "$service")" ]; then
    infra_targets="$infra_targets $service"
  fi
done

if [ -n "$infra_targets" ]; then
  # Intentional word splitting: targets are fixed service names from INFRA_SERVICES.
  compose up -d --no-build $infra_targets
fi

for service in $INFRA_SERVICES; do
  wait_healthy "$service" 180
done

if [ "${AMIWEAVE_SKIP_BUILD:-0}" != "1" ]; then
  compose build backend
fi

compose up -d --no-build --no-deps backend
wait_healthy backend 240

compose up -d --no-build --no-deps gateway
wait_healthy gateway 60

compose ps
