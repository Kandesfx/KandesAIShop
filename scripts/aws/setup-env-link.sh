#!/bin/bash
# ============================================================================
# Kandes.shop — One-time env-link fixup for existing EC2 (D74)
#
# Lý do: D72 setup tạo /opt/kandes/.env.production (root-owned 0600) nhưng
# docker-compose.yml chỉ mount `.env` → container không thấy CRON_SECRET /
# AWS_* / RESEND_API_KEY → cron jobs + DB backup + email OTP fail.
#
# Script này idempotent — chạy nhiều lần OK:
#   - Tạo symlink /opt/kandes/.env.kandes → /opt/kandes/.env.production
#   - Restart containers để pick up env mới
#   - Verify container now có CRON_SECRET
#
# Sau khi commit D74 → trigger deploy workflow như bình thường (script đã
# được nhúng vào setup-ec2-d66.sh §Step 3b cho fresh installs).
#
# Usage (chạy trên EC2):
#   curl -fsSL https://raw.githubusercontent.com/Kandesfx/KandesAIShop/main/scripts/aws/setup-env-link.sh -o setup-env-link.sh
#   chmod +x setup-env-link.sh && ./setup-env-link.sh
# ============================================================================

set -euo pipefail

ENV_FILE="/opt/kandes/.env.production"
LINK_FILE="/opt/kandes/.env.kandes"

echo "==> D74: env-link fixup for kandes-app container..."

if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: $ENV_FILE not found."
    echo "  Run scripts/aws/setup-cron-schedule.sh first (D72)."
    exit 1
fi

cd /opt/kandes

# Step 1: Tạo / verify symlink
if [ -L "$LINK_FILE" ] && [ "$(readlink "$LINK_FILE")" = "$ENV_FILE" ]; then
    echo "    ✓ $LINK_FILE symlink OK"
else
    ln -sf "$ENV_FILE" "$LINK_FILE"
    echo "    ✓ Created symlink $LINK_FILE → $ENV_FILE"
fi

# Step 2: Verify env.production readable qua symlink (linux OK vì mode 0600
# chỉ check owner match — ec2-user KHÔNG đọc được khi root-owned).
# Nếu root-owned thì container cũng đọc qua UID 1001 KHÔNG được. Ta chmod
# file gốc thành 0644 để ec2-user (uid của step này) + container uid 1001
# đều đọc được. Trade-off: root-owned file, ec2-user đọc được — OK vì
# chỉ ec2-user + container đáng tin cậy.
CURRENT_MODE=$(stat -c '%a' "$ENV_FILE")
if [ "$CURRENT_MODE" != "644" ]; then
    sudo chmod 644 "$ENV_FILE"
    echo "    ✓ chmod 644 $ENV_FILE (was $CURRENT_MODE)"
else
    echo "    ✓ $ENV_FILE mode = 644 already"
fi

# Step 3: Restart containers để pick up env_file thêm
echo ""
echo "==> Restart containers..."
sudo docker compose -f docker-compose.yml restart app

echo ""
echo "==> Verify container now has CRON_SECRET..."
sleep 8
if sudo docker exec kandes-app env | grep -q '^CRON_SECRET='; then
    echo "    ✓ CRON_SECRET present in container"
else
    echo "    ✗ CRON_SECRET STILL missing — check docker-compose.yml syntax"
    sudo docker logs kandes-app --tail 30 | head -20
    exit 1
fi

echo ""
echo "==> D74 fix done. Cron jobs (5 EventBridge rules) sẽ chạy ở tick kế tiếp."