# PHASE_8_PLAN — Storefront Purchase Flow Cleanup (Phase 8b)

> **Trạng thái:** 🔄 **IN PROGRESS** (2026-08-07). Phase 8a (CI baseline) đã done (`.eslintrc.json` + `vitest.setup.ts` + cron fix + Input hook fix + re-enable lint/test trong deploy-prod.yml). Phase 8b (storefront cleanup) bắt đầu.
>
> **Mục đích:** Plan dài hạn để theo dõi tiến độ Phase 8b qua nhiều session. Tick `[x]` khi task done. KHÔNG xoá task đã done.
>
> **Source of truth:** [docs/tasks/PHASE_8_STOREFRONT_CLEANUP.md](../tasks/PHASE_8_STOREFRONT_CLEANUP.md) — đọc file đó để biết chi tiết spec + 47 findings. File này chỉ track progress.
>
> **Quy tắc:**
> - Đọc `CONTEXT.md` §2/§7 → file này → spec → bắt đầu code.
> - Sau khi xong task, tick `[x]` + ghi commit hash + note ngắn (nếu có deviation, ghi vào `CONTEXT.md` §7 với số D65+).
> - Mỗi đợt commit riêng (`phase8b-đợtN-{findingID}: short-desc`).
> - Không tự ý đổi thứ tự đợt. Nếu cần → dừng, hỏi user.
>
> **Owner:** AI agent theo instruction user.
>
> **Created:** 2026-08-07. **Target complete:** 2026-08-12 (5 ngày làm việc).

---

## Phase 8a — CI Baseline (đã done)

| Task | Commit | Note |
|---|---|---|
| Tạo `.eslintrc.json` (next/core-web-vitals + prettier) | Phase 8a batch | Kích hoạt `next lint` |
| Tạo `vitest.setup.ts` (dotenv + safe env defaults) | Phase 8a batch | Sửa lỗi "Failed to load url vitest.setup.ts" |
| Sửa `components/ui/input.tsx` hook order | Phase 8a batch | `useId` unconditional |
| Sửa `modules/jobs/cleanup-pending.ts` scan query | Phase 8a batch | Bỏ cutoff WHERE, revalidate grace trong loop |
| Re-enable `lint` + `test` trong `deploy-prod.yml` | Phase 8a batch | Build job chạy đủ 3 gate |
| Cập nhật `CONTEXT.md` §2 Phase 8 + §7 D61 | Phase 8a batch | Ghi nhận baseline restored |

**Verify (2026-08-07):** `npm run lint` exit 0 (1 warning `no-img-element` không block) · `npm run typecheck` exit 0 · `npm run test` 53/53 files, 447/447 tests pass.

---

## Deviations lock-in (Phase 8b — KHÔNG tự ý đổi)

> Chưa có deviation nào. Khi phát sinh: dừng, ghi vào `CONTEXT.md` §7 (D65+), xin user.

---

## Task checklist (5 đợt × 47 findings)

### Đợt 1 — Unblock purchase flow (1-2 ngày)

> Mục tiêu: User có thể add-to-cart từ PDP và checkout end-to-end.

- [ ] **A1** `components/product/add-to-cart-button.tsx` (NEW) — client button consume `selectedVariantId`, gọi `POST /api/cart/items`, toast + cart badge increment
- [ ] **A1** Update `app/products/[slug]/page.tsx` — render `<AddToCartButton>` thay button disabled; xử lý stock out_of_stock
- [ ] **A5** PDP variant selection state — `useState<string | null>('selectedVariantId')`, highlight card selected, `aria-pressed`, disable AddToCart khi null
- [ ] **A6** Bỏ `name` state + `void name` ở `components/checkout/checkout-form.tsx`
- [ ] **B10** Footer link "Tra cứu đơn hàng" → `/track-order` (sửa `components/layout/footer.tsx:21`)
- [ ] **A3** Cart null state → `router.refresh()` thay `<a href>` (`app/cart/page.tsx:36-53`)
- [ ] **C10** Bỏ stale comment "Giỏ hàng sẽ có ở Phase 2" ở PDP (cùng A1)

**Commit:** `phase8b-d1: Unblock PDP add-to-cart + variant selector`
**Verify:** typecheck + lint + test pass · Manual: PDP add → cart drawer count → checkout → order success

---

### Đợt 2 — Data consistency (1-2 ngày)

> Mục tiêu: 1 source of truth cho cart state.

- [ ] **A2** `lib/cart-context.tsx` (NEW) — `CartProvider` + `useCart()` hook + `useReducer`
- [ ] **A2** Wrap `<CartProvider>` ở `app/layout.tsx`, pass `initialCart` từ server
- [ ] **A2** Refactor `CartButton` (`components/cart/cart-button.tsx`) — `useCart()` thay state local
- [ ] **A2** Refactor `CartDrawer` (`components/cart/cart-drawer.tsx`) — `useCart()` thay fetch local
- [ ] **A2** Refactor `CartPageClient` (`components/cart/cart-page-client.tsx`) — `useCart()` + dispatch
- [ ] **C3** Bỏ `cart:updated` custom event + `window.dispatchEvent` ở tất cả components
- [ ] **B2** Auth-aware Header (`components/layout/header.tsx`) — `getCurrentUser` ở server layout, render avatar dropdown khi logged in
- [ ] **B2** LogoutButton từ `components/account/logout-button.tsx` reuse cho header dropdown
- [ ] **F1** Tách `itemCount` (qty) vs `lineCount` (rows) ở `modules/cart/types.ts` + `service.ts`
- [ ] **F1** Update UI sử dụng field đúng (`app/cart/page.tsx`, `cart-page-client.tsx`, `cart-button.tsx`)

**Commit:** `phase8b-d2: CartProvider + auth-aware header`
**Verify:** typecheck + lint + test pass · Integration test: add từ drawer → header badge sync ngay

---

### Đợt 3 — UX polish (1 ngày)

> Mục tiêu: Mobile-friendly + clean code.

- [ ] **B1** Mobile menu drawer (`components/layout/mobile-nav.tsx` NEW) — hamburger button + slide-out từ trái
- [ ] **B1** Wire mobile nav vào `components/layout/header.tsx` (replace hidden nav với hamburger <md)
- [ ] **B3** Filter sticky offset: `top-24` → `top-[96px]` ở `app/products/page.tsx:91`
- [ ] **B4** Empty state "Xoá bộ lọc" → dùng `FilterPanel.clearAll()` callback (truyền từ page xuống FilterPanel qua prop)
- [ ] **B5** PDP gallery render `product.media[0]` qua `<Image>` (`app/products/[slug]/page.tsx:110-123`)
- [ ] **B8** Order status badge tách rời — dùng `ORDER_STATUS_LABELS` cho 3 status `processing/delivered/completed`
- [ ] **B9** Reveal-key inline trên order page khi `delivered` + `INSTANT_AUTO` + user (không guest)
- [ ] **C1** Helper `getMinProductPrice(product)` ở `lib/format.ts` + unit test
- [ ] **C1** Refactor PDP + ProductCard dùng helper
- [ ] **C2** Bỏ local `StatusBadge` ở order page, dùng `lib/format.ts` centralized
- [ ] **C4** `/products` catch DB error → `logger.warn(err.message)` thay silent fail
- [ ] **C8** Header active route highlight — child client component dùng `usePathname()`
- [ ] **C9** PDP salePrice strike-through + "-X%" badge (variant + product card)

**Commit:** `phase8b-d3: Mobile nav + UX polish + code consistency`
**Verify:** typecheck + lint + test pass · Manual mobile test + PDP gallery test

---

### Đợt 4 — Accessibility & i18n (0.5 ngày)

- [x] **E1** CartDrawer focus trap — Tab cycle qua drawer, restore focus on close (`lib/use-focus-trap.ts` NEW hook)
- [x] **E1** Mobile nav cũng có focus trap tương tự (dùng chung hook)
- [x] **E2** Countdown `role="timer"` + visually hidden announce khi expired (`role="status" aria-live="assertive"`)
- [x] **E3** PDP variant cards `aria-pressed` — đã có sẵn từ A5 trong `product-purchase-section.tsx`
- [x] **E4** PDP "BẠN NHẬN ĐƯỢC" list → `role="list"` + `aria-labelledby` (VoiceOver strip list-style:none)
- [x] **E5** Form labels `useId()` cho `checkout-notes`; `Input` component tự quản id (Phase 8a) → track-order-form OK sẵn

**Commit:** `3797253 phase8b-d4: Accessibility improvements (E1-E5)`
**Verify (2026-08-08):** typecheck ✅ · lint ✅ (1 warning `no-img-element` pre-existing) · test ✅ 53/53 files, 447/447

---

### Đợt 5 — Contract hardening + polish (0.5 ngày)

- [x] **A4** Checkout DB-error redirect có context (`?error=cart_load_failed`) trong `app/checkout/page.tsx`
- [x] **A4** `/cart` page đọc `searchParams.error` → render banner `role="alert"` với message "Không tải được giỏ hàng..."
- [x] **C5** Footer link "Mở ticket" → `/support/new` đã có sẵn từ phase trước (verified line 20 `footer.tsx`)
- [x] **D9** Footer build ID dynamic — dùng `import packageJson from '@/package.json'` với `resolveJsonModule:true`, hiển thị `v{packageJson.version}` và `BUILD:{year}.Q3.PHASE-8B`
- [x] **D9** `components/checkout/order-status-poller.tsx` thêm comment giải thích polling fallback rationale
- [x] **F3** Note vào plan: 1 ESLint warning `no-img-element` là pre-existing (admin avatar preview), không block CI
- [x] **F6** PDP jsonLd thêm comment clarify "minPrice/price are VND integer cents, future: add currency field for multi-currency"

**Commit:** `<pending> phase8b-d5: Contract hardening + polish (A4, D9, F3, F6)`
**Verify (2026-08-08):** typecheck ✅ · lint ✅ (1 warning pre-existing) · test ✅ 53/53 files, 447/447

---

## Backlog → Phase 9 (ghi khi đến đợt 5)

- **D1** PDP tab Reviews / Hỏi đáp
- **D2** PDP "Khách cũng mua" cross-sell
- **D3** Cart "Save for later"
- **D4** PDP Share button
- **D5** PDP trust block "Bảo hành 30 ngày"
- **D6** Mobile PDP gallery thumbnails horizontal scroll
- **D7** Checkout timeline visual
- **D8** Cart icon bounce animation
- **D10** PDP average rating display
- **C6** Countdown sync giữa tabs
- **C7** Honeypot / Turnstile cho `/api/checkout`
- **F4** `/order/[orderNumber]/success` route riêng

---

## Verify cuối phase

```bash
npm run typecheck    # ✅ exit 0
npm run lint         # ✅ exit 0 (warning `no-img-element` OK)
npm run test         # ✅ 53/53 files, 447+ tests pass
npm run build        # ✅ exit 0
```

Manual smoke test toàn bộ storefront flow theo spec §"Test strategy".

Cập nhật `CONTEXT.md` §2 Phase 8 = ✅ Done (full) + §7 nếu có deviation mới.

---

## Open questions cho user (nếu phát sinh trong lúc code)

Nếu gặp phải 1 trong các câu hỏi sau, **DỪNG**, hỏi user trước khi tiếp:

1. Có muốn ẩn `deliveryStrategy: FILE/TOPUP/EXTERNAL_INVITE` ở UI public không? (BR — D19)
2. PDP có cần quantity selector không? (Hiện mặc định 1 sp / variant)
3. Cart drawer có cần "Apply coupon" ở drawer không? (F10 đã note disabled)
4. Có muốn guest checkout lưu name không? (A6 + F5 trade-off)

Mọi quyết định khác với spec → ghi vào `CONTEXT.md` §7 với D65+ trước khi commit.
