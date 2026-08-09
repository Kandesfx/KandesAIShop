# Kandes.shop — Execution Plan (D62-D65)

> **Ngày tạo:** 2026-08-07
> **Cập nhật cuối:** 2026-08-09 (D63 deferred, D65 added)
> **Phạm vi:** Triển khai upgrade instance + safety mechanism + script install cho khách
> **Prerequisite:** Đã đọc `CONTEXT.md` §7 (D62-D65) + `DECISION_LOG.md` + `MIGRATION_PLAN_M7I.md`

---

## ⚠️ IMPORTANT — User decisions (cập nhật 2026-08-09)

| # | Question | Decision |
|---|----------|----------|
| 1 | DNS setup | **Route 53 primary, NO Cloudflare** (D63 deferred 2026-08-09) |
| 2 | Auto-stop | **23:00-07:00 VN (8 hrs/day, 67% savings)** — enable sau khi upgrade |
| 3 | Migration timing | **Phase 8 (UI cleanup) trước, migrate sau** |
| 4 | Cloudflare | ❌ **DEFERRED** — dùng CloudFront + EC2 hiện tại |
| 5 | Budget thresholds | **$50/$100/$150 (strict - 25%/50%/75%)** |

### Update quan trọng (2026-08-09):

**BỎ Cloudflare setup** (xem `docs/deployment/DECISION_LOG.md` §8):
- CloudFront + EC2 hiện tại đủ handle 10-50 users streaming
- EC2 chỉ proxy/forward, không xử lý AI (chịu tải nằm ở ccpro.cn)
- t3.small dư sức, latency 30-80ms chấp nhận được
- Cloudflare thêm vào giữa user ↔ CloudFront chỉ làm CHẬM thêm

→ **Phạm vi execute ngay (an toàn, không ảnh hưởng):**
- ✅ Setup safety mechanisms đã xong (commit `31d0d02`)
- ✅ Cloudflare doc đã tạo (tham khảo tương lai)

→ **Công việc mới (D65 - script install cho khách):**
1. Route `api.kandes.shop` qua Route 53 CNAME → EC2 IP
2. Tạo 2 file script install (PowerShell + Bash) — user cung cấp mẫu ccpro
3. Host trên `kandes.shop/install/codex/...`

→ **Hoãn lại:**
- ⏸️ Migrate instance lên m7i-flex.large (sau Phase 8)
- ⏸️ Auto-stop schedule (sau khi migrate)
- ⏸️ Cloudflare (chỉ REPLACE CloudFront khi cần)

---

## 📋 Overview — bước hiện tại (updated)

| # | Bước | Status | Ghi chú |
|---|------|--------|---------|
| **1** | Setup safety mechanisms | ✅ DONE | Commit `31d0d02` |
| **2** | Migrate instance (sau Phase 8) | ⏸️ Deferred | |
| **3** | Cloudflare proxy | ❌ DEFERRED | D63, xem DECISION_LOG §8 |
| **4** | Route `api.kandes.shop` → EC2 | 🔜 Next | D65 |
| **5** | Tạo script install (PS + Bash) | 🔜 Pending user input | D65 |

---

## Bước 1: Setup safety mechanisms (D64) — **15 phút**

> ⚠️ **LÀM BƯỚC NÀY TRƯỚC.** Đây là safety net trước khi upgrade instance.

### 1.1. Set environment variables

```powershell
# PowerShell (Windows)
$env:KANDES_INSTANCE_ID = "i-0123456789abcdef0"  # Thay bằng instance ID thật
$env:KANDES_SNS_TOPIC_ARN = "arn:aws:sns:ap-southeast-1:ACCOUNT:kandes-cost-alerts"  # Sẽ tạo ở 1.2

# Bash (Linux/macOS)
export KANDES_INSTANCE_ID=i-0123456789abcdef0
export KANDES_SNS_TOPIC_ARN=arn:aws:sns:ap-southeast-1:ACCOUNT:kandes-cost-alerts
```

### 1.2. Tạo Budget alarm

```bash
cd /path/to/KandesAIShop
bash scripts/aws/budget-alarm.sh
```

**Verify:**
- ✅ SNS topic `kandes-cost-alerts` created
- ✅ Email subscription pending (check inbox confirm)
- ✅ Budget `kandes-monthly-budget` với 4 thresholds

### 1.3. Tạo CloudWatch alarms

```bash
bash scripts/aws/cloudwatch-alarm.sh
```

**Verify:**
- ✅ `kandes-cost-daily`
- ✅ `kandes-cpu-idle`
- ✅ `kandes-cpu-high`
- ✅ `kandes-status-check`

### 1.4. Confirm SNS email subscription

```bash
# Check inbox for "AWS Notification - Subscription Confirmation"
# Click "Confirm subscription" link
```

### 1.5. (Optional) Telegram integration

Nếu user muốn nhận alarm qua Telegram (không phải email):

```bash
# 1. Tạo Lambda forward SNS → Telegram API
# 2. Cấu hình TELEGRAM_BOT_TOKEN + TELEGRAM_ADMIN_CHAT_ID
# (See: scripts/aws/sns-to-telegram.sh — TBD nếu cần)
```

### ✅ Done khi:
- Tất cả scripts chạy không lỗi
- SNS email đã confirm
- CloudWatch dashboard hiển thị 4 alarms

---

## Bước 2: Migrate instance (D62) — **30 phút**

> ⏰ **Best time:** 02:00-04:00 sáng VN (low traffic)

### 2.1. Pre-flight

```bash
# 1. Verify current instance
aws ec2 describe-instances --instance-ids $KANDES_INSTANCE_ID \
  --query 'Reservations[0].Instances[0].{ID:InstanceId,Type:InstanceType,State:State.Name,IP:PublicIpAddress}'

# Expected: t3.micro / running / <elastic-ip>

# 2. Check no active critical operations
aws ec2 describe-instance-status --instance-ids $KANDES_INSTANCE_ID

# 3. Verify RDS available (nếu dùng RDS)
aws rds describe-db-instances --query 'DBInstances[?DBInstanceStatus==`available`]'
```

### 2.2. Notify trước migration

```bash
# Telegram
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  -d "chat_id=${TELEGRAM_ADMIN_CHAT_ID}" \
  -d "text=🔧 Kandes EC2 upgrade scheduled: t3.micro → m7i-flex.large. Downtime ~2 min."

# (Hoặc manual message)
```

### 2.3. Run migration

```bash
bash scripts/aws/migrate-instance.sh
```

Script sẽ:
1. Snapshot EBS volume
2. Stop instance (30s)
3. Change type to m7i-flex.large (30s)
4. Start instance (30-60s)
5. Wait for `/api/health` to return 200 (max 5 min)

### 2.4. Post-migration verify

```bash
# SSH vào instance mới
ssh -i ~/.ssh/kandes-prod.pem ec2-user@<elastic-ip>

# Verify specs
nproc        # Should show 2
free -h      # Should show ~8 GB
uname -m     # x86_64

# Verify app
docker ps
curl -I http://localhost:3000
```

### 2.5. Re-register GitHub Actions runner (nếu cần)

Self-hosted runner bị stop khi instance stop → cần config lại:

```bash
# Trên EC2 mới
cd ~
rm -rf actions-runner
mkdir actions-runner && cd actions-runner
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz

# Get new token from GitHub: Settings → Actions → Runners → New
./config.sh --url https://github.com/<user>/kandes-shop --token <NEW_TOKEN>
sudo ./svc.sh install
sudo ./svc.sh start

# Verify
sudo ./svc.sh status
```

### ✅ Done khi:
- Instance running m7i-flex.large
- `/api/health` returns 200
- GitHub Actions runner online
- Test deployment thành công

---

## Bước 3: Setup Cloudflare proxy (D63) — **45 phút**

> Mục đích: Edge proxy cho `api.kandes.shop` để giảm latency + bandwidth cost

### 3.1. Đăng ký Cloudflare

1. Vào https://dash.cloudflare.com/sign-up
2. Free plan
3. Add site: `kandes.shop`

### 3.2. Update nameservers

Cloudflare cung cấp 2 nameservers (vd `anna.ns.cloudflare.com`, `bob.ns.cloudflare.com`).

Tại Route 53:
1. Hosted zones → `kandes.shop`
2. Edit NS records → thay bằng Cloudflare NS

⚠️ **Cảnh báo:** Việc này sẽ switch primary DNS từ Route 53 sang Cloudflare. Nếu user muốn giữ Route 53 primary → dùng partial setup (CNAME only, không switch NS).

### 3.3. (Alternative) Partial setup — chỉ proxy subdomain `api`

Nếu user muốn giữ Route 53 primary:

```bash
# Tại Route 53:
# 1. Tạo record: api.kandes.shop → A → <elastic-ip> (proxied OFF, nếu dùng partial)
# Hoặc:
# 2. Tạo CNAME: api → <elastic-ip>.compute.amazonaws.com (Cloudflare can resolve)

# Tại Cloudflare (partial zone setup):
# 1. Add CNAME: api → <elastic-ip> với proxy ON (orange cloud)
# 2. DNS only cho root domain (@) — giữ Route 53 control
```

⚠️ **Lưu ý:** Cloudflare partial setup cần subdomain không phải apex (root). `api.*` work, `@` không.

### 3.4. Cấu hình SSL/TLS

Cloudflare Dashboard:
1. SSL/TLS → Overview → **Full** (không phải Full Strict vì EC2 dùng Let's Encrypt)
2. Edge Certificates → Always Use HTTPS: ON

EC2 cần serve HTTPS với cert từ Let's Encrypt (đã có sẵn từ `scripts/deploy/setup-nginx-ssl.sh`).

### 3.5. Cấu hình WAF (optional, free)

Cloudflare Dashboard → Security → WAF:
1. Bot Fight Mode: ON
2. Security Level: Medium
3. Challenge Passage: 30 minutes

### 3.6. Verify

```bash
# Test edge
curl -I https://api.kandes.shop/v1/models
# Expected: 200 OK, CF-Cache-Status header

# Check IP (should be Cloudflare, not EC2)
nslookup api.kandes.shop
```

### ✅ Done khi:
- `api.kandes.shop` resolve về Cloudflare IP
- HTTPS work
- WAF rules active
- Latency từ VN < 50ms

---

## Bước 4: Verify end-to-end — **15 phút**

### 4.1. Health checks

```bash
# Public endpoints
curl -I https://kandes.shop                    # 200
curl -I https://kandes.shop/api/health         # 200
curl -I https://api.kandes.shop/v1/models      # 200

# Auth flow
curl -X POST https://kandes.shop/api/auth/login \
  -d '{"email":"test@example.com","password":"test"}' \
  -H "Content-Type: application/json"

# AI streaming (sanity check)
curl -X POST https://api.kandes.shop/v1/chat/completions \
  -H "Authorization: Bearer <test_key>" \
  -H "Content-Type: application/json" \
  -d '{"model":"kandes-gpt-4o","messages":[{"role":"user","content":"hi"}],"stream":true}'
# Should start streaming within 500ms
```

### 4.2. Performance benchmark (optional)

```bash
# Load test nhẹ (50 concurrent requests)
ab -n 1000 -c 50 https://kandes.shop/

# Monitor CloudWatch
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value=$KANDES_INSTANCE_ID \
  --start-time 2026-08-07T00:00:00Z \
  --end-time 2026-08-07T23:59:59Z \
  --period 3600 \
  --statistics Average
```

### 4.3. Verify safety mechanisms

```bash
# Test alarm (manual trigger)
aws cloudwatch set-alarm-state \
  --alarm-name kandes-cpu-idle \
  --state-value ALARM \
  --state-reason "Testing alarm"

# Check SNS delivery
# Should receive email within 1 minute

# Reset alarm
aws cloudwatch set-alarm-state \
  --alarm-name kandes-cpu-idle \
  --state-value OK \
  --state-reason "Test complete"
```

### ✅ Done khi:
- Tất cả endpoints return 200
- Auth flow OK
- AI streaming OK
- Alarms có thể trigger manually

---

## Bước 5: Monitor 48h đầu — **48 giờ (passive)**

### Daily check (5 phút/ngày):

```bash
# 1. AWS Billing
aws ce get-cost-and-usage --time-period Start=$(date +%Y-%m-%d),End=$(date +%Y-%m-%d) --granularity DAILY

# 2. EC2 status
aws ec2 describe-instance-status --instance-ids $KANDES_INSTANCE_ID

# 3. CloudWatch alarms
aws cloudwatch describe-alarms --alarm-name-prefix kandes- --state-value ALARM
```

### Quyết định sau 48h:

| Burn rate | Action |
|-----------|--------|
| < $1/day | Continue full-time (24/7) — performance OK |
| $1-3/day | Enable auto-stop (8h/day) — saves 67% |
| $3-5/day | Enable auto-stop + monitor closer |
| > $5/day | Rollback về t3.small ngay |

### Quyết định sau 2 tuần:

| Burn rate | Action |
|-----------|--------|
| < $30 total | Continue với m7i-flex.large |
| $30-60 total | Enable auto-stop |
| > $60 total | Rollback về t3.small |

---

## 🚨 Emergency procedures

### Nếu cost burn nhanh (> $150 trong 1 tuần):

```bash
# Manual stop instance
aws ec2 stop-instances --instance-ids $KANDES_INSTANCE_ID

# Rollback về t3.micro
bash scripts/aws/migrate-instance.sh --rollback
```

### Nếu Cloudflare gây vấn đề:

```bash
# Disable proxy (DNS only)
# Cloudflare Dashboard → DNS → api → Edit → Click orange cloud to grey
# Đợi DNS propagate (1-5 phút)
```

### Nếu app crash loop:

```bash
# SSH vào instance
ssh ec2-user@<ip>
docker logs --tail 100 kandes-app
docker ps -a
# Restart
docker restart kandes-app
# Or full restart
docker-compose down && docker-compose up -d
```

---

## 📝 Documentation cập nhật sau khi xong

- [ ] Update `DEPLOY_STATUS.md` với instance type mới + Cloudflare status
- [ ] Update `docs/runbook.md` với safety mechanism procedures
- [ ] Mark D62-D64 as ✅ Implemented (currently chỉ là ✅ Accepted)
- [ ] Create PR hoặc commit với message rõ ràng

---

## 📞 Khi cần help

Nếu gặp vấn đề:
1. Check CloudWatch logs: `aws logs tail /aws/ec2/kandes-app --follow`
2. Check Cost Explorer: https://console.aws.amazon.com/billing/
3. Check alarms: `aws cloudwatch describe-alarms --state-value ALARM`
4. Rollback nếu cần: `bash scripts/aws/migrate-instance.sh --rollback`

---

**Bắt đầu từ đâu?** → **Bước 1**, làm safety mechanisms TRƯỚC khi upgrade.
