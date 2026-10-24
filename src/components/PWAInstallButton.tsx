import React, { useState } from 'react';
import { createPortal } from 'react-dom';
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
  const [shareNote, setShareNote] = useState<string | null>(null);

  const appUrl =
    typeof window !== 'undefined' ? window.location.origin : 'https://app.tidyupscleaning.com';

  const handleCopyUrl = () => {
    try {
      navigator.clipboard.writeText(appUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {}
  };

  // On iPhone & iPad (Safari or Chrome), navigator.share() opens the native iOS Share Sheet directly!
  const handleTriggerNativeIOSShareSheet = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'TidyUps Dispatch App',
          text: 'Add TidyUps Dispatch App to Home Screen',
          url: appUrl,
        });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }
    setShareNote(
      'Tap the Share icon [↑] in your top browser address bar, then tap "Add to Home Screen".'
    );
  };

  const modalContent =
    showIOSGuide && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm animate-fadeIn overflow-y-auto"
            role="dialog"
            aria-modal="true"
            onClick={() => setShowIOSGuide(false)}
          >
            <div
              className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl p-5 sm:p-6 space-y-4 text-slate-800 my-auto max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-pink-600 to-purple-600 text-white flex items-center justify-center shadow-md shrink-0">
                    {isIPad ? <Tablet className="w-6 h-6" /> : <Smartphone className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="font-black text-base sm:text-lg text-slate-900">
                      Install TidyUps on iPad &amp; iPhone
                    </h3>
                    <p className="text-xs text-slate-500">
                      Adds the TidyUps icon directly to your Home Screen
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                  aria-label="Close dialog"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Primary 1-Tap Action Button: Open iOS Share Sheet / Install */}
              <div className="bg-gradient-to-r from-pink-50 via-purple-50 to-indigo-50 border-2 border-pink-300 rounded-2xl p-4 space-y-3">
                {isInstallable ? (
                  <button
                    type="button"
                    onClick={async () => {
                      await install();
                      setShowIOSGuide(false);
                    }}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-98"
                  >
                    <Download className="w-5 h-5" />
                    <span>Install TidyUps App Now</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleTriggerNativeIOSShareSheet}
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-98"
                  >
                    <Share className="w-5 h-5" />
                    <span>1-Tap: Open iPad / iPhone Share Menu</span>
                  </button>
                )}

                <p className="text-xs text-slate-700 text-center leading-relaxed">
                  When the menu opens, scroll down and tap{' '}
                  <strong className="text-pink-700">➕ Add to Home Screen</strong> (or tap the{' '}
                  <strong className="text-slate-900">Share [↑]</strong> icon inside your top address bar right next to <span className="font-mono">app.tidyupscleaning.com</span>).
                </p>

                {shareNote && (
                  <div className="p-2.5 rounded-xl bg-amber-100 border border-amber-300 text-amber-950 text-xs font-bold text-center">
                    {shareNote}
                  </div>
                )}
              </div>

              {/* Instant Device Layout Switcher */}
              {onChangeDeviceOverride && (
                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-pink-600" />
                      <span>Switch Screen Layout Mode</span>
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      Active: {deviceOverride}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                          className={`px-3 py-2.5 rounded-xl text-xs font-extrabold flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer ${
                            active
                              ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white border-transparent shadow-md'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Visual 2-Step Guide for Chrome & Safari on iPad / iPhone */}
              <div className="space-y-2.5 text-xs">
                <div className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                  Quick 2-Step Home Screen Install (Chrome or Safari on iPad / iPhone):
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="w-6 h-6 rounded-full bg-pink-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-900">
                      Tap the Share Button <Share className="w-3.5 h-3.5 text-blue-600 inline mx-0.5" /> in your Browser Bar
                    </span>
                    <p className="text-slate-600 text-[11px] mt-0.5">
                      On iPad Chrome/Safari, it is in the top-right address bar right next to the microphone icon. On iPhone, it is at the bottom or top-right.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="w-6 h-6 rounded-full bg-pink-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-900">
                      Tap <PlusSquare className="w-3.5 h-3.5 text-slate-800 inline mx-0.5" /> &quot;Add to Home Screen&quot;
                    </span>
                    <p className="text-slate-600 text-[11px] mt-0.5">
                      Tap <strong>Add to Home Screen</strong> in the menu, then tap <strong>Add</strong>. TidyUps will appear as a full-screen app on your iPad &amp; iPhone!
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-mono text-[11px] text-slate-600 truncate px-1">{appUrl}</span>
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedUrl ? 'Copied Link' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black transition-all shadow-md cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div className="flex items-center gap-1.5 flex-shrink-0">
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
          <span className="sm:hidden">Install App</span>
        </button>
      </div>

      {modalContent}
    </>
  );
};
