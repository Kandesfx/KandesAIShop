# Codex Config-Only Script (PowerShell / Windows)
# Writes %USERPROFILE%\.codex\config.toml and auth.json.
# Assumes Node.js and the `codex` CLI are already installed.
#
# Usage (always interactive — you will be prompted for your API key):
#   irm https://kandes.shop/install/codex/codex-config-kandes.ps1 | iex

$ErrorActionPreference = 'Stop'

$BaseUrl = 'https://api.kandes.shop/v1'

function Write-Info    { param([string]$Msg) Write-Host "[INFO] $Msg" -ForegroundColor Cyan }
function Write-Ok      { param([string]$Msg) Write-Host "[OK]   $Msg" -ForegroundColor Green }
function Write-ErrLine { param([string]$Msg) Write-Host "[ERR]  $Msg" -ForegroundColor Red }

function Get-TrimmedString {
    param([string]$Value)
    if ($null -eq $Value) { return '' }
    return $Value.Trim()
}

Write-Host ''
Write-Host '================================================'
Write-Host '   Kandes.shop - Codex Config Installer'
Write-Host "   Base URL: $BaseUrl"
Write-Host '================================================'
Write-Host ''

# ---------- 1. Read API Key (always interactive) ----------
$apiKey = ''
while ([string]::IsNullOrEmpty($apiKey)) {
    $entered = Read-Host 'Enter your API Key'
    $apiKey = Get-TrimmedString $entered
    if ([string]::IsNullOrEmpty($apiKey)) {
        Write-ErrLine 'API Key cannot be empty'
    }
}

# ---------- 2. Write %USERPROFILE%\.codex\config.toml ----------
Write-Info 'Writing ~\.codex\config.toml...'

$codexDir = Join-Path $env:USERPROFILE '.codex'
if (-not (Test-Path -LiteralPath $codexDir)) {
    New-Item -ItemType Directory -Path $codexDir -Force | Out-Null
}

$configFile = Join-Path $codexDir 'config.toml'

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

# Merge with existing file: strip managed sections and top-level keys.
function Get-FilteredRemaining {
    param([string]$Path)

    $existing = Get-Content -LiteralPath $Path -ErrorAction SilentlyContinue
    if ($null -eq $existing) { return '' }

    $kept = New-Object System.Collections.Generic.List[string]
    $inManagedSection = $false

    foreach ($rawLine in $existing) {
        $line = $rawLine -replace "`r$", ''

        # Drop managed sections: [model_providers.KANDES], [model_providers.JY], [env]
        if ($line -match '^\s*\[model_providers\.(KANDES|JY)\]\s*$') {
            $inManagedSection = $true
            continue
        }
        if ($line -match '^\s*\[env\]\s*$') {
            $inManagedSection = $true
            continue
        }
        # If inside a managed section and hit another section → exit.
        if ($inManagedSection -and $line -match '^\s*\[[^\]]+\]\s*$') {
            $inManagedSection = $false
        }
        if ($inManagedSection) { continue }

        # Drop top-level managed keys.
        if ($line -match '^\s*model_provider\s*=')               { continue }
        if ($line -match '^\s*model\s*=\s*"(gpt-|claude-)')      { continue }
        if ($line -match '^\s*model_reasoning_effort\s*=')       { continue }
        if ($line -match '^\s*disable_response_storage\s*=')     { continue }
        if ($line -match '^\s*OPENAI_BASE_URL\s*=')              { continue }
        if ($line -match '^\s*OPENAI_API_KEY\s*=')               { continue }
        if ($line -match '^\s*name\s*=\s*"(KANDES|JY|Kandes)')   { continue }
        if ($line -match '^\s*base_url\s*=')                     { continue }
        if ($line -match '^\s*wire_api\s*=')                     { continue }
        if ($line -match '^\s*env_key\s*=')                      { continue }
        if ($line -match '^\s*requires_openai_auth\s*=')         { continue }

        $kept.Add($line) | Out-Null
    }

    # Trim leading/trailing blank lines.
    $start = 0
    $endIdx = $kept.Count - 1
    while ($start -le $endIdx -and [string]::IsNullOrWhiteSpace($kept[$start]))  { $start++ }
    while ($endIdx -ge $start -and [string]::IsNullOrWhiteSpace($kept[$endIdx])) { $endIdx-- }

    if ($start -gt $endIdx) { return '' }

    $slice = $kept.GetRange($start, $endIdx - $start + 1)
    return ($slice -join "`n")
}

if (Test-Path -LiteralPath $configFile) {
    $remaining = Get-FilteredRemaining -Path $configFile
    if (-not [string]::IsNullOrEmpty($remaining)) {
        $finalToml = "$tomlBlock`n`n$remaining`n"
    } else {
        $finalToml = "$tomlBlock`n"
    }
} else {
    $finalToml = "$tomlBlock`n"
}

# Use UTF8 without BOM to be friendly to TOML parsers.
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($configFile, $finalToml, $utf8NoBom)

Write-Ok "config.toml saved: $configFile"

# ---------- 3. Write %USERPROFILE%\.codex\auth.json ----------
Write-Info 'Writing ~\.codex\auth.json...'

$authFile = Join-Path $codexDir 'auth.json'
$authJson = "{`n  `"OPENAI_API_KEY`": `"$apiKey`"`n}`n"
[System.IO.File]::WriteAllText($authFile, $authJson, $utf8NoBom)

if ((Get-Content -LiteralPath $authFile -Raw) -like "*$apiKey*") {
    Write-Ok "auth.json saved: $authFile"
} else {
    Write-ErrLine "Failed to write auth.json. Please manually create $authFile with your API key."
}

# ---------- 4. Done ----------
$keyPreview = if ($apiKey.Length -ge 8) { $apiKey.Substring(0, 8) } else { $apiKey }

Write-Host ''
Write-Host '================================================'
Write-Host '   Setup Complete!'
Write-Host '================================================'
Write-Host ''
Write-Host ("  Base URL : {0}" -f $BaseUrl)
Write-Host ("  API Key  : {0}..." -f $keyPreview)
Write-Host ("  Config   : {0}" -f $configFile)
Write-Host ("  Auth     : {0}" -f $authFile)
Write-Host ''
Write-Host "Run 'codex' to get started."
Write-Host ''
