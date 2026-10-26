import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Sparkles,
  Copy,
  Check,
  ExternalLink,
  ArrowLeft,
  ShieldCheck,
  Mail,
  Calendar,
  MapPin,
  Lock,
} from 'lucide-react';
import { TidyUpsBunnyLogo } from './TidyUpsBunnyLogo';
import { triggerGoogleAdsConversion } from './CookieConsentBanner';

export interface SavedThankYouBookingSummary {
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
  bedrooms?: string;
  bathrooms?: string;
  preferredDateLabel?: string;
  preferredTime?: string;
  totalAmount?: number;
  bookingId?: string;
  quoteNumber?: string;
  submittedAt?: string;
}

interface ThankYouConversionPageProps {
  isOwnerViewing?: boolean;
  onBackToBookingForm?: () => void;
  onReturnToStaffConsole?: () => void;
  onOpenStaffLogin?: () => void;
}

export const ThankYouConversionPage: React.FC<ThankYouConversionPageProps> = ({
  isOwnerViewing = false,
  onBackToBookingForm,
  onReturnToStaffConsole,
  onOpenStaffLogin,
}) => {
  const [copiedUrlKey, setCopiedUrlKey] = useState<string | null>(null);
  const [summary, setSummary] = useState<SavedThankYouBookingSummary | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const params = new URLSearchParams(window.location.search);
      const savedRaw = sessionStorage.getItem('tidyups_last_completed_booking');
      const parsed: SavedThankYouBookingSummary = savedRaw ? JSON.parse(savedRaw) : {};
      return {
        customerName: params.get('name') || parsed.customerName || '',
        firstName: params.get('firstName') || parsed.firstName || '',
        lastName: params.get('lastName') || parsed.lastName || '',
        customerPhone: params.get('phone') || parsed.customerPhone || '',
        customerEmail: params.get('email') || parsed.customerEmail || '',
        serviceType: params.get('service') || parsed.serviceType || '',
        packageName: parsed.packageName || '',
        hoursLabel: parsed.hoursLabel || '',
        address: params.get('address') || parsed.address || '',
        city: params.get('city') || parsed.city || 'Edmonton',
        bedrooms: parsed.bedrooms || '',
        bathrooms: parsed.bathrooms || '',
        preferredDateLabel: params.get('date') || parsed.preferredDateLabel || '',
        preferredTime: params.get('time') || parsed.preferredTime || '',
        totalAmount: params.get('value')
          ? Number(params.get('value'))
          : parsed.totalAmount,
        bookingId: params.get('bookingId') || parsed.bookingId || '',
        quoteNumber: params.get('quote') || parsed.quoteNumber || '',
        submittedAt: parsed.submittedAt || '',
      };
    } catch {
      return null;
    }
  });

  // Fire Google Ads Conversion & Google Tag Manager dataLayer event on mount
  useEffect(() => {
    const conversionVal =
      summary?.totalAmount && summary.totalAmount > 0 ? summary.totalAmount : 1.0;
    triggerGoogleAdsConversion(conversionVal, 'CAD');

    try {
      const w = window as any;
      w.dataLayer = w.dataLayer || [];
      w.dataLayer.push({
        event: 'thank_you_page_conversion',
        page_path: '/thank-you',
        conversion_value: conversionVal,
        currency: 'CAD',
        quote_number: summary?.quoteNumber || '',
        service_type: summary?.serviceType || 'Residential Cleaning',
      });
    } catch {
      // ignore dataLayer errors
    }
  }, [summary]);

  const handleCopyUrl = (url: string, key: string) => {
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedUrlKey(key);
    setTimeout(() => setCopiedUrlKey(null), 2500);
  };

  const displayName = (
    summary?.firstName ||
    summary?.customerName?.split(' ')[0] ||
    ''
  ).trim();

  const hasBookingDetails = Boolean(
    summary?.serviceType ||
      summary?.address ||
      summary?.customerPhone ||
      summary?.quoteNumber ||
      summary?.bookingId
  );

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-black via-zinc-950 to-black text-white font-sans flex flex-col justify-between py-6 sm:py-10 px-4">
      {/* Owner-Only Google Ads Conversion Link Control Bar */}
      {isOwnerViewing && (
        <div className="max-w-4xl w-full mx-auto mb-6 bg-zinc-950 border-2 border-emerald-500 rounded-2xl p-4 shadow-[0_0_30px_rgba(16,185,129,0.25)] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-slate-950 text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Google Ads Conversion Page (/thank-you)</span>
              </span>
              <span className="text-xs text-zinc-200 font-semibold">
                Paste this URL into <strong>Google Ads → Conversions → Page load</strong>:
              </span>
            </div>

            {onReturnToStaffConsole && (
              <button
                type="button"
                onClick={onReturnToStaffConsole}
                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer border border-zinc-600"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-pink-400" />
                <span>Back to Staff Console</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div className="flex items-center justify-between gap-2 bg-black/90 border border-emerald-500/50 rounded-xl px-3.5 py-2">
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase text-emerald-400 block">
                  Primary Google Ads Conversion URL
                </span>
                <code className="text-xs font-mono font-bold text-white truncate block">
                  https://app.tidyupscleaning.com/thank-you
                </code>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleCopyUrl('https://app.tidyupscleaning.com/thank-you', 'main-ty')
                }
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1 shrink-0 cursor-pointer"
              >
                {copiedUrlKey === 'main-ty' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 bg-black/90 border border-pink-500/40 rounded-xl px-3.5 py-2">
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase text-pink-400 block">
                  Alternate /booking Sub-Path (Also Active)
                </span>
                <code className="text-xs font-mono font-bold text-zinc-200 truncate block">
                  https://app.tidyupscleaning.com/booking/thank-you
                </code>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleCopyUrl(
                    'https://app.tidyupscleaning.com/booking/thank-you',
                    'sub-ty'
                  )
                }
                className="px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-xs font-black flex items-center gap-1 shrink-0 cursor-pointer"
              >
                {copiedUrlKey === 'sub-ty' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Thank You Conversion Card */}
      <div className="max-w-2xl w-full mx-auto my-auto bg-zinc-950 border-2 border-pink-500 rounded-3xl shadow-[0_0_60px_rgba(236,72,153,0.35)] overflow-hidden">
        {/* Top Accent Strip */}
        <div className="h-2.5 bg-gradient-to-r from-pink-500 via-red-600 to-emerald-500" />

        <div className="p-6 sm:p-10 text-center space-y-6">
          {/* Bunny Mascot + Verified Check */}
          <div className="flex flex-col items-center justify-center gap-3">
            <TidyUpsBunnyLogo size="lg" />
            <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-xs font-black uppercase tracking-wider shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Form Submitted &amp; Received ✓</span>
            </span>
          </div>

          {/* Core Thank You Heading & Subheading */}
          <div className="space-y-3">
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              {displayName
                ? `Thank you, ${displayName}, for completing the form!`
                : 'Thank you for completing the form!'}
            </h1>
            <p className="text-base sm:text-xl font-extrabold text-pink-400 max-w-lg mx-auto">
              A team member will be in touch shortly.
            </p>
            <p className="text-xs sm:text-sm text-zinc-300 max-w-md mx-auto leading-relaxed">
              Thank you for completing the form — a team member will be in touch shortly to confirm your cleaning details and arrival window. Need immediate assistance? Call us anytime at{' '}
              <a href="tel:+18338439877" className="text-emerald-400 font-black hover:underline">
                1-833-843-9877 (833-TIDYUPS)
              </a>
              .
            </p>
          </div>

          {/* Optional Submitted Form Details Card (if visitor just submitted the form) */}
          {hasBookingDetails && (
            <div className="p-5 bg-zinc-900/95 rounded-2xl border-2 border-pink-500/50 max-w-md mx-auto text-left text-xs space-y-2.5 shadow-lg">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-pink-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Submitted Request Summary</span>
                </span>
                {(summary?.bookingId || summary?.quoteNumber) && (
                  <span className="font-mono font-black text-emerald-400">
                    {summary?.bookingId ? `#${summary.bookingId}` : ''}{' '}
                    {summary?.quoteNumber ? `(${summary.quoteNumber})` : ''}
                  </span>
                )}
              </div>

              {(summary?.customerName || displayName) && (
                <div className="flex justify-between gap-2">
                  <span className="text-zinc-400 font-bold">Name:</span>
                  <span className="font-black text-white text-right">
                    {summary?.customerName ||
                      `${summary?.firstName || ''} ${summary?.lastName || ''}`.trim()}
                  </span>
                </div>
              )}

              {summary?.customerPhone && (
                <div className="flex justify-between gap-2">
                  <span className="text-zinc-400 font-bold">Mobile Number:</span>
                  <span className="font-black text-pink-300 text-right">
                    {summary.customerPhone}
                  </span>
                </div>
              )}

              {summary?.serviceType && (
                <div className="flex justify-between gap-2">
                  <span className="text-zinc-400 font-bold">Cleaning Service:</span>
                  <span className="font-black text-white text-right">
                    {summary.serviceType}
                  </span>
                </div>
              )}

              {(summary?.bedrooms || summary?.bathrooms) && (
                <div className="flex justify-between gap-2">
                  <span className="text-zinc-400 font-bold">Home Size:</span>
                  <span className="font-bold text-zinc-200 text-right">
                    {[summary.bedrooms, summary.bathrooms].filter(Boolean).join(' • ')}
                  </span>
                </div>
              )}

              {summary?.address && (
                <div className="flex justify-between gap-2">
                  <span className="text-zinc-400 font-bold flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-pink-400" />
                    <span>Address:</span>
                  </span>
                  <span className="font-bold text-white text-right">
                    {summary.address}
                    {summary.city &&
                    !summary.address.toLowerCase().includes(summary.city.toLowerCase())
                      ? `, ${summary.city}`
                      : ''}
                  </span>
                </div>
              )}

              {summary?.preferredDateLabel && (
                <div className="flex justify-between gap-2">
                  <span className="text-zinc-400 font-bold flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-emerald-400" />
                    <span>Preferred Date:</span>
                  </span>
                  <span className="font-black text-emerald-400 text-right">
                    {summary.preferredDateLabel}
                    {summary.preferredTime ? ` • ${summary.preferredTime}` : ''}
                  </span>
                </div>
              )}

              {typeof summary?.totalAmount === 'number' && summary.totalAmount > 0 && (
                <div className="flex justify-between pt-2 border-t border-zinc-800 text-sm">
                  <span className="font-black text-white">Estimated Total (incl. GST):</span>
                  <span className="font-black font-mono text-pink-400">
                    ${summary.totalAmount.toFixed(2)} CAD
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Reassurance Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-lg mx-auto pt-1">
            <div className="p-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-xs font-bold text-zinc-200 flex flex-col items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>No Upfront Charge</span>
            </div>
            <div className="p-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-xs font-bold text-zinc-200 flex flex-col items-center gap-1">
              <Sparkles className="w-4 h-4 text-pink-400" />
              <span>All Supplies Included</span>
            </div>
            <div className="p-3 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-xs font-bold text-zinc-200 flex flex-col items-center gap-1">
              <Mail className="w-4 h-4 text-red-400" />
              <span>24-Hr Guarantee</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (onBackToBookingForm) {
                  onBackToBookingForm();
                } else {
                  window.location.href = '/booking';
                }
              }}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-500 hover:to-red-500 text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Booking Form</span>
            </button>

            <a
              href="https://tidyupscleaning.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 rounded-2xl border-2 border-pink-500 text-pink-300 hover:bg-pink-950/40 text-xs sm:text-sm font-black flex items-center gap-2 transition-colors"
            >
              <span>Visit tidyupscleaning.com</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Public Footer */}
      <div className="max-w-4xl mx-auto mt-6 text-center text-xs text-zinc-400 flex flex-wrap items-center justify-center gap-4">
        <span>© {new Date().getFullYear()} TidyUps Cleaning Service Inc. • Edmonton &amp; Area</span>
        <span>•</span>
        <a
          href="mailto:booking@tidyupscleaning.com"
          className="text-pink-400 hover:underline font-bold"
        >
          booking@tidyupscleaning.com
        </a>
        {onOpenStaffLogin && !isOwnerViewing && (
          <>
            <span>•</span>
            <button
              type="button"
              onClick={onOpenStaffLogin}
              className="text-zinc-500 hover:text-pink-400 underline cursor-pointer inline-flex items-center gap-1"
            >
              <Lock className="w-3 h-3" />
              <span>Owner / Staff Login</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
