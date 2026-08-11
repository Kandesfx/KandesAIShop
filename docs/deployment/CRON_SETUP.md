# Kandes.shop — Cron Setup (EventBridge + Lambda proxy)

> **Mục đích:** Khôi phục 5 cron jobs đã NGỪNG chạy sau khi chuyển từ Vercel sang EC2 self-host.
>
> **Phương án:** B — EventBridge schedule + Lambda proxy (Option user chọn 2026-08-10).
>
> **Status:** ✅ **DEPLOYED** (2026-08-11) — Lambda + EventBridge đang chạy, cron jobs active.

---

## 1. Tại sao cần fix?

Khi app chạy trên Vercel, `vercel.json` config Vercel Cron tự gọi 5 routes. Sau D60 (chuyển sang EC2 self-host), Vercel KHÔNG serve app nữa → tất cả 5 cron NGỪNG chạy:

| Cron | Tần suất | Tác động khi NGỪNG |
|------|----------|---------------------|
| `sepay-reconcile` | 5 phút | Payment webhook miss → order pending vĩnh viễn |
| `expire-overdue-orders` | 1 giờ | Order pending chiếm inventory → mất doanh thu |
| `sla-scan` | 5 phút | Khách chờ hàng lâu, admin không biết → chargeback |
| `ai-balance-sync` | 30 phút | NCC key cạn $ mà admin không biết → KH fail API |
| `ai-quota-alert` | 6 giờ | Customer dùng vượt soft cap không ai cảnh báo |

Chi tiết: `docs/deployment/DOCS_AUDIT.md` §1.1.

---

## 2. Kiến trúc

```
┌─────────────────────┐
│ EventBridge Schedule│ cron(*/5 * * * ? *)   cho mỗi cron
│ (5 rules)           │
└──────────┬──────────┘
           │ input = {"jobName": "sepay-reconcile"}
           ▼
┌─────────────────────┐
│ Lambda              │ Node 20, 256 MB, 90s timeout
│ kandes-cron-proxy   │ - Lookup CRON_SECRET từ Secrets Manager (cached 5 min)
│                     │ - POST https://kandes.shop/api/cron/<jobName>
│                     │   Header: Authorization: Bearer <secret>
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ CloudFront          │ (đã có sẵn)
│ d1ejmpir98cn4v...   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ EC2 + nginx         │ port 443 → proxy_pass → kandes-app:3000
│ (đã có sẵn)         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Next.js /api/cron/  │ verifyCronAuth() → runJob() → log counts
└─────────────────────┘
```

**Ưu điểm so với systemd timer (Option A):**
- Native AWS, không cần SSH/manage EC2
- Tự retry nếu fail (EventBridge không auto-retry, nhưng có thể add DLQ nếu cần)
- Logs vào CloudWatch Logs → query/alert dễ
- Schedule độc lập với EC2 lifecycle (EC2 rebuild không mất cron)

**Trade-off:**
- Tốn thêm: Lambda $0.20/mo + EventBridge $0.20/mo ≈ $0.40/mo
- Cold start ~200ms (acceptable cho cron)

---

## 3. Setup — chạy 1 lần

### Prerequisites

- AWS CLI configured với region `ap-southeast-1`
- IAM permission: `lambda:*`, `events:*`, `iam:*`, `secretsmanager:*`
- App đang chạy tại `https://kandes.shop` (verify: `curl -I https://kandes.shop/api/health`)
- Biết giá trị `CRON_SECRET` — lấy từ `/opt/kandes/.env` trên EC2 (line `CRON_SECRET=...`) HOẶC từ GitHub Secrets (nếu có set, xem `https://github.com/Kandesfx/KandesAIShop/settings/secrets/actions`)

### Run setup script

```bash
cd /path/to/KandesAIShop

# 1. Lấy CRON_SECRET từ EC2
ssh ec2-user@13.215.39.207 'grep ^CRON_SECRET= /opt/kandes/.env'

# 2. Set env var + run script
export KANDES_CRON_SECRET='<value-từ-bước-1>'
bash scripts/aws/setup-cron-schedule.sh
```

Script sẽ tạo:
1. IAM Role `kandes-lambda-cron-proxy` + policy read Secrets Manager
2. Secret `kandes/cron-secret` trong Secrets Manager
3. Lambda `kandes-cron-proxy` (Node 20, 256 MB)
4. 5 EventBridge rules với lịch trùng `vercel.json`

### Verify sau khi chạy

```bash
# Resources đã tạo
aws lambda get-function --function-name kandes-cron-proxy --region ap-southeast-1
aws events list-rules --name-prefix kandes-cron --region ap-southeast-1
aws secretsmanager describe-secret --secret-id kandes/cron-secret --region ap-southeast-1

# Test thủ công 1 cron
aws lambda invoke \
  --function-name kandes-cron-proxy \
  --payload '{"jobName":"sepay-reconcile"}' \
  --region ap-southeast-1 \
  /tmp/cron-test.json
cat /tmp/cron-test.json

# Expected response:
# {
#   "statusCode": 200,
#   "body": "{\"jobName\":\"sepay-reconcile\",\"httpStatus\":200,\"appResponse\":{\"ok\":true,\"data\":{...}}}"
# }
```

Nếu `httpStatus: 401` → CRON_SECRET trong Secrets Manager không khớp với app env. Update secret:
```bash
aws secretsmanager put-secret-value \
  --secret-id kandes/cron-secret \
  --secret-string '<giá-trị-CRỚI>' \
  --region ap-southeast-1
```

### Monitor

```bash
# Tail logs
aws logs tail /aws/lambda/kandes-cron-proxy --follow --region ap-southeast-1

# Recent invocations
aws logs filter-log-events \
  --log-group-name /aws/lambda/kandes-cron-proxy \
  --region ap-southeast-1 \
  --max-items 20
```

---

## 4. Rollback / Disable

Nếu cron gây vấn đề, disable schedule:

```bash
# Disable từng rule
aws events disable-rule --name kandes-cron-sepay-reconcile --region ap-southeast-1
aws events disable-rule --name kandes-cron-expire-overdue-orders --region ap-southeast-1
aws events disable-rule --name kandes-cron-sla-scan --region ap-southeast-1
aws events disable-rule --name kandes-cron-ai-balance-sync --region ap-southeast-1
aws events disable-rule --name kandes-cron-ai-quota-alert --region ap-southeast-1
```

Xóa hoàn toàn:
```bash
aws events remove-targets --rule kandes-cron-sepay-reconcile --ids 1 --region ap-southeast-1
aws events delete-rule --name kandes-cron-sepay-reconcile --region ap-southeast-1
# ... lặp lại cho 4 rules còn lại
aws lambda delete-function --function-name kandes-cron-proxy --region ap-southeast-1
aws secretsmanager delete-secret --secret-id kandes/cron-secret --region ap-southeast-1 --force-delete-without-recovery
aws iam delete-role-policy --role-name kandes-lambda-cron-proxy --policy-name GetCronSecretPolicy
aws iam detach-role-policy --role-name kandes-lambda-cron-proxy --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
aws iam delete-role --role-name kandes-lambda-cron-proxy
```

---

## 5. Update lịch cron

Sửa trong `scripts/aws/setup-cron-schedule.sh` (function `create_rule` calls) rồi re-run script. Script dùng `put-rule` (update in place) + `put-targets` (update in place), nên re-run idempotent.

Hoặc manual:
```bash
aws events put-rule \
  --name kandes-cron-sepay-reconcile \
  --schedule-expression "cron(*/10 * * * ? *)" \  # đổi từ */5 sang */10
  --region ap-southeast-1
```

---

## 6. Cost estimate

| Resource | Usage | Cost/mo |
|----------|-------|---------|
| Lambda invocations | 5 cron × (288 + 24 + 288 + 48 + 4) = ~652 invocations/mo | $0.00 (free tier) |
| Lambda duration | ~5s avg × 652 × 256 MB = ~830 GB-s/mo | $0.00 (free tier 400k GB-s) |
| EventBridge schedules | 5 rules | ~$0.05/mo |
| Secrets Manager | 1 secret | $0.40/mo |
| CloudWatch Logs | ~1 GB/mo | $0.00 (free tier) |
| **Total** | | **~$0.45/mo** |

Nằm trong AWS Free Tier hầu hết — net cost < $0.50/mo.

---

## 7. References

- `scripts/aws/setup-cron-schedule.sh` — setup script
- `vercel.json` — lịch cron gốc (sẽ obsolete sau khi EventBridge active)
- `app/api/cron/[name]/route.ts` — cron dispatcher
- `modules/jobs/registry.ts` — 5 job handlers
- D69 deviation (`CONTEXT.md` §7)