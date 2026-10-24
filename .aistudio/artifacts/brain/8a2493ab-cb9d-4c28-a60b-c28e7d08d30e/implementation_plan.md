# In-App Live Call Screener, Original Line Attribution & Answering Console

## 1. Overview & Goals
When a customer dials one of your public Quo (OpenPhone) numbers—such as **`(587) 900-7223` (GMB Direct)**—and OpenPhone forwards the call to your Twilio Spam Shield to verify it is a real human caller, Twilio cannot loop the call back to `(587) 900-7223` without creating an infinite forwarding loop. Instead, Twilio delivers the verified call either to a **receiving line** (such as your `(587) 570-8005` Primary Dispatch line or `(833) 843-9877` TIDYUPS line) or **directly into our web app**.

This plan solves both of your core questions:
1. **Can we answer or control the call right inside our app without leaving it?**
   **Yes.** We will build a **Global Live Incoming Call Screener & Console** right inside the TidyUps app that pops up the split-second a call hits your Twilio Shield—regardless of which tab you are currently viewing (`Quick Quote`, `Schedule`, `Territory Map`, or `Management Hub`). You can answer directly inside the browser (via Twilio Client WebRTC audio when enabled) **or** pick up on your receiving Quo line while our app displays the full live caller dossier on your screen.
2. **How do we preserve the exact number that was originally dialed (`587-900-7223`) AND the customer's Caller ID?**
   Because Twilio receives both the **Customer's Caller ID (`From`)** and the **Original Dialed Quo Number (`ForwardedFrom` / 1-to-1 Shield Line Pairing)**, our app captures both pieces of information before the receiving line even rings and displays them side-by-side at the top of your screen.

---

### Decisions & Trade-Offs
- **Dual-Mode Answering (Recommended Default: Simultaneous Quo Receiving Line + In-App Live Screener HUD)**:
  - *Why*: You emphasized keeping **Quo (OpenPhone) call recordings, transcripts, and Sona AI backup** intact. If you answer *exclusively* via browser WebRTC inside our app and bypass Quo completely, Quo never sees the answered call and cannot generate its transcript. By bridging clean calls to your designated Quo receiving line (`587-570-8005` or `833-843-9877`) while simultaneously popping up the **In-App Live Call Screener & Control Bar** in our app (and optionally ringing browser WebRTC when you toggle "Answer in Browser Mode"), you get the best of both worlds: Quo still logs every transcript, and our app shows you **who is calling**, **which number they dialed (`587-900-7223`)**, and lets you **1-Click Start a Quote** or **Kill & Block a Spammer Live** without leaving the screen.
- **1-Second Answer-and-Hangup for Blocked Calls (`<Pause length="1"/><Hangup/>`)**:
  - *Why*: When OpenPhone forwards a spammer (e.g., `408` area code) to Twilio, returning a "busy" signal caused OpenPhone to pull the spammer back after 23 seconds and hand them to Sona AI. Having Twilio answer for 1 second and hang up terminates the carrier leg completely so Sona AI never picks up and you are never billed by OpenPhone AI minutes.
- **Zero-Loop 1-to-1 Campaign Mapping**:
  - *Why*: Each of your 4 Twilio Shield numbers maps 1-to-1 to one of your public Quo lines (e.g., Twilio `825-533-4317` ➔ Quo `587-900-7223 GMB Direct`). Even when all 4 Twilio Shield lines forward clean calls into a single receiving Quo inbox (`587-570-8005`), our app knows with 100% certainty which public number the customer originally dialed and displays that exact campaign name on your screen.

---

## 2. Visual Design & User Experience

### Design Paradigm & Theme Polarity
- **Atmospheric Minimalism & High-Craft Dark UI (P4 — 65%) + Kinetic Typography & Neo-Brutalist Swiss Grids (P2 — 35%)**:
  - The **Live Call Screener Console** uses an intentional dark slate obsidian surface (`#0B0F17`) with hairline `1px solid rgba(255, 255, 255, 0.08)` structural borders and high-contrast emerald (`#10B981`) for verified clean calls or crimson (`#F43F5E`) for intercepted threats.
  - All phone numbers, elapsed call timers, area codes, and historical quote totals enforce `font-variant-numeric: tabular-nums` (`font-mono`) for instant scannability while the phone is ringing.
  - **Zero-Pill Metadata Discipline**: Campaign tags, dialed line labels, and spam scores are rendered as crisp typographic data cells separated by `1px` vertical dividers rather than cluttered rounded badges.

### Key Interface Components

#### A. Global Floating Live Call Screener HUD (Top-Right Command Overlay)
Whenever a call passes through your Twilio Shield, a sleek command console slides into the top-right corner of the app (regardless of which tab you have open):
- **Row 1 — Live Status & Elapsed Ring Timer**:
  - Pulsing emerald status dot + `INCOMING VERIFIED CALL` + live `tabular-nums` ring timer (`00:04`).
- **Row 2 — Customer Caller ID & CRM Match**:
  - Large monospace display of the customer's phone number (e.g., `(780) 600-0607`), caller name/city if known, and instant match against your existing TidyUps Clients & Quotes (showing previous address, square footage, and last quote price if they have called before).
- **Row 3 — Original Dialed Line & Marketing Attribution Box**:
  - Explicitly highlights **which public number the customer dialed** vs. **which line is ringing**:
    - `ORIGINAL LINE DIALED`: **`(587) 900-7223` — GMB Direct (Main Line)**
    - `ROUTED TO`: **`(587) 570-8005` — Quo Primary Dispatch / In-App Audio**
- **Row 4 — Instant In-App Action Bar**:
  - **`Start Quote with Caller`**: Immediately opens the Quick Quote calculator and auto-populates the caller's phone number, matched name/address, and lead source (`GMB Direct - 587-900-7223`) without typing a single digit.
  - **`Answer in App` / `Audio Bridge`**: Connects browser audio directly if Browser Softphone mode is enabled, or marks the call active on your screen while you talk on Quo.
  - **`Drop & Block Caller`**: Immediately severs the live Twilio call in mid-ring and adds the caller's number to your Blocklist.
  - **`Drop & Block Area Code (e.g. 408*)`**: Immediately severs the live call and permanently blocks that entire 3-digit area code so they can never rotate the last 4 digits again.

#### B. Live Attribution Feed & "Test Incoming Call" Simulator inside Spam Shield
- Inside the **Twilio Spam Shield** modal and dashboard view:
  - A **Live Call Attribution Table** showing the last 25 calls with 4 clear columns: **Time**, **Customer Caller ID**, **Original Number Dialed (Campaign)**, and **Action / Destination Line** (with 1-click `Quote` and `Block Area Code` actions on every historical row).
  - A **`Simulate Live Call`** button so you can test the exact pop-up screener banner at any time (simulating a customer dialing `587-900-7223`, passing through Twilio `825-533-4317`, and popping up on your screen with full attribution).

---

## 3. System Architecture & Call Flow

```text
Customer Dials Public Line: (587) 900-7223 (Quo GMB Direct)
       │
       ▼  (OpenPhone Call Forwarding to paired Twilio Shield Line)
Twilio Shield Line: +1 (825) 533-4317
       │
       ▼  POST /api/twilio/voice (From: Customer, To: 825-533-4317, ForwardedFrom: 587-900-7223)
┌─────────────────────────────────────────────────────────────────────────┐
│ TidyUps Spam Shield Engine                                              │
│  1. Checks Blocked Prefixes (1408*, 1301*, 1406*, 1800*, etc.)          │
│  2. Checks Blocklist & Nomorobo / Carrier Robocall Score                │
│  3. Resolves Original Dialed Line: (587) 900-7223 ("GMB Direct")        │
└──────┬───────────────────────────────────────────────────────────┬──────┘
       │                                                           │
  [IF SPAM / BLOCKED]                                       [IF CLEAN HUMAN]
       │                                                           │
       ▼                                                           ▼
Twilio TwiML:                                      1. Broadcasts Live Incoming Call Event
<Pause length="1"/><Hangup/>                          to TidyUps App Screener HUD:
(Answers 1s & hangs up completely                     • Customer ID: (780) 600-0607
 so Quo never pulls call back                         • Dialed Line: (587) 900-7223 (GMB Direct)
 to Sona AI — $0 AI cost)                             • CRM Match & 1-Click Quote Pre-fill
                                                   2. Bridges Audio (<Dial answerOnBridge="true">)
                                                      to Receiving Line (587-570-8005 / 833-843-9877)
                                                      so Quo records & transcribes the call!
```

---

## 4. Functional Implementation Steps

1. **Original-Line Attribution Engine & Active Call Registry**:
   - Enhance the Twilio voice webhook handler so every incoming call records:
     - `callSid`: Twilio's unique live call identifier (allowing mid-call hangup/blocking from our UI).
     - `callerNumber`: Customer's real phone number (`From`).
     - `shieldNumber`: The Twilio number that screened the call (`To`).
     - `originalDialedNumber` & `campaignLabel`: Resolved automatically from `ForwardedFrom` or the 1-to-1 Twilio-to-Quo mapping (e.g., `(587) 900-7223 — GMB Direct`).
     - `destinationNumber`: The receiving Quo line (`(587) 570-8005` or `(833) 843-9877`).
     - `crmMatch`: Automatic lookup against saved Clients, Quotes, and Bookings by phone number.
2. **Real-Time In-App Call Screener Endpoint & Live Control Actions**:
   - Add `/api/twilio/live-calls` (polled every 2 seconds while the app is open, plus instant trigger on test/webhook) to surface ringing or active calls in real time.
   - Add `/api/twilio/live-calls/:callSid/terminate` so clicking **Drop & Block Caller** or **Drop & Block Area Code** inside the web app uses the Twilio REST API (`calls(callSid).update({ status: 'completed' })`) to immediately hang up the live call and save the new block rule.
   - Add `/api/twilio/live-calls/simulate` so you can trigger a realistic test ring on `(587) 900-7223` from inside the app and verify how the screener banner looks and pre-fills a Quick Quote.
3. **Global Floating Call Screener HUD & 1-Click Quote Pre-Fill**:
   - Mount the floating `LiveCallScreenerHUD` at the top level of the application so it works across all tabs.
   - Wire **`Start Quote with Caller`** to switch directly to the Quick Quote tab and pre-populate the customer's phone number, name/address (if matched in CRM), and the exact marketing campaign line they dialed (`587-900-7223 GMB Direct`).
   - Add an **In-App Call Screener & Answering Mode** section inside the Twilio Spam Shield settings so you can test the banner with 1 click and see the live attribution log of every call.
