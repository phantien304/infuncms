#!/usr/bin/env bash
#
# Chạy TRÊN máy EC2 production (được deploy-production.yml đẩy qua SSH stdin):
#     bash -s -- <git_ref> <image_tag>
#
# Mirror ../infun/deploy/prod-deploy.sh, đơn giản hơn: infuncms không có
# DB/migration nên bỏ bước migrate + PRE_DEPLOY_HOOK backup.
#
# Cấu hình riêng của máy đặt ở /etc/infuncms-deploy.env (không commit):
#     APP_DIR=/srv/infuncms
#     COMPOSE_FILE=docker-compose.production.yml
#     HEALTH_URL=http://127.0.0.1:8200/__lb_health
set -euo pipefail

REF="${1:?thiếu git ref}"
IMAGE_TAG="${2:-production}"

[ -f /etc/infuncms-deploy.env ] && . /etc/infuncms-deploy.env
APP_DIR="${APP_DIR:-/srv/infuncms}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.production.yml}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:8200/__lb_health}"

log() { echo "[prod-deploy] $*"; }

cd "$APP_DIR"

log "Đồng bộ mã nguồn -> $REF"
git fetch --all --tags --prune
git checkout -f "$REF"

log "Kéo image tag :$IMAGE_TAG"
docker compose -f "$COMPOSE_FILE" pull infuncms-web

log "Recreate container"
docker compose -f "$COMPOSE_FILE" up -d --no-build infuncms-web

log "Health check $HEALTH_URL"
ok=0
for i in $(seq 1 10); do
  code="$(curl -s -o /dev/null -w '%{http_code}' "$HEALTH_URL" || true)"
  if [ "$code" = "200" ]; then log "health OK (HTTP 200)"; ok=1; break; fi
  log "health HTTP $code — thử lại lần $i/10"; sleep 3
done
[ "$ok" = "1" ] || { log "❌ HEALTH CHECK THẤT BẠI — cần rollback"; exit 1; }

docker image prune -f
log "✅ Deploy production hoàn tất ($REF)"
