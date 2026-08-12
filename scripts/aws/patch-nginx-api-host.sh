#!/bin/bash
# Update nginx.conf: serve HTTP for api.kandes.shop without redirect to HTTPS.
# CF#2 forwards HTTP → EC2:80, but the default `listen 80` block does a 301 to
# HTTPS. Until we get a TLS cert for `ec2-origin.kandes.shop`, we let Nginx
# accept the plain-HTTP request from CloudFront and skip the redirect.
#
# This keeps user-facing traffic HTTPS (CF#2 cert is for *.kandes.shop).
set -uo pipefail

NGINX=/opt/kandes/nginx.conf

if grep -q "server_name api.kandes.shop.*return 200" "$NGINX"; then
  echo "api.kandes.shop 200 stub already in place."
  exit 0
fi

# Inject a server block for api.kandes.shop BEFORE the catch-all HTTP→HTTPS
# redirect. This way CF#2's HTTP passthrough lands on a working 200.
sudo python3 - <<'PYEOF'
path = '/opt/kandes/nginx.conf'
with open(path) as f:
    cfg = f.read()

stub = '''
    # ===== D74-C: api.kandes.shop via CF#2 (HTTP passthrough) =====
    # CloudFront distribution #2 forwards plain HTTP to this Nginx on :80,
    # but the default catch-all block below redirects every :80 request to
    # HTTPS. Since CF#2 already terminates TLS at the edge with the
    # *.kandes.shop ACM cert, plain HTTP here is fine for the
    # `api.kandes.shop` host. Serve from upstream `kandes_app` and skip
    # the HTTPS redirect for this server_name only.
    server {
        listen 80;
        listen [::]:80;
        server_name api.kandes.shop ec2-origin.kandes.shop;

        location / {
            proxy_pass http://kandes_app;
            proxy_http_version 1.1;
            proxy_set_header Host              $host;
            proxy_set_header X-Real-IP         $remote_addr;
            proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_buffering        off;
            proxy_request_buffering off;
            proxy_read_timeout      300s;
            proxy_send_timeout      300s;
        }

        # /.well-known still served from default block, but here too for
        # safety if certbot ever points at this host.
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
    }
'''

marker = '    # =========================================================================\n    # HTTP -> HTTPS redirect'
cfg = cfg.replace(marker, stub.lstrip() + '\n' + marker)
with open(path, 'w') as f:
    f.write(cfg)
print("Injected api.kandes.shop server block")
PYEOF

echo ""
echo "=== Validate nginx config ==="
docker exec kandes-nginx nginx -t 2>&1 | head -10 || true

echo ""
echo "=== Reload nginx ==="
docker exec kandes-nginx nginx -s reload 2>&1 || true

echo ""
echo "=== Confirm syntax ==="
docker exec kandes-nginx nginx -T 2>&1 | grep -A 1 "server_name api.kandes.shop" | head -5