#!/usr/bin/env bash
set -euo pipefail

TESTDIR="/tmp/kandes-debug-$$"
mkdir -p "$TESTDIR/.codex"

cat > "$TESTDIR/.codex/config.toml" <<'LEGACY_EOF'
model_provider = "KANDES"
model = "gpt-5.6-terra"

[model_providers.KANDES]
name = "KANDES"
base_url = "https://api.kandes.shop/v1"
wire_api = "responses"
env_key = "OPENAI_API_KEY"

# User custom setting
approval_policy = "on-request"
LEGACY_EOF

# Source installer functions only (don't run main)
HOME="$TESTDIR" bash "D:/Hai/Work/KandesAIShop/public/install/codex/codex-config-kandes.sh" \
  --tool codex \
  --api-key "ks-test-1234567890abcdef" \
  --yes 2>&1 | grep -v "^$" | head -20

echo ""
echo "=== Final file ==="
cat "$TESTDIR/.codex/config.toml"
echo ""
echo "=== Bytes in file ==="
wc -l "$TESTDIR/.codex/config.toml"

rm -rf "$TESTDIR"
