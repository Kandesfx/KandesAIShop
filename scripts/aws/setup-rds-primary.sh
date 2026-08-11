#!/bin/bash
# ============================================================================
# Kandes.shop — Verify and update DATABASE_URL → RDS
# D70 (CONTEXT.md §7): Consolidate DB primary tới RDS Postgres.
#
# RDS hiện tại:
#   Endpoint: kandes-db.crmca6kou3xz.ap-southeast-1.rds.amazonaws.com:5432
#   Engine:   postgres (db.t3.micro)
#   Status:   available
#
# Steps:
#   1. Verify RDS reachable từ EC2 (via SSM port forward hoặc direct curl)
#   2. Verify Prisma schema hiện tại apply thành công lên RDS
#   3. Update GitHub Secret DATABASE_URL (instruct user)
#   4. Update /opt/kandes/.env trên EC2 (instruct user)
#   5. (Optional) Backup data từ container postgres (nếu có data thật)
#   6. Xóa service `db` khỏi docker-compose.yml (đã làm sẵn trong commit)
#
# Requirements:
#   - AWS CLI configured
#   - RDS security group cho phép EC2 security group inbound 5432
#   - Prisma schema + migrations
#
# Usage:
#   ./scripts/aws/setup-rds-primary.sh
# ============================================================================

set -euo pipefail

REGION="ap-southeast-1"
RDS_ENDPOINT="kandes-db.crmca6kou3xz.ap-southeast-1.rds.amazonaws.com"
RDS_PORT="5432"
EC2_INSTANCE_ID="i-0a6fca834c9429bca"
EC2_SG="sg-0748ca482f2f9f073"
RDS_USER="${KANDES_DB_USER:-kandes}"
RDS_DB_NAME="${KANDES_DB_NAME:-kandes_shop}"

echo "==> RDS primary DB setup helper"
echo "    RDS:    $RDS_ENDPOINT:$RDS_PORT"
echo "    User:   $RDS_USER"
echo "    DB:     $RDS_DB_NAME"
echo ""

# ----------------------------------------------------------------------------
# Step 1: Check RDS reachable + status
# ----------------------------------------------------------------------------
echo "==> Step 1: Verify RDS status..."

RDS_STATUS=$(aws rds describe-db-instances \
  --db-instance-identifier kandes-db \
  --region "$REGION" \
  --query 'DBInstances[0].DBInstanceStatus' \
  --output text)

if [ "$RDS_STATUS" != "available" ]; then
  echo "    ERROR: RDS status is '$RDS_STATUS' (expected 'available'). Aborting."
  exit 1
fi

echo "    ✓ RDS available"

# ----------------------------------------------------------------------------
# Step 2: Check RDS security group allow EC2 SG inbound 5432
# ----------------------------------------------------------------------------
echo ""
echo "==> Step 2: Verify RDS security group allows EC2..."

RDS_VPC_SG=$(aws rds describe-db-instances \
  --db-instance-identifier kandes-db \
  --region "$REGION" \
  --query 'DBInstances[0].VpcSecurityGroups[0].VpcSecurityGroupId' \
  --output text)

echo "    RDS SG: $RDS_VPC_SG"
echo "    EC2 SG: $EC2_SG"

if [ "$RDS_VPC_SG" = "$EC2_SG" ] || [ "$RDS_VPC_SG" = "None" ]; then
  echo "    ⚠️  RDS SG equals EC2 SG (or default). Need to add explicit ingress rule."
  echo ""
  echo "    Run:"
  echo "      aws ec2 authorize-security-group-ingress \\"
  echo "        --group-id $RDS_VPC_SG \\"
  echo "        --protocol tcp --port 5432 \\"
  echo "        --source-group $EC2_SG \\"
  echo "        --region $REGION"
else
  # Check if RDS SG allows inbound from EC2 SG on 5432
  ALLOWED=$(aws ec2 describe-security-groups \
    --group-ids "$RDS_VPC_SG" \
    --region "$REGION" \
    --query "SecurityGroups[0].IpPermissions[?FromPort==\`5432\` && ToPort==\`5432\`].UserIdGroupPairs[?GroupId==\`$EC2_SG\`].GroupId" \
    --output text)

  if [ "$ALLOWED" = "$EC2_SG" ]; then
    echo "    ✓ RDS SG allows 5432 from EC2 SG"
  else
    echo "    ⚠️  RDS SG does NOT allow 5432 from EC2 SG. Need to add rule."
    echo ""
    echo "    Run:"
    echo "      aws ec2 authorize-security-group-ingress \\"
    echo "        --group-id $RDS_VPC_SG \\"
    echo "        --protocol tcp --port 5432 \\"
    echo "        --source-group $EC2_SG \\"
    echo "        --region $REGION"
  fi
fi

# ----------------------------------------------------------------------------
# Step 3: Test connection từ local (nếu có psql)
# ----------------------------------------------------------------------------
echo ""
echo "==> Step 3: Test connection (local — chỉ khi có psql + password)..."

if command -v psql > /dev/null && [ -n "${KANDES_DB_PASSWORD:-}" ]; then
  echo "    Testing connection..."
  PGPASSWORD="$KANDES_DB_PASSWORD" psql \
    -h "$RDS_ENDPOINT" \
    -p "$RDS_PORT" \
    -U "$RDS_USER" \
    -d "$RDS_DB_NAME" \
    -c "SELECT version();" \
    --no-password \
    || echo "    ⚠️  Connection failed. Check password + SG rules."
else
  echo "    ⏭️  Skipped (psql not installed OR KANDES_DB_PASSWORD not set)"
  echo "    To test manually:"
  echo "      PGPASSWORD='<password>' psql -h $RDS_ENDPOINT -U $RDS_USER -d $RDS_DB_NAME -c 'SELECT version();'"
fi

# ----------------------------------------------------------------------------
# Step 4: Print instructions
# ----------------------------------------------------------------------------
echo ""
echo "==> Step 4: Update DATABASE_URL"
echo ""
echo "New DATABASE_URL format:"
echo "  DATABASE_URL=postgresql://$RDS_USER:<password>@$RDS_ENDPOINT:$RDS_PORT/$RDS_DB_NAME?schema=public"
echo ""
echo "Update 2 chỗ:"
echo "  (a) GitHub Secret DATABASE_URL:"
echo "      https://github.com/Kandesfx/KandesAIShop/settings/secrets/actions"
echo "      Click 'DATABASE_URL' → 'Update' → paste new value → Save"
echo ""
echo "  (b) /opt/kandes/.env trên EC2 (qua SSM Session Manager hoặc SSH):"
echo "      ssh ec2-user@13.215.39.207"
echo "      sudo nano /opt/kandes/.env"
echo "      # Thay DATABASE_URL=..."
echo ""
echo "==> Step 5: Apply Prisma migrations lên RDS"
echo ""
echo "Option A — Chạy từ EC2 (recommended):"
echo "  cd /opt/kandes"
echo "  docker compose run --rm app npx prisma migrate deploy"
echo ""
echo "Option B — Chạy local rồi apply:"
echo "  DATABASE_URL='<new-rds-url>' npx prisma migrate deploy"
echo ""
echo "==> Step 6: Verify deploy workflow"
echo ""
echo "  Sau khi update DATABASE_URL, push 1 commit dummy để trigger deploy."
echo "  Workflow sẽ:"
echo "    1. Build image (GH-hosted) ✓"
echo "    2. Pull image (EC2) ✓"
echo "    3. prisma migrate deploy → apply lên RDS (EC2 reach RDS via SG rule) ✓"
echo "    4. docker compose up -d app ✓"
echo "    5. Health check ✓"
echo ""
echo "==> Step 7: Cleanup container postgres (optional, sau khi verify OK)"
echo ""
echo "  Sau khi verify app work với RDS 1-2 ngày:"
echo "    docker compose down  # stop all services"
echo "    # Edit /opt/kandes/docker-compose.yml: comment out / xóa `db` service"
echo "    # Edit volumes section: xóa `postgres-data`"
echo "    docker compose up -d  # restart without db"
echo ""
echo "  Verify RDS không còn traffic từ docker network:"
echo "    aws cloudwatch get-metric-statistics \\"
echo "      --namespace AWS/RDS --metric-name DatabaseConnections \\"
echo "      --dimensions Name=DBInstanceIdentifier,Value=kandes-db \\"
echo "      --start-time <iso-now-1h> --end-time <iso-now> \\"
echo "      --period 300 --statistics Average --region $REGION"
echo ""