# Kandes.shop — AWS Deployment Guide

> **Mục đích:** Hướng dẫn deploy Kandes.shop lên AWS EC2 + Cloudflare edge.
>
> **Liên quan:** D60, D62, D63, D64 (CONTEXT.md §7), `docs/deployment/DECISION_LOG.md`
>
> **Cập nhật cuối:** 2026-08-07

---

## 1. Architecture overview (cập nhật 2026-08-07)

```
                    ┌─────────────────────────────┐
                    │   Cloudflare (Free Proxy)   │
   User VN ────────►│  • DNS proxy (api.* only)   │
   (10-30ms)        │  • SSL termination          │
                    │  • DDoS protection          │
                    │  • Unlimited bandwidth      │
                    └──────────┬──────────────────┘
                               │
                  api.kandes.shop (AI gateway)
                               │
                               ▼
                    ┌─────────────────────────────┐
                    │   Route 53 + CloudFront     │
                    │  • Primary DNS              │
                    │  • CDN cho static + admin   │
                    └──────────┬──────────────────┘
                               │
                               ▼
        ┌──────────────────────────────────────────────┐
        │       AWS EC2 m7i-flex.large (D62)           │
        │       2 vCPU, 8 GB RAM, Intel                │
        │       $0.1197/hr (~$89.7/mo 24/7)            │
        │                                              │
        │  ┌──────────────┐    ┌──────────────────┐  │
        │  │ Nginx + SSL  │    │  Docker app      │  │
        │  │ reverse proxy│───►│  Next.js + Prisma│  │
        │  └──────────────┘    └──────────────────┘  │
        │                                              │
        │  ┌──────────────┐    ┌──────────────────┐  │
        │  │ RDS Postgres │    │ Upstash Redis    │  │
        │  │ (Free 12mo)  │    │ (Free tier)      │  │
        │  └──────────────┘    └──────────────────┘  │
        └──────────────────────────────────────────────┘
                               │
                               ▼
        ┌──────────────────────────────────────────────┐
        │  S3 + SES + Secrets Manager + CloudWatch     │
        │  Budget alarms + Auto-stop schedule (D64)    │
        └──────────────────────────────────────────────┘
```

### So với Phase 7-H (D60) ban đầu:
- **Compute**: t3.micro (1 GB) → **m7i-flex.large (8 GB)**
- **Edge**: thêm **Cloudflare proxy** cho subdomain `api.kandes.shop`
- **Safety**: thêm **budget alarm + auto-stop schedule** (D64)

---

## 2. Setup order (cập nhật 2026-08-07)

### Phase A: Pre-flight checks

```bash
# Verify AWS account còn Free plan
aws ec2 describe-account-attributes --query 'AccountAttributes[?AttributeName==`supported-platforms`]'
aws ce get-cost-and-usage --time-period Start=2026-08-01,End=2026-08-07 --granularity MONTHLY
```

### Phase B: Setup safety mechanisms (D64) — **LÀM TRƯỚC**

```bash
# 1. Budget alarm
export KANDES_INSTANCE_ID=i-0123456789abcdef0
./scripts/aws/budget-alarm.sh

# 2. CloudWatch alarms
./scripts/aws/cloudwatch-alarm.sh

# 3. Auto-stop schedule (saves ~67% cost)
./scripts/aws/schedule-stop-start.sh
```

### Phase C: Migrate instance (D62)

```bash
./scripts/aws/migrate-instance.sh
# Downtime: ~2 phút
# Verify health check OK sau khi start
```

Chi tiết: `docs/deployment/MIGRATION_PLAN_M7I.md`

### Phase D: Setup Cloudflare proxy (D63)

```bash
# 1. Đăng ký Cloudflare Free plan
# 2. Add domain kandes.shop
# 3. CNAME api → EC2 Elastic IP (proxied ON)
# 4. Enable SSL/TLS Full
# 5. Test: curl https://api.kandes.shop/v1/models
```

### Phase E: Verify

```bash
# Health check
curl -I https://kandes.shop
curl -I https://api.kandes.shop/v1/models

# Performance benchmark (optional)
./scripts/aws/benchmark.sh  # TBD
```

---

## 3. Cost control (D64)

### Monthly cost estimate (24/7 m7i-flex.large):
- EC2: $89.7
- EBS (30 GB gp3): $2.4
- CloudWatch logs/metrics: $1-3
- Data transfer: $0-5
- **Total: ~$95-100/mo** (hết $200 credits trong ~2.2 tháng)

### With auto-stop (8h/day, recommended):
- EC2: $28.7 (-68%)
- Other: $3-7
- **Total: ~$32-36/mo** (dùng credits ~6 tháng)

### Cost control mechanisms active:
1. ✅ AWS Budget alarm ($100/$150/$180) — email + SNS
2. ✅ EventBridge schedule stop/start (23:00-07:00 VN)
3. ✅ CloudWatch alarm CPU idle (< 5% for 30 min)
4. ✅ CloudWatch alarm cost daily (>$5/day)
5. ✅ Manual override: `./scripts/aws/migrate-instance.sh --rollback`

---

## 4. Troubleshooting

### Q: App không start sau migration?
- Check: `ssh ec2-user@<ip> 'docker logs kandes-app'`
- Verify EBS volume attached: `aws ec2 describe-volumes --volume-ids vol-XXX`
- Rollback: `./scripts/aws/migrate-instance.sh --rollback`

### Q: Budget alarm trigger?
- Check current spend: `aws ce get-cost-and-usage ...`
- Nếu > $150 ($75% burn):
  - Option 1: Enable auto-stop (nếu chưa)
  - Option 2: Rollback về t3.small ($19/mo)
  - Option 3: Manually stop khi rảnh

### Q: Cloudflare 525 error?
- Origin cert mismatch → re-issue Let's Encrypt cert
- Backend down → check EC2 status

---

## 5. References

- `docs/deployment/AWS_ARCHITECTURE.md` — full architecture
- `docs/deployment/COST_ESTIMATE.md` — cost breakdown
- `docs/deployment/CI_CD.md` — GitHub Actions setup
- `docs/deployment/MIGRATION_PLAN_M7I.md` — instance type migration
- `docs/deployment/DECISION_LOG.md` — decisions & lessons learned
- `scripts/aws/` — safety + migration scripts
- D60-D64 trong `CONTEXT.md` §7

---

## 6. Build architecture (D66) — cập nhật 2026-08-10

### Vấn đề

Trước D66, workflow `.github/workflows/deploy-prod.yml` chạy **toàn bộ build
trên self-hosted runner** (tức là **chính EC2 của user**). Next.js build tốn
**3-5 GB RAM peak**, kèm `prisma generate` + `npm ci` + `tsc --noEmit` +
`vitest run`. Tổng peak RAM cho build: **4-6 GB**.

Điều này ràng buộc EC2 phải đủ RAM để build, nghĩa là:

| Instance type | RAM | Build được? | Ghi chú |
|---------------|-----|-------------|---------|
| t3.micro | 1 GB | ❌ OOM | crash giữa `npm ci` |
| **t3.small** | **2 GB** | **❌ OOM** | **fail `next build`** |
| c7i-flex.large | 4 GB | ⚠️ Hên xui | swap thrashing |
| m7i-flex.large | 8 GB | ✅ | D62 chọn, dư 2-3 GB |

→ Việc "chơi khô máu" với m7i-flex.large bị **mâu thuẫn** với DECISION_LOG §1
("free-tier first, sẵn sàng hạ khi budget risk"). Muốn hạ instance mà vẫn
chạy được build → cần tách build ra khỏi EC2.

### Giải pháp (D66): Tách build / deploy

```
┌─────────────────────────────────────┐
│ GitHub Actions (ubuntu-latest)      │
│ • 4 vCPU, 16 GB RAM (FREE)          │
│ • Build Docker image multi-stage    │
│ • Push image → GHCR                 │
└──────────────┬──────────────────────┘
               │ docker pull ghcr.io/...:latest
               ▼
┌─────────────────────────────────────┐
│ EC2 (self-hosted runner)            │
│ • Tối thiểu t3.small (2 GB)         │
│ • docker compose up -d              │
│ • Health check → Telegram           │
└─────────────────────────────────────┘
```

### Files added/changed

| File | Status | Vai trò |
|------|--------|---------|
| `Dockerfile` | **NEW** | Multi-stage: deps → builder → runner (final ~150 MB) |
| `.dockerignore` | **NEW** | Loại bỏ tests/docs/node_modules khỏi build context |
| `next.config.js` | MODIFIED | Thêm `output: 'standalone'` để Docker copy ít files |
| `.github/workflows/deploy-prod.yml` | REWRITTEN | Job `build` chạy GitHub-hosted, job `deploy` chỉ pull/restart |
| `.gitignore` | MODIFIED | Ignore Docker override files |

### Trade-offs đã accept

1. **GHCR là public registry theo mặc định** → image có thể bị pull bởi người
   khác. Image chỉ chứa code + node_modules + Prisma client → KHÔNG có secret
   trong image (`.env` bị `.dockerignore` loại). Secrets vẫn ở GitHub Secrets
   và inject lúc runtime nếu cần.

2. **GitHub Actions minutes**: 2,000 phút/tháng free cho private repo. Mỗi
   build ~5-8 phút → ~250-400 builds/tháng, dư sức.

3. **Layer cache**: dùng GitHub Actions cache (gha) để build 2-3 phút cho các
   push sau (vs 8-10 phút clean).

### Setup one-time trên GitHub

1. Repo Settings → Packages → Default visibility → **Public** (hoặc Private
   nếu muốn). Nếu Private, cần thêm `packages: read` permission cho self-hosted
   runner (qua PAT).
2. Self-hosted runner trên EC2 cần `docker login ghcr.io` một lần với token có
   scope `read:packages` (dùng GitHub PAT).

### Cho phép hạ instance

Sau D66, EC2 chỉ cần:

- Runtime RAM: 400-600 MB cho Next.js + 200 MB Prisma = **~800 MB**
- Swap 1 GB là đủ buffer
- Tổng: 2 GB (t3.small) chạy thoải mái

→ Có thể downgrade m7i-flex.large → **t3.small** để tiết kiệm $70/mo (24/7)
hoặc $22/mo (auto-stop 8h/day). Chi tiết trade-off xem DECISION_LOG §8.
