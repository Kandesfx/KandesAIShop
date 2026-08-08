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
| Đợt 1 | PDP Polish (5 features) | 🔄 In Progress (1/5) | `bcf96f3` (D10) | 2026-08-09 |
| Đợt 2 | Checkout Hardening (4 features) | ⏳ TODO | - | - |
| Đợt 3 | Cart & Mobile UX (3 features) | ⏳ TODO | - | - |
| Đợt 4 | Technical Improvements (3 features) | ⏳ TODO | - | - |

**Total:** 1/15 features done

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

- [ ] Migration: `ProductQuestion` table
- [ ] Component: `components/product/product-tabs.tsx` (tab container)
- [ ] Component: `components/product/reviews-tab.tsx` (list + pagination)
- [ ] Component: `components/product/qa-tab.tsx` (Q&A list + form)
- [ ] Component: `components/ui/tabs.tsx` (generic tabs — shadcn)
- [ ] Route: `GET /api/products/[slug]/reviews` (list reviews)
- [ ] Route: `POST /api/products/[slug]/reviews` (submit review, auth required)
- [ ] Route: `GET /api/products/[slug]/questions` (list Q&A)
- [ ] Route: `POST /api/products/[slug]/questions` (ask question)
- [ ] Route: `POST /api/admin/questions/[id]/answer` (admin answer)
- [ ] Service: `modules/product/question-service.ts` (NEW)
- [ ] Update: PDP integrate tabs below description
- [ ] Test: Review submission updates avgRating
- [ ] Test: Q&A service CRUD

**Files:**
- `prisma/migrations/YYYYMMDDHHMMSS_add_product_question/migration.sql`
- `modules/product/question-service.ts` (NEW)
- `app/api/products/[slug]/reviews/route.ts` (NEW)
- `app/api/products/[slug]/questions/route.ts` (NEW)
- `app/api/admin/questions/[id]/answer/route.ts` (NEW)
- `components/product/product-tabs.tsx` (NEW)
- `components/product/reviews-tab.tsx` (NEW)
- `components/product/qa-tab.tsx` (NEW)
- `components/ui/tabs.tsx` (NEW)
- `app/products/[slug]/page.tsx` (update)
- `__tests__/modules/product/question-service.test.ts` (NEW)

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

- [ ] Env: Add `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` to `.env.example`
- [ ] Component: `components/checkout/turnstile-widget.tsx` (Cloudflare widget wrapper)
- [ ] Update: `components/checkout/checkout-form.tsx` integrate Turnstile widget
- [ ] Service: `modules/checkout/turnstile.ts` validate token server-side
- [ ] Update: `app/api/checkout/route.ts` validate Turnstile before create order
- [ ] Fallback: Rate-limit existing nếu Turnstile down
- [ ] Test: Mock Turnstile validation (success/fail cases)

**Files:**
- `modules/checkout/turnstile.ts` (NEW)
- `components/checkout/turnstile-widget.tsx` (NEW)
- `components/checkout/checkout-form.tsx` (update)
- `app/api/checkout/route.ts` (update)
- `.env.example` (update)
- `__tests__/modules/checkout/turnstile.test.ts` (NEW)

---

### D7: Checkout timeline visual (1 ngày)

- [ ] Component: `components/checkout/checkout-timeline.tsx` (3-step stepper)
- [ ] Update: `app/checkout/page.tsx` integrate timeline header
- [ ] Update: `app/order/[orderNumber]/page.tsx` show timeline (step 3)
- [ ] Responsive: Vertical mobile, horizontal desktop
- [ ] Content: "Giỏ hàng" → "Thanh toán" → "Hoàn tất"

**Files:**
- `components/checkout/checkout-timeline.tsx` (NEW)
- `app/checkout/page.tsx` (update)
- `app/order/[orderNumber]/page.tsx` (update)

---

### C5 + F4: Success page route (0.5 ngày)

- [ ] Route: `app/order/[orderNumber]/success/page.tsx` (NEW)
- [ ] Update: `modules/checkout/service.ts` change `redirectUrl` → `/order/[id]/success`
- [ ] Component: Reuse QR display + countdown + order summary
- [ ] Breadcrumb: Home → Order → Success

**Files:**
- `app/order/[orderNumber]/success/page.tsx` (NEW)
- `modules/checkout/service.ts` (update)

---

### F3: OrderStatusPoller optimization (0.5 ngày)

- [ ] Update: `components/checkout/order-status-poller.tsx` early-return logic
- [ ] Logic: Return nếu `paymentStatus` in `['paid', 'refunded', 'failed']`
- [ ] Comment: Explain rationale (giảm unnecessary polling)
- [ ] Test: Poller early-return when terminal status

**Files:**
- `components/checkout/order-status-poller.tsx` (update)
- `__tests__/components/order-status-poller.test.ts` (NEW)

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

- [ ] Migration: `Wishlist` table (`userId`, `productId`, `variantId`, `createdAt`)
- [ ] Service: `modules/wishlist/service.ts` (NEW — CRUD operations)
- [ ] Route: `POST /api/wishlist` (add to wishlist)
- [ ] Route: `GET /api/wishlist` (list wishlist items)
- [ ] Route: `DELETE /api/wishlist/[id]` (remove from wishlist)
- [ ] Component: `components/wishlist/save-for-later-button.tsx` (cart item action)
- [ ] Component: `components/wishlist/wishlist-page.tsx` (NEW — `/account/wishlist` UI)
- [ ] Page: `app/account/wishlist/page.tsx` (NEW)
- [ ] Update: `components/cart/cart-item.tsx` integrate "Lưu lại sau" button
- [ ] Logic: Guest → show login prompt toast
- [ ] Test: Wishlist service CRUD operations

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

- [ ] Hook: `lib/use-previous.ts` (NEW — track previous value)
- [ ] Update: `components/cart/cart-button.tsx` detect itemCount increase
- [ ] CSS: `@keyframes bounce` animation (300ms, subtle)
- [ ] Logic: Trigger animation only when count increases (not decreases)

**Files:**
- `lib/use-previous.ts` (NEW)
- `components/cart/cart-button.tsx` (update)
- `app/globals.css` (add bounce keyframes)

---

### D6: Mobile gallery thumbnails horizontal scroll (1 ngày)

- [ ] Update: `app/products/[slug]/page.tsx` PDP gallery section
- [ ] Layout: Main image + thumbnails horizontal scroll (mobile only)
- [ ] CSS: `scroll-snap-type: x mandatory` for snap behavior
- [ ] Logic: Thumbnail click → update main image
- [ ] Responsive: Desktop keeps vertical thumbnails (existing)

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

- [ ] Update: `components/checkout/countdown.tsx` add BroadcastChannel logic
- [ ] Logic: Broadcast `{ orderNumber, expiresAt, now }` mỗi 1s
- [ ] Logic: Listener update local state nếu drift > 500ms
- [ ] Fallback: Nếu browser không support BroadcastChannel → local countdown (existing)
- [ ] Test: Manual — open 2 tabs, verify countdown sync (drift < 1s)

**Files:**
- `components/checkout/countdown.tsx` (update)

---

### D9: Footer build ID dynamic (0.5 ngày)

- [ ] Update: `tsconfig.json` add `resolveJsonModule: true`
- [ ] Update: `components/layout/footer.tsx` import `package.json`
- [ ] Display: `v{pkg.version} · BUILD:{year}.Q{quarter}.PHASE-9`
- [ ] Optional: Env `NEXT_PUBLIC_BUILD_ID` for Docker build hash

**Files:**
- `tsconfig.json` (update)
- `components/layout/footer.tsx` (update)

---

### Cleanup & final polish (0.5 ngày)

- [ ] Remove: All `console.log` statements (except `logger.*`)
- [ ] Update: `CONTEXT.md` §2 Phase 9 status → ✅ Done
- [ ] Update: `docs/tasks/PHASE_9_PLAN.md` all checkboxes complete
- [ ] Smoke test: Manual full storefront flow + Phase 9 features
- [ ] Verify: typecheck + lint + test pass (aim 480+ tests)

**Files:**
- `CONTEXT.md` (update §2)
- `docs/tasks/PHASE_9_PLAN.md` (update)
- Various: cleanup console.log

---

**Commit Đợt 4:**
```bash
git commit -m "phase9-d4: Technical improvements (countdown-sync/footer-version/cleanup)

- C6: Countdown sync across browser tabs via BroadcastChannel
- D9: Footer version dynamic from package.json
- Cleanup: Remove console.log statements
- Docs: Update CONTEXT.md Phase 9 status

Components: countdown + footer updates
Config: tsconfig resolveJsonModule
Tests: Manual smoke test pass
Verify: typecheck + lint + test pass (480+ tests)"
```

---

## Verify cuối Phase 9

```bash
npm run typecheck    # ✅ exit 0
npm run lint         # ✅ exit 0 (1 warning pre-existing OK)
npm run test         # ✅ 480+ tests pass (add ~33 new tests)
npm run build        # ✅ exit 0
```

### Manual smoke test checklist

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
2. ✅ 4/4 đợt committed
3. ✅ All CI gates pass (typecheck + lint + test)
4. ✅ Manual smoke test checklist 15/15 pass
5. ✅ `CONTEXT.md` §2 Phase 9 = ✅ Done
6. ✅ No new deviations (or logged D66+ in CONTEXT §7)
7. ✅ Test coverage 80%+ (480+ tests)

---

## Deviations Phase 9

Ghi vào `CONTEXT.md` §7 với số D66+ nếu có quyết định deviation trong Phase 9.

**Current:** No deviations yet.

---

## Notes

- Mỗi đợt phải commit riêng với message format: `phase9-dX: <summary>`
- KHÔNG merge đợt nếu CI gates fail
- KHÔNG tự ý đổi thứ tự đợt hoặc skip features — hỏi user trước
- Focus vào high-impact UX improvements (conversion, trust, anti-fraud)
- Mọi deviation → ghi vào CONTEXT.md §7, chờ user approve

---

**Ready to start Đợt 1?** Đọc `PHASE_9_POLISH.md` §"Đợt 1" để bắt đầu implement.
