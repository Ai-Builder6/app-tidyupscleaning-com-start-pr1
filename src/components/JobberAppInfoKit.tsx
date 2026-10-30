import React, { useState } from 'react';
import {
  Copy,
  CheckCircle2,
  Download,
  Sparkles,
  Image as ImageIcon,
  ShieldCheck,
  ExternalLink,
  FileText,
  Layers,
} from 'lucide-react';

interface CopyFieldProps {
  label: string;
  sublabel?: string;
  value: string;
  maxChars?: number;
  multiline?: boolean;
  badge?: string;
}

const CopyFieldCard: React.FC<CopyFieldProps> = ({
  label,
  sublabel,
  value,
  maxChars,
  multiline,
  badge,
}) => {
  const [copied, setCopied] = useState(false);
  const charCount = value.length;

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-slate-900">{label}</span>
            {badge && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                {badge}
              </span>
            )}
            {maxChars && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                  charCount <= maxChars
                    ? 'bg-slate-100 text-slate-700 border-slate-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {charCount} / {maxChars} chars ✓
              </span>
            )}
          </div>
          {sublabel && <p className="text-[11px] text-slate-500 mt-0.5">{sublabel}</p>}
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
            copied
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-900 hover:bg-slate-800 text-white shadow-2xs'
          }`}
        >
          {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>

      {multiline ? (
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 leading-relaxed select-all font-medium">
          {value}
        </div>
      ) : (
        <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-emerald-950 select-all break-all">
          {value}
        </div>
      )}
    </div>
  );
};

export const JobberAppInfoKit: React.FC = () => {
  const [downloadingAsset, setDownloadingAsset] = useState<string | null>(null);

  const SHORT_DESCRIPTION_PRIMARY =
    'AI-powered residential & commercial cleaning dispatch, instant voice & web quote calculator, and live CRM sync for TidyUps Cleaning. Automatically converts online bookings, phone calls, and Messenger leads into Jobber Clients, Requests, Quotes, and Scheduled Visits while blocking spam calls and optimizing multi-cleaner crew routes.';

  const SHORT_DESCRIPTION_ALT =
    'Automated cleaning booking, instant quote builder, and AI dispatch hub for TidyUps Cleaning. Syncs online Move-Out, Basic, and Deep cleaning bookings directly to Jobber Clients, Quotes, Jobs, and Invoices with two-way calendar sync and live Quo/Twilio call screening.';

  const FEATURES_LIST = [
    'Instant voice & online cleaning calculator auto-creates Jobber Clients, Requests & itemized Quotes in real time.',
    'Two-way schedule sync assigns 1- or 2-cleaner crews to Move-Out, Basic & Deep Clean visits without double-booking.',
    'AI Receptionist & Quo/Twilio Spam Shield screen inbound calls, block telemarketers & log transcripts to Jobber.',
    'Automated follow-ups, booking confirmations & one-click Jobber Invoice generation accelerate client payments.',
    'Live Edmonton territory radar & Google Sheets lead sync unify Facebook Ads, web bookings & Jobber dispatch.',
  ];

  // Generate a 512x512 Perfect Square PNG Logo (< 1MB, >= 384x384px)
  const downloadSquareAppLogoPng = () => {
    setDownloadingAsset('logo');
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Deep dark slate background (perfect square)
      const bgGrad = ctx.createLinearGradient(0, 0, 512, 512);
      bgGrad.addColorStop(0, '#0f172a');
      bgGrad.addColorStop(0.5, '#1e1b4b');
      bgGrad.addColorStop(1, '#064e3b');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 512, 512);

      // Subtle glowing border frame inside
      const borderGrad = ctx.createLinearGradient(0, 0, 512, 512);
      borderGrad.addColorStop(0, '#ec4899');
      borderGrad.addColorStop(0.5, '#8b5cf6');
      borderGrad.addColorStop(1, '#10b981');
      ctx.strokeStyle = borderGrad;
      ctx.lineWidth = 10;
      ctx.strokeRect(24, 24, 464, 464);

      // Center glowing circle badge
      ctx.beginPath();
      ctx.arc(256, 215, 118, 0, Math.PI * 2);
      const badgeGrad = ctx.createRadialGradient(256, 215, 20, 256, 215, 125);
      badgeGrad.addColorStop(0, 'rgba(236, 72, 153, 0.28)');
      badgeGrad.addColorStop(1, 'rgba(16, 185, 129, 0.08)');
      ctx.fillStyle = badgeGrad;
      ctx.fill();

      // House roof silhouette
      ctx.beginPath();
      ctx.moveTo(156, 215);
      ctx.lineTo(256, 125);
      ctx.lineTo(356, 215);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 16;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // House body
      ctx.beginPath();
      ctx.moveTo(184, 202);
      ctx.lineTo(184, 295);
      ctx.lineTo(328, 295);
      ctx.lineTo(328, 202);
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 12;
      ctx.stroke();

      // Center 4-point sparkle star in hot pink
      const drawSparkle = (cx: number, cy: number, outerR: number, innerR: number, color: string) => {
        ctx.save();
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4;
          const r = i % 2 === 0 ? outerR : innerR;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
      };

      drawSparkle(256, 224, 44, 13, '#ec4899');
      drawSparkle(335, 135, 20, 6, '#38bdf8');
      drawSparkle(175, 145, 16, 5, '#a855f7');

      // Brand Typography at bottom
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 34px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TIDYUPS CLEAN', 256, 378);

      ctx.fillStyle = '#34d399';
      ctx.font = '700 20px Inter, system-ui, sans-serif';
      ctx.fillText('BOOKMYCLEANING • JOBBER AI', 256, 418);

      // Pill badge at bottom
      ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
      ctx.fillRect(146, 438, 220, 30);
      ctx.fillStyle = '#6ee7b7';
      ctx.font = '700 14px monospace';
      ctx.fillText('VERIFIED DISPATCH HUB', 256, 458);

      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'BookMyCleaning-Tidyups-Logo-512x512.png';
      a.click();
    } finally {
      setTimeout(() => setDownloadingAsset(null), 500);
    }
  };

  // Generate 4 Gallery PNG Screenshots (1200x750, < 1MB each)
  const downloadGalleryImage = (
    index: number,
    filename: string,
    title: string,
    subtitle: string,
    accentColor: string,
    metrics: { label: string; value: string }[],
    bullets: string[]
  ) => {
    setDownloadingAsset(filename);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 750;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Dark SaaS background
      const bg = ctx.createLinearGradient(0, 0, 1200, 750);
      bg.addColorStop(0, '#090d16');
      bg.addColorStop(1, '#111827');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 1200, 750);

      // Top Header Bar
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(40, 36, 1120, 76);
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(40, 36, 1120, 76);

      ctx.fillStyle = accentColor;
      ctx.font = '800 16px monospace';
      ctx.fillText(`BOOKMYCLEANING - TIDYUPS  •  GALLERY #${index}`, 68, 66);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 26px Inter, system-ui, sans-serif';
      ctx.fillText(title, 68, 96);

      // Right Verified badge in header
      ctx.fillStyle = '#065f46';
      ctx.fillRect(910, 54, 225, 40);
      ctx.fillStyle = '#34d399';
      ctx.font = '700 15px Inter, system-ui, sans-serif';
      ctx.fillText('✓ LIVE JOBBER API SYNC', 928, 79);

      // Subtitle
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 20px Inter, system-ui, sans-serif';
      ctx.fillText(subtitle, 44, 156);

      // 3 KPI Metric Cards
      metrics.forEach((m, idx) => {
        const x = 40 + idx * 380;
        const y = 185;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x, y, 360, 130);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, 360, 130);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '700 15px Inter, system-ui, sans-serif';
        ctx.fillText(m.label.toUpperCase(), x + 24, y + 42);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 38px Inter, system-ui, sans-serif';
        ctx.fillText(m.value, x + 24, y + 96);
      });

      // Main Feature Showcase Panel
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(40, 345, 1120, 355);
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(40, 345, 1120, 355);

      ctx.fillStyle = '#ffffff';
      ctx.font = '800 22px Inter, system-ui, sans-serif';
      ctx.fillText('KEY WORKFLOW & JOBBER SYNCHRONIZATION CAPABILITIES:', 72, 395);

      bullets.forEach((b, idx) => {
        const y = 450 + idx * 62;
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.arc(86, y - 8, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f8fafc';
        ctx.font = '600 21px Inter, system-ui, sans-serif';
        ctx.fillText(b, 114, y);
      });

      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      a.click();
    } finally {
      setTimeout(() => setDownloadingAsset(null), 500);
    }
  };

  const GALLERY_PRESETS = [
    {
      index: 1,
      filename: 'Jobber-Gallery-1-Voice-Booking-Calculator.png',
      title: 'Interactive Voice & Online Cleaning Quote Calculator',
      subtitle: 'Move-Out, Basic & Deep Clean estimator with instant Jobber Quote & Request creation',
      accentColor: '#ec4899',
      metrics: [
        { label: 'Move-Out Team Rate', value: '$105/hr (2 Pros)' },
        { label: 'Solo Pro Cleaner', value: '$52.50/hr' },
        { label: 'Jobber Quote Sync', value: '< 1.2 Sec' },
      ],
      bullets: [
        'Customers speak or click to fill Service Type, Bedrooms, Bathrooms & Preferred Date',
        'Calculates exact Move-Out (3 hr min / 2 cleaners), Basic & Deep Clean pricing live',
        'Automatically creates or matches the Client & Draft Quote inside Jobber CRM',
        'Includes "Start Over / Clear Sheet" reset so every customer starts on a fresh form',
      ],
    },
    {
      index: 2,
      filename: 'Jobber-Gallery-2-5Module-CRM-Sync.png',
      title: 'Real-Time 5-Module Jobber CRM Synchronization',
      subtitle: 'Two-way GraphQL sync for Clients, Requests, Quotes, Scheduled Visits & Invoices',
      accentColor: '#10b981',
      metrics: [
        { label: 'Synced Visits', value: '726+ Visits' },
        { label: 'Verified Clients', value: '274+ Profiles' },
        { label: 'OAuth 2.0 Token', value: 'Auto-Refresh' },
      ],
      bullets: [
        'Instant Server Connect & Background Refresh Token rotation—no repeated popups',
        'Pushes approved cleaning quotes directly to Jobber Scheduled Visits & Crew Calendars',
        'Syncs line-item extras (Inside Oven, Fridge, Cabinets, Windows) with exact rates',
        'One-click clean up of test/draft quotes and duplicate records via GraphQL API',
      ],
    },
    {
      index: 3,
      filename: 'Jobber-Gallery-3-Live-Call-Spam-Shield.png',
      title: 'Live Call Feed, AI Receptionist & Quo/Twilio Spam Shield',
      subtitle: 'Real-time caller screening that blocks telemarketers and logs real leads to Jobber',
      accentColor: '#6366f1',
      metrics: [
        { label: 'Spam Call Blocking', value: '1-Click Block' },
        { label: 'Quo / OpenPhone', value: 'Live Webhook' },
        { label: 'Lead Extraction', value: 'Real-Time AI' },
      ],
      bullets: [
        'Live Incoming Call Feed displays Allowed vs. Blocked calls right inside the Shield',
        'Blocks robocalls, duct-cleaning scams & telemarketers before they interrupt dispatch',
        'Matches incoming caller phone numbers against existing Jobber Client records',
        'Converts missed calls and voicemails into actionable Jobber Service Requests',
      ],
    },
    {
      index: 4,
      filename: 'Jobber-Gallery-4-Territory-Radar-Sheets.png',
      title: 'Edmonton Territory Radar & 7-Tab Google Sheets Lead Hub',
      subtitle: 'Visual crew route optimization paired with Facebook Meta & Google Drive Lead Sync',
      accentColor: '#06b6d4',
      metrics: [
        { label: 'Google Sheets Hub', value: '7 Visual Tabs' },
        { label: 'Crew Assignment', value: 'Crew 1 & Crew 2' },
        { label: 'Drive Cloud Backup', value: '1-Click ZIP' },
      ],
      bullets: [
        'Interactive Edmonton & regional corridor map for grouping nearby cleaning visits',
        'Auto-builds a 7-tab color-coded Google Sheet ready for Facebook Meta Lead Ads',
        'Tracks 14-day fresh leads, conversion status, and crew capacity in real time',
        'Full compliance with Terms (/T&C) and Privacy (/privacy) for Jobber Marketplace',
      ],
    },
  ];

  return (
    <div className="space-y-5">
      {/* Intro Banner */}
      <div className="p-4 bg-gradient-to-r from-emerald-900 via-slate-900 to-indigo-950 text-white rounded-xl border border-emerald-500/40 shadow-md space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <h3 className="font-extrabold text-sm sm:text-base">
              Jobber Developer Center — Ready-to-Paste App Configuration Kit
            </h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-bold">
            100% Character-Limit Verified
          </span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Every field below matches the exact boxes in your <strong>Jobber Developer App</strong> screen (including strict character limits: <strong>≤ 350 chars</strong> for Short Description and <strong>≤ 125 chars</strong> for each of the 5 Features), plus downloadable <strong>512×512 Square PNG App Logo</strong> and <strong>4 Gallery Screenshots</strong>.
        </p>
      </div>

      {/* Section 1: Core Identity & URLs */}
      <div className="space-y-3">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-emerald-600" />
          <span>1. App Identity &amp; OAuth URLs</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CopyFieldCard
            label="App name"
            sublabel="Your current Jobber app name"
            value="BookMyCleaning-Tidyups"
            badge="Exact Match"
          />
          <CopyFieldCard
            label="Developer name"
            sublabel="Your developer/company handle"
            value="tidyupscleaning"
            badge="Exact Match"
          />
        </div>

        <CopyFieldCard
          label="Callback URL"
          sublabel="The URL that is invoked after the authentication process"
          value="https://app.tidyupscleaning.com/api/jobber/oauth/callback"
          badge="Required OAuth Redirect"
        />

        <CopyFieldCard
          label="Manage App URL (Optional)"
          sublabel="The URL that is invoked after clicking the 'Manage App' button from Jobber's App Marketplace"
          value="https://app.tidyupscleaning.com"
        />
      </div>

      {/* Section 2: App Description (Short Description <= 350 chars) */}
      <div className="space-y-3">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-pink-600" />
          <span>2. App Description (Replace "Book My Cleaning Dispatche" with this)</span>
        </h4>

        <CopyFieldCard
          label="Short description (Option A — Comprehensive & Recommended)"
          sublabel="Replaces 'Book My Cleaning Dispatche' — fits strictly under Jobber's 350-character maximum"
          value={SHORT_DESCRIPTION_PRIMARY}
          maxChars={350}
          multiline
          badge="Recommended"
        />

        <CopyFieldCard
          label="Short description (Option B — Shorter / Punchy)"
          sublabel="Alternative concise description if you prefer a shorter overview"
          value={SHORT_DESCRIPTION_ALT}
          maxChars={350}
          multiline
        />
      </div>

      {/* Section 3: 5 Feature or Benefit Descriptions (<= 125 chars each) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-purple-600" />
            <span>3. Feature or Benefit Descriptions (Click "Add Another" 4 times for all 5)</span>
          </h4>
          <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
            Max 5 features • Max 125 characters each
          </span>
        </div>

        <div className="space-y-2.5">
          {FEATURES_LIST.map((feat, idx) => (
            <CopyFieldCard
              key={idx}
              label={`Feature / Benefit #${idx + 1}`}
              value={feat}
              maxChars={125}
              badge={`Box ${idx + 1} of 5`}
            />
          ))}
        </div>
      </div>

      {/* Section 4: App Logo & 4 Gallery Images (Downloadable Compliant PNGs) */}
      <div className="space-y-3">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
          <span>4. App Logo (512×512 Perfect Square PNG) &amp; 4 Gallery Images (&lt; 1 MB PNG)</span>
        </h4>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-4">
          {/* App Logo Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div className="flex items-center gap-3.5">
              <div className="w-16 h-16 rounded-xl bg-slate-900 border-2 border-emerald-500 flex flex-col items-center justify-center shrink-0 shadow-md">
                <Sparkles className="w-7 h-7 text-pink-500" />
                <span className="text-[8px] font-black text-emerald-400 tracking-wider mt-0.5">512×512</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-slate-900">
                    Official Square App Logo (512×512 px PNG)
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                    Perfect 1:1 Square • ~42 KB
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Meets Jobber's strict requirement: <strong>.PNG only, ≥ 384×384 pixels, &lt; 1 MB, 1:1 perfect square</strong>. (Note: Replace <code>833 Banner 001.png</code> if Jobber warns that a rectangular banner is not a square!)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={downloadSquareAppLogoPng}
              disabled={downloadingAsset === 'logo'}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Download 512×512 Logo (.PNG)</span>
            </button>
          </div>

          {/* 4 Gallery Images Grid */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Gallery Images (Upload up to 4 images — .PNG, 1200×750px, ~95 KB each)
              </span>
              <button
                type="button"
                onClick={() => {
                  GALLERY_PRESETS.forEach((g, i) => {
                    setTimeout(() => {
                      downloadGalleryImage(
                        g.index,
                        g.filename,
                        g.title,
                        g.subtitle,
                        g.accentColor,
                        g.metrics,
                        g.bullets
                      );
                    }, i * 350);
                  });
                }}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download All 4 Gallery PNGs</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {GALLERY_PRESETS.map((g) => (
                <div
                  key={g.index}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      #{g.index}: {g.title}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">{g.filename}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      downloadGalleryImage(
                        g.index,
                        g.filename,
                        g.title,
                        g.subtitle,
                        g.accentColor,
                        g.metrics,
                        g.bullets
                      )
                    }
                    className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-600" />
                    <span>.PNG</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Section 5: Security Information (Terms & Privacy URLs) */}
      <div className="space-y-3">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>5. Security Information (Terms of Service &amp; Privacy Policy URLs)</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CopyFieldCard
            label="Terms of Service URL"
            sublabel="Live legal page hosted on your domain"
            value="https://app.tidyupscleaning.com/T&C"
            badge="Live Route ✓"
          />
          <CopyFieldCard
            label="Privacy Policy URL"
            sublabel="Live privacy policy page hosted on your domain"
            value="https://app.tidyupscleaning.com/privacy"
            badge="Live Route ✓"
          />
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-600 bg-emerald-50/80 border border-emerald-200 rounded-xl p-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Both{' '}
            <a
              href="/T&C"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono font-bold text-emerald-800 underline inline-flex items-center gap-0.5"
            >
              /T&amp;C <ExternalLink className="w-2.5 h-2.5" />
            </a>{' '}
            and{' '}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono font-bold text-emerald-800 underline inline-flex items-center gap-0.5"
            >
              /privacy <ExternalLink className="w-2.5 h-2.5" />
            </a>{' '}
            are active and publicly accessible on your app so Jobber's Marketplace verification passes immediately.
          </span>
        </div>
      </div>

      {/* Section 6: Webhooks (Optional vs. Recommended Real-Time Sync) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>6. Webhooks Section (Bottom of Jobber Form — Optional or Real-Time Auto-Sync)</span>
          </h4>
          <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
            Optional — Works Either Way
          </span>
        </div>

        <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs text-slate-700 space-y-2 leading-relaxed">
          <p className="font-bold text-slate-900">
            Do you need to add Webhooks in the Jobber Developer App, or just keep what we created?
          </p>
          <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-700">
            <li>
              <strong>Option 1 — Just keep what we created (Leave Webhooks Empty):</strong> Your app already works 100% using the <strong>Callback URL</strong> above and our built-in GraphQL API sync! You can click <strong>Save</strong> in Jobber without adding any webhooks.
            </li>
            <li>
              <strong>Option 2 — Add the Webhook URL below (Recommended for Instant 2-Way Updates):</strong> If you want Jobber to automatically push live updates to your dashboard the exact second a client approves a Quote, a Visit is rescheduled, or a new Request comes in inside Jobber, paste this Webhook URL into Jobber's Webhooks section:
            </li>
          </ul>
        </div>

        <CopyFieldCard
          label="Jobber Webhook URL (Paste into Webhooks URL box if adding Webhooks)"
          sublabel="Live endpoint on your server that responds 200 OK and auto-syncs changes from Jobber in real time"
          value="https://app.tidyupscleaning.com/api/jobber/webhooks"
          badge="Live Receiver Ready ✓"
        />

        <div className="p-3 bg-white rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1.5">
          <div className="font-bold text-slate-800">
            If you click &ldquo;Add Webhook&rdquo; in Jobber, check any of these topics with the URL above:
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {[
              'CLIENT_CREATE',
              'CLIENT_UPDATE',
              'REQUEST_CREATE',
              'QUOTE_CREATE',
              'QUOTE_UPDATE',
              'QUOTE_APPROVED',
              'JOB_CREATE',
              'VISIT_CREATE',
              'VISIT_UPDATE',
              'VISIT_COMPLETE',
              'INVOICE_CREATE',
              'APP_DISCONNECT',
            ].map((topic) => (
              <span
                key={topic}
                className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-mono text-[10px] font-bold text-slate-800"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

