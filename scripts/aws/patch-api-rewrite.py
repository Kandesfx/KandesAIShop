#!/usr/bin/env python3
"""Add rewrite rule to nginx.conf for api.kandes.shop."""
import re

path = '/opt/kandes/nginx.conf'
with open(path) as f:
    cfg = f.read()

# Check if already patched
if 'rewrite ^/v1/' in cfg:
    print('Rewrite rule already exists')
    exit(0)

# Add rewrite in the api server block
old_block = '''        location / {
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
        }'''

new_block = '''        # Rewrite /v1/* -> /api/ai/v1/* for OpenAI-compatible API
        rewrite ^/v1/(.*) /api/ai/v1/$1 break;

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
        }'''

if old_block in cfg:
    cfg = cfg.replace(old_block, new_block)
    with open(path, 'w') as f:
        f.write(cfg)
    print('Added rewrite rule successfully')
else:
    print('ERROR: Could not find the location block to patch')
    exit(1)
