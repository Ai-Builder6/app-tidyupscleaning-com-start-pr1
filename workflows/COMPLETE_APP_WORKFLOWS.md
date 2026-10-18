# TidyUps Cleaning (`app.tidyups.cleaning` / `app.tidyupscleaning.com`) — Complete System Workflows

This directory is packaged inside every numbered **Whole Project & Workflows ZIP** (`app.tidyups.cleaning-PR1-...zip`, `PR2`, `PR3`, etc.) uploaded to the **`TidyUps Cleaning App Backup Zips`** folder in Google Drive or downloaded locally.

---

## Workflow 1: Numbered PR (`PR1`, `PR2`, `PR3`...) Whole Project & Workflows Backup
- **Target Google Drive Folder**: `TidyUps Cleaning App Backup Zips`
- **How It Works**:
  1. Every backup copy is sequentially numbered (`PR1`, `PR2`, `PR3`, ...) and stamped with the Edmonton date, time of day (`Morning`, `Afternoon`, `Evening`), and exact clock time (e.g., `app.tidyups.cleaning-PR1-2026-10-17-Evening-0825PM.zip`) so morning and afternoon updates are always distinct.
  2. `/api/project/export-zip` packages the clean `app.tidyups.cleaning` repository including `src/`, `server.ts`, `data/`, `prompt_templates/`, `.github/workflows/`, `workflows/`, `AI_BUILD_WORKFLOW.md`, and `README.md`.
  3. The app checks Google Drive for **`TidyUps Cleaning App Backup Zips`** (creating it automatically if missing) and uploads each numbered `PR#` archive as a distinct file so afternoon saves never overwrite morning saves.

---

## Workflow 2: Voice Dictation Intake → Quick Quote → Jobber & Dispatch Sync
- **View**: `src/components/QuickQuoteView.tsx`
- **Steps**:
  1. Speak caller details via Web Speech API or paste call transcript.
  2. `POST /api/dispatch/parse-voice-ticket` extracts Customer Name, Phone, Email, Address, Bedrooms, Bathrooms, Recommended Hours, Crew Size, and Notes.
  3. Interactive Edmonton Quick Map calculates driving distance & ETA from each cleaner's Van Hub.
  4. 1-Click sync creates the Jobber Quote (`POST /api/database/quotes`) and scheduled booking (`POST /api/public/book`).

---

## Workflow 3: Full-Year 2026 Jobber Calendar & Live Dispatch Sync
- **View**: `src/components/ScheduledJobsView.tsx` & `src/services/jobberSyncModules.ts`
- **Steps**:
  1. Connects to live Jobber GraphQL API (`https://api.getjobber.com/api/graphql`) using OAuth 2.0 tokens stored in `data/tidyups_cleaning_store.json`.
  2. Syncs all 2026 scheduled visits starting **January 1, 2026** through December 31, 2026 (including all 62 scheduled visits in October 2026).
  3. Converts all UTC timestamps to `America/Edmonton` local time so calendar days and dispatch boards match Jobber 1:1.

---

## Workflow 4: Quo (OpenPhone) 5-Line Call Log & Twilio Spam Shield
- **View**: `src/components/QuoModal.tsx` & `src/components/SpamShieldView.tsx`
- **Steps**:
  1. Monitors 5 regional business lines (Edmonton, St. Albert, Sherwood Park, Spruce Grove, Leduc).
  2. Blocks telemarketers and area-code spam at the Twilio webhook level (`/api/twilio/voice/incoming`).
