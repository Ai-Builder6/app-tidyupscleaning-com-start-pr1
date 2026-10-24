import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  PhoneCall,
  Mic,
  Ban,
  X,
  Sparkles,
  PauseCircle,
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
  onOpenSpamShieldModal?: () => void;
}

const PROTECTED_ALBERTA_CODES = new Set(['780', '587', '825', '403', '368']);

// Subtle two-note notification chime when a real incoming call arrives
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
}) => {
  const [liveHudCalls, setLiveHudCalls] = useState<LiveScreenedCallItem[]>([]);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState<number>(Date.now());

  // Track calls whose timer has been manually stopped ("Got Info / Stay on Call")
  const [stoppedTimerByCallId, setStoppedTimerByCallId] = useState<Record<string, string>>({});
  const [isActivelyRingingId, setIsActivelyRingingId] = useState<string | null>(null);
  const seenCallIdsRef = useRef<Set<string>>(new Set());
  const autoOpenedCallIdsRef = useRef<Set<string>>(new Set());
  const originalDocTitleRef = useRef<string>(document.title || 'TidyUps Cleaning — Dispatch & Live Quote');

  const stopRingingSound = useCallback(() => {
    setIsActivelyRingingId(null);
    document.title = originalDocTitleRef.current;
  }, []);

  // Build prefill payload and open Quick Quote + Auto-Listen (like bookmycleaning.net)
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
      if (call.status === 'BLOCKED' || call.isSimulated) return;
      setIsActivelyRingingId(call.id);

      playScreenerAlertChime();
      document.title = `📞 ${call.callerNumber} on line (${call.originalDialedNumber})…`;

      // Automatically open Quick Quote & start the Blinking Big Red Mic Listener (like bookmycleaning.net)
      if (!autoOpenedCallIdsRef.current.has(call.id)) {
        autoOpenedCallIdsRef.current.add(call.id);
        openQuoteWithAutoListen(call, { stopTimer: false });
      }

      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          const notif = new Notification(`📞 Incoming Call: ${call.callerNumber}`, {
            body: `Dialed: ${call.originalDialedNumber} (${call.campaignLabel})\nLive Quote & Audio Capture is open on your screen.`,
            requireInteraction: true,
          });
          notif.onclick = () => {
            window.focus();
            openQuoteWithAutoListen(call, { stopTimer: false });
            notif.close();
          };
        } catch {}
      }
    },
    [openQuoteWithAutoListen]
  );

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
        const realCalls = data.liveHudCalls.filter(
          (c: LiveScreenedCallItem) =>
            !c.isSimulated && !String(c.id || '').startsWith('sim-call-') && !String(c.callSid || '').startsWith('CA_SIM_')
        );
        setLiveHudCalls(realCalls);
        const newest = realCalls[0];
        if (newest && !seenCallIdsRef.current.has(newest.id)) {
          seenCallIdsRef.current.add(newest.id);
          const ageSec = (Date.now() - new Date(newest.timestamp).getTime()) / 1000;
          if (ageSec <= 60) {
            triggerIncomingAlert(newest);
          } else {
            const dur = Number(newest.duration || 15);
            const mins = String(Math.floor(dur / 60)).padStart(2, '0');
            const secs = String(dur % 60).padStart(2, '0');
            setStoppedTimerByCallId((prev) => ({ ...prev, [newest.id]: `${mins}:${secs}` }));
          }
        }
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

  // Stop timer & hide banner WITHOUT declining or closing the call (stay on the phone with all info on screen)
  const handleStopTimerKeepCall = (call: LiveScreenedCallItem) => {
    stopRingingSound();
    const currentVal = formatElapsed(call);
    setStoppedTimerByCallId((prev) => ({
      ...prev,
      [call.id]: currentVal,
    }));
    setActionNotice('Timer stopped — caller info stays on your screen while you finish your call.');
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

  if (!activeCall && !actionNotice) {
    return null;
  }

  return (
    <>
      {/* Action Feedback Toast */}
      {actionNotice && (
        <div className="fixed top-14 right-4 z-[9999] pointer-events-auto max-w-md bg-[#0B0F17] border border-emerald-500/40 rounded-lg px-3.5 py-2.5 text-xs text-emerald-200 shadow-2xl flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Full-Width Top Blinking Red Incoming Call Banner (Only appears during a REAL live incoming call) */}
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

            {/* Right Controls: Take Booking / Live Mic, Stop Timer, Compact Red Block #, Compact Blue Area Code */}
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => openQuoteWithAutoListen(activeCall, { stopTimer: false })}
                className="rounded-md bg-white text-red-700 hover:bg-red-50 text-xs font-black px-3 py-1 flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Mic className="w-3.5 h-3.5 text-red-600 animate-pulse" />
                <span>Take Booking / Live Mic</span>
              </button>

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

              <button
                type="button"
                onClick={() => handleCallAction(activeCall, 'terminate_and_block_caller')}
                className="rounded-md bg-red-900/90 hover:bg-red-950 border border-white/40 text-white text-[11px] font-bold px-2 py-1 flex items-center gap-1 cursor-pointer"
                title={`Block specific caller ${activeCall.callerNumber}`}
              >
                <Ban className="w-3 h-3" />
                <span>Block #</span>
              </button>

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
    </>
  );
};
