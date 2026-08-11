# D74-B: Daily Database Backup → rclone → Google Drive

## Overview

Standalone Linux cron job on EC2 that runs `pg_dump` inside the `kandes-app`
container, then uploads the compressed dump to your personal Google Drive via
`rclone`. Independent of Next.js / Docker — works even if the app is down.

## Architecture

```
┌─────────────── EC2 (every day 03:30 UTC) ─────────────────┐
│ /etc/cron.d/kandes-db-backup                              │
│   └─→ bash /opt/kandes/scripts/backup-db-rclone.sh        │
│         ├─ docker exec kandes-app pg_dump → .sql.gz        │
│         ├─ rclone copy → gdrive:kandes-db-backups/        │
│         └─ find … -mtime +14 -delete (prune local)        │
└────────────────────────────────────────────────────────────┘
```

## Prerequisites

- EC2 AL2023 (Amazon Linux 2023) — what kandes-prod runs.
- `rclone ≥ 1.60` installed (`yum install rclone` — already installed by
  `scripts/aws/setup-rclone-backup.ps1`).
- Google Drive remote named `gdrive` configured via `rclone config`.

## Setup (one-time)

```bash
# 1. SSH to EC2
ssh -i kandes-prod-key.pem ec2-user@13.215.39.207

# 2. Run interactive OAuth setup (browser-based)
rclone config
# → New remote → name "gdrive" → type "drive" → use web browser auth

# 3. Verify
rclone ls gdrive:
# (should list your Drive folders)

# 4. Test backup manually
sudo bash /opt/kandes/scripts/backup-db-rclone.sh

# 5. Check Drive
# Visit drive.google.com → look for "kandes-db-backups" folder
```

## Files

| File | Purpose |
| --- | --- |
| `scripts/aws/backup-db-rclone.sh` | Backup script: pg_dump + rclone + prune |
| `scripts/aws/kandes-db-backup.cron` | crontab snippet for `/etc/cron.d/` |
| `setup-gdrive-interactive.ps1` | Local helper to launch interactive SSH + rclone config |

## Configuration overrides

Environment variables (set in `/opt/kandes/scripts/backup-db-rclone.sh`
or via systemd drop-in):

| Var | Default | Meaning |
| --- | --- | --- |
| `RCLONE_REMOTE` | `gdrive` | rclone remote name |
| `RCLONE_DEST` | `kandes-db-backups` | folder on the remote |
| `LOCAL_RETENTION_DAYS` | `14` | days to keep local `.sql.gz` |

## Restore from Google Drive

```bash
# 1. List available backups
rclone ls gdrive:kandes-db-backups/

# 2. Download latest
rclone copy gdrive:kandes-db-backups/ /tmp/kandes-restore/

# 3. Restore (e.g. into a temp container)
docker run --rm -v /tmp/kandes-restore:/restore postgres:16-alpine \
  pg_restore -d postgresql://user:pass@host/db /restore/kandes-YYYYMMDD-HHMMSS.sql.gz
```

## Logs

- `/var/log/kandes-db-backup.log` — cron stdout/stderr (appended)
- `/opt/kandes/backups/rclone.log` — rclone details
- `/opt/kandes/backups/backup-error.log` — pg_dump errors

## Cost

- `rclone` + Google Drive: $0 (uses your existing Drive storage quota).
- Cron: $0 (free Linux cron).
- Local disk for 14 days × ~20 MB = ~280 MB (well within EC2 free tier).

## Differences vs Next.js `db-backup` cron

| | Next.js cron (D74) | This script (D74-B) |
| --- | --- | --- |
| Runs on | Next.js container | EC2 host (OS-level cron) |
| Trigger | EventBridge → Lambda → HTTPS | `/etc/cron.d/kandes-db-backup` |
| Output | AWS S3 (requires bucket) | Google Drive (free) |
| Auth | `CRON_SECRET` | `rclone` OAuth token |
| Failure notify | via notification module | (none — check logs) |