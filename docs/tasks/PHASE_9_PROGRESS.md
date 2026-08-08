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
| **Features Complete** | 2/15 | 15 |
| **Đợt Complete** | 0/4 | 4 |
| **Commits** | 3 | ~8-12 |
| **Tests Pass** | 450/450 | 480+ |
| **Days Elapsed** | 1 | 7-10 |
| **Progress** | 13% | 100% |

**Current Status:** 🔄 In Progress — Đợt 1 (PDP Polish)

**Last Update:** 2026-08-09 04:47 AM

---

## Đợt 1: PDP Polish (3 ngày) — 40% Complete (2/5)

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

### ✅ D1: Reviews & Q&A tabs (2 ngày) — 60% Complete

**Status:** 🔄 In Progress (Q&A done, Reviews pending)  
**Commit:** `2836a93` (Q&A)  
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

**Deliverables (Reviews) — Pending:**
- [ ] Component: ReviewsTab (list reviews with pagination)
- [ ] Route: `GET /api/products/[slug]/reviews` (list reviews)
- [ ] Route: `POST /api/products/[slug]/reviews` (submit review, update avgRating)
- [ ] Service: Update `catalogService` to recompute avgRating on review submit
- [ ] Test: Review submission updates avgRating integration test

**Files Changed (16):**
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
- `app/products/[slug]/page.tsx` (integrate tabs)

**Verification:**
- ✅ Typecheck pass
- ✅ Lint pass (1 warning pre-existing)
- ✅ Tests pass (450/450)
- ✅ Migration applied successfully

---

### ⏳ D2: Cross-sell "Khách cũng mua" (1 ngày)

**Status:** ⏳ TODO  
**Estimated Start:** After D1 Reviews complete

**Planned Deliverables:**
- [ ] Service: `getCrossSellProducts(productId)` query logic
- [ ] Route: `GET /api/products/[slug]/cross-sell`
- [ ] Component: CrossSellCarousel
- [ ] Integration: PDP below tabs
- [ ] Test: Cross-sell query logic

---

### ⏳ D4: Social share buttons (0.5 ngày)

**Status:** ⏳ TODO

**Planned Deliverables:**
- [ ] Component: ShareButtons (Facebook/Twitter/Copy + navigator.share fallback)
- [ ] Integration: PDP header
- [ ] Analytics: Track share events (optional)

---

### ⏳ D5: Trust signals block (0.5 ngày)

**Status:** ⏳ TODO

**Planned Deliverables:**
- [ ] Component: TrustBlock (4 static badges)
- [ ] Integration: PDP sidebar
- [ ] Content: "Bảo hành 30 ngày", "Hỗ trợ 24/7", "Giao hàng tức thì", "Hoàn tiền 100%"

---

## Đợt 2: Checkout Hardening (2.5 ngày) — 0% Complete

**Status:** ⏳ Not Started

### Tasks:
- [ ] C7: Turnstile CAPTCHA (1 ngày)
- [ ] D7: Checkout timeline visual (1 ngày)
- [ ] C5 + F4: Success page route (0.5 ngày)
- [ ] F3: OrderStatusPoller optimization (0.5 ngày)

---

## Đợt 3: Cart & Mobile UX (2.5 ngày) — 0% Complete

**Status:** ⏳ Not Started

### Tasks:
- [ ] D3: Cart "Save for later" (1.5 ngày)
- [ ] D8: Cart icon bounce animation (0.5 ngày)
- [ ] D6: Mobile gallery thumbnails horizontal scroll (1 ngày)

---

## Đợt 4: Technical Improvements (2 ngày) — 0% Complete

**Status:** ⏳ Not Started

### Tasks:
- [ ] C6: Countdown sync across tabs (1 ngày)
- [ ] D9: Footer build ID dynamic (0.5 ngày)
- [ ] Cleanup & final polish (0.5 ngày)

---

## Git History

| Commit | Date | Scope | Summary |
|--------|------|-------|---------|
| `bcf96f3` | 2026-08-09 | D10 | feat(phase9): implement average rating display |
| `2836a93` | 2026-08-09 | D1 | feat(phase9): implement Q&A tabs on PDP (D1) |
| `73e4074` | 2026-08-09 | docs | docs: update Phase 9 plan - D1 Q&A complete |

---

## Known Issues & Blockers

**Current:** None

**Resolved:**
1. ✅ Prisma `Decimal` type mismatch — Fixed with custom Product type + repository conversion
2. ✅ Shadow database migration error — Fixed with manual migration + `prisma migrate resolve`
3. ✅ Missing Textarea component — Created new shadcn-style component
4. ✅ UserRole case mismatch (`ADMIN` vs `admin`) — Fixed to lowercase

---

## Next Steps

**Immediate (Next Session):**
1. Complete D1 Reviews tab implementation:
   - [ ] Create ReviewsTab component
   - [ ] Implement `GET /api/products/[slug]/reviews` route
   - [ ] Implement `POST /api/products/[slug]/reviews` route
   - [ ] Update avgRating on review submit
   - [ ] Add integration test

2. After D1 complete → Move to D2 (Cross-sell) or D4/D5 (quicker wins)

**Đợt 1 Target Completion:** 2026-08-11 (2 days remaining)

---

## Metrics Tracking

### Code Changes:
- **New Files Created:** 25
- **Files Modified:** 8
- **Lines Added:** ~1500
- **Lines Deleted:** ~200

### Test Coverage:
- **Before Phase 9:** 447 tests
- **Current:** 450 tests (+3)
- **Target:** 480+ tests

### Performance:
- **Build Time:** ~45s (no significant change)
- **Test Suite:** ~22s (no significant change)
- **Typecheck:** ~5s (no significant change)

---

## References

- **Spec:** `docs/tasks/PHASE_9_POLISH.md`
- **Plan:** `docs/tasks/PHASE_9_PLAN.md`
- **Context:** `CONTEXT.md` §2
- **Audit Report:** `docs/tasks/PHASE_8B_AUDIT_REPORT.md` (backlog source)
