#!/bin/bash
# =============================================================================
# Kandes.shop - Sync install scripts to /opt/kandes/install/
# D74-fix: Persist install/ directory on host so docker-compose can mount it
# into nginx container.
#
# Run on EC2 (after `git pull` or after first setup):
#   sudo bash /opt/kandes/sync-install-scripts.sh
#
# What it does:
#   1. Ensures /opt/kandes/install/ exists with safe permissions (0755, root)
#   2. Copies scripts from the running `kandes-app` container's /app/public/install/
#      to host (this works even when repo isn't on host — image is source of truth)
#   3. Alternative: also syncs from local ./public/install/ if present (e.g. when
#      running from a freshly cloned repo)
#   4. Restarts kandes-nginx to pick up the new files
#   5. Smoke-tests https://kandes.shop/install/codex/codex-config-kandes.sh
#
# Idempotent: safe to run multiple times.
# =============================================================================

set -euo pipefail

readonly HOST_INSTALL_DIR="/opt/kandes/install"
readonly APP_CONTAINER="kandes-app"
readonly NGINX_CONTAINER="kandes-nginx"
readonly LOG_PREFIX="[sync-install]"

log() { printf '%s %s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$LOG_PREFIX" "$*"; }
die() { printf '%s %s ERROR: %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$LOG_PREFIX" "$*" >&2; exit 1; }

# -----------------------------------------------------------------------------
# Preflight checks
# -----------------------------------------------------------------------------
[ "$(id -u)" -eq 0 ] || die "Must run as root (sudo bash $0)"
command -v docker >/dev/null 2>&1 || die "docker not found in PATH"

if ! docker ps --format '{{.Names}}' | grep -q "^${APP_CONTAINER}$"; then
    die "Container ${APP_CONTAINER} is not running. Start it first: cd /opt/kandes && docker compose up -d app"
fi

# -----------------------------------------------------------------------------
# Step 1: Prepare host directory
# -----------------------------------------------------------------------------
log "Preparing ${HOST_INSTALL_DIR} on host..."
mkdir -p "${HOST_INSTALL_DIR}"
chmod 0755 "${HOST_INSTALL_DIR}"

# -----------------------------------------------------------------------------
# Step 2: Sync from running app container (source of truth in production)
# -----------------------------------------------------------------------------
log "Extracting /app/public/install/ from ${APP_CONTAINER} container..."
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

if docker cp "${APP_CONTAINER}:/app/public/install/." "${TMP_DIR}/" 2>/dev/null; then
    log "  ✓ Extracted $(find "$TMP_DIR" -type f | wc -l) files from container"
else
    log "  ! docker cp failed (container may not have install/ yet), will try local repo"
fi

# -----------------------------------------------------------------------------
# Step 3: Optionally overlay from local repo if present (dev workflow)
# -----------------------------------------------------------------------------
LOCAL_REPO_INSTALL="/opt/kandes/repo/public/install"
if [ -d "$LOCAL_REPO_INSTALL" ]; then
    log "Found local repo at ${LOCAL_REPO_INSTALL}, overlaying newer files..."
    if command -v rsync >/dev/null 2>&1; then
        rsync -a --update "${LOCAL_REPO_INSTALL}/" "${TMP_DIR}/"
    else
        cp -ru "${LOCAL_REPO_INSTALL}/." "${TMP_DIR}/"
    fi
fi

# -----------------------------------------------------------------------------
# Step 4: Write to host dir
# -----------------------------------------------------------------------------
if [ -z "$(ls -A "$TMP_DIR" 2>/dev/null)" ]; then
    die "No install scripts found in container or local repo. Aborting."
fi

log "Syncing to ${HOST_INSTALL_DIR}..."
cp -a "${TMP_DIR}/." "${HOST_INSTALL_DIR}/"
chmod -R u+rwX,go+rX "${HOST_INSTALL_DIR}"

# -----------------------------------------------------------------------------
# Step 5: Restart nginx (only nginx, NOT app) to pick up new files
# -----------------------------------------------------------------------------
if docker ps --format '{{.Names}}' | grep -q "^${NGINX_CONTAINER}$"; then
    log "Reloading ${NGINX_CONTAINER}..."
    docker exec "${NGINX_CONTAINER}" nginx -t
    docker exec "${NGINX_CONTAINER}" nginx -s reload
else
    log "${NGINX_CONTAINER} not running yet — files are in place, will be picked up on next start"
fi

# -----------------------------------------------------------------------------
# Step 6: Smoke test
# -----------------------------------------------------------------------------
sleep 2
log "Smoke test: GET /install/codex/codex-config-kandes.sh"
HTTP_CODE=$(curl -sk -o /dev/null -w "%{http_code}" "https://kandes.shop/install/codex/codex-config-kandes.sh" || echo "000")

case "$HTTP_CODE" in
    200)
        log "✅ SUCCESS: ${HTTP_CODE} — install scripts are now served correctly"
        log "   User can run: curl -fsSL https://kandes.shop/install/codex/codex-config-kandes.sh | bash"
        ;;
    *)
        log "❌ FAILED: HTTP ${HTTP_CODE} — check nginx logs:"
        log "   docker logs ${NGINX_CONTAINER} --tail 20"
        exit 1
        ;;
esac

log "Done."
