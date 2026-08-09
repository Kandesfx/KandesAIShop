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
- **`~/.codex/config.toml`** — TOML config với `model_provider = "KANDES"` + section `[model_providers.KANDES]`
- **`~/.codex/auth.json`** — JSON `{"OPENAI_API_KEY": "<your-key>"}`

### Claude Code
- **`~/.claude/settings.json`** — JSON với block `env` chứa:
  - `ANTHROPIC_BASE_URL` = `https://api.kandes.shop/v1`
  - `ANTHROPIC_API_KEY` = `<your-key>`
  - `ANTHROPIC_AUTH_TOKEN` = `<your-key>`
  - `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` = `"1"`

→ Các settings khác của user (themes, permissions, hooks) **được giữ nguyên**.

---

## 🛡️ An toàn

| Rủi ro | Mitigation |
|--------|------------|
| API key bị log | Script mask input bằng `*` khi nhập; KHÔNG echo lại |
| Ghi đè config user | Script **merge** thay vì overwrite — strip chỉ block Kandes-managed |
| File malformed | Verify sau khi ghi (grep URL + key) |
| JSON parse fail (Claude) | Bash: dùng `jq` / `python3` / `node` (auto-detect). PowerShell: `ConvertFrom-Json` |
| Encoding lỗi | UTF-8 **no BOM** cho TOML/JSON (TOML parsers dị ứng BOM) |

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

## 📝 Lịch sử

- **2026-08-09**: Initial version (D65). Adapted from `config.ps1` mẫu của nhà cung cấp.