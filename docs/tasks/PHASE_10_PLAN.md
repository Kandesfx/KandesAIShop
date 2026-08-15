# PHASE 10 — Sprint Plan: AI Gateway UI Polish + Admin Enhancements

> **Thời gian:** 7-9 ngày (chia 3 sprints)
>
> **Mục tiêu:** Cải thiện AI Gateway UX (core product) + Admin panel efficiency
>
> **Prerequisite:**
> - Phase 9 done (504/504 tests pass)
> - Phase 6 AI Gateway hoàn chỉnh

---

## Tổng quan

Dựa trên codebase hiện tại:

### AI Gateway UI (User-facing) — Đã có:
- `app/account/api-keys/page.tsx` — Danh sách keys cơ bản
- `app/account/api-keys/[id]/balance/page.tsx` — Balance + models list
- `app/account/api-keys/[id]/usage/page.tsx` — Usage theo ngày (simple bars)

### Cần cải thiện:
- Trang danh sách keys: **không có progress bar**, chỉ text "tokens used"
- Trang balance: có progress bar nhưng **không có chart đẹp**
- Trang usage: **simple bar chart rất basic** (text bars)
- **Không có model selector UI** với mô tả
- **Không có playground** để test API

### Admin AI Panel — Đã có:
- `/admin/ai/ncc-keys` — Quản lý NCC keys
- `/admin/ai/plans` — AI plans
- `/admin/ai/providers` — Provider config
- `/admin/ai/usage` — Usage stats

### Cần cải thiện:
- Bulk import/export NCC keys
- Advanced usage charts
- Customer segmentation

---

## Sprint 1: AI Gateway UX (3 ngày)

### Mục tiêu: Trang API Keys đẹp hơn + Usage Charts

---

### Task 1.1: Upgrade API Keys List (Day 1)

**File:** `app/account/api-keys/ApiKeysClient.tsx`

**Thêm:**
1. **Progress bar** cho quota usage (thay vì text "12345 tokens")
2. **Balance card** trên mỗi key (số USD còn lại)
3. **Expiry countdown** (còn bao nhiêu ngày)
4. **Quick actions** dropdown (Copy key, View balance, Delete)

**Mockup mới:**
```
┌─────────────────────────────────────────────────────────┐
│ 💳 Claude Code Laptop                    ● Active      │
│ ████████████░░░░░░░░  45%           $12.30 / $50     │
│ Còn 33 ngày · Hết hạn: 2026-09-15                   │
│ [Balance] [Usage] [⚙️] [🗑️]                           │
└─────────────────────────────────────────────────────────┘
```

**Components cần tạo:**
- `components/account/api-key-card.tsx` — Card cho mỗi key
- `components/ui/progress.tsx` — Reusable progress bar

---

### Task 1.2: Usage Chart đẹp (Day 2)

**File:** `app/account/api-keys/[id]/usage/UsageClient.tsx`

**Thay thế simple bars bằng:**
1. **Line chart** cho usage theo ngày (dùng `recharts` hoặc native SVG)
2. **Pie chart** cho model breakdown
3. **Stats cards** tổng quan (total requests, avg tokens/day, top model)

**Mockup mới:**
```
┌─────────────────────────────────────────────────────────┐
│  📊 Usage Dashboard                      [7d] [30d] [90d] │
├─────────────────────────────────────────────────────────┤
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ │
│ │ Total Requests │ │  Avg/Day      │ │  Total Tokens │ │
│ │     1,247      │ │     142       │ │    2.4M       │ │
│ └───────────────┘ └───────────────┘ └───────────────┘ │
├─────────────────────────────────────────────────────────┤
│  Usage Over Time                                       │
│  ▲                                                    │
│  │         ╱╲                                         │
│  │    ╱───╯  ╲╱╲                                      │
│  │╱──╯          ╲───                                 │
│  └──────────────────────────────────▶                 │
│     T7  T8  T9  T10  T11  T12  T13                   │
├─────────────────────────────────────────────────────────┤
│  By Model                    │  Top Days               │
│  ┌────────────────────┐     │  T10: 890 tokens       │
│  │  ● Claude 45%      │     │  T11: 756 tokens       │
│  │  ● GPT      35%    │     │  T9:  623 tokens       │
│  │  ● Others   20%    │     │                        │
│  └────────────────────┘     │                        │
└─────────────────────────────────────────────────────────┘
```

**Components cần tạo:**
- `components/charts/line-chart.tsx` — SVG line chart (dùng native SVG, không cần thư viện)
- `components/charts/pie-chart.tsx` — SVG pie chart
- `components/charts/stats-card.tsx` — Stats card component

---

### Task 1.3: Model Selector UI (Day 3)

**File:** `app/account/api-keys/[id]/balance/page.tsx` (update)

**Thêm:**
1. **Model cards** với icon, mô tả, giá cả
2. **Badge** "Recommended", "Fast", "Powerful"
3. **Filter** theo capability (coding, reasoning, fast)

**Mockup mới:**
```
┌─────────────────────────────────────────────────────────┐
│  Models có sẵn                    🔍 Filter: [All ▼]   │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────┐ ┌─────────────────────────────┐│
│ │ 🧠 Claude Sonnet 4.6 │ │ 🚀 GPT-5.4                  ││
│ │    ⭐ Recommended     │ │    ⚡ Fast                  ││
│ │ Giá: $3/1M tokens   │ │ Giá: $2/1M tokens          ││
│ │ Tốc độ: Nhanh       │ │ Tốc độ: Rất nhanh          ││
│ │ Tốt cho: Coding      │ │ Tốt cho: Quick tasks       ││
│ │ [Copy Config]        │ │ [Copy Config]              ││
│ └─────────────────────┘ └─────────────────────────────┘│
│ ┌─────────────────────┐ ┌─────────────────────────────┐│
│ │ 💎 Claude Opus 4.8   │ │ 🎯 Claude Haiku 4.5         ││
│ │    👑 Powerful       │ │    ⚡ Fast                 ││
│ │ Giá: $15/1M tokens  │ │ Giá: $0.5/1M tokens        ││
│ └─────────────────────┘ └─────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

**Components cần tạo:**
- `components/ai/model-card.tsx` — Card cho mỗi model
- `components/ai/model-filter.tsx` — Filter dropdown
- `components/ai/model-grid.tsx` — Grid layout

---

## Sprint 2: API Playground + Admin Bulk Import (3 ngày)

### Mục tiêu: Test playground cho khách + Admin efficiency

---

### Task 2.1: API Playground (Day 1-2)

**File:** `app/account/api-keys/[id]/playground/page.tsx` (NEW)

**Tính năng:**
1. **Text input** để nhập prompt
2. **Model selector** dropdown
3. **System prompt** textarea (optional)
4. **Streaming response** display
5. **Request/Response** JSON viewer (collapsible)
6. **Copy as cURL** button

**Mockup:**
```
┌─────────────────────────────────────────────────────────┐
│  🧪 API Playground                    [Key: Claude #3 ▼]│
├─────────────────────────────────────────────────────────┤
│  Model: [Claude Sonnet 4.6 ▼]     [Stream: ON ☑]      │
│                                                         │
│  System:                                                │
│  ┌─────────────────────────────────────────────────────┐│
│  │ You are a helpful coding assistant.                 ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  Prompt:                                                │
│  ┌─────────────────────────────────────────────────────┐│
│  │ Viết function tính Fibonacci                        ││
│  │                                                     ││
│  └─────────────────────────────────────────────────────┘│
│                                          [▶️ Run Test] │
├─────────────────────────────────────────────────────────┤
│  Response (streaming...)                                │
│  ┌─────────────────────────────────────────────────────┐│
│  │ Here is a Fibonacci function in Python:             ││
│  │                                                     ││
│  │ def fibonacci(n):                                  ││
│  │     if n <= 1:                                     ││
│  │         return n                                   ││
│  │     return fibonacci(n-1) + fibonacci(n-2)         ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  Tokens: 245 in / 180 out  │  Time: 1.2s              │
│  [📋 Copy] [📋 Copy as cURL] [📊 View JSON]           │
└─────────────────────────────────────────────────────────┘
```

**Components cần tạo:**
- `components/ai/playground/chat-input.tsx` — Input form
- `components/ai/playground/stream-display.tsx` — Streaming response
- `components/ai/playground/json-viewer.tsx` — Collapsible JSON

**API Route:**
- `POST /api/me/ai-keys/[id]/playground` — Proxy request với API key

---

### Task 2.2: Admin Bulk Import NCC Keys (Day 3)

**File:** `app/admin/(authenticated)/ai/ncc-keys/page.tsx`

**Thêm:**
1. **CSV Upload** để thêm nhiều keys cùng lúc
2. **Bulk actions** (enable/disable/delete multiple)
3. **Import preview** table trước khi confirm

**Mockup:**
```
┌─────────────────────────────────────────────────────────┐
│  NCC Keys Manager           [+ Add Single] [📥 Bulk Import]│
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐│
│  │  📥 Drop CSV file here or click to upload          ││
│  │                                                     ││
│  │  Columns: api_key, nickname, quota_usd, expires_at ││
│  │  [Download template CSV]                           ││
│  └─────────────────────────────────────────────────────┘│
│                                                         │
│  Preview (3 keys):                                     │
│  ┌────────────────────────────────────────────────────┐│
│  │ ☐ │ Nickname       │ Quota   │ Status  │        ││
│  ├───┼─────────────────┼─────────┼─────────┼────────┤│
│  │ ☐ │ Pool Claude #1  │ $50     │ ● Active│        ││
│  │ ☐ │ Pool GPT #2     │ $30     │ ● Active│        ││
│  │ ☐ │ Backup Sonnet   │ $100    │ ○ Inactive│       ││
│  └────────────────────────────────────────────────────┘│
│                                    [Cancel] [Import 3] │
└─────────────────────────────────────────────────────────┘
```

**Components cần tạo:**
- `components/admin/ai/bulk-import-dialog.tsx` — Dialog với drag-drop
- `components/admin/ai/bulk-actions-bar.tsx` — Selection actions bar

---

## Sprint 3: Advanced Admin Reports + Polish (2-3 ngày)

### Mục tiêu: Reports tốt hơn + Final polish

---

### Task 3.1: Admin Usage Charts (Day 1)

**File:** `app/admin/(authenticated)/ai/usage/page.tsx`

**Thêm:**
1. **Revenue chart** theo thời gian (tokens × price)
2. **Top customers** table
3. **Model popularity** pie chart
4. **Export CSV/Excel**

---

### Task 3.2: Quota Alert Dashboard (Day 2)

**Thêm trang:** `app/account/api-keys/[id]/alerts/page.tsx`

**Tính năng:**
1. **Cài đặt threshold** (alert khi còn 20%, 10%, 5%)
2. **Notification preferences** (email, telegram, dashboard)
3. **Alert history** log

---

### Task 3.3: Final Polish (Day 3)

1. **Responsive fixes** cho mobile
2. **Loading states** đẹp hơn (skeleton screens)
3. **Error states** với retry buttons
4. **Empty states** với helpful messages
5. **Update documentation** (`docs/api/AI_API.md`)

---

## Chi tiết kỹ thuật

### Components mới cần tạo

```
components/
├── account/
│   └── api-key-card.tsx              # NEW: Key card với progress
├── charts/
│   ├── line-chart.tsx                # NEW: SVG line chart
│   ├── pie-chart.tsx                # NEW: SVG pie chart
│   └── stats-card.tsx               # NEW: Stats display card
├── ai/
│   ├── model-card.tsx               # NEW: Model info card
│   ├── model-filter.tsx             # NEW: Filter dropdown
│   ├── model-grid.tsx              # NEW: Grid layout
│   └── playground/
│       ├── chat-input.tsx          # NEW: Playground input
│       ├── stream-display.tsx       # NEW: Streaming response
│       └── json-viewer.tsx         # NEW: JSON viewer
└── admin/ai/
    ├── bulk-import-dialog.tsx       # NEW: CSV upload
    └── bulk-actions-bar.tsx        # NEW: Bulk actions
```

### API Routes mới

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/me/ai-keys/[id]/usage-chart` | Enhanced usage data cho chart |
| GET | `/api/me/ai-keys/[id]/models` | Available models với metadata |
| POST | `/api/me/ai-keys/[id]/playground` | Test request proxy |
| POST | `/api/admin/ai/ncc-keys/bulk` | Bulk import NCC keys |
| GET | `/api/admin/ai/usage-chart` | Admin usage aggregated |

### Schema changes

**Không cần thay đổi schema.** Dùng dữ liệu hiện có từ:
- `AiApiKey` — quota, status, expiresAt
- `AiUsage` — usage logs
- `AiNccKey` — upstream info

---

## Effort Estimate

| Task | Effort | Priority |
|------|--------|----------|
| 1.1 API Keys List Upgrade | 0.5 ngày | High |
| 1.2 Usage Charts | 1 ngày | High |
| 1.3 Model Selector | 1.5 ngày | Medium |
| 2.1 API Playground | 2 ngày | High |
| 2.2 Admin Bulk Import | 1 ngày | Medium |
| 3.1 Admin Usage Charts | 1 ngày | Medium |
| 3.2 Quota Alerts | 0.5 ngày | Low |
| 3.3 Polish | 0.5 ngày | Medium |
| **Total** | **8 ngày** | |

---

## Deliverables

- [ ] `components/account/api-key-card.tsx`
- [ ] `components/charts/*.tsx` (line, pie, stats)
- [ ] `components/ai/model-*.tsx` (card, filter, grid)
- [ ] `app/account/api-keys/[id]/playground/page.tsx`
- [ ] `components/ai/playground/*.tsx`
- [ ] `components/admin/ai/bulk-import-dialog.tsx`
- [ ] API routes: playground, bulk import, enhanced usage
- [ ] Update `docs/api/AI_API.md`

---

## Testing

```bash
npm run typecheck   # ✅ exit 0
npm run lint        # ✅ exit 0
npm run test        # ✅ pass (add ~15 new tests)
npm run build       # ✅ exit 0
```

**Manual checklist:**
- [ ] API Keys list: progress bar hiển thị đúng %
- [ ] Usage chart: line chart vẽ đúng dữ liệu
- [ ] Model selector: cards hiển thị info đầy đủ
- [ ] Playground: streaming response hoạt động
- [ ] Admin bulk import: CSV upload + preview
- [ ] Mobile responsive: tất cả components

---

## Out of Scope

- i18n (Phase 11)
- SEO optimization (Phase 12)
- Performance optimization (Phase 13)
- Mobile app

---

## Next Steps

Sau Phase 10, tiếp tục với:
- Phase 11: i18n (English/Vietnamese toggle)
- Phase 12: SEO optimization
- Phase 13: Performance optimization
