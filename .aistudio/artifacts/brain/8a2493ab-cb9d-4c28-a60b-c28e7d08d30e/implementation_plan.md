# Live Google Sheets Lead Hub, FB/Google Ads Sheet Creator & Cookie-Gate Elimination Plan

Resolves the **"Sorry, the file you have requested does not exist"** error when opening the Leads Google Sheet and eliminates the **"Action required to load your app (blocking a required security cookie)"** screen across the Clean Google Sheet Hub and Jobber Sync Management, while adding 1-click creation and syncing of a live, multi-tab Google Sheet in your Google Drive ready for Facebook Lead Ads and Google Ads connections.

## User Review & Critical Decisions

> [!IMPORTANT]
> Your confirmed preferences from our clarification step are locked into this plan:

- **Confirmed Decision 1 (Default & New Google Sheets)**: Default all broken placeholder links (`1TifULi7n2BylQdvla_clean_sheet`) to your real existing Primary Leads Sheet (`1TifULi7n2BylQdvla-8DRvYHul_A1wXXzypUdBJwEeA`), allow instant switching to your Secondary Leads Sheet (`1-1palHco2hOEKDh8ivnLYX6-PuzeQtHhLQGkaD_Dp4I`), and add a **1-Click "Create New Clean Leads Sheet in Google Drive"** button that provisions a real multi-tab Google Sheet in your Google Drive and automatically connects it across the entire app.
- **Confirmed Decision 2 (FB Ads & Google Ads Ready + Cookie-Free Exports)**: Sync leads directly to your live Google Sheet in Google Drive (structured with dedicated `Facebook Leads`, `Google Leads`, `Voice & Quick Quotes`, and `Pasted Leads` tabs plus the 20-column lead schema and webhook endpoint so you can connect Facebook Lead Ads and Google Ads directly to the new sheet), and convert all spreadsheet downloads and OAuth links so they never trigger the `.run.app` security-cookie screen.

---

## 1. Overview & Core Concept

- **What It Does**:
  1. **Fixes "File Does Not Exist" in Google Drive**: Replaces the non-existent placeholder spreadsheet ID (`1TifULi7n2BylQdvla_clean_sheet`) stored in the database and UI defaults with your real, verified Google Sheet (`1TifULi7n2BylQdvla-8DRvYHul_A1wXXzypUdBJwEeA`), and validates any custom URL so broken IDs are automatically repaired.
  2. **1-Click "Create New Leads Sheet in Drive" (FB Ads & Google Ads Ready)**: Uses your Google Drive authorization to generate a real, native Google Spreadsheet (`application/vnd.google-apps.spreadsheet`) inside your Google Drive with four pre-configured tabs (`Facebook Leads`, `Google Leads`, `Voice & Quick Quotes`, `Pasted Leads`) and the 20-column lead headers. Once created, its live `https://docs.google.com/spreadsheets/d/<ID>/edit` URL becomes the active sheet across Leads Hub, Quick Quote, Quotes, and Jobber Sync Management.
  3. **Direct Facebook Ads & Google Ads Connection Panel**: Displays the active Google Sheet URL, Spreadsheet ID, Tab names, and Inbound Lead Webhook URL (`/api/leads/webhook`) with 1-click copy buttons so you can plug the newly created Google Sheet straight into Meta Lead Ads, Google Ads Lead Forms, Zapier, or Make.
  4. **Eliminates "Action Required to Load Your App (Security Cookie Blocked)"**:
     - Replaces raw `<a href="/api/...">` download links (`.xlsx` and `.csv`) with authenticated in-app `fetch()` → `Blob` downloads that execute inside the current session without opening a unauthenticated `.run.app` tab.
     - Updates the Jobber browser authorization link in **Jobber Sync Management** to point directly to `https://api.getjobber.com/api/oauth/authorize` rather than bouncing through `/api/jobber/oauth/start` in a new window.
- **Target Audience / Persona**: Dispatchers, operations managers, and ad campaign managers at Tidyups Cleaning Service Inc managing inbound Facebook/Google leads and Jobber schedules.
- **Key Value**: Every "Open Google Sheet", "Create New Sheet in Drive", "Push to Google Sheet", and "Export XLSX/CSV" button works on the first click without 404 Drive errors or browser cookie walls.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Opening the Active Google Sheet**: Clicking **Open Google Sheet** in the Clean Google Sheet Hub, Quick Quote, or Jobber Sync Management immediately opens your real Google Sheet (`docs.google.com/spreadsheets/d/...`) in a new tab.
  2. **Creating a Brand-New Leads Sheet in Google Drive**:
     - Click **+ Create New Leads Sheet in Drive (FB & Google Ads)** in the Clean Google Sheet Hub or Jobber Sync Management.
     - If not yet signed into Google Drive, the synchronous Google Identity Services popup authorizes access.
     - The app builds a clean multi-tab workbook (`Facebook Leads`, `Google Leads`, `Voice & Quick Quotes`, `Pasted Leads`) with your 20-column lead headers and current leads, converts it into a native **Google Sheet** inside your Google Drive folder (`TidyUps Cleaning App Backup Zips`), saves the new `https://docs.google.com/spreadsheets/d/<newId>/edit` URL to the server store, and shows a direct **Open New Google Sheet** link.
  3. **Connecting Facebook Ads & Google Ads to the Sheet**:
     - A collapsible **Connect FB Lead Ads & Google Ads** bar shows the exact **Spreadsheet ID**, **Target Tabs** (`Facebook Leads`, `Google Leads`), **20-Column Header Schema**, and **Inbound Lead Webhook URL** for instant copy-pasting into your ad integrations.
  4. **Updating / Syncing Existing Sheet & Downloading Local Copies**:
     - Clicking **Sync to Google Sheet in Drive** asks for confirmation before overwriting the sheet in Drive, then updates the live Google Sheet.
     - Clicking **Download .XLSX** or **Export .CSV** fetches the file in-memory via `fetch()` and saves it directly to your device without navigating to a `.run.app` URL.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: High-contrast operational SaaS command center matching the existing dark slate (`#0F172A` / `#131724`) Leads Hub and crisp light slate Jobber Sync Management modal.
  - *Color Palette & Mood*: Deep slate structural surfaces (`#131724`), emerald primary action accents (`#10B981`) for Google Sheets / Drive operations, blue (`#2563EB`) for Facebook/Google Ads connection controls, and amber (`#F59E0B`) for Jobber sync status.
  - *Typography & Hierarchy*: Clean sans headings paired with `font-mono tabular-nums` for Spreadsheet IDs, counts, timestamps, and webhook URLs.
- **Interactive Feedback & Motion**:
  - Immediate spinner state on **Create New Leads Sheet in Drive**, **Sync to Drive Sheet**, and **Download .XLSX / .CSV** buttons.
  - Confirmation modal before overwriting or resetting an existing Google Sheet in Drive.
  - Clear toast/banner confirmation with a 1-click **Open Sheet in Google Drive ↗** button as soon as creation or sync completes.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Native Google Sheets Creation via Google Drive Multipart Conversion**
  - *Chosen Approach*: Upload the multi-tab `.xlsx` workbook buffer to `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart` with metadata `mimeType: 'application/vnd.google-apps.spreadsheet'` inside the user's `TidyUps Cleaning App Backup Zips` Drive folder.
  - *Why*: Google Drive natively converts the uploaded `.xlsx` workbook into a true multi-tab Google Sheet (`Facebook Leads`, `Google Leads`, `Voice & Quick Quotes`, `Pasted Leads`) using the already-authorized Google Drive token, returning a permanent `https://docs.google.com/spreadsheets/d/<id>/edit` URL that works immediately with Facebook Ads and Google Ads connectors.
  - *Alternatives Considered*: Downloading a local `.xlsx` file and asking the user to manually upload and convert it in Drive (adds friction and doesn't auto-link the URL).
- **Decision 2: In-Memory `fetch()` + `Blob` Downloads Instead of `<a href="/api/...">` Links**
  - *Chosen Approach*: Perform all `/api/leads/export.xlsx` and `/api/leads/export.csv` downloads via JavaScript `fetch()` inside the active app frame, then trigger download via an object URL (`URL.createObjectURL(blob)`), and point Jobber's "Open in New Tab" button directly to `https://api.getjobber.com/api/oauth/authorize`.
  - *Why*: Bypasses the AI Studio `.run.app` cross-window security-cookie interstitial (`Action required to load your app — It looks like your browser is blocking a required security cookie`) on Safari, iOS, and Chrome.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:
```
┌──────────────────────────────────────────────────────────────────────────────┐
│                     Client UI (React SPA — Port 3000)                        │
│                                                                              │
│  ┌────────────────────────────────────┐  ┌────────────────────────────────┐  │
│  │   Clean Google Sheet Hub           │  │   Jobber Sync Management       │  │
│  │   • Sheet Preset Selector          │  │   • Direct Jobber OAuth Link   │  │
│  │   • 1-Click Create Sheet in Drive  │  │     (api.getjobber.com)        │  │
│  │   • 1-Click Sync to Drive Sheet    │  │   • Active Leads Sheet Link    │  │
│  │   • FB Ads / Google Ads Connect    │  │   • 1-Click Create/Sync Sheet  │  │
│  │   • Blob .XLSX / .CSV Download     │  │     in Google Drive            │  │
│  └─────────────────┬──────────────────┘  └───────────────┬────────────────┘  │
│                    └──────────────────┬──────────────────┘                   │
│                                       ▼                                      │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │         Google Drive & Sheets Service (Client-Side OAuth Token)        │  │
│  │  • Creates/Updates native Google Sheet (vnd.google-apps.spreadsheet)   │  │
│  │    with 4 tabs (FB Leads, Google Leads, Voice Quotes, Pasted Leads)    │  │
│  │  • Persists real spreadsheetId & sheetUrl to /api/google-sheets/config │  │
│  └─────────────────┬─────────────────────────────────────┬────────────────┘  │
└────────────────────┼─────────────────────────────────────┼───────────────────┘
                     ▼                                     ▼
┌─────────────────────────────────────────┐ ┌──────────────────────────────────┐
│   Express Backend (/api/*)              │ │   Google Drive / Sheets API v3   │
│  • Auto-repairs fake *_clean_sheet IDs  │ │  • Folder: TidyUps Cleaning App  │
│    to 1TifULi7n2BylQdvla-8DRv...        │ │    Backup Zips                   │
│  • Generates multi-tab .XLSX buffer     │ │  • Returns live webViewLink:     │
│  • Inbound Webhook (/api/leads/webhook) │ │    docs.google.com/spreadsheets/ │
│    for FB Lead Ads & Google Ads         │ │    d/<REAL_ID>/edit              │
└─────────────────────────────────────────┘ └──────────────────────────────────┘
```

- **Data Model & State**:
  - `cleanSheetConfig` (persisted in server store & `baseJobberStoreSeed.json`):
    - `spreadsheetId`: Valid Google Spreadsheet ID (defaults to `1TifULi7n2BylQdvla-8DRvYHul_A1wXXzypUdBJwEeA`; auto-sanitizes any legacy `1TifULi7n2BylQdvla_clean_sheet` placeholder).
    - `sheetUrl`: `https://docs.google.com/spreadsheets/d/<spreadsheetId>/edit`.
    - `createdDriveSheetId` / `createdDriveSheetUrl`: Tracks the user's newly created Google Sheet in Drive so they can switch between their existing sheet and their new FB/Google Ads sheet at any time.
- **Interactive Component & State Mapping**:
  - **Sheet Switcher & URL Bar**: Switching between *Existing Primary Sheet*, *Existing Secondary Sheet*, or *Newly Created Drive Sheet* immediately updates `googleSheetUrl` and persists to `/api/google-sheets/config`.
  - **Create New Leads Sheet in Drive Handler**: Requests Google OAuth token synchronously via GIS if needed, fetches the multi-tab `.xlsx` binary from `/api/leads/export.xlsx`, uploads to Google Drive API with `mimeType: 'application/vnd.google-apps.spreadsheet'`, saves the returned `id` and `webViewLink` to `/api/google-sheets/config`, and updates UI state.
  - **Sync to Existing Drive Sheet Handler**: Prompts user with an explicit confirmation modal before updating the existing Drive spreadsheet file via `PATCH https://www.googleapis.com/upload/drive/v3/files/<fileId>?uploadType=multipart`.
  - **Inbound FB Ads / Google Ads Webhook (`/api/leads/webhook`)**: Accepts `POST` payloads from Facebook Lead Ads / Google Ads / Zapier, normalizes the lead into the 20-column format under `Facebook Leads` or `Google Leads`, and stores it immediately in the Clean Sheet Hub.
