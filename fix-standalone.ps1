# NSE Analytics Dashboard - PowerShell Fix & Start Script
# Run: powershell -ExecutionPolicy Bypass -File fix-standalone.ps1

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  NSE Analytics - Standalone Fix Script" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js not found. Install from https://nodejs.org/" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "[OK] Node.js: $(node --version)" -ForegroundColor Green

# Step 1: Clean previous build
Write-Host ""
Write-Host "[1/5] Cleaning previous build..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host "  Removed .next/" -ForegroundColor Gray
}

# Step 2: Install dependencies
Write-Host "[2/5] Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] npm install failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "  Dependencies installed." -ForegroundColor Green

# Step 3: Build
Write-Host "[3/5] Building project..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Build failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "  Build complete." -ForegroundColor Green

# Step 4: Verify standalone integrity
Write-Host "[4/5] Verifying standalone build..." -ForegroundColor Yellow

$checks = @(
    @{ Path = ".next\standalone\server.js"; Label = "Server entry point" },
    @{ Path = ".next\standalone\.next\server\app\page.js"; Label = "Main page route" },
    @{ Path = ".next\standalone\.next\static"; Label = "Static assets" },
    @{ Path = ".next\standalone\public"; Label = "Public folder" }
)

$allGood = $true
foreach ($check in $checks) {
    if (Test-Path $check.Path) {
        Write-Host "  [OK] $($check.Label): $($check.Path)" -ForegroundColor Green
    } else {
        Write-Host "  [MISSING] $($check.Label): $($check.Path)" -ForegroundColor Red
        $allGood = $false
    }
}

if (-not $allGood) {
    Write-Host ""
    Write-Host "[FIX] Attempting manual copy of missing assets..." -ForegroundColor Yellow
    
    # Copy server app data if missing
    if (-not (Test-Path ".next\standalone\.next\server\app\page.js")) {
        if (Test-Path ".next\server") {
            Copy-Item -Recurse -Force ".next\server" ".next\standalone\.next\server"
            Write-Host "  Copied .next/server -> standalone" -ForegroundColor Gray
        }
    }
    
    # Copy static if missing
    if (-not (Test-Path ".next\standalone\.next\static")) {
        if (Test-Path ".next\static") {
            Copy-Item -Recurse -Force ".next\static" ".next\standalone\.next\static"
            Write-Host "  Copied .next/static -> standalone" -ForegroundColor Gray
        }
    }
    
    # Copy public if missing
    if (-not (Test-Path ".next\standalone\public")) {
        if (Test-Path "public") {
            Copy-Item -Recurse -Force "public" ".next\standalone\public"
            Write-Host "  Copied public/ -> standalone" -ForegroundColor Gray
        }
    }
}

# Step 5: Start
Write-Host ""
Write-Host "[5/5] Starting server on http://localhost:3000" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop." -ForegroundColor Gray
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

node .next\standalone\server.js
