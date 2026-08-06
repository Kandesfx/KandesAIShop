#!/bin/bash
# ============================================================================
# Kandes.shop — Migrate Instance Type (t3.micro → m7i-flex.large)
# D62 (CONTEXT.md §7): Upgrade instance for production performance
#
# Steps:
#   1. Snapshot EBS volume (backup)
#   2. Stop instance
#   3. Change instance type to m7i-flex.large
#   4. Start instance
#   5. Verify health
#
# Requirements:
#   - AWS CLI configured
#   - IAM permissions: ec2:*
#   - Elastic IP associated with current instance
#
# Usage:
#   export KANDES_INSTANCE_ID=i-0123456789abcdef0
#   ./scripts/aws/migrate-instance.sh
#
# Rollback:
#   ./scripts/aws/migrate-instance.sh --rollback
# ============================================================================

set -euo pipefail

# ----------------------------------------------------------------------------
# Config
# ----------------------------------------------------------------------------
INSTANCE_ID="${KANDES_INSTANCE_ID:-i-XXXXX}"
REGION="ap-southeast-1"
NEW_TYPE="m7i-flex.large"
OLD_TYPE="t3.micro"

# Parse args
ROLLBACK=false
if [ "${1:-}" = "--rollback" ]; then
  ROLLBACK=true
  echo "==> ROLLBACK mode: changing back to $OLD_TYPE"
fi

if [ "$INSTANCE_ID" = "i-XXXXX" ]; then
  echo "ERROR: Set KANDES_INSTANCE_ID environment variable first:"
  echo "  export KANDES_INSTANCE_ID=i-0123456789abcdef0"
  exit 1
fi

# ----------------------------------------------------------------------------
# Pre-flight
# ----------------------------------------------------------------------------
echo "==> Checking current instance state..."
CURRENT_TYPE=$(aws ec2 describe-instances \
  --instance-ids "$INSTANCE_ID" \
  --region "$REGION" \
  --query 'Reservations[0].Instances[0].InstanceType' \
  --output text)

STATE=$(aws ec2 describe-instances \
  --instance-ids "$INSTANCE_ID" \
  --region "$REGION" \
  --query 'Reservations[0].Instances[0].State.Name' \
  --output text)

echo "    Current type: $CURRENT_TYPE"
echo "    Current state: $STATE"
echo ""

if [ "$STATE" != "stopped" ] && [ "$STATE" != "running" ]; then
  echo "ERROR: Instance is in $STATE state. Cannot proceed."
  exit 1
fi

# Determine target type
if [ "$ROLLBACK" = true ]; then
  TARGET_TYPE="$OLD_TYPE"
  if [ "$CURRENT_TYPE" = "$OLD_TYPE" ]; then
    echo "Instance is already $OLD_TYPE. Nothing to rollback."
    exit 0
  fi
else
  TARGET_TYPE="$NEW_TYPE"
  if [ "$CURRENT_TYPE" = "$NEW_TYPE" ]; then
    echo "Instance is already $NEW_TYPE. Nothing to migrate."
    exit 0
  fi
fi

# ----------------------------------------------------------------------------
# Confirm with user
# ----------------------------------------------------------------------------
echo "==> Migration plan:"
echo "    From: $CURRENT_TYPE"
echo "    To:   $TARGET_TYPE"
echo ""
echo "    Downtime: ~2 minutes"
echo "    Data preservation: 100% (EBS volume attached)"
echo ""

read -p "Continue? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

# ----------------------------------------------------------------------------
# Step 1: Snapshot EBS volume
# ----------------------------------------------------------------------------
echo "==> Step 1: Creating EBS snapshot..."

VOLUME_ID=$(aws ec2 describe-instances \
  --instance-ids "$INSTANCE_ID" \
  --region "$REGION" \
  --query 'Reservations[0].Instances[0].BlockDeviceMappings[0].Ebs.VolumeId' \
  --output text)

SNAPSHOT_DESC="pre-migration-$CURRENT_TYPE-to-$TARGET_TYPE-$(date +%Y%m%d)"

SNAPSHOT_ID=$(aws ec2 create-snapshot \
  --volume-id "$VOLUME_ID" \
  --description "$SNAPSHOT_DESC" \
  --region "$REGION" \
  --tag-specifications "ResourceType=snapshot,Tags=[{Key=Name,Value=kandes-migration-$(date +%Y%m%d)},{Key=Purpose,Value=migration-backup}]" \
  --query 'SnapshotId' --output text)

echo "    Snapshot ID: $SNAPSHOT_ID"
echo "    Waiting for snapshot to complete..."

aws ec2 wait snapshot-completed \
  --snapshot-ids "$SNAPSHOT_ID" \
  --region "$REGION"

echo "    Snapshot complete."

# ----------------------------------------------------------------------------
# Step 2: Stop instance
# ----------------------------------------------------------------------------
if [ "$STATE" = "running" ]; then
  echo "==> Step 2: Stopping instance..."
  aws ec2 stop-instances \
    --instance-ids "$INSTANCE_ID" \
    --region "$REGION" \
    > /dev/null

  aws ec2 wait instance-stopped \
    --instance-ids "$INSTANCE_ID" \
    --region "$REGION"

  echo "    Instance stopped."
else
  echo "==> Step 2: Instance already stopped."
fi

# ----------------------------------------------------------------------------
# Step 3: Change instance type
# ----------------------------------------------------------------------------
echo "==> Step 3: Changing instance type to $TARGET_TYPE..."

aws ec2 modify-instance-attribute \
  --instance-id "$INSTANCE_ID" \
  --instance-type "{\"Value\": \"$TARGET_TYPE\"}" \
  --region "$REGION" \
  > /dev/null

echo "    Instance type updated."

# ----------------------------------------------------------------------------
# Step 4: Start instance
# ----------------------------------------------------------------------------
echo "==> Step 4: Starting instance..."

aws ec2 start-instances \
  --instance-ids "$INSTANCE_ID" \
  --region "$REGION" \
  > /dev/null

aws ec2 wait instance-running \
  --instance-ids "$INSTANCE_ID" \
  --region "$REGION"

# Get new IP
NEW_IP=$(aws ec2 describe-instances \
  --instance-ids "$INSTANCE_ID" \
  --region "$REGION" \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

echo "    Instance running."
echo "    New IP: $NEW_IP"

# ----------------------------------------------------------------------------
# Step 5: Health check
# ----------------------------------------------------------------------------
echo "==> Step 5: Waiting for app to be ready..."

ATTEMPTS=0
MAX_ATTEMPTS=30
until curl -sf "http://$NEW_IP/api/health" > /dev/null 2>&1; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ $ATTEMPTS -ge $MAX_ATTEMPTS ]; then
    echo "ERROR: App did not become healthy within $((MAX_ATTEMPTS * 10)) seconds."
    echo "Check logs: ssh -i ~/.ssh/kandes-prod.pem ec2-user@$NEW_IP 'docker logs kandes-app'"
    exit 1
  fi
  echo "    Waiting... ($ATTEMPTS/$MAX_ATTEMPTS)"
  sleep 10
done

echo "    App is healthy!"
echo ""

# ----------------------------------------------------------------------------
# Summary
# ----------------------------------------------------------------------------
echo "=========================================="
echo "Migration complete!"
echo "=========================================="
echo ""
echo "  Before: $CURRENT_TYPE"
echo "  After:  $TARGET_TYPE"
echo "  IP:     $NEW_IP"
echo ""
echo "  Estimated cost (24/7):"
if [ "$TARGET_TYPE" = "m7i-flex.large" ]; then
  echo "    $89.7/mo full-time"
  echo "    $28.7/mo with auto-stop schedule (8h/day)"
  echo ""
  echo "  Next steps:"
  echo "    1. Verify performance: ./scripts/aws/benchmark.sh"
  echo "    2. Enable auto-stop: ./scripts/aws/schedule-stop-start.sh"
  echo "    3. Setup budget alarm: ./scripts/aws/budget-alarm.sh"
elif [ "$TARGET_TYPE" = "t3.micro" ]; then
  echo "    $9.6/mo (Free Tier eligible)"
  echo ""
  echo "  Rollback complete. Instance back to $OLD_TYPE."
fi
echo ""
echo "  Backup snapshot: $SNAPSHOT_ID"
echo "  (Delete after 7 days if stable: aws ec2 delete-snapshot --snapshot-id $SNAPSHOT_ID)"
echo ""
