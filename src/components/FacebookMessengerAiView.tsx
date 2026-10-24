import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Bot,
  User,
  Sparkles,
  CheckCircle2,
  Send,
  SlidersHorizontal,
  RefreshCw,
  FileSpreadsheet,
  FileCheck,
  PauseCircle,
  PlayCircle,
  Plus,
  Copy,
  Check,
  Key,
  Globe,
  Phone,
  MapPin,
  Calendar,
  Home,
  DollarSign,
  ExternalLink,
  AlertCircle,
  ArrowLeft,
  Zap,
  Edit3,
} from 'lucide-react';

export interface FbPageConfig {
  id: string;
  pageId: string;
  pageName: string;
  adCampaignLabel: string;
  pageAccessToken: string;
  secretEnvName?: string;
  secretConnected?: boolean;
  autoReplyEnabled: boolean;
}

export interface FbBotSettings {
  botName: string;
  verifyToken: string;
  greetingTemplate: string;
  systemPrompt: string;
  pricingRulesSummary: string;
  autoSyncToGoogleSheet: boolean;
  autoCreateJobberQuote: boolean;
}

export interface FbExtractedLeadData {
  customerName: string;
  phone: string;
  email: string;
  serviceType: string;
  bedrooms: string;
  bathrooms: string;
  preferredDate: string;
  timeWindow: string;
  address: string;
  addons: string[];
  estimatedHours: number;
  estimatedCleaners: number;
  estimatedHourlyRate: number;
  estimatedTotal: number;
  depositRequired: number;
  specificNotes: string;
}

export interface FbChatMessage {
  id: string;
  sender: 'customer' | 'ai' | 'owner';
  senderName: string;
  text: string;
  timestamp: string;
}

export interface FbMessengerThread {
  id: string;
  pageSlotId: 'page_1' | 'page_2' | 'page_3';
  pageName: string;
  psid: string;
  customerName: string;
  adSourceLabel: string;
  aiPaused: boolean;
  status: 'COLLECTING_INFO' | 'READY_TO_BOOK' | 'SYNCED_TO_JOBBER';
  extracted: FbExtractedLeadData;
  messages: FbChatMessage[];
  syncedLeadId?: string;
  syncedQuoteNumber?: string;
  syncedQuoteWebUri?: string;
  updatedAt: string;
  createdAt: string;
}

interface FacebookMessengerAiViewProps {
  projectId?: string;
  onLeadsUpdated?: (leads: any[]) => void;
  onQuotesUpdated?: (quotes: any[]) => void;
  onClientsUpdated?: (clients: any[]) => void;
  onBackToManagement?: () => void;
  onNavigateToMasterHub?: () => void;
}

export const FacebookMessengerAiView: React.FC<FacebookMessengerAiViewProps> = ({
  projectId = 'tidyups',
  onLeadsUpdated,
  onQuotesUpdated,
  onClientsUpdated,
  onBackToManagement,
  onNavigateToMasterHub,
}) => {
  const [pages, setPages] = useState<FbPageConfig[]>([]);
  const [botSettings, setBotSettings] = useState<FbBotSettings>({
    botName: 'TidyUps AI Messenger Assistant',
    verifyToken: 'tidyups_fb_verify_2026',
    greetingTemplate:
      "Hi {{name}}! 👋 Thanks for messaging {{page}}! I'd love to get you an exact cleaning price and check our schedule. What type of cleaning are you looking for (Standard, Deep Clean, or Move-Out), and how many bedrooms & bathrooms is the home?",
    systemPrompt:
      'You are a warm, friendly, concise booking assistant for TidyUps Cleaning Service Inc in Edmonton & surrounding areas (St. Albert, Sherwood Park, Leduc, Spruce Grove). First answer any questions the customer asks about pricing or what is included. Then naturally guide the conversation to collect: (1) Service Type (Standard, Deep Clean, or Move-Out), (2) How many Bedrooms & Bathrooms, (3) Preferred Date & Time (Morning or Afternoon), and (4) Property Address & Phone Number so we can lock in their quote and send confirmation. Keep messages short (2-3 sentences max) like a real Facebook Messenger human dispatcher.',
    pricingRulesSummary:
      '• 1 Cleaner: $52.50/hr | 2 Cleaners: $105.00/hr\n• Standard 3 Bed / 2 Bath: ~3 to 4 hrs ($191–$249)\n• Deep Clean / Move-Out 3 Bed / 2.5 Bath: ~3.5 to 4.5 hrs with 2 Cleaners ($367.50–$472.50 + $12.50 fuel surcharge + 12.5% tax)\n• Add-ons: Inside Oven, Inside Fridge, Baseboards, Interior Windows, Inside Cabinets ($45 each or included in hourly Move-Out package)\n• Deposit: $60–$100 to lock in the booking spot.',
    autoSyncToGoogleSheet: true,
    autoCreateJobberQuote: true,
  });
  const [threads, setThreads] = useState<FbMessengerThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string>('');
  const [pageFilter, setPageFilter] = useState<'ALL' | 'page_1' | 'page_2' | 'page_3'>('ALL');
  const [rightPanelTab, setRightPanelTab] = useState<'CHECKLIST' | 'TWEAK_AI' | 'WEBHOOK_SETUP'>('CHECKLIST');
  const [composerMode, setComposerMode] = useState<'SIMULATE_CUSTOMER' | 'OWNER_REPLY'>('SIMULATE_CUSTOMER');
  const [messageInput, setMessageInput] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);
  const [isSyncingThread, setIsSyncingThread] = useState<boolean>(false);
  const [isPullingExisting, setIsPullingExisting] = useState<boolean>(false);
  const [showImportExistingModal, setShowImportExistingModal] = useState<boolean>(false);
  const [importPageSlot, setImportPageSlot] = useState<'page_1' | 'page_2' | 'page_3'>('page_1');
  const [importCustomerName, setImportCustomerName] = useState<string>('');
  const [importCustomerMsg, setImportCustomerMsg] = useState<string>('');
  const [statusBanner, setStatusBanner] = useState<{ tone: 'success' | 'info' | 'warning'; text: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const webhookUrl = 'https://app.tidyupscleaning.com/api/facebook/webhook';
  const externalIntakeUrl = 'https://app.tidyupscleaning.com/api/facebook/lead-intake';

  const loadMessengerState = useCallback(async () => {
    try {
      const res = await fetch(`/api/facebook/state?project=${projectId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.pages) setPages(data.pages);
      if (data.botSettings) setBotSettings(data.botSettings);
      if (Array.isArray(data.threads)) {
        setThreads(data.threads);
        setSelectedThreadId((prev) => {
          if (prev && data.threads.some((t: any) => t.id === prev)) return prev;
          return data.threads[0]?.id || '';
        });
      }
    } catch (e) {
      console.warn('FB Messenger state load note:', e);
    }
  }, [projectId]);

  useEffect(() => {
    loadMessengerState();
  }, [loadMessengerState]);

  const activeThread = threads.find((t) => t.id === selectedThreadId) || threads[0] || null;

  const filteredThreads = threads.filter((t) => {
    if (pageFilter === 'ALL') return true;
    return t.pageSlotId === pageFilter;
  });

  const handleCopyText = (key: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveConfig = async (updatedPages = pages, updatedBot = botSettings) => {
    setIsSavingConfig(true);
    try {
      const res = await fetch(`/api/facebook/config?project=${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pages: updatedPages,
          botSettings: updatedBot,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.pages) setPages(data.pages);
        if (data.botSettings) setBotSettings(data.botSettings);
        setStatusBanner({
          tone: 'success',
          text: '✓ Saved AI Messenger Bot instructions, pricing rules & 3-Page configuration! Next messages will immediately use your updated rules.',
        });
      }
    } catch (e: any) {
      setStatusBanner({
        tone: 'warning',
        text: `Could not save config: ${e?.message || 'Network error'}`,
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handlePullExistingInbox = async () => {
    if (isPullingExisting) return;
    setIsPullingExisting(true);
    try {
      const res = await fetch(`/api/facebook/sync-existing?project=${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (Array.isArray(data.threads)) {
        setThreads(data.threads);
        if (!selectedThreadId && data.threads[0]?.id) {
          setSelectedThreadId(data.threads[0].id);
        }
      }
      if (data.leads && onLeadsUpdated) onLeadsUpdated(data.leads);
      const summaryText = Array.isArray(data.pageReports)
        ? data.pageReports.map((r: any) => `${r.pageName}: ${r.status}`).join(' • ')
        : '';
      if (data.importedCount > 0 || data.updatedCount > 0) {
        setStatusBanner({
          tone: 'success',
          text: `✓ Pulled ${data.importedCount} new and ${data.updatedCount} updated conversation(s) from your 3 Facebook Pages! (${summaryText})`,
        });
      } else {
        setStatusBanner({
          tone: 'info',
          text: `Checked all 3 Facebook Pages: ${summaryText || 'All new customer messages arrive automatically via live webhook. To pull older pre-webhook inbox history via Graph API, enable pages_read_engagement on your Page tokens in Meta or use "Paste Existing FB Message" below.'}`,
        });
      }
    } catch (err: any) {
      setStatusBanner({
        tone: 'warning',
        text: `Could not pull existing inbox: ${err?.message || 'Network error'}`,
      });
    } finally {
      setIsPullingExisting(false);
    }
  };

  const handleDeleteThread = async (threadId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/api/facebook/threads/${threadId}?project=${projectId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.threads)) {
        setThreads(data.threads);
        if (selectedThreadId === threadId) {
          setSelectedThreadId(data.threads[0]?.id || '');
        }
        if (data.leads && onLeadsUpdated) onLeadsUpdated(data.leads);
      }
    } catch {
      // ignore
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, customText?: string, forceRole?: 'customer' | 'owner') => {
    if (e) e.preventDefault();
    const textToSend = (customText ?? messageInput).trim();
    if (!textToSend || !activeThread || isSending) return;

    const role = forceRole || (composerMode === 'SIMULATE_CUSTOMER' ? 'customer' : 'owner');
    setIsSending(true);
    if (!customText) setMessageInput('');

    try {
      const res = await fetch(`/api/facebook/threads/${activeThread.id}/message?project=${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          text: textToSend,
        }),
      });
      const data = await res.json();
      if (data.success && data.thread) {
        setThreads((prev) => prev.map((t) => (t.id === data.thread.id ? data.thread : t)));
        if (data.leads && onLeadsUpdated) onLeadsUpdated(data.leads);
        if (data.quotes && onQuotesUpdated) onQuotesUpdated(data.quotes);
        if (data.clients && onClientsUpdated) onClientsUpdated(data.clients);
        if (data.statusNotice) {
          setStatusBanner({ tone: 'success', text: data.statusNotice });
        }
      }
    } catch (err: any) {
      setStatusBanner({ tone: 'warning', text: `Message error: ${err?.message || 'Failed'}` });
    } finally {
      setIsSending(false);
    }
  };

  const handleDraftAiReplyForOwner = async () => {
    if (!activeThread || isSending) return;
    setIsSending(true);
    try {
      const res = await fetch(`/api/facebook/threads/${activeThread.id}/draft-ai?project=${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.draftReply) {
        setComposerMode('OWNER_REPLY');
        setMessageInput(data.draftReply);
        setStatusBanner({
          tone: 'info',
          text: '✨ AI drafted a reply in your message box below — tweak any words you like and hit Send!',
        });
      }
    } catch {
      // ignore
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleThreadAi = async (thread: FbMessengerThread) => {
    try {
      const res = await fetch(`/api/facebook/threads/${thread.id}/toggle-ai?project=${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiPaused: !thread.aiPaused }),
      });
      const data = await res.json();
      if (data.success && data.thread) {
        setThreads((prev) => prev.map((t) => (t.id === data.thread.id ? data.thread : t)));
      }
    } catch {
      // ignore
    }
  };

  const handleNewSimulationThread = async (
    pageSlotId: 'page_1' | 'page_2' | 'page_3',
    presetQuestion: string,
    customerName: string,
    adSourceLabel?: string
  ) => {
    setIsSending(true);
    try {
      const res = await fetch(`/api/facebook/threads/new-simulation?project=${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageSlotId,
          customerName,
          initialMessage: presetQuestion,
          adSourceLabel,
        }),
      });
      const data = await res.json();
      if (data.success && data.thread) {
        setThreads((prev) => [data.thread, ...prev]);
        setSelectedThreadId(data.thread.id);
        if (data.leads && onLeadsUpdated) onLeadsUpdated(data.leads);
        setStatusBanner({
          tone: 'info',
          text: `Added Messenger conversation on ${data.thread.pageName} with ${customerName} & generated AI reply!`,
        });
      }
    } catch {
      // ignore
    } finally {
      setIsSending(false);
    }
  };

  const handleManualSyncThreadToSheetAndJobber = async () => {
    if (!activeThread || isSyncingThread) return;
    setIsSyncingThread(true);
    try {
      const res = await fetch(`/api/facebook/threads/${activeThread.id}/sync-quote?project=${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extracted: activeThread.extracted,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.thread) {
          setThreads((prev) => prev.map((t) => (t.id === data.thread.id ? data.thread : t)));
        }
        if (data.leads && onLeadsUpdated) onLeadsUpdated(data.leads);
        if (data.quotes && onQuotesUpdated) onQuotesUpdated(data.quotes);
        if (data.clients && onClientsUpdated) onClientsUpdated(data.clients);
        setStatusBanner({
          tone: 'success',
          text:
            data.message ||
            `✓ Synced ${activeThread.extracted.customerName} to Google Sheet ("FB Leads") & created Jobber Quote ${data.quote?.quoteNumber || ''}!`,
        });
      }
    } catch (err: any) {
      setStatusBanner({
        tone: 'warning',
        text: `Sync error: ${err?.message || 'Could not sync thread'}`,
      });
    } finally {
      setIsSyncingThread(false);
    }
  };

  const handleUpdateExtractedField = (field: keyof FbExtractedLeadData, value: any) => {
    if (!activeThread) return;
    setThreads((prev) =>
      prev.map((t) =>
        t.id === activeThread.id
          ? {
              ...t,
              extracted: {
                ...t.extracted,
                [field]: value,
              },
            }
          : t
      )
    );
  };

  const countCollectedCoreFields = (ext: FbExtractedLeadData) => {
    let count = 0;
    if (ext.serviceType) count++;
    if (ext.bedrooms && ext.bathrooms) count++;
    if (ext.preferredDate) count++;
    if (ext.phone || ext.address) count++;
    return count;
  };

  const getPageBadgeColor = (slotId: string) => {
    if (slotId === 'page_1') return 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
    if (slotId === 'page_2') return 'bg-purple-500/20 text-purple-300 border border-purple-500/30';
    return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#070B12] text-slate-100 flex flex-col">
      {/* Top Header Bar */}
      <div className="px-4 sm:px-6 py-3.5 bg-[#0D131F] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          {onBackToManagement && (
            <button
              type="button"
              onClick={onBackToManagement}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Owner Hub</span>
            </button>
          )}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg border border-blue-400/30">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black text-white tracking-tight">
                Facebook Messenger AI Agent (3-Page Ad &amp; DM Monitor)
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-300">
                All 3 Facebook Pages Live • App ID: 997522660032668
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Monitors all 3 Facebook pages in real time, collects{' '}
              <strong className="text-slate-200">Service, Bedrooms/Bathrooms, Preferred Date, Address &amp; Phone</strong>, and syncs to{' '}
              <strong className="text-emerald-300">FB Leads Sheet + Jobber Quotes</strong>.
            </p>
          </div>
        </div>

        {/* Right Quick Action Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handlePullExistingInbox}
            disabled={isPullingExisting}
            className="px-3 py-1.5 rounded-xl bg-indigo-600/25 hover:bg-indigo-600/40 border border-indigo-400/40 text-indigo-200 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPullingExisting ? 'animate-spin' : ''}`} />
            <span>{isPullingExisting ? 'Checking 3 Pages...' : 'Pull Existing FB Inbox'}</span>
          </button>

          <button
            type="button"
            onClick={() => setRightPanelTab('TWEAK_AI')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border transition-all cursor-pointer ${
              rightPanelTab === 'TWEAK_AI'
                ? 'bg-pink-600 text-white border-pink-400 shadow-lg'
                : 'bg-slate-900 hover:bg-slate-800 text-pink-300 border-pink-500/40'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Tweak AI Script &amp; Pricing</span>
          </button>

          <button
            type="button"
            onClick={() => setRightPanelTab('WEBHOOK_SETUP')}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border transition-all cursor-pointer ${
              rightPanelTab === 'WEBHOOK_SETUP'
                ? 'bg-blue-600 text-white border-blue-400 shadow-lg'
                : 'bg-slate-900 hover:bg-slate-800 text-blue-300 border-blue-500/40'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>3 FB Pages &amp; Webhook Setup</span>
          </button>

          {onNavigateToMasterHub && (
            <button
              type="button"
              onClick={onNavigateToMasterHub}
              className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>View FB Leads in Master Hub</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Notice Banner */}
      {statusBanner && (
        <div
          className={`px-4 py-2 text-xs font-bold flex items-center justify-between gap-2 border-b ${
            statusBanner.tone === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
              : statusBanner.tone === 'warning'
              ? 'bg-amber-950/80 border-amber-500/40 text-amber-200'
              : 'bg-blue-950/80 border-blue-500/40 text-blue-200'
          }`}
        >
          <span>{statusBanner.text}</span>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-[11px] underline opacity-80 hover:opacity-100 cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 3 Facebook Pages Status Strip */}
      <div className="px-4 sm:px-6 py-2.5 bg-[#0A0F1A] border-b border-white/10 grid grid-cols-1 md:grid-cols-3 gap-2.5 shrink-0">
        {pages.map((pg, idx) => (
          <div
            key={pg.id}
            className="p-2.5 rounded-xl bg-slate-900/90 border border-white/10 flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase shrink-0 ${getPageBadgeColor(
                  pg.id
                )}`}
              >
                Page #{idx + 1}
              </span>
              <div className="min-w-0">
                <div className="text-xs font-extrabold text-white truncate" title={pg.pageName}>
                  {pg.pageName}
                </div>
                <div className="text-[10px] text-emerald-300 font-mono truncate">
                  {pg.pageAccessToken
                    ? `🟢 Live Token Connected (ID: ${pg.pageId})`
                    : '🔵 Webhook Ready'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const nextPages = pages.map((p) =>
                  p.id === pg.id ? { ...p, autoReplyEnabled: !p.autoReplyEnabled } : p
                );
                setPages(nextPages);
                handleSaveConfig(nextPages, botSettings);
              }}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold flex items-center gap-1 cursor-pointer border shrink-0 ${
                pg.autoReplyEnabled
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-800 border-white/10 text-slate-400'
              }`}
            >
              {pg.autoReplyEnabled ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>AI ON</span>
                </>
              ) : (
                <>
                  <PauseCircle className="w-3 h-3 text-amber-400" />
                  <span>Paused</span>
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Main 3-Column Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
        {/* LEFT COLUMN (3 cols): 3-Page Messenger Conversation Board */}
        <div className="lg:col-span-3 border-r border-white/10 bg-[#0B101B] flex flex-col min-h-0">
          <div className="p-3 border-b border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                Messenger Board ({filteredThreads.length})
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowImportExistingModal((v) => !v)}
                  className="px-2 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                  title="Paste an older message that was already sitting in your Facebook Inbox before the webhook was connected"
                >
                  <Plus className="w-3 h-3" />
                  <span>Paste Existing Msg</span>
                </button>
                <button
                  type="button"
                  onClick={loadMessengerState}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                  title="Refresh threads"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 3-Page Filter Pills: All | Page 1 | Page 2 | Page 3 */}
            <div className="grid grid-cols-4 gap-1 bg-slate-900 p-1 rounded-xl border border-white/10 text-[10px] font-extrabold">
              <button
                type="button"
                onClick={() => setPageFilter('ALL')}
                className={`py-1.5 rounded-lg cursor-pointer ${
                  pageFilter === 'ALL' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({threads.length})
              </button>
              <button
                type="button"
                onClick={() => setPageFilter('page_1')}
                className={`py-1.5 rounded-lg truncate px-1 cursor-pointer ${
                  pageFilter === 'page_1' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="TidyUps Cleaning Service Inc (Page 1)"
              >
                Page 1 ({threads.filter((t) => t.pageSlotId === 'page_1').length})
              </button>
              <button
                type="button"
                onClick={() => setPageFilter('page_2')}
                className={`py-1.5 rounded-lg truncate px-1 cursor-pointer ${
                  pageFilter === 'page_2' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="1-833-TIDYUPS (Page 2)"
              >
                Page 2 ({threads.filter((t) => t.pageSlotId === 'page_2').length})
              </button>
              <button
                type="button"
                onClick={() => setPageFilter('page_3')}
                className={`py-1.5 rounded-lg truncate px-1 cursor-pointer ${
                  pageFilter === 'page_3' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="TidyUps Cleaning (Page 3)"
              >
                Page 3 ({threads.filter((t) => t.pageSlotId === 'page_3').length})
              </button>
            </div>

            {/* Optional Paste/Import Existing Facebook Inbox Message Drawer */}
            {showImportExistingModal && (
              <div className="p-2.5 rounded-xl bg-slate-900 border border-emerald-500/40 space-y-2 text-xs">
                <div className="font-black text-emerald-300 text-[11px] flex items-center justify-between">
                  <span>Import Existing FB Inbox Message</span>
                  <button
                    type="button"
                    onClick={() => setShowImportExistingModal(false)}
                    className="text-[10px] text-slate-400 hover:text-white cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <select
                  value={importPageSlot}
                  onChange={(e) => setImportPageSlot(e.target.value as 'page_1' | 'page_2' | 'page_3')}
                  className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-[11px] text-white font-bold"
                >
                  <option value="page_1">Page 1: TidyUps Cleaning Service Inc</option>
                  <option value="page_2">Page 2: 1-833-TIDYUPS</option>
                  <option value="page_3">Page 3: TidyUps Cleaning</option>
                </select>
                <input
                  type="text"
                  value={importCustomerName}
                  onChange={(e) => setImportCustomerName(e.target.value)}
                  placeholder="Customer Name from FB Inbox..."
                  className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-[11px] text-white"
                />
                <textarea
                  rows={2}
                  value={importCustomerMsg}
                  onChange={(e) => setImportCustomerMsg(e.target.value)}
                  placeholder="Paste their existing message from Facebook Messenger..."
                  className="w-full px-2 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-[11px] text-white"
                />
                <button
                  type="button"
                  disabled={!importCustomerMsg.trim() || isSending}
                  onClick={async () => {
                    await handleNewSimulationThread(
                      importPageSlot,
                      importCustomerMsg.trim(),
                      importCustomerName.trim() || 'Facebook Customer',
                      'Imported Existing FB Inbox Message'
                    );
                    setImportCustomerName('');
                    setImportCustomerMsg('');
                    setShowImportExistingModal(false);
                  }}
                  className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] cursor-pointer disabled:opacity-50"
                >
                  Import &amp; Generate AI Reply
                </button>
              </div>
            )}
          </div>

          {/* Thread List */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {filteredThreads.length === 0 ? (
              <div className="p-5 text-center space-y-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center mx-auto text-blue-400">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="text-xs font-extrabold text-white">
                  No Fake People — Listening Live on All 3 Pages
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  All fake demo conversations have been removed. Your AI bot is actively monitoring{' '}
                  <strong className="text-blue-300">Page 1 (TidyUps Cleaning Service Inc)</strong>,{' '}
                  <strong className="text-purple-300">Page 2 (1-833-TIDYUPS)</strong>, and{' '}
                  <strong className="text-emerald-300">Page 3 (TidyUps Cleaning)</strong>.
                </p>
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-white/10 text-left text-[11px] text-slate-300 space-y-1.5">
                  <div className="font-black text-amber-300">💡 What about messages already in your FB Inbox?</div>
                  <p className="text-slate-400 leading-relaxed">
                    Meta webhooks automatically push every <strong>new message</strong> sent from now on. For older messages that arrived before the bot was connected:
                  </p>
                  <div className="flex flex-col gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={handlePullExistingInbox}
                      disabled={isPullingExisting}
                      className="w-full py-1.5 px-2.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/40 border border-indigo-400/40 text-indigo-200 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${isPullingExisting ? 'animate-spin' : ''}`} />
                      <span>1. Try Pulling Existing FB Inbox</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowImportExistingModal(true)}
                      className="w-full py-1.5 px-2.5 rounded-lg bg-emerald-600/25 hover:bg-emerald-600/35 border border-emerald-500/40 text-emerald-200 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>2. Paste an Existing FB Message</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isSelected = activeThread?.id === thread.id;
                const coreCount = countCollectedCoreFields(thread.extracted);
                const lastMsg = thread.messages[thread.messages.length - 1];
                return (
                  <div
                    key={thread.id}
                    onClick={() => setSelectedThreadId(thread.id)}
                    className={`w-full text-left p-3.5 transition-colors cursor-pointer ${
                      isSelected ? 'bg-blue-950/50 border-l-4 border-l-pink-500' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase truncate ${getPageBadgeColor(
                          thread.pageSlotId
                        )}`}
                      >
                        {thread.pageName}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-mono text-slate-400">
                          {coreCount}/4 Info
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteThread(thread.id, e)}
                          className="text-[10px] text-slate-500 hover:text-rose-400 px-1 cursor-pointer"
                          title="Remove thread"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-extrabold text-white truncate">
                        {thread.extracted.customerName || thread.customerName}
                      </span>
                      {thread.syncedQuoteNumber ? (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold">
                          {thread.syncedQuoteNumber}
                        </span>
                      ) : thread.aiPaused ? (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                          Human Mode
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                          AI Active
                        </span>
                      )}
                    </div>

                    {lastMsg && (
                      <p className="text-xs text-slate-400 truncate mt-1">
                        <strong className="text-slate-300">
                          {lastMsg.sender === 'customer' ? 'Customer:' : lastMsg.sender === 'owner' ? 'You:' : 'AI:'}
                        </strong>{' '}
                        {lastMsg.text}
                      </p>
                    )}

                    <div className="mt-2 flex items-center gap-1.5 flex-wrap text-[10px]">
                      {thread.extracted.serviceType && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {thread.extracted.serviceType.split(' ')[0]}
                        </span>
                      )}
                      {thread.extracted.bedrooms && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {thread.extracted.bedrooms} / {thread.extracted.bathrooms || '? Bath'}
                        </span>
                      )}
                      {thread.extracted.preferredDate && (
                        <span className="px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 font-semibold">
                          📅 {thread.extracted.preferredDate}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* CENTER COLUMN (5 cols): Live Messenger Chat + Co-Pilot / Tweak & Intervene */}
        <div className="lg:col-span-5 border-r border-white/10 bg-[#070B12] flex flex-col min-h-0">
          {activeThread ? (
            <>
              {/* Thread Header */}
              <div className="p-3.5 bg-[#0D131F] border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white">
                      {activeThread.extracted.customerName || activeThread.customerName}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getPageBadgeColor(activeThread.pageSlotId)}`}>
                      {activeThread.pageName} • {activeThread.adSourceLabel}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {activeThread.aiPaused
                      ? '👤 You are in control (AI Auto-Reply is paused for this customer)'
                      : '🤖 AI Bot is actively replying & collecting Service, Beds/Baths, Date & Address'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleThreadAi(activeThread)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border cursor-pointer transition-all ${
                      activeThread.aiPaused
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                        : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                    }`}
                  >
                    {activeThread.aiPaused ? (
                      <>
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>Resume AI Bot</span>
                      </>
                    ) : (
                      <>
                        <PauseCircle className="w-3.5 h-3.5" />
                        <span>Take Over Chat</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Chat Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {activeThread.messages.map((msg) => {
                  const isCustomer = msg.sender === 'customer';
                  const isOwner = msg.sender === 'owner';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isCustomer ? 'items-start' : 'items-end'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        {isCustomer ? (
                          <User className="w-3 h-3 text-slate-400" />
                        ) : isOwner ? (
                          <Edit3 className="w-3 h-3 text-amber-400" />
                        ) : (
                          <Bot className="w-3 h-3 text-blue-400" />
                        )}
                        <span className="text-[10px] font-bold text-slate-400">
                          {isCustomer
                            ? `${activeThread.extracted.customerName || activeThread.customerName} (Facebook Messenger)`
                            : isOwner
                            ? 'You (Manual Dispatcher Reply)'
                            : `${botSettings.botName} (AI Auto-Reply)`}
                        </span>
                      </div>

                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed shadow-md ${
                          isCustomer
                            ? 'bg-slate-800 text-slate-100 border border-white/10 rounded-tl-xs'
                            : isOwner
                            ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-tr-xs'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-xs'
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{msg.text}</div>
                      </div>
                    </div>
                  );
                })}

                {isSending && (
                  <div className="flex items-center gap-2 text-xs text-blue-300 font-bold animate-pulse px-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI is analyzing message, updating lead fields &amp; crafting reply...</span>
                  </div>
                )}
              </div>

              {/* Dual-Mode Composer (Simulate Customer vs. Jump In as Owner) */}
              <form onSubmit={(e) => handleSendMessage(e)} className="p-3 bg-[#0D131F] border-t border-white/10 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-white/10 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setComposerMode('SIMULATE_CUSTOMER')}
                      className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                        composerMode === 'SIMULATE_CUSTOMER'
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      💬 Add Customer Msg (Triggers AI)
                    </button>
                    <button
                      type="button"
                      onClick={() => setComposerMode('OWNER_REPLY')}
                      className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                        composerMode === 'OWNER_REPLY'
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      ✍️ Jump In &amp; Reply as Owner
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleDraftAiReplyForOwner}
                    disabled={isSending}
                    className="px-2.5 py-1 rounded-lg bg-pink-600/20 hover:bg-pink-600/30 border border-pink-500/40 text-pink-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    title="Let AI draft a response into your box so you can edit it before sending"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Draft AI Reply to Edit</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder={
                      composerMode === 'SIMULATE_CUSTOMER'
                        ? 'Paste or type customer message...'
                        : 'Type your manual reply to send directly to the customer on Facebook Messenger...'
                    }
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                  />
                  <button
                    type="submit"
                    disabled={isSending || !messageInput.trim()}
                    className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg cursor-pointer disabled:opacity-50 ${
                      composerMode === 'SIMULATE_CUSTOMER'
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                        : 'bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{composerMode === 'SIMULATE_CUSTOMER' ? 'Send Customer Msg' : 'Send as Owner'}</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Bot className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-white">
                  All 3 Facebook Pages Are Connected &amp; Listening Live
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Fake demo conversations have been cleared. Whenever a real customer messages{' '}
                  <strong className="text-blue-300">Page 1 (TidyUps Cleaning Service Inc)</strong>,{' '}
                  <strong className="text-purple-300">Page 2 (1-833-TIDYUPS)</strong>, or{' '}
                  <strong className="text-emerald-300">Page 3 (TidyUps Cleaning)</strong>, their conversation will pop up here automatically!
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handlePullExistingInbox}
                  disabled={isPullingExisting}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isPullingExisting ? 'animate-spin' : ''}`} />
                  <span>Pull Existing FB Inbox (3 Pages)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowImportExistingModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-emerald-300 text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Paste an Existing FB Message</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN (4 cols): Extracted Intake Checklist + Tweak AI Prompt + Meta Webhook Setup */}
        <div className="lg:col-span-4 bg-[#0B101B] flex flex-col min-h-0 overflow-y-auto">
          {/* Sub-Navigation Tabs */}
          <div className="p-3 border-b border-white/10 bg-[#0D131F] grid grid-cols-3 gap-1 text-xs font-extrabold shrink-0">
            <button
              type="button"
              onClick={() => setRightPanelTab('CHECKLIST')}
              className={`py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer ${
                rightPanelTab === 'CHECKLIST'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Lead Info &amp; Sync</span>
            </button>
            <button
              type="button"
              onClick={() => setRightPanelTab('TWEAK_AI')}
              className={`py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer ${
                rightPanelTab === 'TWEAK_AI'
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Tweak AI Bot</span>
            </button>
            <button
              type="button"
              onClick={() => setRightPanelTab('WEBHOOK_SETUP')}
              className={`py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer ${
                rightPanelTab === 'WEBHOOK_SETUP'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>3-Page Setup</span>
            </button>
          </div>

          {/* TAB 1: LIVE EXTRACTED LEAD CHECKLIST & 1-CLICK GOOGLE SHEET / JOBBER SYNC */}
          {rightPanelTab === 'CHECKLIST' && activeThread && (
            <div className="p-4 space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-emerald-300">
                      AI Extracted Intake Checklist
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Auto-fills as the customer chats on Facebook Messenger (editable anytime)
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black">
                    {countCollectedCoreFields(activeThread.extracted)} / 4 Core Fields
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-1">
                      <Sparkles className="w-3 h-3 text-pink-400" />
                      <span>1. Service Needed</span>
                    </label>
                    <input
                      type="text"
                      value={activeThread.extracted.serviceType}
                      onChange={(e) => handleUpdateExtractedField('serviceType', e.target.value)}
                      placeholder="Waiting for customer..."
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-white font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-1">
                      <Calendar className="w-3 h-3 text-pink-400" />
                      <span>2. Preferred Date</span>
                    </label>
                    <input
                      type="text"
                      value={activeThread.extracted.preferredDate}
                      onChange={(e) => handleUpdateExtractedField('preferredDate', e.target.value)}
                      placeholder="YYYY-MM-DD"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-white font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-1">
                      <Home className="w-3 h-3 text-blue-400" />
                      <span>3A. Bedrooms</span>
                    </label>
                    <input
                      type="text"
                      value={activeThread.extracted.bedrooms}
                      onChange={(e) => handleUpdateExtractedField('bedrooms', e.target.value)}
                      placeholder="e.g. 3 Bedrooms"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-white font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-1">
                      <Home className="w-3 h-3 text-blue-400" />
                      <span>3B. Bathrooms</span>
                    </label>
                    <input
                      type="text"
                      value={activeThread.extracted.bathrooms}
                      onChange={(e) => handleUpdateExtractedField('bathrooms', e.target.value)}
                      placeholder="e.g. 2.5 Bathrooms"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-white font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-1">
                      <User className="w-3 h-3 text-emerald-400" />
                      <span>Customer Name</span>
                    </label>
                    <input
                      type="text"
                      value={activeThread.extracted.customerName}
                      onChange={(e) => handleUpdateExtractedField('customerName', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-white font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-1">
                      <Phone className="w-3 h-3 text-emerald-400" />
                      <span>4A. Phone Number</span>
                    </label>
                    <input
                      type="text"
                      value={activeThread.extracted.phone}
                      onChange={(e) => handleUpdateExtractedField('phone', e.target.value)}
                      placeholder="(780) XXX-XXXX"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-white font-semibold"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-1">
                      <MapPin className="w-3 h-3 text-emerald-400" />
                      <span>4B. Property Street Address</span>
                    </label>
                    <input
                      type="text"
                      value={activeThread.extracted.address}
                      onChange={(e) => handleUpdateExtractedField('address', e.target.value)}
                      placeholder="Street Address, Edmonton, AB"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-white font-semibold"
                    />
                  </div>
                </div>

                {/* Auto-Calculated Price Box */}
                <div className="p-3 rounded-xl bg-slate-950 border border-white/10 flex items-center justify-between">
                  <div className="text-xs">
                    <div className="font-bold text-slate-300 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                      <span>
                        Estimated Quote: {activeThread.extracted.estimatedHours || 3} hrs (
                        {activeThread.extracted.estimatedCleaners || 2} Cleaners @ $
                        {(activeThread.extracted.estimatedHourlyRate || 105).toFixed(2)}/hr)
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Includes $12.50 Fuel + 12.5% Tax • Deposit: ${activeThread.extracted.depositRequired || 60}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-black text-emerald-400">
                      ${(activeThread.extracted.estimatedTotal || 280).toFixed(2)} CAD
                    </div>
                  </div>
                </div>

                {/* 1-Click Push to Google Sheet (FB Leads) & Jobber Quote */}
                <button
                  type="button"
                  onClick={handleManualSyncThreadToSheetAndJobber}
                  disabled={isSyncingThread}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
                >
                  <Zap className="w-4 h-4" />
                  <span>
                    {isSyncingThread
                      ? 'Syncing to Google Sheet (FB Leads) & Jobber...'
                      : activeThread.syncedQuoteNumber
                      ? `Update Google Sheet & Jobber Quote (${activeThread.syncedQuoteNumber})`
                      : 'Push to Google Sheet ("FB Leads") & Create Jobber Quote Now'}
                  </span>
                </button>

                {activeThread.syncedQuoteWebUri && (
                  <a
                    href={activeThread.syncedQuoteWebUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>Open Created Quote {activeThread.syncedQuoteNumber} in Jobber</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          )}

          {rightPanelTab === 'CHECKLIST' && !activeThread && (
            <div className="p-5 text-xs text-slate-400 space-y-3">
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30 space-y-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-emerald-300">
                  Live Lead Intake Checklist (4 Core Fields)
                </h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  As soon as a customer messages any of your 3 Facebook Pages (or when you import/paste an existing FB inbox message), the AI automatically extracts:
                </p>
                <ul className="space-y-1 text-[11px] text-slate-200 font-semibold list-disc list-inside">
                  <li>1. Service Needed (Standard, Deep Clean, Move-Out)</li>
                  <li>2. Bedrooms &amp; Bathrooms</li>
                  <li>3. Preferred Date &amp; Time Window</li>
                  <li>4. Property Street Address &amp; Phone Number</li>
                </ul>
                <p className="text-[11px] text-emerald-300 pt-1">
                  ✓ Automatically syncs to your Google Sheet (&ldquo;FB Leads&rdquo;) and creates a clean Jobber Quote with the conversation saved in <code className="font-mono">quoteNotes</code>!
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: TWEAK AI BOT INSTRUCTIONS, GREETING & PRICING RULES */}
          {rightPanelTab === 'TWEAK_AI' && (
            <div className="p-4 space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-pink-500/30 space-y-3">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-pink-300">
                    Tweak How Your AI Talks to Facebook Clients
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Edit these instructions anytime — the AI immediately uses your changes on the very next message.
                  </p>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    AI Bot Behavior, Tone &amp; Question Order:
                  </label>
                  <textarea
                    rows={5}
                    value={botSettings.systemPrompt}
                    onChange={(e) => setBotSettings({ ...botSettings, systemPrompt: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-white/15 text-xs text-white leading-relaxed"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    TidyUps Pricing &amp; Service Rules (Used by AI to Quote):
                  </label>
                  <textarea
                    rows={5}
                    value={botSettings.pricingRulesSummary}
                    onChange={(e) => setBotSettings({ ...botSettings, pricingRulesSummary: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-white/15 text-xs font-mono text-emerald-200 leading-relaxed"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    First-Message Ad Click Greeting:
                  </label>
                  <textarea
                    rows={3}
                    value={botSettings.greetingTemplate}
                    onChange={(e) => setBotSettings({ ...botSettings, greetingTemplate: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-white/15 text-xs text-white leading-relaxed"
                  />
                </div>

                <div className="space-y-2 pt-1">
                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-white/10 cursor-pointer">
                    <span className="text-xs font-bold text-slate-200">
                      Auto-Add Lead to Google Sheet (&ldquo;FB Leads&rdquo; Tab)
                    </span>
                    <input
                      type="checkbox"
                      checked={botSettings.autoSyncToGoogleSheet}
                      onChange={(e) =>
                        setBotSettings({ ...botSettings, autoSyncToGoogleSheet: e.target.checked })
                      }
                      className="accent-pink-500 w-4 h-4"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-white/10 cursor-pointer">
                    <span className="text-xs font-bold text-slate-200">
                      Auto-Create Jobber Quote when Service + Rooms + Date + Phone Collected
                    </span>
                    <input
                      type="checkbox"
                      checked={botSettings.autoCreateJobberQuote}
                      onChange={(e) =>
                        setBotSettings({ ...botSettings, autoCreateJobberQuote: e.target.checked })
                      }
                      className="accent-pink-500 w-4 h-4"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => handleSaveConfig(pages, botSettings)}
                  disabled={isSavingConfig}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-black text-xs shadow-lg cursor-pointer"
                >
                  {isSavingConfig ? 'Saving AI Instructions...' : 'Save AI Bot Instructions & Pricing Rules'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: 2 FACEBOOK PAGES & WEBHOOK CONNECTION SETUP */}
          {rightPanelTab === 'WEBHOOK_SETUP' && (
            <div className="p-4 space-y-4">
              {/* Connected Meta App Badge & Direct Deep Links */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/80 via-slate-900 to-blue-950/80 border border-emerald-500/40 space-y-2.5 text-xs">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-black uppercase">
                      ✅ Meta App Registered
                    </span>
                    <h3 className="text-sm font-black text-white mt-1">
                      TidyUps Messenger AI • App ID: <span className="font-mono text-emerald-300">997522660032668</span>
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <a
                      href="https://developers.facebook.com/apps/997522660032668/messenger/settings/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black flex items-center gap-1 shrink-0"
                    >
                      <span>Open App 997522660032668 Messenger Settings</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href="https://developers.facebook.com/apps/997522660032668/settings/basic/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/15 text-slate-200 text-[10px] font-bold flex items-center gap-1 shrink-0"
                    >
                      <span>Basic Settings (Privacy URL)</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
                <ol className="space-y-1.5 text-[11px] text-slate-200 list-decimal list-inside leading-relaxed pt-1 border-t border-white/10">
                  <li>
                    Click <strong>Open App 997522660032668 Messenger Settings</strong> above (or click <strong>Set up</strong> on <strong>Messenger</strong> inside your app dashboard).
                  </li>
                  <li>
                    Under <strong>Access Tokens</strong>, click <strong>Add or Remove Pages</strong>, check <strong>both of your Facebook Pages</strong>, click <strong>Generate Token</strong> for each page, and paste each token into the Page #1 and Page #2 boxes below (our server will automatically detect your Page IDs &amp; names when you click Save!).
                  </li>
                  <li>
                    Under <strong>Webhooks</strong>, click <strong>Add Callback URL</strong>, paste the <strong>Callback URL</strong> and <strong>Verify Token</strong> below, and click <strong>Verify and Save</strong>.
                  </li>
                  <li>
                    Click <strong>Add Subscriptions</strong> next to both Pages, check <code className="text-emerald-300 font-mono">messages</code> and <code className="text-emerald-300 font-mono">messaging_postbacks</code>, and flip the top switch to <strong>Live</strong>!
                  </li>
                </ol>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-blue-500/30 space-y-3 text-xs">
                <h3 className="text-xs font-black uppercase tracking-wider text-blue-300">
                  1. Direct Meta Messenger Webhook (For Both Facebook Pages)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Paste this Callback URL and Verify Token in your Meta Developer App (Messenger &rarr; Webhooks):
                </p>

                <div className="space-y-2">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Meta Messenger Webhook Callback URL:
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        readOnly
                        value={webhookUrl}
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/15 font-mono text-[11px] text-emerald-300"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopyText('webhook', webhookUrl)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === 'webhook' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'webhook' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Webhook Verify Token:
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={botSettings.verifyToken}
                        onChange={(e) => setBotSettings({ ...botSettings, verifyToken: e.target.value })}
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/15 font-mono text-[11px] text-pink-300"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopyText('verify', botSettings.verifyToken)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === 'verify' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'verify' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                      External Agent / ManyChat / Zapier Lead Intake Webhook:
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        readOnly
                        value={externalIntakeUrl}
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/15 font-mono text-[11px] text-blue-300"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopyText('intake', externalIntakeUrl)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === 'intake' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'intake' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Meta App Basic Settings URLs (Privacy Policy & Data Deletion URLs) */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-purple-500/30 space-y-3 text-xs">
                <h3 className="text-xs font-black uppercase tracking-wider text-purple-300">
                  2. Meta App Basic Settings URLs (Privacy Policy &amp; Data Deletion)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Paste these into <strong>App Settings &rarr; Basic</strong> in Meta Developers so you can flip your app switch to <strong>Live</strong>:
                </p>

                <div className="space-y-2">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Privacy Policy URL:
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        readOnly
                        value="https://app.tidyupscleaning.com/privacy-policy"
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/15 font-mono text-[11px] text-emerald-300"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopyText('privacy_url', 'https://app.tidyupscleaning.com/privacy-policy')}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === 'privacy_url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'privacy_url' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Data Deletion Instructions URL:
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        readOnly
                        value="https://app.tidyupscleaning.com/data-deletion"
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/15 font-mono text-[11px] text-amber-300"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopyText('del_inst_url', 'https://app.tidyupscleaning.com/data-deletion')}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === 'del_inst_url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'del_inst_url' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Data Deletion Callback URL:
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        readOnly
                        value="https://app.tidyupscleaning.com/api/facebook/data-deletion"
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/15 font-mono text-[11px] text-pink-300"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopyText('del_cb_url', 'https://app.tidyupscleaning.com/api/facebook/data-deletion')}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === 'del_cb_url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedKey === 'del_cb_url' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Configure Connected Facebook Pages */}
              {pages.map((pg, idx) => (
                <div
                  key={pg.id}
                  className="p-3.5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 space-y-2.5 text-xs"
                >
                  <div className="font-black text-white flex items-center justify-between flex-wrap gap-1.5">
                    <span>Facebook Page #{idx + 1} Settings</span>
                    <div className="flex items-center gap-1.5">
                      {(pg.secretConnected || pg.pageAccessToken) && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black">
                          ✅ Secret Token Active ({pg.secretEnvName || 'Connected'})
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-slate-400">ID: {pg.pageId || pg.id}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Facebook Page Name:
                    </label>
                    <input
                      type="text"
                      value={pg.pageName}
                      onChange={(e) => {
                        const next = pages.map((p) => (p.id === pg.id ? { ...p, pageName: e.target.value } : p));
                        setPages(next);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                        Facebook Page ID:
                      </label>
                      <input
                        type="text"
                        value={pg.pageId}
                        onChange={(e) => {
                          const next = pages.map((p) => (p.id === pg.id ? { ...p, pageId: e.target.value } : p));
                          setPages(next);
                        }}
                        placeholder="e.g. 10482910492"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                        Ad Tag / Label:
                      </label>
                      <input
                        type="text"
                        value={pg.adCampaignLabel}
                        onChange={(e) => {
                          const next = pages.map((p) =>
                            p.id === pg.id ? { ...p, adCampaignLabel: e.target.value } : p
                          );
                          setPages(next);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                      Meta Page Access Token (For Live Outbound Messenger Replies):
                    </label>
                    <input
                      type="password"
                      value={pg.pageAccessToken}
                      onChange={(e) => {
                        const next = pages.map((p) =>
                          p.id === pg.id ? { ...p, pageAccessToken: e.target.value } : p
                        );
                        setPages(next);
                      }}
                      placeholder="EAA..."
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-white font-mono"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => handleSaveConfig(pages, botSettings)}
                disabled={isSavingConfig}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg cursor-pointer"
              >
                {isSavingConfig ? 'Saving Page Settings...' : 'Save All 3 Facebook Pages Configuration'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
