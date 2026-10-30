# TidyUps Cleaning (`app.tidyupscleaning.com` / `app.tidyups.cleaning`) — Complete Operations, AI Bots & Jobber Dispatch Platform

Complete full-stack **React 19 + TypeScript + Express + Google Maps + Gemini AI + Jobber CRM + Facebook Messenger 24/7 AI Bot + Quo (OpenPhone) 6-Line Transcript Bot + Twilio Bam/Spam Shield + 9-Tab Clean Google Sheets + Firebase Firestore + Google Drive Backup** platform built exclusively for **TidyUps Cleaning Service Inc.** (`https://app.tidyupscleaning.com`).

---

## ⚡ 1-Click Build & Run (No Terminal Needed!)

When you download and unzip this project archive (`app.tidyups.cleaning-PR#.zip`), everything is pre-configured so you can build and run the entire application in **1 click**:

### 🪟 On Windows:
1. Unzip the downloaded folder.
2. Double-click **`CLICK_TO_BUILD_AND_RUN_WINDOWS.bat`**.
3. It automatically checks Node.js, creates `.env` (if needed), runs `npm install`, compiles the production frontend & backend (`npm run build`), opens **`http://localhost:3000`** in your browser, and starts the server!

### 🍎 On Mac / Linux:
1. Unzip the downloaded folder.
2. Double-click **`CLICK_TO_BUILD_AND_RUN_MAC.command`** (or run `bash CLICK_TO_BUILD_AND_RUN_MAC.command`).
3. It automatically installs dependencies, builds the production bundle, opens **`http://localhost:3000`**, and starts the server!

### 💻 Terminal / AI Coding Assistant (1-Command Build):
```bash
# 1-Click full install, build & start:
npm run oneclick

# Or step-by-step development mode (Express + Vite on port 3000):
npm install
npm run dev
```

---

## 🤖 All 6 Built-In Bots & Automation Engines Included

### 1. 🔗 Jobber CRM OAuth 2.0, GraphQL 2-Way Sync & Webhook Bot
- **Files**: `src/services/jobberSyncModules.ts`, `src/components/JobberSyncModal.tsx`, `src/components/JobberAppInfoKit.tsx`, `server.ts` (`/api/jobber/*`, `/api/webhooks/jobber`)
- **What It Does**:
  - **Tab 1 (`Jobber Account & Secret — Authorize & Check Status`)**: Opens by default with a **1-Click Live GraphQL Verification** badge and an **"Approve & Authorize in Jobber"** button.
  - **Tab 2 (`Jobber Developer Center Copy & Paste Kit`)**: Contains all copy-pasteable fields, logo/gallery downloads, and webhook topics for the `BookMyCleaning-Tidyups` app in `developer.getjobber.com`.
  - **Auto Token Refresh & Queue Flush**: Automatically refreshes Jobber's 60-minute JWT using the stored refresh token and flushes any queued quotes/clients to Jobber.
  - **Permanent Fake/Draft Quote Purge**: Includes `purgeFakeAndDraftQuotesOnJobber` (`POST /api/jobber/purge-fake-quotes`) to permanently delete fake or unwanted draft quotes in Jobber and block them from ever re-syncing.
  - **Webhook Listener**: `https://app.tidyupscleaning.com/api/webhooks/jobber` (also aliased at `/api/jobber/webhook`) handles `CLIENT_*`, `QUOTE_*`, `REQUEST_*`, `JOB_*`, `VISIT_*`, and `INVOICE_*` events in real time.

### 2. 💬 Facebook Messenger 24/7 AI Sales, Quote & Lead Intake Bot
- **Files**: `src/components/FacebookMessengerAiView.tsx`, `server.ts` (`/api/facebook/*`, `runFacebook24x7BackgroundMonitor`)
- **What It Does**:
  - Connects up to **3 Facebook Pages** (`833 Tidyups`, `Tidyups Cleaning Service Inc`, `Edmonton Move-Out Cleaning`) via Meta Graph API v19.0 + background 45-second polling monitor.
  - **Strict 3-Cleaning-Option Rules**:
    - **Basic Cleaning**: 1 Pro Cleaner @ `$52.50/hr`
    - **Deep Cleaning**: Min 2 Cleaners for 2 Hours @ `$105.00/hr` (`$210+`)
    - **Move-Out Cleaning**: Min 3 Hours with 2 Cleaners @ `$105.00/hr` (`$315+`) OR 6 Hours with 1 Cleaner @ `$52.50/hr`
  - Extracts Customer Name, Phone, Email, Address, Bedrooms, Bathrooms, Preferred Date, and Special Instructions, then syncs directly to the **9-Tab Visual Google Sheet (`Facebook AI` tab)** and creates a **Jobber Draft Quote**.
  - Supports **1-Click Human Takeover / Hand Back to AI** and **Voice Mic Dictation** inside every thread.

### 3. 🎙️ Continuous Voice Dictation & Gemini AI Phone Quote Bot
- **Files**: `src/components/QuickQuoteView.tsx`, `server.ts` (`POST /api/dispatch/parse-voice-ticket`)
- **What It Does**:
  - Listens continuously to live phone calls or spoken dispatcher notes via Web Speech API + Gemini AI.
  - Lights up form boxes in real time as Customer Name, Phone, Email, Address, Cleaning Package, Bedrooms, Bathrooms, Hours, and Add-ons are spoken.
  - Calculates exact labor, `$12.50` fuel surcharge, promo/loyalty discounts, and `5% GST`, and ranks the closest Edmonton cleaner vans on an interactive Quick Map.

### 4. 📞 Quo (OpenPhone) 6-Line Call Transcript & Sonia AI Lead Engine Bot
- **Files**: `src/components/QuoModal.tsx`, `server.ts` (`/api/quo/*`, `analyzeCallTranscriptForLead`, `pollRecentOpenPhoneCallsFast`)
- **What It Does**:
  - Monitors all 6 TidyUps phone lines:
    1. `+1 (587) 416-9181` — Tidyups Cleaning & Jobber Main Line
    2. `+1 (587) 900-7223` — Tidyups Cleaning GMB Direct
    3. `+1 (587) 742-2500` — Cleaning Services Ads Line
    4. `+1 (587) 570-8005` — Primary Dispatch Line
    5. `+1 (833) 843-9877` — Toll-Free 1-833-TIDYUPS
    6. `+1 (587) 602-7792` — Door Hangers & Local Signs
  - Parses Sonia AI call summaries & transcripts, classifies callers as `✅ GOOD LEAD`, `🟡 POTENTIAL JOB`, or `🚫 BAD LEAD`, syncs leads into the **Quo** tab of the Clean Google Sheet, and sends 1-click SMS quotes via OpenPhone API.

### 5. 🛡️ Twilio Bam Shield / Spam Shield & Live Incoming Call Screener Bot
- **Files**: `src/components/SpamShieldView.tsx`, `src/components/LiveCallScreenerHUD.tsx`, `server.ts` (`/api/twilio/voice`, `/api/twilio/live-calls`)
- **What It Does**:
  - Screens all inbound calls at the Twilio carrier level before forwarding to Quo/OpenPhone.
  - Rejects blocked numbers, international scammers, and telemarketer area codes (`1408*`, `1800*`, `1888*`, etc.) using `<Pause length="1"/><Hangup/>` so OpenPhone Sona AI never triggers and costs `$0`.
  - **Live Incoming Call Feed Inside Bam Shield**: Displays a real-time **All Calls / Allowed / Blocked** call table right inside the Spam Shield (`SpamShieldView.tsx`) and floating HUD (`LiveCallScreenerHUD.tsx`) so you can see every call coming in and 1-click **Block #**, **Block Area Code**, **Unblock**, or **Quote Caller** without opening Quo.
  - **Alberta Area Code Protection**: Protects `780`, `587`, `825`, `403`, and `368` from accidental whole-area-code blocks.

### 6. 📊 9-Tab Visual Clean Google Sheets & Meta / Google Ads Webhook Bot
- **Files**: `src/services/styledLeadsWorkbookBuilder.ts`, `src/components/LeadsCenterView.tsx`, `src/services/googleDriveBackupService.ts`, `server.ts` (`/api/leads/*`)
- **What It Does**:
  - Generates a genuine styled `.xlsx` workbook uploaded to Google Drive via strict **RFC 2387 `multipart/related`** (preventing the single `"blob"` tab bug) with **9 color-coded visual tabs**:
    1. `All New Leads (14-Day)`
    2. `Facebook Leads 1`
    3. `Facebook Leads 2`
    4. `Google Leads 1`
    5. `Google Leads 2`
    6. `Other Ads`
    7. `Facebook AI`
    8. `Quo`
    9. `Archived Old Sheets`
  - Provides a 1-click copyable `https://docs.google.com/spreadsheets/d/<ID>/edit` URL for **Facebook Meta Lead Ads** and **Google Ads**.

---

## 🌐 All Public & Customer Pages (`https://app.tidyupscleaning.com`)

| URL Path | Page / Purpose | Key Features |
| :--- | :--- | :--- |
| **`/booking`** | **Customer Online Booking Sheet** | Always opens **100% blank/fresh** for every visitor. Includes prominent **"Start Over / Clear Sheet"** button, continuous voice fill, 3 cleaning options (`Move-Out`, `Basic`, `Deep`), and instant Jobber + Google Sheet sync. |
| **`/support`** (or `/help`) | **Customer & App Support Center** | Public support page for customers and Jobber App Marketplace reviewers (`1-833-843-9877`, `(587) 416-9181`, FAQs, 24-Hour Clean Guarantee, and troubleshooting). |
| **`/contact`** (or `/contact-us`) | **Contact Us & Direct Message Page** | Public contact page with Edmonton dispatch hours, phone lines, email (`booking@tidyupscleaning.com`), and a live message form that routes straight into the dispatch board. |
| **`/T&C`** (or `/terms`) | **Terms & Conditions** | Official legal Terms of Service required for Jobber Developer App Marketplace & Meta verification. |
| **`/privacy`** | **Privacy Policy** | Official PIPEDA / Alberta PIPA Privacy Policy required for Jobber & Meta verification. |
| **`/data-deletion`** | **Facebook / Meta Data Deletion** | Automated GDPR/Meta data deletion instructions & callback confirmation page. |
| **`/clean-sheet`** | **Live 9-Tab Clean Sheet Viewer** | Interactive web view of the 9-tab leads spreadsheet. |

---

## 📦 How the Numbered PR# Backup ZIP & Google Drive Sync Works

1. Open **Management Hub** (or click the **PR# ZIP / Google Drive** button in the top header).
2. **Update PR# Anytime**: Click `-1`, `+1 Next`, any quick-select button (`PR6` through `PR15`), or type a custom PR number and click **Set PR#**.
3. **☁️ 1-Click Build & Upload PR# ZIP to Google Drive**: Builds the complete project archive on the server and uploads it directly into your **`TidyUps Cleaning App Backup Zips`** folder in Google Drive — **zero local hard-drive clutter**.
4. **⬇️ Download Ready-to-Build Project ZIP**: If you want a local copy on your computer, click **Download ZIP** to get the complete archive containing all source code, data seeds, bots, READMEs, and the `CLICK_TO_BUILD_AND_RUN_WINDOWS.bat` / `CLICK_TO_BUILD_AND_RUN_MAC.command` 1-click launchers.
