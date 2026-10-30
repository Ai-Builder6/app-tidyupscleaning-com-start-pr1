#!/usr/bin/env bash
# ============================================================================
# TIDYUPS CLEANING SERVICE INC. (app.tidyupscleaning.com)
# 1-CLICK FULL PROJECT INSTALL, BUILD & LAUNCHER (macOS / Linux)
# ============================================================================

set -e
cd "$(dirname "$0")"

echo "============================================================================"
echo "  TIDYUPS CLEANING SERVICE INC. (app.tidyupscleaning.com)"
echo "  1-CLICK FULL PROJECT INSTALL, BUILD & LAUNCHER (macOS / Linux)"
echo "============================================================================"
echo ""
echo "  Included Bots & Modules:"
echo "   [1] Jobber CRM OAuth 2.0, GraphQL 2-Way Sync & Webhook Bot"
echo "   [2] Facebook Messenger 24/7 AI Quote & Lead Intake Bot (3 Pages)"
echo "   [3] Voice Dictation & Gemini AI Instant Phone Quote Bot"
echo "   [4] Quo (OpenPhone) 6-Line Call Transcript & Sonia AI Lead Bot"
echo "   [5] Twilio Bam Shield / Spam Shield & Live Incoming Call Screener Bot"
echo "   [6] 9-Tab Visual Clean Google Sheets & Meta/Google Ads Webhook Bot"
echo "   [7] Public Routes: /booking, /support, /contact, /T&C, /privacy"
echo "============================================================================"
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js is not installed on this computer."
  echo "Please install Node.js LTS from https://nodejs.org/ and double-click this script again."
  read -r -p "Press Enter to exit..."
  exit 1
fi

if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  echo "[INFO] Creating initial .env configuration from .env.example..."
  cp ".env.example" ".env"
fi

echo "[STEP 1/3] Installing all project dependencies (npm install)..."
npm install

echo ""
echo "[STEP 2/3] Building production frontend & server bundle (npm run build)..."
npm run build

echo ""
echo "[STEP 3/3] Build complete! Launching TidyUps Cleaning on http://localhost:3000 ..."
if command -v open >/dev/null 2>&1; then
  (sleep 2 && open "http://localhost:3000") &
elif command -v xdg-open >/dev/null 2>&1; then
  (sleep 2 && xdg-open "http://localhost:3000") &
fi

npm start
