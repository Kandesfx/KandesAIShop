#!/bin/bash
# scripts/fix-cloudfront-post.sh
#
# Mục đích: Bật POST/PUT/PATCH/DELETE cho path /api/* trên CloudFront distribution
# của kandes.shop. Sau khi chạy xong, upload ảnh qua CloudFront sẽ hoạt động.
#
# Yêu cầu: AWS CLI đã có credentials quyền cloudfront:GetDistributionConfig,
#          cloudfront:UpdateDistribution.
#
# Cách dùng:
#   1. Đăng nhập AWS SSO nếu cần: aws sso login --profile your-profile
#   2. export AWS_PROFILE=your-profile    (hoặc dùng access key)
#   3. ./scripts/fix-cloudfront-post.sh
#
# Output: in ra Distribution ID + ETag + DistributionConfig đã sửa + Apply command.

set -e

DOMAIN="kandes.shop"
echo ">> Tìm CloudFront distribution cho $DOMAIN ..."
DIST_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?contains(Aliases.Items, '$DOMAIN')].[Id]" \
  --output text)

if [ -z "$DIST_ID" ]; then
  echo "!! Không tìm thấy distribution cho $DOMAIN"
  echo "   Kiểm tra lại alias hoặc dùng:"
  echo "   aws cloudfront list-distributions --output table"
  exit 1
fi

echo ">> Distribution ID: $DIST_ID"

# Lấy config hiện tại
aws cloudfront get-distribution-config --id "$DIST_ID" > /tmp/cf-config.json
ETAG=$(jq -r '.ETag' /tmp/cf-config.json)
CONFIG_FILE=/tmp/cf-config-patched.json

echo ">> ETag: $ETAG"

# Kiểm tra xem đã có behavior cho /api/admin/media/* chưa
EXISTING=$(jq -r '.DistributionConfig.CacheBehaviors.Items[] | select(.PathPattern == "/api/admin/media/*") | .PathPattern' /tmp/cf-config.json 2>/dev/null || echo "")

if [ -n "$EXISTING" ]; then
  echo ">> Đã có CacheBehavior cho /api/admin/media/*. Sẽ update."
  jq --arg etag "$ETAG" '
    .DistributionConfig.CacheBehaviors.Items |= map(
      if .PathPattern == "/api/admin/media/*" then
        .AllowedMethods = {
          "Quantity": 7,
          "Items": ["GET","HEAD","OPTIONS","PUT","POST","PATCH","DELETE"],
          "CachedMethods": {"Quantity": 0, "Items": []}
        }
        | .CachePolicyId = "4135ea2d-6df8-44a3-9f43-ebbe8e61720f"
        | (if .OriginRequestPolicyId then . else .OriginRequestPolicyId = "216adef6-5c7f-47e4-b989-44a06f0d9f04" end)
      else . end
    )
  ' /tmp/cf-config.json > "$CONFIG_FILE"
else
  echo ">> Chưa có CacheBehavior cho /api/admin/media/*. Sẽ tạo mới."
  jq --arg etag "$ETAG" '
    .DistributionConfig.CacheBehaviors.Items += [{
      "PathPattern": "/api/admin/media/*",
      "TargetOriginId": (.DistributionConfig.Origins.Items[0].Id),
      "ViewerProtocolPolicy": "redirect-to-https",
      "AllowedMethods": {
        "Quantity": 7,
        "Items": ["GET","HEAD","OPTIONS","PUT","POST","PATCH","DELETE"],
        "CachedMethods": {"Quantity": 0, "Items": []}
      },
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
    | .DistributionConfig.CacheBehaviors.Quantity += 1
  ' /tmp/cf-config.json > "$CONFIG_FILE"
fi

# CachePolicyId  4135ea2d-6df8-44a3-9f43-ebbe8e61720f = CachingDisabled (managed)
# OriginRequestPolicyId 216adef6-5c7f-47e4-b989-44a06f0d9f04 = AllViewer (managed, forward all)

echo ""
echo ">> Áp dụng config mới ..."
aws cloudfront update-distribution \
  --id "$DIST_ID" \
  --if-match "$ETAG" \
  --distribution-config "file://$CONFIG_FILE" \
  --output text > /tmp/cf-update.json

echo ""
echo ">> Hoàn tất. CloudFront sẽ deploy config mới (mất 1-3 phút)."
echo "   Sau đó test lại bằng:"
echo "   curl -X POST -F \"files=@big.jpg\" https://kandes.shop/api/admin/media/upload"
echo ""
echo ">> Nếu muốn check status:"
echo "   aws cloudfront get-distribution --id $DIST_ID --query 'Distribution.Status'"
