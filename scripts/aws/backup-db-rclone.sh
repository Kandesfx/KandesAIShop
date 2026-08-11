#!/bin/bash
# ============================================================================
# D74-B: Daily database backup → rclone → Google Drive
# Runs as a Linux cron job on EC2 (independent of Next.js container).
#
# Flow:
#   1. docker exec kandes-app pg_dump → local .sql.gz file in /opt/kandes/backups/
#   2. rclone copy → Google Drive remote `gdrive:kandes-db-backups/`
#   3. Prune local backups older than 14 days (offline safety)
#   4. (Optional) notify admin via Telegram on failure
#
# Setup prerequisites:
#   - rclone installed (`sudo dnf install rclone` on AL2023)
#   - rclone remote configured: `rclone config` → name = `gdrive`
#   - Run as root via /etc/cron.d/kandes-db-backup
# ============================================================================

set -uo pipefail

BACKUP_DIR=/opt/kandes/backups
RCLONE_REMOTE="${RCLONE_REMOTE:-gdrive}"
RCLONE_DEST="${RCLONE_DEST:-kandes-db-backups}"
LOCAL_RETENTION_DAYS="${LOCAL_RETENTION_DAYS:-14}"
TIMESTAMP=$(date -u +%Y%m%d-%H%M%S)
FILENAME="kandes-${TIMESTAMP}.sql.gz"
LOCAL_PATH="${BACKUP_DIR}/${FILENAME}"

mkdir -p "$BACKUP_DIR"

echo "[$(date -u +%FT%TZ)] db-backup start"

# 1. Extract DB credentials from .env.production (mounted symlink).
DB_URL=$(grep '^DATABASE_URL=' /opt/kandes/.env.production | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
if [[ -z "$DB_URL" ]]; then
  echo "ERROR: DATABASE_URL not found in /opt/kandes/.env.production"
  exit 1
fi

# 2. Run pg_dump inside the kandes-app container (it has postgresql-client).
if ! docker exec kandes-app pg_dump \
     --dbname "$DB_URL" \
     --format=custom \
     --compress=6 \
     --no-owner \
     --no-privileges \
     > "$LOCAL_PATH" 2>>/opt/kandes/backups/backup-error.log; then
  echo "ERROR: pg_dump failed"
  exit 1
fi

# 3. Get size + verify.
SIZE=$(stat -c%s "$LOCAL_PATH" 2>/dev/null || stat -f%z "$LOCAL_PATH")
echo "pg_dump OK: ${LOCAL_PATH} (${SIZE} bytes)"

# 4. Upload to Google Drive via rclone.
if command -v rclone >/dev/null 2>&1; then
  if rclone copy "$LOCAL_PATH" "${RCLONE_REMOTE}:${RCLONE_DEST}/" --log-file=/opt/kandes/backups/rclone.log --log-level INFO; then
    echo "rclone copy OK: ${RCLONE_REMOTE}:${RCLONE_DEST}/${FILENAME}"
  else
    echo "ERROR: rclone copy failed (see /opt/kandes/backups/rclone.log)"
    exit 1
  fi
else
  echo "WARN: rclone not installed, skipping Google Drive upload"
fi

# 5. Prune local backups older than retention.
find "$BACKUP_DIR" -name "kandes-*.sql.gz" -mtime +"$LOCAL_RETENTION_DAYS" -delete -print | while read f; do
  echo "pruned local: $f"
done

echo "[$(date -u +%FT%TZ)] db-backup done"