#!/usr/bin/env bash
# Roll back to the previous Docker image.
# Usage: bash /home/ubuntu/taruni-portfolio/infra/scripts/rollback.sh
set -euo pipefail

ENV_FILE="/home/ubuntu/taruni-portfolio.env"
IMAGE="taruni-portfolio-backend"
DATA_DIR="/data"

if ! docker image inspect "${IMAGE}:previous" > /dev/null 2>&1; then
  echo "[rollback] ERROR: No previous image found. Nothing to roll back to."
  exit 1
fi

echo "[rollback] Stopping current container..."
docker stop taruni-portfolio-backend 2>/dev/null || true
docker rm   taruni-portfolio-backend 2>/dev/null || true

echo "[rollback] Starting previous image..."
docker run -d \
  --name taruni-portfolio-backend \
  --restart unless-stopped \
  --env-file "$ENV_FILE" \
  -v "${DATA_DIR}:/data" \
  -p 8000:8000 \
  --log-driver json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  "${IMAGE}:previous"

sleep 10
if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
  echo "[rollback] Previous version is live and healthy."
else
  echo "[rollback] WARNING: Previous version also failed health check."
  echo "  Check logs: docker logs taruni-portfolio-backend --tail 50"
fi
