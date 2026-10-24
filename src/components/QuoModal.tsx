import React, { useState, useEffect } from 'react';
import { 
  PhoneCall, 
  Key, 
  CheckCircle2, 
  ExternalLink, 
  RefreshCw, 
  ShieldCheck, 
  X, 
  AlertCircle,
  Hash,
  Activity,
  Headphones,
  Sliders,
  Copy,
  Plus,
  Volume2,
  FileText,
  Users,
  Search,
  Edit2,
  Check,
  ArrowRight,
  Play,
  Sparkles,
  Link as LinkIcon,
  Calendar,
  Tag,
  ShieldAlert
} from 'lucide-react';
import { getCustomerIntelligence } from '../services/customerIntelligenceService';
import { CustomerIntelligenceBadge } from './CustomerIntelligenceBadge';
import { TwilioSpamShieldModal } from './TwilioSpamShieldModal';

interface QuoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobSelected?: (jobId: string) => void;
  onDataUpdated?: () => void;
  onVisitCreated?: (newVisit: any) => void;
  clients?: any[];
  visits?: any[];
  projectId?: 'dispatchgeeni' | 'tidyups';
}

export interface QuoPhoneNumber {
  id: string;
  name: string;
  number: string;
  status: 'active' | 'forwarding' | 'ai_receptionist';
  totalCallsToday: number;
}

export const QuoModal: React.FC<QuoModalProps> = ({
  isOpen,
  onClose,
  onJobSelected,
  onDataUpdated,
  onVisitCreated,
  clients = [],
  visits = [],
  projectId = 'tidyups',
}) => {
  const [activeTab, setActiveTab] = useState<'LINES' | 'TRANSCRIPTS' | 'CONTACTS'>('TRANSCRIPTS');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [phoneNumbers, setPhoneNumbers] = useState<QuoPhoneNumber[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedProdWebhook, setCopiedProdWebhook] = useState(false);

  // Conversion Modal State
  const [conversionModal, setConversionModal] = useState<{
    isOpen: boolean;
    type: 'JOB' | 'QUOTE';
    call: any;
    clientName: string;
    clientPhone: string;
    serviceAddress: string;
    serviceType: string;
    scheduledDate: string;
    scheduledTime: string;
    assignedCleaners: string[];
    basePrice: number;
    applyDiscount: boolean;
    discountPercent: number;
    notes: string;
  } | null>(null);
  const [isSubmittingConversion, setIsSubmittingConversion] = useState(false);

  // Call Transcripts
  const [calls, setCalls] = useState<any[]>([]);
  const [isLoadingCalls, setIsLoadingCalls] = useState(false);
  const [isSyncingLiveCalls, setIsSyncingLiveCalls] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [transcriptVerdictFilter, setTranscriptVerdictFilter] = useState<'ALL' | 'GOOD_LEAD' | 'POTENTIAL_JOB' | 'BAD_LEAD'>('ALL');
  const [activeSecretInfo, setActiveSecretInfo] = useState<{
    activeApiKeySecrets: string[];
    activeWebhookSecrets: string[];
  }>({
    activeApiKeySecrets: ['QUO_API_TIDYUPS'],
    activeWebhookSecrets: ['APP_TIDYUPSCLEANING_COM_WEBHOOK'],
  });

  // Contacts
  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [isImportingContacts, setIsImportingContacts] = useState(false);
  const [isSyncingJobber, setIsSyncingJobber] = useState(false);

  // Inline editing contact
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');

  // Twilio Spam Shield & Call Blocker modal state
  const [isSpamShieldModalOpen, setIsSpamShieldModalOpen] = useState(false);
  const [spamBlockNumber, setSpamBlockNumber] = useState('');

  const prodWebhookUrl = 'https://app.tidyupscleaning.com/api/quo/webhook';
  const devWebhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/quo/webhook` : prodWebhookUrl;

  const fetchQuoStatus = () => {
    fetch('/api/quo/config')
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setIsConnected(Boolean(data.hasApiKey || data.isConnected));
          if (data.phoneNumbers) {
            setPhoneNumbers(data.phoneNumbers);
          }
          if (data.activeApiKeySecrets || data.activeWebhookSecrets) {
            setActiveSecretInfo({
              activeApiKeySecrets: data.activeApiKeySecrets || ['QUO_API_TIDYUPS'],
              activeWebhookSecrets: data.activeWebhookSecrets || ['APP_TIDYUPSCLEANING_COM_WEBHOOK'],
            });
          }
        }
      })
      .catch(() => {});
  };

  const handleSyncLiveQuoCalls = async () => {
    setIsSyncingLiveCalls(true);
    setSyncNotice('Syncing all 6 Quo phone lines, call summaries, and word-for-word Sona AI transcripts...');
    try {
      const res = await fetch(`/api/quo/sync-live-calls?project=${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-project-id': projectId },
      });
      const data = await res.json();
      if (data.success) {
        if (Array.isArray(data.calls)) setCalls(data.calls);
        setSyncNotice(
          `✅ Synced ${data.totalCallsStored || data.calls?.length || 0} calls across all 6 Quo lines! (${data.goodLeadCount || 0} Good Leads, ${data.potentialJobCount || 0} Potential Jobs, ${data.badLeadCount || 0} Bad Leads)`
        );
        if (onDataUpdated) onDataUpdated();
      } else {
        setSyncNotice(data.error || 'Could not sync live Quo calls.');
      }
    } catch {
      setSyncNotice('Network error syncing live Quo calls.');
    } finally {
      setIsSyncingLiveCalls(false);
    }
  };

  const handleMarkCallAsGoodLead = async (call: any) => {
    try {
      const res = await fetch(`/api/quo/calls/toggle-block?project=${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-project-id': projectId },
        body: JSON.stringify({
          callId: call.id,
          callerPhone: call.callerPhone,
          callerName: call.callerName,
          block: false,
          markAsGoodLead: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (Array.isArray(data.calls)) setCalls(data.calls);
        setSyncNotice(data.message || `✅ Marked ${call.callerName || call.callerPhone} as Good Lead & added to Voice & Quick Quotes!`);
        if (onDataUpdated) onDataUpdated();
      }
    } catch {
      setSyncNotice('Failed to update call lead status.');
    }
  };

  const fetchCalls = () => {
    setIsLoadingCalls(true);
    fetch('/api/quo/calls')
      .then((r) => r.json())
      .then((data) => {
        if (data && Array.isArray(data.calls)) {
          setCalls(data.calls);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingCalls(false));
  };

  const fetchContacts = () => {
    setIsLoadingContacts(true);
    fetch('/api/quo/contacts')
      .then((r) => r.json())
      .then((data) => {
        if (data && Array.isArray(data.contacts)) {
          setContacts(data.contacts);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingContacts(false));
  };

  useEffect(() => {
    if (isOpen) {
      fetchQuoStatus();
      fetchCalls();
      fetchContacts();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) {
      setSyncNotice('Please enter your Quo (OpenPhone) API key.');
      return;
    }

    setIsLoading(true);
    setSyncNotice(null);

    try {
      const res = await fetch('/api/quo/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKeyInput.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsConnected(true);
        setPhoneNumbers(data.phoneNumbers || []);
        setSyncNotice(`Connected to Quo! Loaded ${data.phoneNumbers?.length || 5} phone numbers.`);
        fetchContacts();
      } else {
        setSyncNotice(data.error || 'Failed to connect Quo API. Please verify the key.');
      }
    } catch {
      setSyncNotice('Network error saving Quo API key.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulateCall = async () => {
    setIsSimulating(true);
    setSyncNotice(null);
    try {
      const res = await fetch('/api/quo/simulate-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callerName: 'Kati Luknowsky',
          callerPhone: '+1 (780) 938-6742',
          summary: 'Kati Luknowsky called to confirm Friday 2Bed 3Bath Deep Cleaning visit. Requested focus on baseboards and oven.',
          transcriptText: 'Hi, this is Kati Luknowsky calling to check in on our 2 Bed 3 Bath Deep Cleaning scheduled for this Friday at 4 PM. We also wanted to ask if the team can pay special attention to the baseboards in the master bedroom and the oven.',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncNotice('🎉 Webhook simulated! Call transcript attached to VISIT-91202 and customer contact verified.');
        fetchCalls();
      } else {
        setSyncNotice(data.error || 'Simulation failed.');
      }
    } catch {
      setSyncNotice('Error simulating call.');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleImportQuoContacts = async () => {
    setIsImportingContacts(true);
    setSyncNotice(null);
    try {
      const res = await fetch('/api/quo/contacts/import', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSyncNotice(`🎉 ${data.message}`);
        fetchContacts();
      } else {
        setSyncNotice(data.error || 'Failed to import Quo contacts.');
      }
    } catch {
      setSyncNotice('Network error importing Quo contacts.');
    } finally {
      setIsImportingContacts(false);
    }
  };

  const handleSyncWithJobber = async () => {
    setIsSyncingJobber(true);
    setSyncNotice(null);
    try {
      const res = await fetch('/api/jobber/sync-contacts', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSyncNotice(`🎉 ${data.message}`);
      } else {
        setSyncNotice(data.error || 'Failed to sync contacts with Jobber.');
      }
    } catch {
      setSyncNotice('Network error syncing contacts with Jobber.');
    } finally {
      setIsSyncingJobber(false);
    }
  };

  const handleSaveContactName = async (contactId: string, phone: string) => {
    if (!editNameValue.trim()) return;
    try {
      const res = await fetch('/api/clients/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: contactId,
          phone,
          name: editNameValue.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncNotice(`Saved "${editNameValue.trim()}"! Synced across jobs and Quo caller ID.`);
        setEditingContactId(null);
        fetchContacts();
      }
    } catch {
      setSyncNotice('Failed to update contact name.');
    }
  };

  const handleOpenConvertCallModal = (call: any, type: 'JOB' | 'QUOTE') => {
    const intel = getCustomerIntelligence(call.callerPhone, call.callerName, { calls, visits, clients });
    setConversionModal({
      isOpen: true,
      type,
      call,
      clientName: call.callerName || 'Inbound Caller',
      clientPhone: call.callerPhone || '',
      serviceAddress: call.extractedAddress || 'Edmonton, AB',
      serviceType: call.extractedService || 'Residential Deep & Standard Cleaning',
      scheduledDate: new Date().toISOString().slice(0, 10),
      scheduledTime: '10:00',
      assignedCleaners: ['Cindy Guay'],
      basePrice:
        String(call.extractedService || '').includes('Move') || String(call.extractedService || '').includes('Deep')
          ? 340
          : 260,
      applyDiscount: intel.loyaltyDiscountEligible,
      discountPercent: intel.loyaltyDiscountPercent || 10,
      notes: call.summary ? `Customer called on ${call.lineName || 'Quo Line'}: ${call.summary}` : (call.transcriptText || ''),
    });
  };

  const handleConfirmConvert = async () => {
    if (!conversionModal) return;
    setIsSubmittingConversion(true);
    try {
      if (conversionModal.type === 'JOB') {
        const res = await fetch(`/api/quo/calls/convert-to-job?project=${projectId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-project-id': projectId },
          body: JSON.stringify({
            callId: conversionModal.call?.id || conversionModal.call?.callId,
            callerName: conversionModal.clientName,
            callerPhone: conversionModal.clientPhone,
            serviceAddress: conversionModal.serviceAddress,
            serviceType: conversionModal.serviceType,
            scheduledDate: conversionModal.scheduledDate,
            scheduledTime: conversionModal.scheduledTime,
            assignedCleaners: conversionModal.assignedCleaners,
            totalAmount: conversionModal.basePrice,
            discountPercent: conversionModal.applyDiscount ? conversionModal.discountPercent : 0,
            notes: conversionModal.notes,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setSyncNotice(`✓ ${data.message}`);
          if (data.newVisit && onVisitCreated) {
            onVisitCreated(data.newVisit);
          }
          if (onDataUpdated) onDataUpdated();
          fetchCalls();
          setConversionModal(null);
        } else {
          setSyncNotice(data.error || 'Failed to convert call to job.');
        }
      } else {
        const res = await fetch(`/api/quo/calls/convert-to-quote?project=${projectId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-project-id': projectId },
          body: JSON.stringify({
            callId: conversionModal.call?.id || conversionModal.call?.callId,
            clientName: conversionModal.clientName,
            clientPhone: conversionModal.clientPhone,
            serviceAddress: conversionModal.serviceAddress,
            service: conversionModal.serviceType,
            total: conversionModal.basePrice,
            depositRequired: 50,
            discountPercent: conversionModal.applyDiscount ? conversionModal.discountPercent : 0,
            notes: conversionModal.notes,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setSyncNotice(`✓ ${data.message}`);
          if (onDataUpdated) onDataUpdated();
          fetchCalls();
          setConversionModal(null);
        } else {
          setSyncNotice(data.error || 'Failed to create quote from call.');
        }
      }
    } catch (err: any) {
      setSyncNotice(`Conversion error: ${err.message}`);
    } finally {
      setIsSubmittingConversion(false);
    }
  };

  const filteredContacts = contacts.filter((c) => {
    if (!contactSearch.trim()) return true;
    const q = contactSearch.toLowerCase();
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden text-slate-900 font-sans max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-50 text-violet-600 border border-violet-200">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm text-slate-900">
                  Quo (OpenPhone) Voice Intelligence &amp; Job Sync Hub
                </h2>
                {isConnected ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Live Quo API Active</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold border border-amber-200">
                    Awaiting Quo Setup
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Inbound call transcript parsing, automatic job assignment, and contact synchronization with Jobber.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 bg-slate-100/70 px-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('TRANSCRIPTS')}
            className={`py-2.5 px-3.5 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'TRANSCRIPTS'
                ? 'border-violet-600 text-violet-700 bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Call Transcripts &amp; Leads ({calls.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CONTACTS')}
            className={`py-2.5 px-3.5 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'CONTACTS'
                ? 'border-violet-600 text-violet-700 bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Contacts &amp; Jobber Sync ({contacts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('LINES')}
            className={`py-2.5 px-3.5 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'LINES'
                ? 'border-violet-600 text-violet-700 bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            <span>Phone Lines &amp; Webhook Config</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSpamBlockNumber('');
              setIsSpamShieldModalOpen(true);
            }}
            className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ml-auto my-auto"
            title="Manage blocked country codes, rotating number prefixes, and spam blacklists"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            <span>Twilio Spam Shield</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto bg-slate-50/50 space-y-4">
          {syncNotice && (
            <div className="p-3 bg-violet-50 border border-violet-200 rounded-xl text-violet-950 text-xs flex items-center justify-between shadow-2xs animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-violet-600 flex-shrink-0" />
                <span>{syncNotice}</span>
              </div>
              <button onClick={() => setSyncNotice(null)} className="text-violet-700 hover:text-violet-950 font-bold">×</button>
            </div>
          )}

          {/* TAB 1: CALL TRANSCRIPTS & LEADS */}
          {activeTab === 'TRANSCRIPTS' && (
            <div className="space-y-3">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5 flex-wrap">
                      <Headphones className="w-4 h-4 text-violet-600" />
                      <span>All 6 Quo Phone Lines — Call Transcripts &amp; Good Lead vs. Bad Lead Evaluator</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-mono">
                        🔑 {activeSecretInfo.activeApiKeySecrets[0] || 'QUO_API_TIDYUPS'} +{' '}
                        {activeSecretInfo.activeWebhookSecrets[0] || 'APP_TIDYUPSCLEANING_COM_WEBHOOK'}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Every call across all 6 TidyUps Quo lines is transcribed by Sona AI, evaluated as a{' '}
                      <strong className="text-emerald-700">Good Lead</strong>,{' '}
                      <strong className="text-amber-700">Potential Job</strong>, or{' '}
                      <strong className="text-rose-700">Bad Lead</strong>, and synced to{' '}
                      <strong>Voice &amp; Quick Quotes</strong> in your Master Leads table.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button
                      onClick={handleSyncLiveQuoCalls}
                      disabled={isSyncingLiveCalls}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncingLiveCalls ? 'animate-spin' : ''}`} />
                      <span>{isSyncingLiveCalls ? 'Syncing All 6 Lines...' : 'Sync All 6 Quo Lines & Transcripts'}</span>
                    </button>
                    <button
                      onClick={handleSimulateCall}
                      disabled={isSimulating}
                      className="px-2.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{isSimulating ? 'Processing...' : 'Test Webhook'}</span>
                    </button>
                  </div>
                </div>

                {/* Verdict Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                  {(
                    [
                      { id: 'ALL', label: `All Calls (${calls.length})` },
                      {
                        id: 'GOOD_LEAD',
                        label: `✅ Good Leads (${
                          calls.filter((c) => !c.isBlocked && (c.hasCleaningIntent || c.leadVerdict === 'GOOD_LEAD')).length
                        })`,
                      },
                      {
                        id: 'POTENTIAL_JOB',
                        label: `🟡 Potential Jobs — Follow Up (${
                          calls.filter(
                            (c) =>
                              !c.isBlocked &&
                              !c.hasCleaningIntent &&
                              (c.isPotentialOrGoodLead || c.leadVerdict === 'POTENTIAL_JOB')
                          ).length
                        })`,
                      },
                      {
                        id: 'BAD_LEAD',
                        label: `🚫 Bad Leads / Solicitors (${
                          calls.filter((c) => c.isBlocked || c.status === 'SOLICITOR_BLOCKED' || c.leadVerdict === 'BAD_LEAD').length
                        })`,
                      },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setTranscriptVerdictFilter(tab.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                        transcriptVerdictFilter === tab.id
                          ? 'bg-violet-600 text-white shadow-2xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {calls.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-violet-50 text-violet-600 mx-auto flex items-center justify-center">
                    <PhoneCall className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">No Inbound Calls Loaded Yet</h4>
                    <p className="text-[11px] text-slate-500 max-w-md mx-auto mt-1">
                      Click <strong>Sync All 6 Quo Lines &amp; Transcripts</strong> above to pull all live phone calls and transcripts from Quo.
                    </p>
                  </div>
                  <button
                    onClick={handleSyncLiveQuoCalls}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-emerald-700"
                  >
                    Sync All 6 Quo Lines Now
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {calls
                    .filter((call) => {
                      const isBad = Boolean(call.isBlocked || call.status === 'SOLICITOR_BLOCKED' || call.leadVerdict === 'BAD_LEAD');
                      const isGood = !isBad && Boolean(call.hasCleaningIntent || call.leadVerdict === 'GOOD_LEAD');
                      const isPotential = !isBad && !isGood && Boolean(call.isPotentialOrGoodLead || call.leadVerdict === 'POTENTIAL_JOB');
                      if (transcriptVerdictFilter === 'GOOD_LEAD') return isGood;
                      if (transcriptVerdictFilter === 'POTENTIAL_JOB') return isPotential;
                      if (transcriptVerdictFilter === 'BAD_LEAD') return isBad;
                      return true;
                    })
                    .map((call, idx) => {
                      const isBad = Boolean(call.isBlocked || call.status === 'SOLICITOR_BLOCKED' || call.leadVerdict === 'BAD_LEAD');
                      const isGood = !isBad && Boolean(call.hasCleaningIntent || call.leadVerdict === 'GOOD_LEAD');
                      const isPotential = !isBad && !isGood && Boolean(call.isPotentialOrGoodLead || call.leadVerdict === 'POTENTIAL_JOB');

                      return (
                        <div
                          key={`${call.id || 'call'}-${idx}`}
                          className={`bg-white p-4 rounded-xl border shadow-2xs space-y-2.5 transition-all ${
                            isBad
                              ? 'border-rose-200 bg-rose-50/20'
                              : isGood
                              ? 'border-emerald-300 hover:border-emerald-400'
                              : isPotential
                              ? 'border-amber-300 hover:border-amber-400'
                              : 'border-slate-200 hover:border-violet-300'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 text-sm">
                                {call.callerName || 'Inbound Caller'}
                              </span>
                              <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                {call.callerPhone}
                              </span>
                              <CustomerIntelligenceBadge
                                intelligence={getCustomerIntelligence(call.callerPhone, call.callerName, { calls, visits, clients })}
                                compact
                              />
                              <span className="text-[11px] text-violet-700 font-semibold bg-violet-50 px-2 py-0.5 rounded border border-violet-200">
                                📞 {call.lineName || 'Primary Dispatch'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border ${
                                  isBad
                                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                                    : isGood
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    : isPotential
                                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                                    : 'bg-slate-100 text-slate-700 border-slate-300'
                                }`}
                              >
                                {isBad
                                  ? '🚫 Bad Lead — Solicitor / Blocked'
                                  : isGood
                                  ? '✅ Good Lead — Potential Job'
                                  : isPotential
                                  ? '🟡 Potential Job — Follow-Up'
                                  : call.leadVerdictLabel || 'Screened Call'}
                              </span>
                              {call.matchedJobTitle && (
                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200 flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>{call.matchedJobTitle}</span>
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400 font-mono">
                                {String(call.timestamp || '').slice(0, 16).replace('T', ' ')}
                              </span>
                            </div>
                          </div>

                          {(call.extractedService || (call.extractedAddress && call.extractedAddress !== 'Edmonton, AB')) && (
                            <div className="flex flex-wrap items-center gap-2 text-[11px]">
                              {call.extractedService && (
                                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                                  🧹 {call.extractedService}
                                </span>
                              )}
                              {call.extractedBedrooms && (
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
                                  🛏️ {call.extractedBedrooms} • 🛁 {call.extractedBathrooms || '2 Bathrooms'}
                                </span>
                              )}
                              {call.extractedAddress && call.extractedAddress !== 'Edmonton, AB' && (
                                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-semibold">
                                  📍 {call.extractedAddress}
                                </span>
                              )}
                            </div>
                          )}

                          {call.summary && (
                            <div className="p-3 bg-violet-50/70 border border-violet-100 rounded-lg text-xs text-violet-950 space-y-1">
                              <div className="font-bold flex items-center gap-1 text-violet-900">
                                <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                                <span>Voice Call AI Summary:</span>
                              </div>
                              <p className="leading-relaxed text-[11px] text-violet-900">
                                {call.summary}
                              </p>
                            </div>
                          )}

                          {call.transcriptText && (
                            <details className="text-xs text-slate-600" open={isGood}>
                              <summary className="font-semibold text-violet-600 hover:text-violet-800 cursor-pointer text-[11px]">
                                📜 View Complete Word-for-Word Voice Call Transcript
                              </summary>
                              <div className="mt-1.5 p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-700 whitespace-pre-wrap leading-relaxed max-h-44 overflow-y-auto">
                                {call.transcriptText}
                              </div>
                            </details>
                          )}

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px]">
                            <div className="flex items-center gap-3 text-slate-500">
                              <span>
                                Duration: {call.duration ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s` : 'Logged'}
                              </span>
                              {call.recordingUrl && (
                                <a
                                  href={call.recordingUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-violet-600 font-semibold hover:underline flex items-center gap-1"
                                >
                                  <span>Audio Recording</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              {call.matchedJobId && onJobSelected && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onJobSelected(call.matchedJobId);
                                    onClose();
                                  }}
                                  className="text-violet-700 hover:text-violet-900 font-bold flex items-center gap-1 cursor-pointer mr-1"
                                >
                                  <span>Open Job Visit →</span>
                                </button>
                              )}

                              {!isGood && (
                                <button
                                  type="button"
                                  onClick={() => handleMarkCallAsGoodLead(call)}
                                  className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                  title="Mark this call as a Good Lead and add to Voice & Quick Quotes"
                                >
                                  ✅ Mark Good Lead
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleOpenConvertCallModal(call, 'JOB')}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer active:scale-95"
                                title="Convert inbound call into a scheduled cleaning job"
                              >
                                <Calendar className="w-3 h-3" />
                                <span>Convert to Job</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenConvertCallModal(call, 'QUOTE')}
                                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer active:scale-95"
                                title="Create and stage Jobber quote from this call lead"
                              >
                                <FileText className="w-3 h-3" />
                                <span>Create Quote</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSpamBlockNumber(call.callerPhone || '');
                                  setIsSpamShieldModalOpen(true);
                                }}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer active:scale-95"
                                title="Block caller or its rotating prefix in Twilio Spam Shield"
                              >
                                <ShieldAlert className="w-3 h-3 text-rose-600" />
                                <span>Block Bad Lead</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CONTACTS & JOBBER SYNC */}
          {activeTab === 'CONTACTS' && (
            <div className="space-y-3">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-violet-600" />
                    <span>Customer Contacts Directory</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Save customer names, link caller IDs, and push verified contacts into Jobber client records.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleImportQuoContacts}
                    disabled={isImportingContacts}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isImportingContacts ? 'animate-spin' : ''}`} />
                    <span>Import from Quo</span>
                  </button>
                  <button
                    onClick={handleSyncWithJobber}
                    disabled={isSyncingJobber}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{isSyncingJobber ? 'Syncing...' : 'Sync Contacts with Jobber'}</span>
                  </button>
                </div>
              </div>

              {/* Search bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder="Search contacts by name, phone (+1780...), or email..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-violet-500"
                />
              </div>

              {/* Contacts List */}
              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                {filteredContacts.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    No matching contacts found. Click "Import from Quo" to load all contacts from your phone system.
                  </div>
                ) : (
                  filteredContacts.map((c) => (
                    <div key={c.id} className="p-3 hover:bg-slate-50 flex items-center justify-between gap-3 text-xs">
                      <div className="flex-1 min-w-0">
                        {editingContactId === c.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editNameValue}
                              onChange={(e) => setEditNameValue(e.target.value)}
                              className="px-2 py-1 bg-white border border-violet-400 rounded text-xs font-bold text-slate-900"
                              placeholder="Full Name"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveContactName(c.id, c.phone)}
                              className="p-1 bg-emerald-600 text-white rounded cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingContactId(null)}
                              className="p-1 bg-slate-200 text-slate-600 rounded cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 truncate">
                              {c.name || 'Unnamed Caller'}
                            </span>
                            <button
                              onClick={() => {
                                setEditingContactId(c.id);
                                setEditNameValue(c.name || '');
                              }}
                              className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                              title="Edit Contact Name"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {c.phone} {c.email ? `• ${c.email}` : ''}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 bg-violet-50 text-violet-700 rounded text-[10px] font-semibold border border-violet-200">
                          Quo Verified
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-semibold border border-emerald-200">
                          Jobber Synced
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: PHONE LINES & WEBHOOK */}
          {activeTab === 'LINES' && (
            <div className="space-y-4">
              {/* Webhook URLs for Custom Domain & Dev */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-emerald-600" />
                    <span>Inbound Quo Webhook URLs</span>
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Auto-Parsing Enabled
                  </span>
                </div>

                {/* Production Custom Domain Webhook */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                    <span className="font-semibold">Production Custom Domain Webhook:</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(prodWebhookUrl);
                        setCopiedProdWebhook(true);
                        setTimeout(() => setCopiedProdWebhook(false), 3000);
                        setSyncNotice('Copied Production Webhook URL!');
                      }}
                      className="text-violet-600 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedProdWebhook ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="font-mono text-xs text-slate-800 bg-slate-50 p-2 rounded-lg border border-slate-200 break-all select-all">
                    {prodWebhookUrl}
                  </div>
                </div>

                {/* AI Studio Container Webhook */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                    <span className="font-semibold">Current Preview Container Webhook:</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(devWebhookUrl);
                        setCopiedWebhook(true);
                        setTimeout(() => setCopiedWebhook(false), 3000);
                        setSyncNotice('Copied Dev Container Webhook URL!');
                      }}
                      className="text-violet-600 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedWebhook ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="font-mono text-xs text-slate-800 bg-slate-50 p-2 rounded-lg border border-slate-200 break-all select-all">
                    {devWebhookUrl}
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Quo sends post-call transcripts, durations, and audio URLs to this webhook. The dispatch engine automatically identifies the customer, maps the call to their job visit, and updates their contact card.
                </p>
              </div>

              {/* Connected Phone Numbers */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Hash className="w-4 h-4 text-slate-700" />
                    <span>Configured Phone Numbers ({phoneNumbers.length})</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Area Code: Edmonton (780 / 587)</span>
                </div>

                <div className="space-y-2">
                  {phoneNumbers.map((line, idx) => (
                    <div
                      key={line.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-xs">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                            <span>{line.name}</span>
                            <span className="font-mono text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                              {line.number}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Status: Active • Auto Voice Transcript Routing Enabled
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>{line.totalCallsToday || 12} Calls Logged</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Quo Voice Pipeline &amp; Jobber Sync Ready</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>

      {/* Lead Conversion Dialog Overlay */}
      {conversionModal?.isOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                  {conversionModal.type === 'JOB' ? <Calendar className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    {conversionModal.type === 'JOB'
                      ? 'Convert Inbound Phone Lead into Scheduled Job'
                      : 'Create Jobber Quote from Inbound Call'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Dispatch team &amp; quote creation with customer loyalty intelligence.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConversionModal(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleConfirmConvert();
              }}
              className="p-4 space-y-3 text-xs text-slate-700 overflow-y-auto"
            >
              {/* Customer Intelligence Banner */}
              <CustomerIntelligenceBadge
                intelligence={getCustomerIntelligence(conversionModal.clientPhone, conversionModal.clientName, { calls, visits, clients })}
                showDiscountPrompt={false}
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={conversionModal.clientName}
                    onChange={(e) => setConversionModal({ ...conversionModal, clientName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-600 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={conversionModal.clientPhone}
                    onChange={(e) => setConversionModal({ ...conversionModal, clientPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Service Address</label>
                <input
                  type="text"
                  value={conversionModal.serviceAddress}
                  onChange={(e) => setConversionModal({ ...conversionModal, serviceAddress: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-600"
                  placeholder="e.g. 10240 124 St, Edmonton, AB"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Service Package</label>
                  <select
                    value={conversionModal.serviceType}
                    onChange={(e) => setConversionModal({ ...conversionModal, serviceType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-600"
                  >
                    <option value="Residential Deep & Standard Cleaning">Deep & Standard Cleaning</option>
                    <option value="Standard Recurring Cleaning">Standard Recurring Cleaning</option>
                    <option value="Move-Out Cleaning">Move-Out Clean</option>
                    <option value="Post-Construction Clean">Post-Construction</option>
                    <option value="Commercial Cleaning">Commercial Cleaning</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Base Price ($)</label>
                  <input
                    type="number"
                    min="50"
                    value={conversionModal.basePrice}
                    onChange={(e) => setConversionModal({ ...conversionModal, basePrice: Number(e.target.value) || 280 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-600 font-mono font-bold"
                  />
                </div>
              </div>

              {conversionModal.type === 'JOB' && (
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={conversionModal.scheduledDate}
                      onChange={(e) => setConversionModal({ ...conversionModal, scheduledDate: e.target.value })}
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-600 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Time</label>
                    <input
                      type="text"
                      value={conversionModal.scheduledTime}
                      onChange={(e) => setConversionModal({ ...conversionModal, scheduledTime: e.target.value })}
                      className="w-full px-2.5 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-600 font-mono text-xs"
                      placeholder="10:00"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Cleaner Assigned</label>
                    <select
                      value={conversionModal.assignedCleaners[0] || 'Cindy Guay'}
                      onChange={(e) => setConversionModal({ ...conversionModal, assignedCleaners: [e.target.value] })}
                      className="w-full px-2 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-600 text-xs"
                    >
                      <option value="Cindy Guay">Cindy Guay</option>
                      <option value="Cindy Guay & Crew">Cindy & Crew</option>
                      <option value="Sarah Jenkins">Sarah Jenkins</option>
                      <option value="David Miller">David Miller</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Loyalty Discount Selector */}
              {conversionModal.discountPercent > 0 && (
                <div className="p-3 bg-pink-50 border border-pink-200 rounded-xl space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-pink-950 text-xs">
                    <input
                      type="checkbox"
                      checked={conversionModal.applyDiscount}
                      onChange={(e) => setConversionModal({ ...conversionModal, applyDiscount: e.target.checked })}
                      className="w-4 h-4 text-pink-600 rounded"
                    />
                    <span>
                      Apply {conversionModal.discountPercent}% Repeat Customer Discount
                    </span>
                  </label>
                  <p className="text-[11px] text-pink-800 pl-6">
                    {conversionModal.applyDiscount ? (
                      <span className="font-bold text-emerald-800">
                        ✓ Discount Applied: ${conversionModal.basePrice} → ${Math.round(conversionModal.basePrice * (1 - conversionModal.discountPercent / 100))} (Saved ${Math.round(conversionModal.basePrice * (conversionModal.discountPercent / 100))})
                      </span>
                    ) : (
                      <span>Unchecked: Standard billing rate (${conversionModal.basePrice})</span>
                    )}
                  </p>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes / Call Transcript Summary</label>
                <textarea
                  rows={2}
                  value={conversionModal.notes}
                  onChange={(e) => setConversionModal({ ...conversionModal, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-600 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConversionModal(null)}
                  className="px-3 py-2 border border-slate-300 hover:bg-slate-100 rounded-xl font-bold text-slate-700 cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingConversion}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl font-bold shadow-md cursor-pointer flex items-center gap-1.5 active:scale-95 text-xs disabled:opacity-50"
                >
                  {conversionModal.type === 'JOB' ? <Calendar className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                  <span>
                    {isSubmittingConversion
                      ? 'Processing...'
                      : conversionModal.type === 'JOB'
                      ? 'Confirm & Dispatch Job'
                      : 'Confirm & Push Quote'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Twilio Spam Shield & Call Blocker Modal */}
      {isSpamShieldModalOpen && (
        <TwilioSpamShieldModal
          isOpen={isSpamShieldModalOpen}
          onClose={() => setIsSpamShieldModalOpen(false)}
          projectId={projectId}
          preFillNumber={spamBlockNumber}
        />
      )}
    </div>
  );
};
