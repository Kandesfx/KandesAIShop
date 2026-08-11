<#
.SYNOPSIS
    Interactive helper to set up Google Drive OAuth on EC2.
    NOTE: This requires browser-based OAuth — user must run it themselves.
#>

$ErrorActionPreference = 'Continue'

$KeyPath = Join-Path $PSScriptRoot 'kandes-prod-key.pem'
$RemoteUser = 'ec2-user'
$RemoteHost = '13.215.39.207'

$sshCandidates = @(
    'C:\Windows\System32\OpenSSH\ssh.exe',
    'C:\Program Files\Git\usr\bin\ssh.exe'
)
$ssh = $sshCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
$knownHostsFile = Join-Path $env:USERPROFILE '.ssh\kandes_known_hosts'

$sshArgs = @(
    '-i', $KeyPath
    '-o', 'BatchMode=yes'
    '-o', 'StrictHostKeyChecking=accept-new'
    '-o', 'ConnectTimeout=10'
    '-o', "UserKnownHostsFile=`"$knownHostsFile`""
    '-tt'
    "$RemoteUser@$RemoteHost"
)

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " Interactive: Google Drive OAuth Setup for EC2 rclone" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "WHAT THIS DOES:" -ForegroundColor Yellow
Write-Host "  Opens an interactive SSH session where you run 'rclone config' to"
Write-Host "  authorize rclone with your Google Drive account. After this,"
Write-Host "  the daily db-backup cron will sync .sql.gz files to your Drive."
Write-Host ""
Write-Host "STEPS YOU NEED TO DO ONCE:" -ForegroundColor Yellow
Write-Host "  1. Type 'rclone config' at the prompt"
Write-Host "  2. Enter 'n' for New remote"
Write-Host "  3. Enter name: gdrive"
Write-Host "  4. Enter type: drive"
Write-Host "  5. Leave client_id / client_secret / scope blank (press Enter)"
Write-Host "  6. service_account_file: Enter"
Write-Host "  7. edit_advanced: Enter"
Write-Host "  8. When asked 'Use web browser to automatically authenticate?'"
Write-Host "     answer 'y' (a browser URL will open)"
Write-Host "  9. Sign in to your Google account, allow rclone access"
Write-Host " 10. After redirect, paste the verification code back"
Write-Host " 11. Choose 'y' to keep remote, 'q' to quit config"
Write-Host " 12. Type 'exit' to close SSH session"
Write-Host ""
Write-Host "AFTER THIS, test:" -ForegroundColor Yellow
Write-Host "  rclone ls gdrive:"
Write-Host "  (should list your Drive folders)"
Write-Host ""
Write-Host "Press Enter to start SSH session..." -ForegroundColor Green
Read-Host | Out-Null

& $ssh @sshArgs 'rclone config'