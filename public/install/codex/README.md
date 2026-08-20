# Kandes.shop — Install Scripts (D65)

> Auto-config installer cho khách hàng mua AI API key. Khi khách copy-paste 1
> lệnh, script sẽ tự động sửa file config của Codex CLI / Claude Code để
> endpoint URL trỏ về `api.kandes.shop` (proxy tới `api.ccpro.cn`).

---

## 📦 Có 3 file installer

| File | OS / Shell | Hỗ trợ |
|------|------------|--------|
| `codex-config-kandes.sh` | macOS / Linux (bash 3.2+) | ✅ Codex CLI + Claude Code |
| `codex-config-kandes.ps1` | Windows (PowerShell 5.1+) | ✅ Codex CLI + Claude Code |
| `codex-config-kandes.bat` | Windows (CMD) | ⚠️ Codex CLI only (CMD không có JSON parser an toàn) |

---

## 🚀 Lệnh cho khách hàng

### macOS / Linux
```bash
curl -fsSL https://kandes.shop/install/codex/codex-config-kandes.sh | bash
```

### Windows PowerShell (khuyến nghị)
```powershell
irm https://kandes.shop/install/codex/codex-config-kandes.ps1 | iex
```

### Windows CMD (chỉ Codex)
```cmd
curl -fsSL https://kandes.shop/install/codex/codex-config-kandes.bat -o "%TEMP%\kandes.bat" && "%TEMP%\kandes.bat"
```

---

## 🎯 Luồng hoạt động

```
Khách hàng copy lệnh
        ↓
Script hiển thị menu: 1=Codex, 2=Claude, 3=Cả hai, 4=Hủy
        ↓
Script hỏi API key (paste + Enter, có mask)
        ↓
Script ghi:
  Codex     -> ~/.codex/config.toml + ~/.codex/auth.json
  Claude    -> ~/.claude/settings.json (env block)
        ↓
Verify file đã ghi đúng + in summary
```

---

## 📁 Files được tạo

### Codex CLI
- **`~/.codex/config.toml`** — TOML config với `model_provider = "openai"` (built-in) + block `[env]` chứa `OPENAI_BASE_URL` + `OPENAI_API_KEY`
- **`~/.codex/auth.json`** — JSON `{"OPENAI_API_KEY": "<your-key>"}` (giữ làm backup, Codex không đọc file này)

### Claude Code
- **`~/.claude/settings.json`** — JSON với block `env` chứa:
  - `ANTHROPIC_BASE_URL` = `https://api.kandes.shop`
  - `ANTHROPIC_API_KEY` = `<your-key>`
  - `ANTHROPIC_AUTH_TOKEN` = `<your-key>`
  - `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` = `"1"`

→ Các settings khác của user (themes, permissions, hooks) **được giữ nguyên**.

---

## 🔁 Vì sao dùng `openai` provider + `[env]` block?

Codex CLI 2026 không thể override built-in provider ID `openai` qua
`[model_providers.openai]` block — nó bị ignore. Cách chính thức để trỏ
Codex vào proxy/LiteLLM là set env `OPENAI_BASE_URL` + `OPENAI_API_KEY`.
Codex CLI đọc `[env]` table trong user-level `~/.codex/config.toml` và
inject vào env trước khi spawn — **không cần user `export` env trong shell**.

Vì vậy installer viết:

```toml
model_provider = "openai"
model = "gpt-5.4"
model_reasoning_effort = "high"
disable_response_storage = true

[env]
OPENAI_BASE_URL = "https://api.kandes.shop/v1"
OPENAI_API_KEY = "<your-key>"
```

→ Chạy `codex` → Codex tự lấy `OPENAI_API_KEY` từ env → gọi
`https://api.kandes.shop/v1/responses` → Kandes gateway proxy tới NCC
upstream → trả về OpenAI Responses format đúng.

---

## 🛡️ An toàn

| Rủi ro | Mitigation |
|--------|------------|
| API key bị log | Script mask input bằng `*` khi nhập; KHÔNG echo lại |
| Ghi đè config user | Script **merge** thay vì overwrite — strip chỉ block Kandes-managed |
| File malformed | Verify sau khi ghi (grep URL + key) |
| JSON parse fail (Claude) | Bash: dùng `jq` / `python3` / `node` (auto-detect). PowerShell: `ConvertFrom-Json` |
| Encoding lỗi | UTF-8 **no BOM** cho TOML/JSON (TOML parsers dị ứng BOM) |
| Codex đọc `OPENAI_API_KEY` ở đâu? | Từ `[env]` table trong `~/.codex/config.toml` (Codex built-in provider). KHÔNG đọc từ `auth.json`. Script cũ (v1.x) đặt `env_key = "OPENAI_API_KEY"` trong custom provider — Codex vẫn tìm trong env, **không** tự load auth.json, gây lỗi "Missing environment variable". v2.0.0 ghi `[env]` table nên chạy được ngay kể cả user không `export` env. |

---

## 🧪 Test thủ công (developer)

### Test Bash:
```bash
bash public/install/codex/codex-config-kandes.sh
```

### Test PowerShell (Windows):
```powershell
.\public\install\codex\codex-config-kandes.ps1
```

### Test CMD (Windows):
```cmd
public\install\codex\codex-config-kandes.bat
```

---

## 🔗 Liên quan

- **Branding constants**: `modules/ai-gateway/branding.ts`
  - `KANDES_BASE_URL` = `https://api.kandes.shop/v1`
  - `INTERNAL_UPSTREAM_BASE_URL` = `https://api.ccpro.cn/v1`
- **API Gateway**: `modules/ai-gateway/` (proxy + validate + log)
- **Documentation**: `/docs/api/codex` (Next.js page)

---

## 📌 Ví dụ `~/.codex/config.toml` (Kandes)

```toml
model_provider = "openai"
model = "gpt-5.4"
model_reasoning_effort = "high"
disable_response_storage = true

[env]
OPENAI_BASE_URL = "https://api.kandes.shop/v1"
OPENAI_API_KEY = "<your-kandes-key>"
```

`~/.codex/auth.json` (giữ làm backup — Codex không đọc file này từ v0.63+):

```json
{
  "OPENAI_API_KEY": "<your-kandes-key>"
}
```

> **Lưu ý**: Codex CLI **đọc `$OPENAI_API_KEY` từ env, không đọc `auth.json`**
> cho cả built-in lẫn custom provider (xem [openai/codex#11698](https://github.com/openai/codex/issues/11698)).
> Installer v2.0.0 embed giá trị vào `[env]` table trong chính `config.toml`,
> nên không cần `export` env trong shell, codex chạy là nhận đủ key + base URL.

---

## 🤖 Hỗ trợ Claude Code

Gateway expose các OpenAI-compatible endpoints (`/v1/responses`, `/v1/chat/completions`,
`/v1/models`, `/v1/usage`) **và Anthropic-compatible endpoint `/v1/messages`**
qua nginx rewrite → `app/api/ai/v1/*`. Claude Code gọi `/v1/messages`
(Anthropic Messages API); gateway tự convert sang OpenAI Chat Completions
trước khi forward tới upstream. Hỗ trợ đầy đủ: tools, system prompts,
streaming SSE, multi-turn messages.

→ User chỉ cần Claude Code: dùng `claude-config-kandes.{sh,ps1}` (skip menu).

### Test Anthropic Messages API (Claude Code backend)

```bash
curl -X POST https://api.kandes.shop/v1/messages \
  -H "Authorization: Bearer <your-kandes-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4-6",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Hello from Kandes!"}]
  }'
```

Response trả về đúng format Anthropic Messages API (`type: "message"`,
`role: "assistant"`, `content: [{type: "text", ...}]`).

---

## � Lịch sử

- **2026-08-09**: Initial version (D65). Adapted from `config.ps1` mẫu của nhà cung cấp.
- **2026-08-15**: Fix TOML — bỏ `requires_openai_auth = true`, thêm `env_key = "OPENAI_API_KEY"`
  để Codex CLI đọc được bearer token từ `auth.json`.
- **2026-08-15 (D74-C)**: Nginx `/v1/*` rewrite cho HTTPS server → `/api/ai/v1/*`.
  Anthropic `/v1/messages` endpoint được expose, Claude Code dùng được. Bump version.
- **2026-08-15 (v2.0.0)**: **BREAKING CONFIG CHANGE** — đổi từ custom provider
  `[model_providers.KANDES]` sang built-in provider `openai` + `[env]` table trong
  `~/.codex/config.toml`. Lý do: Codex CLI đọc `$OPENAI_API_KEY` từ env, KHÔNG tự
  load `auth.json` cho custom provider — gây lỗi "Missing environment variable:
  OPENAI_API_KEY" mặc dù `auth.json` đã có key. Cách mới (built-in + `[env]` table)
  embed trực tiếp vào `config.toml`, không cần user `export` env trong shell.
  Script tự strip block `[model_providers.KANDES]` cũ trước khi ghi block `[env]` mới.