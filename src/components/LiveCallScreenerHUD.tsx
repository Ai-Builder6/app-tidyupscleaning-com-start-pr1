import React, { useState, useEffect, useCallback } from 'react';
import {
  PhoneIncoming,
  PhoneCall,
  PhoneOff,
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

  const fetchLiveCalls = useCallback(async () => {
    try {
      const res = await fetch(`/api/twilio/live-calls?project=${projectId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.liveHudCalls)) {
        setLiveHudCalls(data.liveHudCalls);
      }
      if (Array.isArray(data.recentCalls)) {
        setRecentCalls(data.recentCalls);
      }
    } catch {
      // ignore transient network errors
    }
  }, [projectId]);

  useEffect(() => {
    fetchLiveCalls();
    const pollTimer = setInterval(fetchLiveCalls, 2500);
    return () => clearInterval(pollTimer);
  }, [fetchLiveCalls]);

  useEffect(() => {
    if (liveHudCalls.length === 0) return;
    const secTimer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(secTimer);
  }, [liveHudCalls.length]);

  const handleSimulateCall = async (scenario: 'clean_7223' | 'spam_408') => {
    setIsSimulating(true);
    try {
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
      if (data.success) {
        await fetchLiveCalls();
      }
    } catch {
      // ignore
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCallAction = async (
    call: LiveScreenedCallItem,
    action: 'answer_in_app' | 'decline' | 'terminate_and_block_caller' | 'terminate_and_block_areacode' | 'dismiss'
  ) => {
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

  const handleOpenQuoteAndAutoListen = (call: LiveScreenedCallItem) => {
    const prefillLead: AdLeadItem & { autoStartVoiceListener?: number } = {
      id: `call-lead-${call.id}`,
      customerName:
        call.callerName && !call.callerName.includes('Inbound Caller') && !call.callerName.includes('Verified Customer')
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
    };
    onStartQuoteWithCaller(prefillLead);
  };

  const formatElapsed = (iso: string) => {
    const diffSec = Math.max(0, Math.floor((nowTick - new Date(iso).getTime()) / 1000));
    if (diffSec >= 3600) {
      return `${Math.floor(diffSec / 60)}m ago`;
    }
    const mins = String(Math.floor(diffSec / 60)).padStart(2, '0');
    const secs = String(diffSec % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const activeCall = liveHudCalls[0] || null;
  const isAlbertaAreaCode = activeCall ? PROTECTED_ALBERTA_CODES.has(activeCall.areaCode || '') : false;

  return (
    <div className="fixed top-14 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none max-w-md w-full">
      {/* Compact Always-Accessible Live Call Attribution & Test Bar */}
      <div className="pointer-events-auto flex items-center bg-[#0B0F17]/95 border border-white/10 shadow-2xl rounded-lg overflow-hidden text-[11px] text-slate-200 backdrop-blur-md">
        <button
          onClick={() => setIsDrawerOpen((prev) => !prev)}
          className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 transition-colors border-r border-white/10"
          title="View Live Screened Call Attribution (Original Line Dialed + Caller ID)"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold tracking-tight text-white">LIVE SCREENER</span>
          <span className="font-mono text-emerald-400 tabular-nums">
            {recentCalls[0]?.callerNumber || '(587) 900-7223'}
          </span>
          {isDrawerOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
        </button>

        <button
          onClick={() => handleSimulateCall('clean_7223')}
          disabled={isSimulating}
          className="px-2.5 py-1.5 font-semibold text-emerald-300 hover:bg-emerald-500/15 transition-colors border-r border-white/10 flex items-center gap-1"
          title="Simulate a customer dialing (587) 900-7223 so you can test the In-App Call Screener & Answer Console"
        >
          <PhoneIncoming className="w-3 h-3" />
          <span>Test Ring</span>
        </button>

        <button
          onClick={onOpenSpamShieldModal}
          className="px-2.5 py-1.5 font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1"
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
              : 'bg-[#0B0F17] border-emerald-500/60'
          }`}
        >
          {/* Row 1: Header Status + Compact Red Block # + Compact Blue Area Code Block + Timer */}
          <div
            className={`px-3 py-2 border-b flex items-center justify-between gap-1.5 ${
              activeCall.status === 'BLOCKED'
                ? 'bg-rose-950/40 border-rose-500/30'
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
              ) : activeCall.liveState === 'ANSWERED_IN_APP' ? (
                <>
                  <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 truncate">
                    LIVE CALL IN CONSOLE
                  </span>
                </>
              ) : (
                <>
                  <PhoneIncoming className="w-3.5 h-3.5 text-emerald-400 animate-bounce shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 truncate">
                    INCOMING CALL
                  </span>
                </>
              )}
            </div>

            {/* Compact Top-Right Block Controls + Running Timer */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Small Red Button: Block this specific caller number */}
              <button
                onClick={() => handleCallAction(activeCall, 'terminate_and_block_caller')}
                className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                title={`Drop & Permanently Block ${activeCall.callerNumber}`}
              >
                <Ban className="w-2.5 h-2.5" />
                <span>Block #</span>
              </button>

              {/* Separate Small Blue Button: Block 3-digit Area Code (Protected for AB 780/587/825) */}
              {activeCall.areaCode && (
                <button
                  onClick={() => handleCallAction(activeCall, 'terminate_and_block_areacode')}
                  className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer ${
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

              <span className="font-mono text-[11px] font-bold text-slate-200 tabular-nums pl-1">
                {formatElapsed(activeCall.timestamp)}
              </span>

              <button
                onClick={() => handleCallAction(activeCall, 'dismiss')}
                className="text-slate-400 hover:text-white p-0.5 rounded"
                title="Close Banner"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Row 2: Customer Caller ID + CRM Match */}
          <div className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  CUSTOMER CALLER ID
                </div>
                <div className="font-mono text-xl font-black text-white tracking-tight tabular-nums mt-0.5">
                  {activeCall.callerNumber}
                </div>
                <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mt-0.5">
                  {activeCall.isRepeatClient && <UserCheck className="w-3.5 h-3.5 text-emerald-400" />}
                  <span>{activeCall.callerName}</span>
                </div>
              </div>

              <div className="text-right border-l border-white/10 pl-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  AREA CODE
                </div>
                <div className="font-mono text-base font-black text-emerald-400 tabular-nums">
                  {activeCall.areaCode || '780'}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {activeCall.status === 'BLOCKED' ? '1s Hangup' : 'Clean Pass'}
                </div>
              </div>
            </div>

            {activeCall.matchedAddress && (
              <div className="flex items-center justify-between bg-white/[0.03] border border-white/10 rounded-lg px-3 py-2 text-xs">
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

            {/* Live Transcript Preview if Captured */}
            {activeCall.transcriptText && (
              <div className="bg-slate-950/90 border border-white/10 rounded-lg p-2.5 text-[11px] text-slate-300 max-h-24 overflow-y-auto font-mono leading-relaxed">
                <div className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 mb-1">
                  LIVE CALL TRANSCRIPT CAPTURED:
                </div>
                {activeCall.transcriptText}
              </div>
            )}

            {/* Row 3: Original Dialed Line Attribution Grid (Zero-Pill Swiss Grid) */}
            <div className="grid grid-cols-2 border border-white/10 rounded-lg overflow-hidden bg-slate-950/70">
              <div className="p-2.5 border-r border-white/10">
                <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  ORIGINAL LINE DIALED
                </div>
                <div className="font-mono text-sm font-black text-white tabular-nums mt-0.5">
                  {activeCall.originalDialedNumber}
                </div>
                <div className="text-[11px] font-semibold text-amber-200/90 truncate mt-0.5">
                  {activeCall.campaignLabel}
                </div>
              </div>

              <div className="p-2.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  {activeCall.status === 'BLOCKED' ? 'SHIELD ACTION' : 'RECEIVING LINE'}
                </div>
                <div className="font-mono text-xs font-bold text-slate-100 tabular-nums mt-0.5 truncate">
                  {activeCall.status === 'BLOCKED'
                    ? 'Severed (<Hangup/>)'
                    : activeCall.receivingLineLabel}
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                  via Shield {activeCall.shieldNumber}
                </div>
              </div>
            </div>

            {/* Row 4: 1-Click Start Quote + Live Audio Listen, and Clean Answer / Decline Below */}
            <div className="space-y-2 pt-1">
              {activeCall.status !== 'BLOCKED' && (
                <button
                  onClick={() => handleOpenQuoteAndAutoListen(activeCall)}
                  className="w-full py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg transition-colors cursor-pointer"
                >
                  <Mic className="w-4 h-4 animate-pulse" />
                  <span>Start Quote + Live Audio Listen ({activeCall.originalDialedNumber})</span>
                </button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleCallAction(activeCall, 'answer_in_app')}
                  className="py-2 px-3 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Answer</span>
                </button>

                <button
                  onClick={() => handleCallAction(activeCall, 'decline')}
                  className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/15 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="Decline or hang up call cleanly without blocking the number"
                >
                  <PhoneOff className="w-3.5 h-3.5 text-rose-400" />
                  <span>Decline</span>
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
                <span>Live Call Attribution & Screener Log</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Preserves original dialed Quo number (e.g. 587-900-7223) + Customer Caller ID
              </p>
            </div>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Simulator Bar */}
          <div className="px-4 py-2.5 bg-white/[0.02] border-b border-white/10 flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-slate-300">Simulate Call to Test HUD:</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleSimulateCall('clean_7223')}
                disabled={isSimulating}
                className="px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-mono text-[11px] font-bold"
              >
                +1 (780) ➔ 587-900-7223
              </button>
              <button
                onClick={() => handleSimulateCall('spam_408')}
                disabled={isSimulating}
                className="px-2.5 py-1 rounded bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 font-mono text-[11px] font-bold"
              >
                Spam 408 ➔ Kill
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-white/10">
            {recentCalls.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No screened calls recorded yet. Click <strong>+1 (780) ➔ 587-900-7223</strong> above to test the live screener popup!
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
                        handleOpenQuoteAndAutoListen(item);
                      }}
                      className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1"
                    >
                      <Mic className="w-3 h-3" />
                      <span>Quote + Listen</span>
                    </button>
                    <button
                      onClick={() => handleCallAction(item, 'terminate_and_block_caller')}
                      className="px-2 py-1 rounded bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 font-mono text-[10px] font-bold"
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
  );
};
