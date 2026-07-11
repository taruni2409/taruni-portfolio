#!/usr/bin/env bash
# Backup analytics.db and content.db to S3. Keeps 7 days of history.
# Usage: bash /home/ubuntu/itsjaya/infra/scripts/backup.sh
# Cron:  0 2 * * * /bin/bash /home/ubuntu/itsjaya/infra/scripts/backup.sh >> /data/logs/backup.log 2>&1
set -euo pipefail

S3_BUCKET="${ITSJAYA_BACKUP_BUCKET:-itsjaya-backups}"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
CUTOFF=$(date -d '7 days ago' +%Y-%m-%d 2>/dev/null || date -v -7d +%Y-%m-%d)

# ── Helper: backup one DB file to a given S3 prefix ──────────────────────────
backup_db() {
  local db_path="$1"
  local s3_prefix="$2"
  local latest_name="$3"

  if [ ! -f "$db_path" ]; then
    echo "[backup] WARN: $db_path not found — skipping."
    return
  fi

  local db_file
  db_file=$(basename "$db_path")
  echo "[backup] Uploading $db_file ..."
  aws s3 cp "$db_path" "s3://${S3_BUCKET}/${s3_prefix}/${TIMESTAMP}_${db_file}"
  aws s3 cp "$db_path" "s3://${S3_BUCKET}/${s3_prefix}/${latest_name}"
  echo "[backup] $db_file upload complete."

  echo "[backup] Pruning ${s3_prefix} backups older than $CUTOFF..."
  aws s3 ls "s3://${S3_BUCKET}/${s3_prefix}/" | while read -r line; do
    local file_date file_name
    file_date=$(echo "$line" | awk '{print $1}')
    file_name=$(echo "$line" | awk '{print $4}')
    if [[ "$file_name" == "$latest_name" ]]; then continue; fi
    if [[ "$file_date" < "$CUTOFF" ]]; then
      echo "[backup] Removing: ${s3_prefix}/${file_name}"
      aws s3 rm "s3://${S3_BUCKET}/${s3_prefix}/${file_name}"
    fi
  done
}

# ── Backup both databases ─────────────────────────────────────────────────────
backup_db "/data/analytics.db" "analytics_db" "latest_analytics.db"
backup_db "/data/content.db"   "content_db"   "latest_content.db"

echo "[backup] Done."
