#requires -Version 5.1
$ErrorActionPreference = 'Stop'

$scriptPath = 'D:\Hai\Work\KandesAIShop\public\install\codex\codex-config-kandes.ps1'
$tmpRoot    = Join-Path $env:TEMP ("codex-test-" + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tmpRoot -Force | Out-Null
$codexDir   = Join-Path $tmpRoot '.codex'

$content = Get-Content -LiteralPath $scriptPath -Raw
$content = $content -replace '\$env:USERPROFILE', "'$tmpRoot'"

# Trim everything from the top-level menu entrypoint through the final "Run 'codex'" line.
# The installer exits when the menu block returns, so we delete from "# ---------- 3. Main Menu ----------" to EOF.
$marker = '#  Main'
$idx = $content.IndexOf($marker)
if ($idx -gt 0) { $content = $content.Substring(0, $idx) }

$tmpScript = Join-Path $tmpRoot 'installer-headless.ps1'
[System.IO.File]::WriteAllText($tmpScript, $content, [System.Text.UTF8Encoding]::new($false))

# Sanity-check: script must NOT contain Read-Host or Start-Menu anymore.
if ($content -match 'Read-Host|Start-Menu') {
    Write-Host 'Strip did not fully remove menu; aborting.' -ForegroundColor Red
    Get-Content -LiteralPath $tmpScript | Select-Object -Skip 400
    exit 1
}

. $tmpScript
Write-CodexConfig -BaseUrl 'https://api.kandes.shop/v1' -ApiKey 'sk-test-abc123XYZ' | Out-Null

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
Write-Host '----- TOML sanity -----'
$tomlText = Get-Content -LiteralPath $toml -Raw
foreach ($needle in 'model_provider', 'model = "gpt-5.4"', '[model_providers.KANDES]', 'base_url', 'wire_api = "responses"', 'requires_openai_auth = true') {
    if ($tomlText -match [regex]::Escape($needle)) {
        Write-Host ("  [OK]     $needle") -ForegroundColor Green
    } else {
        Write-Host ("  [MISS]   $needle") -ForegroundColor Red
    }
}

Remove-Item -LiteralPath $tmpRoot -Recurse -Force
