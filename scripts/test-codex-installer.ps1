# Test codex-config-kandes.ps1 by invoking the installer non-interactively.
# Strategy:
#   1. Create a temp USERPROFILE dir with a legacy ~/.codex/config.toml.
#   2. Override Get-CodexDir/Get-ClaudeDir by manipulating $env:USERPROFILE before sourcing.
#   3. Use ScriptRunner via -File with --ApiKey, redirect stdin to skip the menu.
#
# Simpler: import only the Write-CodexConfig function from the installer, call it
# directly with a custom HOME. We do this by extracting the function body via a
# minimal copy of the installer at runtime.

$testDir = Join-Path $env:TEMP ("kandes-test-ps1-" + (Get-Date -Format 'yyyyMMdd-HHmmss'))
$codexDir = Join-Path $testDir ".codex"
New-Item -ItemType Directory -Force -Path $codexDir | Out-Null

# Legacy config (v1.x)
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

# Write a small driver script that sources installer + sets USERPROFILE.
# We can't easily mock USERPROFILE so we source installer normally, but check
# output for our temp dir by copying the config to the user's real HOME
# temporarily for the duration of this test.

$realHome = $env:USERPROFILE
$backupDir = Join-Path $realHome ".codex.bak-test"
if (Test-Path $backupDir) { Remove-Item -Recurse -Force $backupDir }
$realCodexDir = Join-Path $realHome ".codex"
if (Test-Path $realCodexDir) {
  Move-Item $realCodexDir $backupDir -Force
}
else {
  New-Item -ItemType Directory -Force -Path (Join-Path $realHome ".codex") | Out-Null
}

# Copy test config to real ~/.codex
Copy-Item -Recurse -Force $codexDir "$realHome/.codex"

try {
  # The installer prompts for tool selection interactively. In non-interactive
  # shell it falls back to digit-only menu. Feed "1`n" via input redirection.
  $env:_KANDES_TEST_APIKEY = "ks-test-1234567890abcdef"
  $input  = "1`n"           # choose Codex CLI only
  $input += "$env:_KANDES_TEST_APIKEY`n"  # paste API key

  # Run installer with stdin piped.
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = "powershell.exe"
  $psi.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$PSScriptRoot\..\public\install\codex\codex-config-kandes.ps1`""
  $psi.RedirectStandardInput = $true
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.UseShellExecute = $false

  $p = [System.Diagnostics.Process]::Start($psi)
  $p.StandardInput.WriteLine("1")
  $p.StandardInput.WriteLine("ks-test-1234567890abcdef")
  $p.StandardInput.Close()
  $out = $p.StandardOutput.ReadToEnd()
  $err = $p.StandardError.ReadToEnd()
  $p.WaitForExit()
  Write-Host "STDOUT: $out"
  if ($err) { Write-Host "STDERR: $err" -ForegroundColor Yellow }
  Write-Host "ExitCode: $($p.ExitCode)"
}
finally {
  if (Test-Path (Join-Path $realHome '.codex')) {
    Remove-Item -Recurse -Force (Join-Path $realHome '.codex')
  }
  if (Test-Path $backupDir) {
    Move-Item $backupDir $realCodexDir -Force
  }
  Remove-Item -Recurse -Force $testDir
}

Write-Host ""
Write-Host "=== Verify ~/.codex/config.toml ===" -ForegroundColor Cyan
if (Test-Path (Join-Path $realHome '.codex/config.toml')) {
  Get-Content (Join-Path $realHome '.codex/config.toml') -Raw
  $toml = Get-Content (Join-Path $realHome '.codex/config.toml') -Raw
  $tests = @(
    @{n = 'Built-in openai provider';          p = $toml -match 'model_provider = "openai"'},
    @{n = 'Has [env] table';                   p = $toml -match '\[env\]'},
    @{n = 'OPENAI_BASE_URL set';              p = $toml -match 'OPENAI_BASE_URL = "https://api.kandes.shop/v1"'},
    @{n = 'OPENAI_API_KEY set';               p = $toml -match 'OPENAI_API_KEY = "ks-test-'},
    @{n = 'Old KANDES section stripped';      p = -not ($toml -match 'model_providers\.KANDES')},
    @{n = 'Old model_provider=KANDES stripped'; p = -not ($toml -match 'model_provider = "KANDES"')},
    @{n = 'User custom setting preserved';     p = $toml -match 'approval_policy = "on-request"'}
  )
  $pass=0; $fail=0
  foreach ($t in $tests) {
    $m = if ($t.p) { "[OK]  " } else { "[FAIL]" }
    Write-Host "$m $($t.n)"
    if ($t.p) { $pass++ } else { $fail++ }
  }
  Write-Host ""
  Write-Host "Summary: $pass passed, $fail failed"
  exit $fail
} else {
  Write-Host "[FAIL] config.toml was not created" -ForegroundColor Red
  exit 1
}
