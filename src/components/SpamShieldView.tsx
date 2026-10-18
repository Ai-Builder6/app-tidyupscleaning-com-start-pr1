import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  PhoneCall,
  CheckCircle2,
  Trash2,
  Plus,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Copy,
  ExternalLink,
  Shield,
  PhoneOff,
  Flame,
  Globe,
  Radio,
  Sliders,
  DollarSign,
  Info,
  Check,
  RefreshCw,
  X
} from 'lucide-react';
import { SpamShieldConfig, BlockedCallHistoryItem } from '../types/dispatch';
import {
  saveBlockedNumberToFirestore,
  deleteBlockedNumberFromFirestore,
  saveScreenedCallToFirestore,
} from '../services/firestoreSyncService';

interface SpamShieldViewProps {
  projectId?: 'dispatchgeeni' | 'tidyups';
  preFillNumber?: string;
  onNavigateToVoiceIntake?: () => void;
  onNavigateToMap?: () => void;
  onNavigateToManagement?: () => void;
}

const PRESET_SPAM_COUNTRIES = [
  { code: '+44', name: 'United Kingdom', flag: '🇬🇧' },
  { code: '+91', name: 'India', flag: '🇮🇳' },
  { code: '+234', name: 'Nigeria', flag: '🇳🇬' },
  { code: '+86', name: 'China', flag: '🇨🇳' },
  { code: '+7', name: 'Russia / Kazakhstan', flag: '🇷🇺' },
  { code: '+63', name: 'Philippines', flag: '🇵🇭' },
  { code: '+92', name: 'Pakistan', flag: '🇵🇰' },
  { code: '+52', name: 'Mexico', flag: '🇲🇽' },
  { code: '+380', name: 'Ukraine', flag: '🇺🇦' },
  { code: '+254', name: 'Kenya', flag: '🇰🇪' },
  { code: '+33', name: 'France', flag: '🇫🇷' },
  { code: '+49', name: 'Germany', flag: '🇩🇪' },
];

const PRESET_SPAM_PREFIXES = [
  { pattern: '1800*', label: '1-800 Toll Free' },
  { pattern: '1888*', label: '1-888 Toll Free' },
  { pattern: '1877*', label: '1-877 Toll Free' },
  { pattern: '1866*', label: '1-866 Toll Free' },
  { pattern: '1855*', label: '1-855 Toll Free' },
  { pattern: '1844*', label: '1-844 Toll Free' },
  { pattern: '1833*', label: '1-833 Toll Free' },
];

export const SpamShieldView: React.FC<SpamShieldViewProps> = ({
  projectId = 'tidyups',
  preFillNumber = '',
  onNavigateToVoiceIntake,
  onNavigateToMap,
  onNavigateToManagement,
}) => {
  const [activeTab, setActiveTab] = useState<'PREFIXES' | 'COUNTRIES' | 'NUMBERS' | 'LOGS' | 'TEST' | 'COST_LINES'>('PREFIXES');
  const [calcMinutes, setCalcMinutes] = useState(1000);
  const [calcBlockedCalls, setCalcBlockedCalls] = useState(350);
  const [config, setConfig] = useState<SpamShieldConfig>({
    enabled: true,
    blockAllNonNorthAmerica: true,
    blockedCountryCodes: ['+44', '+91', '+234', '+86', '+7', '+37', '+20', '+33'],
    blockedPrefixes: ['1800*', '1888*', '1877*', '1844*', '1855*', '1866*'],
    blockedNumbers: ['+18005550199', '+18885550123'],
    rejectionAction: 'busy',
  });
  const [history, setHistory] = useState<BlockedCallHistoryItem[]>([]);
  const [recentCalls, setRecentCalls] = useState<any[]>([]);
  const [quoScreenedCalls, setQuoScreenedCalls] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Quick Block Input (Supports full phone number OR 3-digit area code)
  const [quickBlockInput, setQuickBlockInput] = useState(preFillNumber);

  // Form Inputs
  const [newPrefixInput, setNewPrefixInput] = useState('');
  const [newCountryInput, setNewCountryInput] = useState('');
  const [newNumberInput, setNewNumberInput] = useState(preFillNumber);

  // Test Simulator
  const [testNumberInput, setTestNumberInput] = useState(preFillNumber || '+1 (844) 932-8819');
  const [testResult, setTestResult] = useState<any | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [forwardNumberInput, setForwardNumberInput] = useState('+15879007223');

  // 1-to-1 Line Router Inputs
  const [mapTwilioNumber, setMapTwilioNumber] = useState('');
  const [mapQuoNumber, setMapQuoNumber] = useState('+15875708005');
  const [testDialedLine, setTestDialedLine] = useState('');

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/twilio/voice`
    : 'https://app.tidyupscleaning.com/api/twilio/voice';

  // Fetch current config & history
  const fetchSpamShield = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/twilio/spam-shield?project=${projectId}`);
      const data = await res.json();
      if (data.success && data.config) {
        setConfig(data.config);
        if (data.config.forwardDestinationNumber) {
          setForwardNumberInput(data.config.forwardDestinationNumber);
        }
        if (data.history) setHistory(data.history);
        if (data.recentInboundCalls) setRecentCalls(data.recentInboundCalls);
        if (data.quoScreenedCalls) setQuoScreenedCalls(data.quoScreenedCalls);
      }
    } catch (e) {
      console.warn('Failed to fetch spam shield config:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSpamShield();
    if (preFillNumber) {
      setQuickBlockInput(preFillNumber);
      setNewNumberInput(preFillNumber);
      setTestNumberInput(preFillNumber);
    }
  }, [preFillNumber]);

  // Extract 3-digit area code from any input (e.g. "844", "(780) 555-1234", "+18449328819")
  const extractAreaCode = (rawInput: string): string => {
    const digits = (rawInput || '').replace(/\D/g, '');
    const norm = digits.length >= 4 && digits.startsWith('1') ? digits.slice(1) : digits;
    return norm.length >= 3 ? norm.slice(0, 3) : '';
  };

  const quickDetectedAreaCode = extractAreaCode(quickBlockInput);
  const quickDigitsCount = (quickBlockInput || '').replace(/\D/g, '').length;

  // Save config update
  const handleSaveConfig = async (newConfig: Partial<SpamShieldConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);
    try {
      const res = await fetch(`/api/twilio/spam-shield?project=${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: updated }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusNotice('Shield rules updated and live in Twilio!');
        setTimeout(() => setStatusNotice(null), 3000);
      }
    } catch {
      setStatusNotice('Error saving spam configuration.');
    }
  };

  // Block item (number, prefix, areacode, country) & sync to Firestore
  const handleBlockItem = async (number: string, type: 'number' | 'prefix' | 'areacode' | 'country', reason?: string) => {
    if (!number.trim()) return;
    try {
      const res = await fetch(`/api/twilio/block-number?project=${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: number.trim(), type, reason }),
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        if (data.history) setHistory(data.history);
        if (data.recentInboundCalls) setRecentCalls(data.recentInboundCalls);
        if (data.calls) {
          setQuoScreenedCalls(
            data.calls.filter(
              (c: any) => !c.hasCleaningIntent || c.status === 'SOLICITOR_BLOCKED' || c.status === 'SCREENED_CALL' || c.isBlocked
            )
          );
        }
        saveBlockedNumberToFirestore({
          number: data.appliedRule || number.trim(),
          type,
          reason: reason || `Blocked via Spam Shield (${type})`,
          source: 'SpamShieldView',
        }).catch(() => {});
        setStatusNotice(data.message || `Blocked & saved to Database: ${data.appliedRule || number.trim()}`);
        setTimeout(() => setStatusNotice(null), 4000);
        if (type === 'prefix' || type === 'areacode') setNewPrefixInput('');
        if (type === 'country') setNewCountryInput('');
        if (type === 'number') setNewNumberInput('');
        setQuickBlockInput('');
      }
    } catch {
      setStatusNotice('Error blocking rule.');
    }
  };

  // Unblock item & sync to Firestore
  const handleUnblockItem = async (number: string, type: 'number' | 'prefix' | 'country') => {
    try {
      const res = await fetch(`/api/twilio/unblock-number?project=${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number, type }),
      });
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        if (data.calls) {
          setQuoScreenedCalls(
            data.calls.filter(
              (c: any) => !c.hasCleaningIntent || c.status === 'SOLICITOR_BLOCKED' || c.status === 'SCREENED_CALL' || c.isBlocked
            )
          );
        }
        deleteBlockedNumberFromFirestore(number).catch(() => {});
        setStatusNotice(`Unblocked & updated in Database: ${number}`);
        setTimeout(() => setStatusNotice(null), 3000);
      }
    } catch {
      setStatusNotice('Error unblocking rule.');
    }
  };

  // Toggle block on a Quo / Sonia AI screened call directly
  const handleToggleScreenedCallBlock = async (call: any, shouldBlock: boolean) => {
    try {
      const res = await fetch(`/api/quo/calls/toggle-block?project=${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId: call.id,
          callerPhone: call.callerPhone,
          callerName: call.callerName,
          reason: call.summary ? `Sonia AI Screened (${call.callerName || call.callerPhone}): ${String(call.summary).slice(0, 80)}` : undefined,
          block: shouldBlock,
        }),
      });
      const data = await res.json();
      if (data?.success) {
        if (data.spamShieldConfig) setConfig(data.spamShieldConfig);
        if (data.blockedCallsHistory) setHistory(data.blockedCallsHistory);
        if (Array.isArray(data.calls)) {
          setQuoScreenedCalls(
            data.calls.filter(
              (c: any) => !c.hasCleaningIntent || c.status === 'SOLICITOR_BLOCKED' || c.status === 'SCREENED_CALL' || c.isBlocked
            )
          );
          const updated = data.calls.find((c: any) => c.id === call.id);
          if (updated) saveScreenedCallToFirestore(updated).catch(() => {});
        }
        if (shouldBlock) {
          saveBlockedNumberToFirestore({
            number: data.number || call.callerPhone,
            type: 'number',
            reason: call.summary || 'Blocked from Screened Call List',
            callerName: call.callerName,
            source: 'Sonia AI Screener',
          }).catch(() => {});
        } else {
          deleteBlockedNumberFromFirestore(data.number || call.callerPhone).catch(() => {});
        }
        setStatusNotice(data.message);
        setTimeout(() => setStatusNotice(null), 4000);
      }
    } catch {
      setStatusNotice('Error updating screened call block status.');
    }
  };

  // Add 1-to-1 line mapping
  const handleAddLineMapping = () => {
    if (!mapTwilioNumber.trim() || !mapQuoNumber.trim()) {
      setStatusNotice('Please enter both the Twilio Inbound Number and target Quo Number.');
      return;
    }
    const currentMappings = config.lineMappings || {};
    const updated = {
      ...currentMappings,
      [mapTwilioNumber.trim()]: mapQuoNumber.trim(),
    };
    handleSaveConfig({ lineMappings: updated });
    setMapTwilioNumber('');
    setStatusNotice(`Mapped 1-to-1 route: ${mapTwilioNumber.trim()} ➔ ${mapQuoNumber.trim()}`);
  };

  const handleRemoveLineMapping = (inboundNumber: string) => {
    const currentMappings = { ...(config.lineMappings || {}) };
    delete currentMappings[inboundNumber];
    handleSaveConfig({ lineMappings: currentMappings });
    setStatusNotice(`Removed 1-to-1 route for ${inboundNumber}`);
  };

  // Test phone number
  const handleRunTest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!testNumberInput.trim()) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/twilio/test-number?project=${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: testNumberInput.trim(),
          calledNumber: testDialedLine.trim() || undefined,
        }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({
        isBlocked: false,
        reason: 'Error testing number against server endpoint.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Clear history
  const handleClearHistory = async () => {
    try {
      await fetch(`/api/twilio/clear-history?project=${projectId}`, { method: 'POST' });
      setHistory([]);
      setStatusNotice('Blocked call history cleared.');
      setTimeout(() => setStatusNotice(null), 2500);
    } catch {
      // ignore
    }
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0b0e14] text-slate-100 font-sans p-4 sm:p-6 lg:p-8 space-y-6 animate-fadeIn min-h-[calc(100vh-4rem)]">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-rose-900/30">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Twilio Spam Shield &amp; Call Blocker Console
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live TwiML Active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Stop robocallers, international spoofers, and spammers with rotating numbers. Blocked callers receive an instant busy tone at <strong>$0 cost</strong> before your phone rings.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <button
            onClick={fetchSpamShield}
            disabled={isLoading}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          {onNavigateToMap && (
            <button
              onClick={onNavigateToMap}
              className="px-3.5 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-95 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <span>← Back to Dispatch Map</span>
            </button>
          )}
          {onNavigateToManagement && (
            <button
              onClick={onNavigateToManagement}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Management Hub</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Notice Toast */}
      {statusNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs flex items-center justify-between shadow-xl animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-extrabold text-sm">{statusNotice}</span>
          </div>
          <button onClick={() => setStatusNotice(null)} className="text-emerald-400 hover:text-white font-bold p-1">✕</button>
        </div>
      )}

      {/* ⚡ 1-CLICK INSTANT BLOCK NUMBER OR ENTIRE 3-DIGIT AREA CODE BAR */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-rose-950/80 via-[#191424] to-slate-900 border-2 border-rose-500/60 shadow-2xl space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-black uppercase tracking-wider shadow-sm">
              ⚡ Instant 1-Click Blocker
            </span>
            <span className="text-sm font-extrabold text-white">
              Block Spammer Number or Entire 3-Digit Area Code
            </span>
          </div>
          <span className="text-[11px] text-rose-300 font-semibold">
            Protects all marketing lines and forwarding numbers
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch">
          <div className="relative flex-1">
            <input
              type="text"
              value={quickBlockInput}
              onChange={(e) => setQuickBlockInput(e.target.value)}
              placeholder="Paste caller number (e.g. 844-932-8819) or enter 3-digit Area Code (e.g. 844)..."
              className="w-full bg-slate-950/90 border-2 border-slate-700 focus:border-rose-500 text-white placeholder-slate-500 px-4 py-3 rounded-2xl text-sm font-mono focus:outline-none transition-colors"
            />
            {quickBlockInput && (
              <button
                type="button"
                onClick={() => setQuickBlockInput('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            )}
          </div>

          {/* Action A: Block this exact number */}
          <button
            type="button"
            disabled={quickDigitsCount < 7}
            onClick={() => handleBlockItem(quickBlockInput.trim(), 'number', '1-Click manual block')}
            className="px-4 py-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0 active:scale-95"
            title="Block this exact 10-digit phone number"
          >
            <PhoneOff className="w-4 h-4" />
            <span>Block Exact Number</span>
          </button>

          {/* Action B: 1-Click Block ENTIRE 3-Digit Area Code */}
          <button
            type="button"
            disabled={!quickDetectedAreaCode || quickDetectedAreaCode.length !== 3}
            onClick={() => handleBlockItem(quickDetectedAreaCode, 'areacode', `1-Click area code block: ${quickDetectedAreaCode}`)}
            className="px-4 py-3 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0 border border-red-400/40 active:scale-95"
            title={quickDetectedAreaCode ? `Block ALL incoming calls from area code ${quickDetectedAreaCode} (Pattern: 1${quickDetectedAreaCode}*)` : 'Enter a number or 3-digit area code'}
          >
            <ShieldAlert className="w-4 h-4 text-white" />
            <span>
              {quickDetectedAreaCode && quickDetectedAreaCode.length === 3
                ? `Block Area Code (${quickDetectedAreaCode})`
                : 'Block Area Code'}
            </span>
          </button>
        </div>

        {/* Live Helper Guide */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 pt-1">
          <span className="font-bold text-slate-300">Quick 1-Click Suggestions:</span>
          {['844', '800', '888', '877', '855', '866', '833'].map((ac) => {
            const isAlready = (config.blockedPrefixes || []).some(
              (p) => p === `1${ac}*` || p === `${ac}*`
            );
            return (
              <button
                key={ac}
                type="button"
                onClick={() => {
                  setQuickBlockInput(ac);
                  handleBlockItem(ac, 'areacode', `Toll-free spam block ${ac}`);
                }}
                disabled={isAlready}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  isAlready
                    ? 'bg-rose-950/60 text-rose-400/70 border border-rose-900/60 cursor-default'
                    : 'bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white border border-slate-700'
                }`}
              >
                <span>{ac}</span>
                {isAlready && <span className="text-[10px]">✓ Blocked</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1 bg-[#131722] p-1.5 rounded-2xl border border-slate-800 overflow-x-auto">
        <button
          onClick={() => setActiveTab('PREFIXES')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'PREFIXES'
              ? 'bg-rose-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Flame className="w-4 h-4 text-rose-300" />
          <span>Rotating Prefix Rules ({(config.blockedPrefixes || []).length})</span>
        </button>

        <button
          onClick={() => setActiveTab('COUNTRIES')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'COUNTRIES'
              ? 'bg-rose-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Globe className="w-4 h-4 text-emerald-400" />
          <span>Foreign Country Codes ({(config.blockedCountryCodes || []).length})</span>
        </button>

        <button
          onClick={() => setActiveTab('NUMBERS')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'NUMBERS'
              ? 'bg-rose-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <PhoneOff className="w-4 h-4 text-amber-400" />
          <span>Blocked Numbers ({(config.blockedNumbers || []).length})</span>
        </button>

        <button
          onClick={() => setActiveTab('LOGS')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'LOGS'
              ? 'bg-rose-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Radio className="w-4 h-4 text-blue-400" />
          <span>Intercepted Spam Logs ({history.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('TEST')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'TEST'
              ? 'bg-rose-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Play className="w-4 h-4 text-purple-400" />
          <span>Live Call Simulator</span>
        </button>

        <button
          onClick={() => setActiveTab('COST_LINES')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'COST_LINES'
              ? 'bg-rose-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4 text-emerald-400" />
          <span>Cost &amp; Line Routing</span>
        </button>
      </div>

      {/* Tab 1: Rotating Prefixes */}
      {activeTab === 'PREFIXES' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-[#131722] border border-slate-800 space-y-3">
            <h3 className="font-extrabold text-base text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-rose-500" />
              <span>Block Spammers Rotating the Last 4 Digits</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
              Spammers buy blocks of 1,000 numbers in the same area code (e.g. <code>1-844-932-XXXX</code>). If you block only 1 number, they call back 5 minutes later from another number in that same block. Adding a wildcard prefix like <code>1844*</code> or <code>1844932*</code> drops <strong>every number in that block instantly</strong> before connection!
            </p>

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={newPrefixInput}
                onChange={(e) => setNewPrefixInput(e.target.value)}
                placeholder="Enter prefix pattern (e.g. 1844*, 1800*, 780555*)..."
                className="flex-1 bg-slate-900 border border-slate-700 text-white placeholder-slate-500 px-4 py-2.5 rounded-xl text-xs font-mono focus:border-rose-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (newPrefixInput.trim()) {
                    handleBlockItem(newPrefixInput.trim(), 'prefix', 'Manually added prefix pattern');
                  }
                }}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Prefix Rule</span>
              </button>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="p-5 rounded-2xl bg-[#131722] border border-slate-800 space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              1-Click Standard Robocall Patterns
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {PRESET_SPAM_PREFIXES.map((p) => {
                const isBlocked = (config.blockedPrefixes || []).includes(p.pattern);
                return (
                  <button
                    key={p.pattern}
                    type="button"
                    onClick={() => {
                      if (isBlocked) {
                        handleUnblockItem(p.pattern, 'prefix');
                      } else {
                        handleBlockItem(p.pattern, 'prefix', `Preset ${p.label}`);
                      }
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                      isBlocked
                        ? 'bg-rose-950/80 border-rose-600 text-rose-200'
                        : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    <span className="font-mono font-black text-sm">{p.pattern}</span>
                    <span className="text-[10px] font-bold text-slate-400">{p.label}</span>
                    <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded text-center ${
                      isBlocked ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {isBlocked ? '✓ Active Block' : '+ Block'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Rules List */}
          <div className="p-5 rounded-2xl bg-[#131722] border border-slate-800 space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Active Prefix Wildcard Rules ({(config.blockedPrefixes || []).length})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {(config.blockedPrefixes || []).map((prefix) => (
                <div
                  key={prefix}
                  className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex items-center justify-between gap-2 font-mono text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <span className="font-bold text-white text-sm">{prefix}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUnblockItem(prefix, 'prefix')}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/80 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Remove rule"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Country Codes */}
      {activeTab === 'COUNTRIES' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-[#131722] border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-white">Block Non-North American Calls (+1 Only)</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Since your cleaning clients are in Edmonton &amp; Alberta, almost 100% of international calls are telemarketers and spoofed scams.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.blockAllNonNorthAmerica}
                  onChange={(e) => handleSaveConfig({ blockAllNonNorthAmerica: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>

          {/* Quick Country Presets */}
          <div className="p-5 rounded-2xl bg-[#131722] border border-slate-800 space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              1-Click Preset Spam Country Codes
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {PRESET_SPAM_COUNTRIES.map((c) => {
                const isBlocked = (config.blockedCountryCodes || []).includes(c.code);
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      if (isBlocked) {
                        handleUnblockItem(c.code, 'country');
                      } else {
                        handleBlockItem(c.code, 'country', `Preset ${c.name}`);
                      }
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      isBlocked
                        ? 'bg-rose-950/80 border-rose-600 text-rose-200'
                        : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{c.flag}</span>
                      <div>
                        <div className="font-mono font-bold text-xs">{c.code}</div>
                        <div className="text-[11px] text-slate-400">{c.name}</div>
                      </div>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                      isBlocked ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {isBlocked ? 'Blocked' : '+ Block'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Specific Numbers */}
      {activeTab === 'NUMBERS' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-[#131722] border border-slate-800 space-y-3">
            <h3 className="font-extrabold text-base text-white">Block Specific Caller Phone Numbers</h3>
            <p className="text-xs text-slate-400">
              Add individual caller numbers that repeatedly call your dispatch line or staff.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={newNumberInput}
                onChange={(e) => setNewNumberInput(e.target.value)}
                placeholder="Enter full phone number (e.g. +1 780 555 0199 or 844-932-8819)..."
                className="flex-1 bg-slate-900 border border-slate-700 text-white placeholder-slate-500 px-4 py-2.5 rounded-xl text-xs font-mono focus:border-rose-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (newNumberInput.trim()) {
                    handleBlockItem(newNumberInput.trim(), 'number', 'Manually blocked caller');
                  }
                }}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Block Number</span>
              </button>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#131722] border border-slate-800 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Saved Blocked Numbers in Database ({(config.blockedNumbers || []).length})
              </h4>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black">
                ✓ Persisted in Local Store &amp; Cloud Firestore
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {(config.blockedNumbers || []).map((num) => (
                <div
                  key={num}
                  className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex items-center justify-between gap-2 font-mono text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span className="font-bold text-white text-sm">{num}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUnblockItem(num, 'number')}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/80 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Unblock number"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Sonia AI Screened Calls List (Yesterday & Today) */}
          {quoScreenedCalls.length > 0 && (
            <div className="p-5 rounded-2xl bg-[#131722] border border-slate-800 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="text-sm font-extrabold text-white">
                    🤖 Sonia AI Screened Call List ({quoScreenedCalls.length})
                  </h4>
                  <p className="text-xs text-slate-400">
                    Solicitors, sales reps, and short-hangup robocalls screened by Sonia AI are automatically saved &amp; blocked in your database.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {quoScreenedCalls.map((call) => {
                  const callDigits = String(call.callerPhone || '').replace(/\D/g, '');
                  const normCall = callDigits.length === 11 && callDigits.startsWith('1') ? callDigits.slice(1) : callDigits;
                  const isBlocked =
                    Boolean(call.isBlocked) ||
                    call.status === 'SOLICITOR_BLOCKED' ||
                    (config.blockedNumbers || []).some((b) => {
                      const bd = String(b || '').replace(/\D/g, '');
                      const nb = bd.length === 11 && bd.startsWith('1') ? bd.slice(1) : bd;
                      return Boolean(normCall && nb === normCall);
                    });
                  return (
                    <div
                      key={call.id}
                      className={`p-3 rounded-xl border text-xs flex flex-col justify-between gap-2 ${
                        isBlocked ? 'bg-rose-950/35 border-rose-500/50' : 'bg-slate-900/80 border-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-black text-white">{call.callerName || call.callerPhone}</div>
                          <div className="font-mono text-emerald-300 text-[11px]">
                            {call.callerPhone} • {String(call.timestamp || '').slice(0, 16).replace('T', ' ')}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleScreenedCallBlock(call, !isBlocked)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-black cursor-pointer ${
                            isBlocked
                              ? 'bg-rose-600 hover:bg-emerald-700 text-white'
                              : 'bg-slate-800 hover:bg-rose-600 text-slate-200 border border-slate-700'
                          }`}
                        >
                          {isBlocked ? '🚫 Blocked in DB (Unblock)' : '+ Block Number'}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-300 bg-black/30 p-2 rounded-lg border border-slate-800/80 line-clamp-2">
                        {call.summary || call.blockedReason || 'Screened inbound call'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Logs */}
      {activeTab === 'LOGS' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#131722] border border-slate-800 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-extrabold text-base text-white">Real-Time Intercepted Spam Calls</h3>
              <p className="text-xs text-slate-400">
                Log of robocallers, rotating spammers, and blocked prefixes intercepted before phones rang.
              </p>
            </div>
            {history.length > 0 && (
              <button
                type="button"
                onClick={handleClearHistory}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/80 text-slate-300 hover:text-rose-300 border border-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Clear History
              </button>
            )}
          </div>

          <div className="space-y-2">
            {history.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-[#131722] border border-slate-800 text-slate-400 text-xs">
                No spam calls currently logged.
              </div>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-[#131722] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800">
                        DROPPED (BUSY)
                      </span>
                      <span className="font-mono font-extrabold text-white text-sm">{item.callerNumber}</span>
                      <span className="text-slate-400 font-semibold">{item.callerName}</span>
                    </div>
                    <p className="text-rose-300/90 text-[11px] font-medium">{item.reason}</p>
                  </div>
                  <div className="text-right text-[11px] font-mono text-slate-400 shrink-0">
                    {new Date(item.timestamp).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Test Simulator */}
      {activeTab === 'TEST' && (
        <div className="p-6 rounded-2xl bg-[#131722] border border-slate-800 space-y-4 max-w-2xl">
          <h3 className="font-extrabold text-base text-white">Test Any Phone Number Against Your Shield Rules</h3>
          <p className="text-xs text-slate-400">
            Simulate an incoming call to see if it would be blocked or forwarded to your phone line.
          </p>

          <form onSubmit={handleRunTest} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Caller Phone Number to Test
              </label>
              <input
                type="text"
                value={testNumberInput}
                onChange={(e) => setTestNumberInput(e.target.value)}
                placeholder="+1 (844) 932-8819 or any phone number..."
                className="w-full bg-slate-900 border border-slate-700 text-white px-4 py-2.5 rounded-xl text-xs font-mono focus:border-rose-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isTesting || !testNumberInput.trim()}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isTesting ? 'Testing...' : 'Run Spam Test'}</span>
            </button>
          </form>

          {testResult && (
            <div className={`p-4 rounded-xl border mt-3 text-xs space-y-1.5 ${
              testResult.isBlocked
                ? 'bg-rose-950/70 border-rose-500 text-rose-200'
                : 'bg-emerald-950/70 border-emerald-500 text-emerald-200'
            }`}>
              <div className="font-black text-sm flex items-center gap-2">
                <span>{testResult.isBlocked ? '🚫 CALL WOULD BE DROPPED INSTANTLY' : '✓ CALL PASSES TO FORWARD NUMBER'}</span>
              </div>
              <p className="text-xs">{testResult.reason}</p>
            </div>
          )}
        </div>
      )}

      {/* Tab 6: Cost & Line Routing */}
      {activeTab === 'COST_LINES' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-[#131722] border border-slate-800 space-y-3">
            <h3 className="font-extrabold text-base text-white">Twilio Webhook Configuration</h3>
            <p className="text-xs text-slate-400">
              Paste this URL into your Twilio Phone Numbers console under <em>"A Call Comes In" → Webhook (HTTP POST)</em>:
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className="flex-1 bg-slate-900 border border-slate-700 text-emerald-400 px-4 py-2.5 rounded-xl text-xs font-mono select-all"
              />
              <button
                type="button"
                onClick={handleCopyWebhook}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {copiedWebhook ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedWebhook ? 'Copied!' : 'Copy Webhook'}</span>
              </button>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#131722] border border-slate-800 space-y-3">
            <h3 className="font-extrabold text-base text-white">Clean Call Forward Destination</h3>
            <p className="text-xs text-slate-400">
              When a genuine customer calls (not a robocall or spammer), Twilio forwards the live call to:
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={forwardNumberInput}
                onChange={(e) => setForwardNumberInput(e.target.value)}
                placeholder="+15879007223"
                className="flex-1 bg-slate-900 border border-slate-700 text-white px-4 py-2.5 rounded-xl text-xs font-mono focus:border-rose-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleSaveConfig({ forwardDestinationNumber: forwardNumberInput.trim() })}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shrink-0"
              >
                Save Forward Destination
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
