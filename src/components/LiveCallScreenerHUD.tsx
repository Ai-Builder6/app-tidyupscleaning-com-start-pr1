import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  PhoneIncoming,
  PhoneCall,
  Mic,
  ShieldCheck,
  ShieldAlert,
  Ban,
  X,
  ChevronDown,
  ChevronUp,
  UserCheck,
  MapPin,
  Radio,
  Sparkles,
  PauseCircle,
  Volume2,
  VolumeX,
  CheckCircle2,
} from 'lucide-react';
import { AdLeadItem } from '../types/lead';

export interface LiveScreenedCallItem {
  id: string;
  callSid: string;
  timestamp: string;
  callerNumber: string;
  areaCode: string;
  dialedNumber: string;
  shieldNumber: string;
  originalDialedNumber: string;
  campaignLabel: string;
  destinationNumber: string;
  receivingLineLabel: string;
  callerName: string;
  matchedAddress?: string;
  matchedEmail?: string;
  lastQuoteNumber?: string;
  lastQuoteTotal?: number;
  isRepeatClient?: boolean;
  transcriptText?: string;
  summary?: string;
  duration?: number;
  countryCode: string;
  status: 'ALLOWED' | 'BLOCKED';
  liveState?: 'RINGING' | 'ANSWERED_IN_APP' | 'BLOCKED' | 'TERMINATED';
  dismissedInHud?: boolean;
  isSimulated?: boolean;
  reason: string;
}

interface LiveCallScreenerHUDProps {
  projectId: 'tidyups' | 'dispatchgeeni';
  onStartQuoteWithCaller: (prefillLead: AdLeadItem) => void;
  onOpenSpamShieldModal: () => void;
}

const PROTECTED_ALBERTA_CODES = new Set(['780', '587', '825', '403', '368']);

// Subtle two-note notification chime (distinct from OpenPhone's ringtone so you never confuse the screen popup with the phone line)
function playScreenerAlertChime() {
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.14); // A5

    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.36);
  } catch {
    // ignore if browser blocks autoplay before user interaction
  }
}

export const LiveCallScreenerHUD: React.FC<LiveCallScreenerHUDProps> = ({
  projectId,
  onStartQuoteWithCaller,
  onOpenSpamShieldModal,
}) => {
  const [liveHudCalls, setLiveHudCalls] = useState<LiveScreenedCallItem[]>([]);
  const [recentCalls, setRecentCalls] = useState<LiveScreenedCallItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [nowTick, setNowTick] = useState<number>(Date.now());

  // Auto-open Quote Desk + Blinking Big Red Mic Button when a call comes in (just like bookmycleaning.net)
  const [autoOpenQuoteOnCall, setAutoOpenQuoteOnCall] = useState<boolean>(() => {
    try {
      return localStorage.getItem('bmc.callCapture.autoListen') !== 'off';
    } catch {
      return true;
    }
  });

  // Track calls whose timer has been manually stopped ("Got Info / Stay on Call")
  const [stoppedTimerByCallId, setStoppedTimerByCallId] = useState<Record<string, string>>({});
  const [isRingerMuted, setIsRingerMuted] = useState<boolean>(false);
  const [isActivelyRingingId, setIsActivelyRingingId] = useState<string | null>(null);
  const seenCallIdsRef = useRef<Set<string>>(new Set());
  const autoOpenedCallIdsRef = useRef<Set<string>>(new Set());
  const originalDocTitleRef = useRef<string>(document.title || 'TidyUps Cleaning — Dispatch & Live Quote');

  const stopRingingSound = useCallback(() => {
    setIsActivelyRingingId(null);
    document.title = originalDocTitleRef.current;
  }, []);

  // Build prefill payload and open Quick Quote + Auto-Listen (like bookmycleaning.net's /bookings/new?callId=...)
  const openQuoteWithAutoListen = useCallback(
    (call: LiveScreenedCallItem, options?: { stopTimer?: boolean }) => {
      stopRingingSound();
      if (options?.stopTimer) {
        const diffSec = Math.max(0, Math.floor((Date.now() - new Date(call.timestamp).getTime()) / 1000));
        const dur = call.duration && call.duration > 0 ? call.duration : diffSec;
        const mins = String(Math.floor(dur / 60)).padStart(2, '0');
        const secs = String(dur % 60).padStart(2, '0');
        setStoppedTimerByCallId((prev) => ({
          ...prev,
          [call.id]: `${mins}:${secs}`,
        }));
      }
      const prefillLead: AdLeadItem & {
        autoStartVoiceListener?: number;
        callSid?: string;
        areaCode?: string;
        originalDialedNumber?: string;
        campaignLabel?: string;
        receivingLineLabel?: string;
      } = {
        id: `call-lead-${call.id}`,
        customerName:
          call.callerName &&
          !call.callerName.includes('Inbound Caller') &&
          !call.callerName.includes('Verified Customer')
            ? call.callerName
            : '',
        phone: call.callerNumber,
        email: call.matchedEmail || '',
        address: call.matchedAddress || '10405 Jasper Ave NW, Edmonton, AB',
        city: 'Edmonton',
        serviceRequested: 'Residential Standard Cleaning',
        source: `${call.campaignLabel} (${call.originalDialedNumber})`,
        campaignName: `${call.originalDialedNumber} — ${call.campaignLabel}`,
        callTranscript: call.transcriptText || '',
        callSummary: call.summary || '',
        status: 'New',
        notes: `Inbound call dialed ${call.originalDialedNumber} (${call.campaignLabel})${
          call.transcriptText ? `\n\nCall Transcript:\n${call.transcriptText}` : ''
        }`,
        autoStartVoiceListener: Date.now(),
        callSid: call.callSid || call.id,
        areaCode: call.areaCode || '',
        originalDialedNumber: call.originalDialedNumber || '+1 (587) 900-7223',
        campaignLabel: call.campaignLabel || 'GMB Direct',
        receivingLineLabel: call.receivingLineLabel || '+1 (833) 843-9877 (Main Quo Line)',
      };
      onStartQuoteWithCaller(prefillLead);
    },
    [onStartQuoteWithCaller, stopRingingSound]
  );

  const triggerIncomingAlert = useCallback(
    (call: LiveScreenedCallItem) => {
      if (call.status === 'BLOCKED') return;
      setIsActivelyRingingId(call.id);

      // 1. Play a single subtle screener chime
      if (!isRingerMuted) {
        playScreenerAlertChime();
      }

      // 2. Update browser tab title so user sees it even if looking at another tab
      document.title = `📞 ${call.callerNumber} on line (${call.originalDialedNumber})…`;

      // 3. Automatically pop open the Quote & Live Audio Listener page (just like bookmycleaning.net!)
      if (autoOpenQuoteOnCall && !autoOpenedCallIdsRef.current.has(call.id)) {
        autoOpenedCallIdsRef.current.add(call.id);
        openQuoteWithAutoListen(call, { stopTimer: false });
      }

      // 4. Fire desktop/browser Notification so it pops up over ANY other window
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          try {
            const notif = new Notification(`📞 Incoming Call: ${call.callerNumber}`, {
              body: `Dialed: ${call.originalDialedNumber} (${call.campaignLabel})\nLive Quote & Audio Capture is open and ready on your screen!`,
              requireInteraction: true,
            });
            notif.onclick = () => {
              window.focus();
              openQuoteWithAutoListen(call, { stopTimer: false });
              notif.close();
            };
          } catch {}
        } else if (Notification.permission === 'default') {
          Notification.requestPermission().catch(() => {});
        }
      }
    },
    [isRingerMuted, autoOpenQuoteOnCall, openQuoteWithAutoListen]
  );

  // Blink the document title while a call is actively ringing (like bookmycleaning.net's ci() effect)
  useEffect(() => {
    if (!isActivelyRingingId) return;
    const active = liveHudCalls.find((c) => c.id === isActivelyRingingId);
    if (!active) return;
    let toggle = true;
    const timer = setInterval(() => {
      document.title = toggle
        ? `🔴 CALL: ${active.callerNumber} ➔ ${active.originalDialedNumber}`
        : originalDocTitleRef.current;
      toggle = !toggle;
    }, 1200);
    return () => {
      clearInterval(timer);
      document.title = originalDocTitleRef.current;
    };
  }, [isActivelyRingingId, liveHudCalls]);

  const fetchLiveCalls = useCallback(async () => {
    try {
      const res = await fetch(`/api/twilio/live-calls?project=${projectId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.liveHudCalls)) {
        setLiveHudCalls(data.liveHudCalls);
        const newest = data.liveHudCalls[0];
        if (newest) {
          if (!seenCallIdsRef.current.has(newest.id)) {
            seenCallIdsRef.current.add(newest.id);
            const ageSec = (Date.now() - new Date(newest.timestamp).getTime()) / 1000;
            if (ageSec <= 60 || newest.isSimulated) {
              triggerIncomingAlert(newest);
            } else {
              const dur = Number(newest.duration || 15);
              const mins = String(Math.floor(dur / 60)).padStart(2, '0');
              const secs = String(dur % 60).padStart(2, '0');
              setStoppedTimerByCallId((prev) => ({ ...prev, [newest.id]: `${mins}:${secs}` }));
            }
          }
        }
      }
      if (Array.isArray(data.recentCalls)) {
        setRecentCalls(data.recentCalls);
      }
    } catch {
      // ignore transient network errors
    }
  }, [projectId, triggerIncomingAlert]);

  useEffect(() => {
    fetchLiveCalls();
    const pollTimer = setInterval(fetchLiveCalls, 2000);
    return () => {
      clearInterval(pollTimer);
      stopRingingSound();
    };
  }, [fetchLiveCalls, stopRingingSound]);

  useEffect(() => {
    if (liveHudCalls.length === 0) return;
    const secTimer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(secTimer);
  }, [liveHudCalls.length]);

  const handleToggleAutoOpen = () => {
    setAutoOpenQuoteOnCall((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('bmc.callCapture.autoListen', next ? 'on' : 'off');
      } catch {}
      return next;
    });
  };

  const handleSimulateCall = async (scenario: 'clean_7223' | 'spam_408') => {
    setIsSimulating(true);
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
      const res = await fetch(`/api/twilio/live-calls/simulate?project=${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario,
          callerNumber: scenario === 'spam_408' ? '+1 (408) 458-5452' : '+1 (780) 600-0607',
          dialedQuoLine: '+15879007223',
          shieldLine: '+18255334317',
        }),
      });
      const data = await res.json();
      if (data.success && data.call) {
        seenCallIdsRef.current.add(data.call.id);
        triggerIncomingAlert(data.call);
        await fetchLiveCalls();
      }
    } catch {
      // ignore
    } finally {
      setIsSimulating(false);
    }
  };

  const formatElapsed = (call: LiveScreenedCallItem) => {
    if (stoppedTimerByCallId[call.id]) {
      return stoppedTimerByCallId[call.id];
    }
    if (call.duration && call.duration > 0) {
      const mins = String(Math.floor(call.duration / 60)).padStart(2, '0');
      const secs = String(call.duration % 60).padStart(2, '0');
      return `${mins}:${secs}`;
    }
    const diffSec = Math.max(0, Math.floor((nowTick - new Date(call.timestamp).getTime()) / 1000));
    if (call.transcriptText && diffSec > 60) {
      return '00:15';
    }
    const mins = String(Math.floor(diffSec / 60)).padStart(2, '0');
    const secs = String(diffSec % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // Stop timer & stop blinking WITHOUT declining or closing the call (stay on the phone with all info on screen)
  const handleStopTimerKeepCall = (call: LiveScreenedCallItem) => {
    stopRingingSound();
    const currentVal = formatElapsed(call);
    setStoppedTimerByCallId((prev) => ({
      ...prev,
      [call.id]: currentVal,
    }));
    setActionNotice('Timer stopped — caller info stays pinned on your screen while you stay on the call.');
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleCallAction = async (
    call: LiveScreenedCallItem,
    action: 'answer_in_app' | 'decline' | 'terminate_and_block_caller' | 'terminate_and_block_areacode' | 'dismiss'
  ) => {
    stopRingingSound();
    try {
      const res = await fetch(`/api/twilio/live-calls/${encodeURIComponent(call.callSid || call.id)}/action?project=${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          callerNumber: call.callerNumber,
          areaCode: call.areaCode,
        }),
      });
      const data = await res.json();
      if (data.message) {
        setActionNotice(data.message);
        setTimeout(() => setActionNotice(null), 5000);
      }
      await fetchLiveCalls();
    } catch {
      // ignore
    }
  };

  const activeCall = liveHudCalls[0] || null;
  const isAlbertaAreaCode = activeCall ? PROTECTED_ALBERTA_CODES.has(activeCall.areaCode || '') : false;
  const isTimerStopped = activeCall ? Boolean(stoppedTimerByCallId[activeCall.id]) : false;

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────────────────────
          1. BOOKMYCLEANING.NET FULL-WIDTH TOP BLINKING RED CALL BANNER
          Pops up across the top of the screen when a call comes in (until Stop Timer or Dismiss is clicked)
         ───────────────────────────────────────────────────────────────────────────── */}
      {activeCall && activeCall.status !== 'BLOCKED' && !isTimerStopped && (
        <div
          className="fixed top-0 inset-x-0 z-[9999] pointer-events-auto shadow-2xl"
          data-testid="banner-incoming-call"
        >
          <div className="animate-pulse flex flex-wrap items-center justify-between gap-2 bg-red-600 text-white px-4 py-2.5 border-b border-red-400">
            <div className="flex items-center gap-2.5 min-w-0">
              <PhoneCall className="w-4 h-4 shrink-0 animate-bounce" />
              <span className="text-xs sm:text-sm font-black tracking-tight truncate">
                {activeCall.callerNumber}{' '}
                {activeCall.callerName && !activeCall.callerName.includes('Inbound Caller')
                  ? `(${activeCall.callerName})`
                  : ''}{' '}
                is on the line — Dialed{' '}
                <span className="underline decoration-white/80 font-mono">{activeCall.originalDialedNumber}</span> (
                {activeCall.campaignLabel})
              </span>
            </div>

            {/* Right Controls: Big Blinking Quote + Mic Button, Compact Red Block #, Compact Blue Area Code, Stop Timer */}
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
              {/* 1-Click Open Quote & Start Listening */}
              <button
                type="button"
                onClick={() => openQuoteWithAutoListen(activeCall, { stopTimer: false })}
                className="rounded-md bg-white text-red-700 hover:bg-red-50 text-xs font-black px-3 py-1 flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Mic className="w-3.5 h-3.5 text-red-600 animate-pulse" />
                <span>Take Booking / Live Mic</span>
              </button>

              {/* Stop Timer (Stay on Call & Keep Info) */}
              <button
                type="button"
                onClick={() => handleStopTimerKeepCall(activeCall)}
                className="rounded-md bg-amber-300 text-slate-950 hover:bg-amber-200 text-xs font-black px-2.5 py-1 flex items-center gap-1 shadow-sm cursor-pointer"
                title="Stop Timer & Stop Blinking WITHOUT hanging up the call (keeps all caller info on screen)"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                <span className="font-mono tabular-nums">{formatElapsed(activeCall)}</span>
                <span>• Stop Timer</span>
              </button>

              {/* Little Red Block Button up by the timer */}
              <button
                type="button"
                onClick={() => handleCallAction(activeCall, 'terminate_and_block_caller')}
                className="rounded-md bg-red-900/90 hover:bg-red-950 border border-white/40 text-white text-[11px] font-bold px-2 py-1 flex items-center gap-1 cursor-pointer"
                title={`Block specific caller ${activeCall.callerNumber}`}
              >
                <Ban className="w-3 h-3" />
                <span>Block #</span>
              </button>

              {/* Separate Little Blue Area Code Button (Protected for Alberta 780/587/825/403/368) */}
              {activeCall.areaCode && (
                <button
                  type="button"
                  onClick={() => handleCallAction(activeCall, 'terminate_and_block_areacode')}
                  className={`rounded-md text-[11px] font-mono font-bold px-2 py-1 flex items-center gap-1 cursor-pointer ${
                    isAlbertaAreaCode
                      ? 'bg-sky-950/80 border border-sky-300/40 text-sky-200'
                      : 'bg-blue-600 hover:bg-blue-500 border border-white/50 text-white shadow-sm'
                  }`}
                  title={
                    isAlbertaAreaCode
                      ? `${activeCall.areaCode} is a local Alberta area code (Protected so you never block all of Edmonton)`
                      : `Block entire ${activeCall.areaCode}* area code`
                  }
                >
                  <span>{isAlbertaAreaCode ? `AB ${activeCall.areaCode}` : `Area ${activeCall.areaCode}*`}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleCallAction(activeCall, 'dismiss')}
                className="rounded-md border border-white/60 px-2 py-1 text-xs font-bold text-white hover:bg-red-700 cursor-pointer"
                title="Dismiss Banner"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          2. BOOKMYCLEANING.NET FLOATING BLINKING BIG RED BUTTON (Bottom-Right Launcher)
          Always visible so 1 click opens Live Quote + Audio Capture with big blinking red state
         ───────────────────────────────────────────────────────────────────────────── */}
      {activeCall && activeCall.status !== 'BLOCKED' && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 print:hidden pointer-events-auto">
          <button
            type="button"
            onClick={() => openQuoteWithAutoListen(activeCall, { stopTimer: false })}
            className={`flex min-h-[3.25rem] items-center gap-2.5 rounded-full border-2 px-5 py-3 text-sm font-black shadow-2xl cursor-pointer transition-all ${
              isTimerStopped
                ? 'border-emerald-400 bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'border-white bg-red-600 hover:bg-red-500 text-white animate-pulse shadow-[0_0_35px_rgba(220,38,38,0.85)]'
            }`}
          >
            <Mic className="w-5 h-5 shrink-0 animate-bounce" />
            <span className="truncate max-w-[18rem]">
              {isTimerStopped
                ? `On Call: ${activeCall.callerNumber} (${activeCall.originalDialedNumber})`
                : `🔴 LIVE CALL: ${activeCall.callerNumber} — AUTO-LISTENING (${formatElapsed(activeCall)})`}
            </span>
          </button>

          {!isTimerStopped && (
            <button
              type="button"
              onClick={() => handleStopTimerKeepCall(activeCall)}
              className="h-11 px-3 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-xl flex items-center gap-1 cursor-pointer"
              title="Stop Timer & Stop Blinking (Stay on Call)"
            >
              <PauseCircle className="w-4 h-4" />
              <span>Stop Timer</span>
            </button>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          3. TOP-RIGHT LIVE CALL SCREENER CONSOLE & ATTRIBUTION CARD
         ───────────────────────────────────────────────────────────────────────────── */}
      <div className="fixed top-14 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none max-w-md w-full">
        {/* Compact Always-Accessible Live Call Attribution & Test Bar */}
        <div className="pointer-events-auto flex items-center bg-[#0B0F17]/95 border border-white/10 shadow-2xl rounded-lg overflow-hidden text-[11px] text-slate-200 backdrop-blur-md">
          <button
            onClick={() => setIsDrawerOpen((prev) => !prev)}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 transition-colors border-r border-white/10 cursor-pointer"
            title="View Live Screened Call Attribution (Original Line Dialed + Caller ID)"
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span className="font-bold tracking-tight text-white">LIVE SCREENER</span>
            <span className="font-mono text-emerald-400 tabular-nums">
              {recentCalls[0]?.callerNumber || '(587) 900-7223'}
            </span>
            {isDrawerOpen ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

          <button
            onClick={handleToggleAutoOpen}
            className={`px-2 py-1.5 transition-colors border-r border-white/10 font-bold cursor-pointer flex items-center gap-1 ${
              autoOpenQuoteOnCall ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-slate-400 hover:bg-white/5'
            }`}
            title={
              autoOpenQuoteOnCall
                ? 'Auto-Open Quote & Mic on Incoming Call: ON (Click to toggle)'
                : 'Auto-Open Quote & Mic on Incoming Call: OFF (Click to turn ON)'
            }
          >
            <Mic className="w-3 h-3" />
            <span>{autoOpenQuoteOnCall ? 'Auto-Pop ON' : 'Auto-Pop OFF'}</span>
          </button>

          <button
            onClick={() => {
              setIsRingerMuted((m) => !m);
              stopRingingSound();
            }}
            className="px-2 py-1.5 hover:bg-white/5 transition-colors border-r border-white/10 text-slate-300 cursor-pointer"
            title={isRingerMuted ? 'Unmute Screener Chime' : 'Screener Chime Active (Click to Mute)'}
          >
            {isRingerMuted ? (
              <VolumeX className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </button>

          <button
            onClick={() => handleSimulateCall('clean_7223')}
            disabled={isSimulating}
            className="px-2.5 py-1.5 font-extrabold text-white bg-red-600 hover:bg-red-500 transition-colors border-r border-white/10 flex items-center gap-1 cursor-pointer"
            title="Simulate an incoming call on (587) 900-7223 — automatically opens Quick Quote & starts the Blinking Big Red Mic Button!"
          >
            <PhoneIncoming className="w-3 h-3 animate-bounce" />
            <span>Test Call Popup</span>
          </button>

          <button
            onClick={onOpenSpamShieldModal}
            className="px-2.5 py-1.5 font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1 cursor-pointer"
            title="Open Twilio Spam Shield & 1-to-1 Line Routing"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Shield</span>
          </button>
        </div>

        {/* Action Feedback Toast */}
        {actionNotice && (
          <div className="pointer-events-auto w-full bg-[#0B0F17] border border-emerald-500/40 rounded-lg px-3.5 py-2.5 text-xs text-emerald-200 shadow-2xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{actionNotice}</span>
            </div>
            <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ACTIVE INCOMING CALL SCREENER HUD */}
        {activeCall && (
          <div
            className={`pointer-events-auto w-full rounded-xl border shadow-2xl overflow-hidden transition-all duration-200 ${
              activeCall.status === 'BLOCKED'
                ? 'bg-[#0B0F17] border-rose-500/60'
                : !isTimerStopped
                ? 'bg-[#0B0F17] border-red-500 ring-2 ring-red-500/50'
                : 'bg-[#0B0F17] border-emerald-500/60'
            }`}
          >
            {/* Row 1: Header Status + Compact Red Block # + Compact Blue Area Code + Timer + Stop Timer */}
            <div
              className={`px-3 py-2 border-b flex items-center justify-between gap-1.5 ${
                activeCall.status === 'BLOCKED'
                  ? 'bg-rose-950/40 border-rose-500/30'
                  : !isTimerStopped
                  ? 'bg-red-950/60 border-red-500/40'
                  : 'bg-emerald-950/40 border-emerald-500/30'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {activeCall.status === 'BLOCKED' ? (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-300 truncate">
                      ROBOCALL SEVERED
                    </span>
                  </>
                ) : isTimerStopped ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 truncate">
                      INFO CAPTURED (ON CALL)
                    </span>
                  </>
                ) : (
                  <>
                    <Radio className="w-3.5 h-3.5 text-red-400 animate-ping shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-red-200 truncate">
                      LIVE CALL CAPTURE
                    </span>
                  </>
                )}
              </div>

              {/* Compact Top-Right Block Controls + Running Timer + Stop Timer Button */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Small Red Button: Block this specific caller number */}
                <button
                  onClick={() => handleCallAction(activeCall, 'terminate_and_block_caller')}
                  className="px-1.5 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] flex items-center gap-0.5 shadow-sm transition-colors cursor-pointer"
                  title={`Drop & Permanently Block ${activeCall.callerNumber}`}
                >
                  <Ban className="w-2.5 h-2.5" />
                  <span>Block #</span>
                </button>

                {/* Separate Small Blue Button: Block 3-digit Area Code (Protected for AB 780/587/825) */}
                {activeCall.areaCode && (
                  <button
                    onClick={() => handleCallAction(activeCall, 'terminate_and_block_areacode')}
                    className={`px-1.5 py-0.5 rounded font-mono font-bold text-[10px] flex items-center gap-0.5 transition-colors cursor-pointer ${
                      isAlbertaAreaCode
                        ? 'bg-sky-950/60 border border-sky-500/30 text-sky-300/70'
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
                    }`}
                    title={
                      isAlbertaAreaCode
                        ? `${activeCall.areaCode} is a local Alberta area code (Protected from accidental full-city block)`
                        : `Block entire ${activeCall.areaCode}* area code`
                    }
                  >
                    <span>{isAlbertaAreaCode ? `AB ${activeCall.areaCode}` : `Area ${activeCall.areaCode}*`}</span>
                  </button>
                )}

                {/* Timer + 1-Click Stop Timer (Without Declining Call) */}
                <button
                  onClick={() => handleStopTimerKeepCall(activeCall)}
                  className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold tabular-nums flex items-center gap-1 border transition-colors cursor-pointer ${
                    isTimerStopped
                      ? 'bg-slate-800 border-white/10 text-slate-300'
                      : 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-400/40 text-amber-200'
                  }`}
                  title="Click to Stop Timer WITHOUT hanging up the call (keeps info on screen)"
                >
                  <PauseCircle className="w-3 h-3 text-amber-300" />
                  <span>{formatElapsed(activeCall)}</span>
                </button>

                <button
                  onClick={() => handleCallAction(activeCall, 'dismiss')}
                  className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                  title="Close Banner"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Row 2: Customer Caller ID + CRM Match */}
            <div className="p-3.5 space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    CUSTOMER CALLER ID
                  </div>
                  <div className="font-mono text-lg font-black text-white tracking-tight tabular-nums">
                    {activeCall.callerNumber}
                  </div>
                  <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    {activeCall.isRepeatClient && <UserCheck className="w-3.5 h-3.5 text-emerald-400" />}
                    <span>{activeCall.callerName}</span>
                  </div>
                </div>

                <div className="text-right border-l border-white/10 pl-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    DIALED LINE
                  </div>
                  <div className="font-mono text-xs font-black text-white tabular-nums">
                    {activeCall.originalDialedNumber}
                  </div>
                  <div className="text-[10px] text-amber-300 font-semibold truncate">
                    {activeCall.campaignLabel}
                  </div>
                </div>
              </div>

              {activeCall.matchedAddress && (
                <div className="flex items-center justify-between bg-white/[0.03] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-300 truncate">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{activeCall.matchedAddress}</span>
                  </div>
                  {activeCall.lastQuoteTotal !== undefined && (
                    <span className="font-mono font-bold text-emerald-300 tabular-nums shrink-0 ml-2">
                      Last: ${activeCall.lastQuoteTotal.toFixed(2)}
                    </span>
                  )}
                </div>
              )}

              {/* Row 3: Big Blinking Red Button (just like bookmycleaning.net) + Stop Timer */}
              <div className="space-y-1.5 pt-0.5">
                {activeCall.status !== 'BLOCKED' && (
                  <button
                    onClick={() => openQuoteWithAutoListen(activeCall, { stopTimer: false })}
                    className={`w-full py-2.5 px-3 rounded-lg text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                      isTimerStopped
                        ? 'bg-emerald-600 hover:bg-emerald-500'
                        : 'bg-red-600 hover:bg-red-500 animate-pulse ring-2 ring-red-400/60 shadow-[0_0_25px_rgba(220,38,38,0.6)]'
                    }`}
                  >
                    <Mic className="w-4 h-4 animate-bounce" />
                    <span>
                      {isTimerStopped
                        ? `Open Quote + Live Audio (${activeCall.originalDialedNumber})`
                        : `🔴 LIVE QUOTE + AUTO-LISTEN ACTIVE (${formatElapsed(activeCall)})`}
                    </span>
                  </button>
                )}

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => handleStopTimerKeepCall(activeCall)}
                    className="py-1.5 px-2 rounded-lg bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/40 text-amber-200 font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    title="Stop timer while staying on the call with all caller info pinned on screen"
                  >
                    <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isTimerStopped ? 'Timer Stopped' : 'Stop Timer (Stay on Call)'}</span>
                  </button>

                  <button
                    onClick={() => handleCallAction(activeCall, 'dismiss')}
                    className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/15 text-slate-200 font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    title="Close this banner from your screen"
                  >
                    <X className="w-3.5 h-3.5 text-slate-400" />
                    <span>Close Banner</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Expandable Live Call Attribution History Drawer */}
        {isDrawerOpen && (
          <div className="pointer-events-auto w-full bg-[#0B0F17] border border-white/15 rounded-xl shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-slate-950">
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Live Call Attribution &amp; Screener Log</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Auto-opens Quick Quote + Blinking Red Mic when a call rings (preserves 587-900-7223)
                </p>
              </div>
              <button onClick={() => setIsDrawerOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Simulator Bar */}
            <div className="px-4 py-2.5 bg-white/[0.02] border-b border-white/10 flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-300">Simulate Incoming Call:</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleSimulateCall('clean_7223')}
                  disabled={isSimulating}
                  className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-mono text-[11px] font-bold cursor-pointer shadow-sm"
                >
                  🔴 Test +1 (780) ➔ 587-900-7223
                </button>
                <button
                  onClick={() => handleSimulateCall('spam_408')}
                  disabled={isSimulating}
                  className="px-2.5 py-1 rounded bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 font-mono text-[11px] font-bold cursor-pointer"
                >
                  Spam 408 ➔ Kill
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-white/10">
              {recentCalls.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No screened calls recorded yet. Click <strong>Test +1 (780) ➔ 587-900-7223</strong> above to watch it auto-open Quick Quote with the Blinking Big Red Mic Button!
                </div>
              ) : (
                recentCalls.slice(0, 12).map((item) => (
                  <div key={item.id} className="p-3 hover:bg-white/[0.02] transition-colors space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-black text-white tabular-nums">
                        {item.callerNumber}
                      </span>
                      <span
                        className={`font-mono text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                          item.status === 'BLOCKED'
                            ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                            : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] border-t border-white/5 pt-1.5">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Original Dialed</span>
                        <span className="font-mono font-bold text-amber-300 tabular-nums">
                          {item.originalDialedNumber || '+1 (587) 900-7223'}
                        </span>
                        <span className="block text-[10px] text-slate-400 truncate">
                          {item.campaignLabel || 'GMB Direct'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Routed To</span>
                        <span className="font-mono font-semibold text-slate-200 tabular-nums truncate block">
                          {item.status === 'BLOCKED' ? '1s Hangup (No AI)' : item.receivingLineLabel}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => {
                          setIsDrawerOpen(false);
                          openQuoteWithAutoListen(item, { stopTimer: false });
                        }}
                        className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Mic className="w-3 h-3" />
                        <span>Open Quote + Listen</span>
                      </button>
                      <button
                        onClick={() => handleCallAction(item, 'terminate_and_block_caller')}
                        className="px-2 py-1 rounded bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 font-mono text-[10px] font-bold cursor-pointer"
                      >
                        Block #
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
