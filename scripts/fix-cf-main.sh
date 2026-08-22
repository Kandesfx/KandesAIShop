#!/bin/bash
# scripts/fix-cf-main.sh
# Bật POST cho path /api/* trên CloudFront distribution kandes.shop (main, E1Q8DEYAXGY3N9)
set -e

DIST_ID="E1Q8DEYAXGY3N9"
echo ">> Target distribution: $DIST_ID"

aws cloudfront get-distribution-config --id "$DIST_ID" > /tmp/cf-main.json
ETAG=$(jq -r '.ETag' /tmp/cf-main.json)
ORIGIN_ID=$(jq -r '.DistributionConfig.Origins.Items[0].Id' /tmp/cf-main.json)
echo ">> ETag: $ETAG"
echo ">> Origin ID: $ORIGIN_ID"

jq --arg origin "$ORIGIN_ID" '
  .DistributionConfig
  | .CacheBehaviors.Items |= (
      if any(.[]; .PathPattern == "/api/*") then
        map(if .PathPattern == "/api/*" then
          .AllowedMethods = {"Quantity":7,"Items":["GET","HEAD","OPTIONS","PUT","POST","PATCH","DELETE"],"CachedMethods":{"Quantity":0,"Items":[]}}
          | .CachePolicyId = "4135ea2d-6df8-44a3-9f43-ebbe8e61720f"
          | .OriginRequestPolicyId = "216adef6-5c7f-47e4-b989-44a06f0d9f04"
          | .ViewerProtocolPolicy = "redirect-to-https"
          else . end)
      else
        . + [{
          "PathPattern": "/api/*",
          "TargetOriginId": $origin,
          "ViewerProtocolPolicy": "redirect-to-https",
          "AllowedMethods": {"Quantity":7,"Items":["GET","HEAD","OPTIONS","PUT","POST","PATCH","DELETE"],"CachedMethods":{"Quantity":0,"Items":[]}},
          "CachePolicyId": "4135ea2d-6df8-44a3-9f43-ebbe8e61720f",
          "OriginRequestPolicyId": "216adef6-5c7f-47e4-b989-44a06f0d9f04",
          "SmoothStreaming": false,
          "Compress": true,
          "LambdaFunctionAssociations": {"Quantity": 0},
          "FunctionAssociations": {"Quantity": 0},
          "TrustedSigners": {"Enabled": false, "Quantity": 0},
          "TrustedKeyGroups": {"Enabled": false, "Quantity": 0},
          "FieldLevelEncryptionId": "",
          "TTL": 0
        }]
      end
    )
  | .CacheBehaviors.Quantity = (.CacheBehaviors.Items | length)
' /tmp/cf-main.json > /tmp/cf-main-patched.json

echo ""
echo ">> Patched config saved to /tmp/cf-main-patched.json"
echo ">> CacheBehaviors.Items count: $(jq '.DistributionConfig.CacheBehaviors.Items | length' /tmp/cf-main-patched.json)"
jq -r '.DistributionConfig.CacheBehaviors.Items[] | "  Path: \(.PathPattern)  Methods: \(.AllowedMethods.Items | join(","))"' /tmp/cf-main-patched.json

echo ""
echo ">> Apply to CloudFront..."
aws cloudfront update-distribution \
  --id "$DIST_ID" \
  --if-match "$ETAG" \
  --distribution-config "file:///tmp/cf-main-patched.json" \
  --output json > /tmp/cf-update.json

echo ">> Done. New ETag: $(jq -r '.ETag' /tmp/cf-update.json)"
echo ">> Status: $(jq -r '.Distribution.Status' /tmp/cf-update.json)"