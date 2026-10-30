# TidyUps Cleaning (`app.tidyupscleaning.com` / `app.tidyups.cleaning`) — Complete System & Bot Workflows

This directory is packaged inside every numbered **Whole Project & Workflows ZIP** (`app.tidyups.cleaning-PR6-...zip`, `PR7`, `PR8`, etc.) uploaded to the **`TidyUps Cleaning App Backup Zips`** folder in Google Drive or downloaded locally.

---

## Workflow 1: 1-Click Build & Launch (After Downloading ZIP)
- **Files**: `CLICK_TO_BUILD_AND_RUN_WINDOWS.bat`, `CLICK_TO_BUILD_AND_RUN_MAC.command`, `package.json` (`npm run oneclick`)
- **How It Works**:
  1. Unzip the downloaded archive on Windows, Mac, or Linux.
  2. Double-click **`CLICK_TO_BUILD_AND_RUN_WINDOWS.bat`** (Windows) or **`CLICK_TO_BUILD_AND_RUN_MAC.command`** (Mac/Linux).
  3. The script automatically verifies Node.js, creates `.env` from `.env.example` if needed, runs `npm install`, compiles the production frontend and server (`npm run build`), opens `http://localhost:3000`, and starts the server (`npm start`).

---

## Workflow 2: Numbered PR (`PR6`, `PR7`, `PR8`...) Whole Project & Google Drive Backup
- **Files**: `src/components/ProjectBackupDriveModal.tsx`, `src/services/googleDriveBackupService.ts`, `server.ts` (`/api/project/*`)
- **Target Google Drive Folder**: `TidyUps Cleaning App Backup Zips`
- **How It Works**:
  1. Every backup copy is sequentially numbered (`PR6`, `PR7`, `PR8`, ...) and stamped with the Edmonton date, time of day (`Morning`, `Afternoon`, `Evening`), and exact clock time.
  2. You can update the active PR# anytime using the `-1`, `+1 Next`, quick-select (`PR6`–`PR15`), or custom PR# input (`POST /api/project/set-pr-number`).
  3. Clicking **☁️ 1-Click Build & Upload PR# ZIP to Google Drive** builds the full project ZIP on the server and uploads it directly into your Google Drive folder (`TidyUps Cleaning App Backup Zips`) via the `/oauth-bridge` popup without cluttering your local hard drive.
  4. Clicking **⬇️ Download Ready-to-Build Project ZIP** downloads the `.zip` file directly to your computer with all bots, READMEs, and 1-click build launchers included.

---

## Workflow 3: Jobber CRM OAuth 2.0, Developer Center Kit & Webhook Sync Bot
- **Files**: `src/components/JobberSyncModal.tsx`, `src/components/JobberAppInfoKit.tsx`, `src/services/jobberSyncModules.ts`
- **Steps**:
  1. Open **Jobber Account & Secret** (`JobberSyncModal.tsx`) — Tab 1 (**Authorize & Check Status**) opens by default.
  2. Click **Check Live Jobber Auth Now** to run a real-time GraphQL query against `https://api.getjobber.com/api/graphql`, or click **Approve & Authorize in Jobber** to complete OAuth 2.0 authorization (`https://app.tidyupscleaning.com/api/jobber/oauth/callback`).
  3. Switch to Tab 2 (**Jobber Developer Center Info Kit**) for 1-click copy-paste fields, 512x512 square PNG logo, 4 gallery images, and webhook configuration (`https://app.tidyupscleaning.com/api/webhooks/jobber`).
  4. Fake or unwanted draft quotes (such as test/fake quotes) are permanently purged and blocked from re-syncing via `POST /api/jobber/purge-fake-quotes`.

---

## Workflow 4: Fresh-Start Customer Online Booking Portal (`/booking`) & Public Support/Contact Pages
- **Files**: `src/components/CustomerBookingPortal.tsx`, `src/components/LegalPagesView.tsx`
- **Steps**:
  1. Customers visiting `https://app.tidyupscleaning.com/booking` always receive a **100% blank, fresh sheet** on every visit (no pre-filled fields).
  2. Customers can click **Start Over / Clear Sheet** at the top of the page at any time to reset all fields and voice transcripts back to zero.
  3. Public visitors and Jobber/Meta reviewers can access:
     - `https://app.tidyupscleaning.com/support` (Customer & App Support Center)
     - `https://app.tidyupscleaning.com/contact` (Contact Us & Direct Message Form)
     - `https://app.tidyupscleaning.com/T&C` (Terms & Conditions)
     - `https://app.tidyupscleaning.com/privacy` (Privacy Policy)
     - `https://app.tidyupscleaning.com/data-deletion` (Facebook/Meta Data Deletion Instructions)

---

## Workflow 5: Facebook Messenger 24/7 AI Bot & 9-Tab Visual Clean Google Sheet
- **Files**: `src/components/FacebookMessengerAiView.tsx`, `src/components/LeadsCenterView.tsx`, `src/services/styledLeadsWorkbookBuilder.ts`
- **Steps**:
  1. Facebook Messenger AI Bot (`FacebookMessengerAiView.tsx`) monitors all 3 connected Facebook Pages 24/7, quotes customers using the 3-option rules (`Basic`, `Deep`, `Move-Out`), and extracts lead fields.
  2. Leads sync into the **9-Tab Visual Clean Google Sheet** (`All New Leads (14-Day)`, `Facebook Leads 1`, `Facebook Leads 2`, `Google Leads 1`, `Google Leads 2`, `Other Ads`, `Facebook AI`, `Quo`, `Archived Old Sheets`) uploaded via strict RFC 2387 `multipart/related` so Google Sheets always renders all 9 styled tabs (never a `"blob"` tab).
  3. Copy the real `https://docs.google.com/spreadsheets/d/<ID>/edit` URL from the green banner in **Leads Center** to paste directly into Facebook Meta Ads Manager.

---

## Workflow 6: Quo (OpenPhone) 6-Line Transcript Bot & Twilio Bam/Spam Shield Live Call List
- **Files**: `src/components/SpamShieldView.tsx`, `src/components/LiveCallScreenerHUD.tsx`, `src/components/QuoModal.tsx`
- **Steps**:
  1. Inbound calls pass through Twilio Bam Shield (`/api/twilio/voice`), which blocks blacklisted callers and spam area codes (`1408*`, `1800*`, etc.) in 1 second (`<Pause length="1"/><Hangup/>`).
  2. Open **Bam Shield / Spam Shield** (`SpamShieldView.tsx`) to view the **Live Incoming & Screened Call Feed (`All Calls` / `Allowed` / `Blocked`)** in real time without leaving the app to open Quo.
  3. Block or unblock any caller in 1 click, or click **Quote Caller** to jump straight into Voice Dictation & Quick Quote with the caller's phone number and CRM history pre-loaded.
