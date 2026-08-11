# Kandes.shop — AWS Current State (Inventory Snapshot)

> **Mục đích:** Source of truth về AWS resources thực tế. Để AI agents và humans có thể re-ground nhanh.
>
> **Cập nhật bằng:** `aws` CLI queries (xem §A. Commands used)
>
> **Snapshot mới nhất:** 2026-08-10 04:13 UTC+7 (AWS CLI qua MCP `user-aws-mcp-control`)
>
> **Quy ước:** Mọi resource có `kandes-*` tag/prefix đều thuộc dự án. AWS account: `870730509911`, primary region `ap-southeast-1`.

---

## 1. Compute (EC2)

| Field | Value |
|-------|-------|
| Instance ID | `i-0a6fca834c9429bca` |
| Name tag | `kandes-prod-app` |
| Project tag | `kandes` |
| Environment tag | `production` |
| **Instance type** | **`t3.small`** (2 vCPU, 2 GB RAM) |
| State | `running` |
| Public IP | `13.215.39.207` |
| Private IP | `172.31.18.215` |
| Public DNS | `ec2-13-215-39-207.ap-southeast-1.compute.amazonaws.com` |
| AMI | `ami-0835cef4452581dc0` |
| VPC | `vpc-063cda7c36505be44` |
| Subnet | `subnet-0712829715dca7407` |
| Security group | `sg-0748ca482f2f9f073` (`kandes-ec2-sg`) |
| IAM instance profile | `kandes-ec2-profile` |
| EBS volume | `vol-01eea376f37ac0eb9` (gp3, 30 GB) |
| Launch time | `2026-08-06T17:48:26+07:00` |
| Last observed CPU (24h avg) | **1.0-3.1%** (heavily idle) |

### Security group ingress (`sg-0748ca482f2f9f073`)

| Port | Protocol | Source | Purpose |
|------|----------|--------|---------|
| 22 | TCP | `0.0.0.0/0` | SSH admin |
| 80 | TCP | `0.0.0.0/0` | HTTP → redirect HTTPS |
| 443 | TCP | `0.0.0.0/0` | HTTPS (nginx) |

Egress: all (`0.0.0.0/0`).

### ⚠️ Inconsistency vs tài liệu

- `CONTEXT.md` D62 + `DEPLOY_AWS.md` + `DECISION_LOG.md` nói instance đang chạy **`m7i-flex.large`** — **SAI**. Thực tế là **`t3.small`**. Có thể user đã hạ instance sau D62/D67 nhưng KHÔNG cập nhật deviations.
- D62 chưa thực sự được implement (chưa bao giờ chạy `migrate-instance.sh` đến `m7i-flex.large`), hoặc đã được rollback mà không document.

### Cost estimate (current `t3.small`)

- On-demand: $0.0264/hr × 24h × 30d = **~$19/mo**
- Free tier eligible (AWS Free plan 2026 — D64)

---

## 2. Database (RDS PostgreSQL)

| Field | Value |
|-------|-------|
| DB instance ID | `kandes-db` |
| Engine | `postgres` |
| Class | `db.t3.micro` |
| Status | `available` |
| Endpoint | `kandes-db.crmca6kou3xz.ap-southeast-1.rds.amazonaws.com:5432` |
| Allocated storage | 20 GB |
| Multi-AZ | `false` |
| Publicly accessible | `false` |

### ⚠️ Inconsistency vs tài liệu

- `docker-compose.yml` vẫn ship service `db` (postgres:16-alpine container) — **conflicts** với RDS đang chạy.
- `.github/workflows/deploy-prod.yml` step "Apply DB migrations" dùng `DATABASE_URL` từ GitHub Secrets — nếu secret trỏ RDS (`kandes-db.crmca6kou3xz...`) thì migration chạy đúng chỗ; nếu trỏ `db:5432` thì migration apply vào **container postgres**, không apply RDS.
- `EC2-SETUP.md` §3 Bước 4 mẫu `.env` có `DATABASE_URL=postgresql://kandes:***@db:5432/...` — **mâu thuẫn** với setup D60 trỏ RDS.

**Action cần xác nhận với user:** Container `db` còn cần không? RDS là primary DB? Nếu cả hai → data drift risk.

---

## 3. Networking

### Elastic IPs

| Allocation ID | Public IP | Status | Association |
|---------------|-----------|--------|-------------|
| `eipalloc-02a9e16161b9593b8` | `13.215.39.207` | ✅ in-use | `eni-048285ac908081101` (EC2) |
| `eipalloc-077dae100efe47c86` | `18.140.102.23` | ✅ released (D71) | none |

ECR repo `kandes-shop` (ap-southeast-1) deleted (D74-E) — unused since D66 migration to GHCR.

### CloudFront

| Field | Value |
|-------|-------|
| Distribution #1 ID | `E1Q8DEYAXGY3N9` |
| #1 Domain | `d1ejmpir98cn4v.cloudfront.net` |
| #1 Aliases | `kandes.shop`, `www.kandes.shop` |
| #1 Origin | `ec2-13-215-39-207.ap-southeast-1.compute.amazonaws.com` |
| #1 Status | `Deployed` |
| Distribution #2 ID | `EP5ZI3VMCBDP3` |
| #2 Domain | `d2kdrnpwhtm31f.cloudfront.net` |
| #2 Aliases | `api.kandes.shop` |
| #2 Origin | `ec2-origin.kandes.shop` → EIP, OriginProtocolPolicy `http-only`, nginx stub (D74-C) |
| #2 Status | `Deployed` (D75) |

### Route 53

| Field | Value |
|-------|-------|
| Hosted zone ID | `Z0060542N5IL81OPZA0H` |
| Records | 15 |

Notable records:

| Name | Type | Target / Value |
|------|------|----------------|
| `kandes.shop` | A (alias) | CloudFront `d1ejmpir98cn4v.cloudfront.net` |
| `kandes.shop` | AAAA (alias) | CloudFront |
| `www.kandes.shop` | A (alias) | CloudFront |
| `api.kandes.shop` | **A (alias)** | CloudFront `d2kdrnpwhtm31f.cloudfront.net` (D75a, working 200) |
| `ec2-origin.kandes.shop` | A | EIP `13.215.39.207` (CF origin only) |
| `mail.kandes.shop` | MX | `feedback-smtp.ap-southeast-1.amazonses.com` |
| SES DKIM × 3 | CNAME | `*.dkim.amazonses.com` |
| ACM validation | CNAME | `*.acm-validations.aws` |
| SPF / DMARC | TXT | `v=spf1 include:amazonses.com -all` + DMARC |

### Route 53 Health Check (D68 wake trigger)

| Field | Value |
|-------|-------|
| CallerReference | `kandes-wake-20260809` |
| Type | HTTP |
| IP | `13.215.39.207` |
| Port | 3000 |
| Path | `/api/health` |

---

## 4. S3 Buckets

| Bucket | Created | Purpose (inferred) |
|--------|---------|---------------------|
| `kandes-backup-prod` | 2026-08-06 23:36 | DB / artifact backup |
| `kandes-static` | 2026-08-06 17:41 | Static assets |
| `kandes-trail-logs` | 2026-08-06 17:40 | CloudTrail logs |

---

## 5. Secrets Manager

7 secrets (all under `kandes/*` prefix) — D74-D pruned 4 unused:

```
kandes/ENCRYPTION_KEY            2026-08-06 17:44
kandes/AWS_S3_BUCKET             2026-08-06 17:45
kandes/AWS_REGION                2026-08-06 17:45
kandes/AWS_ACCESS_KEY_ID         2026-08-06 17:45
kandes/AWS_SECRET_ACCESS_KEY     2026-08-06 17:45
kandes/DATABASE_URL              2026-08-06 17:50   ← quan trọng: cần xác nhận trỏ RDS hay container
kandes/SESSION_SECRET            2026-08-06 18:55
kandes/cron-secret              2026-08-11 14:50  ? Bearer token cho EventBridge + Lambda proxy (D72)
```

---

## 6. CloudWatch alarms

### ap-southeast-1 (instance region)

| Name | State | Metric | Threshold | Action |
|------|-------|--------|-----------|--------|
| `kandes-cpu-high` | OK | CPUUtilization > 80% (10×60s) | 80 | SNS `kandes-cost-alerts` |
| `kandes-status-check` | OK | StatusCheckFailed > 0 (2×60s) | 0 | SNS `kandes-cost-alerts` |

### ❌ MISSING (per `cloudwatch-alarm.sh`):

- `kandes-cpu-idle` (CPU < 5% for 30 min) — script chạy nhưng alarm **không có** trên AWS

### us-east-1 (billing region)

| Name | State | Metric | Threshold |
|------|-------|--------|-----------|
| `kandes-cost-daily` | OK | EstimatedCharges > $5/day (AmazonEC2) | 5 |

---

## 7. SNS topic

| Topic ARN | Subscribers |
|-----------|-------------|
| `arn:aws:sns:ap-southeast-1:870730509911:kandes-cost-alerts` | `kandesfx@gmail.com` (email, confirmed) |

---

## 8. AWS Budget

| Field | Value |
|-------|-------|
| Budget name | `kandes-monthly-budget` |
| Limit | `$200 USD / month` |
| TimeUnit | MONTHLY |

Notifications:

| Type | Threshold | State |
|------|-----------|-------|
| ACTUAL | 25% ($50) | OK |
| ACTUAL | 50% ($100) | OK |
| ACTUAL | 75% ($150) | OK |
| FORECASTED | 90% projection | OK |

---

## 9. Lambda & EventBridge

### ✅ Lambda functions

| Function | ARN | Runtime | Purpose |
|----------|-----|---------|---------|
| `kandes-cron-proxy` | `arn:aws:lambda:ap-southeast-1:870730509911:function:kandes-cron-proxy` | Node.js 20.x | Proxy EventBridge → app `/api/cron/*` |

IAM role: `arn:aws:iam::870730509911:role/kandes-lambda-cron-proxy`
- Attached: `AWSLambdaBasicExecutionRole`
- Inline policy: `GetCronSecretPolicy` → Secrets Manager `kandes/cron-secret`

### ✅ EventBridge rules (cron schedules)

| Rule | Schedule (UTC) | Target | Status |
|------|---------------|--------|--------|
| `kandes-cron-sepay-reconcile` | `cron(*/5 * * * ? *)` (every 5 min) | Lambda `kandes-cron-proxy` | ✅ ENABLED |
| `kandes-cron-expire-overdue-orders` | `cron(0 * * * ? *)` (hourly) | Lambda | ✅ ENABLED |
| `kandes-cron-sla-scan` | `cron(*/5 * * * ? *)` (every 5 min) | Lambda | ✅ ENABLED |
| `kandes-cron-ai-balance-sync` | `cron(*/30 * * * ? *)` (every 30 min) | Lambda | ✅ ENABLED |
| `kandes-cron-ai-quota-alert` | `cron(0 */6 * * ? *)` (every 6 hours) | Lambda | ✅ ENABLED |

**Credentials:**
- `CRON_SECRET` value: generated `Y5KoMpUFTjO34Yr8fqDGbilKpkFPlW+tmrpbaPIxM3w95ytSf56rQcuAG7L2tk4z` (48 bytes base64)
- Stored in: Secrets Manager `kandes/cron-secret`
- Also in: EC2 `/opt/kandes/.env.production`
- Container `kandes-app`: ✅ verified loaded on 2026-08-11

**Manual test:**
```bash
curl -s -X POST https://kandes.shop/api/cron/sepay-reconcile \
  -H 'Authorization: Bearer Y5KoMpUFTjO34Yr8fqDGbilKpkFPlW+tmrpbaPIxM3w95ytSf56rQcuAG7L2tk4z' \
  -H 'Content-Type: application/json' -d '{"triggeredBy":"manual-test"}'
# → {"ok":true,"data":{"counts":{...},"durationMs":3}}
```

**Monitor logs:**
```bash
aws logs tail /aws/lambda/kandes-cron-proxy --follow --region ap-southeast-1
```

**Pending (not yet implemented):**
- Lambda `kandes-ec2-stop-start` (D64 auto-stop/start) — script exists but not deployed
- Lambda `kandes-ec2-wake` (D68 health-check wake) — not deployed
- EventBridge rules for auto-stop/start



---

## 10. GitHub Actions

(Repo: `Kandesfx/KandesAIShop` — không kiểm tra được qua AWS MCP, cần dùng `gh` CLI)

Theo repo:
- `.github/workflows/ci.yml` — Lint + Typecheck + Test + Build (mỗi push/PR main)
- `.github/workflows/deploy-prod.yml` — Build (GH-hosted) + Deploy (self-hosted)
- Required GitHub Secrets: `DATABASE_URL`, `PROD_DOMAIN`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID`, `GITHUB_TOKEN` (auto)

---

## 11. Tóm tắt gaps (state thật vs documented state)

| # | Item | Documented | Actual | Severity |
|---|------|-----------|--------|----------|
| 1 | Instance type | `m7i-flex.large` (D62) | `t3.small` | 🟡 (silent downgrade — tiết kiệm ~$70/mo, OK) |
| 2 | Auto-stop schedule | Implemented (D64) | Không có Lambda + EventBridge | 🔴 (cost saving claim không thật) |
| 3 | Idle-trigger stop | Implemented (D68) | Không có Lambda + EventBridge | 🔴 (cost saving claim không thật) |
| 4 | Health-check wake | Implemented (D68) | Route 53 HC có, Lambda KHÔNG có | 🔴 (instance không tự wake, downtime dài) |
| 5 | `kandes-cpu-idle` alarm | Created | KHÔNG có trên AWS | 🟡 (script tạo nhưng không persist) |
| 6 | RDS Postgres | "D62 used RDS" | ✅ Verified 2026-08-11: SG only allows PostgreSQL 5432 from EC2 SG; docker-compose `db` COMMENTED (D70) | 🔴→✅ Verified |
| 7 | Container `db` | Dùng như self-host fallback | ✅ COMMENTED trong docker-compose.yml (D70) — rollback backup | 🟡→✅ Clean |
| 8 | Orphan EIP | (không nhắc) | `18.140.102.23` (~$3.6/mo waste) | 🟡 (cleanup) |
| 9 | Vercel cron (`vercel.json`) | "in-process handlers via Vercel cron" | ✅ D72: EventBridge + Lambda proxy 5 jobs | 🔴→✅ Fixed 2026-08-11 |
| 10 | `IMAGE` env var in `.env` | Dùng để rollback | ✅ docker-compose.yml line 26 dùng `${IMAGE:-latest}` đúng | 🟡→✅ Verified |

---

## A. Commands used (để reproduce)

```bash
# Identity
aws sts get-caller-identity --region ap-southeast-1

# EC2
aws ec2 describe-instances --region ap-southeast-1 --query 'Reservations[].Instances[].[InstanceId,InstanceType,State.Name,PublicIpAddress]'
aws ec2 describe-addresses --region ap-southeast-1
aws ec2 describe-volumes --region ap-southeast-1
aws ec2 describe-security-groups --group-ids sg-0748ca482f2f9f073 --region ap-southeast-1

# RDS
aws rds describe-db-instances --region ap-southeast-1

# CloudFront / Route 53 / S3
aws cloudfront list-distributions
aws route53 list-hosted-zones
aws route53 list-resource-record-sets --hosted-zone-id Z0060542N5IL81OPZA0H
aws route53 list-health-checks
aws s3api list-buckets

# Secrets / SNS / CloudWatch / Lambda / EventBridge / Budgets
aws secretsmanager list-secrets --region ap-southeast-1
aws sns list-topics --region ap-southeast-1
aws sns list-subscriptions-by-topic --topic-arn <arn> --region ap-southeast-1
aws cloudwatch describe-alarms --region ap-southeast-1 --alarm-name-prefix kandes-
aws cloudwatch describe-alarms --region us-east-1 --alarm-name-prefix kandes-
aws cloudwatch get-metric-statistics --namespace AWS/EC2 --dimensions Name=InstanceId,Value=<id> --metric-name CPUUtilization ...
aws lambda list-functions --region ap-southeast-1
aws events list-rules --region ap-southeast-1 --name-prefix kandes
aws budgets describe-budgets --account-id 870730509911 --region us-east-1
aws budgets describe-notifications-for-budget --account-id 870730509911 --budget-name kandes-monthly-budget --region us-east-1
```

---

## B. Update checklist

Khi state thay đổi, update file này **ngay** với timestamp mới ở header. Đồng thời update §11 nếu có gap mới xuất hiện hoặc biến mất.
