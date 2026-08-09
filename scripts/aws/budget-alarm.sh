#!/bin/bash
# ============================================================================
# Kandes.shop — AWS Budget Alarm Setup
# D64 (CONTEXT.md §7): Safety mechanism for cost control
#
# Creates 3 ACTUAL thresholds + 1 FORECASTED:
#   25% ($50)   - WARNING   → email + SNS
#   50% ($100)  - URGENT    → email + SNS
#   75% ($150)  - CRITICAL  → email + SNS
#   90% FORECASTED → email
#
# Requirements:
#   - AWS CLI configured (aws configure)
#   - IAM permissions: budgets:* + sns:*
#   - $KANDES_EMAIL env var (default: admin@kandes.shop)
#
# Usage:
#   KANDES_EMAIL="you@example.com" ./scripts/aws/budget-alarm.sh
# ============================================================================

set -euo pipefail

# ----------------------------------------------------------------------------
# Config
# ----------------------------------------------------------------------------
ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' --output text)
REGION="ap-southeast-1"
BUDGET_NAME="kandes-monthly-budget"
EMAIL="${KANDES_EMAIL:-admin@kandes.shop}"
SNS_TOPIC="kandes-cost-alerts"
TMP_DIR="$(mktemp -d)"

# Thresholds (in USD)
# D64 strict version: 25%/50%/75% of $200 (user chọn 2026-08-07)
THRESHOLD_WARN=50
THRESHOLD_URGENT=100
THRESHOLD_CRITICAL=150
THRESHOLD_FORECAST=90  # %

# ----------------------------------------------------------------------------
# Pre-flight checks
# ----------------------------------------------------------------------------
echo "==> Checking AWS account..."
echo "    Account ID: $ACCOUNT_ID"
echo "    Region: $REGION"
echo "    Email: $EMAIL"

if ! aws sts get-caller-identity > /dev/null 2>&1; then
  echo "ERROR: AWS CLI not configured. Run 'aws configure' first."
  exit 1
fi

# ----------------------------------------------------------------------------
# Create SNS topic
# ----------------------------------------------------------------------------
echo "==> Creating SNS topic: $SNS_TOPIC..."

TOPIC_ARN=$(aws sns create-topic \
  --name "$SNS_TOPIC" \
  --region "$REGION" \
  --query 'TopicArn' --output text)

echo "    Topic ARN: $TOPIC_ARN"

# Subscribe email
aws sns subscribe \
  --topic-arn "$TOPIC_ARN" \
  --protocol email \
  --notification-endpoint "$EMAIL" \
  --region "$REGION" \
  > /dev/null

echo "    Subscribed email: $EMAIL (check inbox to confirm)"

# ----------------------------------------------------------------------------
# Create Budget (minimal — just name + limit + settings)
# ----------------------------------------------------------------------------
echo "==> Creating AWS Budget: $BUDGET_NAME..."

cat > "$TMP_DIR/budget.json" <<EOF
{
  "BudgetName": "$BUDGET_NAME",
  "BudgetLimit": {
    "Amount": "200",
    "Unit": "USD"
  },
  "TimeUnit": "MONTHLY",
  "BudgetType": "COST",
  "CostFilters": {},
  "CostTypes": {
    "IncludeTax": true,
    "IncludeSubscription": true,
    "UseBlended": false,
    "IncludeRefund": true,
    "IncludeCredit": true
  }
}
EOF

# Try create (if exists, will fail; we'll ignore and move on to notifications)
if aws budgets create-budget \
    --account-id "$ACCOUNT_ID" \
    --budget "file://$TMP_DIR/budget.json" \
    --region us-east-1 > /dev/null 2>&1; then
  echo "    Budget created."
else
  echo "    Budget already exists — updating with full settings..."
  aws budgets update-budget \
    --account-id "$ACCOUNT_ID" \
    --new-budget "file://$TMP_DIR/budget.json" \
    --region us-east-1 > /dev/null
fi

# ----------------------------------------------------------------------------
# Create notifications (separate API call per notification)
# ----------------------------------------------------------------------------
# Note: AWS CLI v2 + create-notification expects:
#   --notification: FLAT (NotificationType, ComparisonOperator, Threshold, ThresholdType)
#   --subscribers: ARRAY of Subscriber objects

# Helper to create one notification
create_notification() {
  local threshold=$1
  local notif_type=$2
  local with_sns=${3:-yes}  # yes/no

  local notif_file="$TMP_DIR/notif-$threshold.json"
  local subs_file="$TMP_DIR/subs-$threshold.json"

  cat > "$notif_file" <<EOF
{
  "NotificationType": "$notif_type",
  "ComparisonOperator": "GREATER_THAN",
  "Threshold": $threshold,
  "ThresholdType": "PERCENTAGE"
}
EOF

  if [ "$with_sns" = "yes" ]; then
    cat > "$subs_file" <<EOF
[
  { "SubscriptionType": "EMAIL", "Address": "$EMAIL" },
  { "SubscriptionType": "SNS", "Address": "$TOPIC_ARN" }
]
EOF
  else
    cat > "$subs_file" <<EOF
[
  { "SubscriptionType": "EMAIL", "Address": "$EMAIL" }
]
EOF
  fi

  aws budgets create-notification \
    --account-id "$ACCOUNT_ID" \
    --budget-name "$BUDGET_NAME" \
    --notification "file://$notif_file" \
    --subscribers "file://$subs_file" \
    --region us-east-1 > /dev/null 2>&1 \
    && echo "    Notif @ $threshold% ($notif_type) created" \
    || echo "    Notif @ $threshold% ($notif_type) already exists (skipped)"
}

echo "==> Creating 4 notifications..."
create_notification 25 ACTUAL yes
create_notification 50 ACTUAL yes
create_notification 75 ACTUAL yes
create_notification "$THRESHOLD_FORECAST" FORECASTED no

# ----------------------------------------------------------------------------
# Cleanup
# ----------------------------------------------------------------------------
rm -rf "$TMP_DIR"

echo ""
echo "==> Budget + alarms configured successfully!"
echo ""
echo "  Thresholds (ACTUAL):"
echo "    \$50  (25%) - WARNING  → email + SNS"
echo "    \$100 (50%) - URGENT   → email + SNS"
echo "    \$150 (75%) - CRITICAL → email + SNS"
echo "  Threshold (FORECASTED):"
echo "    90% projection → email"
echo ""
echo "  Notifications will go to:"
echo "    Email: $EMAIL"
echo "    SNS:   $TOPIC_ARN"
echo ""
echo "  Next steps:"
echo "    1. Check $EMAIL inbox → click 'Confirm subscription'"
echo "    2. Run: ./scripts/aws/cloudwatch-alarm.sh"
echo ""
