#!/bin/bash
# Update CloudFront behavior for /_next/static/* to:
# 1. Forward Host header (so nginx receives correct SNI/vhost)
# 2. Set TTL=0 so it doesn't cache (forces refetch from origin)

set -e

CF_ID="E1Q8DEYAXGY3N9"
ETAG=$(aws cloudfront get-distribution-config --id "$CF_ID" --query "ETag" --output text)
echo "Current ETag: $ETAG"

# Build new config using jq or python
python3 <<'PYEOF'
import json
import subprocess

CF_ID = "E1Q8DEYAXGY3N9"

# Get current config
result = subprocess.run(
    ['aws', 'cloudfront', 'get-distribution-config', '--id', CF_ID, '--output', 'json'],
    capture_output=True, text=True
)
data = json.loads(result.stdout)
config = data['DistributionConfig']
etag = data['ETag']

print(f"Current ETag: {etag}")

# Modify the _next/static behavior
for cb in config['CacheBehaviors']['Items']:
    if cb.get('PathPattern') == '/_next/static/*':
        print(f"Found behavior: {cb['PathPattern']}")
        # Add Host header forwarding
        cb['ForwardedValues']['Headers'] = {
            'Quantity': 1,
            'Items': ['Host']
        }
        # Force no cache
        cb['MinTTL'] = 0
        cb['DefaultTTL'] = 0
        cb['MaxTTL'] = 0
        # Forward query string (just in case)
        cb['ForwardedValues']['QueryString'] = True

# Save config to file
with open('/tmp/cf-new-config.json', 'w') as f:
    json.dump(config, f, separators=(',', ':'))

# Apply update
print("Applying update...")
result = subprocess.run(
    ['aws', 'cloudfront', 'update-distribution',
     '--id', CF_ID,
     '--if-match', etag,
     '--distribution-config', open('/tmp/cf-new-config.json').read(),
     '--output', 'json'],
    capture_output=True, text=True
)

if result.returncode != 0:
    print(f"ERROR: {result.stderr}")
    exit(1)

resp = json.loads(result.stdout)
print(f"Update OK. New ETag: {resp['ETag']}")
print(f"Status: {resp['Distribution']['Status']}")
PYEOF