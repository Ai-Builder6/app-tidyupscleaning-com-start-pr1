import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  PhoneCall,
  Mic,
  Ban,
  X,
  Sparkles,
  PauseCircle,
  PlayCircle,
  History,
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
  calledBefore?: boolean;
  priorCallsCount?: number;
  lastCalledAt?: string;
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
const HANDLED_CALL_IDS_STORAGE_KEY = 'tidyups_handled_call_ids_v1';
const CALL_BANNER_PAUSED_STORAGE_KEY = 'tidyups_call_banner_paused_v1';

function loadHandledCallIds(): Set<string> {
  try {
    const raw = localStorage.getItem(HANDLED_CALL_IDS_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.slice(-200)) : new Set();
  } catch {
    return new Set();
  }
}

function saveHandledCallId(callId: string) {
  if (!callId) return;
  try {
    const set = loadHandledCallIds();
    set.add(callId);
    localStorage.setItem(HANDLED_CALL_IDS_STORAGE_KEY, JSON.stringify(Array.from(set).slice(-200)));
  } catch {
    // ignore storage errors
  }
}

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

  // Persistent Pause Banner state (when paused, shows nothing or a tiny 1-line unpause pill)
  const [isBannerPaused, setIsBannerPaused] = useState<boolean>(() => {
    try {
      return localStorage.getItem(CALL_BANNER_PAUSED_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Track calls whose timer has been manually stopped or approved once
  const [stoppedTimerByCallId, setStoppedTimerByCallId] = useState<Record<string, string>>({});
  const [handledCallIds, setHandledCallIds] = useState<Set<string>>(() => loadHandledCallIds());
  const [isActivelyRingingId, setIsActivelyRingingId] = useState<string | null>(null);
  const seenCallIdsRef = useRef<Set<string>>(loadHandledCallIds());
  const originalDocTitleRef = useRef<string>(document.title || 'TidyUps Cleaning — Dispatch & Live Quote');

  const markCallApprovedOnce = useCallback((callId: string) => {
    if (!callId) return;
    saveHandledCallId(callId);
    seenCallIdsRef.current.add(callId);
    setHandledCallIds((prev) => {
      const next = new Set(prev);
      next.add(callId);
      return next;
    });
  }, []);

  const togglePauseBanner = useCallback((pause: boolean) => {
    setIsBannerPaused(pause);
    try {
      localStorage.setItem(CALL_BANNER_PAUSED_STORAGE_KEY, pause ? 'true' : 'false');
    } catch {}
    if (pause) {
      setIsActivelyRingingId(null);
      document.title = originalDocTitleRef.current;
    }
  }, []);

  const stopRingingSound = useCallback(() => {
    setIsActivelyRingingId(null);
    document.title = originalDocTitleRef.current;
  }, []);

  // Build prefill payload and open Quick Quote + Auto-Listen (only when user clicks Approve / Take Booking)
  const openQuoteWithAutoListen = useCallback(
    (call: LiveScreenedCallItem, options?: { stopTimer?: boolean }) => {
      stopRingingSound();
      markCallApprovedOnce(call.id);
      if (call.callSid) markCallApprovedOnce(call.callSid);
      if (options?.stopTimer !== false) {
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
    [onStartQuoteWithCaller, stopRingingSound, markCallApprovedOnce]
  );

  const triggerIncomingAlert = useCallback(
    (call: LiveScreenedCallItem) => {
      if (call.status === 'BLOCKED' || call.isSimulated || isBannerPaused) return;
      setIsActivelyRingingId(call.id);

      playScreenerAlertChime();
      document.title = `📞 ${call.callerNumber} (${call.originalDialedNumber})`;
    },
    [isBannerPaused]
  );

  useEffect(() => {
    if (!isActivelyRingingId || isBannerPaused) return;
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
  }, [isActivelyRingingId, liveHudCalls, isBannerPaused]);

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
        if (newest && !seenCallIdsRef.current.has(newest.id) && !seenCallIdsRef.current.has(newest.callSid)) {
          seenCallIdsRef.current.add(newest.id);
          const ageSec = (Date.now() - new Date(newest.timestamp).getTime()) / 1000;
          if (ageSec <= 45) {
            triggerIncomingAlert(newest);
          } else {
            markCallApprovedOnce(newest.id);
          }
        }
      }
    } catch {
      // ignore transient network errors
    }
  }, [projectId, triggerIncomingAlert, markCallApprovedOnce]);

  useEffect(() => {
    fetchLiveCalls();
    const pollTimer = setInterval(fetchLiveCalls, 2500);
    return () => {
      clearInterval(pollTimer);
      stopRingingSound();
    };
  }, [fetchLiveCalls, stopRingingSound]);

  useEffect(() => {
    if (liveHudCalls.length === 0 || isBannerPaused) return;
    const secTimer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(secTimer);
  }, [liveHudCalls.length, isBannerPaused]);

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

  // Approve once & hide banner WITHOUT declining the call
  const handleStopTimerKeepCall = (call: LiveScreenedCallItem) => {
    stopRingingSound();
    markCallApprovedOnce(call.id);
    if (call.callSid) markCallApprovedOnce(call.callSid);
    const currentVal = formatElapsed(call);
    setStoppedTimerByCallId((prev) => ({
      ...prev,
      [call.id]: currentVal,
    }));
  };

  const handleCallAction = async (
    call: LiveScreenedCallItem,
    action: 'answer_in_app' | 'decline' | 'terminate_and_block_caller' | 'terminate_and_block_areacode' | 'dismiss'
  ) => {
    stopRingingSound();
    markCallApprovedOnce(call.id);
    if (call.callSid) markCallApprovedOnce(call.callSid);
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
        setTimeout(() => setActionNotice(null), 4000);
      }
      await fetchLiveCalls();
    } catch {
      // ignore
    }
  };

  const activeCall = liveHudCalls.find(
    (c) => !handledCallIds.has(c.id) && !handledCallIds.has(c.callSid) && !stoppedTimerByCallId[c.id]
  ) || null;
  const isAlbertaAreaCode = activeCall ? PROTECTED_ALBERTA_CODES.has(activeCall.areaCode || '') : false;
  const calledBefore = Boolean(
    activeCall?.calledBefore ||
      activeCall?.isRepeatClient ||
      (activeCall?.priorCallsCount && activeCall.priorCallsCount > 1) ||
      activeCall?.lastQuoteNumber
  );
  const priorCallsCount = activeCall?.priorCallsCount || (calledBefore ? 2 : 1);

  if ((!activeCall || isBannerPaused) && !actionNotice) {
    return null;
  }

  return (
    <>
      {/* Action Feedback Toast */}
      {actionNotice && (
        <div className="fixed top-12 right-3 z-[9999] pointer-events-auto max-w-sm bg-[#0B0F17] border border-emerald-500/40 rounded-lg px-2.5 py-1.5 text-[11px] text-emerald-200 shadow-xl flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-slate-400 hover:text-white">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Ultra-Compact Single-Line Call Pill (Approve Once or Pause Banner in 1 click) */}
      {activeCall && activeCall.status !== 'BLOCKED' && !isBannerPaused && (
        <div
          className="fixed top-0 inset-x-0 z-[9999] pointer-events-auto shadow-md"
          data-testid="banner-incoming-call"
        >
          <div className="flex items-center justify-between gap-1.5 bg-slate-900/95 backdrop-blur-md text-white px-2.5 py-1 border-b border-red-500/60 text-[11px]">
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-600 text-white font-black text-[10px] shrink-0">
                <PhoneCall className="w-2.5 h-2.5 animate-pulse" />
                <span>{formatElapsed(activeCall)}</span>
              </span>

              <span className="font-extrabold tracking-tight truncate text-white">
                {activeCall.callerNumber}
                {activeCall.callerName && !activeCall.callerName.includes('Inbound Caller')
                  ? ` • ${activeCall.callerName}`
                  : ''}
              </span>

              {/* Called Before vs 1st-Time Caller Indicator */}
              {calledBefore ? (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-black text-[10px] shrink-0"
                  title="This person has called or requested a quote before"
                >
                  <History className="w-2.5 h-2.5" />
                  <span>
                    🔁 Called Before ({priorCallsCount}x
                    {activeCall.lastQuoteNumber ? ` • Quote #${activeCall.lastQuoteNumber}` : ''})
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold text-[10px] shrink-0">
                  <span>🆕 1st Call</span>
                </span>
              )}

              <span className="hidden md:inline text-slate-400 font-mono text-[10px] truncate">
                ➔ {activeCall.originalDialedNumber} ({activeCall.campaignLabel})
              </span>
            </div>

            {/* Right Controls: Approve & Open Quote, Approve Once (Dismiss), Pause Banner, Block # */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => openQuoteWithAutoListen(activeCall, { stopTimer: true })}
                className="rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-black px-2 py-0.5 flex items-center gap-1 cursor-pointer"
                title="Open Quick Quote with this caller (approves once so banner closes)"
              >
                <Mic className="w-2.5 h-2.5" />
                <span>Open Quote</span>
              </button>

              <button
                type="button"
                onClick={() => handleStopTimerKeepCall(activeCall)}
                className="rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-[10px] font-bold px-2 py-0.5 cursor-pointer"
                title="Approve once — hides banner for this call permanently"
              >
                ✓ Approve Once
              </button>

              <button
                type="button"
                onClick={() => togglePauseBanner(true)}
                className="rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-[10px] font-bold px-2 py-0.5 flex items-center gap-0.5 cursor-pointer"
                title="Pause the call banner completely"
              >
                <PauseCircle className="w-2.5 h-2.5" />
                <span>Pause Banner</span>
              </button>

              <button
                type="button"
                onClick={() => handleCallAction(activeCall, 'terminate_and_block_caller')}
                className="rounded bg-red-900/80 hover:bg-red-800 border border-red-400/40 text-red-100 text-[10px] font-bold px-1.5 py-0.5 flex items-center gap-0.5 cursor-pointer"
                title={`Block caller ${activeCall.callerNumber}`}
              >
                <Ban className="w-2.5 h-2.5" />
                <span className="hidden sm:inline">Block</span>
              </button>

              {activeCall.areaCode && !isAlbertaAreaCode && (
                <button
                  type="button"
                  onClick={() => handleCallAction(activeCall, 'terminate_and_block_areacode')}
                  className="rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-mono font-bold px-1.5 py-0.5 cursor-pointer"
                  title={`Block entire ${activeCall.areaCode}* area code`}
                >
                  {activeCall.areaCode}*
                </button>
              )}

              <button
                type="button"
                onClick={() => handleCallAction(activeCall, 'dismiss')}
                className="rounded text-slate-400 hover:text-white p-0.5 cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

