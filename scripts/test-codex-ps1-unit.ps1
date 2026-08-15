# Test codex-config-kandes.ps1 by extracting Write-CodexConfig function
# and calling it directly with a custom HOME-like variable via env override.

# Strategy: load just the Write-CodexConfig function in a separate scope
# after redefining Get-CodexDir + Get-ClaudeDir to use our temp HOME.

$ErrorActionPreference = 'Stop'

$testDir = Join-Path $env:TEMP ("kandes-test-ps1-" + (Get-Date -Format 'HHmmss'))
$codexDir = Join-Path $testDir ".codex"
New-Item -ItemType Directory -Force -Path $codexDir | Out-Null

# Legacy config to migrate
@"
model_provider = "KANDES"
model = "gpt-5.6-terra"

[model_providers.KANDES]
name = "KANDES"
base_url = "https://api.kandes.shop/v1"
wire_api = "responses"
env_key = "OPENAI_API_KEY"

# User custom setting
approval_policy = "on-request"
"@ | Set-Content -Path (Join-Path $codexDir 'config.toml') -Encoding UTF8 -NoNewline

# Read installer source, drop main block + interactive menu, keep
# functions, override Get-CodexDir + Get-CodexConfig + Get-CodexAuth to
# point to our test directory. Then call Write-CodexConfig.

$src = Get-Content "D:\Hai\Work\KandesAIShop\public\install\codex\codex-config-kandes.ps1" -Raw

# Extract everything from the start to the "Main" section header.
$marker = "#  Main"
$idx = $src.IndexOf($marker)
if ($idx -lt 0) { Write-Error "Could not find Main marker"; exit 1 }
$functions = $src.Substring(0, $idx)

# Eval functions in current scope, then override the path helpers.
Invoke-Expression $functions

# Override helpers to point to test dir.
function Get-CodexDir    { return $testDir + '\.codex' }
function Get-CodexConfig { return (Join-Path $codexDir 'config.toml') }
function Get-CodexAuth   { return (Join-Path $codexDir 'auth.json') }

Write-Host "[1] Legacy config before installer:" -ForegroundColor Cyan
Get-Content $codexDir\config.toml
Write-Host ""

try {
  $ok = Write-CodexConfig -BaseUrl 'https://api.kandes.shop/v1' -ApiKey 'ks-test-1234567890abcdef'
  if (-not $ok) { Write-Host "[FAIL] Write-CodexConfig returned false" -ForegroundColor Red; exit 1 }
} catch {
  Write-Host "[FAIL] exception: $_" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "[2] Generated config.toml:" -ForegroundColor Cyan
Get-Content $codexDir\config.toml
Write-Host ""
Write-Host "[3] Generated auth.json:" -ForegroundColor Cyan
Get-Content $codexDir\auth.json
Write-Host ""

# Verify
$toml = Get-Content $codexDir\config.toml -Raw
$tests = @(
  @{n='Built-in openai provider';          p=$toml -match 'model_provider = "openai"'},
  @{n='Has [env] table';                   p=$toml -match '\[env\]'},
  @{n='OPENAI_BASE_URL set';              p=$toml -match 'OPENAI_BASE_URL = "https://api.kandes.shop/v1"'},
  @{n='OPENAI_API_KEY set';               p=$toml -match 'OPENAI_API_KEY = "ks-test-'},
  @{n='Old KANDES section stripped';      p=-not ($toml -match 'model_providers\.KANDES')},
  @{n='Old model_provider=KANDES stripped'; p=-not ($toml -match 'model_provider = "KANDES"')},
  @{n='User custom setting preserved';     p=$toml -match 'approval_policy = "on-request"'}
)
$pass=0; $fail=0
Write-Host ""
Write-Host "[4] Verify checks:" -ForegroundColor Cyan
foreach ($t in $tests) {
  $m = if ($t.p) { "[OK]  " } else { "[FAIL]" }
  Write-Host "$m $($t.n)"
  if ($t.p) { $pass++ } else { $fail++ }
}

Remove-Item -Recurse -Force $testDir

Write-Host ""
Write-Host "Summary: $pass passed, $fail failed"
exit $fail
