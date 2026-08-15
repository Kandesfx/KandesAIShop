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
$KandesBaseUrl = 'https://api.kandes.shop'
$KandesBrand   = 'Kandes.shop'
$ScriptVersion = '1.3.1'

# -----------------------------------------------------------------------------
#  Brand palette (Kandes design tokens mapped to console colors)
# -----------------------------------------------------------------------------
$KandesCyan     = 'Cyan'       # accent #00E5FF
$KandesMagenta  = 'Magenta'    # secondary
$KandesDark     = 'DarkGray'   # borders, pending
$KandesWhite    = 'White'      # active text
$KandesGreen    = 'Green'      # ok / success
$KandesYellow   = 'Yellow'     # warn
$KandesRed      = 'Red'        # err
$KandesGray     = 'DarkGray'   # muted hints

# -----------------------------------------------------------------------------
#  Pretty helpers
# -----------------------------------------------------------------------------
function Get-TerminalWidth {
    try { return [Math]::Max(60, [Console]::WindowWidth) }
    catch { return 80 }
}

function Format-Center {
    param([string]$Text, [int]$Width)
    if ($Text.Length -ge $Width) { return $Text.Substring(0, $Width) }
    $total = $Width - $Text.Length
    $left  = [int]($total / 2)
    $right = $total - $left
    return (' ' * $left) + $Text + (' ' * $right)
}

function Write-Banner {
    $w = Get-TerminalWidth
    $inner = $w - 2
    if ($inner -lt 40) { $inner = 40 }
    $top    = '+' + ('=' * $inner) + '+'
    $blank  = '|' + (' ' * $inner) + '|'
    $bot    = '+' + ('=' * $inner) + '+'

    Write-Host ''
    Write-Host $top -ForegroundColor $KandesCyan
    Write-Host $blank -ForegroundColor $KandesDark
    Write-Host $blank -ForegroundColor $KandesDark

    # Wordmark row: KANDES.SHOP // v1.2.0
    $headRaw = 'KANDES.SHOP  //  v' + $ScriptVersion
    $head    = Format-Center $headRaw $inner
    $leftPad = $head.IndexOf('KANDES.SHOP')
    if ($leftPad -lt 0) { $leftPad = 0 }
    $sepIdx  = $head.IndexOf('//', $leftPad)
    if ($sepIdx -lt 0) { $sepIdx = $leftPad + 'KANDES.SHOP  '.Length }

    Write-Host '|' -NoNewline -ForegroundColor $KandesCyan
    Write-Host ($head.Substring(0, $leftPad)) -NoNewline -ForegroundColor $KandesDark
    Write-Host 'KANDES.SHOP' -NoNewline -ForegroundColor $KandesCyan
    Write-Host ($head.Substring($leftPad + 'KANDES.SHOP'.Length, $sepIdx - ($leftPad + 'KANDES.SHOP'.Length))) -NoNewline -ForegroundColor $KandesDark
    Write-Host '//' -NoNewline -ForegroundColor $KandesMagenta
    Write-Host ($head.Substring($sepIdx + 2)) -NoNewline -ForegroundColor $KandesWhite
    Write-Host '|' -ForegroundColor $KandesCyan

    # Subtitle row: Claude Code Installer
    $subRaw = 'Claude Code Installer'
    $sub    = Format-Center $subRaw $inner
    Write-Host '|' -NoNewline -ForegroundColor $KandesCyan
    Write-Host $sub -NoNewline -ForegroundColor $KandesWhite
    Write-Host '|' -ForegroundColor $KandesCyan

    # Base URL row
    $urlRaw = 'Base URL: ' + $KandesBaseUrl
    $url    = Format-Center $urlRaw $inner
    $urlIdx = $url.IndexOf('Base URL:')
    $leftPadUrl = if ($urlIdx -lt 0) { 0 } else { $urlIdx }
    Write-Host '|' -NoNewline -ForegroundColor $KandesCyan
    Write-Host ($url.Substring(0, $leftPadUrl)) -NoNewline -ForegroundColor $KandesDark
    Write-Host 'Base URL:' -NoNewline -ForegroundColor $KandesDark
    Write-Host ($url.Substring($leftPadUrl + 'Base URL:'.Length)) -NoNewline -ForegroundColor $KandesCyan
    Write-Host '|' -ForegroundColor $KandesCyan

    Write-Host $blank -ForegroundColor $KandesDark
    Write-Host $bot -ForegroundColor $KandesCyan
    Write-Host ''
}

function Write-Section {
    param([string]$Title)
    Write-Host ''
    Write-Host (('-- ' + $Title + ' ').PadRight(60, '-')) -ForegroundColor $KandesMagenta
}

function Write-Info    { param([string]$Msg) Write-Host ('[INFO] ' + $Msg) -ForegroundColor $KandesCyan }
function Write-Ok      { param([string]$Msg) Write-Host ('[OK]   ' + $Msg) -ForegroundColor $KandesGreen }
function Write-Warn    { param([string]$Msg) Write-Host ('[WARN] ' + $Msg) -ForegroundColor $KandesYellow }
function Write-ErrLine { param([string]$Msg) Write-Host ('[ERR]  ' + $Msg) -ForegroundColor $KandesRed }
function Write-Bullet  { param([string]$Msg) Write-Host ('  ' + [char]0x25B8 + ' ' + $Msg) -ForegroundColor $KandesDark }

function Write-Step {
    param([int]$Current, [string[]]$Labels)
    $count = $Labels.Length
    for ($i = 0; $i -lt $count; $i++) {
        $num = $i + 1
        $text = ('[{0}. {1}]' -f $num, $Labels[$i])
        $color = if ($num -lt $Current) { $KandesGreen } elseif ($num -eq $Current) { $KandesCyan } else { $KandesDark }
        if ($i -gt 0) { Write-Host ' -> ' -NoNewline -ForegroundColor $KandesMagenta }
        Write-Host $text -NoNewline -ForegroundColor $color
    }
    Write-Host ''
}


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
#  Logic: identical to codex-config-kandes.ps1::Write-ClaudeConfig - preserved
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

    # Merge Kandes env vars (Kandes values win - they are the ones we are configuring).
    $existing['env']['ANTHROPIC_BASE_URL']                    = $BaseUrl
    $existing['env']['ANTHROPIC_API_KEY']                     = $ApiKey
    $existing['env']['ANTHROPIC_AUTH_TOKEN']                  = $ApiKey
    $existing['env']['CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC'] = '1'

    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    $json      = ($existing | ConvertTo-Json -Depth 10) -replace '    ', '  '
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
    Write-Host 'Enter your Kandes API key (paste then press Enter).' -ForegroundColor $KandesDark
    Write-Host 'Find it in your dashboard: https://kandes.shop/account'  -ForegroundColor $KandesDark
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

    # Render a bordered card. Width adapts to terminal size.
    $w = Get-TerminalWidth
    $inner = $w - 2
    if ($inner -lt 40) { $inner = 40 }
    $top    = '+' + ('-' * $inner) + '+'
    $blank  = '|' + (' ' * $inner) + '|'

    Write-Host ''
    Write-Host $top -ForegroundColor $KandesCyan
    Write-Host $blank -ForegroundColor $KandesDark

    $bodyLines = @(
        @{ Text = ('  Installed for : ' + $InstalledFor); Color = $KandesWhite }
        @{ Text = ('  Base URL      : ' + $KandesBaseUrl); Color = $KandesCyan }
        @{ Text = ('  API Key       : ' + $preview);      Color = $KandesDark }
    )
    foreach ($row in $bodyLines) {
        $line = $row.Text
        if ($line.Length -gt $inner) { $line = $line.Substring(0, $inner) }
        $padding = $inner - $line.Length
        Write-Host '|' -NoNewline -ForegroundColor $KandesCyan
        Write-Host $line -NoNewline -ForegroundColor $row.Color
        Write-Host ((' ' * $padding) + '|') -ForegroundColor $KandesCyan
    }

    Write-Host $blank -ForegroundColor $KandesDark
    Write-Host '|' -NoNewline -ForegroundColor $KandesCyan
    $tip1 = "  Run 'claude' to get started."
    if ($tip1.Length -gt ($inner - 3)) { $tip1 = $tip1.Substring(0, $inner - 3) }
    Write-Host $tip1 -NoNewline -ForegroundColor $KandesDark
    Write-Host ((' ' * ($inner - $tip1.Length)) + '|') -ForegroundColor $KandesCyan

    Write-Host '|' -NoNewline -ForegroundColor $KandesCyan
    $tip2 = '  Need help? https://kandes.shop/docs/api'
    if ($tip2.Length -gt ($inner - 3)) { $tip2 = $tip2.Substring(0, $inner - 3) }
    Write-Host $tip2 -NoNewline -ForegroundColor $KandesDark
    Write-Host ((' ' * ($inner - $tip2.Length)) + '|') -ForegroundColor $KandesCyan

    Write-Host $top -ForegroundColor $KandesCyan
    Write-Host ''
}

# -----------------------------------------------------------------------------
#  Main
# -----------------------------------------------------------------------------
Write-Banner
Write-Step 1 @('Enter API key', 'Write config', 'Verify')

# Support --ApiKey for non-interactive use
$apiKey = $null
foreach ($arg in $args) {
    if ($arg -like '--ApiKey=*') { $apiKey = $arg.Substring('--ApiKey='.Length) }
    elseif ($arg -like '-k=*')    { $apiKey = $arg.Substring('-k='.Length) }
}
if ($null -eq $apiKey) { $apiKey = Get-ApiKey }

Write-Step 2 @('Enter API key', 'Write config', 'Verify')

if (-not (Write-ClaudeConfig -BaseUrl $KandesBaseUrl -ApiKey $apiKey)) { exit 1 }

Write-Step 3 @('Enter API key', 'Write config', 'Verify')
Show-Summary 'Claude Code' $apiKey
