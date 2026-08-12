# PHASE_6_AI_GATEWAY — Sprint 6: AI Provider Gateway (Reseller Mode)

> **Mục tiêu:** Kandes.shop hoạt động như **pass-through proxy** cho CC Pro backend. KH mua key trên Kandes → được cấp 1 key NCC từ pool `api.ccpro.cn` → KH point Claude Code / Codex vào `api.kandes.shop/v1` → Kandes forward request/stream nguyên vẹn tới NCC, log usage, KH xem usage dashboard.
>
> **Thời gian:** 11-14 ngày
>
> **Prerequisite:** Phase 5 hoàn thành (✅).
>
> **Quan trọng:** File này được viết lại (2026-08-05) từ bản gốc. Bản gốc thiết kế model "Kandes bán credits" (AiPlan quota + AiUsage costUsd). User chốt model mới: **reseller NCC key pool**. Xem deviations D46–D52 trong `CONTEXT.md` §7.

---

## Kiến trúc tổng quan

```
┌────────────┐      ┌─────────────────────────────┐      ┌────────────────┐
│  KH client │ ───> │  api.kandes.shop/v1 (proxy) │ ───> │ api.ccpro.cn   │
│  (Claude   │      │  + auth + log + soft cap    │      │ (NCC upstream) │
│   Code,    │ <─── │  + stream pass-through      │ <─── │ OpenAI-compat  │
│   Codex)   │      └─────────────────────────────┘      └────────────────┘
└────────────┘                       │
                                     v
                          ┌──────────────────────┐
                          │  Postgres            │
                          │  - AiPlan (catalog)  │
                          │  - AiNccKey (POOL)   │  ← admin add NCC keys
                          │  - AiApiKey (bound)  │  ← KH key, link NCC
                          │  - AiUsage (log)     │
                          └──────────────────────┘
```

### Key differences vs spec gốc
- KH **KHÔNG mua "credits Kandes"** — KH mua **key NCC** có balance cố định.
- Kandes **KHÔNG trả cost** cho provider — cost KH trả trực tiếp NCC.
- Kandes chỉ **proxy + auth + log + soft cap** (admin config per-plan).
- Stream **pass-through**, KHÔNG buffer body.
- Subdomain `api.kandes.shop` Phase 6 dùng path-prefix `/api/ai/v1` trên cùng Next.js app (D51). Phase 7 tách subdomain nếu cần.

---

## TASK P6-01: Database schema cho AI Gateway (P0, 0.5d)

**Mô tả:** Tạo 2 migration — pool NCC keys + các field bổ sung cho AiApiKey/AiUsage. Seed 3 plans.

**Acceptance:**
- [ ] Migration 1: `20260805090000_add_ai_ncc_keys` — tạo table `ai_ncc_keys`.
- [ ] Migration 2: `20260805090001_add_ai_gateway_features` — thêm `DeliveryStrategy.AI_RESELLER`, nullable cost, upstreamCostUsd, balance check fields.
- [ ] Seed 3 plan mặc định (starter / pro / business).
- [ ] Schema Prisma regenerate, `prisma migrate dev` chạy clean.

**Schema detail (`ai_ncc_keys`):**
```
id                  uuid PK
provider            enum (ccpro/openai/anthropic/...)  -- Phase 6 chỉ dùng ccpro
apiKeyEncrypted     bytes                              -- AES-256-GCM (lib/encryption.ts)
totalQuotaUsd       decimal(12,2)                      -- balance NCC lúc mua
remainingUsd        decimal(12,2)                      -- balance hiện tại
nickname            string?                            -- admin label
status              enum (active/low_balance/exhausted/disabled)
lastSyncedAt        datetime?
createdAt           datetime default now()
updatedAt           datetime @updatedAt
@@index [status, remainingUsd desc]                    -- FIFO pick nhanh
@@map ai_ncc_keys
```

**Enums mới:**
- `AiNccKeyStatus`: `active | low_balance | exhausted | disabled`
- `AiKeySource`: `kandes_purchased | user_provided`

**Field bổ sung `AiApiKey`:**
- `nccKeyId` String? (FK → AiNccKey.id, indexed) — set khi bind với NCC key từ pool.
- `source` AiKeySource default `kandes_purchased`.
- `lastBalanceCheckAt` DateTime?
- `lastBalanceUsd` Decimal(12,2)?

**Field bổ sung `AiUsage`:**
- `costUsd` → nullable (mặc định NULL — reseller model Kandes không trả cost trực tiếp).
- `upstreamCostUsd` Decimal(12,6)? — mirror usage KH trả cho NCC.

**`DeliveryStrategy` enum thêm:**
- `AI_RESELLER` (giá trị mới). Phân biệt với `AI_PLAN` (cũ — deprecated, không dùng Phase 6).

**Files tạo:**
- `prisma/migrations/20260805090000_add_ai_ncc_keys/migration.sql`
- `prisma/migrations/20260805090001_add_ai_gateway_features/migration.sql`
- `prisma/seeds/ai-plans.ts`
- Update `prisma/schema.prisma`

**Seeds:**
| Slug | Price (cents) | Duration (days) | Quota tokens | Rate/min |
|------|--------------:|----------------:|-------------:|---------:|
| starter | 99000 | 30 | 100000 | 60 |
| pro | 499000 | 30 | 1000000 | 300 |
| business | 2499000 | 90 | 10000000 | 1000 |

**Verify:**
```bash
npx prisma migrate dev
npx prisma db seed --skip-seed
npm run typecheck
```

---

## TASK P6-02: AI Provider abstraction (P0, 1d)

**Mô tả:** Define `AiProvider` interface. Implement CC Pro provider (OpenAI-compatible pass-through). Stub cho openai/anthropic.

**Acceptance:**
- [ ] `AiProvider` interface đầy đủ.
- [ ] CC Pro provider forward request/stream tới NCC.
- [ ] OpenAI/Anthropic provider stub (throw `NotImplementedError`).
- [ ] Factory `providers/index.ts` map tên → instance.
- [ ] Vitest cho base provider (mock fetch).

**Files tạo:**
- `modules/ai-gateway/types.ts`
- `modules/ai-gateway/providers/base.ts`
- `modules/ai-gateway/providers/ccpro.ts`
- `modules/ai-gateway/providers/openai.ts`
- `modules/ai-gateway/providers/anthropic.ts`
- `modules/ai-gateway/providers/index.ts`
- `modules/ai-gateway/providers/base.test.ts`

**Interface:**
```ts
export interface AiProvider {
  name: AiProviderEnum
  forward(req: ForwardRequest): Promise<ForwardResponse>
  forwardStream(req: ForwardRequest): Promise<ReadableStream<Uint8Array>>
  testConnection(): Promise<{ ok: boolean; latencyMs: number }>
}
```

**CC Pro detail:**
- Base URL default: `https://api.ccpro.cn/v1` (override qua env `CCPRO_BASE_URL`).
- Endpoint: `POST {baseUrl}/chat/completions`.
- Headers: `Authorization: Bearer {apiKey}`, `Content-Type: application/json`.
- Timeout 60s non-stream, không timeout stream (AbortSignal riêng per chunk).
- `forwardStream` return upstream `ReadableStream` nguyên vẹn (transform stream ở `stream.ts`).

---

## TASK P6-03: API Key Authentication (P0, 1d)

**Mô tả:** Bearer auth + soft cap rate-limit (D47).

**Acceptance:**
- [ ] Verify `Authorization: Bearer ks-xxx`.
- [ ] Lookup key by prefix → SHA-256 hash check.
- [ ] Resolve user + plan.
- [ ] Rate-limit theo `plan.rateLimitPerMinute` qua `lib/rate-limit.ts` (Upstash-ready).
- [ ] Soft cap check (admin config, KHÔNG reject vượt — chỉ log warn + enqueue admin alert).

**Files tạo:**
- `modules/ai-gateway/auth.ts`
- `modules/ai-gateway/quota.ts`
- `modules/ai-gateway/auth.test.ts`
- `modules/ai-gateway/quota.test.ts`

**Key format:**
- `ks-` + 16 chars base62 random (`crypto.randomBytes(12).toString('base62')`).
- Total length ~19 chars. Hash SHA-256 → `keyHash`. Prefix unique indexed.

**`auth.ts` flow:**
1. Parse header `Authorization: Bearer <token>`.
2. Validate format: bắt đầu `ks-`, length ≥ 16.
3. Extract prefix 16 chars.
4. Lookup `AiApiKey` by `keyPrefix` (unique).
5. SHA-256(fullToken) === `keyHash` → fail 401.
6. `status='active'` + `expiresAt > now` → fail 403 nếu hết hạn.
7. Resolve user + plan (include).
8. Update `lastUsedAt` async (fire-and-forget qua `setImmediate`).
9. Return `AuthContext { apiKey, user, plan }`.

**`quota.ts` flow:**
1. `rateLimitOrThrow(key='ai:' + apiKeyId, limit=plan.rateLimitPerMinute, windowMs=60_000)`.
2. Nếu `plan.softCapTokens != null` && `apiKey.quotaUsedTokens > softCapTokens` → log warn + enqueue `admin.ai.quotaExceeded` notification (D36 pattern).
3. KHÔNG throw — reseller model KH đã trả tiền NCC.

---

## TASK P6-04: Chat completions endpoint (P0, 2d)

**Mô tả:** OpenAI-compatible API. Stream + non-stream.

**Acceptance:**
- [ ] Route `POST /api/ai/v1/chat/completions` (cũng serve từ `api.kandes.shop/v1` qua rewrites).
- [ ] Model alias map `kandes-gpt-4o` → `ccpro/gpt-4o` (và tương tự).
- [ ] Forward body nguyên vẹn (Zod validate top-level, KHÔNG validate inner content).
- [ ] Non-stream: parse response, log usage, return JSON.
- [ ] Stream: return SSE qua `stream.ts` (P6-05).
- [ ] Idempotency: `requestId` unique qua `crypto.randomUUID()`.

**Files tạo:**
- `app/api/ai/v1/chat/completions/route.ts`
- `app/api/ai/v1/models/route.ts`
- `app/api/ai/v1/usage/route.ts`
- `modules/ai-gateway/service.ts`
- `modules/ai-gateway/models.ts`
- `modules/ai-gateway/validators.ts`
- `modules/ai-gateway/service.test.ts`

**Route config:**
```ts
export const runtime = 'nodejs'   // cần crypto + stream node APIs
export const dynamic = 'force-dynamic'
```

**Model alias (hard-code `models.ts`):**
| Alias public | Upstream |
|--------------|----------|
| `kandes-gpt-4o` | `ccpro/gpt-4o` |
| `kandes-claude-sonnet-4.5` | `ccpro/claude-sonnet-4.5` |
| `kandes-gemini-2.0-flash` | `ccpro/gemini-2.0-flash` |
| `kandes-deepseek-v3` | `ccpro/deepseek-v3` |

KHÔNG lộ upstream thật — KH chỉ thấy `kandes-*` (D49).

**Response shape (`/models`):**
```json
{
  "object": "list",
  "data": [
    { "id": "kandes-gpt-4o", "object": "model", "owned_by": "kandes" },
    ...
  ]
}
```

**Response shape (`/usage`):**
```json
{ "ok": true, "data": { "items": [...], "totalTokens": 12345, "range": { "from": "...", "to": "..." } } }
```

---

## TASK P6-05: Streaming support (P0, 1d)

**Mô tả:** SSE pass-through từ NCC. Track token count qua parse `usage` trong chunk cuối.

**Acceptance:**
- [ ] Server-sent events proxy từ provider.
- [ ] Token counting mirror từ upstream `usage` (D52 — không dùng local tokenizer).
- [ ] Per-chunk timeout 30s không có data → abort.
- [ ] Backpressure-aware (TransformStream, không buffer toàn bộ body).
- [ ] Log final usage vào `AiUsage` sau khi stream complete.

**Files tạo:**
- `modules/ai-gateway/stream.ts`
- `modules/ai-gateway/stream.test.ts`

**Implementation sketch:**
```ts
export function wrapStream(
  upstream: ReadableStream<Uint8Array>,
  onUsage: (u: UsageChunk) => void
): ReadableStream<Uint8Array> {
  const decoder = new TextDecoder()
  let buffer = ''
  return new ReadableStream({
    async pull(controller) {
      const reader = upstream.getReader()
      const { value, done } = await reader.read()
      if (done) { controller.close(); onUsage(parseFinalUsage(buffer)); return }
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (line.startsWith('data: ') && line.includes('"usage"')) {
          // parse usage từ JSON chunk cuối
        }
        controller.enqueue(new TextEncoder().encode(line + '\n'))
      }
    },
    cancel(reason) { upstream.cancel(reason) },
  })
}
```

**Token count fallback:** Nếu upstream không trả `usage` (một số model không trả khi stream) → estimate bằng `gpt-tokenizer` (chỉ cho display, log warning).

---

## TASK P6-06: Fallback & Circuit breaker (P1, 1d)

**Mô tả:** Circuit breaker per-provider. Failover stub (chỉ 1 provider Phase 6).

**Acceptance:**
- [ ] In-memory state `closed/open/half-open` per provider.
- [ ] 5 failures trong 60s → open (skip 60s).
- [ ] Sau 60s → half-open (thử 1 request).
- [ ] Thành công → closed, fail → open lại.
- [ ] Vitest cover state transitions.

**Files tạo:**
- `modules/ai-gateway/failover.ts`
- `modules/ai-gateway/failover.test.ts`

**Phase 6 limitation:** Chỉ 1 provider (`ccpro`), không có target để failover. Circuit breaker log + metric, không block request khi open (sẽ fail anyway — alert admin). Phase 7+ thêm provider thứ 2 sẽ có target thật.

---

## TASK P6-07: Admin — AI Plans & Providers & NCC Keys (P0, 1d)

**Mô tả:** CRUD UI cho 3 entity.

**Acceptance:**
- [ ] List/edit `AiPlan` (price, duration, quota, rate limit, soft cap).
- [ ] List/edit `AiProviderConfig` (baseUrl, monthly budget, test connection).
- [ ] List `AiNccKey` (balance, status, last sync) + CRUD nickname/status + **add new key** form (paste plaintext → encrypt) + **test connection** button.
- [ ] Permission `admin`/`super_admin` (D26).

**Files tạo:**
- `app/admin/(authenticated)/ai/plans/page.tsx`
- `app/admin/(authenticated)/ai/providers/page.tsx`
- `app/admin/(authenticated)/ai/ncc-keys/page.tsx`
- `app/api/admin/ai/plans/route.ts`
- `app/api/admin/ai/providers/route.ts`
- `app/api/admin/ai/ncc-keys/route.ts`
- `app/api/admin/ai/ncc-keys/[id]/route.ts`
- `app/api/admin/ai/ncc-keys/[id]/test/route.ts`
- `modules/ai-gateway/ncc-keys.ts`

**`ncc-keys.ts` exports:**
- `addNccKey(input: { provider, plaintext, totalQuotaUsd, nickname? })` — encrypt + insert.
- `listNccKeys(filter)` — pagination + filter status.
- `pickFromPool(provider)` — FIFO highest balance, transaction `FOR UPDATE` (D23 pattern).
- `updateBalance(id, remainingUsd)` — set status theo ngưỡng (active/low_balance/exhausted).
- `testConnection(id)` — gọi NCC balance endpoint nếu có, fail gracefully.

---

## TASK P6-08: User — API Keys Management (P0, 1d)

**Mô tả:** User tạo/list/xoá API key. Plaintext chỉ hiển thị 1 lần lúc tạo.

**Acceptance:**
- [ ] Tạo key → hiển thị 1 lần trong toast + modal.
- [ ] List keys (masked prefix `ks-a3f2****`).
- [ ] Xoá key (soft delete hoặc hard — chọn hard để free prefix).
- [ ] Usage summary per key (link tới `/account/api-keys/[id]/usage`).

**Files tạo:**
- `app/account/api-keys/page.tsx`
- `app/api/me/ai-keys/route.ts`
- `app/api/me/ai-keys/[id]/route.ts`

**Generate:**
```ts
const token = 'ks-' + base62(crypto.randomBytes(12))  // 16 chars
const keyPrefix = token.slice(0, 12)                   // 'ks-' + 9 chars
const keyHash = sha256(token)
```

---

## TASK P6-09: Cost calculator (P0, 0.5d)

**Mô tả:** Pricing table + cost calc helper.

**Acceptance:**
- [ ] Pricing table cho 4 models (USD per 1K tokens).
- [ ] `calculateCost(model, promptTokens, completionTokens)` → Decimal.
- [ ] `isOverSoftCap(model, totalTokens, softCap)` helper.

**Files tạo:**
- `modules/ai-gateway/cost.ts`
- `modules/ai-gateway/cost.test.ts`

**Pricing (USD per 1K tokens, hard-code):**
| Model | Input | Output |
|-------|------:|-------:|
| `gpt-4o` | 0.0025 | 0.01 |
| `claude-sonnet-4.5` | 0.003 | 0.015 |
| `gemini-2.0-flash` | 0.000075 | 0.0003 |
| `deepseek-v3` | 0.00027 | 0.0011 |

**Lưu ý:** Admin KHÔNG dùng cost này để charge KH — chỉ để monitoring margin + soft cap pricing.

---

## TASK P6-10: AI Usage analytics (P0, 1d)

**Mô tả:** Dashboard cho user + admin.

**Acceptance:**
- [ ] User xem chart usage theo model/ngày (recharts line).
- [ ] User xem top models table.
- [ ] Admin xem top users, top models, total cost estimate.
- [ ] Date range filter (7d/30d/90d/custom).

**Files tạo:**
- `app/account/api-keys/[id]/usage/page.tsx`
- `app/admin/(authenticated)/ai/usage/page.tsx`
- `app/api/me/ai-keys/[id]/usage/route.ts`
- `app/api/admin/ai/usage/route.ts`

**Aggregate query (server):**
```ts
db.aiUsage.groupBy({
  by: ['model'],
  where: { apiKeyId, createdAt: { gte: from, lte: to } },
  _sum: { totalTokens: true, upstreamCostUsd: true },
})
```

---

## TASK P6-11: Mua gói AI qua shop (P0, 1d)

**Mô tả:** Product `deliveryStrategy=AI_RESELLER` → order delivered → tự tạo `AiApiKey` + email.

**Acceptance:**
- [ ] Product variant link `AiPlan` (qua field mới `ProductVariant.aiPlanId` nullable).
- [ ] Delivery strategy `AI_RESELLER`: `pickFromPool` → tạo `AiApiKey` (user, plan, nccKeyId, source=kandes_purchased) → lưu `OrderItem.deliveredContentEncrypted` → gửi email.
- [ ] Email chứa API key (1 lần) + baseUrl + code examples.
- [ ] Nếu pool exhausted → throw ConflictError → admin notification.

**Files tạo:**
- `modules/delivery/strategies/ai-reseller.ts`
- `modules/ai-gateway/delivery.ts` (helper)
- `emails/ai-key-delivered.tsx`
- Update `modules/delivery/service.ts` (dispatch)
- Update `prisma/schema.prisma` (ProductVariant.aiPlanId)

**Flow:**
```
Order paid → SePay webhook (P3-01) → delivery.service.processOrder(AI_RESELLER)
  → delivery/strategies/ai-reseller.ts:
    1. ncc-keys.pickFromPool(plan) → AiNccKey
    2. Generate ks-xxx token, hash, prefix
    3. db.aiApiKey.create({ user, plan, nccKeyId, source: 'kandes_purchased', expiresAt })
    4. encrypt(token) → save to OrderItem.deliveredContentEncrypted
    5. ncc-keys.updateStatus(nccKeyId, 'in_use')  // KHÔNG exhausted nếu còn balance
    6. Email send to user with plaintext token
  → return { status: 'delivered' }
```

---

## TASK P6-12: Documentation cho user (P1, 0.5d)

**Mô tả:** Public docs page hướng dẫn dùng API key với Claude Code / Codex / curl.

**Acceptance:**
- [ ] `/docs/api` landing.
- [ ] `/docs/api/getting-started` — 3 bước + env config.
- [ ] `/docs/api/models` — bảng alias + giới hạn.
- [ ] Code example curl + Python + Node.

**Files tạo:**
- `app/docs/api/page.tsx`
- `app/docs/api/getting-started/page.tsx`
- `app/docs/api/models/page.tsx`

**Code example chính:**
```bash
# Claude Code
export ANTHROPIC_BASE_URL=https://api.kandes.shop/v1
export ANTHROPIC_AUTH_TOKEN=ks-xxxxxxxx

# Codex / OpenAI client
export OPENAI_BASE_URL=https://api.kandes.shop/v1
export OPENAI_API_KEY=ks-xxxxxxxx

# curl
curl -X POST https://api.kandes.shop/v1/chat/completions \
  -H "Authorization: Bearer ks-xxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{"model":"kandes-gpt-4o","messages":[{"role":"user","content":"hi"}]}'
```

---

## Cron jobs (Phase 6 bổ sung)

### `ai-balance-sync` (mỗi 30 phút) — qua `app/api/cron/[name]/route.ts` (D29 pattern)
- Handler: `modules/jobs/ai-balance-sync.ts`.
- Mỗi `AiNccKey` `status='active'` → gọi NCC balance API (nếu có endpoint) hoặc parse từ upstream response.
- Update `remainingUsd`, set `status`:
  - `remainingUsd > 10% total` → `active`.
  - `0 < remainingUsd ≤ 10%` → `low_balance` (notify admin telegram theo D36 template `admin.ai.ncc.lowBalance`).
  - `remainingUsd == 0` → `exhausted`.
- Pattern giống `modules/sla/scanner.ts` (D32).

### `ai-quota-alert` (mỗi 6 giờ)
- Handler: `modules/jobs/ai-quota-alert.ts`.
- Quét `AiApiKey` có `quotaUsedTokens > softCap` → enqueue notification telegram admin (event `admin.ai.quotaExceeded` theo D36).

**Files tạo:**
- `app/api/cron/ai-balance-sync/route.ts`
- `app/api/cron/ai-quota-alert/route.ts`
- `modules/jobs/ai-balance-sync.ts`
- `modules/jobs/ai-quota-alert.ts`

---

## Definition of Done (Phase 6)

- [ ] User mua AI plan → nhận API key qua email.
- [ ] Gọi `chat/completions` qua `api.kandes.shop/v1` hoạt động (cả `kandes.shop/api/ai/v1`).
- [ ] Streaming pass-through hoạt động.
- [ ] Quota tracking chính xác (mirror từ upstream `usage`).
- [ ] Admin CRUD plans/providers/NCC keys + test connection.
- [ ] User dashboard usage chart + admin top users/models.
- [ ] Cron balance sync + quota alert.
- [ ] Documentation `/docs/api` đầy đủ.
- [ ] `npm run typecheck && npm run lint && npm run test && npm run build` đều pass.
- [ ] ≥ 30 test mới (auth, stream, cost, failover, ncc-keys, delivery).
- [ ] E2E smoke: curl proxy non-stream + stream + usage query.

## Out of scope (Phase 7+)

- Embeddings (V2.1).
- Function calling.
- Vision.
- Multi-provider thật (Anthropic/OpenAI native key).
- Subdomain tách Vercel project riêng.
- Reseller multi-tenant.

---

## Anti-patterns cần tránh (Phase 6)

- ❌ Buffer toàn bộ stream body rồi mới return.
- ❌ Tự count token bằng local tokenizer thay vì mirror upstream `usage` (D52).
- ❌ Hard reject khi vượt soft cap — reseller model, KH đã trả NCC (D47).
- ❌ Lộ `api.ccpro.cn` URL hoặc upstream model name cho KH.
- ❌ Log NCC key plaintext hoặc KH `ks-` token.
- ❌ Tạo `AiApiKey` mà KHÔNG có `nccKeyId` khi `source='kandes_purchased'`.
- ❌ Cho phép `staff` edit plans/providers/ncc-keys (D26 — admin/super_admin only).
- ❌ Skip encrypt khi lưu `apiKeyEncrypted` vào `ai_ncc_keys`.

---

## Khi bắt đầu session mới (Phase 6)

Đọc theo thứ tự:
1. `CONTEXT.md` §7 (deviations D46..D52) — quan trọng nhất, KHÔNG tự ý đổi.
2. File này (`PHASE_6_AI_GATEWAY.md`) — spec đầy đủ.
3. `docs/tasks/PHASE_6_PLAN.md` — checklist 12 task + tiến độ.
4. Existing modules `modules/notification/` (pattern provider + queue).
5. `lib/encryption.ts` + `lib/rate-limit.ts` + `lib/env.ts` — utility đã có.

---\n\n## D77 Update (2026-08-12): Model alias fix + dynamic NCC model fetch\n\n### Problem\nAlias kandes-claude map sang claude-sonnet-4.6 (DOT) nhung NCC upstream that la claude-sonnet-4-6 (HYPHEN) -> moi request tu kandes-claude fail 404.\n\n### Fix\n1. **modules/ai-gateway/models.ts**: Update upstream names dung format hyphen cho tat ca Claude models:\n   - claude-sonnet-4.6 -> claude-sonnet-4-6\n   - claude-opus-5 -> claude-opus-4-6 (model that su dung nhieu nhat)\n   - claude-haiku-4-5-20251001 -> claude-haiku-4-5\n2. **CcProProvider.listModels(apiKey)**: New method fetch live model list tu NCC /v1/models. Cache 5 phut trong memory.\n3. **listModelsFromCcPro(apiKey)**: Standalone exported function de dung o ngoai provider class.\n4. **pp/api/ai/v1/models/route.ts**: Smart routing:\n   - Bearer sk-jy-cc-* hoac sk-jy-cx-* -> fetch live models tu NCC Pro (return owned_by: 'ccpro')\n   - Bearer ks-* (Kandes alias) -> return hardcoded alias map nhu cu\n5. **pp/api/me/ai-keys/[id]/balance/route.ts**: Them fields:\n   - vailableModels[]: Fetch tu NCC live\n   - modelStats[]: From NCC /v1/usage\n   - 
ccRemaining, 
ccExpiresAt, 
ccDaysUntilExpiry, 
ccMode: Real-time usage\n\n### Files changed\n- modules/ai-gateway/models.ts\n- modules/ai-gateway/providers/ccpro.ts (them NccModel, listModels(), listModelsFromCcPro())\n- modules/ai-gateway/providers/index.ts (export)\n- pp/api/ai/v1/models/route.ts (dynamic fetch)\n- pp/api/me/ai-keys/[id]/balance/route.ts (them fields)\n- pp/account/api-keys/[id]/balance/{page,BalanceClient}.tsx (UI moi)\n- pp/account/api-keys/ApiKeysClient.tsx (them button Balance)\n- pp/docs/api/models/page.tsx (them cot Upstream + note)\n- CONTEXT.md (D77)\n\n### Verification\n- GET /api/ai/v1/chat/completions voi kandes-claude -> 200 (model claude-sonnet-4-6)\n- GET /api/ai/v1/models voi sk-jy-cc-* -> 19 models (Sonnet/Opus/Haiku/Fable)\n- GET /api/me/ai-keys/[id]/balance -> co vailableModels[] + modelStats[]\n- Build pass, deploy success.\n
