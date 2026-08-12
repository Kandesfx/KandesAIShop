#!/bin/bash
# Update CF distribution #2 OriginProtocolPolicy: https-only -> match-viewer.
# EC2 Nginx does NOT have a TLS cert for `ec2-origin.kandes.shop`,
# so an https-only origin policy 502s. match-viewer lets the origin
# serve HTTP on port 80 (which is the public Next.js app on EC2).
set -euo pipefail

DIST_ID=EP5ZI3VMCBDP3

echo "=== Get current config ==="
aws cloudfront get-distribution-config --id "$DIST_ID" > /tmp/cf-config.json

echo "=== Update OriginProtocolPolicy ==="
# Use Python for safe JSON manipulation (avoids jq dep)
python3 - <<'PYEOF'
import json
with open('/tmp/cf-config.json') as f:
    data = json.load(f)
data['DistributionConfig']['Origins']['Items'][0]['CustomOriginConfig']['OriginProtocolPolicy'] = 'match-viewer'
with open('/tmp/cf-config-new.json', 'w') as f:
    json.dump(data['DistributionConfig'], f, indent=2)
PYEOF

echo "=== Apply update ==="
ETAG=$(jq -r '.ETag' /tmp/cf-config.json)
# Python fallback if no jq
if [ "$ETAG" = "null" ] || [ -z "$ETAG" ]; then
  ETAG=$(python3 -c "import json; print(json.load(open('/tmp/cf-config.json'))['ETag'])")
fi
echo "ETag: $ETAG"

aws cloudfront update-distribution --id "$DIST_ID" \
  --distribution-config file:///tmp/cf-config-new.json \
  --if-match "$ETAG" \
  --query 'Distribution.{Id:Id,Status:Status}' \
  --output table

echo "=== Waiting for deployment (5-10 min) ==="
echo "Monitor: aws cloudfront get-distribution --id $DIST_ID --query 'Distribution.Status'"