#!/usr/bin/env pwsh
# scripts/setup-db.ps1 - Khoi tao database local cho Kandes.shop
# Usage: .\scripts\setup-db.ps1
#
# Luu y: File nay CAN duoc save voi encoding UTF-8 WITH BOM
# de PowerShell 5+ parse cac ky tu co dau. Trong VSCode:
#   bottom-right > "UTF-8 with BOM" (chon "Save with Encoding")

$ErrorActionPreference = 'Stop'
$script:DockerNotRunning = $false

# Mau output (ASCII de tuong thich moi PowerShell)
function Write-Info($msg)    { Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Success($msg) { Write-Host "[OK]   $msg" -ForegroundColor Green }
function Write-Warn($msg)    { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg)     { Write-Host "[ERR]  $msg" -ForegroundColor Red }

Write-Info "Kandes.shop - Setup database local"
Write-Host ""

# 1. Check Docker
Write-Info "Kiem tra Docker..."
try {
    docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw }
    Write-Success "Docker daemon OK"
} catch {
    Write-Warn "Docker chua chay. Huong dan:"
    Write-Host ""
    Write-Host "  1. Mo Docker Desktop va doi icon xanh"
    Write-Host "  2. Chay lai script nay, HOAC"
    Write-Host "  3. Dung Postgres cloud mien phi - xem script setup-cloud-db.ps1"
    Write-Host ""
    $script:DockerNotRunning = $true
}

if (-not $script:DockerNotRunning) {
    # 2. Check if 'postgres' service exists in docker-compose
    $composeHasPostgres = $false
    try {
        $composeConfig = docker compose config --services 2>$null
        if ($LASTEXITCODE -eq 0 -and ($composeConfig | Where-Object { $_ -eq 'postgres' })) {
            $composeHasPostgres = $true
        }
    } catch {}

    if ($composeHasPostgres) {
        # 2a. Start container
        Write-Info "Khoi dong Postgres container..."
        docker compose up -d postgres 2>&1 | Out-Null

        # 2b. Wait for healthy
        Write-Info "Doi Postgres ready..."
        $maxAttempts = 30
        $attempt = 0
        while ($attempt -lt $maxAttempts) {
            $attempt++
            $status = docker inspect --format='{{.State.Health.Status}}' kandes-postgres 2>$null
            if ($status -eq 'healthy') { break }
            Start-Sleep -Seconds 1
        }
        if ($status -eq 'healthy') {
            Write-Success "Postgres ready"
        } else {
            Write-Warn "Postgres co the chua ready, thu tiep..."
        }
    } else {
        Write-Warn "Khong tim thay service 'postgres' trong docker-compose.yml."
        Write-Host ""
        Write-Host "  Production setup (D60 — EC2) dung RDS, Docker Compose chi co app + nginx." -ForegroundColor Yellow
        Write-Host "  De dev local: chay '.\scripts\setup-cloud-db.ps1' de dung Neon/Supabase free tier." -ForegroundColor Yellow
        Write-Host ""
        # Verify .env DATABASE_URL — neu co thi dung, neu khong thi dung lai huong dan.
        if (-not (Test-Path '.env')) {
            Write-Info "Tao .env tu .env.example..."
            Copy-Item '.env.example' '.env'
            Write-Success "Da tao .env"
        }
    }
}

# 4. Check .env
if (-not (Test-Path '.env')) {
    Write-Info "Tao .env tu .env.example..."
    Copy-Item '.env.example' '.env'
    Write-Success "Da tao .env"
}

# 5. Run migration
Write-Info "Ap dung Prisma migration..."
try {
    npx prisma migrate dev --name init_schema 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Migration OK"
    } else {
        Write-Warn "Migration failed - kiem tra log o tren"
    }
} catch {
    Write-Err "Migration exception: $_"
}

# 6. Seed
Write-Info "Seed data..."
try {
    npx prisma db seed 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Seed OK"
        Write-Host ""
        Write-Host "  > Admin email:     admin@kandes.shop" -ForegroundColor Yellow
        Write-Host "  > Admin password:  Admin@123" -ForegroundColor Yellow
        Write-Host "  ! DOI PASSWORD SAU KHI LOGIN DAU TIEN!" -ForegroundColor Red
    } else {
        Write-Warn "Seed failed - kiem tra log o tren"
    }
} catch {
    Write-Err "Seed exception: $_"
}

Write-Host ""
Write-Success "Setup hoan tat!"
Write-Info "Chay 'npm run dev' de khoi dong server"
