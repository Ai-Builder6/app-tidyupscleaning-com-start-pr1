# AI Complete Project Build & Reconstruction Workflow (`AI_BUILD_WORKFLOW.md`)

> **How to use this file**:
> - **To build & run in 1 click on your computer**: Double-click `CLICK_TO_BUILD_AND_RUN_WINDOWS.bat` (Windows) or `CLICK_TO_BUILD_AND_RUN_MAC.command` (Mac/Linux), or run `npm run oneclick` in any terminal.
> - **To use with any AI coding assistant** (Google AI Studio, Cursor, Claude Code, Windsurf, or GitHub Copilot): Provide this file as context or paste the Master Prompt below.

---

## 1. Master Prompt for AI Builders

Copy and paste the following prompt into any AI coding agent when opening this project:

```text
You are maintaining and building the TidyUps Cleaning Service Inc. (https://app.tidyupscleaning.com) full-stack operations, AI bots, voice dictation, and Jobber CRM dispatch platform.

Core Architecture:
1. Full-Stack Runtime:
   - Express backend (`server.ts`) serving Vite React 19 + TypeScript SPA on port 3000 (`npm run dev`).
   - Production build uses `npm run build` and `npm start` (or 1-click via `npm run oneclick`, `CLICK_TO_BUILD_AND_RUN_WINDOWS.bat`, or `CLICK_TO_BUILD_AND_RUN_MAC.command`).

2. Primary Navigation & Public Routes (`src/App.tsx`):
   - Public Customer Routes (no staff login required):
     * `/booking` (`src/components/CustomerBookingPortal.tsx`): Always starts 100% blank/fresh on every page load (`localStorage` draft prefill removed) and includes a "Start Over / Clear Sheet" button in the top header and form header.
     * `/support` & `/help` (`src/components/LegalPagesView.tsx`): Public Customer & Jobber Marketplace Support Center.
     * `/contact` & `/contact-us` (`src/components/LegalPagesView.tsx`): Public Contact Us page with direct dispatch message form (`POST /api/public/book`).
     * `/T&C` & `/terms` (`src/components/LegalPagesView.tsx`): Terms & Conditions.
     * `/privacy` (`src/components/LegalPagesView.tsx`): Privacy Policy.
     * `/data-deletion` (`src/components/LegalPagesView.tsx`): Meta / Facebook Data Deletion instructions & callback endpoint (`/api/facebook/data-deletion`).
   - Staff & Operations Workspace Tabs:
     * Tab 1: "Voice Dictation & Intake" (`QUICK_QUOTE` -> `src/components/QuickQuoteView.tsx`)
     * Tab 2: "Dispatch Map" (`MAP` -> `src/components/TerritoryMap.tsx` + `src/components/DispatchKanban.tsx` for 15 Edmonton vans)
     * Tab 3: "Schedule" (`SCHEDULED_JOBS` -> `src/components/ScheduledJobsView.tsx`)
     * Tab 4: "Management" (`MANAGEMENT` -> `src/components/ManagementHubView.tsx`)
     * Tab 5: "Intakes" (`INTAKES` -> `src/components/IntakesView.tsx`)
     * Supporting Views: "Leads & 9-Tab Clean Sheet" (`src/components/LeadsCenterView.tsx`), "Facebook Messenger AI Bot" (`src/components/FacebookMessengerAiView.tsx`), "Bam / Spam Shield" (`src/components/SpamShieldView.tsx`), "Clients" (`src/components/ClientsView.tsx`).

3. All 6 Built-In Bots & Automation Engines:
   - Bot 1 — Jobber CRM OAuth 2.0, GraphQL 2-Way Sync & Webhook Bot (`src/services/jobberSyncModules.ts`, `src/components/JobberSyncModal.tsx`, `src/components/JobberAppInfoKit.tsx`):
     * Client ID: `27966135-e33e-4c2e-8dc3-ad7ba06dabb8` (`BookMyCleaning-Tidyups`)
     * Callback URL: `https://app.tidyupscleaning.com/api/jobber/oauth/callback`
     * Webhook URL: `https://app.tidyupscleaning.com/api/webhooks/jobber`
     * Tab 1 in `JobberSyncModal.tsx` opens by default to verify live GraphQL authorization status and trigger 1-click OAuth approval.
     * Permanently purges fake/test draft quotes via `POST /api/jobber/purge-fake-quotes`.
   - Bot 2 — Facebook Messenger 24/7 AI Quote & Lead Intake Bot (`src/components/FacebookMessengerAiView.tsx`, `/api/facebook/*`):
     * Auto-replies 24/7 across 3 Facebook Pages using Gemini AI + deterministic pricing rules (Basic: 1 cleaner @ $52.50/hr; Deep: min 2 cleaners 2 hrs @ $105/hr; Move-Out: min 3 hrs 2 cleaners @ $105/hr or 6 hrs 1 cleaner @ $52.50/hr).
     * Auto-syncs leads to the 9-Tab Clean Google Sheet (`Facebook AI` tab) and creates Jobber Draft Quotes.
   - Bot 3 — Voice Dictation & Gemini AI Phone Quote Bot (`src/components/QuickQuoteView.tsx`, `POST /api/dispatch/parse-voice-ticket`):
     * Extracts caller details from continuous microphone speech and computes closest Edmonton cleaner vans.
   - Bot 4 — Quo (OpenPhone) 6-Line Call Transcript & Sonia AI Lead Bot (`src/components/QuoModal.tsx`, `/api/quo/*`):
     * Syncs call recordings, Sonia AI transcripts, and SMS quotes across all 6 TidyUps phone lines.
   - Bot 5 — Twilio Bam Shield / Spam Shield & Live Call Screener HUD Bot (`src/components/SpamShieldView.tsx`, `src/components/LiveCallScreenerHUD.tsx`, `/api/twilio/voice`, `/api/twilio/live-calls`):
     * Blocks telemarketers & international spam in 1s (`<Pause length="1"/><Hangup/>`) and displays a live incoming call feed (`ALLOWED` vs `BLOCKED`) directly inside the Spam Shield & HUD.
   - Bot 6 — 9-Tab Visual Clean Google Sheets & Ads Webhook Bot (`src/services/styledLeadsWorkbookBuilder.ts`, `src/services/googleDriveBackupService.ts`, `/api/leads/webhook`):
     * Creates & updates a 9-tab visual Google Sheet in Google Drive using strict RFC 2387 `multipart/related` (never creating a single "blob" tab).
```

---

## 2. Step-by-Step Build & Verification Checklist

1. **1-Click Local Build & Start**
   - Windows: Double-click `CLICK_TO_BUILD_AND_RUN_WINDOWS.bat`
   - macOS / Linux: Double-click `CLICK_TO_BUILD_AND_RUN_MAC.command`
   - CLI: `npm run oneclick` (runs `npm install && npm run build && npm start` on port `3000`)

2. **Environment Variables (`.env` / Cloud Run Secrets)**
   - Copy `.env.example` to `.env` and fill in any API keys you wish to override (`GEMINI_API_KEY`, `VITE_GOOGLE_MAPS_API_KEY`, `JOBBER_CLIENT_ID`, `JOBBER_CLIENT_SECRET`, `QUO_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`).

3. **Type-Check & Production Bundle**
   - `npm run lint` (`tsc --noEmit`)
   - `npm run build` (builds Vite SPA into `dist/` and bundles `server.ts` into `dist/server.cjs`)
   - `npm start` (starts production server on `http://localhost:3000`)
