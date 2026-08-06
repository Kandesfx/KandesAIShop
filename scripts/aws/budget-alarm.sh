#!/bin/bash
# ============================================================================
# Kandes.shop — AWS Budget Alarm Setup
# D64 (CONTEXT.md §7): Safety mechanism for m7i-flex.large cost control
#
# Creates 3 budget thresholds:
#   $100 (50% of $200 credits) → warning email + telegram
#   $150 (75%) → urgent
#   $180 (90%) → critical
#
# Requirements:
#   - AWS CLI configured (aws configure)
#   - IAM permissions: budgets:* + sns:*
#   - SNS topic for notifications
#
# Usage:
#   ./scripts/aws/budget-alarm.sh
# ============================================================================

set -euo pipefail

# ----------------------------------------------------------------------------
# Config
# ----------------------------------------------------------------------------
ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' --output text)
REGION="ap-southeast-1"
BUDGET_NAME="kandes-monthly-budget"
EMAIL="admin@kandes.shop"
TELEGRAM_TOPIC="kandes-cost-alerts"

# Thresholds (in USD)
# D64 strict version: 25%/50%/75% of $200 (user chọn 2026-08-07)
THRESHOLD_WARN=50
THRESHOLD_URGENT=100
THRESHOLD_CRITICAL=150

# ----------------------------------------------------------------------------
# Pre-flight checks
# ----------------------------------------------------------------------------
echo "==> Checking AWS account..."
echo "    Account ID: $ACCOUNT_ID"
echo "    Region: $REGION"

if ! aws sts get-caller-identity > /dev/null 2>&1; then
  echo "ERROR: AWS CLI not configured. Run 'aws configure' first."
  exit 1
fi

# ----------------------------------------------------------------------------
# Create SNS topic
# ----------------------------------------------------------------------------
echo "==> Creating SNS topic: $TELEGRAM_TOPIC..."

TOPIC_ARN=$(aws sns create-topic \
  --name "$TELEGRAM_TOPIC" \
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
# Create Budget
# ----------------------------------------------------------------------------
echo "==> Creating AWS Budget: $BUDGET_NAME..."

cat > /tmp/budget-config.json <<EOF
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
  },
  "NotificationsWithSubscribers": [
    {
      "Notification": {
        "NotificationType": "ACTUAL",
        "ComparisonOperator": "GREATER_THAN",
        "Threshold": $((THRESHOLD_WARN * 100 / 200)),
        "ThresholdType": "PERCENTAGE"
      },
      "Subscribers": [
        {
          "SubscriptionType": "EMAIL",
          "Address": "$EMAIL"
        },
        {
          "SubscriptionType": "SNS",
          "Address": "$TOPIC_ARN"
        }
      ]
    },
    {
      "Notification": {
        "NotificationType": "ACTUAL",
        "ComparisonOperator": "GREATER_THAN",
        "Threshold": $((THRESHOLD_URGENT * 100 / 200)),
        "ThresholdType": "PERCENTAGE"
      },
      "Subscribers": [
        {
          "SubscriptionType": "EMAIL",
          "Address": "$EMAIL"
        },
        {
          "SubscriptionType": "SNS",
          "Address": "$TOPIC_ARN"
        }
      ]
    },
    {
      "Notification": {
        "NotificationType": "ACTUAL",
        "ComparisonOperator": "GREATER_THAN",
        "Threshold": $((THRESHOLD_CRITICAL * 100 / 200)),
        "ThresholdType": "PERCENTAGE"
      },
      "Subscribers": [
        {
          "SubscriptionType": "EMAIL",
          "Address": "$EMAIL"
        },
        {
          "SubscriptionType": "SNS",
          "Address": "$TOPIC_ARN"
        }
      ]
    },
    {
      "Notification": {
        "NotificationType": "FORECASTED",
        "ComparisonOperator": "GREATER_THAN",
        "Threshold": 90,
        "ThresholdType": "PERCENTAGE"
      },
      "Subscribers": [
        {
          "SubscriptionType": "EMAIL",
          "Address": "$EMAIL"
        }
      ]
    }
  ]
}
EOF

aws budgets create-budget \
  --account-id "$ACCOUNT_ID" \
  --budget file:///tmp/budget-config.json \
  --notifications-with-subscribers file:///tmp/budget-config.json \
  --region us-east-1  # Budgets API is us-east-1 only

rm -f /tmp/budget-config.json

echo ""
echo "==> Budget created successfully!"
echo ""
echo "  Thresholds:"
echo "    $${THRESHOLD_WARN} (50%) - WARNING"
echo "    $${THRESHOLD_URGENT} (75%) - URGENT"
echo "    $${THRESHOLD_CRITICAL} (90%) - CRITICAL"
echo "    90% forecast - FORECAST WARNING"
echo ""
echo "  Notifications will go to:"
echo "    Email: $EMAIL"
echo "    SNS: $TOPIC_ARN"
echo ""
echo "  Next steps:"
echo "    1. Confirm SNS email subscription (check inbox)"
echo "    2. Setup telegram integration: scripts/aws/sns-to-telegram.sh"
echo "    3. Setup auto-stop schedule: scripts/aws/schedule-stop-start.sh"
echo ""
