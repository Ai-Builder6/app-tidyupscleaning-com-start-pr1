import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Mic,
  MicOff,
  X,
} from 'lucide-react';
import { AddressAutocompleteInput } from './AddressAutocompleteInput';

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
  notifyOwnerOnNewLead?: boolean;
  ownerNotificationPhone?: string;
  notifyViaSms?: boolean;
  notifyViaInAppChat?: boolean;
}

export interface OwnerLeadNotificationItem {
  id: string;
  timestamp: string;
  sourceLabel: string;
  customerName: string;
  phone: string;
  serviceType: string;
  quoteNumber: string;
  ownerPhone: string;
  sentSms: boolean;
  sentChat: boolean;
  smsStatusNote: string;
  messagePreview: string;
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
      "Hi {{name}}! 👋 Thanks for messaging {{page}}! We'd love to put together a custom cleaning quote for your home. To get started, what type of cleaning are you looking for (Standard, Deep Clean, or Move-Out), and how many bedrooms & bathrooms does the property have?",
    systemPrompt:
      'You are a warm, friendly, concise intake assistant for TidyUps Cleaning Service Inc in Edmonton & surrounding areas (St. Albert, Sherwood Park, Leduc, Spruce Grove). STRICT RULE: NEVER discuss, estimate, or quote prices, hourly rates, or dollar amounts with clients. If a client asks how much it costs or asks for a price, warmly explain that every home is custom-quoted based on its layout and condition, and that you will gather their details right now so our owner can review the draft and send them an official personalized quote right away. Focus on gathering as much helpful information as possible: (1) Service Type (Standard, Deep Clean, or Move-Out/Move-In) & any special add-ons/requests (inside oven, inside fridge, baseboards, interior windows, basement, pets), (2) How many Bedrooms, Bathrooms & approximate sq ft/levels, (3) Preferred Date & Time Window (Morning or Afternoon), and (4) Property Street Address, Phone Number & Email so we can send their official quote. Keep messages short (2-3 sentences max) like a real human dispatcher.',
    pricingRulesSummary:
      "• STRICT NO-PRICE POLICY IN CHAT: Do NOT share dollar amounts, hourly rates, or price estimates with the customer in Messenger.\n• What IS Included to Mention: We bring all professional eco-friendly supplies, vacuums, and equipment. 100% satisfaction guarantee on Move-Out, Deep, and Standard cleans.\n• Information to Gather for Owner's Draft Quote:\n  1. Cleaning Type (Standard, Deep Clean, Move-Out/Move-In)\n  2. Bedrooms, Bathrooms, levels & approximate square footage\n  3. Any special areas (Inside Oven, Inside Fridge, Baseboards, Interior Windows, Cabinets, Pets)\n  4. Preferred Date & Morning/Afternoon window\n  5. Property Street Address + Client Phone Number & Email (so we can send their official quote).",
    autoSyncToGoogleSheet: true,
    autoCreateJobberQuote: true,
    notifyOwnerOnNewLead: true,
    ownerNotificationPhone: '+1 (587) 416-9181',
    notifyViaSms: true,
    notifyViaInAppChat: true,
  });
  const [notifications, setNotifications] = useState<OwnerLeadNotificationItem[]>([]);
  const [isTestingAlert, setIsTestingAlert] = useState<boolean>(false);
  const [threads, setThreads] = useState<FbMessengerThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string>('');
  const [pageFilter, setPageFilter] = useState<'ALL' | 'page_1' | 'page_2' | 'page_3'>('ALL');
  const [popupModal, setPopupModal] = useState<'NONE' | 'TWEAK_AI' | 'WEBHOOK_SETUP'>('NONE');
  const [composerMode, setComposerMode] = useState<'SIMULATE_CUSTOMER' | 'OWNER_REPLY'>('OWNER_REPLY');
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

  // Microphone Voice Dictation State (for both Lead Info & Sync and Messenger Chat Box)
  const [voiceMode, setVoiceMode] = useState<'NONE' | 'LEAD_INFO' | 'CHAT_MESSAGE'>('NONE');
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [isParsingVoice, setIsParsingVoice] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const voiceAccRef = useRef<string>('');

  const webhookUrl = 'https://app.tidyupscleaning.com/api/facebook/webhook';
  const externalIntakeUrl = 'https://app.tidyupscleaning.com/api/facebook/lead-intake';

  const loadMessengerState = useCallback(async () => {
    try {
      const res = await fetch(`/api/facebook/state?project=${projectId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.pages) setPages(data.pages);
      if (data.botSettings) setBotSettings(data.botSettings);
      if (Array.isArray(data.notifications)) setNotifications(data.notifications);
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

  const applySpokenLeadInfoToThread = useCallback(
    async (spokenText: string) => {
      const clean = spokenText.trim();
      if (!clean || !activeThread) return;
      setIsParsingVoice(true);
      try {
        const res = await fetch(
          `/api/facebook/threads/${activeThread.id}/voice-intake?project=${projectId}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript: clean }),
          }
        );
        const data = await res.json();
        if (data.success && data.thread) {
          setThreads((prev) => prev.map((t) => (t.id === data.thread.id ? data.thread : t)));
          setStatusBanner({
            tone: 'success',
            text: `🎙️ Filled Lead Info from your voice: "${clean}"`,
          });
        }
      } catch (err: any) {
        setStatusBanner({
          tone: 'warning',
          text: `Voice parse note: ${err?.message || 'Could not parse voice'}`,
        });
      } finally {
        setIsParsingVoice(false);
      }
    },
    [activeThread, projectId]
  );

  const stopVoiceMic = useCallback(
    async (shouldApplyLeadInfo = true) => {
      const currentMode = voiceMode;
      const finalSpoken = voiceAccRef.current.trim();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.stop();
        } catch {}
        recognitionRef.current = null;
      }
      setVoiceMode('NONE');
      if (currentMode === 'LEAD_INFO' && shouldApplyLeadInfo && finalSpoken) {
        await applySpokenLeadInfoToThread(finalSpoken);
      }
    },
    [voiceMode, applySpokenLeadInfoToThread]
  );

  const startOrToggleVoiceMic = (targetMode: 'LEAD_INFO' | 'CHAT_MESSAGE') => {
    if (voiceMode === targetMode) {
      stopVoiceMic(true);
      return;
    }
    if (voiceMode !== 'NONE') {
      stopVoiceMic(false);
    }

    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setStatusBanner({
        tone: 'warning',
        text: 'Microphone speech recognition is supported in Chrome, Safari, and Edge.',
      });
      return;
    }

    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      voiceAccRef.current = targetMode === 'CHAT_MESSAGE' ? messageInput : '';
      setVoiceTranscript('');
      setVoiceMode(targetMode);

      if (targetMode === 'CHAT_MESSAGE') {
        setComposerMode('OWNER_REPLY');
      }

      recognition.onresult = (event: any) => {
        let finalChunk = '';
        let interimChunk = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const piece = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalChunk += piece + ' ';
          } else {
            interimChunk += piece;
          }
        }
        if (finalChunk) {
          voiceAccRef.current = `${voiceAccRef.current} ${finalChunk}`.trim();
        }
        const combined = `${voiceAccRef.current} ${interimChunk}`.trim();
        setVoiceTranscript(combined);
        if (targetMode === 'CHAT_MESSAGE') {
          setMessageInput(combined);
        }
      };

      recognition.onerror = () => {
        setVoiceMode('NONE');
      };

      recognition.onend = () => {
        const spoken = voiceAccRef.current.trim();
        setVoiceMode('NONE');
        if (targetMode === 'LEAD_INFO' && spoken) {
          applySpokenLeadInfoToThread(spoken);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setVoiceMode('NONE');
      setStatusBanner({
        tone: 'warning',
        text: `Could not start microphone: ${err?.message || 'Check mic permission'}`,
      });
    }
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
        if (Array.isArray(data.notifications)) setNotifications(data.notifications);
        setStatusBanner({
          tone: 'success',
          text: '✓ Saved AI Messenger Bot (No-Price Info-Gathering Mode), Draft Quote & SMS Alert Settings!',
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

  const handleSendTestNotification = async () => {
    if (isTestingAlert) return;
    setIsTestingAlert(true);
    try {
      const res = await fetch(`/api/facebook/test-notification?project=${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerNotificationPhone: botSettings.ownerNotificationPhone,
        }),
      });
      const data = await res.json();
      if (Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
      }
      setStatusBanner({
        tone: 'success',
        text: `🔔 Sent Test Lead Alert to ${botSettings.ownerNotificationPhone || 'your phone'} (${data.smsStatusNote || 'SMS + In-App Alert dispatched'})!`,
      });
    } catch (err: any) {
      setStatusBanner({
        tone: 'warning',
        text: `Test notification error: ${err?.message || 'Failed'}`,
      });
    } finally {
      setIsTestingAlert(false);
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
          text: `Checked all 3 Facebook Pages: ${summaryText || 'All new customer messages arrive automatically via live webhook.'}`,
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
    if (voiceMode === 'CHAT_MESSAGE') {
      stopVoiceMic(false);
    }
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

  const handleToggleThreadAi = async (
    thread: FbMessengerThread,
    explicitPaused?: boolean,
    triggerReplyNow = false
  ) => {
    const nextPaused = typeof explicitPaused === 'boolean' ? explicitPaused : !thread.aiPaused;
    setIsSending(true);
    try {
      const res = await fetch(`/api/facebook/threads/${thread.id}/toggle-ai?project=${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiPaused: nextPaused,
          triggerReplyNow,
        }),
      });
      const data = await res.json();
      if (data.success && data.thread) {
        setThreads((prev) => prev.map((t) => (t.id === data.thread.id ? data.thread : t)));
        if (data.leads && onLeadsUpdated) onLeadsUpdated(data.leads);
        if (data.quotes && onQuotesUpdated) onQuotesUpdated(data.quotes);
        if (data.clients && onClientsUpdated) onClientsUpdated(data.clients);
        if (data.statusNotice) {
          setStatusBanner({
            tone: nextPaused ? 'info' : 'success',
            text: data.statusNotice,
          });
        }
      }
    } catch {
      // ignore
    } finally {
      setIsSending(false);
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
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] font-extrabold text-amber-300">
                🚫 No Prices Shared in Chat • Draft Quote + SMS Alert Mode
              </span>
            </div>
            <p className="text-xs text-slate-400">
              AI gathers <strong className="text-slate-200">Service, Bedrooms/Baths, Special Requests, Date, Address &amp; Phone</strong> (without discussing prices), saves a <strong className="text-emerald-300">DRAFT Quote in Jobber + FB Leads Sheet</strong> for you to review &amp; send, and texts your phone!
            </p>
          </div>
        </div>

        {/* Right Quick Action Pills + Subtle Little Links for Tweak AI & Page Setup */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handlePullExistingInbox}
            disabled={isPullingExisting}
            className="px-2.5 py-1.5 rounded-xl bg-indigo-600/25 hover:bg-indigo-600/40 border border-indigo-400/40 text-indigo-200 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPullingExisting ? 'animate-spin' : ''}`} />
            <span>{isPullingExisting ? 'Checking 3 Pages...' : 'Sync FB Inbox'}</span>
          </button>

          {onNavigateToMasterHub && (
            <button
              type="button"
              onClick={onNavigateToMasterHub}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>FB Leads Sheet</span>
            </button>
          )}

          {/* Small, subtle popup links for Tweak AI Bot & Page Setup */}
          <button
            type="button"
            onClick={() => setPopupModal('TWEAK_AI')}
            className="px-2 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-white/10 text-[11px] font-semibold text-pink-300 hover:text-pink-200 flex items-center gap-1 cursor-pointer"
            title="Open AI Bot Instructions & SMS Alert Settings"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>Tweak AI &amp; SMS</span>
          </button>

          <button
            type="button"
            onClick={() => setPopupModal('WEBHOOK_SETUP')}
            className="px-2 py-1 rounded-lg bg-transparent hover:bg-white/5 text-[11px] font-medium text-slate-400 hover:text-blue-300 underline underline-offset-2 flex items-center gap-1 cursor-pointer"
            title="View 3-Page Webhook & Token Setup"
          >
            <Key className="w-3 h-3" />
            <span>Page Setup</span>
          </button>
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
      <div className="px-4 sm:px-6 py-2 bg-[#0A0F1A] border-b border-white/10 grid grid-cols-1 md:grid-cols-3 gap-2 shrink-0">
        {pages.map((pg, idx) => (
          <div
            key={pg.id}
            className="px-2.5 py-2 rounded-xl bg-slate-900/90 border border-white/10 flex items-center justify-between gap-2"
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
                    ? `🟢 Live (ID: ${pg.pageId})`
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
                          You In Control
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

        {/* CENTER COLUMN (5 cols): Live Messenger Chat + Take Over / Give Back to AI + Voice Mic */}
        <div className="lg:col-span-5 border-r border-white/10 bg-[#070B12] flex flex-col min-h-0">
          {activeThread ? (
            <>
              {/* Thread Header with Take Over Chat <-> Give Back to AI Bot */}
              <div className="p-3.5 bg-[#0D131F] border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-black text-white">
                      {activeThread.extracted.customerName || activeThread.customerName}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getPageBadgeColor(activeThread.pageSlotId)}`}>
                      {activeThread.pageName} • {activeThread.adSourceLabel}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {activeThread.aiPaused
                      ? '👤 You took over this chat (Click "Give Back to AI Bot" anytime so the AI resumes)'
                      : '🤖 AI Bot is in control — gathering info (No prices shared with client)'}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {activeThread.aiPaused ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleToggleThreadAi(activeThread, false, false)}
                        disabled={isSending}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md cursor-pointer"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>🤖 Give Back to AI Bot</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleThreadAi(activeThread, false, true)}
                        disabled={isSending}
                        className="px-2.5 py-1.5 rounded-xl bg-blue-600/25 hover:bg-blue-600/40 border border-blue-400/40 text-blue-200 text-[11px] font-extrabold flex items-center gap-1 cursor-pointer"
                        title="Hand the chat back to the AI and have the AI immediately send the next reply to the customer"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Give Back &amp; Reply Now</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setComposerMode('OWNER_REPLY');
                        handleToggleThreadAi(activeThread, true, false);
                      }}
                      disabled={isSending}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                    >
                      <PauseCircle className="w-3.5 h-3.5" />
                      <span>✋ Take Over Chat</span>
                    </button>
                  )}
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

              {/* Dual-Mode Composer + Live Microphone to Talk on Messenger + Give Back to AI */}
              <form onSubmit={(e) => handleSendMessage(e)} className="p-3 bg-[#0D131F] border-t border-white/10 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-white/10 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setComposerMode('OWNER_REPLY')}
                      className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                        composerMode === 'OWNER_REPLY'
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      ✍️ Reply to Client on Messenger
                    </button>
                    <button
                      type="button"
                      onClick={() => setComposerMode('SIMULATE_CUSTOMER')}
                      className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                        composerMode === 'SIMULATE_CUSTOMER'
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      💬 Test Customer Msg
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {activeThread.aiPaused && (
                      <button
                        type="button"
                        onClick={() => handleToggleThreadAi(activeThread, false, true)}
                        disabled={isSending}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600/25 hover:bg-emerald-600/40 border border-emerald-400/40 text-emerald-300 text-[11px] font-extrabold flex items-center gap-1 cursor-pointer"
                      >
                        <PlayCircle className="w-3 h-3" />
                        <span>Give Back to AI</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleDraftAiReplyForOwner}
                      disabled={isSending}
                      className="px-2.5 py-1 rounded-lg bg-pink-600/20 hover:bg-pink-600/30 border border-pink-500/40 text-pink-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      title="Let AI draft a response into your box so you can edit it before sending"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>AI Draft</span>
                    </button>
                  </div>
                </div>

                {voiceMode === 'CHAT_MESSAGE' && (
                  <div className="px-3 py-1.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-[11px] text-rose-200 flex items-center justify-between gap-2">
                    <span className="font-bold animate-pulse">
                      🎙️ Listening for Messenger reply... Speak now (click Mic again or Send when done)
                    </span>
                    <button
                      type="button"
                      onClick={() => stopVoiceMic(false)}
                      className="px-2 py-0.5 rounded bg-rose-600 text-white font-black text-[10px] cursor-pointer"
                    >
                      Stop Mic
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {/* Microphone Button to Talk Directly to Client on Messenger */}
                  <button
                    type="button"
                    onClick={() => startOrToggleVoiceMic('CHAT_MESSAGE')}
                    className={`px-3 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 border transition-all cursor-pointer shrink-0 ${
                      voiceMode === 'CHAT_MESSAGE'
                        ? 'bg-rose-600 text-white border-rose-400 animate-pulse shadow-lg'
                        : 'bg-slate-900 hover:bg-slate-800 text-emerald-300 border-emerald-500/40'
                    }`}
                    title="Click to use your microphone to talk/dictate your reply to the client on Facebook Messenger"
                  >
                    {voiceMode === 'CHAT_MESSAGE' ? (
                      <>
                        <MicOff className="w-4 h-4" />
                        <span className="hidden sm:inline">Stop Mic</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4" />
                        <span className="hidden sm:inline">Talk</span>
                      </>
                    )}
                  </button>

                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder={
                      composerMode === 'SIMULATE_CUSTOMER'
                        ? 'Paste or type customer message...'
                        : 'Type or tap 🎙️ Talk to speak your reply to the client on Facebook Messenger...'
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
                    <span>{composerMode === 'SIMULATE_CUSTOMER' ? 'Send Customer Msg' : 'Send to Messenger'}</span>
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
                  Select any conversation on the left to read the thread, talk to the client on Messenger, or voice-fill their quote info!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN (4 cols): Always-On Lead Info & Sync + Voice Mic Dictation */}
        <div className="lg:col-span-4 bg-[#0B101B] flex flex-col min-h-0 overflow-y-auto">
          {/* Compact Header Bar with Voice-Fill Mic Button & Little Popup Links */}
          <div className="p-3 border-b border-white/10 bg-[#0D131F] flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-black uppercase tracking-wider text-white">
                Lead Info &amp; Sync
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => setPopupModal('TWEAK_AI')}
                className="text-pink-300 hover:text-pink-200 underline underline-offset-2 font-semibold cursor-pointer"
              >
                Tweak AI
              </button>
              <span className="text-slate-600">•</span>
              <button
                type="button"
                onClick={() => setPopupModal('WEBHOOK_SETUP')}
                className="text-slate-400 hover:text-blue-300 underline underline-offset-2 font-medium cursor-pointer"
              >
                Page Setup
              </button>
            </div>
          </div>

          {activeThread ? (
            <div className="p-4 space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-emerald-300">
                      AI Extracted Intake Checklist
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Auto-fills from Messenger OR tap the Mic below to speak the info!
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black">
                    {countCollectedCoreFields(activeThread.extracted)} / 4 Core Fields
                  </span>
                </div>

                {/* Microphone Voice-Fill Bar for Lead Info & Sync */}
                <div className="p-2.5 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Use Microphone to Fill Out Lead Info</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => startOrToggleVoiceMic('LEAD_INFO')}
                      disabled={isParsingVoice}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all ${
                        voiceMode === 'LEAD_INFO'
                          ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse shadow-lg'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                      }`}
                    >
                      {voiceMode === 'LEAD_INFO' ? (
                        <>
                          <MicOff className="w-3.5 h-3.5" />
                          <span>Stop &amp; Fill Fields</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-3.5 h-3.5" />
                          <span>{isParsingVoice ? 'Filling Fields...' : '🎙️ Activate Mic'}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {(voiceMode === 'LEAD_INFO' || voiceTranscript) && (
                    <div className="p-2 rounded-lg bg-slate-900 border border-white/10 text-[11px] text-emerald-200 font-mono">
                      {voiceTranscript || 'Listening... Speak service, beds/baths, date, address, or phone number...'}
                    </div>
                  )}
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
                      <span>4B. Property Street Address (Auto-Complete)</span>
                    </label>
                    <AddressAutocompleteInput
                      theme="dark"
                      value={activeThread.extracted.address}
                      onChange={(val) => handleUpdateExtractedField('address', val)}
                      onSelect={(pred) =>
                        handleUpdateExtractedField('address', pred.description || pred.mainText)
                      }
                      placeholder="Start typing house # & street, Edmonton, AB..."
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-white font-semibold text-xs"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 mb-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>5. Special Requests / Add-Ons (Oven, Fridge, Baseboards, Pets)</span>
                    </label>
                    <input
                      type="text"
                      value={activeThread.extracted.specificNotes || ''}
                      onChange={(e) => handleUpdateExtractedField('specificNotes', e.target.value)}
                      placeholder="Any special areas, add-ons, or property notes gathered by AI..."
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-white font-semibold"
                    />
                  </div>
                </div>

                {/* Owner Internal Draft Quote Box (Not Shared With Customer in Messenger) */}
                <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/30 flex items-center justify-between gap-2">
                  <div className="text-xs">
                    <div className="font-bold text-amber-300 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        Owner Draft Quote Preview (Hidden From Client in Chat)
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {activeThread.extracted.estimatedHours || 3.5} hrs ({activeThread.extracted.estimatedCleaners || 2} Cleaners @ ${(activeThread.extracted.estimatedHourlyRate || 105).toFixed(2)}/hr) • Created as <strong className="text-emerald-300">DRAFT</strong> in Jobber so you can look it over &amp; send!
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] font-bold uppercase text-amber-300">Draft Est.</div>
                    <div className="text-base font-black text-emerald-400">
                      ${(activeThread.extracted.estimatedTotal || 280).toFixed(2)} CAD
                    </div>
                  </div>
                </div>

                {/* 1-Click Push to Google Sheet (FB Leads) & Jobber Draft Quote */}
                <button
                  type="button"
                  onClick={handleManualSyncThreadToSheetAndJobber}
                  disabled={isSyncingThread}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
                >
                  <Zap className="w-4 h-4" />
                  <span>
                    {isSyncingThread
                      ? 'Syncing Lead to Google Sheet & Creating Jobber Draft...'
                      : activeThread.syncedQuoteNumber
                      ? `Update Google Sheet & Jobber Draft Quote (${activeThread.syncedQuoteNumber})`
                      : 'Send to Google Sheet ("FB Leads") & Create Jobber DRAFT Quote'}
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
                    <span>Review Draft Quote {activeThread.syncedQuoteNumber} in Jobber &amp; Send to Client</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="p-5 text-xs text-slate-400 space-y-3">
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30 space-y-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-emerald-300">
                  Live Lead Intake Checklist (No Prices Discussed by AI)
                </h3>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Select a conversation on the left to view or voice-fill the customer&apos;s intake checklist and create their Jobber Draft Quote!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* POPUP MODAL FOR TWEAK AI BOT & 3-PAGE SETUP (Opened via the subtle links) */}
      {popupModal !== 'NONE' && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setPopupModal('NONE')}
        >
          <div
            className="w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl bg-[#0B101B] border border-white/15 shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                {popupModal === 'TWEAK_AI' ? (
                  <>
                    <SlidersHorizontal className="w-4 h-4 text-pink-400" />
                    <h2 className="text-sm font-black text-white uppercase tracking-wider">
                      Tweak AI Bot Instructions &amp; SMS Lead Alerts
                    </h2>
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4 text-blue-400" />
                    <h2 className="text-sm font-black text-white uppercase tracking-wider">
                      3 Facebook Pages &amp; Webhook Setup
                    </h2>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPopupModal('NONE')}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {popupModal === 'TWEAK_AI' && (
              <div className="space-y-4">
                {/* Instant Owner SMS & In-App Lead Alert Card */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-950/80 via-slate-900 to-indigo-950/80 border border-emerald-500/40 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black uppercase">
                        📲 Instant Lead &amp; Draft Quote Alerts
                      </span>
                      <h3 className="text-xs font-black uppercase tracking-wider text-white mt-1">
                        Notify Me When a New Lead Hits Jobber or Google Sheets
                      </h3>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Whenever the Facebook AI bot (or online booking form) submits a new lead to <strong>Google Sheets (&ldquo;FB Leads&rdquo;)</strong> or creates a <strong>Draft Quote in Jobber</strong>, we immediately text your cell phone via Quo/OpenPhone and ping your Owner App!
                  </p>

                  <div>
                    <label className="text-[11px] font-bold text-emerald-300 block mb-1">
                      Your Mobile Phone Number for SMS Lead Alerts:
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={botSettings.ownerNotificationPhone || ''}
                        onChange={(e) =>
                          setBotSettings({ ...botSettings, ownerNotificationPhone: e.target.value })
                        }
                        placeholder="+1 (780) XXX-XXXX"
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-xs font-mono text-white"
                      />
                      <button
                        type="button"
                        onClick={handleSendTestNotification}
                        disabled={isTestingAlert}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        {isTestingAlert ? 'Sending SMS...' : '📲 Send Test SMS Alert'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="flex items-center justify-between p-2 rounded-xl bg-slate-950/90 border border-white/10 cursor-pointer">
                      <span className="text-[11px] font-bold text-slate-200">
                        SMS Text Alert (via Quo)
                      </span>
                      <input
                        type="checkbox"
                        checked={botSettings.notifyViaSms !== false}
                        onChange={(e) =>
                          setBotSettings({ ...botSettings, notifyViaSms: e.target.checked })
                        }
                        className="accent-emerald-500 w-4 h-4"
                      />
                    </label>
                    <label className="flex items-center justify-between p-2 rounded-xl bg-slate-950/90 border border-white/10 cursor-pointer">
                      <span className="text-[11px] font-bold text-slate-200">
                        In-App / Team Chat Alert
                      </span>
                      <input
                        type="checkbox"
                        checked={botSettings.notifyViaInAppChat !== false}
                        onChange={(e) =>
                          setBotSettings({ ...botSettings, notifyViaInAppChat: e.target.checked })
                        }
                        className="accent-emerald-500 w-4 h-4"
                      />
                    </label>
                  </div>

                  {notifications.length > 0 && (
                    <div className="pt-2 border-t border-white/10 space-y-1.5">
                      <div className="text-[10px] font-black uppercase text-slate-400">
                        Recent Lead Alerts Sent ({notifications.length})
                      </div>
                      <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                        {notifications.slice(0, 5).map((n) => (
                          <div
                            key={n.id}
                            className="p-2 rounded-lg bg-slate-950/90 border border-white/10 text-[10px] flex items-center justify-between gap-2"
                          >
                            <div className="truncate">
                              <span className="font-bold text-white">{n.customerName}</span>{' '}
                              <span className="text-slate-400">({n.serviceType})</span> •{' '}
                              <span className="text-emerald-300 font-mono">{n.quoteNumber}</span>
                            </div>
                            <span className="text-[9px] text-slate-400 shrink-0">
                              {n.sentSms ? '✅ SMS Sent' : '🔔 App Alert'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-pink-500/30 space-y-3">
                  <div>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h3 className="text-xs font-black uppercase tracking-wider text-pink-300">
                        Tweak How Your AI Talks to Facebook Clients
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black">
                        🚫 No Price Discussion Mode
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Your AI is configured to <strong>never discuss prices with clients</strong> — it gathers as much detail as possible so you can review the draft quote and send it yourself.
                    </p>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      AI Bot Behavior, No-Price Rule &amp; Question Order:
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
                      Intake Checklist &amp; What Info to Gather (No Prices Shared With Clients):
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
                        Auto-Create DRAFT Quote in Jobber (For You to Review &amp; Send)
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
                    onClick={async () => {
                      await handleSaveConfig(pages, botSettings);
                      setPopupModal('NONE');
                    }}
                    disabled={isSavingConfig}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-black text-xs shadow-lg cursor-pointer"
                  >
                    {isSavingConfig ? 'Saving AI & Alert Settings...' : 'Save AI Intake Rules & Close'}
                  </button>
                </div>
              </div>
            )}

            {popupModal === 'WEBHOOK_SETUP' && (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-blue-500/30 space-y-2.5">
                  <div className="font-black text-blue-300 uppercase">
                    Meta Webhook &amp; Privacy URLs (App ID: 997522660032668)
                  </div>
                  <div className="grid grid-cols-1 gap-2">
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
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold cursor-pointer"
                      >
                        {copiedKey === 'webhook' ? 'Copied' : 'Copy Webhook'}
                      </button>
                    </div>
                  </div>
                </div>

                {pages.map((pg, idx) => (
                  <div
                    key={pg.id}
                    className="p-3.5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 space-y-2"
                  >
                    <div className="font-black text-white flex items-center justify-between">
                      <span>
                        Page #{idx + 1}: {pg.pageName}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-300">
                        ID: {pg.pageId}
                      </span>
                    </div>
                    <input
                      type="password"
                      value={pg.pageAccessToken}
                      onChange={(e) => {
                        const next = pages.map((p) =>
                          p.id === pg.id ? { ...p, pageAccessToken: e.target.value } : p
                        );
                        setPages(next);
                      }}
                      placeholder="Meta Page Access Token..."
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/15 text-white font-mono text-[11px]"
                    />
                  </div>
                ))}

                <button
                  type="button"
                  onClick={async () => {
                    await handleSaveConfig(pages, botSettings);
                    setPopupModal('NONE');
                  }}
                  disabled={isSavingConfig}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs cursor-pointer"
                >
                  Save Page Configuration &amp; Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
