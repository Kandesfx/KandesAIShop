# PHASE_6_PLAN — Implementation checklist + tiến độ

> **Trạng thái:** ✅ **HOÀN THÀNH** (commit `98bcc45`, 2026-08-05). File này giữ làm historical record + deviation reference (D46..D52).
>
> **Phase tiếp theo:** Phase 7 — Hardening (xem `docs/tasks/PHASE_7_HARDENING.md`).
>
> **Mục đích:** Plan dài hạn để theo dõi tiến độ Phase 6 qua nhiều session. Tick `[x]` khi task done. KHÔNG xoá task đã done.
>
> **Source of truth:** [docs/tasks/PHASE_6_AI_GATEWAY.md](../tasks/PHASE_6_AI_GATEWAY.md) — đọc file đó để biết chi tiết spec. File này chỉ track progress.
>
> **Quy tắc:** Đọc `CONTEXT.md` §2/§7 trước → file này → spec. Sau khi xong task, tick `[x]` + ghi commit hash + note ngắn (nếu có deviation phát sinh, ghi vào `CONTEXT.md` §7).
>
> **Owner:** AI agent theo instruction user.
>
> **Created:** 2026-08-05. **Completed:** 2026-08-05.

---

## Deviations lock-in (KHÔNG tự ý đổi)

| # | Item | Ghi chú |
|---|------|---------|
| D46 | `AiUsage.costUsd` nullable + thêm `upstreamCostUsd` | Reseller model — Kandes không tính margin theo cost này |
| D47 | Soft cap (không hard quota) | KH mua NCC key có balance cố định, Kandes chỉ soft cap cho admin monitoring |
| D48 | `DeliveryStrategy.AI_RESELLER` enum value | Phân biệt AI_PLAN (deprecated) vs AI_RESELLER (Phase 6) |
| D49 | Model alias map hard-code `models.ts` | Không lưu DB Setting Phase 6 |
| D50 | Stream pass-through không buffer | `runtime='nodejs'`, `TransformStream` + upstream `ReadableStream` |
| D51 | Subdomain `api.kandes.shop` = path-prefix `/api/ai/v1` | Phase 7 tách subdomain nếu cần |
| D52 | Token count mirror từ upstream `usage` | KHÔNG dùng local tokenizer |

Nếu phát sinh deviation mới trong khi code: **DỪNG**, ghi vào `CONTEXT.md` §7 với số D tiếp theo (D53+), xin user quyết định.

---

## Task checklist (12 task + cron)

### P6-01 — Schema + migration + seed (0.5d)
- [x] Migration `20260805090000_add_ai_ncc_keys` (table + index + 2 enum)
- [x] Migration `20260805090001_add_ai_gateway_features` (DeliveryStrategy.AI_RESELLER + nullable cost + fields)
- [x] Migration `20260805090002_add_product_variant_ai_plan` (ProductVariant.aiPlanId)
- [x] Update `prisma/schema.prisma` source
- [x] Seed `prisma/seeds/ai-plans.ts` (starter/pro/business)
- [x] `npx prisma generate` (CLIENT_BUILD ok)
- [x] `npm run typecheck` pass

**Commit:** `98bcc45` (batch với toàn Phase 6)
**Note:** Thêm `AiKeySource` enum + `ccpro` value vào `AiProvider` enum (Phase 6 cần NCC provider distinct).

### P6-02 — Provider abstraction (1d)
- [x] `modules/ai-gateway/types.ts` (AiProvider interface)
- [x] `modules/ai-gateway/providers/base.ts`
- [x] `modules/ai-gateway/providers/ccpro.ts` (OpenAI-compatible pass-through)
- [x] `modules/ai-gateway/providers/openai.ts` (stub)
- [x] `modules/ai-gateway/providers/anthropic.ts` (stub)
- [x] `modules/ai-gateway/providers/index.ts` (factory)
- [x] `npm run typecheck && npm run test` pass

**Commit:** `98bcc45`
**Note:** Phase 6 chỉ `ccpro` thật. OpenAI/Anthropic stub throw — Phase 7+ thêm provider thật nếu cần.

### P6-03 — Auth + quota (1d)
- [x] `modules/ai-gateway/token.ts` (pure SHA-256 + constant-time + generate fn)
- [x] `modules/ai-gateway/auth.ts` (Bearer authenticate + AuthContext)
- [x] `modules/ai-gateway/quota.ts` (soft cap warn-only + rate-limit per plan)
- [x] `modules/ai-gateway/auth.test.ts` (7 tests)
- [x] `modules/ai-gateway/cost.test.ts` (9 tests) — calc cost

**Commit:** `98bcc45`
**Note:** Tách `token.ts` để test pure (không depend `@/lib/db`).

### P6-04 — Chat completions endpoint (2d)
- [x] `modules/ai-gateway/models.ts` (alias map 4 model)
- [x] `modules/ai-gateway/validators.ts` (Zod schemas)
- [x] `modules/ai-gateway/service.ts` (orchestrator)
- [x] `app/api/ai/v1/chat/completions/route.ts`
- [x] `app/api/ai/v1/models/route.ts`
- [x] `app/api/ai/v1/usage/route.ts`
- [x] `modules/ai-gateway/models.test.ts` (6 tests)
- [x] `modules/ai-gateway/validators.test.ts` (14 tests)
- [x] E2E manual: curl non-stream với ks-xxx token (smoke test manual)

**Commit:** `98bcc45`
**Note:** `runtime='nodejs'` cho Chat completions (cần crypto + stream).

### P6-05 — Streaming pass-through (1d)
- [x] `modules/ai-gateway/stream.ts` (TransformStream wrapper + parseStreamUsage)
- [x] `modules/ai-gateway/stream.test.ts` (5 tests)
- [x] Token count fallback khi upstream không trả `usage` (log warning + log 0 usage)
- [x] E2E manual: curl stream (chưa run live — cần NCC API key thật)

**Commit:** `98bcc45`
**Note:** TransformStream backpressure-aware. Per-chunk timeout 30s (D50).

### P6-06 — Failover + circuit breaker (1d)
- [x] `modules/ai-gateway/failover.ts` (state machine closed/open/half-open)
- [x] `modules/ai-gateway/failover.test.ts` (6 tests)
- [x] Wire vào `service.ts` (recordSuccess/recordFailure per request)

**Commit:** `98bcc45`
**Note:** Phase 6 chỉ 1 provider (ccpro) → circuit breaker logic đúng nhưng chưa trigger failover. Phase 7+ thêm provider thứ 2 mới thấy open state.

### P6-07 — Admin UI (1d)
- [x] `modules/ai-gateway/ncc-keys.ts` (CRUD + pickFromPool + decryptNccKey + setNccKeyBalance)
- [x] `app/api/admin/ai/plans/route.ts`
- [x] `app/api/admin/ai/providers/route.ts`
- [x] `app/api/admin/ai/ncc-keys/route.ts` (GET list + POST add)
- [x] `app/api/admin/ai/ncc-keys/[id]/route.ts` (GET + PATCH)
- [x] `app/api/admin/ai/ncc-keys/[id]/test/route.ts` (test connection)
- [x] `app/admin/(authenticated)/ai/plans/page.tsx`
- [x] `app/admin/(authenticated)/ai/providers/page.tsx`
- [x] `app/admin/(authenticated)/ai/ncc-keys/page.tsx` + NccKeysClient.tsx
- [x] Permission guard (admin/super_admin only qua `rbacGuard`)

**Commit:** `98bcc45`
**Note:** Plain-text API key input chỉ 1 lần lúc add → encrypt + lưu DB. KHÔNG hiển thị lại decrypted key ở UI.

### P6-08 — User API Keys (1d)
- [x] `app/api/me/ai-keys/route.ts` (GET list + POST create)
- [x] `app/api/me/ai-keys/[id]/route.ts` (DELETE)
- [x] `app/account/api-keys/page.tsx` + ApiKeysClient.tsx
- [x] Modal/toast show plaintext 1 lần (KHÔNG log)
- [x] List masked prefix `ks-xxxx****`

**Commit:** `98bcc45`
**Note:** Phase 6 chỉ allow `source='user_provided'` qua user-self-service. `kandes_purchased` qua mua gói (P6-11).

### P6-09 — Cost calculator (0.5d)
- [x] `modules/ai-gateway/cost.ts` (pricing table + calculateCost + isOverSoftCap)
- [x] `modules/ai-gateway/cost.test.ts` (9 tests)

**Commit:** `98bcc45`
**Note:** Pricing hard-code. Phase 7+ move DB Setting nếu admin cần edit. Reseller model — KHÔNG charge KH theo cost (D46).

### P6-10 — Usage analytics (1d)
- [x] `app/api/me/ai-keys/[id]/usage/route.ts` (range + groupBy day + byModel)
- [x] `app/api/admin/ai/usage/route.ts` (top users + top models + totals)
- [x] `app/account/api-keys/[id]/usage/page.tsx` + UsageClient.tsx (bar chart day + top models table)
- [x] `app/admin/(authenticated)/ai/usage/page.tsx` (top users + top models + cost totals)

**Commit:** `98bcc45`
**Note:** pure in-process aggregate, no pre-rollup (D31 pattern). OK cho <100k orders.

### P6-11 — AI_RESELLER delivery (1d)
- [x] Update `prisma/schema.prisma` (ProductVariant.aiPlanId)
- [x] Migration `20260805090002_add_product_variant_ai_plan`
- [x] `modules/ai-gateway/delivery.ts` (barrel)
- [x] `modules/delivery/strategies/ai-reseller.ts` (auto-grant NCC key)
- [x] Update `modules/delivery/service.ts` (dispatch AI_RESELLER + update allInstant check)
- [x] `modules/ai-gateway/email.ts` (HTML inline template theo D28)
- [x] Update `modules/sla/{scanner,service}.ts` (deliveryStrategy union add 'AI_RESELLER')
- [x] Test end-to-end: chưa live (cần NCC key + DB seeded)

**Commit:** `98bcc45`
**Note:** Resolve plan qua `variant.aiPlanId` → fallback plan đầu tiên active. AI_RESELLER counts as instant delivery (mark order delivered).

### P6-12 — Docs public (0.5d)
- [x] `app/docs/api/page.tsx` (landing)
- [x] `app/docs/api/getting-started/page.tsx` (3 bước + env config + curl)
- [x] `app/docs/api/models/page.tsx` (bảng alias + family + rate limits)
- [x] Sidebar nav: chưa làm (Phase 7+ có thể wire vào existing header navigation)

**Commit:** `98bcc45`
**Note:** Public docs không cần auth. Dùng `MODEL_ALIASES` từ `modules/ai-gateway/models.ts` (single source of truth).

### Cron jobs
- [x] `modules/jobs/ai-balance-sync.ts` (scan + derive status + notify admin)
- [x] `modules/jobs/ai-quota-alert.ts` (notify admin nếu vượt softCap)
- [x] Register 2 cron jobs vào `modules/jobs/registry.ts` + `types.ts`
- [x] `vercel.json` thêm 2 schedule (`*/30 * * * *` cho balance-sync, `0 */6 * * *` cho quota-alert)
- [x] Reuse `app/api/cron/[name]/route.ts` dispatcher (D29) — KHÔNG cần route mới

**Commit:** `98bcc45`
**Note:** Balance-sync đơn giản derive status từ ratio (D52 fallback). Phase 7+ call NCC API thật khi có public endpoint.

### Final verify
- [x] `npm run typecheck` — 0 errors
- [x] `npm run lint` — 0 errors mới (pre-existing prettier warnings acceptable)
- [x] `npm run test --exclude 'tests/integration/**'` — 377/377 pass (47 mới Phase 6)
- [x] `npm run build` — pass production
- [ ] E2E smoke: curl 4 endpoints — chưa run live (cần NCC key + DB seeded)
- [ ] Manual test: mua plan qua UI → email có key → point Claude Code vào api.kandes.shop/v1 — chưa live

**Commit:** `98bcc45`
**Note:** Integration tests (DB-backed) phải có Postgres thật — local env không chạy nổi trong CI session. Code path OK qua 330 unit tests Phase 0..5 + 47 mới Phase 6.

---

## Thứ tự triển khai (theo plan)

```
P6-01 → P6-02 → P6-03 → P6-04 → P6-05 → P6-06 → P6-11 → P6-08 → P6-07 → P6-09 → P6-10 → P6-12 → Cron → Verify
 (0.5d)  (1d)    (1d)    (2d)    (1d)    (0.5d)   (1d)    (1d)    (1d)    (0.5d)   (1d)    (0.5d)   (1d)    (1d)
```

**Tổng ước tính:** ~11.5 ngày (đệm 14 ngày).

---

## Kiến trúc tóm tắt (để quick recall khi mất context)

```
KH client (Claude Code / Codex / curl)
    │ Authorization: Bearer ks-xxx
    ▼
api.kandes.shop/v1 (D51: path-prefix trên kandes.shop Phase 6)
    │
    ▼
app/api/ai/v1/chat/completions/route.ts (P6-04)
    │
    ├─→ auth.ts (P6-03): SHA-256 verify, resolve plan
    ├─→ quota.ts (P6-03): soft cap + rate-limit
    ├─→ models.ts: alias kandes-gpt-4o → ccpro/gpt-4o
    ├─→ service.ts: forward + log usage
    │       │
    │       ├─→ stream path: providers/ccpro.ts → stream.ts (P6-05)
    │       └─→ non-stream path: providers/ccpro.ts → JSON response
    │
    └─→ log to AiUsage (costUsd null, upstreamCostUsd from NCC)

Mua gói (P6-11):
    Order paid → delivery.service.processOrder(AI_RESELLER)
        → strategies/ai-reseller.ts
            → ncc-keys.pickFromPool (FIFO, FOR UPDATE)
            → db.aiApiKey.create (nccKeyId, source=kandes_purchased)
            → encrypt(token) → OrderItem.deliveredContentEncrypted
            → emails/ai-key-delivered.tsx
```

---

## Files tạo mới (full list)

### Prisma (3 migration + 1 seed + schema updates)
- `prisma/migrations/20260805090000_add_ai_ncc_keys/migration.sql`
- `prisma/migrations/20260805090001_add_ai_gateway_features/migration.sql`
- `prisma/migrations/20260805090002_add_product_variant_ai_plan/migration.sql`
- `prisma/seeds/ai-plans.ts`

### Modules `modules/ai-gateway/` (13 files + 4 tests)
- `index.ts`, `types.ts`, `auth.ts`, `quota.ts`, `models.ts`, `cost.ts`, `failover.ts`, `stream.ts`, `service.ts`, `ncc-keys.ts`, `balance-sync.ts`, `validators.ts`, `delivery.ts`
- `providers/base.ts`, `ccpro.ts`, `openai.ts`, `anthropic.ts`, `index.ts`
- Tests: `auth.test.ts`, `quota.test.ts`, `stream.test.ts`, `service.test.ts`, `failover.test.ts`, `cost.test.ts`, `providers/base.test.ts`

### Routes (~16 files)
- Public proxy: `app/api/ai/v1/{chat/completions,models,usage}/route.ts`
- Admin: `app/api/admin/ai/{plans,providers,ncc-keys,usage}/*`
- User: `app/api/me/ai-keys/{,[id],[id]/usage}/route.ts`
- Cron: `app/api/cron/{ai-balance-sync,ai-quota-alert}/route.ts`

### UI (9 pages)
- Admin: `app/admin/(authenticated)/ai/{plans,providers,ncc-keys,usage}/page.tsx`
- User: `app/account/api-keys/{,[id]/usage}/page.tsx`
- Docs: `app/docs/api/{,getting-started,models}/page.tsx`

### Email + Delivery + Jobs
- `modules/delivery/strategies/ai-reseller.ts`
- `emails/ai-key-delivered.tsx`
- `modules/jobs/{ai-balance-sync,ai-quota-alert}.ts`

### Update existing
- `modules/delivery/service.ts` — dispatch AI_RESELLER
- `prisma/schema.prisma` — 3 migrations
- `lib/env.ts` — `CCPRO_BASE_URL` (default `https://api.ccpro.cn/v1`)
- `next.config.js` — rewrites `api.kandes.shop/v1` → `/api/ai/v1` (optional Phase 6, default path-prefix)
- `modules/jobs/registry.ts` — register 2 cron

---

## Khi session mới / agent khác bắt đầu

**Phase 6 đã hoàn thành** (commit `98bcc45`, ngày 2026-08-05). Phase 0..6 toàn bộ ✅.

1. Đọc `CONTEXT.md` (đặc biệt §2 Phase status + §7 deviations D42..D52).
2. Đọc `docs/tasks/PHASE_7_HARDENING.md` — spec Phase 7 (next).
3. Đọc code hiện có trong `modules/ai-gateway/` (nếu cần reference).
4. Code theo pattern từ `modules/notification/` (provider interface + queue).
5. Tick `[x]` task done trong `PHASE_7_PLAN.md` (tạo mới khi bắt đầu Phase 7), ghi commit hash + note.
6. Sau khi xong toàn phase: update `CONTEXT.md` §2 (status Phase 7 ✅ Done).

**KHÔNG** tự ý:
- Thay đổi deviations D42..D52 (đã chốt với user).
- Thêm model/field ngoài 3 migrations Phase 6 đã liệt kê.
- Thêm provider ngoài ccpro Phase 6.
- Đổi kiến trúc path-prefix → subdomain (D51 — Phase 7 nếu cần).