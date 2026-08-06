# Kandes.shop — AWS Safety Scripts

> **D64 (CONTEXT.md §7):** Safety mechanism cho m7i-flex.large cost control
> **Mục đích:** Tận dụng m7i-flex.large ($0.1197/hr) mà không đốt tiền $200 credits trong 2.2 tháng.

---

## Scripts

| File | Mục đích | Khi nào chạy |
|------|----------|--------------|
| `budget-alarm.sh` | Tạo AWS Budget 3 thresholds ($100/$150/$180) + SNS topic | Ngay sau khi upgrade lên m7i-flex.large |
| `schedule-stop-start.sh` | Auto-stop 23:00 VN, auto-start 07:00 VN (~67% savings) | Sau budget-alarm, khi đã ổn định |
| `cloudwatch-alarm.sh` | CloudWatch alarms (cost, CPU, status check) | Cùng với budget-alarm |
| `migrate-instance.sh` | Stop → Change type → Start (zero data loss) | Khi upgrade hoặc rollback |

---

## Setup order

```bash
# 1. Set environment
export KANDES_INSTANCE_ID=i-0123456789abcdef0
export KANDES_SNS_TOPIC_ARN=arn:aws:sns:ap-southeast-1:ACCOUNT:kandes-cost-alerts
export AWS_REGION=ap-southeast-1

# 2. Setup budget alarm (FIRST - critical)
./scripts/aws/budget-alarm.sh

# 3. Setup CloudWatch alarms
./scripts/aws/cloudwatch-alarm.sh

# 4. Setup auto-stop/start (saves ~67%)
./scripts/aws/schedule-stop-start.sh

# 5. Migrate instance (nếu chưa làm)
./scripts/aws/migrate-instance.sh
```

---

## Cost comparison (30-day estimate)

| Setup | Hours/day | Monthly cost | Notes |
|-------|-----------|--------------|-------|
| m7i-flex.large 24/7 | 24 | $89.7 | Baseline (D62) |
| **m7i-flex.large auto-stop 8h/day** | 8 | **$28.7** | Recommended (D64) |
| m7i-flex.large auto-stop 12h/day | 12 | $43 | Hybrid |
| t3.small 24/7 | 24 | $19 | Cheaper alternative |
| t3.micro 24/7 (Free Tier) | 24 | $0 (until credits run out) | Current |

→ **Recommended:** Auto-stop 8h/day giữ performance cao + cost controlled.

---

## Telegram integration (optional)

Budget alarms gửi qua email + SNS. Để forward qua Telegram:

```bash
# 1. Tạo Lambda function forward SNS → Telegram
# 2. Add trigger: SNS topic kandes-cost-alerts
# 3. Lambda code: gọi Telegram Bot API

# See: docs/deployment/TELEGRAM_INTEGRATION.md (TODO)
```

Shortcut: SNS → email → user forward thủ công (acceptable với 1 user).

---

## Monitoring best practices

### Daily (manual check):
- AWS Console → Billing → Current charges
- Nếu > $5/day → xem xét enable auto-stop

### Weekly:
- CloudWatch dashboard (tạo nếu chưa có)
- Cost & Usage report
- Alarm history (đã trigger chưa)

### Monthly:
- Review budget burn rate
- Decide có cần hạ instance xuống không

---

## Rollback procedure

Nếu có vấn đề với m7i-flex.large (RAM leak, crash, etc.):

```bash
# Quick rollback to t3.micro
./scripts/aws/migrate-instance.sh --rollback
```

Downtime: ~2 phút. EBS volume giữ nguyên 100% data.

---

## Reference

- D62-D64 trong `CONTEXT.md` §7
- `docs/deployment/MIGRATION_PLAN_M7I.md`
- `docs/deployment/DECISION_LOG.md` §5
- AWS Budget docs: https://docs.aws.amazon.com/cost-management/latest/budgets/
- EventBridge cron: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-rule-schedule.html
