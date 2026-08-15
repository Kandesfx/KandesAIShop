#requires -Version 5.1
$ErrorActionPreference = 'Stop'

$scriptPath = 'D:\Hai\Work\KandesAIShop\public\install\codex\codex-config-kandes.ps1'
$tmpRoot    = Join-Path $env:TEMP ("kandes-verify-" + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tmpRoot -Force | Out-Null
$codexDir   = Join-Path $tmpRoot '.codex'

$content = Get-Content -LiteralPath $scriptPath -Raw
$content = $content -replace '\$env:USERPROFILE', "'$tmpRoot'"

# Strip everything from "#  Main" header to EOF (the interactive menu).
$marker = '#  Main'
$idx = $content.IndexOf($marker)
if ($idx -gt 0) { $content = $content.Substring(0, $idx) }

$tmpScript = Join-Path $tmpRoot 'installer-headless.ps1'
[System.IO.File]::WriteAllText($tmpScript, $content, [System.Text.UTF8Encoding]::new($false))

. $tmpScript
Write-CodexConfig -BaseUrl 'https://api.kandes.shop/v1' -ApiKey 'sk-jy-cx-test-ABCDEFGH' | Out-Null

$toml = Join-Path $codexDir 'config.toml'
$json = Join-Path $codexDir 'auth.json'

Write-Host ''
Write-Host '----- config.toml -----'
if (Test-Path $toml) { Get-Content -LiteralPath $toml -Raw } else { Write-Host 'MISSING' -ForegroundColor Red }

Write-Host ''
Write-Host '----- auth.json -----'
if (Test-Path $json) { Get-Content -LiteralPath $json -Raw } else { Write-Host 'MISSING' -ForegroundColor Red }

Write-Host ''
Write-Host '----- JSON validity -----'
if (Test-Path $json) {
    try {
        $obj = Get-Content -LiteralPath $json -Raw | ConvertFrom-Json
        $preview = if ($obj.OPENAI_API_KEY.Length -ge 8) { $obj.OPENAI_API_KEY.Substring(0,8) } else { $obj.OPENAI_API_KEY }
        Write-Host ("auth.json parses OK. OPENAI_API_KEY preview: " + $preview + "...") -ForegroundColor Green
    } catch {
        Write-Host ("auth.json INVALID: " + $_.Exception.Message) -ForegroundColor Red
    }
}

Write-Host ''
Write-Host '----- TOML sanity (verifying the fix) -----'
$tomlText = Get-Content -LiteralPath $toml -Raw
$must_have = @(
    'model_provider = "KANDES"',
    '[model_providers.KANDES]',
    'base_url = "https://api.kandes.shop/v1"',
    'wire_api = "responses"',
    'env_key = "OPENAI_API_KEY"'
)
$must_not_have = @(
    'requires_openai_auth'
)
foreach ($needle in $must_have) {
    if ($tomlText -match [regex]::Escape($needle)) {
        Write-Host ("  [OK]    has: " + $needle) -ForegroundColor Green
    } else {
        Write-Host ("  [MISS]  missing: " + $needle) -ForegroundColor Red
    }
}
foreach ($needle in $must_not_have) {
    if ($tomlText -match [regex]::Escape($needle)) {
        Write-Host ("  [FAIL]  still present (should be removed): " + $needle) -ForegroundColor Red
    } else {
        Write-Host ("  [OK]    removed: " + $needle) -ForegroundColor Green
    }
}

Remove-Item -LiteralPath $tmpRoot -Recurse -Force
