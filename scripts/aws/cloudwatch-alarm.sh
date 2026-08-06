#!/bin/bash
# ============================================================================
# Kandes.shop — CloudWatch Alarms (instance health + cost)
# D64 (CONTEXT.md §7): Comprehensive monitoring
#
# Alarms:
#   1. EstimatedCharges > $5/day (threshold)
#   2. CPU < 5% trong 30 min (idle - notify, don't stop auto)
#   3. CPU > 80% trong 10 min (overload - notify)
#   4. Status check failed (urgent)
#
# All alarms → SNS topic → email + telegram
#
# Requirements:
#   - AWS CLI configured
#   - SNS topic created (kandes-cost-alerts)
#   - IAM permissions: cloudwatch:*, sns:*
#
# Usage:
#   ./scripts/aws/cloudwatch-alarm.sh
# ============================================================================

set -euo pipefail

# ----------------------------------------------------------------------------
# Config
# ----------------------------------------------------------------------------
INSTANCE_ID="${KANDES_INSTANCE_ID:-i-XXXXX}"
REGION="ap-southeast-1"
SNS_TOPIC_ARN="${KANDES_SNS_TOPIC_ARN:-arn:aws:sns:ap-southeast-1:XXXXX:kandes-cost-alerts}"

if [ "$INSTANCE_ID" = "i-XXXXX" ]; then
  echo "ERROR: Set KANDES_INSTANCE_ID environment variable first:"
  echo "  export KANDES_INSTANCE_ID=i-0123456789abcdef0"
  exit 1
fi

echo "==> Creating CloudWatch alarms for instance: $INSTANCE_ID"
echo ""

# ----------------------------------------------------------------------------
# Alarm 1: Estimated charges
# ----------------------------------------------------------------------------
echo "==> Alarm 1: EstimatedCharges > \$5/day"

aws cloudwatch put-metric-alarm \
  --alarm-name "kandes-cost-daily" \
  --alarm-description "Daily EC2 cost > \$5 USD" \
  --metric-name "EstimatedCharges" \
  --namespace "AWS/Billing" \
  --statistic "Maximum" \
  --period 21600 \
  --evaluation-periods 1 \
  --threshold 5 \
  --comparison-operator "GreaterThanThreshold" \
  --dimensions "Name=Service,Value=AmazonEC2 Name=LinkedAccount,Value=$(aws sts get-caller-identity --query Account --output text)" \
  --alarm-actions "$SNS_TOPIC_ARN" \
  --treat-missing-data "notBreaching" \
  --region us-east-1 \
  > /dev/null

echo "    Created: kandes-cost-daily"

# ----------------------------------------------------------------------------
# Alarm 2: CPU idle (low utilization warning)
# ----------------------------------------------------------------------------
echo "==> Alarm 2: CPU < 5% trong 30 min (idle warning)"

aws cloudwatch put-metric-alarm \
  --alarm-name "kandes-cpu-idle" \
  --alarm-description "CPU < 5% for 30 min - over-provisioned?" \
  --metric-name "CPUUtilization" \
  --namespace "AWS/EC2" \
  --statistic "Average" \
  --period 300 \
  --evaluation-periods 6 \
  --threshold 5 \
  --comparison-operator "LessThanThreshold" \
  --dimensions "Name=InstanceId,Value=$INSTANCE_ID" \
  --alarm-actions "$SNS_TOPIC_ARN" \
  --treat-missing-data "breaching" \
  --region "$REGION" \
  > /dev/null

echo "    Created: kandes-cpu-idle"

# ----------------------------------------------------------------------------
# Alarm 3: CPU high (overload warning)
# ----------------------------------------------------------------------------
echo "==> Alarm 3: CPU > 80% trong 10 min (overload)"

aws cloudwatch put-metric-alarm \
  --alarm-name "kandes-cpu-high" \
  --alarm-description "CPU > 80% for 10 min - consider upgrade?" \
  --metric-name "CPUUtilization" \
  --namespace "AWS/EC2" \
  --statistic "Average" \
  --period 60 \
  --evaluation-periods 10 \
  --threshold 80 \
  --comparison-operator "GreaterThanThreshold" \
  --dimensions "Name=InstanceId,Value=$INSTANCE_ID" \
  --alarm-actions "$SNS_TOPIC_ARN" \
  --treat-missing-data "notBreaching" \
  --region "$REGION" \
  > /dev/null

echo "    Created: kandes-cpu-high"

# ----------------------------------------------------------------------------
# Alarm 4: Status check failed
# ----------------------------------------------------------------------------
echo "==> Alarm 4: StatusCheck failed (urgent)"

aws cloudwatch put-metric-alarm \
  --alarm-name "kandes-status-check" \
  --alarm-description "EC2 status check failed - urgent!" \
  --metric-name "StatusCheckFailed" \
  --namespace "AWS/EC2" \
  --statistic "Maximum" \
  --period 60 \
  --evaluation-periods 2 \
  --threshold 0 \
  --comparison-operator "GreaterThanThreshold" \
  --dimensions "Name=InstanceId,Value=$INSTANCE_ID" \
  --alarm-actions "$SNS_TOPIC_ARN" \
  --treat-missing-data "notBreaching" \
  --region "$REGION" \
  > /dev/null

echo "    Created: kandes-status-check"

# ----------------------------------------------------------------------------
# Alarm 5: Memory high (custom metric - cần CloudWatch agent)
# ----------------------------------------------------------------------------
echo "==> Alarm 5: Memory > 85% (cần CloudWatch agent trên EC2)"

cat <<'EOF'
NOTE: Alarm này cần CloudWatch agent cài trên EC2 để collect memory metric.

Steps để enable:
  1. SSH vào EC2
  2. sudo amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s
  3. Config file: /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
  4. Metrics to collect:
     - mem_used_percent
     - mem_available_percent
  5. Restart agent: sudo systemctl restart amazon-cloudwatch-agent

Sau đó chạy lại script này với flag --enable-memory-alarm
EOF

# ----------------------------------------------------------------------------
# Alarm 6: Disk space (custom metric - cần CloudWatch agent)
# ----------------------------------------------------------------------------
echo "==> Alarm 6: Disk > 85% (cần CloudWatch agent trên EC2)"

cat <<'EOF'
NOTE: Alarm này cần CloudWatch agent.

Steps để enable:
  1. Cài CloudWatch agent (xem alarm 5)
  2. Add disk_used_percent metric
  3. Threshold 85%, period 300s, eval 2 periods
EOF

echo ""
echo "==> CloudWatch alarms created!"
echo ""
echo "  Active alarms:"
echo "    kandes-cost-daily      - Daily cost > \$5"
echo "    kandes-cpu-idle        - CPU < 5% for 30 min"
echo "    kandes-cpu-high        - CPU > 80% for 10 min"
echo "    kandes-status-check    - Status check failed"
echo ""
echo "  Pending (cần CloudWatch agent trên EC2):"
echo "    kandes-memory-high     - Memory > 85%"
echo "    kandes-disk-high       - Disk > 85%"
echo ""
echo "  List all alarms:"
echo "    aws cloudwatch describe-alarms --region $REGION \\"
echo "      --alarm-name-prefix kandes-"
echo ""
