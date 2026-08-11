#!/bin/bash
# ============================================================================
# Kandes.shop — First-time EC2 setup script (D66)
# Chạy 1 lần trên EC2 để chuẩn bị môi trường cho D66 (GHCR + docker compose).
#
# Yêu cầu:
#   - EC2 đã chạy Amazon Linux 2/3 hoặc Ubuntu 22.04+
#   - User có sudo hoặc là ec2-user
#   - Docker + docker compose plugin đã cài
#   - GitHub repo: Kandesfx/KandesAIShop
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/Kandesfx/KandesAIShop/main/scripts/aws/setup-ec2-d66.sh -o setup-ec2-d66.sh
#   chmod +x setup-ec2-d66.sh
#   ./setup-ec2-d66.sh
# ============================================================================

set -euo pipefail

# ----------------------------------------------------------------------------
# Sanity checks
# ----------------------------------------------------------------------------
echo "==> Sanity checks..."

if ! command -v docker &> /dev/null; then
    echo "ERROR: docker chưa cài. Cài trước:"
    echo "  Amazon Linux 2023: sudo dnf install -y docker && sudo systemctl start docker"
    echo "  Ubuntu:            sudo apt install -y docker.io docker-compose-plugin && sudo systemctl start docker"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo "ERROR: docker compose plugin chưa cài."
    echo "  sudo apt install -y docker-compose-plugin   # Ubuntu"
    echo "  sudo dnf install -y docker-compose-plugin  # AL2023"
    exit 1
fi

if ! systemctl is-active docker &> /dev/null; then
    echo "WARN: docker daemon chưa chạy. Đang start..."
    sudo systemctl start docker
    sudo systemctl enable docker
fi

echo "    Docker: $(docker --version)"
echo "    Compose: $(docker compose version)"

# ----------------------------------------------------------------------------
# Step 1: Tạo /opt/kandes nếu chưa có
# ----------------------------------------------------------------------------
echo ""
echo "==> Step 1: Setup /opt/kandes directory..."

sudo mkdir -p /opt/kandes
sudo chown -R "$USER:$USER" /opt/kandes
cd /opt/kandes

# Tạo subdirs
mkdir -p certs

# ----------------------------------------------------------------------------
# Step 2: Pull docker-compose.yml + nginx.conf từ repo
# ----------------------------------------------------------------------------
echo ""
echo "==> Step 2: Pull config files from repo..."

curl -fsSL https://raw.githubusercontent.com/Kandesfx/KandesAIShop/main/docker-compose.yml -o docker-compose.yml
curl -fsSL https://raw.githubusercontent.com/Kandesfx/KandesAIShop/main/nginx.conf -o nginx.conf

echo "    docker-compose.yml: $(wc -l < docker-compose.yml) lines"
echo "    nginx.conf:         $(wc -l < nginx.conf) lines"

# ----------------------------------------------------------------------------
# Step 3: Create .env file (nếu chưa có)
# ----------------------------------------------------------------------------
echo ""
echo "==> Step 3: Create .env file (if not exists)..."

if [ ! -f .env ]; then
    cat > .env <<'EOF'
# Kandes.shop — EC2 environment (D66)
# ĐIỀN CÁC GIÁ TRỊ THẬT VÀO ĐÂY. Hoặc copy từ GitHub Secrets:
#   DATABASE_URL
#   SESSION_SECRET / ENCRYPTION_KEY
#   RESEND_API_KEY
#   SEPAY_API_TOKEN / SEPAY_WEBHOOK_SECRET
#   TELEGRAM_BOT_TOKEN / TELEGRAM_ADMIN_CHAT_ID
#   ZALO_OA_ACCESS_TOKEN
#   TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER
#   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
#   R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET
#   SENTRY_DSN
#   LOG_LEVEL

# ===== Database =====
DATABASE_URL="postgresql://kandes:CHANGE_ME@db:5432/kandes_shop?schema=public"
POSTGRES_USER=kandes
POSTGRES_PASSWORD=CHANGE_ME
POSTGRES_DB=kandes_shop

# ===== Application =====
NODE_ENV=production
APP_URL=https://kandes.shop

# ===== Auth =====
SESSION_SECRET=CHANGE_ME_64_HEX_CHARS
ENCRYPTION_KEY=CHANGE_ME_64_HEX_CHARS

# ===== Email =====
EMAIL_PROVIDER=console
RESEND_API_KEY=
EMAIL_FROM="Kandes Shop <no-reply@kandes.shop>"

# ===== SePay =====
SEPAY_API_TOKEN=
SEPAY_WEBHOOK_SECRET=

# ===== Notifications =====
TELEGRAM_BOT_TOKEN=
TELEGRAM_ADMIN_CHAT_ID=
ZALO_OA_ACCESS_TOKEN=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=

# ===== Upstash Redis =====
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# ===== Cloudflare R2 =====
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=

# ===== Sentry =====
SENTRY_DSN=

# ===== Logging =====
LOG_LEVEL=info

# ===== Image (D66) =====
IMAGE=ghcr.io/kandesfx/kandesaishop:latest
EOF
    chmod 600 .env
    echo "    ✅ Created /opt/kandes/.env — BẠN PHẢI EDIT với secrets thật:"
    echo "       sudo nano /opt/kandes/.env"
else
    echo "    /opt/kandes/.env already exists, skipping."
fi

# ----------------------------------------------------------------------------
# Step 3b: Symlink `.env.kandes` → `.env.production` (full env set)
# ----------------------------------------------------------------------------
# File `.env.production` chứa toàn bộ secrets (DATABASE_URL, CRON_SECRET, AWS_*,
# RESEND_API_KEY, TELEGRAM_*, SEPAY_*, v.v.). Per D72 setup nó được tạo root-owned
# mode 0600. Container kandes-app chạy non-root UID 1001 không đọc được trực tiếp.
# Tạo symlink `/opt/kandes/.env.kandes` (mode 0644) để:
#   - Giữ quyền root 0600 trên `.env.production` (an toàn)
#   - Container đọc được qua `.env.kandes`
# Idempotent: nếu symlink đã tồn tại thì skip. Xem DOCS_AUDIT.md §3.2.
if [ -f /opt/kandes/.env.production ]; then
    if [ -L /opt/kandes/.env.kandes ] && [ "$(readlink /opt/kandes/.env.kandes)" = "/opt/kandes/.env.production" ]; then
        echo "    /opt/kandes/.env.kandes symlink already exists."
    else
        sudo ln -s /opt/kandes/.env.production /opt/kandes/.env.kandes
        echo "    ✅ Created symlink /opt/kandes/.env.kandes → /opt/kandes/.env.production"
    fi
else
    echo "    /opt/kandes/.env.production NOT FOUND — container sẽ chỉ có .env (4 keys)."
    echo "    Để cron/backup-db/email hoạt động, follow `setup-cron-schedule.sh` để tạo file này."
fi

# ----------------------------------------------------------------------------
# Step 4: Pre-pull base images (warm cache)
# ----------------------------------------------------------------------------
echo ""
echo "==> Step 4: Pre-pull base images (warm cache)..."

docker pull ghcr.io/kandesfx/kandesaishop:latest || echo "    WARN: latest image not yet built (OK nếu chưa push)"
docker pull nginx:1.27-alpine
docker pull postgres:16-alpine

# ----------------------------------------------------------------------------
# Step 5: Login GHCR (yêu cầu user nhập PAT)
# ----------------------------------------------------------------------------
echo ""
echo "==> Step 5: GitHub Container Registry login"
echo ""
echo "Để EC2 pull được private/public image từ ghcr.io, cần đăng nhập 1 lần:"
echo ""
echo "  1. Tạo GitHub PAT tại: https://github.com/settings/tokens/new"
echo "     - Note: 'EC2 kandes GHCR pull'"
echo "     - Scopes: ✅ read:packages"
echo "  2. Chạy lệnh:"
echo "       echo '<YOUR_PAT>' | docker login ghcr.io -u <YOUR_GITHUB_USERNAME> --password-stdin"
echo ""
echo "  Nếu image public thì skip bước này (docker pull vẫn work)."
echo ""

# ----------------------------------------------------------------------------
# Step 6: Register GitHub self-hosted runner (nếu chưa có)
# ----------------------------------------------------------------------------
echo ""
echo "==> Step 6: GitHub Actions self-hosted runner (if not yet registered)"
echo ""
echo "Nếu self-hosted runner chưa được cài, làm theo:"
echo "  1. Repo → Settings → Actions → Runners → New self-hosted runner"
echo "  2. Chọn OS Linux + x64, copy script và chạy trên EC2"
echo "  3. Runner sẽ tự động start mỗi lần reboot (nếu dùng --service)"
echo ""
echo "Quy trình khuyến nghị:"
echo "  sudo ./svc.sh install   # cài systemd service"
echo "  sudo ./svc.sh start     # start"
echo "  sudo ./svc.sh status    # kiểm tra"
echo ""

# ----------------------------------------------------------------------------
# Step 7: Test thử docker compose up (skip nếu chưa có secrets thật)
# ----------------------------------------------------------------------------
echo ""
echo "==> Step 7: Smoke test (optional)"
echo ""
echo "Sau khi điền secrets thật vào /opt/kandes/.env, test bằng:"
echo "  cd /opt/kandes"
echo "  docker compose up -d"
echo "  docker compose ps"
echo "  docker compose logs -f app"
echo ""
echo "Kiểm tra health check:"
echo "  sleep 20 && curl -s http://localhost:3000/api/health"
echo ""

# ----------------------------------------------------------------------------
# Step 8: Auto-stop schedule (D64) — optional
# ----------------------------------------------------------------------------
echo ""
echo "==> Step 8: Optional — Auto-stop schedule (D64)"
echo ""
echo "Để tiết kiệm 67% cost, chạy:"
echo "  export KANDES_INSTANCE_ID=i-XXXXX"
echo "  export KANDES_SNS_TOPIC_ARN=arn:aws:sns:..."
echo "  curl -fsSL https://raw.githubusercontent.com/Kandesfx/KandesAIShop/main/scripts/aws/schedule-stop-start.sh -o /tmp/schedule.sh"
echo "  chmod +x /tmp/schedule.sh && /tmp/schedule.sh"
echo ""

echo "==> Done! EC2 ready for D66 deployment."
echo ""
echo "Next steps:"
echo "  1. Edit /opt/kandes/.env với secrets thật"
echo "  2. docker login ghcr.io (nếu image private)"
echo "  3. Đăng ký self-hosted runner trên GitHub"
echo "  4. Push code lên main → GitHub Actions tự build + deploy"
