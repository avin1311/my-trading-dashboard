@echo off
title NSE Analytics Dashboard - Windows Launcher
echo ============================================
echo   NSE Analytics Dashboard - Windows Starter
echo ============================================
echo.

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check npm
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed or not in PATH.
    pause
    exit /b 1
)

echo [1/4] Node.js version:
node --version
echo.

echo [2/4] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed. Try deleting node_modules and package-lock.json, then retry.
    pause
    exit /b 1
)
echo.

echo [3/4] Building project (standalone + static assets copy)...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build failed. Check the error messages above.
    pause
    exit /b 1
)
echo.

:: Verify critical files exist
if not exist ".next\standalone\server.js" (
    echo [ERROR] standalone server.js not found. Build may have failed silently.
    pause
    exit /b 1
)
if not exist ".next\standalone\.next\server\app\page.js" (
    echo [ERROR] App pages not found in standalone build.
    echo Trying manual copy of .next/server to .next/standalone/.next/server...
    xcopy /E /I /Y ".next\server" ".next\standalone\.next\server"
)
if not exist ".next\standalone\.next\static" (
    echo [WARNING] Static assets missing. Copying now...
    xcopy /E /I /Y ".next\static" ".next\standalone\.next\static"
)
if not exist ".next\standalone\public" (
    echo [WARNING] Public folder missing. Copying now...
    xcopy /E /I /Y "public" ".next\standalone\public"
)

echo [4/4] Starting server on http://localhost:3000
echo Press Ctrl+C to stop the server.
echo ============================================
echo.

node .next\standalone\server.js
pause
