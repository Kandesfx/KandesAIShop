# Kandes AI API Reference

> **Public API docs** — `https://kandes.shop/api/ai/v1/...`
>
> OpenAI-compatible pass-through proxy cho CC Pro (NCC). KH có thể dùng bất kỳ OpenAI SDK nào (Claude Code, Codex, OpenAI client) point về `kandes.shop/api/ai/v1`.

---

## Authentication

| Method | Token | Use case |
|--------|-------|----------|
| Bearer `ks-*` | Kandes API key (mua trên Kandes) | Dùng alias `kandes-*` |
| Bearer `sk-jy-cc-*` hoặc `sk-jy-cx-*` | NCC Pro raw key | Pass-through raw upstream model names |

Header: `Authorization: Bearer <key>`

---

## Endpoints

### `GET /api/ai/v1/models`

List models available cho key hiện tại.

**Logic:**
- Nếu Bearer match `sk-jy-(cx|cc)-*` → fetch live từ NCC Pro `/v1/models`
- Nếu Bearer match `ks-*` → trả hardcoded `kandes-*` aliases

**Response (passthrough NCC key):**
```json
{
  "object": "list",
  "data": [
    { "id": "claude-sonnet-4-6", "object": "model", "owned_by": "ccpro", "display_name": "claude-sonnet-4-6" },
    { "id": "claude-opus-4-8", "object": "model", "owned_by": "ccpro", "display_name": "claude-opus-4-8" },
    { "id": "claude-haiku-4-5", "object": "model", "owned_by": "ccpro", "display_name": "claude-haiku-4-5" },
    ...
  ]
}
```

**Response (Kandes key):**
```json
{
  "object": "list",
  "data": [
    { "id": "kandes-codex", "object": "model", "owned_by": "kandes" },
    { "id": "kandes-claude", "object": "model", "owned_by": "kandes" },
    ...
  ]
}
```

---

### `POST /api/ai/v1/chat/completions`

OpenAI-compatible chat completion endpoint. Hỗ trợ non-stream + SSE stream.

**Request body (giống OpenAI):**
```json
{
  "model": "kandes-claude",
  "messages": [{ "role": "user", "content": "Hello!" }],
  "stream": false
}
```

**Response:** giống OpenAI response shape.

**Alias map (Kandes key):**
| Alias | Upstream |
|-------|----------|
| `kandes-codex` | `gpt-5.4` |
| `kandes-codex-fast` | `gpt-5.4-mini` |
| `kandes-codex-review` | `codex-auto-review` |
| `kandes-gpt-pro` | `gpt-5.5` |
| `kandes-claude` | `claude-sonnet-4-6` |
| `kandes-claude-pro` | `claude-sonnet-5` |
| `kandes-claude-opus` | `claude-opus-4-6` |
| `kandes-claude-haiku` | `claude-haiku-4-5` |

> Pass-through: KH có thể gửi raw upstream model name (vd `claude-opus-4-8`) — Kandes sẽ forward nguyên vẹn.

**Tool trực tuyến:** Xem [`/tools/model-checker`](/tools/model-checker) để fetch và test models trực tiếp trên trình duyệt.

---

### `POST /api/ai/v1/responses`

OpenAI Responses API endpoint (Codex CLI wire_api='responses'). Pass-through verbatim.

---

## User endpoints (`/api/me/ai-keys/*`)

### `GET /api/me/ai-keys/[id]/balance`

Real-time NCC balance + available models + usage stats.

**Auth:** Chỉ chủ sở hữu `apiKey.userId === ctx.user.id`. Rate-limit 60/min/user.

**Response (2026-08-12, D77):**
```json
{
  "apiKeyId": "cks_...",
  "apiKeyName": "Claude Code laptop",
  "status": "active",
  "rotationPolicy": "auto",
  "quotaUsedTokens": "12345",
  "quotaTokens": "500000",
  "softCapTokens": null,
  "isOverSoftCap": false,
  "nccNickname": "Pool Claude #3",
  "nccStatus": "active",
  "nccRemainingUsd": 12.34,
  "nccTotalQuotaUsd": 50,
  "nccLastSyncedAt": "2026-08-12T11:00:00Z",
  "nccRemaining": 12.30,
  "nccExpiresAt": "2026-09-15T00:00:00Z",
  "nccDaysUntilExpiry": 33,
  "nccMode": "quota_limited",
  "availableModels": [
    { "id": "claude-sonnet-4-6", "display_name": "claude-sonnet-4-6" },
    { "id": "claude-opus-4-6", "display_name": "claude-opus-4-6" },
    ...
  ],
  "modelStats": [
    {
      "model": "claude-sonnet-4-6",
      "requests": 142,
      "input_tokens": 52800,
      "output_tokens": 12300,
      "cost_usd": 0.42
    }
  ],
  "pinnedNccKeyId": null,
  "pinnedNccNickname": null,
  "pinnedNccRemainingUsd": null,
  "expiresAt": "2027-08-12T...",
  "lastUsedAt": "2026-08-12T...",
  "lastBalanceCheckAt": "2026-08-12T..."
}
```

**Field semantics:**
- `nccRemainingUsd` / `nccTotalQuotaUsd`: từ DB (sync cron 30p, D57)
- `nccRemaining` / `nccExpiresAt` / `nccDaysUntilExpiry` / `nccMode`: từ NCC `/v1/usage` real-time
- `availableModels`: từ NCC `/v1/models` real-time (cache 5 phút trên server)
- `modelStats`: per-model usage stats từ NCC `/v1/usage`

---

### `GET /api/me/ai-keys/[id]/usage`

User's own usage stats (theo `AiUsage` table, không phải NCC).

---

### `PATCH /api/me/ai-keys/[id]/rotation`

Đổi rotation policy: `auto` | `pinned` + `pinnedNccKeyId`.

---

### `POST /api/me/ai-keys`

Tạo Kandes API key mới.

---

### `DELETE /api/me/ai-keys/[id]`

Xoá Kandes API key.

---

## Admin endpoints (`/api/admin/ai/*`)

Xem `docs/tasks/PHASE_6_AI_GATEWAY.md` §5 cho chi tiết admin CRUD:
- `/api/admin/ai/ncc-keys` — CRUD NCC key pool
- `/api/admin/ai/plans` — CRUD AI plans
- `/api/admin/ai/providers` — Provider config
- `/api/admin/ai/usage` — Admin usage stats

---

## Rate limits

| Plan | RPM | TPM |
|------|-----|-----|
| Starter | 60 | 60k |
| Pro | 300 | 300k |
| Business | 1000 | 1M |

Soft cap (KHÔNG hard reject, chỉ log warn + notify admin khi vượt — D47).

---

## Error codes

| Status | Meaning |
|--------|---------|
| 401 | Bearer missing/invalid |
| 403 | Kandes key revoked hoặc rotation policy fail |
| 404 | Model not supported (hoặc raw model name không tồn tại trên NCC) |
| 429 | Rate limit exceeded |
| 500 | Upstream NCC error |
| 504 | Upstream timeout (60s) |

---

## See also

- `app/docs/api/models/page.tsx` — Public docs UI
- `app/account/api-keys/[id]/balance/page.tsx` — User balance UI
- `modules/ai-gateway/models.ts` — Model alias source of truth
- `modules/ai-gateway/providers/ccpro.ts` — NCC provider impl
- `docs/tasks/PHASE_6_AI_GATEWAY.md` §D77 — Implementation notes