@echo off
title TidyUps Cleaning (app.tidyupscleaning.com) - 1-Click Build & Launch
color 0A

echo ============================================================================
echo   TIDYUPS CLEANING SERVICE INC. (app.tidyupscleaning.com)
echo   1-CLICK FULL PROJECT INSTALL, BUILD ^& LAUNCHER (WINDOWS)
echo ============================================================================
echo.
echo   Included Bots ^& Modules:
echo    [1] Jobber CRM OAuth 2.0, GraphQL 2-Way Sync ^& Webhook Bot
echo    [2] Facebook Messenger 24/7 AI Quote ^& Lead Intake Bot (3 Pages)
echo    [3] Voice Dictation ^& Gemini AI Instant Phone Quote Bot
echo    [4] Quo (OpenPhone) 6-Line Call Transcript ^& Sonia AI Lead Bot
echo    [5] Twilio Bam Shield / Spam Shield ^& Live Incoming Call Screener Bot
echo    [6] 9-Tab Visual Clean Google Sheets ^& Meta/Google Ads Webhook Bot
echo    [7] Public Routes: /booking, /support, /contact, /T^&C, /privacy
echo ============================================================================
echo.

cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js is not installed on this computer.
    echo Please download and install Node.js LTS from: https://nodejs.org/
    echo After installing Node.js, double-click this button again!
    pause
    exit /b 1
)

if not exist ".env" (
    if exist ".env.example" (
        echo [INFO] Creating initial .env configuration from .env.example...
        copy /Y ".env.example" ".env" >nul
    )
)

echo [STEP 1/3] Installing all project dependencies (npm install)...
call npm install
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] npm install encountered an issue. Please check your internet connection.
    pause
    exit /b 1
)

echo.
echo [STEP 2/3] Building production frontend ^& server bundle (npm run build)...
call npm run build
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Production build failed. Trying development server mode...
    start "" "http://localhost:3000"
    call npm run dev
    pause
    exit /b 1
)

echo.
echo [STEP 3/3] Build succeeded! Starting TidyUps Cleaning Server on http://localhost:3000 ...
echo Opening http://localhost:3000 in your default web browser...
start "" "http://localhost:3000"
call npm start

pause
