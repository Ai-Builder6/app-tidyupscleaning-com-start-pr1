# AI Complete Project Build & Reconstruction Workflow (`AI_BUILD_WORKFLOW.md`)

> **How to use this file**: When opening this project ZIP or GitHub repository in any AI coding assistant (Google AI Studio, Cursor, Claude Code, Windsurf, or GitHub Copilot), provide this file as context or paste the prompt below. The AI can immediately understand, build, run, and extend the entire **TidyUps Cleaning (`app.tidyupscleaning.com`)** platform.

---

## 1. Master Prompt for AI Builders

Copy and paste the following prompt into any AI coding agent when opening this project:

```text
You are maintaining and building the TidyUps Cleaning (app.tidyupscleaning.com) Voice Dictation, Quick Quote, Quick Map & Jobber Dispatch platform.

Core Architecture:
1. Full-Stack Runtime: Express backend (`server.ts`) serving Vite React 19 + TypeScript SPA on port 3000 (`npm run dev`). Production build uses `npm run build` and `npm start`.
2. Primary Header Navigation Order (`src/App.tsx`):
   - Tab 1 (Default): "Voice Dictation & Intake" (`QUICK_QUOTE` -> `src/components/QuickQuoteView.tsx`)
   - Tab 2: "Dispatch Map" (`MAP` -> `src/components/TerritoryMap.tsx` + `src/components/DispatchKanban.tsx`)
   - Tab 3: "Schedule" (`SCHEDULED_JOBS` -> `src/components/ScheduledJobsView.tsx`)
   - Tab 4: "Management" (`MANAGEMENT` -> `src/components/ManagementHubView.tsx`)
   - Tab 5: "Intakes" (`INTAKES` -> `src/components/IntakesView.tsx`)
   - Supporting Tabs: "Address Radar" (`ADDRESS_SEARCH`), "Clients" (`CLIENTS`), "Leads" (`LEADS`), "Customer Page" (`CUSTOMER_PORTAL`).
3. Voice Dictation & Quick Quote Workflow (`src/components/QuickQuoteView.tsx`):
   - Captures live microphone speech via Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`) or pasted call notes.
   - Sends transcript to `POST /api/dispatch/parse-voice-ticket` (Gemini 2.5 Flash + deterministic Edmonton heuristic fallback).
   - Auto-fills Customer Name, Phone, Email, Street Address (with Google Places Autocomplete), City, Cleaning Service Package, How Many Bedrooms (1 to 5+ Bedrooms), How Many Bathrooms (1 to 4+ Bathrooms), Recommended Hours, Crew Size (1 cleaner @ $52.50/hr, 2 cleaners @ $105.00/hr, or Custom $/hr), Fuel Surcharge ($12.50), 12.5% Tax, Add-on Tags, and Specific Information.
   - Syncs 1-click to Jobber Quotes (`POST /api/database/quotes`) and the Booking System (`POST /api/public/book` + `POST /api/quo/calls/convert-to-job`).
   - Renders an embedded interactive Edmonton Quick Map ranking the closest cleaners by driving distance and travel time.
4. Maps & Geolocation Architecture:
   - Server-side proxy endpoints in `server.ts`: `/api/geocode/forward`, `/api/geocode/reverse`, `/api/places/autocomplete`, `/api/routes/compute`, and `/api/routes/matrix`.
   - Interactive high-resolution Edmonton Web Mercator street & satellite tile maps in `TerritoryMap.tsx`, `AddressSearchRadarView.tsx`, and `QuickQuoteView.tsx` so maps work on `app.tidyupscleaning.com` and backup domains without browser HTTP referrer errors.
5. Integrations:
   - Jobber GraphQL OAuth2 & Delta Sync (`src/services/jobberSyncModules.ts` & `server.ts`)
   - Quo (OpenPhone) 5-Line Phone System & Twilio TwiML Spam Shield (`src/components/QuoModal.tsx`, `src/components/TwilioSpamShieldModal.tsx`)
   - Firebase Firestore (`ai-studio-cleaningserviced-8a2493ab-cb9d-4c28-a60b-c28e7d08d30e` via `src/lib/firebase.ts` & `src/services/firestoreSyncService.ts`)
   - Google Drive OAuth 2.0 Backup Upload (`src/components/ProjectBackupDriveModal.tsx` + `/api/project/export-zip`)
```

---

## 2. Step-by-Step Build & Verification Checklist for AI Agents

1. **Install & Verify Dependencies**
   - Ensure `package.json` includes `express`, `react`, `react-dom`, `lucide-react`, `@google/genai`, `firebase`, `jszip`, `@vis.gl/react-google-maps`, and `tailwindcss`.
   - Run `npm install`.

2. **Environment Variables (`.env` / Cloud Run Secrets)**
   - `GEMINI_API_KEY`: Server-side Gemini API key for voice dictation parsing and AI dispatch recommendations.
   - `VITE_GOOGLE_MAPS_API_KEY`: Google Maps Platform key (proxied through `server.ts` with authorized referrer headers).
   - `JOBBER_CLIENT_ID`, `JOBBER_CLIENT_SECRET`, `JOBBER_REFRESH_TOKEN`: Jobber GraphQL CRM credentials.
   - `QUO_API_KEY`: Quo (OpenPhone) API key for 5 regional phone lines.
   - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`: Twilio credentials for live call blocking and SMS.

3. **Compile & Run**
   - Run `npm run lint` (`tsc --noEmit`) to verify zero TypeScript errors.
   - Run `npm run build` to compile the Vite frontend bundle (`dist/`) and esbuild server bundle (`dist/server.cjs`).
   - Run `npm run dev` to launch the development server on `http://localhost:3000`.

4. **Publishing to `app.tidyupscleaning.com`**
   - Whenever code changes are completed in Google AI Studio, click **Publish** in the top-right corner of AI Studio to deploy the updated container to Cloud Run for **`app.tidyupscleaning.com`**.
