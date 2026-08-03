@echo off
title NSE Analytics Dashboard - Simple Mode (No Standalone)
echo ============================================
echo   NSE Analytics - Simple Build (no standalone)
echo ============================================
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Install from https://nodejs.org/
    pause
    exit /b 1
)

echo [1/3] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
)
echo.

:: Temporarily disable standalone for this build
echo [2/3] Building in standard mode...
set STANDALONE=false
call npx next build
if %errorlevel% neq 0 (
    echo [ERROR] Build failed.
    pause
    exit /b 1
)
echo.

echo [3/3] Starting server on http://localhost:3000
echo Press Ctrl+C to stop.
echo ============================================
echo.

call npx next start -p 3000
pause
