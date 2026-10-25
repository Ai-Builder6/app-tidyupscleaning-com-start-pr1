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

export const CookieConsentBanner: React.FC<{ onOpenPrivacyPolicy?: () => void }> = () => {
  const [isVisible, setIsVisible] = useState<boolean>(false);

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
      document.cookie = `${STORAGE_KEY}=1; max-age=31536000; path=/; SameSite=Lax`;
    } catch {
      // ignore storage write errors
    }
    applyGoogleConsentMode({ analytics, marketing });
    setIsVisible(false);
  };

  useEffect(() => {
    try {
      const hasCookie = typeof document !== 'undefined' && document.cookie.includes(`${STORAGE_KEY}=`);
      const isStaff = localStorage.getItem('tidyups_staff_authenticated') === 'true';
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CookieConsentState;
        if (parsed && parsed.decided) {
          applyGoogleConsentMode({
            analytics: Boolean(parsed.analytics),
            marketing: Boolean(parsed.marketing),
          });
          setIsVisible(false);
          return;
        }
      }
      if (hasCookie || isStaff) {
        saveConsent(true, true);
        return;
      }
    } catch {
      // ignore localStorage read errors
    }
    setIsVisible(true);
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className="fixed bottom-12 right-3 z-[9998] pointer-events-none"
      role="region"
      aria-label="Cookie Consent Banner"
      data-testid="cookie-consent-banner"
    >
      <div className="pointer-events-auto rounded-xl bg-slate-950/95 border border-pink-500/40 text-slate-100 shadow-xl backdrop-blur-md px-3 py-1.5 flex items-center gap-2.5 text-[11px]">
        <Cookie className="w-3.5 h-3.5 text-pink-400 shrink-0" />
        <span className="text-slate-200">
          Cookies enabled for online booking &amp; conversions.
        </span>
        <button
          type="button"
          onClick={() => saveConsent(true, true)}
          className="px-2.5 py-0.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-[10px] font-black flex items-center gap-1 cursor-pointer shrink-0"
          data-testid="button-accept-cookies"
        >
          <Check className="w-3 h-3" />
          <span>Approve Once</span>
        </button>
        <button
          type="button"
          onClick={() => saveConsent(false, false)}
          className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
