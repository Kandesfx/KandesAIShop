# PHASE_8_STOREFRONT_CLEANUP — Sprint 8b: Storefront Purchase Flow UI/UX Fixes

> **Trạng thái:** ✅ **DONE** (2026-08-07). Toàn bộ 47 findings đã triển khai xong qua 5 đợt. Verify: typecheck/lint/test (447/447)/build đều pass. Không có deviation mới (D65+).
>
> **Mục tiêu:** Khắc phục các UI/UX + code smell + consistency gap được phát hiện qua audit ngày 2026-08-07, đảm bảo storefront purchase flow (Landing → Catalog → PDP → Cart → Checkout → Order → Track) chạy mượt và code đạt baseline CI.
>
> **Thời gian:** 5-7 ngày (chia 5 đợt ưu tiên).
>
> **Prerequisite:**
> - Phase 8a done (baseline CI restored — `.eslintrc.json` + `vitest.setup.ts` + cron query fix + Input hook order + re-enable lint/test trong `deploy-prod.yml`).
> - Phase 0-7 đã done (foundation → catalog → auth → checkout → payment → AI gateway → hardening).
>
> **Quan trọng:**
> - File spec này là **single source of truth** cho Phase 8b. Mọi AI agent mới vào session: đọc `CONTEXT.md` → file này → `PHASE_8_PLAN.md` (progress) → bắt đầu code.
> - Findings được đánh mã **A1..F6** (47 items). Đợt 1-5 quy định thứ tự ưu tiên. KHÔNG tự ý đổi thứ tự khi chưa hỏi user.
> - Mọi deviation phát sinh → ghi vào `CONTEXT.md` §7 với số D65+, dừng chờ user.

---

## Phạm vi (Scope)

### In-scope
- **Public storefront**: `app/page.tsx`, `app/products/page.tsx`, `app/products/[slug]/page.tsx`, `app/cart/page.tsx`, `app/checkout/page.tsx`, `app/order/[orderNumber]/page.tsx`, `app/track-order/page.tsx`
- **Layout chrome**: `components/layout/header.tsx`, `components/layout/footer.tsx`
- **Cart components**: `components/cart/{cart-button,cart-drawer,cart-page-client,cart-item}.tsx`
- **Checkout components**: `components/checkout/{checkout-form,qr-display,countdown,order-status-poller,track-order-form}.tsx`
- **Catalog components**: `components/product/{product-card,filter-panel,pagination,breadcrumb}.tsx`
- **Homepage sections**: `components/sections/{hero,categories,featured-products,value-props,cta-section}.tsx`
- **Services + route handlers**: `app/api/{cart/*,checkout,orders/*}/route.ts` + `modules/cart/*` + `modules/checkout/*`
- **Shared**: `components/ui/{button,input,card,empty-state,confirm-dialog,skip-link}.tsx`, `lib/format.ts`, `lib/auth.ts`

### Out-of-scope (Phase 8b này KHÔNG động)
- Auth pages (`/auth/*`, `/account/*`, `/admin/*`)
- API Gateway (Phase 6) — Phase 9+ nếu cần UI polish
- Email templates (Phase 5)
- Admin panel — Phase 8c
- Infrastructure / CI/CD (Phase 8a done)

---

## Cấu trúc file (single source of truth)

```
docs/tasks/
├── PHASE_8_STOREFRONT_CLEANUP.md   ← file này (spec chi tiết + 47 findings + đợt ưu tiên)
└── PHASE_8_PLAN.md                 ← checklist tiến độ (commit hash + deviation notes)

CONTEXT.md §2                       ← Phase 8 split: 8a (CI baseline) + 8b (storefront)
CONTEXT.md §7                       ← Deviations D65+ (lock-in từ Phase 8b)
```

---

## Câu hỏi đã chốt với user (trước khi viết spec)

| # | Câu hỏi | Quyết định |
|---|---------|------------|
| Q1 | Phase scope tiếp theo sau CI baseline? | **Storefront purchase flow** |
| Q2 | Approach? | **Audit trước → viết report → chờ user duyệt → mới sửa** |
| Q3 | Findings có fix ngay không? | **Có, chia 5 đợt ưu tiên; user chọn đợt để bắt đầu** |
| Q4 | Ưu tiên blocker? | **A1 (PDP MUA disabled) + A5 (variant selector) là P0** |
| Q5 | Header auth-aware (B2) làm đợt nào? | **Đợt 2** (cùng CartProvider refactor) |

---

## Danh sách findings (47 items)

> Mỗi finding có ID, mức ưu tiên (P0-P3), file:line, mô tả, đề xuất fix, accept criteria.
> ID convention: `A` = P0 (blocker), `B` = P1 (UX), `C` = P2 (code smell), `D` = P3 (polish), `E` = a11y/i18n, `F` = contract.

### A — P0: Vấn đề nghiêm trọng (blocker flow)

#### A1. PDP "MUA" button bị hard-disable — blocker purchase flow
- **File:** `app/products/[slug]/page.tsx:258-265`
- **Hiện trạng:**
  ```tsx
  <button disabled className="btn-primary text-[11px] py-1.5"
          title="Giỏ hàng sẽ có ở Phase 2">MUA</button>
  ```
- **Vấn đề:** Khách vào PDP không add được vào giỏ → storefront flow đứt giữa đường.
- **Fix:** Build `<AddToCartButton variantId productId ... />` (client) gọi `POST /api/cart/items`. Enable chỉ khi user đã chọn variant (xem A5). Stock `out_of_stock` → disable + label "HẾT HÀNG". Sau add → toast + cart badge increment.
- **Accept:**
  - [ ] Click MUA trên PDP variant đã chọn → toast "Đã thêm vào giỏ" + cart badge +1.
  - [ ] Variant chưa chọn → MUA button disabled + tooltip "Chọn gói trước".
  - [ ] `out_of_stock` → button disabled + label "HẾT HÀNG".
  - [ ] `INSTANT_AUTO` + `trackInventory` + hết inventory thật → backend trả 409 → UI hiển thị "Sản phẩm tạm hết".

#### A2. Cart state có 3 nguồn song song → drift
- **File:** `components/cart/cart-page-client.tsx`, `components/cart/cart-drawer.tsx`, `components/cart/cart-button.tsx`
- **Hiện trạng:** Mỗi component tự `api.get('/api/cart')` riêng, state local riêng, mutations set qua API response. `CartButton` (header) lắng nghe `cart:updated` qua `window.dispatchEvent` nhưng `CartPageClient` mutate KHÔNG bắn event → header badge sai.
- **Vấn đề:** 3 nguồn state không đồng bộ → UX không nhất quán (vd: cart drawer trống nhưng header badge = 3).
- **Fix:** Tạo `CartProvider` (React Context + `useReducer`) mount ở `app/layout.tsx`. `CartButton`, `CartDrawer`, `CartPageClient` đều `useCart()`. Mutations → dispatch reducer. Bỏ `cart:updated` custom event.
- **Accept:**
  - [ ] Single source of truth: `CartProvider` ở `app/layout.tsx`.
  - [ ] Mutations từ bất kỳ component nào → tất cả components cùng re-render.
  - [ ] Header badge khớp với cart drawer count (manual test: add/remove từ drawer → header update).
  - [ ] Reload page → state hydrate từ server-side `initialCart` (qua prop).

#### A3. `/cart` page null state → vòng lặp reload
- **File:** `app/cart/page.tsx:36-53`
- **Hiện trạng:** DB error → hiển thị "Không thể tải giỏ hàng" + `<a href="/cart">LÀM MỚI</a>` → reload toàn trang (không có message mới).
- **Fix:** Đổi thành `<Button onClick={() => router.refresh()}>`. Thêm button "Về trang chủ".
- **Accept:**
  - [ ] Click "LÀM MỚI" khi DB recover → cart hiển thị bình thường (không full page reload).
  - [ ] Có button "Về trang chủ" cho UX escape.

#### A4. `/checkout` graceful degradation sai context
- **File:** `app/checkout/page.tsx:42-46`
- **Hiện trạng:** Catch DB error → `redirect('/cart')` không query string.
- **Fix:** Kèm `?error=cart_load_failed`. Trang `/cart` đọc query → toast "Không tải được giỏ, vui lòng thử lại".
- **Accept:**
  - [ ] DB down → redirect về `/cart?error=cart_load_failed`.
  - [ ] `/cart` page (server) đọc `searchParams.error` → render banner `role="alert"` "Tải giỏ thất bại, vui lòng thử lại".

#### A5. PDP thiếu "variant selection state"
- **File:** `app/products/[slug]/page.tsx:236-270`
- **Hiện trạng:** Render list variants, mỗi cái 1 button MUA riêng, không có state "variant đã chọn".
- **Vấn đề:** User click MUA variant 1 tháng trông giống variant 12 tháng.
- **Fix:** Selected variant card highlight (`border-electric + bg-electric/5`). MUA button chỉ enable khi state `selectedVariantId !== null`. Khi stock thay đổi hoặc user click → update.
- **Accept:**
  - [ ] State local `selectedVariantId: string | null` (client).
  - [ ] Variant card có `aria-pressed={selected === v.id}`.
  - [ ] Card highlight khi selected.
  - [ ] AddToCartButton (A1) consume `selectedVariantId`.

#### A6. `CheckoutForm` `name` state unused
- **File:** `components/checkout/checkout-form.tsx:36,73`
- **Hiện trạng:** `const [name] = useState(defaultName)` + `void name` → unused var warning.
- **Vấn đề:** Warning + signal không nhất quán.
- **Fix:** Bỏ `name` state + prop. Nếu user muốn guest name, mở migration mới (F5). Default: ẩn field.
- **Accept:**
  - [ ] Không còn unused var.
  - [ ] Không còn `void name` workaround.
  - [ ] Email template dùng fallback "Quý khách" nếu không có name (lib/email.ts update nếu cần).

---

### B — P1: UX nhỏ nhưng dễ thấy

#### B1. Header thiếu mobile menu
- **File:** `components/layout/header.tsx:40-50`
- **Hiện trạng:** `nav hidden md:flex` → mobile (<768px) hoàn toàn không thấy nav. Chỉ search/cart/login.
- **Fix:** Thêm hamburger button + slide-out drawer cho mobile. Reuse pattern từ `CartDrawer`.
- **Accept:**
  - [ ] Mobile (<768px): chỉ thấy hamburger + search + cart + login. Tap hamburger → drawer trượt vào từ trái.
  - [ ] Drawer có nav items giống desktop, plus user avatar nếu đã login.
  - [ ] ESC đóng drawer + click outside đóng.

#### B2. Header "Đăng nhập" luôn hiển thị
- **File:** `components/layout/header.tsx:62-69`
- **Hiện trạng:** Không check session → user đã login vẫn thấy nút "Đăng nhập".
- **Fix:** Auth-aware. User đã login → render avatar dropdown (Account/Orders/Logout). Mount ở server `app/layout.tsx` (qua `getCurrentUser`) + pass qua client component.
- **Accept:**
  - [ ] Logged out: thấy "Đăng nhập" link → `/auth/login`.
  - [ ] Logged in: thấy avatar + dropdown menu (Tài khoản, Đơn hàng, Đăng xuất).
  - [ ] Server-rendered (không flash logged-out → logged-in).

#### B3. `/products` filter sticky offset sai
- **File:** `app/products/page.tsx:91`
- **Hiện trạng:** `lg:sticky lg:top-24 lg:self-start` — `top-24` không khớp header thật (~96px).
- **Fix:** Đo lại header height (top bar 28px + main 64px + border ≈ 93px) → `top-[96px]`.
- **Accept:**
  - [ ] Sticky filter không bị header che khi scroll.

#### B4. `/products` empty state reset thiếu sort
- **File:** `app/products/page.tsx:107-111`
- **Hiện trạng:** Link "Xoá bộ lọc" → `/products` nhưng sort=price-desc vẫn active.
- **Fix:** Dùng `FilterPanel.clearAll()` (đã có ở `components/product/filter-panel.tsx:50`).
- **Accept:**
  - [ ] Click "Xoá bộ lọc" → URL = `/products`, không có sort/category/q.

#### B5. PDP gallery dùng placeholder icon, không render `product.media`
- **File:** `app/products/[slug]/page.tsx:110-123`
- **Hiện trạng:** `<Box size={120} ... />` icon placeholder.
- **Vấn đề:** Schema có `ProductMedia[]`, service `getProductDetail` đã include. Không render → lãng phí data.
- **Fix:** Nếu `product.media.length > 0`, render `<Image src={m.url} />` cho ảnh đầu tiên. Next/image đã config remote patterns ở `next.config.js:14-16`.
- **Accept:**
  - [ ] Có media → render Image (responsive, aspect-square).
  - [ ] Không có media → fallback Box icon (giữ nguyên).
  - [ ] `priority` cho first image + `sizes` đúng.

#### B6. Cart summary count semantics mơ hồ
- **File:** `app/cart/page.tsx:58-62`, `modules/cart/service.ts:104`
- **Hiện trạng:** `cart.itemCount` tính `items.reduce(sum quantity)` (tổng qty) nhưng label "Bạn đang có X sản phẩm" → user có thể hiểu "X dòng".
- **Fix:** Tách `itemCount` (tổng qty) vs `lineCount` (số dòng). Hoặc đổi label "sản phẩm" → "món" (kèm parenthesized "(N dòng)").
- **Accept:**
  - [ ] Label chính xác: 3 món × 2 sp = 3 dòng / 6 sản phẩm (cách hiển thị rõ ràng).

#### B7. Checkout "SỬA GIỎ HÀNG" button không có warning
- **File:** `app/checkout/page.tsx:161-165`
- **Hiện trạng:** Click → `/cart` (back) nhưng không cảnh báo.
- **Fix:** Nếu user có data dirty (đã điền form) → trước khi navigate, confirm dialog "Rời trang sẽ giữ nguyên giỏ hàng nhưng form sẽ mất".
- **Accept:**
  - [ ] Form dirty → confirm trước khi navigate.
  - [ ] Form clean → navigate thẳng.

#### B8. `/order/[orderNumber]` gộp 3 status vào 1 box
- **File:** `app/order/[orderNumber]/page.tsx:227-243`
- **Hiện trạng:** `processing | delivered | completed` chung 1 box "ĐANG XỬ LÝ / ĐÃ GIAO".
- **Vấn đề:** `completed` ≠ `delivered` (UI confusion).
- **Fix:** Tách badge cho từng status. Dùng `ORDER_STATUS_LABELS` + `ORDER_STATUS_BADGE_CLASS` ở `lib/format.ts:110-130` (đã có).
- **Accept:**
  - [ ] 3 status có badge + message riêng.
  - [ ] CTA reveal-key cho delivered (xem B9).

#### B9. `/order/[orderNumber]` paid → không có CTA reveal key
- **File:** `app/order/[orderNumber]/page.tsx:198-208`
- **Hiện trạng:** "Đang xử lý... vào mục đơn hàng" → user phải tự tìm `/account/orders/[orderNumber]`.
- **Fix:** Nếu `order.status === 'delivered'` + `deliveryStrategy === 'INSTANT_AUTO'` → render `<RevealKeyDialog>` inline (component đã có ở `components/account/reveal-key-dialog.tsx`).
- **Accept:**
  - [ ] User đã login + order delivered + INSTANT_AUTO → thấy button "Xem key" → mở dialog nhập password → reveal.
  - [ ] Guest → vẫn hiển thị message "Vào email để xem key" (không có password verify cho guest).

#### B10. Footer link "Tra cứu đơn hàng" trỏ sai path
- **File:** `components/layout/footer.tsx:21`
- **Hiện trạng:** Link `/support` cho "Tra cứu đơn hàng" — sai. `/support` là ticket form (P7-05).
- **Fix:** Đổi href → `/track-order`. Thêm link `/track-order` ở cột "Hỗ trợ".
- **Accept:**
  - [ ] Click "Tra cứu đơn hàng" → `/track-order` (đúng).
  - [ ] `/track-order` xuất hiện rõ trong footer.

---

### C — P2: Code smell / consistency

#### C1. Type inconsistency: `BigInt` ở format.ts nhưng PDP/ProductCard tự tính
- **File:** `app/products/[slug]/page.tsx:50-54`, `components/product/product-card.tsx:18-30`
- **Fix:** Helper `getMinProductPrice(product)` ở `lib/format.ts` hoặc `modules/catalog/service.ts`.
- **Accept:**
  - [ ] `getMinProductPrice` exported + unit test.
  - [ ] PDP + ProductCard đều dùng helper (no duplicate logic).

#### C2. `ORDER_STATUS_LABELS` đã có nhưng `/order/[orderNumber]` không dùng
- **File:** `app/order/[orderNumber]/page.tsx:250-275`
- **Fix:** Dùng `ORDER_STATUS_LABELS` + `ORDER_STATUS_BADGE_CLASS`.
- **Accept:**
  - [ ] Bỏ local `StatusBadge`. Reuse centralized.

#### C3. `CartDrawer` KHÔNG bắn `cart:updated`
- **File:** `components/cart/cart-drawer.tsx:62-88`
- **Fix:** Tương tự A2 → CartProvider giải quyết triệt để. Bỏ local callback.
- **Accept:**
  - [ ] Mutations ở CartDrawer update tất cả components.

#### C4. `/products` catch DB error rỗng
- **File:** `app/products/page.tsx:46-61`
- **Fix:** `catch (err) { logger.warn(...) }`.
- **Accept:**
  - [ ] DB down → log warn + render empty state. Không silent fail.

#### C5. `OrderStatusPoller` full reload khi paid
- **File:** `components/checkout/order-status-poller.tsx:58-62`
- **Fix:** Set local state `paid: true` thay vì reload. Hoặc redirect `/order/[orderNumber]/success` (route mới).
- **Accept:**
  - [ ] Paid → không full reload. UI update mượt.

#### C6. `Countdown` không sync giữa tabs
- **File:** `components/checkout/countdown.tsx:28-31`
- **Fix:** Optional: sync qua `BroadcastChannel`. Low priority.
- **Accept:**
  - [ ] (Optional) 2 tabs cùng countdown với drift < 500ms.

#### C7. Checkout thiếu honeypot / Turnstile
- **File:** `app/api/checkout/route.ts`
- **Fix:** Phase 9+ — rate-limit hiện tại đủ cho MVP. Note để Phase 9.
- **Accept:**
  - [ ] Ghi note vào PHASE_9_PLAN (sau khi có).

#### C8. Header thiếu active route highlight
- **File:** `components/layout/header.tsx:40-51`
- **Fix:** Dùng `usePathname()` cho client component con.
- **Accept:**
  - [ ] Ở `/products` → "Sản phẩm" highlight electric.
  - [ ] Ở `/products?category=ai-code` → "AI Code" highlight.

#### C9. PDP không có salePrice strike-through
- **File:** `app/products/[slug]/page.tsx:255-257`, `components/product/product-card.tsx`
- **Fix:** Render `<span className="line-through">` + sale label `% off`.
- **Accept:**
  - [ ] Variant có salePrice → hiển thị original strikethrough + sale price + badge "-X%".

#### C10. PDP comment stale "Giỏ hàng sẽ có ở Phase 2"
- **File:** `app/products/[slug]/page.tsx:262`
- **Fix:** Xóa khi fix A1.
- **Accept:**
  - [ ] Không còn comment stale.

---

### D — P3: Polish (nice-to-have)

#### D1. PDP thiếu tab Reviews / Hỏi đáp
- **File:** `app/products/[slug]/page.tsx` (mở rộng section)
- **Fix:** Phase 9+. Note vào PHASE_9_PLAN.
- **Accept:**
  - [ ] Note added.

#### D2. PDP "Khách cũng mua" cross-sell
- **Accept:** Note Phase 9+.

#### D3. Cart "Save for later"
- **Accept:** Note Phase 9+.

#### D4. PDP Share button
- **Accept:** Note Phase 9+.

#### D5. PDP trust block "Bảo hành 30 ngày"
- **Accept:** Note Phase 9+.

#### D6. Mobile PDP gallery thumbnails horizontal scroll
- **Accept:** Note Phase 9+.

#### D7. Checkout timeline visual (Bước 1 → 2 → 3)
- **Accept:** Note Phase 9+.

#### D8. Cart icon bounce animation khi add
- **Accept:** Note Phase 9+.

#### D9. Footer "BUILD:YYYY.Q3.PHASE-1" hard-code
- **File:** `components/layout/footer.tsx:102`
- **Fix:** Dynamic từ `process.env.npm_package_version` hoặc `NEXT_PUBLIC_BUILD_ID`.
- **Accept:**
  - [ ] Footer build ID = package.json version (vd: "v0.1.0").

#### D10. PDP average rating display
- **Accept:** Note Phase 9+.

---

### E — Accessibility & i18n

#### E1. CartDrawer focus trap
- **File:** `components/cart/cart-drawer.tsx:90`
- **Fix:** Implement focus trap (Tab cycle qua drawer elements). Restore focus to opener on close.
- **Accept:**
  - [ ] Open drawer → Tab chỉ cycle qua drawer. Shift+Tab ngược. ESC đóng + restore focus to button.

#### E2. Countdown SR announce khi expired
- **File:** `components/checkout/countdown.tsx`
- **Fix:** Thêm `role="timer"` + visually hidden announce "Đơn hàng sắp hết hạn".
- **Accept:**
  - [ ] VoiceOver/NVDA đọc "Đã hết hạn" khi countdown về 0.

#### E3. PDP variant buttons `aria-pressed`
- **File:** `app/products/[slug]/page.tsx`
- **Fix:** Sau A5, thêm `aria-pressed={selected === v.id}`.
- **Accept:**
  - [ ] SR đọc "đã chọn" / "chưa chọn" đúng.

#### E4. PDP "BẠN NHẬN ĐƯỢC" list semantic
- **File:** `app/products/[slug]/page.tsx:200-231`
- **Fix:** `<dl><dt>...</dt><dd>...</dd></dl>` hoặc `<ul role="list">` + sr-only labels.
- **Accept:**
  - [ ] List landmarks đúng chuẩn.

#### E5. Form labels coupling — `id="checkout-notes"` hard-code
- **File:** `components/checkout/checkout-form.tsx:115`
- **Fix:** Dùng `useId()`.
- **Accept:**
  - [ ] Không xung đột id khi render 2 forms.

---

### F — Contract & data integrity

#### F1. `cart.itemCount` semantics mơ hồ
- **File:** `modules/cart/service.ts:104`
- **Fix:** Tách `itemCount` (tổng qty) vs `lineCount` (số dòng). Update types.ts.
- **Accept:**
  - [ ] `CartView` có cả `itemCount` (qty) + `lineCount` (rows).

#### F2. `OrderView.items[].unitPriceCents` BigInt serialization
- **Note:** Format.ts đã support `bigint | number | string`. OK không cần đổi.

#### F3. `/api/orders/[orderNumber]/status` `paymentStatus` unused
- **File:** `components/checkout/order-status-poller.tsx:40-44`
- **Fix:** Dùng để early-return.
- **Accept:**
  - [ ] Poller return ngay nếu `paymentStatus` đã terminal (paid/refunded/failed).

#### F4. Checkout `redirectUrl` không dynamic
- **File:** `modules/checkout/service.ts`
- **Fix:** Note Phase 9+ (success page route).
- **Accept:** Note added.

#### F5. `Order` không lưu `guestName`
- **File:** `prisma/schema.prisma`
- **Fix:** Tương tự A6 — bỏ field. Email fallback "Quý khách". Note Phase 9+ nếu muốn thêm.
- **Accept:** Same as A6.

#### F6. PDP `jsonLd` offers.price = VND assumption
- **File:** `app/products/[slug]/page.tsx:66`
- **Fix:** Comment explicit "minPrice is VND integer (schema uses VND without cents)".
- **Accept:**
  - [ ] Comment rõ + check future USD migration plan trong CONTEXT §7.

---

## Đợt ưu tiên (priority batches)

### Đợt 1 — Unblock purchase flow (1-2 ngày)
> Mục tiêu: User có thể add-to-cart từ PDP và checkout thành công end-to-end.

- **A1** AddToCartButton + variant selector integration
- **A5** Variant selection state
- **A6** Bỏ unused name state
- **B10** Footer link `/track-order` đúng path
- **A3** Cart null state `router.refresh()`

**Files chính:**
- `app/products/[slug]/page.tsx` (refactor variants section + AddToCartButton)
- `components/product/add-to-cart-button.tsx` (NEW)
- `components/checkout/checkout-form.tsx` (bỏ name)
- `components/layout/footer.tsx` (B10)
- `app/cart/page.tsx` (A3)

**Verify:**
```bash
npm run typecheck && npm run lint && npm run test
```

### Đợt 2 — Data consistency (1-2 ngày)
> Mục tiêu: 1 source of truth cho cart state.

- **A2** CartProvider + bỏ custom event
- **C3** CartDrawer mutations qua Provider
- **B2** Header auth-aware (avatar dropdown)
- **F1** Tách `itemCount` vs `lineCount`

**Files chính:**
- `lib/cart-context.tsx` (NEW — Provider + reducer + hooks)
- `app/layout.tsx` (wrap Provider)
- `components/cart/{cart-button,cart-drawer,cart-page-client}.tsx` (refactor useCart)
- `components/layout/header.tsx` (auth-aware)
- `lib/auth.ts` (pass currentUser từ server layout)
- `modules/cart/service.ts` (F1)
- `modules/cart/types.ts` (F1)

### Đợt 3 — UX polish (1 ngày)
> Mục tiêu: Mobile-friendly + clean code.

- **B1** Mobile menu drawer
- **B3** Filter sticky offset fix
- **B4** Empty state reset sort
- **B5** PDP gallery render `product.media`
- **B8** Order status badge tách rời
- **B9** Reveal-key inline trên order page
- **C1** `getMinProductPrice` helper
- **C2** Dùng `ORDER_STATUS_LABELS`
- **C4** `/products` catch log warn
- **C8** Header active route highlight
- **C9** PDP salePrice strike-through
- **C10** Bỏ stale comment

### Đợt 4 — Accessibility & i18n (0.5 ngày)
- **E1** Focus trap CartDrawer
- **E2** Countdown SR announce
- **E3** PDP variant `aria-pressed`
- **E4** PDP list semantic
- **E5** Form `useId()` cho labels

### Đợt 5 — Contract hardening + polish (0.5 ngày)
- **A4** Checkout DB-error redirect có context
- **C5** OrderStatusPoller không full reload
- **D9** Footer build ID dynamic
- **F3** Status poller early-return
- **F6** jsonLd comment clarify
- **D1-D8, D10** Note vào PHASE_9_PLAN (placeholder)

---

## Test strategy

### Unit tests (Vitest)
- `getMinProductPrice` (C1)
- `CartProvider` reducer (A2)
- Formatters (đã có)
- OrderStatusPoller early-return logic (F3)

### Integration tests (Vitest + DB thật)
- Add to cart flow end-to-end (A1, A5)
- Checkout success → order → reveal key (A1 + B9)
- CartProvider + 3 consumers sync (A2)
- Auth-aware header (B2)

### Manual smoke checklist
- [ ] Mobile (<768px): hamburger drawer mở/đóng, nav highlight.
- [ ] Desktop: nav highlight theo route.
- [ ] PDP: chọn variant → click MUA → toast + header badge +1.
- [ ] PDP: chưa chọn variant → MUA disabled.
- [ ] PDP: out_of_stock → label HẾT HÀNG.
- [ ] Cart drawer: add/remove → header badge sync ngay.
- [ ] Cart page: reload sau DB recover → cart hiển thị.
- [ ] Checkout: submit → order success → QR + countdown + status poll.
- [ ] Order page: delivered → reveal key inline.
- [ ] Order page: cancelled → message + tạo đơn mới button.
- [ ] Track-order page: footer link trỏ đúng.
- [ ] Tab keyboard: focus trap drawer, ESC đóng.
- [ ] Screen reader: variant aria-pressed, countdown announce.

---

## Quy tắc code (Phase 8b tuân thủ)

- TS strict; không `any`; không `@ts-ignore` (dùng `@ts-expect-error` + lý do).
- Component mới → PascalCase, file `kebab-case`.
- Validate Zod ở route boundary (KHÔNG đổi — giữ nguyên pattern).
- Logger: pino qua `lib/logger.ts`; KHÔNG log password/token/OTP/key value.
- Comments: TẠI SAO, không CÁI GÌ.
- Mỗi commit reference đợt + finding ID (vd: `phase8b-đợt1-A1: AddToCartButton`).

---

## Verify sau mỗi đợt

```bash
npm run typecheck
npm run lint
npm run test
```

CI gates đã re-enable ở `.github/workflows/deploy-prod.yml` (Phase 8a) → mọi PR phải pass 3 gate trên.

---

## Out-of-scope ghi vào Phase 9 backlog

- D1-D8, D10 (PDP polish)
- C6 (Countdown sync)
- C7 (Turnstile)
- F4 (success page route)

Khi bắt đầu Phase 9, tạo `docs/tasks/PHASE_9_POLISH.md` + `PHASE_9_PLAN.md`, copy các note này vào.
