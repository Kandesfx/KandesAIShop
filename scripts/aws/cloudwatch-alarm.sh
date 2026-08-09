#!/bin/bash
# ============================================================================
# Kandes.shop — CloudWatch Alarms (instance health + cost)
# D64 (CONTEXT.md §7): Comprehensive monitoring
#
# Alarms (4 total):
#   1. EstimatedCharges > $5/day (US-EAST-1 region - billing only there)
#   2. CPU < 5% trong 30 min (idle - over-provisioned warning)
#   3. CPU > 80% trong 10 min (overload warning)
#   4. Status check failed (urgent)
#
# IMPORTANT: AWS CloudWatch Billing metrics chỉ available ở us-east-1.
# SNS topic phải cùng region với alarm. Nên:
#   - Cost alarm → us-east-1 → SNS topic us-east-1
#   - Instance alarms → ap-southeast-1 → SNS topic ap-southeast-1
#
# Requirements:
#   - AWS CLI configured
#   - SNS topics đã tạo (cả 2 regions)
#   - IAM permissions: cloudwatch:* + sns:*
#
# Usage:
#   export KANDES_INSTANCE_ID=i-0123456789abcdef0
#   export KANDES_SNS_TOPIC_ARN=arn:aws:sns:ap-southeast-1:ACCT:kandes-cost-alerts
#   export KANDES_SNS_TOPIC_ARN_BILLING=arn:aws:sns:us-east-1:ACCT:kandes-cost-alerts-billing
#   ./scripts/aws/cloudwatch-alarm.sh
# ============================================================================

set -euo pipefail

# ----------------------------------------------------------------------------
# Config
# ----------------------------------------------------------------------------
INSTANCE_ID="${KANDES_INSTANCE_ID:-i-XXXXX}"
REGION="ap-southeast-1"
BILLING_REGION="us-east-1"
SNS_TOPIC_ARN="${KANDES_SNS_TOPIC_ARN:-arn:aws:sns:ap-southeast-1:XXXXX:kandes-cost-alerts}"
SNS_TOPIC_ARN_BILLING="${KANDES_SNS_TOPIC_ARN_BILLING:-arn:aws:sns:us-east-1:XXXXX:kandes-cost-alerts-billing}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
TMP_DIR="$(mktemp -d)"

if [ "$INSTANCE_ID" = "i-XXXXX" ]; then
  echo "ERROR: Set KANDES_INSTANCE_ID environment variable first:"
  echo "  export KANDES_INSTANCE_ID=i-0123456789abcdef0"
  exit 1
fi

echo "==> Creating CloudWatch alarms for instance: $INSTANCE_ID"
echo "    Region (instance): $REGION"
echo "    Region (billing):  $BILLING_REGION"
echo ""

# Helper: write JSON to temp file then call aws cli
put_alarm() {
  local region=$1
  local json=$2

  local file="$TMP_DIR/alarm-$RANDOM.json"
  echo "$json" > "$file"

  aws cloudwatch put-metric-alarm \
    --region "$region" \
    --cli-input-json "file://$file" \
    > /dev/null 2>&1 \
    && echo "    OK" \
    || echo "    FAILED (check region + IAM)"
}

# ----------------------------------------------------------------------------
# Alarm 1: Estimated charges (us-east-1 only)
# ----------------------------------------------------------------------------
echo "==> Alarm 1: EstimatedCharges > \$5/day (region: $BILLING_REGION)"

put_alarm "$BILLING_REGION" "$(cat <<EOF
{
  "AlarmName": "kandes-cost-daily",
  "AlarmDescription": "Daily EC2 cost > \$5 USD",
  "MetricName": "EstimatedCharges",
  "Namespace": "AWS/Billing",
  "Statistic": "Maximum",
  "Period": 21600,
  "EvaluationPeriods": 1,
  "Threshold": 5,
  "ComparisonOperator": "GreaterThanThreshold",
  "TreatMissingData": "notBreaching",
  "Dimensions": [
    { "Name": "Service", "Value": "AmazonEC2" },
    { "Name": "LinkedAccount", "Value": "$ACCOUNT_ID" }
  ],
  "AlarmActions": ["$SNS_TOPIC_ARN_BILLING"]
}
EOF
)"

# ----------------------------------------------------------------------------
# Alarm 2: CPU idle (low utilization warning)
# ----------------------------------------------------------------------------
echo "==> Alarm 2: CPU < 5% trong 30 min (region: $REGION)"

put_alarm "$REGION" "$(cat <<EOF
{
  "AlarmName": "kandes-cpu-idle",
  "AlarmDescription": "CPU < 5% for 30 min - over-provisioned?",
  "MetricName": "CPUUtilization",
  "Namespace": "AWS/EC2",
  "Statistic": "Average",
  "Period": 300,
  "EvaluationPeriods": 6,
  "Threshold": 5,
  "ComparisonOperator": "LessThanThreshold",
  "TreatMissingData": "breaching",
  "Dimensions": [
    { "Name": "InstanceId", "Value": "$INSTANCE_ID" }
  ],
  "AlarmActions": ["$SNS_TOPIC_ARN"]
}
EOF
)"

# ----------------------------------------------------------------------------
# Alarm 3: CPU high (overload warning)
# ----------------------------------------------------------------------------
echo "==> Alarm 3: CPU > 80% trong 10 min (region: $REGION)"

put_alarm "$REGION" "$(cat <<EOF
{
  "AlarmName": "kandes-cpu-high",
  "AlarmDescription": "CPU > 80% for 10 min - overload",
  "MetricName": "CPUUtilization",
  "Namespace": "AWS/EC2",
  "Statistic": "Average",
  "Period": 60,
  "EvaluationPeriods": 10,
  "Threshold": 80,
  "ComparisonOperator": "GreaterThanThreshold",
  "TreatMissingData": "notBreaching",
  "Dimensions": [
    { "Name": "InstanceId", "Value": "$INSTANCE_ID" }
  ],
  "AlarmActions": ["$SNS_TOPIC_ARN"]
}
EOF
)"

# ----------------------------------------------------------------------------
# Alarm 4: Status check failed
# ----------------------------------------------------------------------------
echo "==> Alarm 4: StatusCheck failed (region: $REGION)"

put_alarm "$REGION" "$(cat <<EOF
{
  "AlarmName": "kandes-status-check",
  "AlarmDescription": "Status check failed - urgent!",
  "MetricName": "StatusCheckFailed",
  "Namespace": "AWS/EC2",
  "Statistic": "Maximum",
  "Period": 60,
  "EvaluationPeriods": 2,
  "Threshold": 0,
  "ComparisonOperator": "GreaterThanThreshold",
  "TreatMissingData": "notBreaching",
  "Dimensions": [
    { "Name": "InstanceId", "Value": "$INSTANCE_ID" }
  ],
  "AlarmActions": ["$SNS_TOPIC_ARN"]
}
EOF
)"

# ----------------------------------------------------------------------------
# Cleanup
# ----------------------------------------------------------------------------
rm -rf "$TMP_DIR"

echo ""
echo "==> CloudWatch alarms created!"
echo ""
echo "  Active alarms:"
echo "    kandes-cost-daily      (\$5/day, region: $BILLING_REGION)"
echo "    kandes-cpu-idle        (CPU < 5% for 30 min)"
echo "    kandes-cpu-high        (CPU > 80% for 10 min)"
echo "    kandes-status-check    (Status check failed)"
echo ""
echo "  Pending (cần CloudWatch agent trên EC2):"
echo "    kandes-memory-high     - Memory > 85%"
echo "    kandes-disk-high       - Disk > 85%"
echo ""
echo "  List all alarms:"
echo "    aws cloudwatch describe-alarms --region $REGION --alarm-name-prefix kandes-"
echo "    aws cloudwatch describe-alarms --region $BILLING_REGION --alarm-name-prefix kandes-"
echo ""
