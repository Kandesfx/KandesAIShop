# PHASE_9_POLISH — Sprint 9: Storefront Polish & UX Enhancement

> **Mục tiêu:** Polish storefront UX, thêm features nâng cao user experience, tối ưu conversion, và hardening cuối cùng trước khi launch MVP.
>
> **Thời gian:** 7-10 ngày (chia 4 đợt).
>
> **Prerequisite:**
> - Phase 8b done (47/47 findings, storefront purchase flow hoàn chỉnh, CI gates pass).
> - Phase 0-8 đã done (foundation → storefront cleanup).

---

## Scope

### In-scope Phase 9

**PDP Enhancement (Product Detail Page):**
- Reviews & ratings display với aggregate score
- Q&A section (tab-based UI)
- Cross-sell "Khách cũng mua" carousel
- Social share buttons (Facebook, Twitter, Copy link)
- Trust signals block ("Bảo hành 30 ngày", "Hỗ trợ 24/7", badges)
- Mobile gallery thumbnails horizontal scroll
- Average rating stars display

**Cart Enhancement:**
- Save for later feature (move items to wishlist)
- Cart icon bounce animation khi add item

**Checkout Enhancement:**
- Visual timeline (Bước 1 → 2 → 3 progress indicator)
- Turnstile CAPTCHA integration (anti-bot)
- Separate success page route `/order/[orderNumber]/success`

**Technical Improvements:**
- Countdown sync across browser tabs (BroadcastChannel API)
- OrderStatusPoller optimization (early-return on terminal paymentStatus)
- Footer build ID dynamic từ package.json

### Out-of-scope
- Admin panel enhancements (Phase 10)
- AI Gateway UI polish (Phase 11)
- Multi-language i18n (Phase 12+)
- Mobile app (future)

---

## Backlog từ Phase 8b (12 items)

| ID | Finding | Priority | Effort | Notes |
|---|---|---|---|---|
| D1 | PDP Reviews & Q&A tabs | High | 2d | Aggregate reviews từ DB, tab UI |
| D2 | PDP "Khách cũng mua" cross-sell | High | 1d | Query similar products |
| D10 | PDP average rating display | High | 0.5d | Star component + aggregate |
| D4 | PDP Share buttons | Medium | 0.5d | Facebook/Twitter/Copy |
| D5 | PDP trust signals block | Medium | 0.5d | Static badges |
| D6 | Mobile gallery thumbnails scroll | Medium | 1d | Horizontal scroll UI |
| D3 | Cart "Save for later" | Medium | 1.5d | Move to wishlist table |
| D8 | Cart icon bounce animation | Low | 0.5d | CSS animation |
| D7 | Checkout timeline visual | Medium | 1d | Stepper component |
| C7 | Turnstile CAPTCHA | High | 1d | Cloudflare integration |
| C5/F4 | Success page route | Medium | 0.5d | `/order/[id]/success` |
| C6 | Countdown sync tabs | Low | 1d | BroadcastChannel |

**Total effort:** ~10.5 ngày → chia 4 đợt ưu tiên.

---

## Đợt ưu tiên

### Đợt 1 — PDP Polish (High conversion impact) — 3 ngày

**Mục tiêu:** Tăng conversion rate với social proof + cross-sell.

**Tasks:**
1. **D10** Average rating display
   - Component `<StarRating value={4.5} />` reusable
   - Aggregate từ `Review` table → cache vào `Product.avgRating` (migration)
   - Display ở PDP header + ProductCard

2. **D1** Reviews & Q&A tabs
   - Tab UI component `<Tabs>` (reuse shadcn)
   - Reviews tab: list reviews + pagination, sort by helpful
   - Q&A tab: list questions + answers (admin moderated)
   - Schema: `Review` (existing), `ProductQuestion` (new table)

3. **D2** Cross-sell "Khách cũng mua"
   - Query: same category + price range ±30% + top-sold
   - Carousel component (reuse from homepage)
   - Display ở PDP bottom (after description)

4. **D4** Social share buttons
   - Share button dropdown (Facebook, Twitter, Copy link)
   - `navigator.share` API fallback for mobile
   - Track share events (analytics)

5. **D5** Trust signals block
   - Static badges: "Bảo hành 30 ngày", "Hỗ trợ 24/7", "Giao hàng tức thì", "Hoàn tiền 100%"
   - Icon + text, display ở PDP sidebar

**Deliverables:**
- [ ] Migration: `Product.avgRating` + `ProductQuestion` table
- [ ] Components: `StarRating`, `ReviewsTab`, `QATab`, `CrossSellCarousel`, `ShareButtons`, `TrustBlock`
- [ ] Routes: `GET /api/products/[slug]/reviews`, `GET /api/products/[slug]/questions`
- [ ] Tests: StarRating rendering, cross-sell query logic
- [ ] Commit: `phase9-d1: PDP polish (reviews/rating/cross-sell/share/trust)`

---

### Đợt 2 — Checkout Hardening (Anti-fraud + UX) — 2.5 ngày

**Mục tiêu:** Giảm fraud, tăng trust cho checkout flow.

**Tasks:**
1. **C7** Turnstile CAPTCHA
   - Cloudflare Turnstile widget ở checkout form
   - Verify token server-side: `POST /api/checkout` → validate turnstile before create order
   - Fallback: rate-limit hiện tại nếu Turnstile down
   - Env: `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`

2. **D7** Checkout timeline visual
   - Stepper component: 3 steps (Giỏ hàng → Thanh toán → Hoàn tất)
   - Display ở `/checkout` + `/order/[orderNumber]` header
   - Responsive: vertical trên mobile, horizontal desktop

3. **C5 + F4** Success page route
   - New route: `/order/[orderNumber]/success`
   - Redirect sau payment success thay vì reload
   - Display: order summary + QR + countdown (reuse components)
   - Breadcrumb: Home → Order → Success

4. **F3** OrderStatusPoller optimization
   - Early-return nếu `paymentStatus` đã terminal (`paid`, `refunded`, `failed`)
   - Giảm unnecessary polling requests
   - Comment explain rationale

**Deliverables:**
- [ ] Turnstile integration: client widget + server validation
- [ ] Components: `CheckoutTimeline`, success page layout
- [ ] Route: `app/order/[orderNumber]/success/page.tsx`
- [ ] Update: `modules/checkout/service.ts` redirectUrl dynamic
- [ ] Tests: Turnstile validation mock, poller early-return
- [ ] Commit: `phase9-d2: Checkout hardening (Turnstile/timeline/success-route/poller)`

---

### Đợt 3 — Cart & Mobile UX — 2.5 ngày

**Mục tiêu:** Tăng engagement với save-for-later, polish mobile UX.

**Tasks:**
1. **D3** Cart "Save for later"
   - Migration: `Wishlist` table (`userId`, `productId`, `variantId`, `createdAt`)
   - Cart UI: "Lưu lại sau" button mỗi item → move vào wishlist
   - Wishlist page: `/account/wishlist` (auth required)
   - Guest: show login prompt khi click "Lưu lại sau"

2. **D8** Cart icon bounce animation
   - CSS `@keyframes bounce` khi `cart.itemCount` tăng
   - Hook: `usePrevious(itemCount)` → trigger animation nếu tăng
   - Duration: 300ms, subtle bounce

3. **D6** Mobile gallery thumbnails horizontal scroll
   - PDP gallery: main image + thumbnails horizontal scroll (mobile)
   - Snap scroll CSS: `scroll-snap-type: x mandatory`
   - Thumbnail click → update main image
   - Desktop: vertical thumbnails (existing OK)

**Deliverables:**
- [ ] Migration: `Wishlist` table
- [ ] Routes: `POST /api/wishlist`, `GET /api/wishlist`, `DELETE /api/wishlist/[id]`
- [ ] Components: `SaveForLaterButton`, `WishlistPage`, mobile gallery scroll
- [ ] Animation: cart icon bounce CSS
- [ ] Tests: Wishlist service CRUD, animation trigger
- [ ] Commit: `phase9-d3: Cart & mobile UX (save-for-later/bounce/gallery-scroll)`

---

### Đợt 4 — Technical Improvements & Polish — 2 ngày

**Mục tiêu:** Sync countdown, dynamic footer, cleanup.

**Tasks:**
1. **C6** Countdown sync across tabs
   - `BroadcastChannel` API: channel `kandes-countdown`
   - Broadcast `{ orderNumber, expiresAt, now }` mỗi 1s
   - Listener: update local state nếu drift > 500ms
   - Fallback: nếu browser không support BroadcastChannel → local countdown (hiện tại)

2. **D9** Footer build ID dynamic
   - Import `package.json` version: `import pkg from '@/package.json'` (with `resolveJsonModule: true`)
   - Footer: `v{pkg.version} · BUILD:{year}.Q{quarter}.PHASE-9`
   - Env: `NEXT_PUBLIC_BUILD_ID` cho Docker build hash (optional)

3. **Cleanup & final polish**
   - Remove console.log statements (except `logger.*`)
   - Update CONTEXT.md §2 Phase 9 status
   - Update docs/tasks/PHASE_9_PLAN.md progress
   - Final smoke test toàn bộ storefront flow

**Deliverables:**
- [ ] BroadcastChannel sync logic in `countdown.tsx`
- [ ] Footer dynamic version display
- [ ] Code cleanup: no console.log
- [ ] Docs: CONTEXT.md + PHASE_9_PLAN.md updated
- [ ] Commit: `phase9-d4: Technical improvements (countdown-sync/footer-version/cleanup)`

---

## Schema changes

### Migration 1: Product avgRating cache

```sql
-- Add avgRating to Product for performance
ALTER TABLE "Product" ADD COLUMN "avgRating" DECIMAL(3,2) DEFAULT 0.0;
ALTER TABLE "Product" ADD COLUMN "reviewCount" INTEGER DEFAULT 0;

-- Backfill from existing reviews
UPDATE "Product" p
SET "avgRating" = (
  SELECT AVG(rating) FROM "Review" WHERE "productId" = p.id AND status = 'approved'
),
"reviewCount" = (
  SELECT COUNT(*) FROM "Review" WHERE "productId" = p.id AND status = 'approved'
);

-- Index for queries
CREATE INDEX "idx_product_avg_rating" ON "Product"("avgRating" DESC);
```

### Migration 2: ProductQuestion table

```prisma
model ProductQuestion {
  id        String   @id @default(cuid())
  productId String
  userId    String?
  guestName String?
  guestEmail String?
  question  String
  answer    String?
  answeredBy String? // admin userId
  answeredAt DateTime?
  status    String @default("pending") // pending | approved | rejected
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  user    User?   @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([productId, status])
  @@index([status, createdAt])
}
```

### Migration 3: Wishlist table

```prisma
model Wishlist {
  id        String   @id @default(cuid())
  userId    String
  productId String
  variantId String?
  createdAt DateTime @default(now())

  user    User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  product Product         @relation(fields: [productId], references: [id], onDelete: Cascade)
  variant ProductVariant? @relation(fields: [variantId], references: [id], onDelete: SetNull)

  @@unique([userId, productId, variantId])
  @@index([userId, createdAt])
}
```

---

## API routes

### New routes (10 endpoints)

| Method | Path | Description |
|---|---|---|
| GET | `/api/products/[slug]/reviews` | List reviews (pagination, sort) |
| POST | `/api/products/[slug]/reviews` | Submit review (auth required) |
| GET | `/api/products/[slug]/questions` | List Q&A |
| POST | `/api/products/[slug]/questions` | Ask question |
| GET | `/api/products/[slug]/cross-sell` | Get cross-sell products |
| POST | `/api/wishlist` | Add to wishlist |
| GET | `/api/wishlist` | List wishlist items |
| DELETE | `/api/wishlist/[id]` | Remove from wishlist |
| POST | `/api/reviews/[id]/helpful` | Mark review helpful |
| POST | `/api/admin/questions/[id]/answer` | Admin answer Q&A |

### Updated routes

| Path | Change |
|---|---|
| `/api/checkout` | Add Turnstile validation |
| `/modules/checkout/service.ts` | Dynamic `redirectUrl` → `/order/[id]/success` |

---

## Components

### New components (15 files)

```
components/
├── product/
│   ├── star-rating.tsx               # NEW: 5-star display (reusable)
│   ├── reviews-tab.tsx               # NEW: Reviews list + pagination
│   ├── qa-tab.tsx                    # NEW: Q&A list
│   ├── cross-sell-carousel.tsx       # NEW: "Khách cũng mua"
│   ├── share-buttons.tsx             # NEW: Social share dropdown
│   ├── trust-block.tsx               # NEW: Trust signals badges
│   └── product-tabs.tsx              # NEW: Tab container (Reviews/Q&A/Specs)
├── checkout/
│   ├── checkout-timeline.tsx         # NEW: 3-step progress indicator
│   └── turnstile-widget.tsx          # NEW: Cloudflare Turnstile wrapper
├── wishlist/
│   ├── wishlist-page.tsx             # NEW: /account/wishlist UI
│   └── save-for-later-button.tsx     # NEW: Cart item action
└── ui/
    ├── tabs.tsx                      # NEW: Generic tabs component (shadcn)
    ├── carousel.tsx                  # ENHANCE: Add nav dots
    └── badge.tsx                     # ENHANCE: Trust badge variant
```

---

## Test coverage

### Unit tests (Vitest)

- `StarRating` component rendering (1/2/3/4/5 stars, half-star)
- Cross-sell query logic (same category, price range)
- Wishlist service CRUD operations
- BroadcastChannel sync logic (mock API)
- Turnstile validation (mock response)

### Integration tests

- Submit review → update Product.avgRating
- Add to wishlist → remove from cart
- Checkout with Turnstile → success page redirect
- Countdown sync: open 2 tabs → drift < 500ms (manual)

### Manual smoke checklist

- [ ] PDP: Reviews tab hiển thị aggregate rating + list reviews
- [ ] PDP: Q&A tab hiển thị questions + answers
- [ ] PDP: Cross-sell carousel scroll được, click → navigate PDP mới
- [ ] PDP: Share buttons copy link + open Facebook share dialog
- [ ] PDP: Trust block hiển thị 4 badges
- [ ] Mobile PDP: Gallery thumbnails horizontal scroll, snap to center
- [ ] Cart: Click "Lưu lại sau" → item move to wishlist, toast confirm
- [ ] Cart: Add item → header icon bounce animation
- [ ] Checkout: Timeline hiển thị bước hiện tại (Bước 2: Thanh toán)
- [ ] Checkout: Turnstile widget load, submit form validate token
- [ ] Order success: Redirect `/order/[id]/success` after payment, display QR
- [ ] Countdown: Open 2 tabs → sync countdown (drift < 1s)
- [ ] Footer: Version dynamic từ package.json (`v0.1.0`)

---

## Verify cuối phase

```bash
npm run typecheck    # ✅ exit 0
npm run lint         # ✅ exit 0
npm run test         # ✅ pass (add ~30 new tests)
npm run build        # ✅ exit 0
```

Manual smoke test full storefront flow + Phase 9 features.

Update `CONTEXT.md` §2 Phase 9 = ✅ Done.

---

## Deviations từ Phase 9

Ghi vào `CONTEXT.md` §7 với số D66+ nếu có quyết định deviation.

---

## Out-of-scope → Phase 10+

- Admin panel enhancements (product bulk import, advanced reports)
- AI Gateway UI polish (usage charts, model selector)
- Multi-language i18n (vi/en toggle)
- SEO optimization (structured data, meta tags audit)
- Performance optimization (image optimization, lazy load)
- Mobile app (React Native)

---

## Success metrics

- **Conversion rate:** +15% (PDP reviews + cross-sell)
- **Cart abandonment:** -10% (save-for-later + checkout timeline)
- **Fraud rate:** -20% (Turnstile CAPTCHA)
- **Page load time:** < 3s (no regression)
- **Test coverage:** 80%+ (447 → 480 tests)

---

## Notes

- Phase 9 là polish cuối trước soft launch MVP.
- Focus vào high-impact UX improvements (conversion, trust, anti-fraud).
- Keep scope tight — KHÔNG thêm features mới ngoài backlog 12 items.
- Mọi deviation → ghi vào CONTEXT.md §7, chờ user approve.

---

**Ready to start?** Đọc `PHASE_9_PLAN.md` để track progress từng đợt.
