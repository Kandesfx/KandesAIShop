# Phase 9 Progress Tracking

> **Mục đích:** Ghi lại chi tiết tiến độ từng feature trong Phase 9.
>
> **Cập nhật:** Mỗi khi hoàn thành 1 feature/sub-task, update file này.
>
> **Prerequisite:** Phase 8b done (47/47 findings).

---

## Overview

| Metric | Value | Target |
|--------|-------|--------|
| **Features Complete** | 15/15 | 15 |
| **Đợt Complete** | 4/4 | 4 |
| **Commits** | 3 (+ uncommitted Đợt 1–4 hoàn tất) | ~8-12 |
| **Tests Pass** | 504/504 | 480+ |
| **Days Elapsed** | 1 | 7-10 |
| **Progress** | 100% | 100% |

**Current Status:** ✅ Toàn bộ 4 đợt hoàn tất — code xong, còn 2 việc trước khi đóng Phase 9: (1) commit các thay đổi uncommitted, (2) chạy manual smoke test checklist trong `PHASE_9_PLAN.md`

**Last Update:** 2026-08-09 (Đợt 4 complete — Phase 9 code-complete)

---

## Đợt 1: PDP Polish (3 ngày) — ✅ 100% Complete (5/5)

### ✅ D10: Average rating display (0.5 ngày)

**Status:** ✅ Complete  
**Commit:** `bcf96f3`  
**Date:** 2026-08-09

**Deliverables:**
- [x] Migration: Add `Product.avgRating` (Decimal), `Product.reviewCount` (Int)
- [x] Type: Custom `Product` type in `modules/catalog/types.ts` (override avgRating: number)
- [x] Repository: Convert Decimal→number in all catalog methods
- [x] Component: `StarRating` (reusable, handles 0-5 stars, half-stars, counts)
- [x] Integration: ProductCard + ProductPurchaseSection display ratings
- [x] Seed: Add sample ratings to 3 products
- [x] Test: StarRating logic tests (3 tests)

**Files Changed (9):**
- `prisma/schema.prisma` (confirmed fields)
- `prisma/seed.ts` (add sample ratings)
- `modules/catalog/types.ts` (NEW custom Product type)
- `modules/catalog/repository.ts` (Decimal conversion in 6 methods)
- `components/product/star-rating.tsx` (NEW)
- `components/product/product-card.tsx` (integrate rating)
- `components/product/product-purchase-section.tsx` (integrate rating)
- `app/products/[slug]/page.tsx` (display rating)
- `__tests__/components/product/star-rating.test.tsx` (NEW)

**Verification:**
- ✅ Typecheck pass
- ✅ Lint pass
- ✅ Tests pass (450/450)
- ✅ Build pass

---

### ✅ D1: Reviews & Q&A tabs (2 ngày) — 100% Complete

**Status:** ✅ Complete (Q&A + Reviews)  
**Commit:** `2836a93` (Q&A), uncommitted (Reviews)  
**Date:** 2026-08-09

**Deliverables (Q&A):**
- [x] Migration: ProductQuestion table (20260809041000_add_product_questions)
- [x] Module: `modules/product-question/` (types, repository, service, validators, index)
- [x] Routes: 5 API endpoints
  - [x] `GET /api/products/[slug]/questions` (public list)
  - [x] `POST /api/me/questions` (user submit)
  - [x] `GET /api/admin/questions` (admin list all)
  - [x] `PATCH /api/admin/questions/[id]` (admin answer/toggle)
  - [x] `DELETE /api/admin/questions/[id]` (admin delete)
- [x] Component: ProductDetailTabs (tab container with Q&A + Reviews placeholders)
- [x] Component: QuestionList (pagination, filters: all/answered/unanswered)
- [x] Component: AskQuestionForm (auth-aware, validation)
- [x] Component: Textarea UI primitive
- [x] Helper: `GET /api/me` endpoint for client-side auth check
- [x] Integration: PDP integrate tabs below product section

**Deliverables (Reviews):**
- [x] Component: `ReviewsTab` (list reviews, sort newest/oldest/helpful, pagination, "hữu ích" vote)
- [x] Component: `WriteReviewForm` (star picker + content, auth-aware)
- [x] Route: `GET /api/products/[slug]/reviews` (đã tồn tại từ Phase 0-7, verify + wire vào UI)
- [x] Route: `POST /api/products/[slug]/reviews` (đã tồn tại từ Phase 0-7, verify + wire vào UI)
- [x] Route: `POST /api/reviews/[id]/helpful` (đã tồn tại, wire vào UI)
- [x] Service: `reviewService.createReview` đã tự update `Product.avgRating`/`reviewCount` qua `updateProductRating()` (không cần sửa thêm)
- [x] Test: `modules/review/service.test.ts` — integration-style test (mocked DB) verify submit review → `db.product.update` với avgRating/reviewCount đúng aggregate
- [x] Test: `__tests__/components/product/write-review-form.test.tsx` — validation logic (4 tests)
- [x] Bugfix: `star-rating.tsx`, `textarea.tsx`, `question-list.tsx`, `ask-question-form.tsx`, `product-detail-tabs.tsx` dùng Tailwind class không tồn tại trong theme (`terracotta`, `hairline`, `surface`, `muted`, `accent`) → đổi sang token thật (`ink-*`, `electric`, `warning`, `danger`)

**Files Changed (16 + Reviews UI):**
- `prisma/schema.prisma` (ProductQuestion model + relations)
- `prisma/migrations/20260809041000_add_product_questions/migration.sql` (NEW)
- `modules/product-question/types.ts` (NEW)
- `modules/product-question/repository.ts` (NEW)
- `modules/product-question/service.ts` (NEW)
- `modules/product-question/validators.ts` (NEW)
- `modules/product-question/index.ts` (NEW)
- `app/api/products/[slug]/questions/route.ts` (NEW)
- `app/api/me/questions/route.ts` (NEW)
- `app/api/me/route.ts` (NEW)
- `app/api/admin/questions/route.ts` (NEW)
- `app/api/admin/questions/[id]/route.ts` (NEW)
- `components/product/product-detail-tabs.tsx` (NEW)
- `components/product/question-list.tsx` (NEW)
- `components/product/ask-question-form.tsx` (NEW)
- `components/ui/textarea.tsx` (NEW)
- `app/products/[slug]/page.tsx` (integrate tabs + share/trust/cross-sell sections)
- `components/product/reviews-tab.tsx` (NEW)
- `components/product/write-review-form.tsx` (NEW)
- `__tests__/components/product/write-review-form.test.tsx` (NEW)
- `modules/review/service.test.ts` (test avgRating/reviewCount update)

**Verification:**
- ✅ Typecheck pass
- ✅ Lint pass (1 warning pre-existing)
- ✅ Tests pass (450/450, +11 sau khi hoàn tất Đợt 1)
- ✅ Migration applied successfully

---

### ✅ D2: Cross-sell "Khách cũng mua" (1 ngày)

**Status:** ✅ Complete  
**Date:** 2026-08-09

**Deliverables:**
- [x] Service: `catalogService.getCrossSellProducts(slug)` 
- [x] Repository: `productRepository.getCrossSell` — cùng category, giá ±30%, fallback nếu không đủ sản phẩm trong range
- [x] Route: `GET /api/products/[slug]/cross-sell`
- [x] Component: `CrossSellCarousel` — horizontal scroll-snap carousel
- [x] Integration: PDP dưới tabs
- [x] Test: `modules/catalog/repository.test.ts` — price range + fallback logic

**Files Changed:**
- `modules/catalog/service.ts` (add `getCrossSellProducts`)
- `modules/catalog/repository.ts` (add `getCrossSell`)
- `modules/catalog/repository.test.ts` (NEW)
- `app/api/products/[slug]/cross-sell/route.ts` (NEW)
- `components/product/cross-sell-carousel.tsx` (NEW)
- `app/products/[slug]/page.tsx` (integrate)

---

### ✅ D4: Social share buttons (0.5 ngày)

**Status:** ✅ Complete  
**Date:** 2026-08-09

**Deliverables:**
- [x] Component: `ShareButtons` — Facebook/Twitter/Copy link + `navigator.share` fallback trên mobile
- [x] Integration: PDP header (cạnh tên sản phẩm)
- [ ] Analytics: Track share events (optional — chưa làm, không blocking)
- [x] Test: `__tests__/components/product/share-buttons.test.tsx` — URL encoding + native share detection

**Files Changed:**
- `components/product/share-buttons.tsx` (NEW)
- `__tests__/components/product/share-buttons.test.tsx` (NEW)
- `app/products/[slug]/page.tsx` (integrate)

---

### ✅ D5: Trust signals block (0.5 ngày)

**Status:** ✅ Complete  
**Date:** 2026-08-09

**Deliverables:**
- [x] Component: `TrustBlock` (4 static badges)
- [x] Integration: PDP sidebar (dưới purchase section)
- [x] Content: "Bảo hành 30 ngày", "Hỗ trợ 24/7", "Giao hàng tức thì", "Hoàn tiền 100%"

**Files Changed:**
- `components/product/trust-block.tsx` (NEW)
- `app/products/[slug]/page.tsx` (integrate)

---

## Đợt 2: Checkout Hardening (2.5 ngày) — ✅ 100% Complete (4/4)

**Status:** ✅ Complete
**Date:** 2026-08-09

### ✅ C7: Turnstile CAPTCHA (1 ngày)

**Status:** ✅ Complete

**Deliverables:**
- [x] Env: `TURNSTILE_SECRET_KEY` (server, optional) + `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (client, optional) trong `lib/env.ts`
- [x] Module: `modules/checkout/turnstile.ts` — `isTurnstileConfigured()` + `verifyTurnstileToken()` (gọi Cloudflare `siteverify` API, timeout 5s)
- [x] Validator: `turnstileToken` optional field trong `checkoutSchema`
- [x] Route: `POST /api/checkout` verify token server-side khi đã config secret — chặn nếu thiếu/invalid token, **fail-open** (fallback rate-limit) nếu Cloudflare network error/down
- [x] Component: `TurnstileWidget` — load script Cloudflare dynamic, render widget, fallback message nếu load fail
- [x] Integration: `CheckoutForm` render widget trước submit button, disable submit nếu chưa verify (khi site key có config)
- [x] Test: `modules/checkout/turnstile.test.ts` (7 tests) — configured/unconfigured, success/invalid token, network error, non-2xx response

**Files Changed:**
- `lib/env.ts` (add 2 optional env vars)
- `modules/checkout/turnstile.ts` (NEW)
- `modules/checkout/turnstile.test.ts` (NEW)
- `modules/checkout/validators.ts` (add `turnstileToken`)
- `modules/checkout/index.ts` (export turnstile fns)
- `app/api/checkout/route.ts` (verify token trước khi tạo order)
- `components/checkout/turnstile-widget.tsx` (NEW)
- `components/checkout/checkout-form.tsx` (integrate widget)

**Design note:** Turnstile hoàn toàn optional — nếu 2 env var chưa config, hệ thống bỏ qua bước verify và giữ nguyên rate-limit hiện có. Đây tránh single point of failure khi phụ thuộc dịch vụ ngoài (Cloudflare).

---

### ✅ D7: Checkout timeline visual (1 ngày)

**Status:** ✅ Complete

**Deliverables:**
- [x] Component: `CheckoutTimeline` — 3 bước (Giỏ hàng → Thanh toán → Hoàn tất), check icon cho bước done, highlight bước current
- [x] Integration: `/checkout` (current="payment") + `/order/[orderNumber]` (current dựa trên trạng thái đơn: payment nếu pending/unpaid, done nếu paid/cancelled)
- [x] Test: `__tests__/components/checkout/checkout-timeline.test.ts` (3 tests) — logic tính `isDone`/`isCurrent` theo từng step

**Files Changed:**
- `components/checkout/checkout-timeline.tsx` (NEW)
- `app/checkout/page.tsx` (integrate)
- `app/order/[orderNumber]/page.tsx` (integrate)
- `__tests__/components/checkout/checkout-timeline.test.ts` (NEW)

---

### ✅ C5 + F4: Success page route (0.5 ngày)

**Status:** ✅ Complete

**Deliverables:**
- [x] Refactor: Tách logic hiển thị order (items, totals, QR, countdown, status blocks) từ `app/order/[orderNumber]/page.tsx` sang component chung `OrderDetailView`
- [x] Route: `app/order/[orderNumber]/success/page.tsx` (NEW) — trang xác nhận đặt hàng thành công, redirect về `/order/[orderNumber]` nếu đơn còn pending/unpaid (tránh truy cập trực tiếp URL success khi chưa thanh toán)
- [x] Integration: `OrderStatusPoller` redirect sang `onPaidHref` (mặc định `/order/[orderNumber]/success`) khi trạng thái chuyển `paid`

**Files Changed:**
- `components/checkout/order-detail-view.tsx` (NEW — dùng chung cho cả 2 trang)
- `app/order/[orderNumber]/page.tsx` (refactor dùng `OrderDetailView`)
- `app/order/[orderNumber]/success/page.tsx` (NEW)

---

### ✅ F3: OrderStatusPoller optimization (0.5 ngày)

**Status:** ✅ Complete

**Deliverables:**
- [x] Early-return: Skip polling hoàn toàn nếu `initialStatus` đã là terminal state (`paid`, `cancelled`, hoặc `paymentStatus` là `refunded`/`failed`) — tránh gọi API polling không cần thiết
- [x] Bugfix: Sửa lỗi đơn `cancelled` bị redirect nhầm sang trang success (giống đơn `paid`) — giờ chỉ `router.refresh()` để hiển thị block "ĐÃ HUỶ" tại trang hiện tại
- [x] Test: `__tests__/components/checkout/order-status-poller.test.ts` (10 tests) — `shouldSkipPolling` (6 tests) + `resolvePollAction` (4 tests)

**Files Changed:**
- `components/checkout/order-status-poller.tsx` (fix redirect logic paid vs cancelled)
- `__tests__/components/checkout/order-status-poller.test.ts` (NEW)

**Verification (toàn bộ Đợt 2):**
- ✅ Typecheck pass
- ✅ Lint pass
- ✅ Tests pass (481/481, +20 từ Đợt 2)
- ✅ Build pass (routes mới `/order/[orderNumber]/success` build thành công)

---

## Đợt 3: Cart & Mobile UX (2.5 ngày) — ✅ 100% Complete (3/3)

**Status:** ✅ Complete
**Date:** 2026-08-09

### ✅ D3: Cart "Save for later" (1.5 ngày)

**Status:** ✅ Complete

**Deliverables:**
- [x] Migration: `wishlists` table (userId, productId, variantId nullable, createdAt) với composite unique + index
- [x] Module: `modules/wishlist/` — types, validators, repository, service, index
- [x] Routes: 3 endpoints
  - [x] `GET /api/wishlist` (list user's wishlist)
  - [x] `POST /api/wishlist` (add item, idempotent)
  - [x] `DELETE /api/wishlist/[id]` (remove item, ownership check)
- [x] Component: `SaveForLaterButton` — guest (login prompt) + authenticated (call API) flow
- [x] Component: `WishlistPageClient` — list items, remove, add back to cart
- [x] Page: `app/account/wishlist/page.tsx` (server component, requireUser)
- [x] Update: `cart-item.tsx` + `cart-page-client.tsx` — tích hợp "Lưu lại sau", remove khỏi cart sau khi save
- [x] Update: `account-sidebar.tsx` — thêm link "Đã lưu" với Heart icon
- [x] Test: `__tests__/modules/wishlist/service.test.ts` (13 tests) — idempotency, validation, ownership, mapping

**Files Changed (14):**
- `prisma/schema.prisma` (add Wishlist model + relations)
- `prisma/migrations/20260809150000_add_wishlist/migration.sql` (NEW)
- `modules/wishlist/types.ts` (NEW)
- `modules/wishlist/validators.ts` (NEW)
- `modules/wishlist/repository.ts` (NEW)
- `modules/wishlist/service.ts` (NEW)
- `modules/wishlist/index.ts` (NEW)
- `app/api/wishlist/route.ts` (NEW)
- `app/api/wishlist/[id]/route.ts` (NEW)
- `components/wishlist/save-for-later-button.tsx` (NEW)
- `components/wishlist/wishlist-page-client.tsx` (NEW)
- `app/account/wishlist/page.tsx` (NEW)
- `components/cart/cart-item.tsx` (update)
- `components/cart/cart-page-client.tsx` (update)
- `components/account/account-sidebar.tsx` (update)
- `__tests__/modules/wishlist/service.test.ts` (NEW)

---

### ✅ D8: Cart icon bounce animation (0.5 ngày)

**Status:** ✅ Complete

**Deliverables:**
- [x] Hook: `lib/use-previous.ts` — track previous value via useRef
- [x] Update: `CartButton` — detect count increase, trigger `animate-cart-bounce`
- [x] CSS: `@keyframes cart-bounce` (300ms ease-out, subtle 4px translateY)
- [x] Logic: Chỉ bounce khi count **tăng** (add to cart), không bounce khi giảm/remove

**Files Changed (3):**
- `lib/use-previous.ts` (NEW)
- `components/cart/cart-button.tsx` (update)
- `app/globals.css` (add keyframes + `.animate-cart-bounce`)

---

### ✅ D6: Mobile gallery thumbnails horizontal scroll (1 ngày)

**Status:** ✅ Complete

**Deliverables:**
- [x] Update: PDP gallery section — thêm thumbnail strip bên dưới main image
- [x] Layout Mobile: `flex overflow-x-auto snap-x snap-mandatory scrollbar-hide` — buttons 80×80px, scroll ngang
- [x] Layout Desktop: `lg:grid lg:grid-cols-4` — grid 4 cột
- [x] CSS: `.scrollbar-hide` utility class (cross-browser: `-ms-overflow-style`, `scrollbar-width`, `::-webkit-scrollbar`)
- [x] Responsive: ẩn thumbnail strip khi chỉ có 1 ảnh (`media.length > 1`)

**Files Changed (2):**
- `app/products/[slug]/page.tsx` (update gallery section)
- `app/globals.css` (add `.scrollbar-hide`)

---

**Verification (toàn bộ Đợt 3):**
- ✅ Typecheck pass
- ✅ Lint pass (1 warning pre-existing, không liên quan)
- ✅ Tests pass (494 total: 481 + 13 wishlist service tests)
- ✅ ESLint `react/no-unescaped-entities` fixed trong `wishlist-page-client.tsx`

---

## Đợt 4: Technical Improvements (2 ngày) — ✅ 100% Complete (3/3)

**Status:** ✅ Complete
**Date:** 2026-08-09

### ✅ C6: Countdown sync across tabs (1 ngày)

**Status:** ✅ Complete

**Deliverables:**
- [x] Update: `Countdown` nhận thêm prop `orderNumber` (optional) — khi có, mở `BroadcastChannel` theo key `kandes-countdown-{orderNumber}`
- [x] Logic: Mỗi tab broadcast `{ orderNumber, expiresAt, now }` mỗi 1s
- [x] Logic: Listener nhận message, chỉ đồng bộ `now` nếu cùng `orderNumber` + `expiresAt` và lệch > 500ms (tránh giật số liên tục khi lệch nhỏ)
- [x] Fallback: `typeof BroadcastChannel === 'undefined'` → bỏ qua toàn bộ effect, countdown chạy local-only như cũ (không throw lỗi trên browser cũ)
- [x] Integration: `OrderDetailView` truyền `order.orderNumber` vào `Countdown`
- [x] Test: `__tests__/components/checkout/countdown-sync.test.ts` (5 tests) — tái hiện logic drift-check thuần (project không dùng jsdom nên không test trực tiếp BroadcastChannel runtime)

**Files Changed (3):**
- `components/checkout/countdown.tsx` (add BroadcastChannel sync logic)
- `components/checkout/order-detail-view.tsx` (pass `orderNumber` prop)
- `__tests__/components/checkout/countdown-sync.test.ts` (NEW)

**Note:** Test tự động chỉ cover phần logic thuần (drift threshold, orderNumber/expiresAt guard). Phần tích hợp thực tế (mở 2 tab, quan sát đồng bộ) cần smoke test thủ công — chưa thực hiện trong session này.

---

### ✅ D9: Footer build ID dynamic (0.5 ngày)

**Status:** ✅ Complete

**Deliverables:**
- [x] `resolveJsonModule: true` — đã có sẵn trong `tsconfig.json` từ trước, không cần sửa
- [x] Import `package.json` — đã có sẵn trong `footer.tsx` từ trước (dùng cho phần `v{version}`)
- [x] Thêm helper `getBuildId(now: Date)` — tính `{year}.Q{quarter}.PHASE-9` động theo tháng hiện tại (thay vì hardcode `BUILD:{year}.Q3.PHASE-8B` như cũ — bug thực tế: label phase cũ không tự update)
- [x] Override qua `NEXT_PUBLIC_BUILD_ID` nếu set (dùng cho Docker build hash/CI run id) — ignore nếu chuỗi rỗng/whitespace
- [x] Test: `__tests__/components/layout/footer.test.ts` (5 tests) — Q1/Q3/Q4 quarter calculation + env override + whitespace fallback

**Files Changed (2):**
- `components/layout/footer.tsx` (add `getBuildId()` helper, replace hardcoded label)
- `__tests__/components/layout/footer.test.ts` (NEW)

---

### ✅ Cleanup & final polish (0.5 ngày)

**Status:** ✅ Complete

**Deliverables:**
- [x] Audit toàn bộ `console.log/warn/error` trong codebase — tìm thấy 4 route handlers (`product-question` module) dùng `console.error` thay vì `logger` (không khớp convention `lib/http.ts` — mọi route khác đều log qua pino `logger`)
- [x] Fix: Đổi `console.error(...)` → `logger.error({ err: error }, '...')` trong 4 file
- [x] Xác nhận các `console.log/error` còn lại là hợp lệ, KHÔNG sửa: CLI scripts (`prisma/seed.ts`, `scripts/create-admin.ts`, `prisma/seeds/ai-plans.ts` — output người đọc, không phải app logging) + client error boundaries (`app/error.tsx`, `app/global-error.tsx` — chạy trước khi logger server-side khả dụng) + `lib/cart-context.tsx`/`modules/cart/merge-on-login.ts` (`console.warn` có comment giải thích rõ best-effort, không throw)
- [x] Update `CONTEXT.md` §2 — Phase 9 row chuyển từ 🔄 In Progress → ✅ Done, mô tả đầy đủ 4 đợt
- [x] Update `docs/tasks/PHASE_9_PLAN.md` — toàn bộ checkbox Đợt 1-4 chuyển thành `[x]`
- [x] Verify: `npm run typecheck` pass
- [x] Verify: `npm run lint` pass (1 warning pre-existing `no-img-element`, không liên quan Phase 9)
- [x] Verify: `npm run test` — 504/504 tests pass (vượt target 480+)
- [x] Verify: `npm run build` — pass sau khi dừng `npm run dev` đang chạy song song (Windows file-lock trên Prisma query engine DLL) + xoá cache `.next` cũ (stale `_app.js.nft.json` từ lần build trước đó với Pages Router — project hiện tại 100% App Router)

**Files Changed (4):**
- `app/api/products/[slug]/questions/route.ts`
- `app/api/me/questions/route.ts`
- `app/api/admin/questions/route.ts`
- `app/api/admin/questions/[id]/route.ts`

**Verification (toàn bộ Đợt 4):**
- ✅ Typecheck pass
- ✅ Lint pass
- ✅ Tests pass (504/504)
- ✅ Build pass (58/58 routes, bao gồm `/account/wishlist`, `/api/wishlist`, `/api/wishlist/[id]`)

---

## Git History

| Commit | Date | Scope | Summary |
|--------|------|-------|---------|
| `bcf96f3` | 2026-08-09 | D10 | feat(phase9): implement average rating display |
| `2836a93` | 2026-08-09 | D1 | feat(phase9): implement Q&A tabs on PDP (D1) |
| `73e4074` | 2026-08-09 | docs | docs: update Phase 9 plan - D1 Q&A complete |

---

## Known Issues & Blockers

**Current:**
- Windows dev environment: `npm run build` fail nếu `npm run dev` đang chạy song song (Prisma query engine DLL bị lock, `EPERM: operation not permitted, rename ...query_engine-windows.dll.node.tmpXXXX`). Fix: dừng dev server trước khi build. Không phải bug code, chỉ là hạn chế OS-level file lock trên Windows — không xảy ra trên Linux CI/production.
- Manual smoke test 15 mục trong `PHASE_9_PLAN.md` chưa thực hiện — cần `npm run dev` + click-through thủ công trước khi coi Phase 9 100% closed.

**Resolved:**
1. ✅ Prisma `Decimal` type mismatch — Fixed with custom Product type + repository conversion
2. ✅ Shadow database migration error — Fixed with manual migration + `prisma migrate resolve`
3. ✅ Missing Textarea component — Created new shadcn-style component
4. ✅ UserRole case mismatch (`ADMIN` vs `admin`) — Fixed to lowercase

---

## Next Steps

**Immediate (Next Session):**
1. ✅ Đợt 1 (PDP Polish) hoàn tất — D1/D2/D4/D5/D10 xong.
2. ✅ Đợt 2 (Checkout Hardening) hoàn tất — C7/D7/C5+F4/F3 xong.
3. ✅ Đợt 3 (Cart & Mobile UX) hoàn tất — D3/D8/D6 xong.
4. ✅ Đợt 4 (Technical Improvements) hoàn tất — C6/D9/cleanup xong, typecheck + lint + 504 tests + build pass.
5. **Còn lại trước khi đóng Phase 9:**
   - [ ] Commit tất cả uncommitted changes (Đợt 1 + 2 + 3 + 4) — xem message mẫu trong `PHASE_9_PLAN.md`
   - [ ] Chạy manual smoke test checklist (15 mục, `PHASE_9_PLAN.md` §"Manual smoke test checklist") — `npm run dev` + click-through thủ công
   - [ ] Nếu smoke test pass → Phase 9 chính thức Done, chuyển sang Phase 10+ backlog

**Đợt 1 Completion:** 2026-08-09 (hoàn tất trước target 2026-08-11)
**Đợt 2 Completion:** 2026-08-09
**Đợt 3 Completion:** 2026-08-09
**Đợt 4 Completion:** 2026-08-09 (Phase 9 code-complete)

---

## Metrics Tracking

### Code Changes:
- **New Files Created:** 42
- **Files Modified:** 16
- **Lines Added:** ~2250
- **Lines Deleted:** ~225

### Test Coverage:
- **Before Phase 9:** 447 tests
- **Current:** 504 tests (+57)
- **Target:** 480+ tests ✅ đạt

### Performance:
- **Build Time:** ~50s (58/58 routes, no significant change)
- **Test Suite:** ~29s (no significant change)
- **Typecheck:** ~5s (no significant change)

---

## References

- **Spec:** `docs/tasks/PHASE_9_POLISH.md`
- **Plan:** `docs/tasks/PHASE_9_PLAN.md`
- **Context:** `CONTEXT.md` §2
- **Audit Report:** `docs/tasks/PHASE_8B_AUDIT_REPORT.md` (backlog source)
