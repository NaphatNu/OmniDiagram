#!/usr/bin/env bash
# Pulls the latest images and restarts the compose stack. Run from the
# compose root (where docker-compose.yml and the server's .env live) —
# either by hand or via .github/workflows/deploy.yml.
set -euo pipefail

cd "$(dirname "$0")"

docker compose pull
docker compose up -d
# caddy's image/config in compose never changes, so `up -d` won't recreate
# it just because Caddyfile's *content* changed on disk -- and a single-file
# bind mount doesn't follow the new inode `git checkout` leaves behind, so
# the running container would keep serving a stale config indefinitely.
docker compose restart caddy

echo "Waiting for backend health check..."
for i in $(seq 1 30); do
  if docker compose exec -T backend wget -qO- http://localhost:8080/actuator/health > /dev/null 2>&1; then
    echo "Backend is healthy"
    docker image prune -f
    exit 0
  fi
  sleep 2
done

echo "Backend failed health check after 60s" >&2
docker compose logs backend
exit 1
