import React, { useState, useEffect } from 'react';
import { ShieldCheck, Cookie, Check, X, SlidersHorizontal } from 'lucide-react';

export interface CookieConsentState {
  decided: boolean;
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
}

const STORAGE_KEY = 'tidyups_cookie_consent_v1';

declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
    fireGoogleAdsBookingConversion?: (value?: number, currency?: string) => void;
  }
}

export function applyGoogleConsentMode(consent: { analytics: boolean; marketing: boolean }) {
  try {
    window.dataLayer = window.dataLayer || [];
    const gtagFn =
      window.gtag ||
      function () {
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer!.push(arguments);
      };
    window.gtag = gtagFn;

    gtagFn('consent', 'update', {
      ad_storage: consent.marketing ? 'granted' : 'denied',
      ad_user_data: consent.marketing ? 'granted' : 'denied',
      ad_personalization: consent.marketing ? 'granted' : 'denied',
      analytics_storage: consent.analytics ? 'granted' : 'denied',
      functionality_storage: 'granted',
      security_storage: 'granted',
    });

    window.dataLayer.push({
      event: 'cookie_consent_updated',
      ad_storage: consent.marketing ? 'granted' : 'denied',
      ad_user_data: consent.marketing ? 'granted' : 'denied',
      ad_personalization: consent.marketing ? 'granted' : 'denied',
      analytics_storage: consent.analytics ? 'granted' : 'denied',
    });
  } catch {
    // ignore if blocked by browser extension
  }
}

export function triggerGoogleAdsConversion(value = 1.0, currency = 'CAD') {
  try {
    if (typeof window.fireGoogleAdsBookingConversion === 'function') {
      window.fireGoogleAdsBookingConversion(value, currency);
      return;
    }
    window.dataLayer = window.dataLayer || [];
    const gtagFn =
      window.gtag ||
      function () {
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer!.push(arguments);
      };
    gtagFn('event', 'conversion', {
      send_to: 'AW-18533917803/9UFlCKPg1KcdEOvI1IVF',
      value: Number(value) > 0 ? Number(value) : 1.0,
      currency: currency || 'CAD',
    });
  } catch {
    // ignore
  }
}

export const CookieConsentBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [showCustomize, setShowCustomize] = useState<boolean>(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState<boolean>(true);
  const [marketingEnabled, setMarketingEnabled] = useState<boolean>(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CookieConsentState;
        if (parsed && parsed.decided) {
          setAnalyticsEnabled(Boolean(parsed.analytics));
          setMarketingEnabled(Boolean(parsed.marketing));
          applyGoogleConsentMode({
            analytics: Boolean(parsed.analytics),
            marketing: Boolean(parsed.marketing),
          });
          setIsVisible(false);
          return;
        }
      }
    } catch {
      // ignore localStorage read errors
    }
    setIsVisible(true);
  }, []);

  const saveConsent = (analytics: boolean, marketing: boolean) => {
    const state: CookieConsentState = {
      decided: true,
      necessary: true,
      analytics,
      marketing,
      updatedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage write errors
    }
    applyGoogleConsentMode({ analytics, marketing });
    setIsVisible(false);
    setShowCustomize(false);
  };

  if (!isVisible) return null;

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-[9998] p-3 sm:p-4 pointer-events-none"
      role="region"
      aria-label="Cookie Consent Banner"
      data-testid="cookie-consent-banner"
    >
      <div className="max-w-4xl mx-auto pointer-events-auto rounded-2xl bg-[#0B0F17]/95 border border-pink-500/40 text-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.85)] backdrop-blur-xl p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-600/20 border border-pink-500/40 flex items-center justify-center shrink-0 mt-0.5">
              <Cookie className="w-5 h-5 text-pink-400" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-extrabold text-white tracking-tight">
                  Cookie &amp; Google Ads Conversion Privacy Preferences
                </h3>
                <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-300">
                  Google Consent Mode v2
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                We use cookies to power online cleaning bookings, measure Google Ads campaign conversions (
                <span className="font-mono text-pink-300">AW-18533917803</span>), and improve service across Edmonton &amp; area.
                Click <strong>Accept All</strong> to allow booking conversion measurement, or customize your preferences.{' '}
                <a
                  href="/privacy-policy"
                  className="text-pink-400 hover:text-pink-300 underline font-semibold"
                >
                  Privacy Policy
                </a>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={() => setShowCustomize((prev) => !prev)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span>{showCustomize ? 'Hide Options' : 'Customize'}</span>
            </button>

            <button
              type="button"
              onClick={() => saveConsent(false, false)}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/15 text-slate-300 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5 text-slate-400" />
              <span>Necessary Only</span>
            </button>

            <button
              type="button"
              onClick={() => saveConsent(true, true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-black flex items-center gap-1.5 shadow-lg transition-all cursor-pointer"
              data-testid="button-accept-cookies"
            >
              <Check className="w-4 h-4" />
              <span>Accept All</span>
            </button>
          </div>
        </div>

        {showCustomize && (
          <div className="pt-3 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-white/10 flex items-start justify-between gap-2">
              <div>
                <div className="font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Essential Booking Cookies</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Required for instant quotes, address lookup, and scheduling.
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase shrink-0">Always On</span>
            </div>

            <label className="p-2.5 rounded-xl bg-slate-900/90 border border-white/10 flex items-start justify-between gap-2 cursor-pointer">
              <div>
                <div className="font-bold text-white">Analytics &amp; Performance</div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Helps us measure page speed and booking form completion (`analytics_storage`).
                </p>
              </div>
              <input
                type="checkbox"
                checked={analyticsEnabled}
                onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                className="mt-1 accent-pink-500 w-4 h-4 cursor-pointer"
              />
            </label>

            <label className="p-2.5 rounded-xl bg-slate-900/90 border border-white/10 flex items-start justify-between gap-2 cursor-pointer">
              <div>
                <div className="font-bold text-white">Google Ads Conversions</div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Measures lead conversions (`ad_storage`, `ad_user_data`, `ad_personalization`).
                </p>
              </div>
              <input
                type="checkbox"
                checked={marketingEnabled}
                onChange={(e) => setMarketingEnabled(e.target.checked)}
                className="mt-1 accent-pink-500 w-4 h-4 cursor-pointer"
              />
            </label>

            <div className="sm:col-span-3 flex justify-end pt-1">
              <button
                type="button"
                onClick={() => saveConsent(analyticsEnabled, marketingEnabled)}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold cursor-pointer"
              >
                Save Selected Preferences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
