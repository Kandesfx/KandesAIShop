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
$ScriptVersion = '1.2.0'

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
    Write-Host ''
    $w = Get-TerminalWidth
    $inner = $w - 2
    if ($inner -lt 40) { $inner = 40 }
    $top    = '+' + ('=' * $inner) + '+'
    $blank  = '|' + (' ' * $inner) + '|'
    $bot    = '+' + ('=' * $inner) + '+'

    Write-Host $top -ForegroundColor $KandesCyan
    Write-Host $blank -ForegroundColor $KandesDark
    Write-Host $blank -ForegroundColor $KandesDark

    # Wordmark row: KANDES.SHOP // v1.1.0
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

    # Tagline row
    $tagRaw = 'AI tools marketplace  //  30-second auto-delivery'
    $tag    = Format-Center $tagRaw $inner
    Write-Host '|' -NoNewline -ForegroundColor $KandesCyan
    Write-Host $tag -NoNewline -ForegroundColor $KandesMagenta
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

function Get-SecretInput {
    param([string]$Prompt)
    $promptText = ('{0}: ' -f $Prompt)
    Write-Host $promptText -NoNewline -ForegroundColor $KandesCyan
    $sb = New-Object System.Text.StringBuilder
    while ($true) {
        $key = [Console]::ReadKey($true)
        if ($key.Key -eq 'Enter') { break }
        if ($key.Key -eq 'Escape') { [Console]::CursorVisible = $true; return '' }
        if ($key.Key -eq 'Backspace') {
            if ($sb.Length -gt 0) {
                [void]$sb.Remove($sb.Length - 1, 1)
                Write-Host ("`b `b") -NoNewline
            }
            continue
        }
        if ($key.KeyChar -eq [char]0 -or [int]$key.KeyChar -lt 32) { continue }
        [void]$sb.Append($key.KeyChar)
        Write-Host '*' -NoNewline -ForegroundColor $KandesWhite
    }
    Write-Host ''
    return $sb.ToString()
}

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

function Redraw-Menu {
    param([string]$Question, [string[]]$Options, [int]$Current)
    Write-Host ''
    Write-Host $Question -ForegroundColor $KandesWhite
    for ($i = 0; $i -lt $Options.Count; $i++) {
        $line = if ($i -eq $Current) { ('> ' + ($i + 1) + ') ' + $Options[$i]) } else { ('  ' + ($i + 1) + ') ' + $Options[$i]) }
        $color = if ($i -eq $Current) { $KandesCyan } else { $KandesDark }
        Write-Host $line -ForegroundColor $color
    }
    Write-Host ''
    Write-Host ('Use Up/Down arrows or press 1-' + $Options.Count + ' and Enter.') -ForegroundColor $KandesDark
}

function Show-Menu {
    param([string]$Question, [string[]]$Options)

    # Preflight: detect if interactive console is available (e.g. piped run).
    $isInteractive = $true
    try {
        if ([Console]::IsOutputRedirected) { $isInteractive = $false }
        if ($Host.Name -ne 'ConsoleHost') { $isInteractive = $false }
    } catch {
        $isInteractive = $false
    }

    if (-not $isInteractive) {
        # Fallback: digit-only menu (preserves original behavior for piping / CI).
        Write-Host ''
        Write-Host $Question -ForegroundColor $KandesWhite
        for ($i = 0; $i -lt $Options.Length; $i++) {
            Write-Host (('  {0}) {1}' -f ($i + 1), $Options[$i])) -ForegroundColor $KandesCyan
        }
        while ($true) {
            $raw = Read-Host -Prompt ('Choose [1-' + $Options.Length + ']')
            if ($raw -match '^\d+$' -and [int]$raw -ge 1 -and [int]$raw -le $Options.Length) {
                return [int]$raw
            }
            Write-Warn "Invalid choice: '$raw'"
        }
    }

    # Interactive: arrow-key menu.
    $current = 0
    [Console]::CursorVisible = $false
    try {
        Redraw-Menu $Question $Options $current | Out-Null
        while ($true) {
            $key = [Console]::ReadKey($true)
            $moved = $false
            if ($key.Key -eq 'UpArrow') {
                $current = if ($current -le 0) { $Options.Count - 1 } else { $current - 1 }
                $moved = $true
            } elseif ($key.Key -eq 'DownArrow') {
                $current = if ($current -ge $Options.Count - 1) { 0 } else { $current + 1 }
                $moved = $true
            } elseif ($key.Key -eq 'Enter') {
                return ($current + 1)
            } elseif ($key.KeyChar -match '^[1-9]$') {
                $n = [int]$key.KeyChar - [int]'0'
                if ($n -ge 1 -and $n -le $Options.Count) { return $n }
            } elseif ($key.Key -eq 'Escape') {
                return $Options.Count
            }
            if ($moved) {
                $curTop = [Console]::CursorTop
                $rows = $Options.Count + 4
                [Console]::SetCursorPosition(0, $curTop - $rows)
                $w = Get-TerminalWidth
                for ($r = 0; $r -lt $rows; $r++) {
                    Write-Host ((' ' * $w)) -NoNewline
                    if ($r -lt ($rows - 1)) { Write-Host '' }
                }
                [Console]::SetCursorPosition(0, $curTop - $rows)
                Redraw-Menu $Question $Options $current | Out-Null
            }
        }
    } finally {
        [Console]::CursorVisible = $true
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
model = "gpt-5.6-terra"
model_reasoning_effort = "high"
disable_response_storage = true


[model_providers.KANDES]
name = "KANDES"
base_url = "$BaseUrl"
wire_api = "responses"
env_key = "OPENAI_API_KEY"
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

    # auth.json (use a real JSON object so OPENAI_API_KEY stays on one line)
    $authObj = @{ OPENAI_API_KEY = $ApiKey }
    $authJson = ($authObj | ConvertTo-Json -Depth 5) + "`n"
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

    # Merge Kandes env vars (Kandes values win - they are the ones we are configuring).
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

    # Body lines inside the card
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
    $tip1 = "  Run 'codex' or 'claude' to get started."
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
Write-Step 1 @('Choose tool', 'Enter API key', 'Write config', 'Verify')

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

Write-Step 2 @('Choose tool', 'Enter API key', 'Write config', 'Verify')
$apiKey = Get-ApiKey

Write-Step 3 @('Choose tool', 'Enter API key', 'Write config', 'Verify')

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

Write-Step 4 @('Choose tool', 'Enter API key', 'Write config', 'Verify')