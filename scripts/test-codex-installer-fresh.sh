#!/usr/bin/env bash
set -euo pipefail

TESTDIR="/tmp/kandes-test-fresh-$$"
# No pre-existing config — fresh install
rm -rf "$TESTDIR/.codex" 2>/dev/null || true
mkdir -p "$TESTDIR/.codex"

HOME="$TESTDIR" bash "D:/Hai/Work/KandesAIShop/public/install/codex/codex-config-kandes.sh" \
  --tool codex \
  --api-key "ks-fresh-9876543210abcdef" \
  --yes 2>&1 | grep -E "Writing|OK|ERR" | head -10

echo ""
echo "=== Fresh config.toml ==="
cat "$TESTDIR/.codex/config.toml"
echo ""
echo "=== Fresh auth.json ==="
cat "$TESTDIR/.codex/auth.json"
echo ""

TOML=$(cat "$TESTDIR/.codex/config.toml")
pass=0; fail=0
check() {
  if [[ "$TOML" =~ $1 ]]; then
    echo "[OK]   $2"; pass=$((pass+1))
  else
    echo "[FAIL] $2"; fail=$((fail+1))
  fi
}
check 'model_provider = "openai"' "Built-in openai provider"
check '\[env\]' "Has [env] table"
check 'OPENAI_BASE_URL = "https://api.kandes.shop/v1"' "Base URL set"
check 'OPENAI_API_KEY = "ks-fresh-' "API key set"

rm -rf "$TESTDIR"
echo ""
echo "Summary: $pass passed, $fail failed"
exit $fail
