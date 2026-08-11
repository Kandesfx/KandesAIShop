# Kandes.shop — Documentation Audit (vs Reality)

> **Mục đích:** So sánh docs hiện tại với state thật của AWS để AI agents / users không bị mislead.
>
> **Ngày audit:** 2026-08-11
>
> **Phương pháp:** Đọc toàn bộ `CONTEXT.md`, `docs/deployment/*`, `scripts/aws/*`, workflows, Dockerfile, compose. Đối chiếu với snapshot thật (`CURRENT_STATE.md`).
>
> **Phân loại:**
> - 🔴 **NGHIÊM TRỌNG**: docs sai gây hậu quả thật (cost, downtime, data loss, security)
> - 🟡 **TRUNG BÌNH**: docs sai gây nhầm lẫn nhưng user/agent có thể tự verify
> - 🟢 **NHỎ**: docs lỗi thời, cần refresh cho completeness

---

## 1. 🔴 NGHIÊM TRỌNG — cần fix ưu tiên

### 1.1 `vercel.json` cron KHÔNG chạy sau khi chuyển sang EC2

**File:** `vercel.json`
**Status:** ✅ **FIXED** (D72, 2026-08-11) — EventBridge + Lambda proxy thay thế Vercel cron. 5 jobs active. Xem `CRON_SETUP.md`.

**Hệ quả trước fix:**
- SePay reconciliation (5p) — không chạy → payment có thể miss nếu webhook miss
- Expire overdue orders (1h) — không chạy → order pending expire chậm → cart inventory leak
- SLA scan (5p) — không chạy → breach detection chậm → notification không gửi
- AI balance sync (30p) — không chạy → NCC key balance không sync → KH có thể bị exhausted mà admin không biết
- AI quota alert (6h) — không chạy → quota alert admin bị miss

**�ề xuất fix:**
1. **Quick win**: Thêm 5 systemd timer trên EC2 gọi POST `/api/cron/<name>` với `Authorization: Bearer <CRON_SECRET>`.
2. **Clean**: Đổi sang EventBridge schedule (ap-southeast-1) trigger Lambda → gọi POST route với HMAC secret.
3. **Simplest**: Viết 1 script `scripts/cron/all.sh` chạy vòng lặp mỗi N phút, set cron systemd.

---

### 1.2 `docker-compose.yml` vẫn ship `db` service — conflict với RDS

**File:** `docker-compose.yml` (dòng 76-93)
**Status:** ✅ **FIXED** (D73, 2026-08-11) — Container `db` COMMENTED in docker-compose.yml. RDS SG verified. Xem `RDS_SETUP.md`.

**Vấn đề trước fix:**
- Nếu app trỏ `DATABASE_URL=...@db:5432/...` (theo mẫu `.env` trong `EC2-SETUP.md`) → DB thật trên RDS không nhận traffic, container postgres cục bộ mới là primary → không backup, không persistent ngoài `kandes-postgres-data` volume.
- Nếu app trỏ RDS → container postgres vẫn allocate 0 traffic, tốn RAM thừa, nhưng OK.
- Migration step trong `deploy-prod.yml` dùng `DATABASE_URL` từ GitHub Secret — nếu secret trỏ RDS thì migration apply đúng RDS. Nếu secret trỏ `db:5432` → migration apply container postgres → data drift với RDS.

**Đề xuất fix:**
- Verify `DATABASE_URL` trong GitHub Secret `DATABASE_URL` trỏ RDS (`kandes-db.crmca6kou3xz.ap-southeast-1.rds.amazonaws.com:5432`) hay container (`db:5432`).
- Nếu trỏ RDS: xóa service `db` khỏi `docker-compose.yml` (giữ volumes `kandes-postgres-data` để clean). Update docs.
- Nếu trỏ container: stop RDS (cost saving) + xóa khỏi architecture docs.

---

### 1.3 Auto-stop schedule (D64) không có Lambda + EventBridge

**File:** `scripts/aws/schedule-stop-start.sh` + `DECISION_LOG.md` §5
**Vấn đề:** Script được viết nhưng `aws lambda list-functions` returns empty. `aws events list-rules --name-prefix kandes` returns empty.

**Hệ quả:** D64 claim "saves ~67% EC2 cost" là **không thật**. Instance `t3.small` chạy 24/7 → ~$19/mo thay vì $6.4/mo nếu có schedule.

**Đề xuất fix:**
- Chạy `bash scripts/aws/schedule-stop-start.sh` với env vars thật (`KANDES_INSTANCE_ID=i-0a6fca834c9429bca`, `KANDES_SNS_TOPIC_ARN=arn:aws:sns:ap-southeast-1:870730509911:kandes-cost-alerts`).
- Verify sau khi chạy: `aws lambda get-function --function-name kandes-ec2-stop-start`, `aws events list-rules --name-prefix kandes`.

---

### 1.4 Idle-trigger + Health-check wake (D68) chỉ có Route 53 HC, thiếu Lambda + EventBridge

**File:** `DECISION_LOG.md` §10
**Vấn đề:** `aws route53 list-health-checks` cho thấy 1 HC `kandes-wake-20260809` → `13.215.39.207:3000/api/health`. Nhưng không có:
- Lambda `kandes-ec2-stop-start` (CPU idle → stop)
- Lambda `kandes-ec2-wake` (HC fail → start)
- EventBridge rules `kandes-cpu-idle-trigger`, `kandes-health-check-failed-wake`

**Hệ quả:** Route 53 HC check mỗi 30s nhưng không có consumer → alarm không trigger, instance không wake. Nếu idle-trigger stop có thật, instance sẽ KHÔNG tự start khi có user request đầu tiên.

**Đề xuất fix:** Implement 2 Lambda + 2 EventBridge rules + 1 CloudWatch alarm `kandes-instance-down` (theo DECISION_LOG §10 specification).

---

## 2. 🟡 TRUNG BÌNH

### 2.1 Instance type docs sai: ghi `m7i-flex.large`, thực tế `t3.small`

**Files:** `CONTEXT.md` §7 D62, `DEPLOY_AWS.md` §1/§3, `DECISION_LOG.md` §3/§6, `MIGRATION_PLAN_M7I.md`, `EXECUTION_PLAN.md` Bước 2
**Vấn đề:** Mọi tài liệu nói instance đang chạy `m7i-flex.large` (2 vCPU, 8 GB RAM). Thực tế: `t3.small` (2 vCPU, 2 GB RAM).
**Có thể:** User chạy `migrate-instance.sh --rollback` (rollback target hardcoded là `t3.micro` — script sẽ fail vì target không phải `t3.small`), hoặc đã chạy migration script thủ công với target khác.

**Đề xuất fix:**
- Update `CONTEXT.md` D62 status từ "✅ Accepted" → "⏸️ Deferred/Revised" với note "instance remains t3.small; cost estimate updated".
- Hoặc thêm deviation D66 (build/deploy split) + D67 (silent downgrade) để document lý do.

### 2.2 `migrate-instance.sh` hardcode rollback target `t3.micro` — không match instance hiện tại

**File:** `scripts/aws/migrate-instance.sh:42`
**Vấn đề:** `OLD_TYPE="t3.micro"`. Nếu cần rollback từ `m7i-flex.large` về `t3.small`, script sẽ báo "already t3.micro, nothing to rollback".

**Đề xuất fix:** Đổi `OLD_TYPE="t3.small"` cho khớp với instance baseline mới.

### 2.3 `IMAGE` env var không được compose đọc — rollback procedure docs sai

**Files:** `docker-compose.yml:24`, `.github/workflows/deploy-prod.yml:147`, `EC2-SETUP.md:368`
**Vấn đề:**
- Compose hardcode `image: ghcr.io/kandesfx/kandesaishop:latest` — không interpolation `${IMAGE}`.
- Step "Restart containers" ghi `IMAGE=...` vào `.env` nhưng compose không đọc.
- `EC2-SETUP.md` §6 Rollback hướng dẫn `Edit .env: IMAGE=ghcr.io/.../kandesaishop:<sha>` — sẽ KHÔNG có tác dụng.

**Đề xuất fix:**
- Option A: Đổi compose thành `image: ${IMAGE:-ghcr.io/kandesfx/kandesaishop:latest}`.
- Option B: Update `EC2-SETUP.md` §6 để sửa trực tiếp compose (hoặc dùng `docker pull` riêng + tag local).

### 2.4 `kandes-cpu-idle` alarm không tồn tại trên AWS

**Files:** `scripts/aws/cloudwatch-alarm.sh` (có script tạo) vs `aws cloudwatch describe-alarms` (chỉ có `kandes-cpu-high` + `kandes-status-check`)
**Vấn đề:** Script được viết nhưng `kandes-cpu-idle` alarm không có trên AWS. Có thể:
- Script chạy fail silently (IAM permission thiếu?) — `cloudwatch-alarm.sh` có logic `&& echo OK || echo FAILED` nên có thể FAILED nhưng không block.
- Hoặc script chạy thành công nhưng alarm bị xóa sau đó.

**Đề xuất fix:**
- Chạy lại `bash scripts/aws/cloudwatch-alarm.sh` với quyền IAM đầy đủ.
- Verify: `aws cloudwatch describe-alarms --region ap-southeast-1 --alarm-name-prefix kandes-`.

### 2.5 Container `db` không có backup automation

**Files:** `docker-compose.yml`, `scripts/aws/*` (không có backup-db.sh), `app/api/cron/db-backup/route.ts` (có route — D29 nói in-process Vercel cron)
**Vấn đề:** Nếu user thật sự dùng container postgres (theo `docker-compose.yml` 1.2), không có backup automation từ compose → chỉ dựa vào Vercel cron đã ngừng chạy.

**Hệ xem `CURRENT_STATE.md` §2.**

### 2.6 Orphan Elastic IP `18.140.102.23`

**File:** (chưa ghi nhận)
**Vấn đề:** EIP `eipalloc-077dae100efe47c86` không associate, đang tốn $0.005/hr = ~$3.6/mo.

**Đề xuất fix:** Release nếu không dùng:
```bash
aws ec2 release-address --allocation-id eipalloc-077dae100efe47c86 --region ap-southeast-1
```

---

## 3. 🟢 NHỎ

### 3.1 Hardcoded fallback password trong compose

**File:** `docker-compose.yml:85` — `POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-kandes_dev_2026}`
**Vấn đề:** Fallback password lộ trong image metadata + git history. Best practice: fail-fast nếu env không set.

### 3.2 `scripts/aws/budget-alarm.sh` không verify SNS email subscription

**File:** `scripts/aws/budget-alarm.sh:70`
**Vấn đề:** Subscribe email nhưng không check confirmation. Nếu user không confirm → alarm trigger nhưng không ai nhận.

### 3.3 Health check trong workflow có `sleep 15` cố định

**File:** `.github/workflows/deploy-prod.yml:148`
**Vấn đề:** Sleep cố định + 5 polls × 5s = ~40s. Có thể miss nếu app start chậm (Prisma pool warm-up).

**Đề xuất fix:** Retry loop với exponential backoff (max 90s).

### 3.4 `docker-compose.yml` không pull base images trong deploy workflow

**File:** `.github/workflows/deploy-prod.yml:127-129`
**Vấn đề:** Chỉ pull app image, không pull `nginx:1.27-alpine`, `postgres:16-alpine`. Nếu base image có security patch → không apply.

**Đề xuất fix:** Thêm `docker compose pull` trư�c `up -d`.

### 3.5 Không có image vulnerability scanning

**File:** `.github/workflows/deploy-prod.yml`
**Vấn đề:** Không có step `trivy image` / `snyk container scan`. CVE trong base image hoặc npm deps có thể không biết.

### 3.6 Không có rollback procedure cho migration fail

**File:** `.github/workflows/deploy-prod.yml:128-138`
**Vấn đề:** `prisma migrate deploy` fail → workflow fail nhưng không có step `prisma migrate resolve --rolled-back` hoặc manual intervention script.

---

## 4. Update roadmap

| Priority | Item | Estimated effort |
|----------|------|------------------|
| P0 | Cron jobs (1.1) — 5 systemd timers | 1h |
| P0 | DB consolidation (1.2) — verify + update compose | 30 min |
| P0 | Run `schedule-stop-start.sh` (1.3) | 15 min |
| P0 | Implement D68 wake Lambda (1.4) | 2h |
| P1 | Update instance type docs (2.1) | 30 min |
| P1 | Fix `migrate-instance.sh` rollback (2.2) | 5 min |
| P1 | Fix `IMAGE` env var mismatch (2.3) | 10 min |
| P1 | Re-create `kandes-cpu-idle` alarm (2.4) | 10 min |
| P2 | Release orphan EIP (2.6) | 5 min |
| P2 | Remove hardcoded password (3.1) | 5 min |
| P2 | Pull base images in deploy (3.4) | 5 min |
| P3 | Trivy image scanning (3.5) | 1h |
| P3 | Migration rollback procedure (3.6) | 1h |

---

## 5. Files cần cập nhật

| File | Reason | Section |
|------|--------|---------|
| `CONTEXT.md` §7 | Update D62 status; add D66/D67/D68 actual | §7 table |
| `docs/deployment/DECISION_LOG.md` §3, §5, §10 | Update instance type, note actual Lambda/EC state | §3, §5, §10 |
| `docs/deployment/DEPLOY_AWS.md` §1, §3 | Update diagram + cost estimate | §1, §3 |
| `docs/deployment/EXECUTION_PLAN.md` Bước 1, 2 | Status update; Bước 2 không còn applicable | Bước 1 (✅ done), Bước 2 (⏸️ n/a) |
| `docs/deployment/MIGRATION_PLAN_M7I.md` | Add note "instance remains t3.small as of 2026-08-10" | Header |
| `scripts/aws/migrate-instance.sh` | Fix `OLD_TYPE` to `t3.small` | Line 42 |
| `docker-compose.yml` | Either remove `db` service OR make `image` use `${IMAGE}` | Line 24, 76-93 |
| `.github/workflows/deploy-prod.yml` | Add `docker compose pull`, health check retry, optional Trivy | Lines 127-160 |
| `EC2-SETUP.md` §6 | Update rollback procedure | §6 |

---

## 6. Tóm tắt

**Tài liệu khá tốt về intent + architecture**, nhưng **state thật drift khá xa** so với docs, đặc biệt:
- 4 items 🔴 (cron, db conflict, schedule, wake) gây hậu quả thật
- 6 items 🟡 gây nhầm lẫn khi debug / roll forward

**Cao nhất:** Cron jobs đang NGỪNG (item 1.1) — đây là regression nghiêm trọng vì ảnh hưởng trực tiếp đến business ops (payment reconciliation, SLA, AI balance).
