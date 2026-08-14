# Kandes.shop — Claude Code Installer

> Auto-config installer cho Claude Code. Khi user chạy 1 lệnh, script tự
> động sửa `~/.claude/settings.json` để `ANTHROPIC_BASE_URL` trỏ về
> `api.kandes.shop` (proxy tới `api.ccpro.cn`).

---

## 📦 Có 3 file installer

| File | OS / Shell | Hỗ trợ |
|------|------------|--------|
| `claude-config-kandes.sh`  | macOS / Linux (bash 3.2+) | ✅ |
| `claude-config-kandes.ps1` | Windows (PowerShell 5.1+) | ✅ |
| `claude-config-kandes.bat` | Windows (CMD) | ⚠️ Overwrite (CMD không merge JSON an toàn) |

---

## 🚀 Lệnh cho khách hàng

### macOS / Linux
```bash
curl -fsSL https://kandes.shop/install/claude/claude-config-kandes.sh | bash
```

### Windows PowerShell (khuyến nghị)
```powershell
irm https://kandes.shop/install/claude/claude-config-kandes.ps1 | iex
```

### Windows CMD
```cmd
curl -fsSL https://kandes.shop/install/claude/claude-config-kandes.bat -o "%TEMP%\kandes-claude.bat" && "%TEMP%\kandes-claude.bat"
```

---

## 🎯 Luồng hoạt động

```
Khách hàng copy lệnh
        ↓
Script hỏi API key (paste + Enter, có mask)
        ↓
Script ghi ~/.claude/settings.json (env block)
        ↓
Verify file đã ghi đúng + in summary
```

---

## 📁 Files được tạo

### `~/.claude/settings.json` — JSON với block `env` chứa:

- `ANTHROPIC_BASE_URL` = `https://api.kandes.shop/v1`
- `ANTHROPIC_API_KEY` = `<your-key>`
- `ANTHROPIC_AUTH_TOKEN` = `<your-key>`
- `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` = `"1"`

→ Bash + PowerShell: **merge** với settings hiện có (themes, permissions, hooks được giữ).
→ CMD: **overwrite** + tạo backup `settings.json.bak` (CMD thiếu JSON parser an toàn).

---

## 🛡️ An toàn

| Rủi ro | Mitigation |
|--------|------------|
| API key bị log | Script mask input bằng `*` khi nhập; KHÔNG echo lại |
| Ghi đè config user (PS/Bash) | Script **merge** env block, các settings khác giữ nguyên |
| Ghi đè config user (CMD) | Backup `settings.json.bak` trước khi overwrite |
| File malformed | Verify sau khi ghi (grep URL + key) |
| JSON parse fail | Bash: dùng `jq` / `python3` / `node` (auto-detect). PowerShell: `ConvertFrom-Json` |

---

## 🆚 Claude-only vs Codex installer

| | `claude-config-kandes.sh` | `codex-config-kandes.sh` |
|--|---------------------------|---------------------------|
| Claude Code | ✅ (direct) | ✅ (via menu choice 2) |
| Codex CLI | ❌ | ✅ (via menu choice 1) |
| Cả hai | ❌ | ✅ (via menu choice 3) |
| Steps | 1 (hỏi key) | 2 (chọn tool + hỏi key) |

→ User chỉ dùng Claude Code: nên dùng installer này (đỡ phải chọn menu).
→ User dùng cả Codex + Claude: nên dùng Codex installer với choice 3.

---

## 🧪 Test thủ công (developer)

### Test Bash:
```bash
bash public/install/claude/claude-config-kandes.sh
# Or with non-interactive key:
bash public/install/claude/claude-config-kandes.sh --api-key sk-test-xxx
```

### Test PowerShell:
```powershell
.\public\install\claude\claude-config-kandes.ps1
# Or:
.\public\install\claude\claude-config-kandes.ps1 --ApiKey sk-test-xxx
```

### Test CMD:
```cmd
public\install\claude\claude-config-kandes.bat
```

---

## 📝 Lịch sử

- **2026-08-15**: Initial Claude-only installer (D74-fix). Extracted from
  `codex-config-kandes.sh::write_claude_config` for users who only need Claude.
