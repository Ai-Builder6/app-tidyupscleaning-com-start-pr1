import React, { useEffect, useState, useCallback } from 'react';
import {
  FileSpreadsheet,
  Mic,
  Map as MapIcon,
  Calendar,
  Crown,
  Users,
  ShieldAlert,
  WifiOff,
  Truck,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  MoveHorizontal,
} from 'lucide-react';

export interface MobileBottomNavProps {
  activeTopView: string;
  onSelectView: (view: any) => void;
  isCleanerRestrictedMode?: boolean;
  cleanerShowMap?: boolean;
  onSetCleanerShowMap?: (show: boolean) => void;
  leadsAndQuotesCount?: number;
  scheduledCount?: number;
  unassignedCount?: number;
  onOpenSpamShield?: () => void;
  forceShow?: boolean;
}

/**
 * Finds all horizontally scrollable containers on the active screen plus any main page wrapper
 * so the universal bottom horizontal scroller works on every page across iPhone, iPad, and Desktop.
 */
function findHorizontalScrollTargets(): HTMLElement[] {
  if (typeof document === 'undefined') return [];
  const targets: HTMLElement[] = [];
  const candidates = document.querySelectorAll<HTMLElement>(
    'main, [data-horizontal-scroll="true"], .overflow-x-auto, .overflow-auto, table, #ios-mobile-bottom-nav'
  );
  candidates.forEach((el) => {
    if (el.id === 'universal-bottom-horizontal-scroller') return;
    if (el.scrollWidth > el.clientWidth + 4) {
      targets.push(el);
    } else if (el.parentElement && el.parentElement.scrollWidth > el.parentElement.clientWidth + 4) {
      if (!targets.includes(el.parentElement)) {
        targets.push(el.parentElement);
      }
    }
  });
  const docEl = document.scrollingElement as HTMLElement | null;
  if (docEl && docEl.scrollWidth > docEl.clientWidth + 4 && !targets.includes(docEl)) {
    targets.push(docEl);
  }
  return targets;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTopView,
  onSelectView,
  isCleanerRestrictedMode = false,
  cleanerShowMap = false,
  onSetCleanerShowMap,
  leadsAndQuotesCount = 0,
  scheduledCount = 0,
  unassignedCount = 0,
  onOpenSpamShield,
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [scrollPercent, setScrollPercent] = useState<number>(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Reset horizontal pan position when switching top views
  useEffect(() => {
    setScrollPercent(0);
    const mainEl = document.querySelector('main') as HTMLElement | null;
    if (mainEl) {
      mainEl.style.transform = '';
    }
  }, [activeTopView]);

  const applyHorizontalScroll = useCallback((nextPercent: number) => {
    const clamped = Math.max(0, Math.min(100, nextPercent));
    setScrollPercent(clamped);

    const targets = findHorizontalScrollTargets();
    if (targets.length > 0) {
      targets.forEach((el) => {
        const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
        if (maxScroll > 0) {
          el.scrollTo({
            left: (clamped / 100) * maxScroll,
            behavior: 'auto',
          });
        }
      });
    } else {
      // Even if a page fits the viewport width, allow smooth left/right horizontal nudge
      const mainEl = document.querySelector('main') as HTMLElement | null;
      if (mainEl) {
        const offsetPx = Math.round(((50 - clamped) / 50) * 140);
        mainEl.style.transition = 'transform 120ms ease-out';
        mainEl.style.transform = clamped === 0 ? '' : `translateX(${offsetPx}px)`;
      }
    }
  }, []);

  const stepHorizontalScroll = useCallback(
    (deltaPercent: number) => {
      const targets = findHorizontalScrollTargets();
      if (targets.length > 0) {
        targets.forEach((el) => {
          const stepPx = Math.max(180, Math.round(el.clientWidth * 0.45));
          el.scrollBy({
            left: deltaPercent > 0 ? stepPx : -stepPx,
            behavior: 'smooth',
          });
        });
      }
      applyHorizontalScroll(scrollPercent + deltaPercent);
    },
    [applyHorizontalScroll, scrollPercent]
  );

  const universalScrollerBar = (
    <div
      id="universal-bottom-horizontal-scroller"
      className="w-full z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2.5 py-1 flex items-center gap-2 text-slate-200 select-none shrink-0"
    >
      <button
        type="button"
        onClick={() => stepHorizontalScroll(-20)}
        className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-[10px] font-black text-cyan-300 border border-slate-700 flex items-center gap-0.5 cursor-pointer shrink-0"
        title="Scroll Page Left"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        <span>Left</span>
      </button>

      <div className="flex-1 flex items-center gap-2 min-w-0">
        <MoveHorizontal className="w-3.5 h-3.5 text-cyan-400 shrink-0 hidden sm:inline" />
        <input
          type="range"
          min={0}
          max={100}
          value={scrollPercent}
          onChange={(e) => applyHorizontalScroll(Number(e.target.value))}
          aria-label="Universal Page Horizontal Scroller"
          className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
        />
        <span className="text-[10px] font-mono font-bold text-slate-400 w-8 text-right shrink-0">
          {Math.round(scrollPercent)}%
        </span>
      </div>

      {scrollPercent > 0 && (
        <button
          type="button"
          onClick={() => applyHorizontalScroll(0)}
          className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[9px] font-bold text-slate-300 border border-slate-700 cursor-pointer shrink-0"
          title="Reset Horizontal Scroll"
        >
          Reset
        </button>
      )}

      <button
        type="button"
        onClick={() => stepHorizontalScroll(20)}
        className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-[10px] font-black text-cyan-300 border border-slate-700 flex items-center gap-0.5 cursor-pointer shrink-0"
        title="Scroll Page Right"
      >
        <span>Right</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  if (isCleanerRestrictedMode) {
    return (
      <>
        {!isOnline && (
          <div className="fixed bottom-[88px] left-3 right-3 z-50 flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 shadow-lg">
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            <span>Offline Mode — Showing cached route &amp; stops</span>
          </div>
        )}
        {universalScrollerBar}
        <nav
          aria-label="Cleaner Bottom Navigation"
          className="flex w-full z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 text-white px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] items-center justify-around shadow-[0_-8px_25px_rgba(0,0,0,0.35)] shrink-0"
        >
          <button
            type="button"
            onClick={() => {
              onSetCleanerShowMap?.(false);
              onSelectView('MAP');
            }}
            className={`flex-1 py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[11px] font-extrabold transition-all cursor-pointer ${
              activeTopView === 'MAP' && !cleanerShowMap
                ? 'text-pink-400 bg-white/10'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>My Daily Stops</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onSetCleanerShowMap?.(true);
              onSelectView('MAP');
            }}
            className={`flex-1 py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[11px] font-extrabold transition-all cursor-pointer ${
              activeTopView === 'MAP' && cleanerShowMap
                ? 'text-pink-400 bg-white/10'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MapIcon className="w-4 h-4" />
            <span>My Route Map</span>
          </button>
        </nav>
      </>
    );
  }

  const navItems = [
    {
      id: 'QUICK_QUOTE',
      label: 'Live Quote',
      icon: Mic,
      activeColor: 'text-pink-400 bg-pink-500/15 border-pink-500/40',
      badge: '🔴',
    },
    {
      id: 'FB_MESSENGER_AI',
      label: 'Facebook AI',
      icon: MessageSquare,
      activeColor: 'text-blue-400 bg-blue-500/15 border-blue-500/40',
      badge: '3 Pages',
    },
    {
      id: 'MASTER_HUB',
      label: 'Master Hub',
      icon: FileSpreadsheet,
      activeColor: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/40',
      badge: leadsAndQuotesCount > 0 ? String(leadsAndQuotesCount) : undefined,
    },
    {
      id: 'MAP',
      label: 'Map & Vans',
      icon: MapIcon,
      activeColor: 'text-purple-400 bg-purple-500/15 border-purple-500/40',
      badge: unassignedCount > 0 ? String(unassignedCount) : undefined,
    },
    {
      id: 'SCHEDULED_JOBS',
      label: 'Schedule',
      icon: Calendar,
      activeColor: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/40',
      badge: scheduledCount > 0 ? String(scheduledCount) : undefined,
    },
    {
      id: 'CLIENTS',
      label: 'Clients',
      icon: Users,
      activeColor: 'text-blue-400 bg-blue-500/15 border-blue-500/40',
    },
    {
      id: 'MANAGEMENT',
      label: 'Owner Hub',
      icon: Crown,
      activeColor: 'text-amber-300 bg-amber-500/15 border-amber-400/40',
    },
  ];

  return (
    <>
      {!isOnline && (
        <div className="fixed bottom-[88px] left-3 right-3 z-50 flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 shadow-lg">
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>Offline Mode — Cached dispatch data is active</span>
        </div>
      )}
      {universalScrollerBar}
      <nav
        id="ios-mobile-bottom-nav"
        aria-label="Desktop, iPad, and iPhone Bottom Navigation"
        className="flex w-full z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 text-white px-1.5 sm:px-3 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] items-center justify-between gap-1 sm:gap-2 shadow-[0_-8px_25px_rgba(0,0,0,0.35)] shrink-0 overflow-x-auto no-scrollbar"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeTopView === item.id ||
            (item.id === 'MANAGEMENT' &&
              ['MANAGEMENT', 'QUOTES', 'INVOICES', 'LEGAL', 'INTAKES', 'LEADS', 'SPAM_SHIELD', 'ADDRESS_SEARCH'].includes(
                activeTopView
              ));

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectView(item.id)}
              className={`relative flex-1 min-w-[68px] py-1.5 px-1 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 cursor-pointer ${
                isActive
                  ? item.activeColor
                  : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon className="w-4 h-4 shrink-0" />
                {item.badge && (
                  <span
                    className={`ml-1 px-1 py-0.2 rounded-full text-[9px] font-mono font-black leading-none ${
                      item.id === 'QUICK_QUOTE'
                        ? 'text-[8px]'
                        : isActive
                        ? 'bg-white text-slate-950'
                        : 'bg-slate-800 text-slate-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-extrabold truncate max-w-full leading-tight">
                {item.label}
              </span>
            </button>
          );
        })}

        {onOpenSpamShield && (
          <button
            type="button"
            onClick={onOpenSpamShield}
            className="py-1.5 px-2 rounded-xl border border-rose-500/40 bg-rose-950/70 hover:bg-rose-900 text-rose-200 flex flex-col items-center justify-center gap-0.5 active:scale-95 cursor-pointer shrink-0"
            title="Block Caller or Area Code"
          >
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="text-[10px] font-extrabold leading-tight">Block #</span>
          </button>
        )}
      </nav>
    </>
  );
};
