# =============================================================================
#  Kandes.shop - Claude Code Installer (Claude Code only)
#  Platforms : Windows (PowerShell 5.1+)
#  Author    : Kandes.shop
#  Repo      : https://kandes.shop
# =============================================================================
#
#  Usage (one-line, no download needed):
#    irm https://kandes.shop/install/claude/claude-config-kandes.ps1 | iex
#
#  What it does:
#    1. Prompts for your Kandes API key (SecureString mask)
#    2. Writes ~/.claude/settings.json (env block with ANTHROPIC_* keys)
#    3. Preserves user-customised settings (themes, permissions, hooks) by
#       merging only the env block
#    4. Verifies the file is readable + the key was written correctly
#
#  Tip: If you also need Codex CLI, run the Codex installer instead:
#       irm https://kandes.shop/install/codex/codex-config-kandes.ps1 | iex
#
# =============================================================================

$ErrorActionPreference = 'Stop'

# -----------------------------------------------------------------------------
#  Configuration
# -----------------------------------------------------------------------------
$KandesBaseUrl = 'https://api.kandes.shop/v1'
$KandesBrand   = 'Kandes.shop'
$ScriptVersion = '1.1.0'

# -----------------------------------------------------------------------------
#  Pretty helpers
# -----------------------------------------------------------------------------
function Write-Banner {
    Write-Host ''
    Write-Host '================================================================================' -ForegroundColor Magenta
    Write-Host ''
    Write-Host '                       Claude Code Installer  v1.1.0                           ' -ForegroundColor Magenta
    Write-Host "                       Base URL : $KandesBaseUrl                              " -ForegroundColor Cyan
    Write-Host ''
    Write-Host '================================================================================' -ForegroundColor Magenta
    Write-Host ''
}

function Write-Section {
    param([string]$Title)
    Write-Host ''
    Write-Host "--- $Title ---" -ForegroundColor Blue
}

function Write-Info    { param([string]$Msg) Write-Host "[INFO]  $Msg" -ForegroundColor Cyan }
function Write-Ok      { param([string]$Msg) Write-Host "[OK]    $Msg" -ForegroundColor Green }
function Write-Warn    { param([string]$Msg) Write-Host "[WARN]  $Msg" -ForegroundColor Yellow }
function Write-ErrLine { param([string]$Msg) Write-Host "[ERR]   $Msg" -ForegroundColor Red }

# -----------------------------------------------------------------------------
#  Input
# -----------------------------------------------------------------------------
function Get-SecretInput {
    param([string]$Prompt)
    $secure = Read-Host -Prompt "$Prompt" -AsSecureString
    $bstr   = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try   { return ([Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)).Trim() }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) | Out-Null }
}

# -----------------------------------------------------------------------------
#  Path helpers
# -----------------------------------------------------------------------------
function Get-ClaudeDir       { Join-Path $env:USERPROFILE '.claude' }
function Get-ClaudeSettings  { Join-Path (Get-ClaudeDir) 'settings.json' }

function Ensure-Dir {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

# -----------------------------------------------------------------------------
#  Claude Code writer
#  Logic: identical to codex-config-kandes.ps1::Write-ClaudeConfig — preserved
#  here as a standalone script so users can install Claude without going
#  through the Codex menu.
# -----------------------------------------------------------------------------
function Write-ClaudeConfig {
    param([string]$BaseUrl, [string]$ApiKey)

    $claudeDir    = Get-ClaudeDir
    $settingsFile = Get-ClaudeSettings

    Ensure-Dir $claudeDir
    Write-Section 'Writing Claude Code config'

    # Load existing JSON (empty object if missing/malformed).
    $existing = @{}
    if (Test-Path -LiteralPath $settingsFile) {
        $raw = Get-Content -LiteralPath $settingsFile -Raw -ErrorAction SilentlyContinue
        if (-not [string]::IsNullOrWhiteSpace($raw)) {
            try   { $existing = $raw | ConvertFrom-Json -AsHashtable -Depth 10 -ErrorAction Stop }
            catch {
                try { $existing = $raw | ConvertFrom-Json -Depth 10 } catch { $existing = @{} }
            }
            if ($null -eq $existing) { $existing = @{} }
        }
    }

    if (-not $existing.ContainsKey('env')) { $existing['env'] = @{} }

    # Merge Kandes env vars (Kandes values win — they are the ones we are configuring).
    $existing['env']['ANTHROPIC_BASE_URL']                    = $BaseUrl
    $existing['env']['ANTHROPIC_API_KEY']                     = $ApiKey
    $existing['env']['ANTHROPIC_AUTH_TOKEN']                  = $ApiKey
    $existing['env']['CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC'] = '1'

    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    $json      = $existing | ConvertTo-Json -Depth 10
    [System.IO.File]::WriteAllText($settingsFile, $json, $utf8NoBom)

    # Verify
    $verify = Get-Content -LiteralPath $settingsFile -Raw
    if ($verify -like "*$BaseUrl*" -and $verify -like "*$ApiKey*") {
        Write-Ok "settings.json saved: $settingsFile"
        return $true
    }
    Write-ErrLine "Verification failed: $settingsFile"
    return $false
}

# -----------------------------------------------------------------------------
#  API key prompt
# -----------------------------------------------------------------------------
function Get-ApiKey {
    Write-Section 'API key'
    Write-Host 'Enter your Kandes API key (paste then press Enter).' -ForegroundColor Gray
    Write-Host 'Find it in your dashboard: https://kandes.shop/account'  -ForegroundColor Gray
    while ($true) {
        $k = Get-SecretInput 'API Key'
        if (-not [string]::IsNullOrWhiteSpace($k)) { return $k }
        Write-ErrLine 'API Key cannot be empty'
    }
}

# -----------------------------------------------------------------------------
#  Summary
# -----------------------------------------------------------------------------
function Show-Summary {
    param([string]$InstalledFor, [string]$ApiKey)
    $preview = if ($ApiKey.Length -ge 8) { "$($ApiKey.Substring(0,8))..." } else { $ApiKey }

    Write-Section 'Setup Complete'
    Write-Host ''
    Write-Host ("  Installed for : {0}" -f $InstalledFor)        -ForegroundColor White
    Write-Host ("  Base URL      : {0}" -f $KandesBaseUrl)        -ForegroundColor Cyan
    Write-Host ("  API Key       : {0}" -f $preview)              -ForegroundColor Gray
    Write-Host ''
    Write-Host "Run 'claude' to get started."     -ForegroundColor Gray
    Write-Host 'Need help? https://kandes.shop/docs/api' -ForegroundColor Gray
    Write-Host ''
}

# -----------------------------------------------------------------------------
#  Main
# -----------------------------------------------------------------------------
Write-Banner

# Support --ApiKey for non-interactive use
$apiKey = $null
foreach ($arg in $args) {
    if ($arg -like '--ApiKey=*') { $apiKey = $arg.Substring('--ApiKey='.Length) }
    elseif ($arg -like '-k=*')    { $apiKey = $arg.Substring('-k='.Length) }
}
if ($null -eq $apiKey) { $apiKey = Get-ApiKey }

if (-not (Write-ClaudeConfig -BaseUrl $KandesBaseUrl -ApiKey $apiKey)) { exit 1 }
Show-Summary 'Claude Code' $apiKey
