#!/usr/bin/env bash
set -euo pipefail

TESTDIR="/tmp/kandes-test-bash-$$"
mkdir -p "$TESTDIR/.codex"

# Pre-existing config (v1.x legacy)
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

echo "[1] Legacy config before installer:"
cat "$TESTDIR/.codex/config.toml"
echo ""

# Run installer với non-interactive flags
HOME="$TESTDIR" bash "D:/Hai/Work/KandesAIShop/public/install/codex/codex-config-kandes.sh" \
  --tool codex \
  --api-key "ks-test-1234567890abcdef" \
  --yes

echo ""
echo "[2] Generated config.toml after installer:"
cat "$TESTDIR/.codex/config.toml"
echo ""
echo "[3] Generated auth.json:"
cat "$TESTDIR/.codex/auth.json" 2>/dev/null || echo "(missing)"
echo ""

# Read final TOML for verification
TOML=$(cat "$TESTDIR/.codex/config.toml")
pass=0
fail=0

check() {
  if [[ "$TOML" =~ $1 ]]; then
    echo "[OK]   $2"
    pass=$((pass+1))
  else
    echo "[FAIL] $2 (pattern: $1 not found)"
    fail=$((fail+1))
  fi
}

check_not() {
  if [[ ! "$TOML" =~ $1 ]]; then
    echo "[OK]   $2"
    pass=$((pass+1))
  else
    echo "[FAIL] $2 (pattern: $1 was found but should not be)"
    fail=$((fail+1))
  fi
}

check          'model_provider = "openai"'       "Built-in openai provider"
check          '\[env\]'                          "Has [env] table"
check          'OPENAI_BASE_URL = "https://api.kandes.shop/v1"' "OPENAI_BASE_URL set"
check          'OPENAI_API_KEY = "ks-test-'       "OPENAI_API_KEY set"
check_not      'model_providers\.KANDES'         "Old KANDES section stripped"
check_not      'model_provider = "KANDES"'        "Old model_provider=KANDES stripped"
check          'approval_policy = "on-request"'   "User custom setting preserved"

echo ""
echo "=== Summary: $pass passed, $fail failed ==="

# Cleanup
rm -rf "$TESTDIR"

exit $fail
