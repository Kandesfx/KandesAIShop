#!/bin/bash
# =============================================================================
# Fix Nginx MIME types for install scripts
# Run on EC2: sudo bash /opt/kandes/fix-install-scripts.sh
# =============================================================================

set -euo pipefail

NGINX_CONTAINER="kandes-nginx"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

log "Starting fix for install scripts MIME types..."

NGINX_CONF="/opt/kandes/nginx.conf"

# Backup original
if [ ! -f "${NGINX_CONF}.bak" ]; then
    cp "$NGINX_CONF" "${NGINX_CONF}.bak"
    log "Backed up nginx.conf to ${NGINX_CONF}.bak"
fi

# Check if fix already applied
if grep -q "# Install scripts location" "$NGINX_CONF" 2>/dev/null; then
    log "Fix already applied, checking if reload needed..."
    docker exec "$NGINX_CONTAINER" nginx -t 2>/dev/null && log "Config already correct" || log "Need to reload"
    exit 0
fi

log "Adding /install/ location block to nginx.conf..."

# Create the new nginx config with install scripts location
# Insert before the main location / block
cat > /tmp/nginx_new.conf << 'NGINX_EOF'
# ============================================================================
# Kandes.shop - Nginx config (D66 + D65 fix)
# ============================================================================

user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    charset       utf-8;

    log_format main '$remote_addr - $remote_user [$time_local] '
                    '"$request" $status $body_bytes_sent '
                    '"$http_referer" "$http_user_agent" '
                    'rt=$request_time';

    access_log /var/log/nginx/access.log main;

    sendfile        on;
    tcp_nopush      on;
    tcp_nodelay     on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;

    client_max_body_size 10m;
    client_body_timeout 60s;
    client_header_timeout 60s;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        application/vnd.ms-fontobject
        application/x-font-ttf
        font/opentype
        image/svg+xml
        image/x-icon
        application/x-shellscript
        application/x-powershell-script;

    upstream kandes_app {
        server kandes-app:3000;
        keepalive 32;
    }

    proxy_http_version 1.1;
    proxy_set_header Connection          "";
    proxy_set_header Host                $host;
    proxy_set_header X-Real-IP           $remote_addr;
    proxy_set_header X-Forwarded-For     $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto   $scheme;
    proxy_set_header X-Forwarded-Host    $host;
    proxy_set_header X-Forwarded-Port    $server_port;
    proxy_buffering off;
    proxy_request_buffering off;
    proxy_read_timeout 300s;
    proxy_send_timeout 300s;

    # HTTP -> HTTPS redirect
    server {
        listen 80 default_server;
        listen [::]:80 default_server;
        server_name _;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }

    # HTTPS server
    server {
        listen 443 ssl;
        listen [::]:443 ssl;
        http2 on;
        server_name kandes.shop api.kandes.shop www.kandes.shop;

        ssl_certificate     /etc/nginx/certs/fullchain.pem;
        ssl_certificate_key /etc/nginx/certs/privkey.pem;

        ssl_protocols       TLSv1.2 TLSv1.3;
        ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 1d;
        ssl_session_tickets off;
        ssl_stapling on;
        ssl_stapling_verify on;

        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        # Install scripts location - serve directly without Next.js
        # Install scripts location
        location /install/ {
            alias /usr/share/nginx/html/install/;
            default_type text/plain;
            add_header Content-Type "text/plain; charset=utf-8" always;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
            autoindex off;
        }

        location /api/health {
            proxy_pass http://kandes_app;
            access_log off;
        }

        location /_next/static {
            proxy_pass http://kandes_app;
            proxy_cache_valid 200 365d;
            expires 1y;
            add_header Cache-Control "public, immutable, max-age=31536000";
            access_log off;
        }

        location ~* \.(?:ico|css|js|gif|jpe?g|png|webp|svg|woff2?|ttf|eot)$ {
            proxy_pass http://kandes_app;
            expires 30d;
            add_header Cache-Control "public, max-age=2592000";
            access_log off;
        }

        location / {
            proxy_pass http://kandes_app;
        }

        location ~* ^/api/(chat|stream|completions) {
            proxy_pass http://kandes_app;
            proxy_buffering off;
            proxy_cache off;
            proxy_set_header Connection '';
            proxy_http_version 1.1;
            chunked_transfer_encoding off;
        }
    }
}
NGINX_EOF

# Copy new config
cp /tmp/nginx_new.conf "$NGINX_CONF"
log "Updated nginx.conf with install scripts location"

# Copy install scripts to nginx container's html folder
log "Copying install scripts to nginx container..."
docker exec "$NGINX_CONTAINER" mkdir -p /usr/share/nginx/html/install/codex
docker cp /opt/kandes/.next/server/public/install/. "$NGINX_CONTAINER":/usr/share/nginx/html/install/ 2>/dev/null || true

# Also try copying from app container if it has the files
docker cp kandes-app:/app/.next/server/public/install/. /tmp/install-scripts/ 2>/dev/null || true
if [ -d /tmp/install-scripts ]; then
    docker cp /tmp/install-scripts/. "$NGINX_CONTAINER":/usr/share/nginx/html/install/ 2>/dev/null || true
    rm -rf /tmp/install-scripts
fi

# Create install directory and copy files manually via tar
if docker exec "$NGINX_CONTAINER" test -d /usr/share/nginx/html/install/codex 2>/dev/null; then
    log "Install directory exists in nginx container"
else
    log "Creating install directory..."
    docker exec "$NGINX_CONTAINER" mkdir -p /usr/share/nginx/html/install/codex
fi

# Copy files using docker cp
log "Copying codex scripts to nginx..."
cd /opt/kandes
tar cf - -C . .next/server/public/install 2>/dev/null | docker exec -i "$NGINX_CONTAINER" tar xf - -C /usr/share/nginx/html/ 2>/dev/null || log "Note: files may already be in place"

# Test nginx config
log "Testing nginx configuration..."
if docker exec "$NGINX_CONTAINER" nginx -t 2>&1; then
    log "Nginx config test passed!"
    
    # Reload nginx
    log "Reloading nginx..."
    docker exec "$NGINX_CONTAINER" nginx -s reload
    
    log "Fix applied successfully!"
    log ""
    log "Test commands:"
    log "  curl -fsSL https://kandes.shop/install/codex/codex-config-kandes.sh | head -5"
    log "  curl -fsSL https://kandes.shop/install/codex/codex-config-kandes.ps1 | head -5"
else
    log "ERROR: Nginx config test failed!"
    log "Restoring backup..."
    cp "${NGINX_CONF}.bak" "$NGINX_CONF"
    docker exec "$NGINX_CONTAINER" nginx -t
    exit 1
fi
