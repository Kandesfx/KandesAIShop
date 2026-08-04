# PHASE_6_PLAN — Implementation checklist + tiến độ

> **Mục đích:** Plan dài hạn để theo dõi tiến độ Phase 6 qua nhiều session. Tick `[x]` khi task done. KHÔNG xoá task đã done.
>
> **Source of truth:** [docs/tasks/PHASE_6_AI_GATEWAY.md](../tasks/PHASE_6_AI_GATEWAY.md) — đọc file đó để biết chi tiết spec. File này chỉ track progress.
>
> **Quy tắc:** Mỗi lần bắt đầu session mới, đọc 3 file theo thứ tự: `CONTEXT.md` §7 → file này → spec. Sau khi xong task, tick `[x]` + ghi commit hash + note ngắn (nếu có deviation phát sinh, ghi vào `CONTEXT.md` §7).
>
> **Owner:** AI agent theo instruction user.
>
> **Created:** 2026-08-05.

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
- [ ] Migration `20260805090000_add_ai_ncc_keys` (table + index + 2 enum)
- [ ] Migration `20260805090001_add_ai_gateway_features` (DeliveryStrategy.AI_RESELLER + nullable cost + fields)
- [ ] Update `prisma/schema.prisma` source
- [ ] Seed `prisma/seeds/ai-plans.ts` (starter/pro/business)
- [ ] `npx prisma migrate dev` chạy clean
- [ ] `npm run typecheck` pass

**Commit:** _chưa commit_
**Note:**

### P6-02 — Provider abstraction (1d)
- [ ] `modules/ai-gateway/types.ts` (AiProvider interface)
- [ ] `modules/ai-gateway/providers/base.ts` (timeout helper)
- [ ] `modules/ai-gateway/providers/ccpro.ts` (OpenAI-compatible pass-through)
- [ ] `modules/ai-gateway/providers/openai.ts` (stub)
- [ ] `modules/ai-gateway/providers/anthropic.ts` (stub)
- [ ] `modules/ai-gateway/providers/index.ts` (factory)
- [ ] `modules/ai-gateway/providers/base.test.ts`
- [ ] `npm run typecheck && npm run test` pass

**Commit:** _chưa commit_
**Note:**

### P6-03 — Auth + quota (1d)
- [ ] `modules/ai-gateway/auth.ts` (Bearer + SHA-256 verify)
- [ ] `modules/ai-gateway/quota.ts` (soft cap + rate-limit)
- [ ] `modules/ai-gateway/auth.test.ts`
- [ ] `modules/ai-gateway/quota.test.ts`

**Commit:** _chưa commit_
**Note:**

### P6-04 — Chat completions endpoint (2d)
- [ ] `modules/ai-gateway/models.ts` (alias map 4 model)
- [ ] `modules/ai-gateway/validators.ts` (Zod schemas)
- [ ] `modules/ai-gateway/service.ts` (orchestrator)
- [ ] `app/api/ai/v1/chat/completions/route.ts`
- [ ] `app/api/ai/v1/models/route.ts`
- [ ] `app/api/ai/v1/usage/route.ts`
- [ ] `modules/ai-gateway/service.test.ts`
- [ ] E2E manual: curl non-stream với ks-xxx token

**Commit:** _chưa commit_
**Note:**

### P6-05 — Streaming pass-through (1d)
- [ ] `modules/ai-gateway/stream.ts` (TransformStream wrapper)
- [ ] `modules/ai-gateway/stream.test.ts`
- [ ] Token count fallback khi upstream không trả `usage`
- [ ] E2E manual: curl stream

**Commit:** _chưa commit_
**Note:**

### P6-06 — Failover + circuit breaker (1d)
- [ ] `modules/ai-gateway/failover.ts` (state machine)
- [ ] `modules/ai-gateway/failover.test.ts`
- [ ] Wire vào `service.ts` (skip provider khi open)

**Commit:** _chưa commit_
**Note:**

### P6-07 — Admin UI (1d)
- [ ] `modules/ai-gateway/ncc-keys.ts` (CRUD + pickFromPool + testConnection)
- [ ] `app/api/admin/ai/plans/route.ts`
- [ ] `app/api/admin/ai/providers/route.ts`
- [ ] `app/api/admin/ai/ncc-keys/route.ts`
- [ ] `app/api/admin/ai/ncc-keys/[id]/route.ts`
- [ ] `app/api/admin/ai/ncc-keys/[id]/test/route.ts`
- [ ] `app/admin/(authenticated)/ai/plans/page.tsx`
- [ ] `app/admin/(authenticated)/ai/providers/page.tsx`
- [ ] `app/admin/(authenticated)/ai/ncc-keys/page.tsx`
- [ ] Permission guard (D26 — admin/super_admin only)

**Commit:** _chưa commit_
**Note:**

### P6-08 — User API Keys (1d)
- [ ] `app/api/me/ai-keys/route.ts` (GET list, POST create)
- [ ] `app/api/me/ai-keys/[id]/route.ts` (DELETE)
- [ ] `app/account/api-keys/page.tsx`
- [ ] Modal/toast show plaintext 1 lần (KHÔNG log)
- [ ] List masked prefix `ks-a3f2****`

**Commit:** _chưa commit_
**Note:**

### P6-09 — Cost calculator (0.5d)
- [ ] `modules/ai-gateway/cost.ts` (pricing table + calc)
- [ ] `modules/ai-gateway/cost.test.ts`

**Commit:** _chưa commit_
**Note:**

### P6-10 — Usage analytics (1d)
- [ ] `app/api/me/ai-keys/[id]/usage/route.ts` (range + groupBy)
- [ ] `app/api/admin/ai/usage/route.ts`
- [ ] `app/account/api-keys/[id]/usage/page.tsx` (recharts line + top models table)
- [ ] `app/admin/(authenticated)/ai/usage/page.tsx` (top users + top models + total cost)

**Commit:** _chưa commit_
**Note:**

### P6-11 — AI_RESELLER delivery (1d)
- [ ] Update `prisma/schema.prisma` (ProductVariant.aiPlanId)
- [ ] Migration `20260805090002_add_product_variant_ai_plan`
- [ ] `modules/ai-gateway/delivery.ts` (helper bind key)
- [ ] `modules/delivery/strategies/ai-reseller.ts`
- [ ] Update `modules/delivery/service.ts` (dispatch AI_RESELLER)
- [ ] `emails/ai-key-delivered.tsx` (template HTML inline theo D28)
- [ ] Test end-to-end: mua plan → delivered → email

**Commit:** _chưa commit_
**Note:**

### P6-12 — Docs public (0.5d)
- [ ] `app/docs/api/page.tsx` (landing)
- [ ] `app/docs/api/getting-started/page.tsx` (3 bước + env config + curl)
- [ ] `app/docs/api/models/page.tsx` (bảng alias + giới hạn)
- [ ] Sidebar nav (mobile Sheet + desktop NavigationMenu)

**Commit:** _chưa commit_
**Note:**

### Cron jobs
- [ ] `app/api/cron/ai-balance-sync/route.ts` (verify Bearer CRON_SECRET theo D29)
- [ ] `modules/jobs/ai-balance-sync.ts` (scan + update status + notify admin nếu low_balance)
- [ ] `app/api/cron/ai-quota-alert/route.ts`
- [ ] `modules/jobs/ai-quota-alert.ts` (notify admin nếu vượt softCap)
- [ ] Register 2 cron jobs vào `modules/jobs/registry.ts`
- [ ] `vercel.json` (hoặc `vercel-cron.json`) thêm 2 schedule

**Commit:** _chưa commit_
**Note:**

### Final verify
- [ ] `npm run typecheck` — 0 errors
- [ ] `npm run lint` — 0 errors
- [ ] `npm run test` — tất cả pass (bao gồm ≥ 30 test mới Phase 6)
- [ ] `npm run build` — pass production
- [ ] E2E smoke: curl 4 endpoints (xem PHASE_6_AI_GATEWAY.md cuối file)
- [ ] Manual test: mua plan qua UI → email có key → point Claude Code vào api.kandes.shop/v1

**Commit:** _chưa commit_
**Note:**

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

1. Đọc `CONTEXT.md` (đặc biệt §7 deviations D46..D52).
2. Đọc file này — checklist tiến độ + kiến trúc tóm tắt.
3. Đọc `docs/tasks/PHASE_6_AI_GATEWAY.md` — spec đầy đủ task CHƯA tick `[x]`.
4. Đọc code hiện có trong `modules/ai-gateway/` (nếu có).
5. Code theo pattern từ `modules/notification/` (provider interface + queue).
6. Tick `[x]` task done trong file này, ghi commit hash + note.
7. Sau khi xong toàn phase: update `CONTEXT.md` §2 (status Phase 6 ✅ Done).

**KHÔNG** tự ý:
- Thay đổi deviations D46..D52 (đã chốt với user).
- Thêm model/field ngoài 3 migrations đã liệt kê.
- Thêm provider ngoài ccpro Phase 6.
- Đổi kiến trúc path-prefix → subdomain (D51 — Phase 7).