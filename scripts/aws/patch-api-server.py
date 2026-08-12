#!/usr/bin/env python3
"""Patch nginx.conf to add api.kandes.shop server block."""
import sys

path = '/opt/kandes/nginx.conf'
with open(path) as f:
    cfg = f.read()

# Check if already patched
if 'api.kandes.shop ec2-origin.kandes.shop' in cfg:
    print('Already patched')
    sys.exit(0)

stub = '''    # ===== D74-C: api.kandes.shop via CF#2 (HTTP passthrough) =====
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
            proxy_buffering off;
            proxy_request_buffering off;
            proxy_read_timeout 300s;
            proxy_send_timeout 300s;
        }
    }

'''

marker = '    # =========================================================================\n    # HTTP -> HTTPS redirect'
if marker not in cfg:
    print(f'ERROR: Marker not found in {path}')
    sys.exit(1)

cfg = cfg.replace(marker, stub + marker)
with open(path, 'w') as f:
    f.write(cfg)

print('Patched nginx.conf successfully')
