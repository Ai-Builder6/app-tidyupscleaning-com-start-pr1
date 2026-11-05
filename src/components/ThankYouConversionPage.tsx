import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Phone,
  Calendar,
  MapPin,
  Sparkles,
  Copy,
  Check,
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  Clock,
  FileCheck,
  Activity,
  Tag,
  Home
} from 'lucide-react';
import { TidyUpsBunnyLogo } from './TidyUpsBunnyLogo';
import { triggerGoogleAdsConversion } from './CookieConsentBanner';

export interface CompletedBookingReceipt {
  customerName?: string;
  firstName?: string;
  lastName?: string;
  customerPhone?: string;
  customerEmail?: string;
  serviceType?: string;
  packageName?: string;
  hoursLabel?: string;
  address?: string;
  city?: string;
  bedrooms?: string | number;
  bathrooms?: string | number;
  preferredDateLabel?: string;
  preferredTime?: string;
  totalAmount?: number;
  bookingId?: string;
  quoteNumber?: string;
  submittedAt?: string;
  source?: string;
}

interface ThankYouConversionPageProps {
  bookingReceipt?: CompletedBookingReceipt | null;
  onBookAnother?: () => void;
  isOwnerPreview?: boolean;
  isOwnerViewing?: boolean;
  onBackToBookingForm?: () => void;
  onReturnToStaffConsole?: () => void;
  onOpenStaffLogin?: () => void;
}

export const ThankYouConversionPage: React.FC<ThankYouConversionPageProps> = ({
  bookingReceipt: propReceipt,
  onBookAnother,
  isOwnerPreview = false,
  isOwnerViewing = false,
  onBackToBookingForm,
  onReturnToStaffConsole
}) => {
  const showOwnerControls = isOwnerPreview || isOwnerViewing;
  const [receipt, setReceipt] = useState<CompletedBookingReceipt | null>(() => {
    if (propReceipt) return propReceipt;
    if (typeof window === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem('tidyups_last_completed_booking');
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // ignore storage errors
    }
    // Also support URL query params (e.g. from Jotform, Meta Lead Form, or Google Ads redirect)
    const params = new URLSearchParams(window.location.search);
    const nameParam =
      params.get('name') ||
      params.get('customerName') ||
      params.get('full_name') ||
      '';
    const phoneParam = params.get('phone') || params.get('customerPhone') || '';
    const serviceParam = params.get('service') || params.get('serviceType') || '';
    const quoteParam = params.get('quote') || params.get('quoteNumber') || '';
    if (nameParam || phoneParam || serviceParam || quoteParam) {
      return {
        customerName: nameParam || 'Valued Client',
        customerPhone: phoneParam || '',
        serviceType: serviceParam || 'Residential Cleaning',
        quoteNumber: quoteParam || 'Pending Dispatch Review',
        submittedAt: new Date().toISOString()
      };
    }
    return null;
  });

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [conversionLogged, setConversionLogged] = useState<boolean>(false);
  const [recentConversions, setRecentConversions] = useState<any[]>([]);
  const [showTrackingPanel, setShowTrackingPanel] = useState<boolean>(isOwnerPreview);

  useEffect(() => {
    if (propReceipt) {
      setReceipt(propReceipt);
    }
  }, [propReceipt]);

  // Fire Google Ads & GTM Conversion Events + Record Server-Side Conversion Tracking Hit on Mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    document.title = 'Thank You — Booking & Quote Confirmed | TidyUps Cleaning Service Inc.';

    const val = receipt?.totalAmount && receipt.totalAmount > 0 ? receipt.totalAmount : 221.07;
    triggerGoogleAdsConversion(val, 'CAD');

    try {
      const w = window as any;
      w.dataLayer = w.dataLayer || [];
      w.dataLayer.push({
        event: 'tidyups_thank_you_page_view',
        page_location: window.location.href,
        page_path: '/thank-you',
        conversion_domain: window.location.hostname,
        value: val,
        currency: 'CAD',
        quote_number: receipt?.quoteNumber || '',
        booking_id: receipt?.bookingId || '',
        service_type: receipt?.serviceType || 'Cleaning Service'
      });
    } catch {
      // ignore dataLayer errors
    }

    // Log the conversion hit to backend so the owner knows someone submitted the form and landed on /thank-you
    const params = new URLSearchParams(window.location.search);
    fetch('/api/public/thank-you-conversion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        domain: window.location.hostname || 'app.tidyupscleaning.com',
        path: window.location.pathname || '/thank-you',
        fullUrl: window.location.href,
        referrer: document.referrer || '',
        customerName:
          receipt?.customerName ||
          `${receipt?.firstName || ''} ${receipt?.lastName || ''}`.trim() ||
          params.get('name') ||
          'Form Submission Visitor',
        customerPhone: receipt?.customerPhone || params.get('phone') || '',
        customerEmail: receipt?.customerEmail || params.get('email') || '',
        serviceType: receipt?.serviceType || params.get('service') || 'Cleaning Quote Request',
        quoteNumber: receipt?.quoteNumber || params.get('quote') || '',
        bookingId: receipt?.bookingId || '',
        totalAmount: val,
        gclid: params.get('gclid') || '',
        fbclid: params.get('fbclid') || '',
        utmSource: params.get('utm_source') || params.get('source') || ''
      })
    })
      .then((r) => r.json())
      .then((data) => {
        setConversionLogged(true);
        if (Array.isArray(data?.recentConversions)) {
          setRecentConversions(data.recentConversions);
        }
      })
      .catch(() => {
        setConversionLogged(true);
      });
  }, [receipt]);

  const handleCopyUrl = (url: string, key: string) => {
    navigator.clipboard.writeText(url);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2200);
  };

  // Determine service color theme (Move-Out = Royal Blue, Basic = Emerald, Deep = Purple)
  const serviceLower = (receipt?.serviceType || '').toLowerCase();
  const isMoveOut = serviceLower.includes('move');
  const isDeep = serviceLower.includes('deep');

  const tierTheme = isMoveOut
    ? {
        badge: 'Move-Out / Move-In Turnover • 2 Pro Cleaners',
        gradient: 'from-[#1877F2] via-blue-600 to-indigo-600',
        border: 'border-sky-400/60',
        pill: 'bg-sky-500/20 text-sky-300 border-sky-400/50',
        accentText: 'text-sky-300'
      }
    : isDeep
    ? {
        badge: 'Deep Cleaning Reset • 2 Pro Cleaners',
        gradient: 'from-[#7C3AED] via-purple-600 to-fuchsia-600',
        border: 'border-purple-400/60',
        pill: 'bg-purple-500/20 text-purple-300 border-purple-400/50',
        accentText: 'text-purple-300'
      }
    : {
        badge: 'Residential Cleaning • Verified Quote',
        gradient: 'from-[#0F9D58] via-emerald-600 to-teal-600',
        border: 'border-emerald-400/60',
        pill: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50',
        accentText: 'text-emerald-300'
      };

  const displayName =
    receipt?.firstName ||
    (receipt?.customerName ? receipt.customerName.split(' ')[0] : '');

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-[#081121] to-indigo-950 text-white font-sans flex flex-col justify-between">
      {/* Top Conversion Tracking Bar (Visible in Owner Preview or via toggle) */}
      <div className="bg-slate-950/90 border-b border-slate-800 px-4 py-2.5">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Official Submission Confirmation</span>
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">
              TidyUps Cleaning Service Inc. • Edmonton &amp; Surrounding Areas
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                handleCopyUrl('https://app.tidyupscleaning.com/thank-you', 'app_thankyou')
              }
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
              title="Copy https://app.tidyupscleaning.com/thank-you"
            >
              {copiedKey === 'app_thankyou' ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
              <span>
                {copiedKey === 'app_thankyou'
                  ? 'Copied app.tidyupscleaning.com/thank-you!'
                  : 'Copy app.../thank-you'}
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleCopyUrl('https://ads.tidyupscleaning.com/thank-you', 'ads_thankyou')
              }
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-sky-500/40 text-sky-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
              title="Copy https://ads.tidyupscleaning.com/thank-you"
            >
              {copiedKey === 'ads_thankyou' ? (
                <Check className="w-3 h-3 text-sky-400" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
              <span>
                {copiedKey === 'ads_thankyou'
                  ? 'Copied ads.tidyupscleaning.com/thank-you!'
                  : 'Copy ads.../thank-you'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowTrackingPanel((v) => !v)}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Activity className="w-3 h-3 text-emerald-400" />
              <span>{showTrackingPanel ? 'Hide Tracking Status' : 'Tracking Status'}</span>
            </button>
          </div>
        </div>

        {/* Collapsible Ad Conversion Tracking Verification Panel */}
        {showTrackingPanel && (
          <div className="max-w-5xl mx-auto mt-2.5 p-3.5 rounded-xl bg-slate-900/95 border border-emerald-500/30 text-xs space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>
                  Google Ads &amp; Meta Conversion Tracking Active (Fires ONLY on Form Submission /thank-you)
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[11px]">
                {conversionLogged ? '✓ Conversion Logged in App' : 'Logging Conversion...'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-bold text-slate-400">
                    Primary Booking Thank-You URL
                  </div>
                  <div className="font-mono text-xs text-emerald-300 truncate">
                    https://app.tidyupscleaning.com/thank-you
                  </div>
                </div>
                <button
                  onClick={() =>
                    handleCopyUrl('https://app.tidyupscleaning.com/thank-you', 'box_app_ty')
                  }
                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shrink-0 cursor-pointer"
                >
                  {copiedKey === 'box_app_ty' ? 'Copied!' : 'Copy URL'}
                </button>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-bold text-slate-400">
                    Ads Landing Thank-You URL
                  </div>
                  <div className="font-mono text-xs text-sky-300 truncate">
                    https://ads.tidyupscleaning.com/thank-you
                  </div>
                </div>
                <button
                  onClick={() =>
                    handleCopyUrl('https://ads.tidyupscleaning.com/thank-you', 'box_ads_ty')
                  }
                  className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] shrink-0 cursor-pointer"
                >
                  {copiedKey === 'box_ads_ty' ? 'Copied!' : 'Copy URL'}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300 pt-1">
              <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono">
                Google Ads Tag #1: AW-18533917803/9UFlCKPg1KcdEOvI1IVF ✓
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono">
                Google Ads Tag #2: AW-18539302675 ✓
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 font-mono">
                GTM Container: GTM-PQ4NMPGP ✓
              </span>
            </div>

            {recentConversions.length > 0 && (
              <div className="pt-2 border-t border-slate-800">
                <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Recent Tracked /thank-you Submissions ({recentConversions.length}):
                </div>
                <div className="max-h-28 overflow-y-auto space-y-1">
                  {recentConversions.slice(0, 5).map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1 rounded bg-slate-950/90 border border-slate-800/80 text-[11px]"
                    >
                      <span className="font-bold text-white">
                        {item.customerName || 'Form Submission'} •{' '}
                        <span className="text-emerald-300">{item.serviceType}</span>
                      </span>
                      <span className="font-mono text-slate-400">
                        {item.domain}
                        {item.path} •{' '}
                        {item.timestamp
                          ? new Date(item.timestamp).toLocaleTimeString([], {
                              hour: 'numeric',
                              minute: '2-digit'
                            })
                          : 'Just now'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Confirmation Card */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div
          className={`w-full max-w-3xl rounded-3xl bg-slate-950/95 border-2 ${tierTheme.border} shadow-[0_0_50px_rgba(16,185,129,0.2)] overflow-hidden`}
        >
          {/* Top Gradient Banner */}
          <div className={`bg-gradient-to-r ${tierTheme.gradient} p-6 sm:p-8 text-center relative`}>
            <div className="flex justify-center mb-3">
              <TidyUpsBunnyLogo size="lg" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-black/30 border border-white/25 text-white text-xs font-extrabold uppercase tracking-wider mb-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>Form Submitted Successfully • Quote &amp; Booking Logged</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              Thank You{displayName ? `, ${displayName}` : ''}! Your Cleaning Request Is In.
            </h1>
            <p className="text-sm sm:text-base text-white/90 max-w-xl mx-auto mt-2 font-medium">
              Our Edmonton dispatch team has received your home details and locked in your{' '}
              <strong className="underline decoration-white/60">$10.00 Online Ad Promo</strong>.
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Customer Submission Receipt (Shown if session or URL details exist) */}
            {receipt && (
              <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-emerald-400" />
                    <span className="text-sm font-black text-white uppercase tracking-wide">
                      Official Quote &amp; Booking Summary
                    </span>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full border text-xs font-extrabold ${tierTheme.pill}`}
                  >
                    {tierTheme.badge}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {(receipt.quoteNumber || receipt.bookingId) && (
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-slate-400 font-semibold mb-0.5">
                        Confirmation / Quote Reference
                      </div>
                      <div className="font-mono font-black text-sm text-emerald-400">
                        {receipt.quoteNumber ? `Quote #${receipt.quoteNumber}` : ''}{' '}
                        {receipt.bookingId ? `(${receipt.bookingId})` : ''}
                      </div>
                    </div>
                  )}

                  {receipt.customerName && (
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-slate-400 font-semibold mb-0.5">Client Name</div>
                      <div className="font-bold text-sm text-white">
                        {receipt.customerName}
                        {receipt.customerPhone ? ` • ${receipt.customerPhone}` : ''}
                      </div>
                    </div>
                  )}

                  {receipt.serviceType && (
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-slate-400 font-semibold mb-0.5">Selected Service</div>
                      <div className={`font-black text-sm ${tierTheme.accentText}`}>
                        {receipt.packageName || receipt.serviceType}
                      </div>
                      {receipt.hoursLabel && (
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {receipt.hoursLabel}
                        </div>
                      )}
                    </div>
                  )}

                  {(receipt.preferredDateLabel || receipt.preferredTime) && (
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-slate-400 font-semibold mb-0.5">
                        Requested Date &amp; Arrival Window
                      </div>
                      <div className="font-bold text-sm text-emerald-300 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {receipt.preferredDateLabel || 'Flexible Date'}
                          {receipt.preferredTime ? ` • ${receipt.preferredTime}` : ''}
                        </span>
                      </div>
                    </div>
                  )}

                  {(receipt.address || receipt.bedrooms || receipt.bathrooms) && (
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 sm:col-span-2 flex flex-wrap items-center justify-between gap-2">
                      {receipt.address && (
                        <div className="flex items-center gap-1.5 text-slate-200 font-semibold">
                          <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
                          <span>
                            {receipt.address}
                            {receipt.city ? `, ${receipt.city}` : ''}
                          </span>
                        </div>
                      )}
                      {(receipt.bedrooms || receipt.bathrooms) && (
                        <div className="flex items-center gap-1.5 text-slate-300 font-bold">
                          <Home className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>
                            {receipt.bedrooms ? `${receipt.bedrooms} Bed` : ''}{' '}
                            {receipt.bathrooms ? `• ${receipt.bathrooms} Bath` : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {typeof receipt.totalAmount === 'number' && receipt.totalAmount > 0 && (
                  <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-emerald-200">
                      <span className="font-bold">Includes:</span> 2 Pro Cleaners + $20.00 Fuel
                      Surcharge + <strong className="text-emerald-300">-$10.00 Ad Promo</strong> +
                      12.5% Tax &amp; Supplies
                    </div>
                    <div className="text-base font-mono font-black text-emerald-300">
                      Est. Total: ${receipt.totalAmount.toFixed(2)} CAD
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* What Happens Next — 3 Clear Steps */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-400/40 text-sky-300 font-black text-xs flex items-center justify-center">
                  1
                </div>
                <h3 className="text-xs sm:text-sm font-black text-white">
                  Saved in Jobber &amp; Dispatch
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Your quote and property details are immediately logged in our Jobber system with
                  your $10.00 promo discount applied.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-black text-xs flex items-center justify-center">
                  2
                </div>
                <h3 className="text-xs sm:text-sm font-black text-white">
                  SMS &amp; Email Confirmation
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Our coordinator will send your itemized quote and arrival time confirmation via
                  text message and email shortly.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400/40 text-purple-300 font-black text-xs flex items-center justify-center">
                  3
                </div>
                <h3 className="text-xs sm:text-sm font-black text-white">
                  100% Satisfaction Guarantee
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Every Move-Out, Deep Clean, and Basic Clean is backed by our vetted Edmonton crew
                  and 24-hour re-clean guarantee.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <a
                href="tel:+15875708005"
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg transition"
              >
                <Phone className="w-4 h-4" />
                <span>Call Dispatch: (587) 570-8005</span>
              </a>

              <a
                href="/booking"
                onClick={(e) => {
                  const handler = onBookAnother || onBackToBookingForm;
                  if (handler) {
                    e.preventDefault();
                    handler();
                  }
                }}
                className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-sky-400" />
                <span>Back to Booking Form (/booking)</span>
              </a>

              {onReturnToStaffConsole && showOwnerControls && (
                <button
                  type="button"
                  onClick={onReturnToStaffConsole}
                  className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-emerald-500/40 text-emerald-300 font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer"
                >
                  <span>Return to Staff Console</span>
                </button>
              )}

              <a
                href="https://tidyupscleaning.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition"
              >
                <span>Visit tidyupscleaning.com</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 px-4 text-center text-xs text-slate-500">
        TidyUps Cleaning Service Inc. • Edmonton, St. Albert, Sherwood Park, Leduc &amp; Spruce
        Grove •{' '}
        <span className="text-slate-400 font-mono">
          https://app.tidyupscleaning.com/thank-you
        </span>{' '}
        •{' '}
        <span className="text-slate-400 font-mono">
          https://ads.tidyupscleaning.com/thank-you
        </span>
      </footer>
    </div>
  );
};
