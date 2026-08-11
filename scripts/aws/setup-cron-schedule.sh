#!/bin/bash
# ============================================================================
# Kandes.shop — Setup AWS EventBridge schedule + Lambda proxy for cron jobs
# D69 (CONTEXT.md §7): Replace Vercel Cron (broken after EC2 migration).
#
# Tạo:
#   - 1 Lambda function `kandes-cron-proxy` (Node 20) — proxy POST tới app
#   - 5 EventBridge schedule rules (5 phút / 1 giờ / 5 phút / 30 phút / 6 giờ)
#   - IAM role + permissions cho Lambda gọi CloudWatch Logs
#
# Lambda → POST https://kandes.shop/api/cron/<name> (qua CloudFront → nginx → app)
# Lambda gửi Authorization header với secret từ env var (Secrets Manager lookup).
#
# Requirements:
#   - AWS CLI configured
#   - IAM permissions: lambda:*, events:*, iam:*, secretsmanager:GetSecretValue
#   - App đang chạy tại https://kandes.shop (CloudFront + nginx + Next.js)
#
# Usage:
#   export KANDES_CRON_SECRET='<64-hex-from-github-secrets-DATABASE_URL-area>'
#   ./scripts/aws/setup-cron-schedule.sh
#
# Verify sau khi chạy:
#   aws lambda get-function --function-name kandes-cron-proxy --region ap-southeast-1
#   aws events list-rules --name-prefix kandes-cron --region ap-southeast-1
#   # Manual trigger test:
#   aws lambda invoke --function-name kandes-cron-proxy \
#     --payload '{"jobName":"sepay-reconcile"}' \
#     --region ap-southeast-1
# ============================================================================

set -euo pipefail

# ----------------------------------------------------------------------------
# Config
# ----------------------------------------------------------------------------
REGION="ap-southeast-1"
LAMBDA_NAME="kandes-cron-proxy"
IAM_ROLE_NAME="kandes-lambda-cron-proxy"
SECRET_NAME="kandes/cron-secret"
APP_BASE_URL="https://kandes.shop"

# Cron schedules (UTC, tương ứng Vercel crons đã có)
#   sepay-reconcile       */5 * * * *   mỗi 5 phút
#   expire-overdue-orders 0 * * * *     mỗi giờ
#   sla-scan              */5 * * * *   mỗi 5 phút
#   ai-balance-sync       */30 * * * *  mỗi 30 phút
#   ai-quota-alert        0 */6 * * *   mỗi 6 giờ

# CRON_SECRET — required. Đặt trước khi chạy.
if [ -z "${KANDES_CRON_SECRET:-}" ]; then
  echo "ERROR: Set KANDES_CRON_SECRET env var first."
  echo "  export KANDES_CRON_SECRET='<value-from-github-secret-or-/opt/kandes/.env>'"
  exit 1
fi

echo "==> Setting up EventBridge + Lambda for Kandes cron jobs"
echo "    Region: $REGION"
echo "    Lambda: $LAMBDA_NAME"
echo "    App URL: $APP_BASE_URL"
echo ""

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
TMP_DIR="$(mktemp -d)"

# ----------------------------------------------------------------------------
# Step 1: IAM role cho Lambda
# ----------------------------------------------------------------------------
echo "==> Step 1: IAM role..."

cat > "$TMP_DIR/lambda-trust-policy.json" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "lambda.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

ROLE_ARN=$(aws iam create-role \
  --role-name "$IAM_ROLE_NAME" \
  --assume-role-policy-document "file://$TMP_DIR/lambda-trust-policy.json" \
  --query 'Role.Arn' --output text 2>/dev/null) || \
ROLE_ARN=$(aws iam get-role \
  --role-name "$IAM_ROLE_NAME" \
  --query 'Role.Arn' --output text)

echo "    Role ARN: $ROLE_ARN"

# Attach basic Lambda execution (CloudWatch Logs)
aws iam attach-role-policy \
  --role-name "$IAM_ROLE_NAME" \
  --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole" \
  > /dev/null 2>&1 || true

# ----------------------------------------------------------------------------
# Step 2: Secrets Manager — lưu CRON_SECRET
# ----------------------------------------------------------------------------
echo ""
echo "==> Step 2: Secrets Manager..."

SECRET_ARN=$(aws secretsmanager create-secret \
  --name "$SECRET_NAME" \
  --description "Bearer token for /api/cron/* — Kandes app + Lambda proxy" \
  --secret-string "$KANDES_CRON_SECRET" \
  --region "$REGION" \
  --query 'ARN' --output text 2>/dev/null) || \
SECRET_ARN=$(aws secretsmanager describe-secret \
  --secret-id "$SECRET_NAME" \
  --region "$REGION" \
  --query 'ARN' --output text)

# Update secret value để chắc chắn sync
aws secretsmanager put-secret-value \
  --secret-id "$SECRET_NAME" \
  --secret-string "$KANDES_CRON_SECRET" \
  --region "$REGION" \
  > /dev/null

echo "    Secret ARN: $SECRET_ARN"

# Lambda cần đọc secret — add inline policy
cat > "$TMP_DIR/lambda-secret-policy.json" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "$SECRET_ARN"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name "$IAM_ROLE_NAME" \
  --policy-name "GetCronSecretPolicy" \
  --policy-document "file://$TMP_DIR/lambda-secret-policy.json"

# ----------------------------------------------------------------------------
# Step 3: Lambda function code (Node 20)
# ----------------------------------------------------------------------------
echo ""
echo "==> Step 3: Lambda function code..."

mkdir -p "$TMP_DIR/lambda-src"
cat > "$TMP_DIR/lambda-src/index.mjs" <<'EOF'
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const APP_BASE_URL = process.env.APP_BASE_URL;
const SECRET_NAME = process.env.SECRET_NAME;

const sm = new SecretsManagerClient({ region: process.env.AWS_REGION });

let cachedSecret = null;
let cachedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getCronSecret() {
  if (cachedSecret && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedSecret;
  }
  const cmd = new GetSecretValueCommand({ SecretId: SECRET_NAME });
  const out = await sm.send(cmd);
  cachedSecret = out.SecretString;
  cachedAt = Date.now();
  return cachedSecret;
}

export const handler = async (event) => {
  // EventBridge sẽ pass { jobName: '<name>' } (xem input mapping bên dưới).
  const jobName = event?.jobName;
  if (!jobName) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing jobName in event payload' }) };
  }

  let secret;
  try {
    secret = await getCronSecret();
  } catch (err) {
    console.error('Failed to fetch cron secret:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Secret fetch failed' }) };
  }

  const url = `${APP_BASE_URL}/api/cron/${jobName}`;
  console.log(`Triggering ${jobName} → POST ${url}`);

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secret}`,
        'x-cron-caller': `lambda:${jobName}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ triggeredBy: `aws-eventbridge:${jobName}` }),
      signal: AbortSignal.timeout(60_000),
    });

    const text = await resp.text();
    let body;
    try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 500) }; }

    console.log(`[${jobName}] HTTP ${resp.status}`, JSON.stringify(body));
    return {
      statusCode: resp.status,
      body: JSON.stringify({ jobName, httpStatus: resp.status, appResponse: body }),
    };
  } catch (err) {
    console.error(`[${jobName}] failed:`, err);
    return { statusCode: 502, body: JSON.stringify({ error: err.message }) };
  }
};
EOF

# Lambda deployment package: chỉ include index.mjs + AWS SDK (built-in trong Node 20 runtime)
cd "$TMP_DIR/lambda-src"
zip -q /tmp/lambda-cron-proxy.zip index.mjs
cd - > /dev/null

# ----------------------------------------------------------------------------
# Step 4: Tạo / update Lambda function
# ----------------------------------------------------------------------------
echo ""
echo "==> Step 4: Lambda function..."

LAMBDA_ARN=$(aws lambda create-function \
  --function-name "$LAMBDA_NAME" \
  --runtime "nodejs20.x" \
  --role "$ROLE_ARN" \
  --handler "index.handler" \
  --zip-file "fileb:///tmp/lambda-cron-proxy.zip" \
  --timeout 90 \
  --memory-size 256 \
  --environment "Variables={APP_BASE_URL=$APP_BASE_URL,SECRET_NAME=$SECRET_NAME}" \
  --region "$REGION" \
  --query 'FunctionArn' --output text 2>/dev/null) || \
LAMBDA_ARN=$(aws lambda update-function-code \
  --function-name "$LAMBDA_NAME" \
  --zip-file "fileb:///tmp/lambda-cron-proxy.zip" \
  --region "$REGION" \
  --query 'FunctionArn' --output text)

# Update env vars (create-function skip nếu exists)
aws lambda update-function-configuration \
  --function-name "$LAMBDA_NAME" \
  --environment "Variables={APP_BASE_URL=$APP_BASE_URL,SECRET_NAME=$SECRET_NAME}" \
  --region "$REGION" \
  > /dev/null

echo "    Lambda ARN: $LAMBDA_ARN"

# ----------------------------------------------------------------------------
# Step 5: EventBridge rules
# ----------------------------------------------------------------------------
echo ""
echo "==> Step 5: EventBridge rules..."

create_rule() {
  local name=$1
  local schedule=$2
  local job_name=$3

  # Tạo rule
  aws events put-rule \
    --name "$name" \
    --schedule-expression "$schedule" \
    --region "$REGION" \
    --description "Trigger Kandes cron: $job_name" \
    --state ENABLED \
    > /dev/null

  # Set target = Lambda với input payload { jobName }
  aws events put-targets \
    --rule "$name" \
    --targets "Id=1,Arn=$LAMBDA_ARN,Input={\"jobName\":\"$job_name\"}" \
    --region "$REGION" \
    > /dev/null

  # Grant EventBridge permission invoke Lambda
  aws lambda add-permission \
    --function-name "$LAMBDA_NAME" \
    --statement-id "AllowEventBridge-${name}" \
    --action "lambda:InvokeFunction" \
    --principal "events.amazonaws.com" \
    --source-arn "arn:aws:events:$REGION:$ACCOUNT_ID:rule/$name" \
    --region "$REGION" \
    > /dev/null 2>&1 || true

  echo "    ✓ $name  ($schedule) → $job_name"
}

# Match Vercel cron schedule trong vercel.json
create_rule "kandes-cron-sepay-reconcile"      "cron(*/5 * * * ? *)"   "sepay-reconcile"
create_rule "kandes-cron-expire-overdue-orders" "cron(0 * * * ? *)"     "expire-overdue-orders"
create_rule "kandes-cron-sla-scan"              "cron(*/5 * * * ? *)"   "sla-scan"
create_rule "kandes-cron-ai-balance-sync"       "cron(*/30 * * * ? *)"  "ai-balance-sync"
create_rule "kandes-cron-ai-quota-alert"        "cron(0 */6 * * ? *)"   "ai-quota-alert"

# ----------------------------------------------------------------------------
# Cleanup
# ----------------------------------------------------------------------------
rm -rf "$TMP_DIR" /tmp/lambda-cron-proxy.zip

echo ""
echo "==> Done! EventBridge schedule configured."
echo ""
echo "Resources created:"
echo "  IAM Role:  $IAM_ROLE_NAME"
echo "  Secret:    $SECRET_NAME"
echo "  Lambda:    $LAMBDA_NAME"
echo "  Rules ×5:  kandes-cron-sepay-reconcile, kandes-cron-expire-overdue-orders,"
echo "             kandes-cron-sla-scan, kandes-cron-ai-balance-sync, kandes-cron-ai-quota-alert"
echo ""
echo "Manual test:"
echo "  aws lambda invoke --function-name $LAMBDA_NAME \\"
echo "    --payload '{\"jobName\":\"sepay-reconcile\"}' \\"
echo "    --region $REGION /tmp/out.json && cat /tmp/out.json"
echo ""
echo "Monitor:"
echo "  aws logs tail /aws/lambda/$LAMBDA_NAME --follow --region $REGION"
echo ""
echo "Disable schedule (nếu cần):"
echo "  aws events disable-rule --name kandes-cron-sepay-reconcile --region $REGION"
echo ""