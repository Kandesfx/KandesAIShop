#requires -Version 5.1
$ErrorActionPreference = 'Stop'

$scriptPath = 'D:\Hai\Work\KandesAIShop\public\install\codex\codex-config-kandes.ps1'
$tmpRoot    = Join-Path $env:TEMP ("kandes-verify-claude-" + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tmpRoot -Force | Out-Null
$claudeDir = Join-Path $tmpRoot '.claude'

$content = Get-Content -LiteralPath $scriptPath -Raw
$content = $content -replace '\$env:USERPROFILE', "'$tmpRoot'"

# Strip interactive menu.
$marker = '#  Main'
$idx = $content.IndexOf($marker)
if ($idx -gt 0) { $content = $content.Substring(0, $idx) }

$tmpScript = Join-Path $tmpRoot 'installer-headless.ps1'
[System.IO.File]::WriteAllText($tmpScript, $content, [System.Text.UTF8Encoding]::new($false))

. $tmpScript
Write-ClaudeConfig -BaseUrl 'https://api.kandes.shop/v1' -ApiKey 'sk-jy-cc-testXYZ123' | Out-Null

$settingsFile = Join-Path $claudeDir 'settings.json'

Write-Host ''
Write-Host '----- ~/.claude/settings.json -----'
if (Test-Path $settingsFile) {
    Get-Content -LiteralPath $settingsFile -Raw
} else {
    Write-Host 'MISSING' -ForegroundColor Red
}

Write-Host ''
Write-Host '----- JSON validity + env block -----'
if (Test-Path $settingsFile) {
    try {
        $obj = Get-Content -LiteralPath $settingsFile -Raw | ConvertFrom-Json
        Write-Host '[OK] settings.json parses as valid JSON' -ForegroundColor Green
        foreach ($key in @('ANTHROPIC_BASE_URL','ANTHROPIC_API_KEY','ANTHROPIC_AUTH_TOKEN','CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC')) {
            $val = $obj.env.$key
            if ($null -ne $val -and $val.Length -gt 0) {
                $preview = if ($val.Length -gt 12) { $val.Substring(0,12) + '...' } else { $val }
                Write-Host ("  [OK]   env.$key = $preview") -ForegroundColor Green
            } else {
                Write-Host ("  [FAIL] env.$key missing") -ForegroundColor Red
            }
        }
    } catch {
        Write-Host ("settings.json INVALID: " + $_.Exception.Message) -ForegroundColor Red
    }
}

Remove-Item -LiteralPath $tmpRoot -Recurse -Force
