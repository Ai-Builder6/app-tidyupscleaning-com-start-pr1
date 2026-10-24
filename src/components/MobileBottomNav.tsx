import React, { useEffect, useState } from 'react';
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

  if (isCleanerRestrictedMode) {
    return (
      <>
        {!isOnline && (
          <div className="fixed bottom-[64px] left-3 right-3 z-50 flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 shadow-lg">
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            <span>Offline Mode — Showing cached route &amp; stops</span>
          </div>
        )}
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
        <div className="fixed bottom-[64px] left-3 right-3 z-50 flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-950 shadow-lg">
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          <span>Offline Mode — Cached dispatch data is active</span>
        </div>
      )}
      <nav
        id="ios-mobile-bottom-nav"
        aria-label="Desktop, iPad, and iPhone Bottom Navigation"
        className="flex w-full z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 text-white px-1.5 sm:px-3 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] items-center justify-between gap-1 sm:gap-2 shadow-[0_-8px_25px_rgba(0,0,0,0.35)] shrink-0"
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
              className={`relative flex-1 min-w-0 py-1.5 px-1 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 cursor-pointer ${
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
