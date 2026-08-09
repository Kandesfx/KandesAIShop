# =============================================================================
#  Kandes.shop - Interactive Config Installer (Codex + Claude Code)
#  Platforms : Windows (PowerShell 5.1+)
#  Author    : Kandes.shop
#  Repo      : https://kandes.shop
# =============================================================================
#
#  Usage (one-line, no download needed):
#    irm https://kandes.shop/install/codex/codex-config-kandes.ps1 | iex
#
#  What it does:
#    1. Asks which tool(s) to configure: Codex CLI / Claude Code / Both / Cancel
#    2. Prompts for your Kandes API key (SecureString mask)
#    3. Writes:
#         Codex     -> $env:USERPROFILE\.codex\config.toml + auth.json
#         Claude    -> $env:USERPROFILE\.claude\settings.json (env block)
#    4. Preserves user settings by stripping only the Kandes-managed block
#    5. Verifies the file is readable + the key was written correctly
#
# =============================================================================

$ErrorActionPreference = 'Stop'

# -----------------------------------------------------------------------------
#  Configuration
# -----------------------------------------------------------------------------
$KandesBaseUrl = 'https://api.kandes.shop/v1'
$KandesBrand   = 'Kandes.shop'
$ScriptVersion = '1.0.0'

# -----------------------------------------------------------------------------
#  Pretty helpers
# -----------------------------------------------------------------------------
function Write-Banner {
    Write-Host ''
    Write-Host '================================================================================' -ForegroundColor Magenta
    Write-Host ''
    Write-Host '   _  ___                    _    ___  _    _                                  ' -ForegroundColor Magenta
    Write-Host '  | |/ / |                  | |  / _ \ | |  (_)                                 ' -ForegroundColor Magenta
    Write-Host '  |   /| |__   __ _ _ __ ___| |_| | | | |__ _ _ __                            ' -ForegroundColor Magenta
    Write-Host '  |  < | ''_ \ / _` | ''__/ _ \ __| | | | ''_ \| | ''_ \                           ' -ForegroundColor Magenta
    Write-Host '  |  . \| | | | (_| | | |  __/ |_| |_| | | | | | | | |                         ' -ForegroundColor Magenta
    Write-Host '  |_|\_\_| |_|\__,_|_|  \___|\__|\___/|_| |_|_| |_|_|                          ' -ForegroundColor Magenta
    Write-Host ''
    Write-Host "              Interactive Config Installer  v$ScriptVersion" -ForegroundColor Magenta
    Write-Host "              Base URL : $KandesBaseUrl" -ForegroundColor Cyan
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

function Show-Menu {
    param([string]$Question, [string[]]$Options)
    Write-Host ''
    Write-Host $Question -ForegroundColor White
    for ($i = 0; $i -lt $Options.Length; $i++) {
        Write-Host ("  {0}) {1}" -f ($i + 1), $Options[$i]) -ForegroundColor Cyan
    }
    while ($true) {
        $raw = Read-Host -Prompt "Choose [1-$($Options.Length)]"
        if ($raw -match '^\d+$' -and [int]$raw -ge 1 -and [int]$raw -le $Options.Length) {
            return [int]$raw
        }
        Write-Warn "Invalid choice: '$raw'"
    }
}

# -----------------------------------------------------------------------------
#  Path helpers
# -----------------------------------------------------------------------------
function Get-CodexDir    { Join-Path $env:USERPROFILE '.codex' }
function Get-ClaudeDir   { Join-Path $env:USERPROFILE '.claude' }
function Get-CodexConfig { Join-Path (Get-CodexDir) 'config.toml' }
function Get-CodexAuth   { Join-Path (Get-CodexDir) 'auth.json' }
function Get-ClaudeSettings { Join-Path (Get-ClaudeDir) 'settings.json' }

function Ensure-Dir {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

# -----------------------------------------------------------------------------
#  Codex writer
# -----------------------------------------------------------------------------
function Write-CodexConfig {
    param([string]$BaseUrl, [string]$ApiKey)

    $codexDir   = Get-CodexDir
    $configFile = Get-CodexConfig
    $authFile   = Get-CodexAuth

    Ensure-Dir $codexDir
    Write-Section 'Writing Codex config'

    $tomlBlock = @"
model_provider = "KANDES"
model = "gpt-5.4"
model_reasoning_effort = "high"
disable_response_storage = true


[model_providers.KANDES]
name = "KANDES"
base_url = "$BaseUrl"
wire_api = "responses"
requires_openai_auth = true
"@

    if (Test-Path -LiteralPath $configFile) {
        Write-Info "Merging with existing $configFile"
        $existing = Get-Content -LiteralPath $configFile -ErrorAction SilentlyContinue
        if ($null -ne $existing) {
            $kept      = New-Object System.Collections.Generic.List[string]
            $inSection = $false

            foreach ($rawLine in $existing) {
                $line = $rawLine -replace "`r$", ''

                if ($line -match '^\s*\[model_providers\.KANDES\]\s*$') {
                    $inSection = $true
                    continue
                }
                if ($inSection -and $line -match '^\s*\[[^\]]+\]\s*$') {
                    $inSection = $false
                }
                if ($inSection) { continue }

                if ($line -match '^\s*model_provider\s*=')              { continue }
                if ($line -match '^\s*model\s*=\s*"gpt-')               { continue }
                if ($line -match '^\s*model_reasoning_effort\s*=')      { continue }
                if ($line -match '^\s*disable_response_storage\s*=')   { continue }

                $kept.Add($line) | Out-Null
            }

            $start = 0
            $endIdx = $kept.Count - 1
            while ($start -le $endIdx -and [string]::IsNullOrWhiteSpace($kept[$start]))  { $start++ }
            while ($endIdx -ge $start -and [string]::IsNullOrWhiteSpace($kept[$endIdx])) { $endIdx-- }
            $remaining = ''
            if ($start -le $endIdx) {
                $slice    = $kept.GetRange($start, $endIdx - $start + 1)
                $remaining = ($slice -join "`n")
            }
            $finalToml = if ([string]::IsNullOrEmpty($remaining)) {
                "$tomlBlock`n"
            } else {
                "$tomlBlock`n`n$remaining`n"
            }
        } else {
            $finalToml = "$tomlBlock`n"
        }
    } else {
        Write-Info "Creating fresh $configFile"
        $finalToml = "$tomlBlock`n"
    }

    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($configFile, $finalToml, $utf8NoBom)

    # Verify
    if (Select-String -LiteralPath $configFile -Pattern ([regex]::Escape($BaseUrl)) -Quiet) {
        Write-Ok "config.toml saved: $configFile"
    } else {
        Write-ErrLine "Failed to write config.toml"
        return $false
    }

    # auth.json
    $authJson = "{\n  `"OPENAI_API_KEY`": `"$ApiKey`"\n}\n"
    [System.IO.File]::WriteAllText($authFile, $authJson, $utf8NoBom)

    if ((Get-Content -LiteralPath $authFile -Raw) -like "*$ApiKey*") {
        Write-Ok "auth.json saved: $authFile"
    } else {
        Write-ErrLine "Failed to write auth.json"
        return $false
    }

    return $true
}

# -----------------------------------------------------------------------------
#  Claude Code writer
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
    Write-Host "Run 'codex' or 'claude' to get started." -ForegroundColor Gray
    Write-Host 'Need help? https://kandes.shop/docs/api'  -ForegroundColor Gray
    Write-Host ''
}

# -----------------------------------------------------------------------------
#  Main
# -----------------------------------------------------------------------------
Write-Banner

$choice = Show-Menu 'Which tool do you want to configure?' @(
    'Codex CLI only'
    'Claude Code only'
    'Both Codex and Claude Code'
    'Cancel (do nothing)'
)

switch ($choice) {
    4 { Write-Warn 'Cancelled by user'; exit 0 }
    1 { $tools = 'codex' }
    2 { $tools = 'claude' }
    3 { $tools = 'both' }
}

$apiKey = Get-ApiKey

switch ($tools) {
    'codex' {
        if (-not (Write-CodexConfig -BaseUrl $KandesBaseUrl -ApiKey $apiKey)) { exit 1 }
        Show-Summary 'Codex CLI' $apiKey
    }
    'claude' {
        if (-not (Write-ClaudeConfig -BaseUrl $KandesBaseUrl -ApiKey $apiKey)) { exit 1 }
        Show-Summary 'Claude Code' $apiKey
    }
    'both' {
        $ok = $true
        if (-not (Write-CodexConfig  -BaseUrl $KandesBaseUrl -ApiKey $apiKey)) { $ok = $false }
        if (-not (Write-ClaudeConfig -BaseUrl $KandesBaseUrl -ApiKey $apiKey)) { $ok = $false }
        if (-not $ok) { exit 1 }
        Show-Summary 'Codex CLI + Claude Code' $apiKey
    }
}