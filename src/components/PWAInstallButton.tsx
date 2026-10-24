import React, { useState } from 'react';
import {
  Download,
  Smartphone,
  Tablet,
  Monitor,
  Share,
  PlusSquare,
  CheckCircle2,
  X,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export type DeviceLayoutOverride = 'AUTO' | 'IPHONE' | 'IPAD' | 'DESKTOP';

interface PWAInstallButtonProps {
  deviceOverride?: DeviceLayoutOverride;
  onChangeDeviceOverride?: (mode: DeviceLayoutOverride) => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  deviceOverride = 'AUTO',
  onChangeDeviceOverride,
}) => {
  const { isInstallable, isInstalled, isIOS, isIPad, isIPhone, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://app.tidyupscleaning.com';

  const handleCopyUrl = () => {
    try {
      navigator.clipboard.writeText(appUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {}
  };

  return (
    <>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Direct 1-Click Install when Chromium / Desktop / Android supports beforeinstallprompt */}
        {isInstallable && !isInstalled && (
          <button
            type="button"
            onClick={install}
            className="min-h-[34px] sm:min-h-[36px] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer flex-shrink-0"
            title="Install TidyUps App directly on this device"
            aria-label="Install TidyUps App"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Install App</span>
          </button>
        )}

        {/* Always-Available iPhone & iPad Mobile App Setup + Layout Switcher Button */}
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`min-h-[34px] sm:min-h-[36px] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer flex-shrink-0 border ${
            deviceOverride === 'IPHONE' || deviceOverride === 'IPAD' || isIOS
              ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white border-pink-400/50 shadow-sm'
              : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-200'
          }`}
          title="Install on iPhone / iPad Home Screen or switch between iPhone, iPad, and Desktop layout modes"
          aria-label="iPhone & iPad App Setup"
        >
          {isIPad || deviceOverride === 'IPAD' ? (
            <Tablet className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <Smartphone className="w-3.5 h-3.5 shrink-0" />
          )}
          <span className="hidden sm:inline">
            {deviceOverride === 'IPHONE'
              ? 'iPhone Mode'
              : deviceOverride === 'IPAD'
              ? 'iPad Mode'
              : isIPhone
              ? 'Install on iPhone'
              : isIPad
              ? 'Install on iPad'
              : 'iPhone / iPad App'}
          </span>
          <span className="sm:hidden">iOS App</span>
        </button>
      </div>

      {/* iPhone & iPad Installation + Layout Switcher Modal */}
      {showIOSGuide && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-5 sm:p-6 space-y-4 text-slate-800 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-600 to-purple-600 text-white flex items-center justify-center shadow-md">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    TidyUps for iPhone &amp; iPad
                  </h3>
                  <p className="text-xs text-slate-500">
                    Full-screen iOS Home Screen App &amp; Touch Layout
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Instant Device Layout Switcher */}
            {onChangeDeviceOverride && (
              <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-pink-600" />
                    <span>Screen Layout Mode</span>
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    Auto-Detects iPhone &amp; iPad
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {(
                    [
                      { id: 'AUTO', label: 'Auto Fit', icon: Sparkles },
                      { id: 'IPHONE', label: 'iPhone', icon: Smartphone },
                      { id: 'IPAD', label: 'iPad', icon: Tablet },
                      { id: 'DESKTOP', label: 'Desktop', icon: Monitor },
                    ] as const
                  ).map((item) => {
                    const Icon = item.icon;
                    const active = deviceOverride === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onChangeDeviceOverride(item.id)}
                        className={`px-2.5 py-2 rounded-xl text-xs font-extrabold flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer ${
                          active
                            ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white border-transparent shadow-sm'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  <strong>Auto Fit</strong> automatically switches to the 1-thumb bottom navigation bar on iPhone and touch split-view on iPad, or you can force <strong>iPhone</strong> / <strong>iPad</strong> mode above to preview it right now.
                </p>
              </div>
            )}

            {/* Step-by-Step iPhone & iPad Safari Home Screen Installation */}
            <div className="space-y-2.5 text-xs">
              <div className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                How to Install as a Full-Screen App on iPhone &amp; iPad:
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="w-6 h-6 rounded-full bg-pink-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                  1
                </div>
                <div className="flex-1">
                  <span className="font-extrabold text-slate-900">
                    Open in Safari on your iPhone or iPad
                  </span>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={appUrl}
                      className="flex-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-mono text-slate-700"
                    />
                    <button
                      type="button"
                      onClick={handleCopyUrl}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      {copiedUrl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedUrl ? 'Copied' : 'Copy Link'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="w-6 h-6 rounded-full bg-pink-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                  2
                </div>
                <div>
                  <span className="font-extrabold text-slate-900">Tap the Safari Share Button</span>
                  <p className="text-slate-600 text-[11px] mt-0.5 flex items-center gap-1 flex-wrap">
                    Tap <Share className="w-3.5 h-3.5 text-blue-600 inline" /> at the bottom of your iPhone screen (or top-right toolbar on iPad).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="w-6 h-6 rounded-full bg-pink-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                  3
                </div>
                <div>
                  <span className="font-extrabold text-slate-900">
                    Tap &quot;Add to Home Screen&quot;
                  </span>
                  <p className="text-slate-600 text-[11px] mt-0.5 flex items-center gap-1 flex-wrap">
                    Scroll down the Share sheet and tap <PlusSquare className="w-3.5 h-3.5 text-slate-700 inline" /> <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-snug">
                  <strong>Works like a native iOS App:</strong> Launches full-screen from your iPhone or iPad home screen with your TidyUps icon, bottom thumb-bar navigation, live incoming call capture, and GPS route map.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-xl text-xs font-black transition-all shadow-md cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
};
