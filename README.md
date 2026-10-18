# TidyUps Cleaning (`app.tidyups.cleaning` / `app.tidyupscleaning.com`) — Voice Dictation Intake, Quick Quote, Quick Map & Jobber Dispatch Platform

Complete full-stack React 19 + TypeScript + Express + Google Maps + Gemini AI + Jobber CRM + Quo (OpenPhone) + Twilio Spam Shield + Firebase Firestore + Google Drive Backup platform exclusively for **TidyUps Cleaning** (`app.tidyups.cleaning` / `app.tidyupscleaning.com`).

---

## 🚀 Quick Start (Local or AI Studio)

```bash
# 1. Install dependencies
npm install

# 2. Start full-stack development server (Express + Vite on port 3000)
npm run dev

# 3. Build for production deployment (Cloud Run / Custom Domain)
npm run build
npm start
```

---

## 🧭 Core Navigation & Workflows

1. **🎙️ Voice Dictation & Intake (`/voice`, `/quote`, `/intake` — Primary Landing Workspace)**
   - **Step 1 — Live Call Voice Dictation**: Uses Web Speech API + Gemini AI (`/api/dispatch/parse-voice-ticket`) to extract caller **Full Name**, **Phone Number**, **Email**, **Street Address**, **City**, **Cleaning Package**, **How Many Bedrooms**, **How Many Bathrooms**, **Recommended Hours/Cleaners**, and **Specific Instructions / Add-ons** in real time.
   - **Step 2 — Customer Request & Property Intake Form**: Matches the Customer Portal request form with service package cards, Google Places address autocomplete, **How Many Bedrooms** (`1` to `5+ Bedrooms`), **How Many Bathrooms** (`1` to `4+ Bathrooms`), add-on tags (`Inside Oven`, `Inside Fridge`, `Baseboards Scrub`, `Inside Cabinets`, `Interior Windows`, `Basement Included`, `Pets in Home`, `Lockbox Entry`), and specific access notes.
   - **Step 3 — Instant Phone Quote Calculator**: Calculates labor (`1 cleaner @ $52.50/hr`, `2 cleaners @ $105.00/hr`, or custom rate), `$12.50` fuel surcharge, loyalty/promo discounts, and `12.5%` tax. Includes 1-click **Sync Client & Create Jobber Quote (+ Google Sheet)** and **Send to Booking System & Dispatch Job**.
   - **Step 4 — Embedded Quick Map & Closest Cleaners**: Displays an interactive street & satellite map of Greater Edmonton (Edmonton, St. Albert, Sherwood Park, Leduc, Spruce Grove) pinning the caller's property and ranking the closest cleaners by driving distance and travel time.

2. **🗺️ Dispatch Map (`/`)**
   - Full-color interactive Street & Satellite map showing all 15 decentralized cleaner home hubs, active service tickets, scheduled Jobber visits, multi-stop polylines, and Kanban dispatch board.

3. **📅 Schedule (`/jobs`)**
   - Synchronized Jobber Calendar (Month/Week/Day/List views) + Unscheduled Jobs queue with 1-click cleaner assignment and route inspection.

4. **⚙️ Management Hub (`/management`)**
   - Central operations hub featuring:
     - **Voice Intakes & Quick Quote Box**
     - **Project Backup (.ZIP), Google Drive Sync & GitHub Export**
     - **Quotes Pipeline (Local DB + Jobber Delta Sync)**
     - **Invoices & Billing Ledger**
     - **Staff, Vans & Home Hubs Master Roster**
     - **Quo 5-Line Voice Desk & Contacts**
     - **Twilio Spam Shield & Area Code Call Blocker**
     - **Cloud Firestore Multi-Tenant Sync**

5. **📋 Intakes Log (`/intakes`)**
   - Dedicated view of all voice dictations, phone quotes, and online customer booking requests showing Customer Name, Phone, Address, Cleaning Type, Bedrooms, Bathrooms, Specific Instructions, and 1-click booking/Jobber dispatch.

---

## 🌐 When Do You Need to Publish to Make Changes Live on `app.tidyupscleaning.com`?

- **While testing inside AI Studio Preview**: All code edits and voice dictations work immediately in the preview window without publishing.
- **To make code/UI changes live on `app.tidyupscleaning.com`**:
  1. Click the **"Publish"** (or **"Deploy"**) button in the top-right corner of Google AI Studio after any code or layout update is finished.
  2. AI Studio compiles `npm run build` and deploys the new container revision to your Cloud Run service backing **`app.tidyupscleaning.com`**.
  3. **Live Database Entries (Voice Intakes, Quotes, Scheduled Jobs, Clients)**: Because your app is connected to **Cloud Firestore** (`ai-studio-cleaningserviced-8a2493ab-cb9d-4c28-a60b-c28e7d08d30e`) and persistent store, new quotes, bookings, and intakes created while using the live site are saved automatically—you do **not** need to re-publish for daily customer bookings or voice intakes. You only click **Publish** when we change the application's code, navigation, or features.
