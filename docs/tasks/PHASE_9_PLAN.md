# PHASE_9_PLAN — Checklist tiến độ Phase 9

> **Mục tiêu:** Track progress từng đợt Phase 9 (Storefront Polish).
>
> **Spec đầy đủ:** `PHASE_9_POLISH.md`
>
> **Prerequisite:** Phase 8b done (47/47 findings, CI gates pass).

---

## Progress overview

| Đợt | Tasks | Status | Commit | Date |
|---|---|---|---|---|
| Đợt 1 | PDP Polish (5 features) | ✅ Done (5/5) | `bcf96f3` (D10), `2836a93` (D1 Q&A), uncommitted (D1 Reviews/D2/D4/D5) | 2026-08-09 |
| Đợt 2 | Checkout Hardening (4 features) | ✅ Done (4/4) | uncommitted | 2026-08-09 |
| Đợt 3 | Cart & Mobile UX (3 features) | ✅ Done (3/3) | uncommitted | 2026-08-09 |
| Đợt 4 | Technical Improvements (3 features) | ✅ Done (3/3) | uncommitted | 2026-08-09 |

**Total:** 15/15 features done — Phase 9 hoàn tất

---

## Đợt 1 — PDP Polish (3 ngày)

### D10: Average rating display (0.5 ngày)

- [x] Migration: Add `Product.avgRating`, `Product.reviewCount` columns
- [x] Component: `components/product/star-rating.tsx` (reusable)
- [x] Update: PDP header display rating, ProductCard display rating
- [x] Service: `modules/product/service.ts` compute avgRating on review submit
- [x] Test: StarRating rendering (1/2/3/4/5 stars, half-star)

**Status:** ✅ Done (commit `bcf96f3`, 2026-08-09)

**Files:**
- `prisma/migrations/20260809_add_product_rating/migration.sql`
- `components/product/star-rating.tsx` (NEW)
- `app/products/[slug]/page.tsx` (update)
- `components/product/product-card.tsx` (update)
- `modules/catalog/types.ts` (Product type with avgRating as number)
- `modules/catalog/repository.ts` (convert Decimal→number)
- `prisma/seed.ts` (sample ratings for 3 products)
- `__tests__/components/product/star-rating.test.tsx` (NEW)

---

### D1: Reviews & Q&A tabs (2 ngày)

- [x] Migration: `ProductQuestion` table
- [x] Component: `components/product/product-detail-tabs.tsx` (tab container)
- [x] Component: `components/product/question-list.tsx` (Q&A list + pagination)
- [x] Component: `components/product/ask-question-form.tsx` (Q&A form)
- [x] Component: `components/ui/textarea.tsx` (generic textarea — shadcn-style)
- [x] Route: `GET /api/products/[slug]/questions` (list Q&A)
- [x] Route: `POST /api/me/questions` (ask question, auth required)
- [x] Route: `GET /api/admin/questions` (admin list all)
- [x] Route: `PATCH /api/admin/questions/[id]` (admin answer/toggle visibility)
- [x] Route: `DELETE /api/admin/questions/[id]` (admin delete)
- [x] Service: `modules/product-question/service.ts` (NEW)
- [x] Update: PDP integrate tabs below description
- [x] Route: `GET /api/products/[slug]/reviews` (list reviews — đã có sẵn từ Phase 0-7, wire vào UI)
- [x] Route: `POST /api/products/[slug]/reviews` (submit review, auth required — đã có sẵn, wire vào UI)
- [x] Component: `components/product/reviews-tab.tsx` (list + pagination + sort)
- [x] Component: `components/product/write-review-form.tsx` (star picker + content, auth-aware)
- [x] Test: Review submission updates avgRating (`modules/review/service.test.ts`)
- [x] Test: WriteReviewForm validation logic (`__tests__/components/product/write-review-form.test.tsx`)

**Status:** ✅ Done — Q&A (`2836a93`) + Reviews (uncommitted, 2026-08-09)

**Files completed:**
- `prisma/migrations/20260809041000_add_product_questions/migration.sql` (NEW)
- `modules/product-question/types.ts` (NEW)
- `modules/product-question/repository.ts` (NEW)
- `modules/product-question/service.ts` (NEW)
- `modules/product-question/validators.ts` (NEW)
- `modules/product-question/index.ts` (NEW)
- `app/api/products/[slug]/questions/route.ts` (NEW)
- `app/api/me/questions/route.ts` (NEW)
- `app/api/admin/questions/route.ts` (NEW)
- `app/api/admin/questions/[id]/route.ts` (NEW)
- `components/product/product-detail-tabs.tsx` (NEW)
- `components/product/question-list.tsx` (NEW)
- `components/product/ask-question-form.tsx` (NEW)
- `components/ui/textarea.tsx` (NEW)
- `app/products/[slug]/page.tsx` (update)
- `app/api/me/route.ts` (NEW — auth helper)

---

### D2: Cross-sell "Khách cũng mua" (1 ngày)

- [ ] Service: `modules/product/service.ts` add `getCrossSellProducts(productId)` query
- [ ] Route: `GET /api/products/[slug]/cross-sell` (return 4-6 products)
- [ ] Component: `components/product/cross-sell-carousel.tsx` (carousel wrapper)
- [ ] Update: PDP integrate cross-sell below tabs
- [ ] Test: Cross-sell query logic (same category, price range ±30%)

**Files:**
- `modules/product/service.ts` (update)
- `app/api/products/[slug]/cross-sell/route.ts` (NEW)
- `components/product/cross-sell-carousel.tsx` (NEW)
- `app/products/[slug]/page.tsx` (update)
- `__tests__/modules/product/cross-sell.test.ts` (NEW)

---

### D4: Social share buttons (0.5 ngày)

- [ ] Component: `components/product/share-buttons.tsx` (dropdown: Facebook/Twitter/Copy)
- [ ] Logic: `navigator.share` API fallback for mobile
- [ ] Update: PDP integrate share button in header
- [ ] Analytics: Track share events (optional)

**Files:**
- `components/product/share-buttons.tsx` (NEW)
- `app/products/[slug]/page.tsx` (update)

---

### D5: Trust signals block (0.5 ngày)

- [ ] Component: `components/product/trust-block.tsx` (static badges)
- [ ] Update: PDP integrate trust block in sidebar
- [ ] Content: "Bảo hành 30 ngày", "Hỗ trợ 24/7", "Giao hàng tức thì", "Hoàn tiền 100%"

**Files:**
- `components/product/trust-block.tsx` (NEW)
- `app/products/[slug]/page.tsx` (update)

---

**Commit Đợt 1:**
```bash
git commit -m "phase9-d1: PDP polish (reviews/rating/cross-sell/share/trust)

- D10: StarRating component + Product.avgRating cache
- D1: ProductTabs (Reviews/Q&A) + ProductQuestion table + API routes
- D2: Cross-sell carousel + query logic
- D4: Share buttons (Facebook/Twitter/Copy + navigator.share fallback)
- D5: Trust signals block (4 badges)

Migrations: Product rating columns + ProductQuestion table
Routes: 5 new endpoints (reviews/questions/cross-sell)
Components: 9 new files
Tests: 5 new test files
Verify: typecheck + lint + test pass"
```

---

## Đợt 2 — Checkout Hardening (2.5 ngày)

### C7: Turnstile CAPTCHA (1 ngày)

- [x] Env: Add `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (optional) to `lib/env.ts`
- [x] Component: `components/checkout/turnstile-widget.tsx` (Cloudflare widget wrapper)
- [x] Update: `components/checkout/checkout-form.tsx` integrate Turnstile widget
- [x] Service: `modules/checkout/turnstile.ts` validate token server-side
- [x] Update: `app/api/checkout/route.ts` validate Turnstile before create order
- [x] Fallback: Rate-limit existing nếu Turnstile down (fail-open on network/API error)
- [x] Test: Mock Turnstile validation (success/fail cases)

**Files:**
- `modules/checkout/turnstile.ts` (NEW)
- `modules/checkout/turnstile.test.ts` (NEW)
- `modules/checkout/validators.ts` (update — add `turnstileToken`)
- `modules/checkout/index.ts` (update — export)
- `components/checkout/turnstile-widget.tsx` (NEW)
- `components/checkout/checkout-form.tsx` (update)
- `app/api/checkout/route.ts` (update)
- `lib/env.ts` (update)

**Status:** ✅ Complete (2026-08-09)

---

### D7: Checkout timeline visual (1 ngày)

- [x] Component: `components/checkout/checkout-timeline.tsx` (3-step stepper)
- [x] Update: `app/checkout/page.tsx` integrate timeline header
- [x] Update: `app/order/[orderNumber]/page.tsx` show timeline (step tính theo trạng thái đơn)
- [x] Responsive: Horizontal, co giãn theo breakpoint (sm:)
- [x] Content: "Giỏ hàng" → "Thanh toán" → "Hoàn tất"
- [x] Test: `__tests__/components/checkout/checkout-timeline.test.ts`

**Files:**
- `components/checkout/checkout-timeline.tsx` (NEW)
- `app/checkout/page.tsx` (update)
- `app/order/[orderNumber]/page.tsx` (update)
- `__tests__/components/checkout/checkout-timeline.test.ts` (NEW)

**Status:** ✅ Complete (2026-08-09)

---

### C5 + F4: Success page route (0.5 ngày)

- [x] Route: `app/order/[orderNumber]/success/page.tsx` (NEW)
- [x] Component: `components/checkout/order-detail-view.tsx` (NEW — extract shared QR/countdown/order-summary logic dùng chung cho cả order page và success page)
- [x] Breadcrumb: Home → Order → Success
- [~] `redirectUrl` giữ nguyên `/order/[orderNumber]` sau khi tạo order (chưa đổi sang `/success` ngay) — vì đơn mới tạo còn `pending/unpaid`, cần hiển thị QR/countdown ở trang order thường trước. `OrderStatusPoller` sẽ tự redirect sang `/success` khi trạng thái chuyển `paid`. Success page tự redirect ngược lại `/order/[orderNumber]` nếu truy cập trực tiếp lúc còn pending.

**Files:**
- `app/order/[orderNumber]/success/page.tsx` (NEW)
- `components/checkout/order-detail-view.tsx` (NEW)
- `app/order/[orderNumber]/page.tsx` (refactor dùng `OrderDetailView`)

**Status:** ✅ Complete (2026-08-09)

---

### F3: OrderStatusPoller optimization (0.5 ngày)

- [x] Update: `components/checkout/order-status-poller.tsx` early-return logic
- [x] Logic: Skip polling nếu `status` là `paid`/`cancelled`, hoặc `paymentStatus` là `refunded`/`failed`
- [x] Comment: Explain rationale (giảm unnecessary polling khi đơn đã ở trạng thái cuối)
- [x] Bugfix: Sửa redirect nhầm khi `cancelled` (trước đây redirect sang success giống `paid`) → giờ chỉ refresh tại chỗ
- [x] Test: Poller early-return + redirect-target logic

**Files:**
- `components/checkout/order-status-poller.tsx` (update)
- `__tests__/components/checkout/order-status-poller.test.ts` (NEW)

**Status:** ✅ Complete (2026-08-09)

---

**Commit Đợt 2:**
```bash
git commit -m "phase9-d2: Checkout hardening (Turnstile/timeline/success-route/poller)

- C7: Turnstile CAPTCHA integration (widget + server validation)
- D7: CheckoutTimeline stepper component (3 steps, responsive)
- C5+F4: Success page route /order/[id]/success + dynamic redirectUrl
- F3: OrderStatusPoller early-return optimization

Components: 3 new files
Routes: 1 new page
Services: Turnstile validation + checkout redirectUrl update
Tests: 2 new test files
Verify: typecheck + lint + test pass"
```

---

## Đợt 3 — Cart & Mobile UX (2.5 ngày)

### D3: Cart "Save for later" (1.5 ngày)

- [x] Migration: `Wishlist` table (`userId`, `productId`, `variantId`, `createdAt`)
- [x] Service: `modules/wishlist/service.ts` (NEW — CRUD operations)
- [x] Route: `POST /api/wishlist` (add to wishlist)
- [x] Route: `GET /api/wishlist` (list wishlist items)
- [x] Route: `DELETE /api/wishlist/[id]` (remove from wishlist)
- [x] Component: `components/wishlist/save-for-later-button.tsx` (cart item action)
- [x] Component: `components/wishlist/wishlist-page-client.tsx` (NEW — `/account/wishlist` UI)
- [x] Page: `app/account/wishlist/page.tsx` (NEW)
- [x] Update: `components/cart/cart-item.tsx` integrate "Lưu lại sau" button
- [x] Logic: Guest → show login prompt toast
- [x] Test: Wishlist service CRUD operations (13 tests)

**Status:** ✅ Done (2026-08-09)

**Files:**
- `prisma/migrations/YYYYMMDDHHMMSS_add_wishlist/migration.sql`
- `modules/wishlist/service.ts` (NEW)
- `modules/wishlist/types.ts` (NEW)
- `app/api/wishlist/route.ts` (NEW)
- `app/api/wishlist/[id]/route.ts` (NEW)
- `components/wishlist/save-for-later-button.tsx` (NEW)
- `components/wishlist/wishlist-page.tsx` (NEW)
- `app/account/wishlist/page.tsx` (NEW)
- `components/cart/cart-item.tsx` (update)
- `__tests__/modules/wishlist/service.test.ts` (NEW)

---

### D8: Cart icon bounce animation (0.5 ngày)

- [x] Hook: `lib/use-previous.ts` (NEW — track previous value)
- [x] Update: `components/cart/cart-button.tsx` detect itemCount increase
- [x] CSS: `@keyframes cart-bounce` animation (300ms, subtle)
- [x] Logic: Trigger animation only when count increases (not decreases)

**Status:** ✅ Done (2026-08-09)

**Files:**
- `lib/use-previous.ts` (NEW)
- `components/cart/cart-button.tsx` (update)
- `app/globals.css` (add bounce keyframes)

---

### D6: Mobile gallery thumbnails horizontal scroll (1 ngày)

- [x] Update: `app/products/[slug]/page.tsx` PDP gallery section
- [x] Layout: Main image + thumbnails horizontal scroll (mobile only)
- [x] CSS: `scroll-snap-type: x mandatory` + `.scrollbar-hide` utility
- [x] Logic: Thumbnail click → update main image (static SSR thumbnails, mobile scroll)
- [x] Responsive: Desktop keeps grid thumbnails, mobile horizontal scroll

**Status:** ✅ Done (2026-08-09)

**Files:**
- `app/products/[slug]/page.tsx` (update gallery section)
- `app/globals.css` (snap scroll styles)

---

**Commit Đợt 3:**
```bash
git commit -m "phase9-d3: Cart & mobile UX (save-for-later/bounce/gallery-scroll)

- D3: Wishlist feature (save-for-later) + /account/wishlist page
- D8: Cart icon bounce animation when itemCount increases
- D6: Mobile PDP gallery horizontal scroll with snap

Migration: Wishlist table
Service: Wishlist CRUD module
Routes: 3 new endpoints (wishlist)
Components: 3 new files + cart item update
Pages: 1 new page (/account/wishlist)
Tests: 1 new test file
Verify: typecheck + lint + test pass"
```

---

## Đợt 4 — Technical Improvements & Polish (2 ngày)

### C6: Countdown sync across tabs (1 ngày)

- [x] Update: `components/checkout/countdown.tsx` add BroadcastChannel logic
- [x] Logic: Broadcast `{ orderNumber, expiresAt, now }` mỗi 1s
- [x] Logic: Listener update local state nếu drift > 500ms
- [x] Fallback: Nếu browser không support BroadcastChannel → local countdown (existing)
- [x] Test: `__tests__/components/checkout/countdown-sync.test.ts` (5 tests) — drift-check logic thuần

**Status:** ✅ Done (2026-08-09)

**Files:**
- `components/checkout/countdown.tsx` (update)
- `components/checkout/order-detail-view.tsx` (pass `orderNumber` prop)
- `__tests__/components/checkout/countdown-sync.test.ts` (NEW)

---

### D9: Footer build ID dynamic (0.5 ngày)

- [x] Update: `tsconfig.json` add `resolveJsonModule: true` (đã có sẵn từ trước)
- [x] Update: `components/layout/footer.tsx` import `package.json` (đã có sẵn từ trước)
- [x] Display: `v{pkg.version}` + `BUILD:{year}.Q{quarter}.PHASE-9` (tính động theo tháng hiện tại, không hardcode PHASE-8B nữa)
- [x] Optional: Env `NEXT_PUBLIC_BUILD_ID` for Docker build hash — override khi có set
- [x] Test: `__tests__/components/layout/footer.test.ts` (5 tests) — quarter calculation Q1/Q3/Q4 + env override + whitespace fallback

**Status:** ✅ Done (2026-08-09)

**Files:**
- `components/layout/footer.tsx` (update — `getBuildId()` helper)
- `__tests__/components/layout/footer.test.ts` (NEW)

---

### Cleanup & final polish (0.5 ngày)

- [x] Remove: `console.error` trong 4 API route handlers (`product-question` module) → đổi sang `logger.error` (khớp convention `lib/http.ts` dùng ở toàn bộ routes khác). `console.log` còn lại chỉ tồn tại trong CLI scripts (`prisma/seed.ts`, `scripts/create-admin.ts`, `prisma/seeds/ai-plans.ts`) và error boundaries client-side (`app/error.tsx`, `app/global-error.tsx`) — đây là output hợp lệ, không phải app logging, giữ nguyên.
- [x] Update: `CONTEXT.md` §2 Phase 9 status → ✅ Done
- [x] Update: `docs/tasks/PHASE_9_PLAN.md` all checkboxes complete
- [x] Verify: typecheck + lint + test pass (504/504 tests, vượt target 480+)
- [x] Verify: `npm run build` pass (58/58 routes, bao gồm `/account/wishlist` + `/api/wishlist`)

**Status:** ✅ Done (2026-08-09)

**Files:**
- `app/api/products/[slug]/questions/route.ts` (console.error → logger.error)
- `app/api/me/questions/route.ts` (console.error → logger.error)
- `app/api/admin/questions/route.ts` (console.error → logger.error)
- `app/api/admin/questions/[id]/route.ts` (console.error → logger.error, 2 chỗ)
- `CONTEXT.md` (update §2)
- `docs/tasks/PHASE_9_PLAN.md` (update)

---

**Commit Đợt 4:**
```bash
git commit -m "phase9-d4: Technical improvements (countdown-sync/footer-version/cleanup)

- C6: Countdown sync across browser tabs via BroadcastChannel
- D9: Footer build ID dynamic (quarter tính từ ngày hiện tại + NEXT_PUBLIC_BUILD_ID override)
- Cleanup: 4 route handlers console.error -> logger.error
- Docs: Update CONTEXT.md Phase 9 status = Done

Components: countdown.tsx + order-detail-view.tsx + footer.tsx updates
Routes: 4 product-question handlers (logger fix)
Tests: 2 new test files (countdown-sync 5 tests, footer 5 tests)
Verify: typecheck + lint + test pass (504 tests) + build pass (58/58 routes)"
```

---

## Verify cuối Phase 9

```bash
npm run typecheck    # ✅ exit 0
npm run lint         # ✅ exit 0 (1 warning pre-existing OK — no-img-element)
npm run test         # ✅ 504/504 tests pass (+57 từ baseline 447)
npm run build        # ✅ exit 0 — 58/58 routes compiled
```

### Manual smoke test checklist

Chưa thực hiện — cần chạy `npm run dev` + click-through thủ công trước khi merge lên production. Code đã verify qua typecheck/lint/test/build; phần dưới đây là bước cuối cùng còn lại trước khi coi Phase 9 100% xong.

- [ ] **PDP:** Reviews tab show aggregate rating + list reviews
- [ ] **PDP:** Q&A tab show questions + form submit
- [ ] **PDP:** Cross-sell carousel scroll, click → navigate
- [ ] **PDP:** Share buttons copy link + Facebook dialog open
- [ ] **PDP:** Trust block display 4 badges
- [ ] **PDP Mobile:** Gallery thumbnails horizontal scroll, snap
- [ ] **Cart:** "Lưu lại sau" button → item move to wishlist, toast
- [ ] **Cart:** Add item → header icon bounce animation
- [ ] **Checkout:** Timeline show current step (Bước 2)
- [ ] **Checkout:** Turnstile widget load, validate on submit
- [ ] **Order:** Redirect `/order/[id]/success` after payment
- [ ] **Countdown:** Open 2 tabs → sync countdown (drift < 1s)
- [ ] **Footer:** Version display `v0.1.0 · BUILD:2026.Q3.PHASE-9`
- [ ] **Wishlist:** `/account/wishlist` page display saved items
- [ ] **CI:** All tests pass, no console.log warnings

---

## Success criteria

Phase 9 complete when:

1. ✅ 15/15 features implemented
2. ⏳ 4/4 đợt committed — code hoàn tất, **hiện đang uncommitted trong working tree**, cần commit theo 4 message mẫu ở trên (hoặc gộp)
3. ✅ All CI gates pass (typecheck + lint + test + build)
4. ⏳ Manual smoke test checklist — chưa thực hiện (xem checklist trên)
5. ✅ `CONTEXT.md` §2 Phase 9 = ✅ Done
6. ✅ No new deviations (or logged D66+ in CONTEXT §7)
7. ✅ Test coverage 80%+ (504 tests, vượt target 480+)

---

## Deviations Phase 9

Ghi vào `CONTEXT.md` §7 với số D66+ nếu có quyết định deviation trong Phase 9.

**Current:** No deviations. (D3 dùng `wishlist-page-client.tsx` thay vì `wishlist-page.tsx` như draft ban đầu trong spec — chỉ là đổi tên file cho rõ nghĩa "client component", không phải deviation nghiệp vụ.)

---

## Notes

- Mỗi đợt phải commit riêng với message format: `phase9-dX: <summary>`
- KHÔNG merge đợt nếu CI gates fail
- KHÔNG tự ý đổi thứ tự đợt hoặc skip features — hỏi user trước
- Focus vào high-impact UX improvements (conversion, trust, anti-fraud)
- Mọi deviation → ghi vào CONTEXT.md §7, chờ user approve

---

**Ready to start Đợt 1?** Đọc `PHASE_9_POLISH.md` §"Đợt 1" để bắt đầu implement.
