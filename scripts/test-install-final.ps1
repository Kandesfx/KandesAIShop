#requires -Version 5.1
$ErrorActionPreference = 'Stop'

$codexScript = 'D:\Hai\Work\KandesAIShop\public\install\codex\codex-config-kandes.ps1'
$claudeScript = 'D:\Hai\Work\KandesAIShop\public\install\claude\claude-config-kandes.ps1'

# Use a stable tmp dir so the user can inspect the artifacts after the script finishes.
$tmpRoot = Join-Path $env:TEMP ("kandes-install-test-final")
if (Test-Path $tmpRoot) { Remove-Item -LiteralPath $tmpRoot -Recurse -Force -ErrorAction SilentlyContinue }
New-Item -ItemType Directory -Path $tmpRoot -Force | Out-Null

$codexDir  = Join-Path $tmpRoot '.codex'
$claudeDir = Join-Path $tmpRoot '.claude'
New-Item -ItemType Directory -Path $codexDir  -Force | Out-Null
New-Item -ItemType Directory -Path $claudeDir -Force | Out-Null

# ---------- 1. Build headless codex script ----------
$codexLines = Get-Content -LiteralPath $codexScript
# Write-CodexConfig sits at lines 264..361 of codex-config-kandes.ps1 (1-indexed).
# Ensure-Dir is at lines 254..259.
$codexExtract = $codexLines[253..360]

$codexHeadless = Join-Path $tmpRoot 'codex-headless.ps1'

$stubCodex = @(
    "function Write-Section { param(`$Title) }"
    "function Write-Info    { param(`$Msg) }"
    "function Write-Ok      { param(`$Msg) }"
    "function Write-ErrLine { param(`$Msg) }"
    "function Get-CodexDir    { Join-Path '$tmpRoot' '.codex' }"
    "function Get-ClaudeDir   { Join-Path '$tmpRoot' '.claude' }"
    "function Get-CodexConfig { Join-Path (Get-CodexDir) 'config.toml' }"
    "function Get-CodexAuth   { Join-Path (Get-CodexDir) 'auth.json' }"
    "function Get-ClaudeSettings { Join-Path (Get-ClaudeDir) 'settings.json' }"
)
$fullCodex = ($stubCodex + $codexExtract) -join "`n"
[System.IO.File]::WriteAllText($codexHeadless, $fullCodex, [System.Text.UTF8Encoding]::new($false))

. $codexHeadless
$r1 = Write-CodexConfig -BaseUrl 'https://api.kandes.shop/v1' -ApiKey 'ks-test-abc123XYZ'

# ---------- 2. Build headless claude script ----------
$claudeLines = Get-Content -LiteralPath $claudeScript
# Write-ClaudeConfig in claude-config-kandes.ps1 is at lines 169..211 (1-indexed).
$claudeExtract = $claudeLines[168..210]

$claudeHeadless = Join-Path $tmpRoot 'claude-headless.ps1'
$stubClaude = @(
    "function Write-Section { param(`$Title) }"
    "function Write-Ok      { param(`$Msg) }"
    "function Write-ErrLine { param(`$Msg) }"
    "function Get-ClaudeDir      { Join-Path '$tmpRoot' '.claude' }"
    "function Get-ClaudeSettings { Join-Path (Get-ClaudeDir) 'settings.json' }"
)
$fullClaude = ($stubClaude + $claudeExtract) -join "`n"
[System.IO.File]::WriteAllText($claudeHeadless, $fullClaude, [System.Text.UTF8Encoding]::new($false))

. $claudeHeadless
$r2 = Write-ClaudeConfig -BaseUrl 'https://api.kandes.shop/v1' -ApiKey 'sk-test-abc123XYZ'

# ---------- 3. Report ----------
$toml     = Join-Path $codexDir  'config.toml'
$authJson = Join-Path $codexDir  'auth.json'
$settings = Join-Path $claudeDir 'settings.json'

Write-Host ''
Write-Host '=================================================='
Write-Host '  Resulting ~/.codex/config.toml'
Write-Host '  (path: ' + $toml + ')'
Write-Host '=================================================='
if (Test-Path $toml) { Get-Content -LiteralPath $toml -Raw } else { Write-Host 'MISSING' -ForegroundColor Red }

Write-Host ''
Write-Host '=================================================='
Write-Host '  Resulting ~/.codex/auth.json'
Write-Host '  (path: ' + $authJson + ')'
Write-Host '=================================================='
if (Test-Path $authJson) { Get-Content -LiteralPath $authJson -Raw } else { Write-Host 'MISSING' -ForegroundColor Red }

Write-Host ''
Write-Host '=================================================='
Write-Host '  Resulting ~/.claude/settings.json'
Write-Host '  (path: ' + $settings + ')'
Write-Host '=================================================='
if (Test-Path $settings) { Get-Content -LiteralPath $settings -Raw } else { Write-Host 'MISSING' -ForegroundColor Red }

Write-Host ''
Write-Host '=================================================='
Write-Host '  auth.json JSON validity'
Write-Host '=================================================='
try {
    $obj = Get-Content -LiteralPath $authJson -Raw | ConvertFrom-Json
    $preview = if ($obj.OPENAI_API_KEY.Length -ge 4) { $obj.OPENAI_API_KEY.Substring(0,4) } else { $obj.OPENAI_API_KEY }
    Write-Host ("  PARSES OK. OPENAI_API_KEY = " + $preview + "...") -ForegroundColor Green
} catch {
    Write-Host ("  INVALID: " + $_.Exception.Message) -ForegroundColor Red
}

Write-Host ''
Write-Host '=================================================='
Write-Host '  settings.json JSON validity'
Write-Host '=================================================='
try {
    $obj = Get-Content -LiteralPath $settings -Raw | ConvertFrom-Json
    Write-Host '  PARSES OK.' -ForegroundColor Green
    Write-Host ("    env.ANTHROPIC_BASE_URL   = " + $obj.env.ANTHROPIC_BASE_URL)
    Write-Host ("    env.ANTHROPIC_API_KEY    = " + ($obj.env.ANTHROPIC_API_KEY.Substring(0,4)) + '...')
    Write-Host ("    env.ANTHROPIC_AUTH_TOKEN = " + ($obj.env.ANTHROPIC_AUTH_TOKEN.Substring(0,4)) + '...')
    Write-Host ("    env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = " + $obj.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC)
} catch {
    Write-Host ("  INVALID: " + $_.Exception.Message) -ForegroundColor Red
}

Write-Host ''
Write-Host '=================================================='
Write-Host '  TOML sanity (key strings)'
Write-Host '=================================================='
$tomlText = Get-Content -LiteralPath $toml -Raw
foreach ($needle in 'model_provider', '[model_providers.KANDES]', 'base_url = "https://api.kandes.shop/v1"', 'wire_api = "responses"', 'requires_openai_auth = true', 'model = "gpt-5.6-terra"') {
    if ($tomlText -match [regex]::Escape($needle)) {
        Write-Host ("  [OK]     $needle") -ForegroundColor Green
    } else {
        Write-Host ("  [MISS]   $needle") -ForegroundColor Red
    }
}

Write-Host ''
Write-Host "Artifacts preserved at: $tmpRoot"