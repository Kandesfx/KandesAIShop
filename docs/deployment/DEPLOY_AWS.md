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
