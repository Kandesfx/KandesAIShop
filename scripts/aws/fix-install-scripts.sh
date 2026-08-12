#!/bin/bash
# =============================================================================
# Fix Nginx MIME types for install scripts
# Run on EC2: sudo bash /opt/kandes/fix-install-scripts.sh
# =============================================================================

set -euo pipefail

LOG_FILE="/var/log/nginx/fix-install-scripts.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log "Starting fix for install scripts MIME types..."

NGINX_CONF="/opt/kandes/nginx.conf"

# Backup original
if [ ! -f "${NGINX_CONF}.bak" ]; then
    cp "$NGINX_CONF" "${NGINX_CONF}.bak"
    log "Backed up nginx.conf to ${NGINX_CONF}.bak"
fi

# Check if fix already applied
if grep -q "text/x-shellscript.*sh" "$NGINX_CONF" 2>/dev/null; then
    log "MIME types already fixed, skipping..."
    exit 0
fi

# Add MIME types for shell scripts to gzip_types section
# These MIME types tell Nginx to serve .sh, .ps1, .bat files correctly
log "Adding MIME types for shell scripts..."

# Use sed to add new MIME types after gzip_types block
sed -i '/gzip_types/,/;/ {
    /application\/javascript/a\        application/x-shellscript sh;\n        application/x-powershell-script ps1;\n        application/x-batch-script bat cmd;
}' "$NGINX_CONF"

# Also add a specific location block for /install/ to ensure proper content-type
# This bypasses Next.js for static script files
if ! grep -q "location /install/" "$NGINX_CONF" 2>/dev/null; then
    log "Adding /install/ location block..."
    
    # Find the line after "location /" and add our block before it
    sed -i '/^[[:space:]]*location \/ {$/i\
    # Serve install scripts with correct MIME types\
    location /install/ {\
        alias /app/public/install/;\
        default_type text/plain;\
        add_header Content-Type "text/plain; charset=utf-8";\
        add_header Cache-Control "no-cache, no-store, must-revalidate";\
    }\
' "$NGINX_CONF"
fi

# Test nginx config
log "Testing nginx configuration..."
if nginx -t 2>&1 | tee -a "$LOG_FILE"; then
    log "Nginx config test passed"
    
    # Reload nginx
    log "Reloading nginx..."
    nginx -s reload
    
    log "Fix applied successfully!"
    log "Test with: curl -I https://kandes.shop/install/codex/codex-config-kandes.sh"
else
    log "ERROR: Nginx config test failed!"
    log "Restoring backup..."
    cp "${NGINX_CONF}.bak" "$NGINX_CONF"
    nginx -t
    exit 1
fi
