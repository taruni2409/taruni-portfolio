#!/usr/bin/env bash
# Zero-downtime blue-green deploy for itsjaya-backend.
# Called by GitHub Actions after git pull — do not run this before pulling.
set -euo pipefail

ENV_FILE="/home/ubuntu/itsjaya.env"
IMAGE="itsjaya-backend"
GHCR_IMAGE="ghcr.io/sabarishreddy99/itsjaya-backend"
DATA_DIR="/data"
S3_BUCKET="${ITSJAYA_BACKUP_BUCKET:-itsjaya-backups-analytics}"

# ── 0. Restore databases from S3 if missing ──────────────────────────────────
mkdir -p "$DATA_DIR"

if [ ! -f "${DATA_DIR}/analytics.db" ]; then
  echo "[deploy] analytics.db not found — restoring from S3..."
  if aws s3 cp "s3://${S3_BUCKET}/analytics_db/latest_analytics.db" "${DATA_DIR}/analytics.db" 2>/dev/null; then
    echo "[deploy] analytics.db restored from S3."
  else
    echo "[deploy] No analytics.db backup in S3 — starting fresh."
  fi
fi

if [ ! -f "${DATA_DIR}/content.db" ]; then
  echo "[deploy] content.db not found — restoring from S3..."
  if aws s3 cp "s3://${S3_BUCKET}/content_db/latest_content.db" "${DATA_DIR}/content.db" 2>/dev/null; then
    echo "[deploy] content.db restored from S3."
  else
    echo "[deploy] No content.db backup in S3 — will be seeded from JSON on first startup."
  fi
fi

# ── 1. Tag current image as :previous for rollback ───────────────────────────
docker tag "${IMAGE}:latest" "${IMAGE}:previous" 2>/dev/null || true

# ── 2. Pull pre-built image from GHCR (built on GitHub Actions, not here) ────
echo "[deploy] Pulling image from GHCR..."
if [ -n "${GHCR_TOKEN:-}" ] && [ -n "${GHCR_USER:-}" ]; then
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
fi
docker pull "${GHCR_IMAGE}:latest"
docker tag  "${GHCR_IMAGE}:latest" "${IMAGE}:latest"
echo "[deploy] Pull complete."

# ── 3. Start new container on staging port 8001 ───────────────────────────────
docker rm -f itsjaya-backend-new 2>/dev/null || true

docker run -d \
  --name itsjaya-backend-new \
  --restart no \
  --env-file "$ENV_FILE" \
  -v "${DATA_DIR}:/data" \
  -p 8001:8000 \
  --log-driver json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  "${IMAGE}:latest"

# ── 4. Health check — up to 180s for ingest + ONNX model warmup ──────────────
echo "[deploy] Waiting for new container to pass health check..."
HEALTHY=0
for i in $(seq 1 36); do
  if curl -sf http://localhost:8001/health > /dev/null 2>&1; then
    HEALTHY=1
    echo "[deploy] Health check passed after $((i * 5))s."
    break
  fi
  echo "[deploy] Attempt $i/36 — not ready, waiting 5s..."
  sleep 5
done

if [ "$HEALTHY" -eq 0 ]; then
  echo "[deploy] ERROR: New container failed health check. Old container still running."
  docker rm -f itsjaya-backend-new || true
  exit 1
fi

# ── 5. Swap — stop old, start new on port 8000 ───────────────────────────────
docker stop itsjaya-backend 2>/dev/null || true
docker rm   itsjaya-backend 2>/dev/null || true
docker rm -f itsjaya-backend-new

docker run -d \
  --name itsjaya-backend \
  --restart unless-stopped \
  --env-file "$ENV_FILE" \
  -v "${DATA_DIR}:/data" \
  -p 8000:8000 \
  --log-driver json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  "${IMAGE}:latest"

# ── 6. Prune dangling images, keep :previous ─────────────────────────────────
docker image prune -f
echo "[deploy] Deploy complete."
