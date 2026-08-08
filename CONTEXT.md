# Kandes.shop — Project Context (root)

> **Mục đích:** 1 trang "source of truth" ngắn gọn để re-ground AI qua mỗi session mới.
> **Không thay thế** `docs/`. Đây là index + reminders. Khi conflict → `docs/` thắng.

---

## 1. Project

- **Tên:** Kandes.shop
- **Loại:** Cửa hàng số (digital goods) — sản phẩm AI / công cụ lập trình
- **Domain:** kandes.shop
- **Stack:** Next.js 14 (App Router) + TypeScript (strict) + Prisma + PostgreSQL + Tailwind + shadcn/ui
- **Auth:** jose (JWT) + argon2id + Zod
- **Test:** Vitest + Playwright

## 2. Phase status (cập nhật 2026-08-05)

| Phase | Status | Ghi chú |
|-------|--------|---------|
| Phase 0: Foundation | ✅ Done | Setup, Prisma, env, design tokens, landing |
| Phase 1: Catalog | ✅ Done | Products/categories CRUD + public APIs |
| Phase 2: Auth/Cart/Checkout | ✅ Done | P2-01..P2-09 + tests (132 total) |
| Phase 3: Payment/Inventory/Delivery | ✅ Done | P3-01..P3-09 + SePay webhook + reconcile cron + INSTANT_AUTO delivery + DB-backed notification FIFO (D25/D29) |
| Phase 4: Admin Ops | ✅ Done (P4-01..P4-11) | Dashboard + Users + Reviews + Coupons + Settings (general/payment/email/notifications/sla + SlaConfig CRUD) + Reports (revenue/inventory/top-products + CSV export) + SLA scanner cron (mỗi 5p, D32) + Audit Logs viewer (P4-09) + Health Check page (DB/Redis/SePay/email/queue, D34) + FAQ & Contact (admin CRUD + public `/help/faq` + `/help/contact` form, D33). |
| Phase 5: Notifications đa kênh | ✅ Done (P5-01..P5-08) | 5 providers wired (email/telegram/zalo/sms/voice) — `modules/notification/providers/{telegram,zalo,sms,voice}.ts` — Tất cả channels route qua `notificationService.processQueue` → provider tương ứng. SLA escalation (P5-06) multi-channel. Admin templates (P5-05) DB-driven với `{{var}}` whitelist. Customer notification center (P5-07) opt-in Telegram/Zalo + Webhooks. Admin dashboard (P5-08) list/filter/retry tại `/admin/notifications`. Twilio Voice TwiML callback `/api/voice/respond` (vi-VN, DTMF gather 1=confirm/2=reject). Schema migration: `20260805030000_add_user_notification_prefs` thêm 3 cột trên User. |
| Phase 6: AI Gateway (Reseller) | ✅ Done (commit `98bcc45`, 2026-08-05) | Reseller model — Kandes pass-through proxy `api.ccpro.cn/v1` qua path-prefix `/api/ai/v1` (D51). 3 migrations (`ai_ncc_keys` + AI_RESELLER + `ProductVariant.aiPlanId`), 14 modules `modules/ai-gateway/` (token/auth/quota/models/cost/failover/stream/service/ncc-keys/email/validators + providers/{ccpro,openai,anthropic} + 6 test files). 14 routes (3 public `/api/ai/v1/`, 3 user `/api/me/ai-keys/`, 6 admin `/api/admin/ai/`, 2 cron). 9 UI pages (4 admin `/admin/ai/`, 2 user `/account/api-keys/`, 3 docs). `AI_RESELLER` delivery auto-grants NCC key on payment. 47 unit tests mới (377 total). Verify: typecheck/lint/test/build all pass. Deviations D46..D52 honored. See `docs/tasks/PHASE_6_AI_GATEWAY.md` + `docs/tasks/PHASE_6_PLAN.md` (checklist 100% done). |
| Phase 7: Hardening | ✅ Done (P7-01..P7-10, 2026-08-05) | P7-01: Security headers (CSP/HSTS) + global rate-limit middleware. P7-02: next/font/next/image/avif-opt. P7-03: Sentry client/server configs. P7-04: DB backup cron (pg_dump → S3, 30d retention). P7-05: Support ticket system (service + API routes + migration). P7-06: GDPR pages (/legal/privacy, /legal/terms, /legal/refund-policy), data export + account delete APIs, cookie consent banner. P7-07: Sitemap, robots.txt, OG image, Plausible analytics. P7-08: error/not-found/global-error pages verified. P7-09: Playwright config + 3 spec files. P7-10: DEPLOY.md + docs/runbook.md. Phase 7-RB (brand abstraction) merged — D53..D59 still apply. **D61 (2026-08-06): CD pipeline với self-hosted GitHub Actions runner + OIDC deploy role. Workflow: `.github/workflows/deploy-prod.yml`. Lint/test skipped — fix trong Phase UI cleanup.** |
| Phase 8a: CI Baseline (lint + test re-enable) | ✅ Done (2026-08-07) | Khôi phục baseline CI: thêm `.eslintrc.json` (next/core-web-vitals + prettier) + `vitest.setup.ts` (dotenv + safe env defaults). Sửa `components/ui/input.tsx` (React hook order), sửa `modules/jobs/cleanup-pending.ts` (scan query bỏ cutoff → revalidate grace trong loop, khớp counters `scanned/skipped/cancelled`). Kết quả: `npm run lint` exit 0 (1 warning `no-img-element` — không block), `npm run typecheck` exit 0, `npm run test` 53/53 files + 447/447 tests pass. Re-enable lint + test trong `.github/workflows/deploy-prod.yml` job `build`. |
| Phase 8b: Storefront Purchase Flow UI Cleanup | ✅ Done (commits `96f3e4a..db3687e`, 2026-08-08) | Audit storefront (Landing → Catalog → PDP → Cart → Checkout → Order → Track) → 47 findings (A1..F6) chia 5 đợt. Đợt 1 (`96f3e4a`): A1 AddToCartButton client component + A5 variant selector + A6 bỏ name state + A3 router.refresh + B10 footer link + C10 stale comment. Đợt 2 (`09e4146`): CartProvider context (useReducer) + auth-aware header + HeaderAuth component. Đợt 3 (`c1d0e43`): Mobile nav drawer + sticky filter offset + clear filters button + PDP gallery. Đợt 4 (`3797253`): Accessibility (E1-E5) — focus trap hook, countdown ARIA, variant aria-pressed, list semantics, useId. Đợt 5 (`db3687e`): Contract hardening (A4 checkout error context, D9 dynamic version, F3/F6 clarifying comments). Kết quả: 53/53 test files, 447/447 tests pass, typecheck + lint clean (1 warning `no-img-element` pre-existing). Spec: `docs/tasks/PHASE_8_STOREFRONT_CLEANUP.md`. Plan: `docs/tasks/PHASE_8_PLAN.md`. Phase 9 backlog: PDP polish (reviews/cross-sell/share/trust), cart save-for-later, countdown sync, Turnstile, success route. |
| Phase 9+ (backlog) | ⏳ | PDP polish (Reviews, cross-sell, share, trust), Cart save-for-later, Countdown sync, Turnstile cho checkout, success page route. Note từ `PHASE_8_STOREFRONT_CLEANUP.md` §"Out-of-scope". |

## 3. Bắt đầu 1 task — Checklist (BẮT BUỘC)

1. Đọc `docs/tasks/PHASE_X_*.md` cho task hiện tại (Phase 8b đã done — xem §2 table).
2. Đọc `docs/business/USER_STORIES.md` + `BUSINESS_RULES.md` cho nghiệp vụ liên quan.
3. Đọc `docs/database/ERD.md` cho schema liên quan.
4. Đọc `docs/api/REST_API.md` cho endpoints liên quan.
5. Đọc code hiện có trong `modules/<domain>/` và `app/api/<domain>/` (nếu có).
6. **KHÔNG tự ý đổi kiến trúc lớn.** Nếu cần → hỏi user trước.

## 4. Quy tắc code (tóm tắt — đầy đủ ở `docs/tasks/MASTER_SPEC.md` §4)

- **TypeScript:** `strict: true`. Không `any`. Prefer `interface` cho public, `type` cho utility.
- **Naming:** file `kebab-case.ts`, component `PascalCase.tsx`, var/func `camelCase`, const `UPPER_SNAKE_CASE`, boolean prefix `is/has/should`.
- **Imports order:** external → `@/lib/*` → `@/modules/*` → relative → `import type`.
- **Errors:** custom `AppError` subclasses (`NotFoundError`, `ValidationError`, ...). Route handler catch + `fail(err, req)`.
- **Validation:** Zod ở route boundary. KHÔNG validate trong service (trust internal calls).
- **DB:** Prisma client singleton. Money = `BigInt` cents. Transaction cho multi-step writes.
- **Logging:** `pino` qua `lib/logger.ts`. KHÔNG log password, token, OTP, key value, SĐT khách.
- **Security:** argon2id, AES-256-GCM cho secrets, httpOnly+Secure+SameSite=Lax cookie, rate-limit mọi public API.
- **Response shape:** `{ ok: true, data }` / `{ ok: false, error: { code, message, fields? } }`.
- **Comments:** giải thích TẠI SAO, không CÁI GÌ.

## 5. Cấu trúc thư mục (key paths)

```
app/
├── (admin)/admin/       # Admin panel (cần role staff/admin/super_admin)
├── api/                 # API routes (public + admin + auth + me)
├── auth/                # Customer auth pages: login, register, forgot, reset, verify-otp, login-otp
├── account/             # Customer area (cần auth): profile, settings, orders (P2-09)
├── cart/                # P2-06: cart page
├── checkout/            # P2-07: checkout flow
├── products/            # Public catalog: list + detail
└── page.tsx             # Landing

modules/
├── auth/                # P2: session, password, otp, oauth, service, validators
├── catalog/             # P1: products, categories
├── cart/                # P2-06: service, guest, validators, types
└── checkout/            # P2-07: pending

lib/
├── auth.ts              # Re-exports getCurrentUser/requireRole từ modules/auth
├── db.ts                # Prisma singleton
├── env.ts               # Zod env validation
├── errors.ts            # AppError + subclasses
├── encryption.ts        # AES-256-GCM + generateOtp/hashOtp
├── email.ts             # EmailProvider interface + console provider
├── rate-limit.ts        # in-memory fallback (Upstash-ready)
├── password.ts          # argon2id helpers
├── http.ts              # ok/fail/parseInput/getClientIp
├── serialize.ts         # BigInt/Date/Decimal/Buffer → JSON
├── logger.ts            # pino with redact
└── middleware/
    ├── auth.ts          # withAuth/withRole/AuthedContext
    └── rbac.ts          # can(role, permission)

components/
├── ui/                  # Primitives (Button, Input, Card, Badge, EmptyState)
├── auth/                # OtpInput, AuthShell, login-form, register-form, ...
├── account/             # Profile, ChangePassword, LogoutAll
├── admin/               # Admin forms
├── brand/               # Logo
└── product/             # ProductCard, FilterPanel, Pagination

prisma/
├── schema.prisma        # Source of truth (mirror docs/database/SCHEMA.md)
├── migrations/          # Mỗi schema change = 1 migration
└── seed.ts

docs/                    # KHÔNG XOÁ, KHÔNG SỬA (trừ khi user yêu cầu)
```

## 6. Auth contract (Phase 2 — đã chốt với user)

| Aspect | Value | Source |
|--------|-------|--------|
| Access token TTL | 15 phút | User quyết định q3 (đánh đổi: BR-4.6 = 30 ngày, COMPONENTS §7 = 15p) |
| Refresh token TTL | 7 ngày | User quyết định q3 |
| Refresh storage | DB `sessions.refresh_token_hash` (sha256) | User quyết định q1 |
| Cookie names | `kds_access` (path `/`), `kds_refresh` (path `/api/auth`) | Implementation |
| Cookie flags | httpOnly, Secure (prod), SameSite=Lax | BR-4.7 |
| Password hash | argon2id (memoryCost 19MiB, timeCost 2) | BR-4.2 |
| OTP TTL | 10 phút | BR-4.3 |
| OTP attempts | max 5 | BR-4.3 |
| OTP rate-limit | 5/min/IP, 10/day/contact | BR-4.4 |
| Login rate-limit | 10/15min/IP | BR-4.5 |
| Email verify on register | Auto (q2) | User quyết định q2 |
| Password reset mechanism | Argon2 hash + email link (q4) | User quyết định q4 |

**Lưu ý deviations:**
- Mình đã thêm model `PasswordResetToken` (chưa có trong ERD ban đầu). Migration: `20260803201418_add_password_reset_tokens`.
- `lib/auth.ts` (root) là re-export wrapper của `modules/auth/session.ts` để giữ API cũ (`getCurrentUser`, `requireRole`) mà Phase 1 admin code đang dùng.

## 7. Deviations từ docs (status)

| # | Item | Status | Note |
|---|------|--------|------|
| D1 | Access token TTL | ✅ Resolved (q3) | 15p + 7d refresh — BR-4.6/COMPONENTS conflict acknowledged |
| D2 | Auth page path | ✅ Resolved (2026-08-04) | Moved to `app/(auth)/*` |
| D3 | `PasswordResetToken` model | ✅ Resolved (2026-08-04) | Model giữ; ERD.md updated |
| D4 | Form logout | ✅ Resolved (2026-08-04) | `LogoutButton` client component |
| D5 | Register OTP name | ✅ Resolved (2026-08-04) | `/auth/register-otp` page nhập name trước |
| D6 | Order `payment_reference` | ✅ Resolved (P2-07) | Format `KDS {seq 4-digit}` (vd `KDS 0042`). SePay webhook Phase 3 regex `/KDS\s*(\d{4})/i` match. |
| D7 | Order `order_number` format | ✅ Resolved (P2-07) | `KDS-YYYYMMDD-XXXX` — BR-1.1; sequence reset mỗi ngày (UTC). Race-safe qua Prisma unique + retry. |
| D8 | Cookie `kds_refresh` path-scope `/api/auth` | ⚠️ Known limitation | `/api/me/logout-all` không nhận refresh cookie — nếu access hết hạn phải login lại. |
| D9 | Cart strategy: guest cart lưu DB thay vì cookie items | ✅ Accepted (P2-06) | Cookie `kds_cart` chỉ chứa opaque token → server lookup `Cart.guestToken`. Lý do: persistent cross-device, share được, schema có sẵn. |
| D10 | CartService signature `userId \| null` thay vì `cartId` | ✅ Accepted (P2-06) | Service nhận userId null + tự resolve cart. Tiện hơn signature COMPONENTS §3. |
| D11 | Snapshot price update lại mỗi lần add | ✅ Accepted (P2-06) | Cart dùng giá freshest, không phải giá ban đầu. Khi admin đổi giá → cart update. |
| D12 | Guest checkout: tái dùng cookie `kds_cart` cho order ownership | ✅ Accepted (P2-07) | `Order.guestToken` mirror `Cart.guestToken`. Clear cookie sau khi tạo order. |
| D13 | Auto-cancel pending order sau khi hết hạn (BR-1.2) qua polling endpoint, không cron | ✅ Accepted (P2-07) | Phase 2 chưa có cron; route `/api/orders/[orderNumber]/status` trigger `expireOverdueOrder()` mỗi lần client poll. Phase 3 sẽ thay bằng cron + SePay webhook. |
| D14 | QR dùng img.vietqr.io static URL thay vì SePay API dynamic | ✅ Accepted (P2-07) | Phase 2 chưa cần EMV Co-QR; static URL miễn phí, đủ cho dev/demo. Phase 3 chuyển sang SePay API. |
| D15 | Guest tracking chống enumerate: rate-limit 30/min/IP + constant-time delay + cùng trả 404 | ✅ Accepted (P2-08) | Phase 2 không dùng OTP verification; service delay ~200ms trước khi trả match/throw, cùng response shape. Phase 3 sẽ thêm OTP verify + audit log. |
| D16 | Reveal key yêu cầu password (không phải OTP như REST_API §4 ghi) | ✅ Accepted (P2-09) | Password verify nhanh + không phụ thuộc email/SMS latency + anti-phishing/shared device. User OTP-only chưa support (rejected vì `NO_PASSWORD` 400). Phase 3 thêm OTP option. |
| D17 | Integration tests dùng chung DB dev (kandes_shop) — cleanupAll xoá data | ✅ Accepted (P2-06) | Tiết kiệm setup; user phải `npm run prisma:seed` sau test. KHÔNG chạy song song dev server. Phase 3 sẽ tạo DB test riêng (kandes_shop_test) + Docker compose. |
| D18 | SePay webhook sync processing thay vì BullMQ | ✅ Accepted (P3-01) | Phase 3 webhook trả 200 OK ngay sau persist. BullMQ queue + retry → Phase 4. Khi fail → log + manual retry qua admin tool. |
| D19 | Delivery strategies FILE/TOPUP/EXTERNAL_INVITE chỉ set status 'processing' | ✅ Accepted (P3-04) | Phase 3 chỉ implement INSTANT_AUTO end-to-end. 5 strategies còn lại đợi admin nhập thủ công. Phase 4+ sẽ wire tới provider APIs (file upload, topup API, external invite email). |
| D20 | Admin order UI postpone sang Phase 4 | ✅ Accepted (P3) | Phase 3 admin dùng API trực tiếp + Prisma Studio. UI CRUD qua Next.js admin pages → Phase 4. |
| D21 | `lib/webhook-verify.ts` — generic HMAC helper (tái dùng Twilio/Telegram sau) | ✅ Accepted (P3-01) | Phase 3 dùng cho SePay. Phase 4+ dùng tiếp cho Twilio/Telegram nếu cùng chuẩn HMAC. |
| D22 | `paymentReference` regex match cả short ref (`KDS XXXX`) và full (`KDS-YYYYMMDD-XXXX`) | ✅ Accepted (P3-01) | Short ref fallback qua `Order.paymentReference` field. Khi SePay gửi content chỉ chứa 4 digits → tìm theo suffix + cùng ngày. |
| D23 | `InventoryItem` reserve dùng `findFirst + update` trong transaction thay vì `updateMany` | ✅ Accepted (P3-03) | `updateMany` không có `take: 1` → reserve TẤT CẢ items cùng lúc (bug). `findFirst` + `update` qua `$transaction` đảm bảo atomic 1 row. |
| D24 | `searchByFingerprint` exact match, không `contains` | ✅ Accepted (P3-03) | `contains` leak qua substring search. Phase 3 chỉ admin search exact 16-hex fingerprint. |
| D25 | Notification queue dùng DB-backed FIFO (table `Notification`) thay vì BullMQ | ✅ Accepted (P3-07) | Vercel free tier không có worker process. Phase 4 multi-worker deploy refactor sang Upstash Redis + BullMQ, schema giữ nguyên. Backoff schedule (`1m/5m/15m`) lưu trong `payload._nextAttemptAt` JSON cho tới khi promote thành column. |
| D26 | Admin write endpoints `staff` chỉ READ; `admin`/`super_admin` mới WRITE | ✅ Accepted (P3-05) | `listOrders` / `getOrderDetail` cho phép staff xem để vận hành. Mọi action (approve/deliver/refund/cancel/note) require `admin`/`super_admin`. Logic guard nằm ở service (`assertRead`/`assertWrite`) — đặt trong `modules/order-admin/service.ts` để policy một chỗ. |
| D27 | Refund chỉ ghi nhận nội bộ, KHÔNG gọi SePay refund API | ✅ Accepted (P3-05) | Phase 3 chỉ flip `Order.status='refunded'`, set `refundedAt` + restore inventory. Admin xử lý chuyển khoản thật qua SePay dashboard. Phase 5 sẽ add SePay refund API + auto reconciliation. |
| D28 | Email template dùng HTML inline (giống `lib/email.ts#otpEmail`) thay vì React Email | ✅ Accepted (P3-07) | Phase 3 chỉ có 5 events, giữ scope gọn. Khi add nhiều variants / multi-language → phase 5 refactor sang React Email (D2 store). Đợt này đặt template resolver trong `modules/notification/templates.ts` để dễ swap. |
| D29 | Cron jobs qua Vercel Cron → in-process handlers, không BullMQ | ✅ Accepted (P3-02/P3-09) | Vercel free tier không có worker process. Dispatcher `app/api/cron/[name]/route.ts` verify Bearer `CRON_SECRET` rồi gọi handlers trong `modules/jobs/`. SePay-reconcile gọi `recordPayment` (đã idempotent qua `providerTransactionId`) → duplicate = noop. BullMQ / Upstash Redis đợi Phase 4 multi-worker. |
| D30 | Settings runtime = env-only-frozen (P4-06) | ✅ Accepted (P4-06) | SePay/Email/Notification tokens đọc từ `lib/env.ts` lúc startup (frozen). `Setting` table (DB) chỉ phục vụ admin UI display + audit. Khi admin edit value qua UI → chỉ update DB; sensitive field empty → giữ nguyên. Restart process để env change có hiệu lực. Phase 5+ có thể refactor sang hot-reload (Upstash/Redis cache) nếu cần. |
| D31 | Reports in-process recompute mỗi request (P4-07) | ✅ Accepted (P4-07) | Revenue/Inventory/Top-products query trực tiếp DB + aggregate trong Node, không pre-aggregate. OK cho MVP dưới ~100k orders. Phase 5+ → materialized view daily cron hoặc Upstash/Vercel KV cache 5p nếu cần scale. CSV export chỉ áp dụng cho revenue. |
| D32 | SLA scanner: email-only channels Phase 4 (P4-08) | ✅ Accepted (P4-08) | Scanner scan paid/processing orders mỗi 5p, resolve SlaConfig (product → category → global), trigger ngưỡng 1/2/3 theo channels config. Phase 4 chỉ enqueue channel `email` (qua `notificationService.notify`). Channels `telegram/zalo/sms/voice` log warn + ghi `OrderSlaHistory` row nhưng skip enqueue — providers đợi Phase 5+ thêm. Idempotency qua query check `(orderId, thresholdLevel)` trước khi write (giữ schema y nguyên, chưa unique). Auto-cancel chưa chạy — Phase 5+ sẽ thêm cron riêng. |
| D33 | FAQ + Contact: schema bổ sung (P4-11) | ✅ Accepted (P4-11) | Bảng `faqs` + `contact_submissions` chưa có trong schema Phase 0 init → migration mới `20260805020000_add_faqs_and_contacts` thêm 2 models + 3 enums (`FaqStatus`, `FaqCategoryEnum`, `ContactStatus`). FAQ có category enum 6 loại (general/payment/delivery/account/refund/technical) thay vì string freeform để enforce filter. Contact form public rate-limit 10/IP/giờ chống spam. |
| D34 | Health Check: stub-friendly subsystems (P4-10) | ✅ Accepted (P4-10) | Page `/admin/health` check DB (SELECT 1), Redis (Upstash REST ping — optional n/a khi thiếu config), SePay (1-record list call — optional n/a khi thiếu token), Email (config check, không gửi thật), Notification queue (DB groupBy status counts — warn nếu failed>50), Cron (listJobs từ registry). Overall = worst-case status. Stub-friendly: thiếu config → n/a, không fail Phase 4. Phase 5+ wire providers thật sẽ upgrade các check n/a → ok/fail. |
| D35 | Telegram provider: real HTTP qua Bot API (P5-01) | ✅ Accepted (P5-01) | `modules/notification/providers/telegram.ts` call `https://api.telegram.org/bot<token>/sendMessage` với parse_mode Markdown. Timeout 5s (AbortSignal). Subject prepend `*…*\n\n`. Mask chat_id khi log. `NotificationProvider` interface (`send(to, subject, html, text)`) cho email + telegram; zalo/sms/voice sẽ follow cùng interface. Test mock fetch global; integration test với real bot cần user set TELEGRAM_BOT_TOKEN + TELEGRAM_ADMIN_CHAT_ID env. |
| D36 | Notification templates: DB-driven + {{var}} interpolation (P5-05) | ✅ Accepted (P5-05) | `modules/notification/templates-db.ts` resolve `(event, channel, language)` từ `NotificationTemplate` table. Whitelist vars (`orderNumber`, `totalCents`, `currency`, `reason`, `minutesOver`, `level`, `productName`) — unknown → empty string. HTML escape tự động để tránh injection. Channel email fallback to hardcoded Phase 3 templates; channel telegram strip HTML → plain text. Admin UI: `/admin/settings/notifications/templates` (channel × language × event selector + textarea + isActive). Upsert qua `POST /api/admin/notification-templates`. Idempotent unique key `(code, channel, language)`. |
| D37 | SLA escalation multi-channel (P5-06) | ✅ Accepted (P5-06) | `modules/sla/escalation.ts` refactor scanner: mỗi breach level lặp qua `cfg.thresholdNChannels` → resolve recipient (email: order.userId → user.email; telegram: env TELEGRAM_ADMIN_CHAT_ID; zalo/sms/voice: return null Phase 5+) → enqueue notification per-channel. Counters: `unsupportedChannels` chỉ count zalo/sms/voice fail (email/telegram fail là transport issue, do retry queue handle). Auto-cancel chưa chạy — Phase 5+ thêm cron riêng. Phase 5 chỉ P5-01 (Telegram) wired thật; zalo/sms/voice stub warn log. |
| D38 | Zalo OA: HMAC-SHA256 webhook verify (P5-02) | ✅ Accepted (P5-02) | `modules/notification/providers/zalo.ts` call `https://openapi.zalo.me/v2.0/oa/message/cs` với `access_token: env.ZALO_OA_ACCESS_TOKEN` header. Webhook verify: header `X-Zalo-Oa-Signature` so với HMAC-SHA256(rawBody, env.ZALO_OA_SECRET). Compute HMAC trong route handler qua `node:crypto` import (Node 20+). Nếu secret không set → skip verify (Phase 5+). Mask `user_id` khi log (giữ 2 đầu). |
| D39 | Twilio Voice: TwiML callback vi-VN + DTMF (P5-04) | ✅ Accepted (P5-04) | `modules/notification/providers/voice.ts` POST Calls.json với `Url=callbackUrl` (encode message vào query string). Callback `/api/voice/respond` trả TwiML `<Say voice="vi-VN" language="vi-VN">` + `<Gather numDigits="1">`. Step 2 nhận digit `1`=confirm / `2`=reject → log audit + `<Hangup/>`. SMS số E.164 bắt buộc (validate regex `^\+[1-9]\d{1,14}$`). Voice Twilio dùng `TWILIO_VOICE_FROM_NUMBER` riêng (khác SMS From). |
| D40 | Customer notification opt-in: deep-link OAuth (P5-07) | ✅ Accepted (P5-07) | Schema `User` thêm `telegramChatId`, `zaloUserId` (unique) + `notificationPrefs: Json` (`channels × events` matrix). Opt-in flow: Telegram `/start <email>` webhook match user → bind `chat_id`; Zalo `follow` event (Phase 5 chỉ log) — binding chi tiết Phase 5+ viết bổ sung. Customer UI: `/account/settings/notifications` (form checkboxes + link OA / bot deep-link). Default = email only, các channels khác opt-in tích cực. |
| D41 | Reserved | | (slot trống — đánh số tiếp D42+) |
| D42 | Reserved | | |
| D43 | Reserved | | |
| D44 | Reserved | | |
| D45 | Reserved | | |
| D46 | Reseller model: `AiUsage.costUsd` nullable + thêm `upstreamCostUsd` (P6-01) | ✅ Accepted (2026-08-05) | Phase 6 redesign — Kandes KHÔNG trả cost provider (KH trả trực tiếp NCC). `costUsd` nullable + thêm `upstreamCostUsd` mirror từ NCC response. Admin chỉ monitor cost, KHÔNG charge KH theo cost này. |
| D47 | Soft cap (không hard quota) cho AI gateway (P6-03) | ✅ Accepted (2026-08-05) | Reseller model — KH đã trả tiền NCC, Kandes chỉ soft cap cho admin monitoring. KHÔNG reject request khi vượt `softCapTokens`. Log warn + enqueue notification `admin.ai.quotaExceeded` qua D36 pattern. |
| D48 | `DeliveryStrategy.AI_RESELLER` enum value thay vì `AI_PLAN` (P6-01) | ✅ Accepted (2026-08-05) | AI_PLAN (cũ spec, model Kandes credits) deprecated. AI_RESELLER = bán NCC key từ pool, dùng `nccKeyId`. Phân biệt rõ trong schema + delivery dispatch. |
| D49 | Model alias map hard-code `modules/ai-gateway/models.ts` (P6-04) | ✅ Accepted (2026-08-05) | Không lưu DB Setting cho alias map Phase 6. Hard-code 4 alias (`kandes-gpt-4o` → `ccpro/gpt-4o`, `kandes-claude-sonnet-4.5`, `kandes-gemini-2.0-flash`, `kandes-deepseek-v3`). Admin KHÔNG cần edit model map. KHÔNG lộ upstream `ccpro/` cho KH. |
| D50 | Stream pass-through không buffer body (P6-05) | ✅ Accepted (2026-08-05) | `runtime='nodejs'` (cần crypto + stream APIs). Dùng `TransformStream` + upstream `ReadableStream` nguyên vẹn. KHÔNG parse lại JSON body. Backpressure-aware. |
| D51 | Subdomain `api.kandes.shop` = path-prefix `/api/ai/v1` Phase 6 (P6-04) | ✅ Accepted (2026-08-05) | Phase 6 KHÔNG tách Vercel project riêng + DNS config. Cùng Next.js app, KH gọi `kandes.shop/api/ai/v1/...` hoặc (sau khi user config DNS) `api.kandes.shop/v1/...` (sẽ thêm `next.config.js` rewrites nếu user có cert). Phase 7 tách subdomain thật nếu traffic đủ lớn. |
| D52 | Token count mirror từ upstream `usage` field (P6-05) | ✅ Accepted (2026-08-05) | KHÔNG dùng `gpt-tokenizer` local (sai số + tốn CPU). Parse `usage` từ SSE chunk cuối (openai-compatible). Nếu upstream không trả → estimate bằng `tiktoken` fallback CHỈ cho display, log warning. |
| D53 | Brand abstraction layer (Phase 7-RB) | ✅ Accepted (2026-08-05) | `modules/ai-gateway/branding.ts` central constants `KANDES_BASE_URL` (public docs/email) + `INTERNAL_UPSTREAM_BASE_URL` (provider only). KH chỉ thấy brand Kandes + alias `kandes-*`. NCC strings (`api.ccpro.cn`, `sk-jy-*`) chỉ trong internal modules + log output (masked qua logger formatter D59). |
| D54 | Model alias map 8 entries theo live CC Pro catalog (Phase 7-RB) | ✅ Accepted (2026-08-05) | Replace 4 legacy alias (`kandes-gpt-4o`, `kandes-claude-sonnet-4.5`, `kandes-gemini-2.0-flash`, `kandes-deepseek-v3`). 8 alias mới map đúng live model trên 2 keys thật (sk-jy-cx-*: gpt-5.4/gpt-5.4-mini/gpt-5.5/codex-auto-review; sk-jy-cc-*: claude-sonnet-4.6/claude-sonnet-5/claude-opus-5/claude-haiku-4-5-20251001). Pass-through raw upstream model name vẫn work (Codex CLI/Claude Code config upstream). Family heuristic `inferFamily()` cho unknown model. |
| D55 | `rotationPolicy` field trên `AiApiKey` (Phase 7-RB) | ✅ Accepted (2026-08-05) | Migration `20260805150000_add_ai_api_key_rotation_policy` thêm 2 fields: `rotationPolicy String @default("auto")` + `pinnedNccKeyId String?` (FK nullable). `auth.ts` branch theo policy: 'pinned' + pinned active → dùng pinned; pinned exhausted → fallback `nccKey` + log warn. Pinned + exhausted KHÔNG fallback → fail loud. KH tự config qua `PATCH /api/me/ai-keys/[id]/rotation`. |
| D56 | `/v1/responses` endpoint cho Codex CLI (Phase 7-RB) | ✅ Accepted (2026-08-05) | Codex CLI wire_api='responses' dùng endpoint này. Pass-through verbatim body (input/messages khác format). KHÔNG alias — KH đã gửi raw upstream model. Provider ccpro refactor: `forwardGeneric(path)` + `forwardStreamGeneric(path)` dùng cho cả `chat/completions` + `responses`. |
| D57 | Balance sync qua NCC `/v1/usage` (Phase 7-RB) | ✅ Accepted (2026-08-05) | Cron `ai-balance-sync` 30p: với mỗi `AiNccKey` active/low_balance → decrypt plaintext → `CcProProvider.getUsage()` → `GET {baseUrl}/usage` → parse `quota.remaining`. Update `remainingUsd` + set status theo ratio: >10% → active, ≤10% → low_balance, =0 → exhausted. Status change → notify admin (telegram + email). |
| D58 | KH self-check balance qua `/api/me/ai-keys/[id]/balance` (Phase 7-RB) | ✅ Accepted (2026-08-05) | Endpoint riêng (KHÔNG phải `/usage` chỉ analytics). Trả masked info: apiKeyName, status, rotationPolicy, quota used/total/softCap, isOverSoftCap, nccNickname (KHÔNG raw `id` hay plaintext), nccStatus/remaining/total/lastSynced, pinnedNccKeyId + pinnedNccNickname. Rate-limit 60/min/user. Auth chỉ owner. |
| D59 | NCC strings stripped khỏi log output (Phase 7-RB) | ✅ Accepted (2026-08-05) | `lib/logger.ts` thêm `REDACT_PATTERNS`: regex `https?://api\.ccpro\.cn[^\s"']*` → `https://***`, regex `sk-jy-[a-z0-9-]{4,}` → `sk-jy-***`. Apply qua `formatters.log` (mask value string). Thêm `REDACT_PATHS`: `apiKeyEncrypted`, `upstreamApiKey`, `nccApiKey`, `nccKeyId`, `pinnedNccKeyId`. |
| D60 | Compute layer: Amplify Hosting → EC2 t3.micro + Docker + Nginx | ✅ Accepted (2026-08-06) | User yêu cầu chuyển sang EC2 để học AWS sâu (SSH, IAM, security group, Docker, Nginx, CloudWatch). Static layer giữ nguyên (Route 53 + CloudFront + ACM + WAF + S3 + RDS + Secrets Manager + SES). Trade-off: +3-5 ngày setup lần đầu, +$7-10/tháng sau Free Tier, nhưng flexibility cao hơn nhiều khi scale (custom Docker image, full control). Setup chi tiết: `docs/deployment/AWS_ARCHITECTURE.md` §3.4. Code KHÔNG đổi — chỉ infra layer. |
| D61 | CI/CD: GitHub Actions (self-hosted runner) — workflow `.github/workflows/deploy-prod.yml` | ✅ Accepted (2026-08-06) | GitHub-hosted runner của repo này không available (queue stuck + push events không trigger). Workaround: cài self-hosted runner trên EC2 (label `kandes`), dùng OIDC `kandes-github-deploy` role với policy ECR push. Workflow gồm 2 job: `build` (npm ci + typecheck + **lint + test đã re-enable Phase 8 2026-08-07**) + build + `deploy` (migrate + restart containers + health check + smoke). Trigger: push main + workflow_dispatch. 8 GitHub Secrets: AWS_DEPLOY_ROLE, ECR_REGISTRY, EC2_HOST, EC2_SSH_KEY, PROD_DOMAIN, DATABASE_URL, TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_CHAT_ID. Local baseline: `npm run lint && npm run typecheck && npm run test` đều pass (53/53 files, 447/447 tests, 1 warning `no-img-element`). |
| D62 | Upgrade instance: t3.micro → m7i-flex.large (8 GB RAM, 2 vCPU Intel) | ✅ Accepted (2026-08-07) | User quyết định nâng cấp lên m7i-flex.large để lấy kinh nghiệm + production performance tốt hơn. AWS Free plan eligible (tier mới 2026 — 6 tháng + $200 credits, không phải 12 tháng cũ). m7i-flex.large giá $0.1197/hr liên tục → $200 credits dùng được ~2.2 tháng full-time. User chấp nhận rủi ro budget burn, sẵn sàng hạ xuống nếu quan sát chi phí tăng nhanh. Migration path: Stop → Change Instance Type → Start (~2 phút downtime, EBS volume giữ nguyên 100% data). Chi tiết deploy plan: `docs/deployment/MIGRATION_PLAN_M7I.md`. |
| D63 | Cloudflare proxy ở front (CDN + WAF + bandwidth savings) | ✅ Accepted (2026-08-07) | Edge proxy Cloudflare trước AWS EC2 để giảm tải bandwidth + attack surface. **Cloudflare Free plan** (user chọn 2026-08-07): unlimited bandwidth, WAF basic rules, DDoS protection, SSL free. **Route 53 giữ primary DNS** (user chọn 2026-08-07), **Cloudflare partial setup** — chỉ CNAME `api.kandes.shop` proxy qua Cloudflare, root domain (`@`) và các subdomain khác (`cdn`, `admin`, ...) giữ Route 53. Subdomain `api.kandes.shop` (AI gateway) đi Cloudflare để streaming qua edge → latency user VN 10-30ms thay vì 30-80ms (EC2 SG). Cấu hình: `docs/deployment/EXECUTION_PLAN.md` Bước 3. |
| D64 | Safety mechanism: budget cap + auto-stop + alarms (AWS Free plan guard) | ✅ Accepted (2026-08-07) | User yêu cầu cơ chế an toàn khi dùng m7i-flex.large để tránh đốt tiền. Triển khai: (1) AWS Budget alarm ở thresholds strict $50/$100/$150 (user chọn 25%/50%/75% thay vì 50%/75%/90% — muốn alarm sớm); (2) CloudWatch alarm `EstimatedCharges > $5/day` + CPU idle/high + status check; (3) Lambda function `auto-stop-instance` trigger bởi EventBridge schedule (stop 23:00 VN, start 07:00 VN = 8h/day = saves 67% budget — sẽ enable sau khi migrate); (4) ROUTE 53 giữ primary DNS, Cloudflare partial setup (CNAME only) cho `api.kandes.shop`. Scripts: `scripts/aws/budget-alarm.sh`, `scripts/aws/cloudwatch-alarm.sh`, `scripts/aws/schedule-stop-start.sh`, `scripts/aws/migrate-instance.sh`. Open questions/conflicts xem `docs/deployment/DECISION_LOG.md` §7. |

## 8. Patterns cần theo (đã established)

### Route handler
```ts
export const dynamic = 'force-dynamic'
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    await rateLimitOrThrow(rateLimitKey('route:action', ip), N, WINDOW_MS)
    const input = parseInput(schema, await req.json())
    const result = await someService.doStuff(input, { ipAddress: ip, userAgent: ... })
    return ok(result) // hoặc { status: 201 }
  } catch (err) {
    return fail(err, req)
  }
}
```

### Module barrel
```ts
// modules/<domain>/index.ts
export { serviceName } from './service'
export type { ServiceType } from './service'
export * from './validators'
```

### Custom error throw
```ts
import { NotFoundError, ConflictError, ValidationError } from '@/lib/errors'
throw new NotFoundError('User not found')
throw new ConflictError('Email đã được đăng ký')
```

### Logger context
```ts
import { logger } from '@/lib/logger'
logger.info({ userId, action }, 'Action completed')
logger.warn({ email }, 'Action failed')  // KHÔNG log password
```

## 9. Test commands

```bash
npm run typecheck       # tsc --noEmit (pass = 0 errors)
npm run lint            # next lint (pass = 0 warnings acceptable)
npm run test            # vitest run
npm run build           # next build (pass = production-ready)
```

Target: tất cả pass trước khi commit.

## 10. Khi mất context / bắt đầu session mới

**Phase tiếp theo:** Tất cả Phase 0-7 hoàn thành. Xem `docs/README.md` §TODO cho feature requests mới từ user.

**Khi quay lại kiểm tra Phase 7 (done 2026-08-05):**
- P7-01: `middleware.ts` (global rate-limit + CSP headers)
- P7-02: `next.config.js` (image opt, fonts, compress)
- P7-03: `sentry.client.config.ts`, `sentry.server.config.ts`
- P7-04: `modules/jobs/backup-db.ts`
- P7-05: `modules/support/service.ts` + `app/api/support/tickets/route.ts`
- P7-06: `app/legal/*`, `app/account/data/page.tsx`, `app/api/me/export/route.ts`, `app/api/me/delete/route.ts`, `components/legal/cookie-consent-banner.tsx`
- P7-07: `app/sitemap.ts`, `app/robots.ts`, `app/opengraph-image.tsx`, `lib/analytics.ts`
- P7-09: `playwright.config.ts`, `e2e/*.spec.ts`
- P7-10: `DEPLOY.md`, `docs/runbook.md`
- Phase 7-RB files (D53..D59): `modules/ai-gateway/branding.ts`, `app/api/ai/v1/responses/route.ts`, etc.

**Phase 7-H (EC2 migration, 2026-08-06, D60) — Verified ready:**
- `Dockerfile` (multi-stage build, Next.js standalone, alpine base) — đã có
- `.dockerignore` — đã có
- `docker-compose.yml` (app + nginx, AWS CloudWatch logs) — đã có
- `docker-compose.dev.yml` (local dev với hot reload) — đã có
- `nginx.conf` (reverse proxy + SSL + rate limit + security headers) — đã có
- `scripts/deploy/bootstrap.sh` (EC2 first-time setup) — đã có
- `scripts/deploy/load-secrets.sh` (pull secrets từ AWS Secrets Manager) — đã có
- `scripts/deploy/backup-db.sh` (pg_dump → S3, 30d retention) — đã có
- `scripts/deploy/healthcheck.sh` (verify `/api/health`) — đã có
- `scripts/deploy/setup-route53.sh` + `verify-route53.sh` (DNS) — đã có
- `scripts/deploy/setup-cloudfront.sh` + `setup-nginx-ssl.sh` (CDN + TLS) — đã có
- `scripts/deploy/aws-setup-helper.js` (cloudformation helper) — đã có
- `scripts/create-admin.ts` (provision super_admin, ignore nếu tồn tại) — đã có (2026-08-06)
- `app/api/health/route.ts` (public liveness + readiness, 200/503) — đã có (2026-08-06)
- `scripts/setup-db.ps1` (handle trường hợp không có postgres service — D60) — đã sửa (2026-08-06)
- `.github/workflows/deploy-aws.yml` (build Docker → push ECR → SSH EC2 → restart) — đã có sẵn, đã cập nhật

**Folder `deploy/` cũ** (pre-Docker scripts: `build.sh`, `start-prod.sh`, `install-node.sh`, `npm-install.sh`, v.v.) — dùng cách chạy Next.js qua `nvm` thay vì Docker. Hiện đã superseded bởi Docker compose (D60) — KHÔNG dùng. Có thể archive sau khi deploy production ổn định.

**Quy tắc chung (Phase 7-RB done, Phase 7 hardening inherit):**
- KHÔNG tự ý đổi deviations D42..D59 (đã chốt với user 2026-08-05).
- KHÔNG tự ý đổi deviation D60 (EC2 + Docker) trừ khi user yêu cầu.
- Nếu phát hiện cần deviation mới → DỪNG, ghi vào `CONTEXT.md` §7 (D61+), xin user quyết định.

Không đọc lại toàn bộ docs — chỉ file liên quan task hiện tại.
