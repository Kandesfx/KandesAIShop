# Kế hoạch P10: Audit + Multi-Channel SLA Escalation

> **Ngày tạo:** 2026-08-23
> **Tác giả:** Cursor AI assistant
> **Trạng thái:** Đang triển khai
> **Phạm vi:** Admin operations + Customer purchase flow + Multi-channel SLA escalation

---

## 1. Tổng quan vấn đề

### 1.1 Yêu cầu từ user

1. **Rà soát admin + customer flow** đảm bảo hoạt động, không gián đoạn.
2. **Notifications đa kênh** khi có khách mua hàng (telegram, gmail, zalo, sms, voice).
3. **SLA escalation cảnh cáo mạnh** khi admin duyệt đơn quá thời gian đặt sẵn (mặc định 30 phút).
4. **Set nhiều kênh cùng lúc** khi cảnh cáo (multi-channel simultaneous).
5. **Gọi điện thoại** để nhắc nhở admin (voice call).
6. **Tài liệu kế hoạch** bằng tiếng Việt, không mất context.
7. **Auto CI/CD** khi push lên GitHub.

### 1.2 Hiện trạng production (đã audit qua SSM 2026-08-23)

**EC2 `i-0a6fca834c9429bca` (kandes-prod-app, t3.small, 13.215.39.207):**

| Hạng mục | Trạng thái | Ghi chú |
|----------|-----------|---------|
| Container `kandes-app` | ✅ healthy | Image `ghcr.io/kandesfx/kandesaishop:latest` |
| Container `kandes-nginx` | ✅ running | Port 80/443 |
| Database (RDS) | ✅ connected | `kandes-db.crmca6kou3xz.ap-southeast-1.rds.amazonaws.com` |
| `EMAIL_PROVIDER=resend` | ✅ configured | |
| `RESEND_API_KEY` | ✅ set | |
| `EMAIL_FROM` | ✅ set | |
| `TELEGRAM_BOT_TOKEN` | ❌ **THIẾU** | SLA Telegram escalation fail |
| `TELEGRAM_ADMIN_CHAT_ID` | ❌ **THIẾU** | |
| `TWILIO_ACCOUNT_SID` | ❌ **THIẾU** | Voice/SMS escalation fail |
| `TWILIO_AUTH_TOKEN` | ❌ **THIẾU** | |
| `TWILIO_FROM_NUMBER` | ❌ **THIẾU** | |
| `TWILIO_VOICE_FROM_NUMBER` | ❌ **THIẾU** | |
| `ZALO_OA_ACCESS_TOKEN` | ❌ **THIẾU** | |
| `ZALO_OA_SECRET` | ❌ **THIẾU** | |
| `ZALO_OA_ADMIN_USER_ID` | ❌ **THIẾU** | |
| `PUBLIC_BASE_URL` | ❌ **THIẾU** | Voice TwiML callback không hoạt động |
| `CRON_SECRET` | ✅ set | Cron auth OK |
| Image optimization (sharp) | ⚠️ warning | Có thể ảnh hưởng /products/[id] |
| SLA scanner | ⚠️ wired | Chạy 5 phút/lần (Lambda `kandes-cron-sla-scan`) |
| Notification queue | ✅ running | DB-backed FIFO |

### 1.3 Code đã có sẵn (Phase 0-9, CONTEXT.md)

| Module | File | Trạng thái |
|--------|------|-----------|
| Notification service | `modules/notification/service.ts` | ✅ Phase 3 |
| Email provider (Resend) | `modules/notification/providers/email.ts` | ✅ P3-07 |
| Telegram provider | `modules/notification/providers/telegram.ts` | ✅ P5-01 |
| Zalo OA provider | `modules/notification/providers/zalo.ts` | ✅ P5-02 |
| SMS Twilio provider | `modules/notification/providers/sms.ts` | ✅ P5-03 |
| Voice Twilio provider | `modules/notification/providers/voice.ts` | ✅ P5-04 + `/api/voice/respond` |
| Notification templates (DB-driven) | `modules/notification/templates-db.ts` | ✅ P5-05 |
| SLA scanner cron 5p | `modules/sla/scanner.ts` | ✅ P4-08 |
| SLA escalation multi-channel | `modules/sla/escalation.ts` | ✅ P5-06 (nhưng chỉ 2/5 channels wired) |
| SLA config CRUD | `modules/sla/service.ts` + admin UI | ✅ P4-06 |
| Admin orders list/detail | `app/(manage)/manage/orders/page.tsx` | ✅ |
| Admin order actions (approve/deliver/refund/cancel) | `modules/order-admin/service.ts` | ✅ P3-05 |

### 1.4 Vấn đề cần giải

| # | Vấn đề | Mức độ | Phương án |
|---|--------|--------|-----------|
| V1 | 4/5 channels (telegram/zalo/sms/voice) không hoạt động vì env thiếu | **CRITICAL** | Thêm env vars vào `.env.kandes` + GitHub Secrets |
| V2 | SLA escalation chỉ escalate tới 1 admin (single chat ID) | **HIGH** | Hỗ trợ multiple recipients (bảng NotificationRecipient) |
| V3 | Không có "cảnh cáo mạnh hơn" khi quá ngưỡng nặng | **HIGH** | Thêm "loud" mode: gọi voice + SMS + repeat push mỗi 5 phút |
| V4 | `escalateBreach` chỉ enqueue 1 lần per breach level | **MEDIUM** | Repeat escalation mỗi 15 phút cho đến khi admin xử lý |
| V5 | Customer không nhận được notification qua telegram/zalo khi có đơn mới | **MEDIUM** | Wire customer channel opt-in (P5-07 đã có schema, cần flow + UI) |
| V6 | Admin notifications page thiếu filter theo breach level/order | **LOW** | Bổ sung filter |
| V7 | Không có escalation log/history chi tiết | **LOW** | Thêm bảng `OrderSlaEscalationLog` |
| V8 | Sharp missing in production | **MEDIUM** | Thêm `sharp` vào Dockerfile deps |
| V9 | TypeError "Cannot read properties of null (reading 'digest')" trong log | **MEDIUM** | Tìm và fix |

---

## 2. Nguyên tắc chặt chẽ (để tránh mất context)

### 2.1 Quy tắc commit & push

1. **Mỗi đợt = 1 commit có ý nghĩa.** Không gộp 5 fix rời vào 1 commit.
2. **Commit message tiếng Việt** theo pattern: `feat(scope): mô tả ngắn`.
3. **Push từng đợt** để GitHub Actions chạy CI/CD ngay.
4. **Monitor deploy** tại `https://github.com/Kandesfx/KandesAIShop/actions` + Telegram.
5. **Rollback nếu fail** theo `docs/deployment/EC2-SETUP.md` §6.

### 2.2 Quy tắc code

1. **Không tự ý đổi deviation D30-D77** đã chốt (CONTEXT.md §7).
2. **Không tự ý sửa logic nghiệp vụ** đang chạy OK, trừ khi tạo deviation mới.
3. **Mỗi thay đổi schema** = 1 Prisma migration riêng, đánh số tiếp theo migration hiện có.
4. **Mỗi route mới** phải có rate-limit + auth + audit log.
5. **Mỗi provider gọi external** phải có timeout 5s + retry queue + log mask.

### 2.3 Quy tắc test

1. **Local: `npm run typecheck && npm run lint && npm run test`** phải pass trước commit.
2. **Integration test** cho flow mới (SLA escalate multi-recipient).
3. **E2E test (Playwright)** cho UI mới (admin notifications filter).
4. **Production smoke** sau deploy: `curl https://kandes.shop/api/health` + check Telegram.

### 2.4 Quy tắc bảo mật

1. **Mask tất cả PII** trong log (email, phone, chat_id, key value).
2. **Không log secrets** (TELEGRAM_BOT_TOKEN, RESEND_API_KEY, ...).
3. **Webhook verify signature** cho mọi inbound (Telegram, Zalo, Twilio).
4. **Rate limit** cho mọi public API.
5. **Audit log** cho mọi admin write action.

---

## 3. Kế hoạch triển khai (4 phases)

### Phase A: ENV + Wire tất cả 5 channels (Quick win)

**Mục tiêu:** Bật telegram/zalo/sms/voice escalation bằng cách thêm env đúng tên.

**Tasks:**

- [ ] **A1**: Xác nhận user đã có/cần set TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_CHAT_ID.
- [ ] **A2**: Tạo `docs/deployment/NOTIFICATION_ENV.md` hướng dẫn lấy từng biến.
- [ ] **A3**: Thêm 12 env vars vào `.env.kandes` (chỗ đặt env) và GitHub Secrets.
- [ ] **A4**: Restart container `kandes-app` để reload env.
- [ ] **A5**: Test gửi thử từng channel qua admin UI `/manage/settings/notifications` (đã có test-telegram/test-zalo/test-sms/test-voice routes).
- [ ] **A6**: Verify SLA scanner escalate qua telegram khi tạo 1 paid order thủ công + sleep 35 phút.

**Acceptance:**
- Admin nhận được Telegram message khi đơn quá 30 phút.
- Admin nhận được Voice call khi đơn quá 120 phút (nếu config).

**Estimated time:** 1-2 giờ (phụ thuộc user set Twilio/Zalo).

---

### Phase B: Multi-recipient + Loud escalation

**Mục tiêu:** Cho phép nhiều admin nhận cảnh cáo + escalation lặp lại khi quá nặng.

**Tasks:**

- [ ] **B1**: Tạo Prisma model `NotificationRecipient`:
  ```prisma
  model NotificationRecipient {
    id          String   @id @default(cuid())
    userId      String?  // admin user id (optional)
    label       String   // "Hải on-call", "Backup admin"
    channels    Json     // { email?, telegramChatId?, zaloUserId?, phone? }
    isOnCall    Boolean  @default(false)
    isActive    Boolean  @default(true)
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt
    @@index([isActive, isOnCall])
  }
  ```

- [ ] **B2**: Migration `20260823XXXX_add_notification_recipients`.

- [ ] **B3**: Module `modules/notification/recipients.ts`:
  - `listActiveRecipients()` — lấy tất cả admin on-call.
  - `resolveRecipientsForBreach(level)` — level 1: 1 người, level 2: 2 người, level 3: TẤT CẢ on-call.

- [ ] **B4**: Refactor `modules/sla/escalation.ts`:
  - Loop qua recipients × channels.
  - Thêm "loud mode" cho level 3: gọi voice call 1 lần + push SMS + repeat push telegram mỗi 15 phút cho đến khi order được deliver/cancel.
  - Log ra bảng `OrderSlaEscalationLog` (mới).

- [ ] **B5**: Bảng `OrderSlaEscalationLog`:
  ```prisma
  model OrderSlaEscalationLog {
    id              String   @id @default(cuid())
    orderId         String
    thresholdLevel  Int      // 1/2/3
    channel         String   // email/telegram/zalo/sms/voice
    recipientId     String?  // null = env default
    attemptNumber   Int      // 1st, 2nd, 3rd time fire
    status          String   // sent/failed/skipped
    errorMessage    String?
    triggeredAt     DateTime @default(now())
    @@index([orderId, thresholdLevel, triggeredAt])
  }
  ```

- [ ] **B6**: Cron mới `sla-escalation-repeat` chạy mỗi 5 phút (reuse lambda `kandes-cron-sla-scan` hoặc tạo mới):
  - Tìm order ở paid/processing quá `level_3_minutes * 1.5`.
  - Nếu đã escalate lần cuối > 15 phút → escalate lại.
  - Stop khi order.status chuyển sang delivered/cancelled.

- [ ] **B7**: Tests:
  - Unit test cho `recipients.ts`.
  - Unit test cho loud mode escalation.
  - Integration test cho repeat escalation (mock clock).

- [ ] **B8**: Update docs `CONTEXT.md` §7 với deviation mới (D78).

**Acceptance:**
- 1 order quá 30 phút: 1 admin nhận email + telegram.
- 1 order quá 60 phút: 2 admin nhận email + telegram + zalo.
- 1 order quá 120 phút: TẤT CẢ admin on-call nhận email + telegram + zalo + SMS + voice call. Lặp lại mỗi 15 phút.

**Estimated time:** 6-8 giờ.

---

### Phase C: Admin UI quản lý recipients + escalation log viewer

**Mục tiêu:** Admin tự config được recipients + xem được escalation history.

**Tasks:**

- [ ] **C1**: Page `/manage/settings/notifications/recipients` (admin only):
  - Bảng list recipients với checkboxes (isActive, isOnCall).
  - Modal tạo/sửa recipient (label + channels).
  - Nút "Test gửi" tới recipient (gọi API test-telegram/test-zalo/test-sms/test-voice tương ứng).

- [ ] **C2**: Page `/manage/notifications/sla` (admin only):
  - Bảng OrderSlaEscalationLog (filter theo order, level, channel, date).
  - Stats: số lần escalate trong ngày/tuần.
  - Export CSV.

- [ ] **C3**: Trang `/manage/orders/[id]`:
  - Tab "SLA History" hiển thị các lần escalate.
  - Nút "Escalate now" (admin manual trigger).

- [ ] **C4**: Customer notification settings page `/account/settings/notifications`:
  - Đã có schema (P5-07) nhưng UI chưa có.
  - Opt-in/out telegram chat id binding (deep link `t.me/kandes_bot?start=email`).
  - Opt-in/out zalo OA.

**Acceptance:**
- Admin thêm được 3 recipients: "Hải on-call", "Hùng backup", "Nam weekend".
- Admin toggle isOnCall = true cho "Hải on-call" → SLA scanner escalate tới Hải.
- Admin xem được lịch sử escalate đơn #KDS-001.

**Estimated time:** 4-5 giờ.

---

### Phase D: Fix sharp + cleanup

**Mục tiêu:** Production ổn định 100%.

**Tasks:**

- [ ] **D1**: Thêm `sharp` vào Dockerfile (deps stage) — fix image optimization.
- [ ] **D2**: Debug `TypeError: Cannot read properties of null (reading 'digest')` — kiểm tra `app/page.tsx` hoặc layout có render null không.
- [ ] **D3**: Thêm `/api/health` deep check cho notifications queue + recent SLA activity.
- [ ] **D4**: Cleanup 3 cron logs không cần thiết + verify `db-backup` job thực sự chạy.
- [ ] **D5**: Update `docs/runbook.md` với cách xử lý khi Twilio/Zalo/Telegram down.

**Acceptance:**
- Lighthouse score `/products` > 90.
- 0 unhandled exception trong logs 24h.
- 6/6 cron jobs pass trong `/admin/health`.

**Estimated time:** 2-3 giờ.

---

## 4. Sequence triển khai

```
Phase A (Quick win)
    │
    ▼
Phase B (Core feature) ─── yêu cầu Phase A xong để test thật
    │
    ▼
Phase C (Admin UI) ─── yêu cầu Phase B xong để test recipients
    │
    ▼
Phase D (Stabilization) ─── độc lập, có thể làm song song
```

**Phase A** có thể làm NGAY với env vars user đã có sẵn (Resend + Telegram bot).
**Phase B-D** cần user cấp Twilio + Zalo accounts để test full E2E.

---

## 5. Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| User chưa có Twilio account | Voice call fail | Phase B làm code, Phase C UI đợi Twilio config |
| User chưa có Zalo OA | Zalo channel fail | Tương tự - graceful fallback skip |
| Spam telegram nếu order nhiều | Token rate-limit | Loud mode chỉ fire khi level 3 |
| Cron job fire trùng (Lambda + Vercel cron) | Duplicate escalate | D74 đã fix; double-check |
| Sharp install lỗi trên Alpine | Build fail | Pin version `sharp@0.33.5` + test local |
| TypeError digest root cause | Khó debug | Thêm Sentry capture; nếu không tìm được → defer |

---

## 6. Acceptance tổng

Sau khi triển khai xong Phase A+B+C+D:

1. ✅ Admin nhận Telegram + Email ngay khi đơn mới paid > 30 phút.
2. ✅ Khi quá 60 phút: thêm Zalo channel.
3. ✅ Khi quá 120 phút: Voice call + SMS + Telegram lặp lại mỗi 15 phút.
4. ✅ Multi-admin on-call đều nhận được cảnh báo.
5. ✅ Customer nhận notification qua Telegram/Zalo nếu opt-in.
6. ✅ Admin UI config được recipients + xem lịch sử escalation.
7. ✅ Production ổn định, 0 error log, image optimization OK.

---

## 7. Files thay đổi (preview)

**Mới:**
- `prisma/migrations/20260823XXXX_add_notification_recipients/migration.sql`
- `prisma/migrations/20260823XXXX_add_sla_escalation_log/migration.sql`
- `modules/notification/recipients.ts`
- `modules/notification/recipients.test.ts`
- `app/(manage)/manage/settings/notifications/recipients/page.tsx`
- `components/admin/notifications/recipient-table.tsx`
- `app/(manage)/manage/notifications/sla/page.tsx`
- `components/admin/notifications/sla-log-table.tsx`
- `app/api/admin/notification-recipients/route.ts`
- `app/api/admin/notification-recipients/[id]/route.ts`
- `docs/deployment/NOTIFICATION_ENV.md`

**Sửa:**
- `modules/sla/escalation.ts` (multi-recipient + loud mode + repeat)
- `modules/sla/scanner.ts` (repeat detection)
- `modules/jobs/registry.ts` (thêm `sla-escalation-repeat`)
- `modules/jobs/sla-escalation-repeat.ts` (mới)
- `Dockerfile` (thêm sharp)
- `lib/env.ts` (validate 12 env vars mới)
- `.env.kandes.example` (template)
- `scripts/aws/setup-env-link.sh` (thêm vars)
- `.github/workflows/deploy-prod.yml` (thêm secrets names)
- `app/api/admin/orders/[id]/route.ts` (thêm SLA tab)
- `CONTEXT.md` §7 (deviation D78+)

---

## 8. Out of scope (defer)

- Auto-cancel đơn khi quá `autoCancelAtMinutes` (Phase 5+ đã note).
- Customer Zalo OA binding flow (cần Zalo OA approval).
- SMS 2FA cho customer (Phase 7+).
- Voice call với AI-generated Vietnamese speech (Twilio Polly Vietnamese voices).
- Integration với Slack/Discord/Teams.
- On-call rotation (PagerDuty style) — manual config qua admin UI Phase C.

---

## 9. Status updates

> Cập nhật tiến độ theo từng commit. Khi xong mỗi task → đánh `- [x]` ở trên + ghi commit hash.

| Commit | Phase | Mô tả |
|--------|-------|-------|
| (pending) | A1 | Audit env + viết docs |
| (pending) | A2 | Thêm env vars vào .env.kandes.example |
| (pending) | A3 | Update lib/env.ts validation |
| (pending) | B1-B5 | Multi-recipient + loud escalation |
| (pending) | C1-C3 | Admin UI recipients + SLA log |
| (pending) | D1-D5 | Fix sharp + cleanup |

---
