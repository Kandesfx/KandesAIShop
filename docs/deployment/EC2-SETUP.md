# EC2 Setup Guide — D66 (Build/Deploy Split)

> **Mục đích:** Hướng dẫn từng bước setup EC2 để chạy Kandes.shop theo D66
> (build ở GitHub, deploy ở EC2).
>
> **Đối tượng:** User đã có EC2 chạy m7i-flex.large (D62) và muốn giữ nguyên
> hoặc hạ xuống t3.small (D67).
>
> **Thời gian ước tính:** 30-45 phút (one-time).

---

## 1. Tổng quan flow

```
┌─────────────────────────────────────────────────────────────┐
│ Code push lên main                                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ GitHub Actions (ubuntu-latest, FREE)                        │
│ • Checkout code                                             │
│ • Build Docker image (multi-stage, ~5-8 min)               │
│ • Push image lên ghcr.io/Kandesfx/KandesAIShop:latest       │
└─────────────────────┬───────────────────────────────────────┘
                      │ docker pull :latest
                      ▼
┌─────────────────────────────────────────────────────────────┐
│ EC2 (self-hosted runner)                                    │
│ • docker pull image                                         │
│ • docker compose up -d                                      │
│ • Health check → Telegram notify                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Prerequisites (one-time trước khi chạy)

Bạn cần các thứ sau đã có sẵn:

- [x] EC2 instance đang chạy (Amazon Linux 2023 hoặc Ubuntu 22.04+)
- [x] SSH key để access EC2
- [x] Security Group mở port 80, 443 (cho Nginx reverse proxy)
- [x] Docker + docker compose plugin đã cài
- [x] Domain `kandes.shop` đã trỏ về EC2 IP (qua Route 53 hoặc CloudFront)
- [x] GitHub repo `Kandesfx/KandesAIShop` (đã có)

Nếu thiếu Docker, cài nhanh:

```bash
# Amazon Linux 2023
sudo dnf install -y docker docker-compose-plugin
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user  # rồi logout/login lại

# Ubuntu 22.04+
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ubuntu
```

---

## 3. Setup trên EC2 (chạy 1 lần)

### Bước 1: SSH vào EC2

```bash
ssh -i ~/.ssh/your-key.pem ec2-user@<EC2_IP>
```

### Bước 2: Tạo thư mục `/opt/kandes`

```bash
sudo mkdir -p /opt/kandes
sudo chown -R $USER:$USER /opt/kandes
cd /opt/kandes
```

### Bước 3: Download config files

```bash
curl -fsSL https://raw.githubusercontent.com/Kandesfx/KandesAIShop/main/docker-compose.yml -o docker-compose.yml
curl -fsSL https://raw.githubusercontent.com/Kandesfx/KandesAIShop/main/nginx.conf -o nginx.conf
mkdir -p certs
```

Verify files downloaded:

```bash
ls -la /opt/kandes/
# Phải thấy: docker-compose.yml, nginx.conf, certs/
```

### Bước 4: Tạo `.env` với secrets thật

```bash
nano /opt/kandes/.env
```

Copy nội dung từ `CONTEXT.md` § Environment hoặc từ GitHub Secrets, ví dụ:

```ini
# ===== Database =====
DATABASE_URL="postgresql://kandes:YOUR_PASSWORD@db:5432/kandes_shop?schema=public"
POSTGRES_USER=kandes
POSTGRES_PASSWORD=YOUR_PASSWORD
POSTGRES_DB=kandes_shop

# ===== Application =====
NODE_ENV=production
APP_URL=https://kandes.shop

# ===== Auth =====
SESSION_SECRET=<copy-từ-GitHub-Secrets>
ENCRYPTION_KEY=<copy-từ-GitHub-Secrets>

# ===== Email =====
EMAIL_PROVIDER=resend
RESEND_API_KEY=<copy-từ-GitHub-Secrets>
EMAIL_FROM="Kandes Shop <no-reply@kandes.shop>"

# ===== SePay =====
SEPAY_API_TOKEN=<copy-từ-GitHub-Secrets>
SEPAY_WEBHOOK_SECRET=<copy-từ-GitHub-Secrets>

# ===== Notifications =====
TELEGRAM_BOT_TOKEN=<copy-từ-GitHub-Secrets>
TELEGRAM_ADMIN_CHAT_ID=<copy-từ-GitHub-Secrets>
ZALO_OA_ACCESS_TOKEN=<copy-từ-GitHub-Secrets>
TWILIO_ACCOUNT_SID=<copy-từ-GitHub-Secrets>
TWILIO_AUTH_TOKEN=<copy-từ-GitHub-Secrets>
TWILIO_FROM_NUMBER=<copy-từ-GitHub-Secrets>

# ===== Upstash Redis =====
UPSTASH_REDIS_REST_URL=<copy-từ-GitHub-Secrets>
UPSTASH_REDIS_REST_TOKEN=<copy-từ-GitHub-Secrets>

# ===== Cloudflare R2 =====
R2_ACCOUNT_ID=<copy-từ-GitHub-Secrets>
R2_ACCESS_KEY_ID=<copy-từ-GitHub-Secrets>
R2_SECRET_ACCESS_KEY=<copy-từ-GitHub-Secrets>
R2_BUCKET=<copy-từ-GitHub-Secrets>

# ===== Sentry =====
SENTRY_DSN=<copy-từ-GitHub-Secrets>

# ===== Logging =====
LOG_LEVEL=info

# ===== Image (D66) =====
IMAGE=ghcr.io/kandesfx/kandesaishop:latest
```

Save: `Ctrl+O`, Enter, `Ctrl+X`

Set permissions:

```bash
chmod 600 /opt/kandes/.env
```

### Bước 5: Setup TLS certs

Nếu dùng Let's Encrypt (khuyến nghị):

```bash
# Cài certbot
sudo dnf install -y certbot  # Amazon Linux 2023
# hoặc: sudo apt install -y certbot  # Ubuntu

# Lấy cert (standalone cần stop nginx trước)
sudo certbot certonly --standalone -d kandes.shop -d api.kandes.shop -d www.kandes.shop

# Copy vào /opt/kandes/certs (đặt tên đúng nginx.conf expects)
sudo cp /etc/letsencrypt/live/kandes.shop/fullchain.pem /opt/kandes/certs/
sudo cp /etc/letsencrypt/live/kandes.shop/privkey.pem /opt/kandes/certs/
sudo chown -R $USER:$USER /opt/kandes/certs
```

Nếu dùng self-signed (chỉ để test):

```bash
mkdir -p /opt/kandes/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /opt/kandes/certs/privkey.pem \
  -out /opt/kandes/certs/fullchain.pem \
  -subj "/CN=kandes.shop"
chmod 600 /opt/kandes/certs/*.pem
```

### Bước 6: GitHub Container Registry login

**Cách 1: Image public** (mặc định nếu repo public) → skip bước này.

**Cách 2: Image private** hoặc muốn chắc chắn:

```bash
# Tạo GitHub PAT:
#   https://github.com/settings/tokens/new
#   Note: 'EC2 kandes GHCR pull'
#   Scopes: ✅ read:packages
#   (KHÔNG cần repo scope)
#
# Click "Generate token" → copy token (chỉ hiện 1 lần)

echo "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

Verify đăng nhập thành công:

```bash
docker pull ghcr.io/kandesfx/kandesaishop:latest
# Nếu chưa push image, sẽ báo "manifest unknown" → OK
# Nếu image đã push, sẽ download về
```

### Bước 7: Pre-pull base images

```bash
docker pull nginx:1.27-alpine
docker pull postgres:16-alpine
```

### Bước 8: Đăng ký GitHub self-hosted runner

Nếu đã có runner thì skip:

1. Mở: `https://github.com/Kandesfx/KandesAIShop/settings/actions/runners/new`
2. Chọn **Linux** + **x64**
3. Copy script trong khung hướng dẫn và chạy trên EC2:

```bash
mkdir -p ~/actions-runner && cd ~/actions-runner
curl -o actions-runner-linux-x64-2.319.1.tar.gz -L https://github.com/actions/runner/releases/download/v2.319.1/actions-runner-linux-x64-2.319.1.tar.gz
tar xzf ./actions-runner-linux-x64-2.319.1.tar.gz
./config.sh --url https://github.com/Kandesfx/KandesAIShop --token <TOKEN_FROM_GITHUB>
# Trả lời "kandes" khi hỏi labels

# Install as systemd service (auto-restart on reboot)
sudo ./svc.sh install
sudo ./svc.sh start
sudo ./svc.sh status  # phải thấy "Active: active (running)"
```

### Bước 9: Test docker compose up

```bash
cd /opt/kandes
docker compose up -d
docker compose ps
docker compose logs -f app
```

Đợi 15-30 giây, verify:

```bash
curl -s http://localhost:3000/api/health
# Phải trả về: {"status":"ok","timestamp":"..."}

# Hoặc nếu đã setup nginx + certs:
curl -s https://kandes.shop/api/health
```

---

## 4. Setup GitHub repo (one-time)

### Bước 1: Bật GitHub Actions permissions

1. Vào: `https://github.com/Kandesfx/KandesAIShop/settings/actions`
2. Section **"Workflow permissions"**
3. Chọn: **"Read and write permissions"**
4. ✅ Check **"Allow GitHub Actions to create and approve pull requests"**
5. Click **Save**

### Bước 2: Config GHCR visibility

1. Vào: `https://github.com/Kandesfx/KandesAIShop/settings/packages`
2. Section **"Package creation"**
3. Chọn visibility mặc định:
   - **Public**: image có thể bị pull bởi người khác (nhưng không chứa secrets)
   - **Private**: image chỉ có user trong repo mới pull được. Cần:
     - Thêm `packages: read` permission vào self-hosted runner
     - Hoặc dùng GitHub PAT có `read:packages` scope (đã làm ở Bước 6 trên EC2)

### Bước 3: Verify GitHub Secrets

Vào: `https://github.com/Kandesfx/KandesAIShop/settings/secrets/actions`

Check các secrets sau đã có (tên chính xác):

- `DATABASE_URL`
- `PROD_DOMAIN` (= `kandes.shop`)
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ADMIN_CHAT_ID`

Nếu thiếu, click **"New repository secret"** và thêm.

---

## 5. First deploy (push code lên main)

```bash
cd /local/path/to/KandesAIShop

# Verify Dockerfile + workflow có sẵn
ls Dockerfile .dockerignore .github/workflows/deploy-prod.yml docker-compose.yml nginx.conf

# Stage + commit
git add Dockerfile .dockerignore .github/workflows/deploy-prod.yml docker-compose.yml nginx.conf next.config.js scripts/aws/setup-ec2-d66.sh docs/deployment/

# Verify staged files (đảm bảo KHÔNG có .env)
git status
# Nếu thấy .env → dừng lại, .env KHÔNG được commit

git commit -m "feat(docker): D66 build/deploy split — GHCR + multi-stage Dockerfile

- Multi-stage Dockerfile (deps → builder → runner, ~150 MB image)
- Build ở GitHub-hosted runner (free 16 GB RAM)
- EC2 chỉ pull + restart → có thể downgrade instance
- docker-compose.yml + nginx.conf attached
- Self-hosted runner làm deploy job
- Auto-stop schedule (D64) sync với D66 flow"

git push origin main
```

### Monitor deploy

Mở: `https://github.com/Kandesfx/KandesAIShop/actions`

Bạn sẽ thấy 2 jobs chạy:

1. **Build Docker image (GitHub-hosted)** — ~5-8 phút
   - Phải thấy step "Build and push" success
   - Click vào để xem chi tiết
2. **Deploy to EC2 (Self-hosted)** — ~1-2 phút
   - Pull image → restart containers → health check
   - Telegram notification nếu success/failure

### Verify thành công

```bash
# Trên EC2
cd /opt/kandes
docker compose ps
# Phải thấy 3 services: app, nginx, db đều "running"

docker compose logs app --tail 50
# Phải thấy "ready" hoặc "started server on 0.0.0.0:3000"

curl -s https://kandes.shop/api/health
# Phải trả: {"status":"ok",...}
```

---

## 6. Rollback nếu cần

Nếu deploy fail:

```bash
# Rollback về image trước (tag cụ thể thay vì :latest)
cd /opt/kandes
docker compose down
docker pull ghcr.io/kandesfx/kandesaishop:<previous-sha>
# Edit .env: IMAGE=ghcr.io/kandesfx/kandesaishop:<previous-sha>
docker compose up -d
```

Hoặc checkout commit cũ về local:

```bash
git revert HEAD
git push origin main
# GitHub Actions sẽ rebuild + redeploy phiên bản trước
```

---

## 7. Maintenance hàng ngày

### Xem logs

```bash
docker compose logs -f app tail=100
docker compose logs -f nginx
docker compose logs -f db
```

### Restart app (không restart db, nginx)

```bash
docker compose restart app
```

### SSH vào container

```bash
docker compose exec app sh
docker compose exec db psql -U kandes -d kandes_shop
```

### Backup database

```bash
docker compose exec db pg_dump -U kandes kandes_shop | gzip > backup-$(date +%Y%m%d).sql.gz
```

### Restore database

```bash
gunzip -c backup-20260810.sql.gz | docker compose exec -T db psql -U kandes -d kandes_shop
```

### Update certs (Let's Encrypt auto-renew)

```bash
# Certbot thường auto-renew qua systemd timer
sudo certbot renew --dry-run  # test
sudo systemctl status certbot.timer  # verify timer active

# Sau khi renew, copy certs mới vào /opt/kandes/certs
sudo cp /etc/letsencrypt/live/kandes.shop/fullchain.pem /opt/kandes/certs/
sudo cp /etc/letsencrypt/live/kandes.shop/privkey.pem /opt/kandes/certs/
cd /opt/kandes && docker compose restart nginx
```

---

## 8. Tiếp theo: D67 (downgrade EC2)

Sau khi D66 chạy ổn định 1-2 tuần, có thể:

```bash
# Stop instance
aws ec2 stop-instances --instance-ids i-XXXXX

# Change type to t3.small
aws ec2 modify-instance-attribute --instance-id i-XXXXX --instance-type t3.small

# Start
aws ec2 start-instances --instance-ids i-XXXXX

# Verify
ssh ec2-user@<EC2_IP> 'docker compose -f /opt/kandes/docker-compose.yml ps'
```

Hoặc dùng script: `scripts/aws/migrate-instance.sh`

**Cost saving:**

| Instance | 24/7 | Auto-stop 8h/day |
|----------|------|------------------|
| m7i-flex.large (current) | $89.7/mo | $28.7/mo |
| t3.small (D67) | $19/mo | $6.4/mo |
| **Savings** | **-$70/mo** | **-$22/mo** |

Set up auto-stop schedule (`scripts/aws/schedule-stop-start.sh`) để tận dụng tối đa.

---

## 9. Troubleshooting

### Q: Build fail ở GitHub Actions?

Xem logs tại Actions tab. Thường gặp:
- `npm ci` fail → check `package-lock.json` có sync với `package.json` không
- `next build` fail → check TS errors, missing types
- `docker push` fail → check `GITHUB_TOKEN` permissions (Settings → Actions → Workflow permissions)

### Q: EC2 không pull được image?

```bash
docker pull ghcr.io/kandesfx/kandesaishop:latest
# Nếu lỗi "denied: requested access to the resource is denied":
#   → image private, cần docker login ghcr.io (Bước 6)
#   → hoặc PAT hết hạn, tạo lại
```

### Q: Health check fail sau deploy?

```bash
docker compose logs app --tail 100
# Thường gặp:
#   - "DATABASE_URL is not set" → check .env
#   - "ECONNREFUSED db:5432" → db container chưa ready, đợi 30s
#   - "Cannot find module" → build fail, xem logs GitHub Actions
```

### Q: Nginx không start?

```bash
docker compose logs nginx
# Thường gặp:
#   - "cannot load certificate" → check /opt/kandes/certs/fullchain.pem
#   - "bind() to 0.0.0.0:80 failed (98: Address already in use)" → có process khác dùng port 80
#     → sudo lsof -i :80 → kill hoặc stop service
```

### Q: Auto-stop schedule không hoạt động?

```bash
# Check Lambda function
aws lambda get-function --function-name kandes-ec2-stop-start

# Check EventBridge rules
aws events list-rules --name-prefix kandes

# Manual trigger để test
aws lambda invoke --function-name kandes-ec2-stop-start \
  --payload '{"action":"stop"}' \
  --region ap-southeast-1
```

---

## 10. References

- `DEPLOY_AWS.md` §6 — D66 architecture overview
- `DECISION_LOG.md` §9 — D66 decision rationale
- `Dockerfile` — multi-stage build
- `docker-compose.yml` — orchestration
- `nginx.conf` — reverse proxy + TLS
- `scripts/aws/setup-ec2-d66.sh` — one-time setup script
- `.github/workflows/deploy-prod.yml` — CI/CD workflow
- GitHub Actions docs: https://docs.github.com/actions
- Docker multi-stage builds: https://docs.docker.com/build/building/multi-stage/
