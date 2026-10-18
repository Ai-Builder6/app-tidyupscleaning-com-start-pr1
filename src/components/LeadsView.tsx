import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  Check,
  X,
  Plus,
  Calculator,
  Copy,
  CheckCircle2,
  ExternalLink,
  ClipboardPaste,
  ShieldAlert,
  FileSpreadsheet,
  Download,
  Trash2,
  UserPlus,
  FileCheck,
  Layers,
  BedDouble,
  Bath,
  Send,
  Key,
  CloudUpload,
  Globe,
  AlertTriangle,
} from 'lucide-react';
import { AdLeadItem, LeadStatus, LeadVerdict } from '../types/lead';
import { JobberQuote, extractJobberNumericId } from '../services/jobberSyncModules';
import { QuoteDetailModal } from './QuoteDetailModal';
import {
  LEADS_SPREADSHEET_ID,
  SECONDARY_LEADS_SPREADSHEET_ID,
  APP_LEAD_HEADERS,
} from '../services/leadSheetSync';
import {
  TIDYUPS_DRIVE_FOLDER_NAME,
  createNewCleanLeadsSheetInDrive,
  syncLeadsToLiveGoogleSheetInDrive,
  downloadFileFromApiWithoutNavigation,
} from '../services/googleDriveBackupService';

export type CleanSheetTab =
  | 'ALL'
  | 'Facebook Leads'
  | 'Google Leads'
  | 'Voice & Quick Quotes'
  | 'Pasted Leads';

interface LeadsViewProps {
  leads: AdLeadItem[];
  onLeadsUpdated?: (leads: AdLeadItem[]) => void;
  onConvertLeadToJob?: (lead: AdLeadItem) => void;
  onOpenQuickQuote?: (lead?: AdLeadItem) => void;
  onOpenSpamShield?: (preFillNumber?: string) => void;
  calls?: any[];
  spamShieldConfig?: any;
  onToggleBlockScreenedCall?: (params: {
    callId?: string;
    callerPhone: string;
    callerName?: string;
    reason?: string;
    block: boolean;
  }) => Promise<any>;
  visits?: any[];
  clients?: any[];
  quotes?: JobberQuote[];
  onQuotesUpdated?: (quotes: JobberQuote[]) => void;
  onClientsUpdated?: (clients: any[]) => void;
  onOpenJobberModal?: () => void;
  projectId?: 'dispatchgeeni' | 'tidyups';
}

interface ParsedPasteLead {
  customerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  bedrooms: string;
  bathrooms: string;
  serviceRequested: string;
  quotedAmount: number;
  notes: string;
}

function parseRawPasteIntoLeads(rawText: string): ParsedPasteLead[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const results: ParsedPasteLead[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip obvious header row
    if (
      i === 0 &&
      /^(date|name|client|customer|first\s*name|source|sheet\s*tab)\b/i.test(line) &&
      (line.includes('\t') || line.includes(',') || line.includes('|'))
    ) {
      continue;
    }

    const delimiter = line.includes('\t')
      ? '\t'
      : line.includes('|')
      ? '|'
      : line.split(',').length >= 3
      ? ','
      : null;

    if (delimiter) {
      const cols = line.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ''));
      // Detect phone column
      const phoneIdx = cols.findIndex((c) => /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(c));
      const emailIdx = cols.findIndex((c) => /\S+@\S+\.\S+/.test(c));
      const priceIdx = cols.findIndex((c) => /^\$?\d{2,4}(\.\d{2})?$/.test(c));
      const bedIdx = cols.findIndex((c) => /\d+\s*(?:bed|bd|br)/i.test(c));
      const bathIdx = cols.findIndex((c) => /\d+(?:\.\d+)?\s*(?:bath|ba)/i.test(c));
      const addrIdx = cols.findIndex(
        (c, idx) =>
          idx !== phoneIdx &&
          idx !== emailIdx &&
          (/\d+\s+[A-Za-z0-9]+\s+(?:st|street|ave|avenue|rd|road|dr|drive|blvd|way|pl|place|cres|nw|sw|ne|se)\b/i.test(
            c
          ) ||
            /edmonton|st\.?\s*albert|sherwood\s*park|spruce\s*grove|leduc|beaumont/i.test(c))
      );

      const usedIndices = new Set(
        [phoneIdx, emailIdx, priceIdx, bedIdx, bathIdx, addrIdx].filter((idx) => idx >= 0)
      );
      const nameCandidate =
        cols.find(
          (c, idx) =>
            !usedIndices.has(idx) &&
            c.length >= 2 &&
            !/^\d{4}-\d{2}-\d{2}/.test(c) &&
            !/^(facebook|google|voice|pasted|new|good lead)/i.test(c)
        ) ||
        cols[0] ||
        'Clean Sheet Lead';

      const phone = phoneIdx >= 0 ? cols[phoneIdx] : '';
      const email = emailIdx >= 0 ? cols[emailIdx] : '';
      const address = addrIdx >= 0 ? cols[addrIdx] : cols[2] || 'Edmonton, AB';
      const bedrooms = bedIdx >= 0 ? cols[bedIdx] : '3 Bedrooms';
      const bathrooms = bathIdx >= 0 ? cols[bathIdx] : '2 Bathrooms';
      const quotedAmount =
        priceIdx >= 0 ? parseFloat(cols[priceIdx].replace(/[^0-9.]/g, '')) || 221.07 : 221.07;

      const remainingNotes = cols
        .filter((_, idx) => !usedIndices.has(idx) && cols[idx] !== nameCandidate)
        .join(' | ');

      results.push({
        customerName: nameCandidate,
        phone,
        email,
        address,
        city: 'Edmonton',
        postalCode: '',
        bedrooms,
        bathrooms,
        serviceRequested:
          remainingNotes.match(/(?:move[- ]?out|deep\s*clean|basic|standard|airbnb|post[- ]?construction)[^|]*/i)?.[0] ||
          '3Bed 2Bath Basic Initial Cleaning (1 Pro Cleaner)',
        quotedAmount,
        notes: remainingNotes,
      });
    } else {
      // Free-form text line
      const phoneMatch = line.match(/(\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/);
      const emailMatch = line.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      const priceMatch = line.match(/\$\s*(\d{2,4}(?:\.\d{2})?)/);
      const bedMatch = line.match(/(\d+)\s*(?:bed|bedroom|bd|br)/i);
      const bathMatch = line.match(/(\d+(?:\.\d+)?)\s*(?:bath|bathroom|ba)/i);
      const addrMatch = line.match(
        /(\d{2,5}\s+[A-Za-z0-9\s]{2,25}(?:st|street|ave|avenue|rd|road|dr|drive|blvd|way|nw|sw|ne|se)\b)/i
      );
      const nameClean = line
        .replace(phoneMatch?.[0] || '', '')
        .replace(emailMatch?.[0] || '', '')
        .replace(addrMatch?.[0] || '', '')
        .split(/[-–—,|]/)[0]
        .trim();

      results.push({
        customerName: nameClean && nameClean.length >= 2 ? nameClean.slice(0, 45) : 'New Lead',
        phone: phoneMatch ? phoneMatch[1].trim() : '',
        email: emailMatch ? emailMatch[1].trim() : '',
        address: addrMatch ? addrMatch[1].trim() : 'Edmonton, AB',
        city: 'Edmonton',
        postalCode: '',
        bedrooms: bedMatch ? `${bedMatch[1]} Bedrooms` : '3 Bedrooms',
        bathrooms: bathMatch ? `${bathMatch[1]} Bathrooms` : '2 Bathrooms',
        serviceRequested: /move[- ]?out/i.test(line)
          ? 'Move-Out Cleaning'
          : /deep/i.test(line)
          ? 'Deep Cleaning'
          : '3Bed 2Bath Basic Initial Cleaning (1 Pro Cleaner)',
        quotedAmount: priceMatch ? parseFloat(priceMatch[1]) : 221.07,
        notes: line,
      });
    }
  }

  return results;
}

export const LeadsView: React.FC<LeadsViewProps> = ({
  leads: initialLeads,
  onLeadsUpdated,
  onOpenQuickQuote,
  onOpenSpamShield,
  calls: propCalls,
  spamShieldConfig,
  onToggleBlockScreenedCall,
  quotes = [],
  onQuotesUpdated,
  onClientsUpdated,
  onOpenJobberModal,
  projectId = 'tidyups',
}) => {
  const [leadsList, setLeadsList] = useState<AdLeadItem[]>(initialLeads || []);
  const [activeTab, setActiveTab] = useState<CleanSheetTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [verdictFilter, setVerdictFilter] = useState<'ALL' | LeadVerdict>('ALL');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncingRowId, setSyncingRowId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copiedTsv, setCopiedTsv] = useState(false);
  const [selectedQuoteForModal, setSelectedQuoteForModal] = useState<JobberQuote | null>(null);

  // Paste Table & Quick Row Entry State
  const [targetSheetTab, setTargetSheetTab] = useState<Exclude<CleanSheetTab, 'ALL'>>('Facebook Leads');
  const [pasteText, setPasteText] = useState('');
  const [showPasteBox, setShowPasteBox] = useState(true);

  // Quick 1-Line Manual Add Row state
  const [quickName, setQuickName] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [quickAddress, setQuickAddress] = useState('');
  const [quickBedrooms, setQuickBedrooms] = useState('3 Bedrooms');
  const [quickBathrooms, setQuickBathrooms] = useState('2 Bathrooms');
  const [quickService, setQuickService] = useState('3Bed 2Bath Basic Initial Cleaning (1 Pro Cleaner)');
  const [quickPrice, setQuickPrice] = useState('221.07');
  const [quickNotes, setQuickNotes] = useState('');

  // Real Google Sheet URL state (defaults to verified Primary Leads Sheet, never a fake placeholder)
  const defaultPrimarySheetUrl = `https://docs.google.com/spreadsheets/d/${LEADS_SPREADSHEET_ID}/edit`;
  const defaultSecondarySheetUrl = `https://docs.google.com/spreadsheets/d/${SECONDARY_LEADS_SPREADSHEET_ID}/edit`;
  const [googleSheetUrl, setGoogleSheetUrl] = useState(defaultPrimarySheetUrl);
  const [createdDriveSheetUrl, setCreatedDriveSheetUrl] = useState<string>('');
  const [createdDriveSheetName, setCreatedDriveSheetName] = useState<string>('');
  const [webhookUrl, setWebhookUrl] = useState<string>('https://app.tidyupscleaning.com/api/leads/webhook');
  const [isSavingSheetUrl, setIsSavingSheetUrl] = useState(false);
  const [isCreatingDriveSheet, setIsCreatingDriveSheet] = useState(false);
  const [isSyncingDriveSheet, setIsSyncingDriveSheet] = useState(false);
  const [isDownloadingFile, setIsDownloadingFile] = useState<'XLSX' | 'CSV' | null>(null);
  const [showAdsConnectPanel, setShowAdsConnectPanel] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [confirmDriveSyncModal, setConfirmDriveSyncModal] = useState(false);

  // Quo / OpenPhone Missed Calls, Sonia AI Screener & Voicemail Transcripts State
  const [quoCallsList, setQuoCallsList] = useState<any[]>(propCalls || []);
  const [isSyncingQuoCalls, setIsSyncingQuoCalls] = useState(false);
  const [showQuoCallsPanel, setShowQuoCallsPanel] = useState(true);
  const [expandedTranscriptId, setExpandedTranscriptId] = useState<string | null>(null);
  const [togglingBlockId, setTogglingBlockId] = useState<string | null>(null);

  useEffect(() => {
    setLeadsList(initialLeads || []);
  }, [initialLeads]);

  useEffect(() => {
    if (Array.isArray(propCalls) && propCalls.length > 0) {
      setQuoCallsList(propCalls);
    }
  }, [propCalls]);

  useEffect(() => {
    fetch(`/api/google-sheets/config?project=${projectId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.sheetUrl && !String(d.sheetUrl).includes('clean_sheet')) {
          setGoogleSheetUrl(d.sheetUrl);
        } else {
          setGoogleSheetUrl(defaultPrimarySheetUrl);
        }
        if (d?.createdDriveSheetUrl) setCreatedDriveSheetUrl(d.createdDriveSheetUrl);
        if (d?.createdDriveSheetName) setCreatedDriveSheetName(d.createdDriveSheetName);
        if (d?.webhookUrl) setWebhookUrl(d.webhookUrl);
      })
      .catch(() => {});

    // Load Quo / OpenPhone call logs and transcripts
    fetch('/api/quo/calls')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d?.calls)) {
          setQuoCallsList(d.calls);
        }
      })
      .catch(() => {});
  }, [projectId, defaultPrimarySheetUrl]);

  const handleSyncQuoMissedCallsAndTranscripts = async () => {
    setIsSyncingQuoCalls(true);
    setNotice(null);
    try {
      const res = await fetch('/api/quo/sync-live-calls', { method: 'POST' });
      const data = await res.json();
      if (data?.success) {
        if (Array.isArray(data.calls)) setQuoCallsList(data.calls);
        if (Array.isArray(data.leads)) {
          setLeadsList(data.leads);
          if (onLeadsUpdated) onLeadsUpdated(data.leads);
        }
        setShowQuoCallsPanel(true);
        setNotice(
          `✓ Synced ${data.syncedCallsCount || 0} Quo / Sonia AI calls & transcripts! Cleaning leads with transcripts (Rahum & Blaze) are connected directly to your Voice & Quick Quotes sheet tab.`
        );
      } else {
        setNotice(`Quo sync notice: ${data?.error || 'Could not sync calls'}`);
      }
    } catch (err: any) {
      setNotice(`Error syncing Quo transcripts: ${err?.message}`);
    } finally {
      setIsSyncingQuoCalls(false);
    }
  };

  const parsedPreviewRows = useMemo(() => parseRawPasteIntoLeads(pasteText), [pasteText]);

  const tabCounts = useMemo(() => {
    const counts: Record<CleanSheetTab, number> = {
      ALL: leadsList.length,
      'Facebook Leads': 0,
      'Google Leads': 0,
      'Voice & Quick Quotes': 0,
      'Pasted Leads': 0,
    };
    for (const l of leadsList) {
      const st = (l as any).sourceTab as CleanSheetTab;
      if (st && counts[st] !== undefined) {
        counts[st]++;
      } else if (String(l.source).includes('Facebook')) {
        counts['Facebook Leads']++;
      } else if (String(l.source).includes('Google')) {
        counts['Google Leads']++;
      } else if (String(l.source).includes('Paste')) {
        counts['Pasted Leads']++;
      } else {
        counts['Voice & Quick Quotes']++;
      }
    }
    return counts;
  }, [leadsList]);

  const filteredLeads = useMemo(() => {
    return leadsList.filter((l) => {
      const rowTab =
        (l as any).sourceTab ||
        (String(l.source).includes('Facebook')
          ? 'Facebook Leads'
          : String(l.source).includes('Google')
          ? 'Google Leads'
          : String(l.source).includes('Paste')
          ? 'Pasted Leads'
          : 'Voice & Quick Quotes');

      if (activeTab !== 'ALL' && rowTab !== activeTab) return false;
      if (verdictFilter !== 'ALL' && (l.verdict || 'Good lead') !== verdictFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          l.customerName?.toLowerCase().includes(q) ||
          l.phone?.toLowerCase().includes(q) ||
          l.address?.toLowerCase().includes(q) ||
          l.serviceRequested?.toLowerCase().includes(q) ||
          l.quoteNumber?.toLowerCase().includes(q) ||
          l.notes?.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [leadsList, activeTab, verdictFilter, searchQuery]);

  // Save connected Google Sheet URL
  const handleSaveSheetUrl = async (customUrl?: string) => {
    const urlToSave = (customUrl ?? googleSheetUrl).trim();
    if (!urlToSave || urlToSave.includes('clean_sheet')) {
      setNotice('Please enter a valid Google Sheets URL or click "+ Create New Sheet in Drive".');
      return;
    }
    setIsSavingSheetUrl(true);
    try {
      const res = await fetch(`/api/google-sheets/config?project=${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-project-id': projectId },
        body: JSON.stringify({ sheetUrl: urlToSave }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.config?.sheetUrl) setGoogleSheetUrl(data.config.sheetUrl);
        setNotice('✓ Connected your Google Sheet URL! All Facebook Ads, Google Ads, Voice & Pasted leads sync here.');
      }
    } catch (e: any) {
      setNotice(`Could not save Sheet URL: ${e.message}`);
    } finally {
      setIsSavingSheetUrl(false);
    }
  };

  // 1-Click: Create a brand-new native multi-tab Google Sheet in user's Google Drive (FB Ads & Google Ads Ready)
  const handleCreateNewSheetInDrive = async () => {
    setIsCreatingDriveSheet(true);
    setNotice(null);
    try {
      const res = await createNewCleanLeadsSheetInDrive();
      setGoogleSheetUrl(res.sheetUrl);
      setCreatedDriveSheetUrl(res.sheetUrl);
      setCreatedDriveSheetName(res.sheetName);
      setShowAdsConnectPanel(true);
      setNotice(
        `✓ Created new multi-tab Google Sheet "${res.sheetName}" inside "${TIDYUPS_DRIVE_FOLDER_NAME}" in your Google Drive and connected it! Ready for Facebook Ads & Google Ads.`
      );
    } catch (err: any) {
      setNotice(`Could not create Google Sheet in Drive: ${err?.message || 'Please allow Google Drive access.'}`);
    } finally {
      setIsCreatingDriveSheet(false);
    }
  };

  // Confirmed handler: Sync all current rows directly to the live Google Sheet in Google Drive
  const handleConfirmedSyncToDriveSheet = async () => {
    setConfirmDriveSyncModal(false);
    setIsSyncingDriveSheet(true);
    setNotice(null);
    try {
      const match = googleSheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      const currentId = match ? match[1] : LEADS_SPREADSHEET_ID;
      const res = await syncLeadsToLiveGoogleSheetInDrive({ spreadsheetId: currentId });
      setGoogleSheetUrl(res.sheetUrl);
      if (res.spreadsheetId !== LEADS_SPREADSHEET_ID && res.spreadsheetId !== SECONDARY_LEADS_SPREADSHEET_ID) {
        setCreatedDriveSheetUrl(res.sheetUrl);
        setCreatedDriveSheetName(res.sheetName);
      }
      setNotice(
        `✓ Synced ${leadsList.length} lead row(s) across all tabs directly into your live Google Sheet in Google Drive!`
      );
    } catch (err: any) {
      setNotice(`Could not sync to Google Sheet in Drive: ${err?.message || 'Check Google Drive authorization.'}`);
    } finally {
      setIsSyncingDriveSheet(false);
    }
  };

  // Cookie-free in-memory downloads (.xlsx and .csv) that never hit the .run.app security cookie screen
  const handleDownloadXlsx = async () => {
    setIsDownloadingFile('XLSX');
    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      await downloadFileFromApiWithoutNavigation(
        `/api/leads/export.xlsx?project=${projectId}`,
        `TidyUps_Clean_Leads_Google_Sheet_${dateStr}.xlsx`
      );
      setNotice('✓ Downloaded multi-tab Clean Google Sheet (.xlsx) without leaving the app!');
    } catch (err: any) {
      setNotice(`Download error: ${err?.message}`);
    } finally {
      setIsDownloadingFile(null);
    }
  };

  const handleDownloadCsv = async () => {
    setIsDownloadingFile('CSV');
    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      await downloadFileFromApiWithoutNavigation(
        `/api/leads/export.csv?project=${projectId}&tab=${encodeURIComponent(activeTab)}`,
        `TidyUps_Clean_Leads_${dateStr}.csv`
      );
      setNotice('✓ Downloaded Clean Leads (.csv) without leaving the app!');
    } catch (err: any) {
      setNotice(`CSV export error: ${err?.message}`);
    } finally {
      setIsDownloadingFile(null);
    }
  };

  const handleCopyHelper = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSendTestWebhookLead = async (platform: 'Facebook Leads' | 'Google Leads') => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/leads/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_tab: platform,
          first_name: platform === 'Facebook Leads' ? 'Sarah (FB Ad Test)' : 'David (Google Ad Test)',
          last_name: 'Edmonton',
          phone_number: '780-555-0148',
          email: 'leadtest@tidyupscleaning.com',
          street_address: '10420 98 Ave NW',
          city: 'Edmonton',
          post_code: 'T5K 0A1',
          service: '3Bed 2Bath Deep Cleaning',
          bedrooms: '3 Bedrooms',
          bathrooms: '2 Bathrooms',
          campaign_name: `${platform} Direct Webhook`,
          message: `Test inbound lead from ${platform} connector`,
        }),
      });
      const data = await res.json();
      if (data.success && data.lead) {
        setLeadsList((prev) => [data.lead, ...prev]);
        setNotice(data.message || `✓ Test ${platform} lead received!`);
      }
    } catch (err: any) {
      setNotice(`Webhook test failed: ${err?.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // 1-Click: Populate sample Facebook, Google, and Pasted leads so all 4 channel colors are visible in the table and Google Sheet
  const handleAddSampleMultiChannelLeads = async () => {
    setIsSyncing(true);
    setNotice(null);
    try {
      const sampleRows = [
        {
          source_tab: 'FB Leads',
          source: 'Facebook Lead Ads',
          first_name: 'Sarah',
          last_name: 'Jenkins (Facebook Ad)',
          phone_number: '780-555-0148',
          email: 'sarah.jenkins@example.com',
          street_address: '10420 98 Ave NW',
          city: 'Edmonton',
          post_code: 'T5K 0A1',
          service: '3Bed 2Bath Deep Cleaning',
          bedrooms: '3 Bedrooms',
          bathrooms: '2 Bathrooms',
          quotedAmount: 265.0,
          campaign_name: 'FB Lead Ads — Fall Deep Clean Promo',
          message: 'Facebook Lead Form — Requested Friday morning deep clean + inside oven.',
        },
        {
          source_tab: 'Google Leads',
          source: 'Google Ads / LSA',
          first_name: 'David',
          last_name: 'Chen (Google Search Ad)',
          phone_number: '780-555-0194',
          email: 'david.chen@example.com',
          street_address: '8820 Jasper Ave NW',
          city: 'Edmonton',
          post_code: 'T5H 4E8',
          service: 'Move-Out Full House Cleaning',
          bedrooms: '4 Bedrooms',
          bathrooms: '2.5 Bathrooms',
          quotedAmount: 345.0,
          campaign_name: 'Google Local Services — Move-Out Clean',
          message: 'Google Ads Lead Extension — Move-out inspection on Saturday.',
        },
        {
          source_tab: 'Pasted Leads',
          source: 'Pasted / Manual Table',
          first_name: 'Amanda',
          last_name: 'Kowalski (Pasted Table)',
          phone_number: '780-555-0271',
          email: 'amanda.k@example.com',
          street_address: '5210 106 St NW',
          city: 'Edmonton',
          post_code: 'T6H 2S9',
          service: 'Bi-Weekly Standard Residential Cleaning',
          bedrooms: '3 Bedrooms',
          bathrooms: '2 Bathrooms',
          quotedAmount: 198.5,
          campaign_name: 'Spreadsheet Paste Import',
          message: 'Imported via Paste Table — Recurring bi-weekly inquiry.',
        },
      ];
      const added: AdLeadItem[] = [];
      for (const payload of sampleRows) {
        const r = await fetch('/api/leads/webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const d = await r.json();
        if (d.success && d.lead) {
          added.push(d.lead);
        }
      }
      if (added.length > 0) {
        const nextList = [...added, ...leadsList];
        setLeadsList(nextList);
        if (onLeadsUpdated) onLeadsUpdated(nextList);
        setNotice(
          '✓ Added sample 🔵 Facebook, 🟢 Google, and 🟠 Pasted leads alongside your 🟣 Voice Quote! Click "✨ Sync & Style Google Sheet" to push all colors & frozen headers to Google Drive.'
        );
      }
    } catch (err: any) {
      setNotice(`Could not add sample leads: ${err?.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Add Pasted Rows (and optionally run Step 1: Create Client in Jobber -> Step 2: Create Request or Quote in Jobber)
  const handleImportPastedRows = async (syncToJobber: boolean, createRequestOnly: boolean = false) => {
    if (parsedPreviewRows.length === 0) return;
    setIsSyncing(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/leads?project=${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-project-id': projectId },
        body: JSON.stringify({
          leads: parsedPreviewRows,
          sourceTab: targetSheetTab,
          syncToJobber,
          createRequestOnly,
        }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.leads)) {
        setLeadsList(data.leads);
        if (onLeadsUpdated) onLeadsUpdated(data.leads);
        if (data.quotes && onQuotesUpdated) onQuotesUpdated(data.quotes);
        if (data.clients && onClientsUpdated) onClientsUpdated(data.clients);
        setPasteText('');
        setNotice(data.message || `✓ Added ${parsedPreviewRows.length} lead(s) to ${targetSheetTab}!`);
      } else {
        setNotice(data.error || 'Failed to add pasted leads.');
      }
    } catch (err: any) {
      setNotice(`Error importing rows: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Add Quick Single Lead Row (and optionally run Step 1: Create Client in Jobber -> Step 2: Create Request or Quote in Jobber)
  const handleAddQuickSingleRow = async (syncToJobber: boolean, createRequestOnly: boolean = false) => {
    if (!quickName.trim() && !quickPhone.trim()) {
      setNotice('Please enter at least a Client Name or Phone Number.');
      return;
    }
    setIsSyncing(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/leads?project=${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-project-id': projectId },
        body: JSON.stringify({
          customerName: quickName.trim() || 'New Clean Sheet Client',
          phone: quickPhone.trim(),
          address: quickAddress.trim() || 'Edmonton, AB',
          city: 'Edmonton',
          bedrooms: quickBedrooms,
          bathrooms: quickBathrooms,
          serviceRequested: quickService,
          quotedAmount: parseFloat(quickPrice) || 221.07,
          notes: quickNotes.trim(),
          sourceTab: targetSheetTab,
          syncToJobber,
          createRequestOnly,
        }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.leads)) {
        setLeadsList(data.leads);
        if (onLeadsUpdated) onLeadsUpdated(data.leads);
        if (data.quotes && onQuotesUpdated) onQuotesUpdated(data.quotes);
        if (data.clients && onClientsUpdated) onClientsUpdated(data.clients);
        setQuickName('');
        setQuickPhone('');
        setQuickAddress('');
        setQuickNotes('');
        setNotice(data.message || `✓ Added row to ${targetSheetTab}!`);
      }
    } catch (err: any) {
      setNotice(`Error adding row: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // 1-Click Sync Row to Jobber: Step 1 (Create Client & Property in Jobber) -> Step 2 (Create Request or Quote in Jobber)
  const handleSyncRowToJobber = async (lead: AdLeadItem, createRequestOnly: boolean = false) => {
    setSyncingRowId(lead.id);
    setNotice(null);
    try {
      const res = await fetch(`/api/leads/${encodeURIComponent(lead.id)}/sync-jobber?project=${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-project-id': projectId },
        body: JSON.stringify({ createRequestOnly }),
      });
      const data = await res.json();
      if (data.success) {
        if (Array.isArray(data.leads)) {
          setLeadsList(data.leads);
          if (onLeadsUpdated) onLeadsUpdated(data.leads);
        }
        if (Array.isArray(data.quotes) && onQuotesUpdated) {
          onQuotesUpdated(data.quotes);
        }
        if (Array.isArray(data.clients) && onClientsUpdated) {
          onClientsUpdated(data.clients);
        }
        setNotice(
          data.message ||
            `✓ Step 1: Created Client "${lead.customerName}" in Jobber → Step 2: Created ${
              createRequestOnly ? 'Request' : `Quote ${data.quote?.quoteNumber || ''}`
            } in Jobber!`
        );
      } else {
        setNotice(data.error || 'Could not sync row to Jobber.');
      }
    } catch (err: any) {
      setNotice(`Jobber sync error: ${err.message}`);
    } finally {
      setSyncingRowId(null);
    }
  };

  // Reset Clean Sheet to Blank (or keep only live Jobber-synced quotes like Rahum #4293)
  const handleClearCleanSheet = async (keepSyncedQuotes: boolean) => {
    setIsSyncing(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/leads/clear-sheet?project=${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-project-id': projectId },
        body: JSON.stringify({ keepSyncedQuotes }),
      });
      const data = await res.json();
      if (data.success) {
        setLeadsList(data.leads || []);
        if (onLeadsUpdated) onLeadsUpdated(data.leads || []);
        setNotice(data.message);
      }
    } catch (err: any) {
      setNotice(`Error resetting sheet: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Copy Clean Sheet Table as TSV to paste into any blank Google Sheet
  const handleCopySheetAsTsv = () => {
    const headers = [
      'Date',
      'Sheet Tab',
      'Source',
      'Client Name',
      'Phone',
      'Email',
      'Street Address',
      'City',
      'Postal Code',
      'Bedrooms',
      'Bathrooms',
      'Service Requested',
      'Quoted Total ($)',
      'Jobber Quote #',
      'Jobber Quote Link',
      'Verdict',
      'Status',
      'Notes',
    ];
    const rows = filteredLeads.map((l) => {
      const numericQuoteId = extractJobberNumericId(l.quoteId);
      const quoteLink = numericQuoteId
        ? `https://secure.getjobber.com/quotes/${numericQuoteId}`
        : 'https://secure.getjobber.com/quotes';
      return [
        (l.dateReceived || new Date().toISOString()).slice(0, 10),
        (l as any).sourceTab || 'Voice & Quick Quotes',
        l.source || 'Voice / Quick Quote',
        l.customerName || '',
        l.phone || '',
        l.email || '',
        l.address || '',
        l.city || 'Edmonton',
        l.postalCode || '',
        l.bedrooms || '3 Bedrooms',
        l.bathrooms || '2 Bathrooms',
        l.serviceRequested || '',
        l.quotedAmount !== undefined ? Number(l.quotedAmount).toFixed(2) : '',
        l.quoteNumber || '',
        quoteLink,
        l.verdict || 'Good lead',
        l.status || 'New',
        (l.notes || '').replace(/\r?\n/g, ' '),
      ].join('\t');
    });
    const tsv = [headers.join('\t'), ...rows].join('\n');
    navigator.clipboard.writeText(tsv);
    setCopiedTsv(true);
    setTimeout(() => setCopiedTsv(false), 2500);
    setNotice('✓ Copied Clean Sheet rows (with headers) to clipboard — press Ctrl+V / Cmd+V in Row 1 of your blank Google Sheet!');
  };

  const handleUpdateVerdict = async (leadId: string, verdict: LeadVerdict) => {
    const updated = leadsList.map((l) => (l.id === leadId ? { ...l, verdict } : l));
    setLeadsList(updated);
    if (onLeadsUpdated) onLeadsUpdated(updated);
    await fetch(`/api/leads/${encodeURIComponent(leadId)}?project=${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-project-id': projectId },
      body: JSON.stringify({ verdict }),
    }).catch(() => {});
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0d0f17] text-slate-100 font-sans p-4 sm:p-6 lg:p-8 space-y-6 animate-fadeIn min-h-[calc(100vh-4rem)]">
      {/* Top Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-lg shrink-0">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Clean Google Sheet Hub — FB Leads, Google Leads, Voice Quotes &amp; Paste Table
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Jobber Order: 1. Create Client → 2. Create Request / Quote
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              A brand-new, clean multi-tab Google Sheets workspace with zero old clutter. Paste Facebook Leads, Google Leads, or create Voice Quotes — and sync any row to Jobber in strict order (Client first, then Request or Quote).
            </p>
          </div>
        </div>

        {/* Top Right Export & Reset Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {onOpenJobberModal && (
            <button
              type="button"
              onClick={onOpenJobberModal}
              className="px-3.5 py-2 bg-[#1b2234] hover:bg-[#232c42] text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Open Jobber Developer App & OAuth Credentials Hub"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>Jobber Credentials &amp; Secret</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCreateNewSheetInDrive}
            disabled={isCreatingDriveSheet}
            className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
            title={`Create a brand-new native multi-tab Google Sheet inside "${TIDYUPS_DRIVE_FOLDER_NAME}" in your Google Drive for Facebook Ads & Google Ads`}
          >
            <CloudUpload className="w-3.5 h-3.5" />
            <span>
              {isCreatingDriveSheet
                ? 'Creating Sheet in Google Drive...'
                : '+ Create New Leads Sheet in Drive'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setConfirmDriveSyncModal(true)}
            disabled={isSyncingDriveSheet}
            className="px-3.5 py-2 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-600 hover:to-emerald-600 text-white border border-teal-400/40 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
            title="Sync all current leads and apply Frozen Headers, Executive Title Banner, Channel Colors (Blue FB, Green Google, Purple Voice, Amber Pasted) & Summary Footer to your live Google Sheet in Drive"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingDriveSheet ? 'animate-spin' : ''}`} />
            <span>
              {isSyncingDriveSheet
                ? 'Formatting & Syncing Sheet...'
                : '✨ Sync & Style Google Sheet (Freeze Headers + Colors)'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleDownloadXlsx}
            disabled={isDownloadingFile !== null}
            className="px-3.5 py-2 bg-[#1b2234] hover:bg-[#232c42] text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Download Styled Multi-Tab Clean Google Sheet (.xlsx) with Frozen Headers & Source Colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isDownloadingFile === 'XLSX' ? 'Downloading...' : 'Download Styled .XLSX'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={isDownloadingFile !== null}
            className="px-3 py-2 bg-[#1b2234] hover:bg-[#232c42] text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isDownloadingFile === 'CSV' ? 'Exporting...' : 'Export CSV'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopySheetAsTsv}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            {copiedTsv ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedTsv ? 'Copied for Google Sheets!' : 'Copy Clean Table'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleClearCleanSheet(false)}
            className="px-3 py-2 bg-rose-950/70 hover:bg-rose-900/80 text-rose-200 border border-rose-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Wipe all rows so your Clean Google Sheet is 100% blank"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Reset Blank</span>
          </button>
        </div>
      </div>

      {/* Explicit Confirmation Modal Before Updating Live Google Sheet in Drive (per Workspace skill rules) */}
      {confirmDriveSyncModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#151926] border border-slate-700 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-extrabold text-white">
                  Sync &amp; Apply Visual Table Formatting to Live Google Sheet?
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  This will update your connected Google Sheet in Google Drive with{' '}
                  <strong className="text-emerald-300 font-mono">{leadsList.length}</strong> active lead row(s) and apply full visual spreadsheet styling across all tabs:
                </p>
                <ul className="text-[11px] text-slate-300 space-y-1 bg-[#0d111c] p-3 rounded-xl border border-slate-800">
                  <li>📌 <strong>Frozen Top 3 Header Rows:</strong> Executive Title Banner + 5-Color Channel KPI Bar + AutoFilter Column Headers stay pinned when scrolling</li>
                  <li>🔵 <strong>Facebook Leads:</strong> Royal Facebook Blue (<code>#1877F2</code>) badges &amp; soft Sky-Blue table rows</li>
                  <li>🟢 <strong>Google Leads:</strong> Google Emerald Green (<code>#0F9D58</code>) badges &amp; soft Mint-Green table rows</li>
                  <li>🟣 <strong>Voice &amp; Quick Quotes:</strong> Royal Purple (<code>#7C3AED</code>) badges &amp; soft Lavender table rows</li>
                  <li>🟠 <strong>Pasted Leads:</strong> Warm Amber (<code>#D97706</code>) badges &amp; soft Gold table rows</li>
                  <li>📊 <strong>Table Summary Footer:</strong> Live <code>=SUM(...)</code> Quoted Total + Channel Color Legend Table at the bottom</li>
                </ul>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmDriveSyncModal(false)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmedSyncToDriveSheet}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold cursor-pointer"
              >
                Confirm &amp; Style Google Sheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Banner */}
      {notice && (
        <div className="p-4 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs sm:text-sm font-bold flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{notice}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={googleSheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1"
            >
              <span>Open Sheet</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-emerald-300 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Connected Google Sheet URL Bar + Preset Switcher + 1-Click Create in Drive */}
      <div className="p-4 rounded-2xl bg-[#131724] border border-slate-800 space-y-3">
        {/* Row 1: Quick Sheet Switcher (Existing Primary / Existing Secondary / Newly Created Drive Sheet) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-bold mr-1">Active Sheet Source:</span>
            <button
              type="button"
              onClick={() => {
                setGoogleSheetUrl(defaultPrimarySheetUrl);
                handleSaveSheetUrl(defaultPrimarySheetUrl);
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                googleSheetUrl.includes(LEADS_SPREADSHEET_ID)
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Existing Primary Leads Sheet (1TifULi7n...)
            </button>

            <button
              type="button"
              onClick={() => {
                setGoogleSheetUrl(defaultSecondarySheetUrl);
                handleSaveSheetUrl(defaultSecondarySheetUrl);
              }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                googleSheetUrl.includes(SECONDARY_LEADS_SPREADSHEET_ID)
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Secondary Leads Sheet (1-1palHc...)
            </button>

            {createdDriveSheetUrl && (
              <button
                type="button"
                onClick={() => {
                  setGoogleSheetUrl(createdDriveSheetUrl);
                  handleSaveSheetUrl(createdDriveSheetUrl);
                }}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  googleSheetUrl === createdDriveSheetUrl
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-800 text-teal-300 hover:bg-slate-700 border border-teal-500/40'
                }`}
              >
                New Drive Sheet ({createdDriveSheetName || 'FB & Google Ads Sheet'})
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleSyncQuoMissedCallsAndTranscripts}
              disabled={isSyncingQuoCalls}
              className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              title="Pull live Quo / OpenPhone calls, missed calls answered by Sonia AI, and voicemail transcripts into your Clean Google Sheet"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingQuoCalls ? 'animate-spin' : ''}`} />
              <span>
                {isSyncingQuoCalls
                  ? 'Syncing Quo Transcripts...'
                  : '🎙️ Sync Missed Call & Sonia AI Transcripts'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowQuoCallsPanel((v) => !v)}
              className="px-3 py-1 rounded-lg bg-purple-600/25 hover:bg-purple-600/40 border border-purple-500/40 text-purple-200 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5 text-purple-300" />
              <span>
                {showQuoCallsPanel
                  ? `Hide Call Transcripts (${quoCallsList.length})`
                  : `View Call & Voicemail Transcripts (${quoCallsList.length})`}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowAdsConnectPanel((v) => !v)}
              className="px-3 py-1 rounded-lg bg-blue-600/25 hover:bg-blue-600/40 border border-blue-500/40 text-blue-200 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>
                {showAdsConnectPanel
                  ? 'Hide FB Ads & Google Ads Connector'
                  : 'Connect FB Ads & Google Ads to Sheet'}
              </span>
            </button>
          </div>
        </div>

        {/* Row 2: Active URL Input + Open Google Sheet + Create New Sheet in Drive */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-1">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs font-extrabold text-slate-300 whitespace-nowrap">
              Connected Google Sheet URL:
            </span>
            <input
              type="text"
              value={googleSheetUrl}
              onChange={(e) => setGoogleSheetUrl(e.target.value)}
              placeholder="Paste your Google Sheet link here (https://docs.google.com/spreadsheets/d/...)"
              className="flex-1 px-3 py-1.5 rounded-xl bg-[#0b0e17] border border-slate-700 text-xs text-emerald-300 font-mono focus:outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={() => handleSaveSheetUrl()}
              disabled={isSavingSheetUrl}
              className="px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-200 text-xs font-bold cursor-pointer whitespace-nowrap"
            >
              {isSavingSheetUrl ? 'Saving...' : 'Save Sheet Link'}
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={googleSheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5 text-white" />
              <span>Open Google Sheet</span>
            </a>

            <button
              type="button"
              onClick={handleCreateNewSheetInDrive}
              disabled={isCreatingDriveSheet}
              className="px-3 py-1.5 rounded-xl bg-teal-600/30 hover:bg-teal-600/50 border border-teal-500/40 text-teal-200 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
            >
              <CloudUpload className="w-3.5 h-3.5 text-teal-300" />
              <span>
                {isCreatingDriveSheet ? 'Creating in Drive...' : '+ Create New Sheet in Drive'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowPasteBox((v) => !v)}
              className="px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-purple-400" />
              <span>{showPasteBox ? 'Hide Paste Table' : 'Show Paste Table'}</span>
            </button>
          </div>
        </div>

        {/* Collapsible Facebook Lead Ads & Google Ads Connection Panel */}
        {showAdsConnectPanel && (
          <div className="mt-3 pt-3 border-t border-slate-800 bg-[#0d111c] rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-400" />
                  <span>Connect Facebook Lead Ads &amp; Google Ads to Your Active Sheet</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Use these exact details in Meta Lead Ads, Google Ads Lead Form Extensions, Zapier, or Make.com to stream new ad leads straight into your Google Sheet and this dashboard.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSendTestWebhookLead('Facebook Leads')}
                  className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold cursor-pointer"
                >
                  + Test FB Ad Lead
                </button>
                <button
                  type="button"
                  onClick={() => handleSendTestWebhookLead('Google Leads')}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold cursor-pointer"
                >
                  + Test Google Ad Lead
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* 1. Active Spreadsheet ID */}
              <div className="p-3 rounded-xl bg-[#131724] border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400">1. Active Spreadsheet ID</span>
                  <button
                    type="button"
                    onClick={() => {
                      const id =
                        googleSheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1] ||
                        LEADS_SPREADSHEET_ID;
                      handleCopyHelper('sheetId', id);
                    }}
                    className="text-[11px] text-emerald-400 hover:underline font-bold cursor-pointer"
                  >
                    {copiedField === 'sheetId' ? 'Copied!' : 'Copy ID'}
                  </button>
                </div>
                <div className="font-mono text-[11px] text-emerald-300 bg-[#0b0e17] px-2.5 py-1.5 rounded border border-slate-800 truncate">
                  {googleSheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1] ||
                    LEADS_SPREADSHEET_ID}
                </div>
                <p className="text-[10px] text-slate-400">
                  Tabs auto-created: <strong className="text-slate-200">Facebook Leads</strong>,{' '}
                  <strong className="text-slate-200">Google Leads</strong>,{' '}
                  <strong className="text-slate-200">ScrubbyBuilder Leads</strong>
                </p>
              </div>

              {/* 2. Direct Inbound Webhook URL */}
              <div className="p-3 rounded-xl bg-[#131724] border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400">
                    2. Direct FB / Google Ads Webhook URL
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyHelper('webhook', webhookUrl)}
                    className="text-[11px] text-blue-400 hover:underline font-bold cursor-pointer"
                  >
                    {copiedField === 'webhook' ? 'Copied!' : 'Copy Webhook'}
                  </button>
                </div>
                <div className="font-mono text-[11px] text-blue-300 bg-[#0b0e17] px-2.5 py-1.5 rounded border border-slate-800 truncate">
                  {webhookUrl}
                </div>
                <p className="text-[10px] text-slate-400">
                  Paste in Google Ads Lead Form Webhook or Zapier/Make POST action.
                </p>
              </div>

              {/* 3. 20-Column Lead Schema */}
              <div className="p-3 rounded-xl bg-[#131724] border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400">
                    3. 20-Column Ad Lead Headers
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyHelper('headers', APP_LEAD_HEADERS.join('\t'))}
                    className="text-[11px] text-purple-400 hover:underline font-bold cursor-pointer"
                  >
                    {copiedField === 'headers' ? 'Copied Headers!' : 'Copy Header Row'}
                  </button>
                </div>
                <div className="font-mono text-[10px] text-slate-300 bg-[#0b0e17] px-2.5 py-1.5 rounded border border-slate-800 truncate">
                  {APP_LEAD_HEADERS.join(' | ')}
                </div>
                <p className="text-[10px] text-slate-400">
                  Matches Facebook Lead Ads &amp; TidyUps Day-3 Lead Processor schema.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Collapsible Quo / Sonia AI Missed Calls & Voicemail Transcripts Panel */}
        {showQuoCallsPanel && (
          <div className="mt-3 pt-3 border-t border-slate-800 bg-[#0d111c] rounded-2xl p-4 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-md bg-[#7C3AED] text-white text-[11px] font-extrabold">
                    🎙️ QUO / OPENPHONE + SONIA AI SCREENER
                  </span>
                  <h3 className="text-xs sm:text-sm font-extrabold text-white">
                    Missed Calls, Sonia AI Assistant &amp; Voicemail Transcripts → Clean Google Sheet
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold font-mono">
                    Webhook Active: https://app.tidyupscleaning.com/api/quo/webhook
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1">
                  When a caller misses you and leaves a message with <strong>Sonia (Tidyups AI Cleaning Assistant)</strong> or voicemail asking for a cleaning, their full <strong>Transcript &amp; AI Summary</strong> is automatically connected and added to your <strong>🟣 Voice &amp; Quick Quotes</strong> Google Sheet tab. Non-cleaning calls (Yelp ad reps, car lease reps, personal callbacks) are automatically filtered so they don&apos;t clutter your Lead Sheet.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleSyncQuoMissedCallsAndTranscripts}
                  disabled={isSyncingQuoCalls}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingQuoCalls ? 'animate-spin' : ''}`} />
                  <span>{isSyncingQuoCalls ? 'Pulling Live Quo Calls...' : 'Pull Latest Calls & Transcripts Now'}</span>
                </button>
              </div>
            </div>

            {quoCallsList.length === 0 ? (
              <div className="p-4 rounded-xl bg-[#131724] border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                <span>Click &ldquo;Pull Latest Calls &amp; Transcripts Now&rdquo; to load today&apos;s Quo / Sonia AI calls and sync cleaning transcripts to your sheet.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto pr-1">
                {quoCallsList.slice(0, 12).map((call) => {
                  const isCleaning = Boolean(call.hasCleaningIntent) || call.status === 'CLEANING_LEAD' || call.status === 'MATCHED_TO_QUOTE';
                  const callDigits = String(call.callerPhone || '').replace(/\D/g, '');
                  const normCallDigits = callDigits.length === 11 && callDigits.startsWith('1') ? callDigits.slice(1) : callDigits;
                  const isBlocked =
                    Boolean(call.isBlocked) ||
                    call.status === 'SOLICITOR_BLOCKED' ||
                    (normCallDigits &&
                      (spamShieldConfig?.blockedNumbers || []).some((b: string) => {
                        const bd = String(b || '').replace(/\D/g, '');
                        const nb = bd.length === 11 && bd.startsWith('1') ? bd.slice(1) : bd;
                        return nb === normCallDigits;
                      }));
                  const isExpanded = expandedTranscriptId === call.id;
                  const dateLabel = String(call.timestamp || '').replace('T', ' ').slice(0, 16);
                  return (
                    <div
                      key={call.id}
                      className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                        isBlocked
                          ? 'bg-rose-950/35 border-rose-500/50'
                          : isCleaning
                          ? 'bg-purple-950/35 border-purple-500/50'
                          : 'bg-[#131724] border-slate-800/90'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-white">{call.callerName || call.callerPhone}</span>
                            <span className="font-mono text-emerald-300 text-[11px]">{call.callerPhone}</span>
                            {call.answeredByAi && (
                              <span className="px-1.5 py-0.5 rounded bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-[10px] font-bold">
                                🤖 Screened by Sonia AI
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {dateLabel} UTC • {call.lineName || 'Dispatch Line'} • {call.duration || 0}s
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                              isBlocked
                                ? 'bg-rose-600 text-white'
                                : isCleaning
                                ? 'bg-emerald-500/25 border border-emerald-500/50 text-emerald-200'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {isBlocked
                              ? '🚫 Blocked in DB'
                              : isCleaning
                              ? '✅ Cleaning Lead → On Sheet'
                              : '🛡️ Screened Call'}
                          </span>
                          {onToggleBlockScreenedCall && (
                            <button
                              type="button"
                              disabled={togglingBlockId === call.id}
                              onClick={async () => {
                                setTogglingBlockId(call.id);
                                const res = await onToggleBlockScreenedCall({
                                  callId: call.id,
                                  callerPhone: call.callerPhone,
                                  callerName: call.callerName,
                                  reason: call.summary
                                    ? `Screened Call (${call.callerName || call.callerPhone}): ${String(call.summary).slice(0, 80)}`
                                    : undefined,
                                  block: !isBlocked,
                                });
                                if (res?.calls) setQuoCallsList(res.calls);
                                setTogglingBlockId(null);
                              }}
                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold cursor-pointer transition-all ${
                                isBlocked
                                  ? 'bg-slate-800 hover:bg-emerald-700 text-slate-200 border border-slate-600'
                                  : 'bg-rose-600 hover:bg-rose-500 text-white'
                              }`}
                            >
                              {togglingBlockId === call.id ? '...' : isBlocked ? 'Unblock' : '🚫 Block'}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-200 bg-black/30 p-2 rounded-lg border border-slate-800/80">
                        <strong className="text-purple-300">AI Summary:</strong>{' '}
                        {call.summary || 'No summary text'}
                      </div>

                      {call.transcriptText && (
                        <div>
                          <button
                            type="button"
                            onClick={() => setExpandedTranscriptId(isExpanded ? null : call.id)}
                            className="text-[11px] text-purple-300 hover:text-purple-200 font-bold underline cursor-pointer"
                          >
                            {isExpanded ? 'Hide Full Call Transcript' : 'View Full Call Transcript'}
                          </button>
                          {isExpanded && (
                            <pre className="mt-1.5 p-2.5 rounded-lg bg-[#090c14] border border-purple-500/30 text-[11px] text-slate-200 font-mono whitespace-pre-wrap max-h-44 overflow-y-auto">
                              {call.transcriptText}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          CLEAN GOOGLE SHEET TABS (All / Facebook Leads / Google Leads / Voice & Quick Quotes / Pasted Leads)
         ───────────────────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {(
            [
              { id: 'ALL', label: 'All Clean Sheet Rows', badgeClass: 'bg-slate-700 text-white' },
              { id: 'Facebook Leads', label: 'Facebook Leads', badgeClass: 'bg-blue-600/30 text-blue-300' },
              { id: 'Google Leads', label: 'Google Leads', badgeClass: 'bg-amber-500/30 text-amber-300' },
              { id: 'Voice & Quick Quotes', label: 'Voice & Quick Quotes', badgeClass: 'bg-pink-600/30 text-pink-300' },
              { id: 'Pasted Leads', label: 'Pasted Leads', badgeClass: 'bg-purple-600/30 text-purple-300' },
            ] as { id: CleanSheetTab; label: string; badgeClass: string }[]
          ).map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id !== 'ALL') setTargetSheetTab(tab.id);
                }}
                className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg ring-2 ring-emerald-500/30'
                    : 'bg-[#141824] hover:bg-[#1c2233] text-slate-300 border border-slate-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-black/30 text-white' : tab.badgeClass
                  }`}
                >
                  {tabCounts[tab.id]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Verdict Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, phone, quote #4293..."
              className="pl-8 pr-3 py-2 rounded-xl bg-[#141824] border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500 w-56"
            />
          </div>
          <select
            value={verdictFilter}
            onChange={(e) => setVerdictFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-[#141824] border border-slate-800 text-xs text-slate-200 font-bold"
          >
            <option value="ALL">All Verdicts</option>
            <option value="Good lead">Good Lead</option>
            <option value="Spam">Spam</option>
            <option value="Garbage">Garbage</option>
          </select>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          PASTE TABLE & QUICK ADD WORKSPACE (For Facebook Leads, Google Leads, Voice & Pasted Leads)
         ───────────────────────────────────────────────────────────────────────────── */}
      {showPasteBox && (
        <div className="bg-gradient-to-br from-[#141928] via-[#131724] to-[#111520] border border-emerald-500/30 rounded-3xl p-5 space-y-4 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <ClipboardPaste className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm sm:text-base font-extrabold text-white">
                  Paste Table or Add New Lead → Clean Google Sheet &amp; Jobber (1. Client → 2. Request / Quote)
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Paste rows from Facebook Ads, Google Local Services, Excel/Sheets, or raw text — or add a single row below. Choose which tab it goes into and sync directly to Jobber.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300">Send into Sheet Tab:</span>
              <select
                value={targetSheetTab}
                onChange={(e) => setTargetSheetTab(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl bg-[#0b0e17] border border-emerald-500/50 text-emerald-300 text-xs font-extrabold"
              >
                <option value="Facebook Leads">Facebook Leads</option>
                <option value="Google Leads">Google Leads</option>
                <option value="Voice & Quick Quotes">Voice &amp; Quick Quotes</option>
                <option value="Pasted Leads">Pasted Leads</option>
              </select>
            </div>
          </div>

          {/* Quick Single-Row Add Bar */}
          <div className="p-3.5 rounded-2xl bg-[#0b0e17]/90 border border-slate-800 space-y-3">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400">
              Quick Single-Row Entry (into {targetSheetTab})
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
              <input
                type="text"
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                placeholder="Client Name (e.g. Rahum)"
                className="px-3 py-2 rounded-xl bg-[#141824] border border-slate-700 text-xs text-white"
              />
              <input
                type="text"
                value={quickPhone}
                onChange={(e) => setQuickPhone(e.target.value)}
                placeholder="Phone (e.g. 416-560-1354)"
                className="px-3 py-2 rounded-xl bg-[#141824] border border-slate-700 text-xs text-white"
              />
              <input
                type="text"
                value={quickAddress}
                onChange={(e) => setQuickAddress(e.target.value)}
                placeholder="Street Address, Edmonton"
                className="px-3 py-2 rounded-xl bg-[#141824] border border-slate-700 text-xs text-white lg:col-span-2"
              />
              <select
                value={quickBedrooms}
                onChange={(e) => setQuickBedrooms(e.target.value)}
                className="px-2.5 py-2 rounded-xl bg-[#141824] border border-slate-700 text-xs text-white"
              >
                <option value="1 Bedroom">1 Bedroom</option>
                <option value="2 Bedrooms">2 Bedrooms</option>
                <option value="3 Bedrooms">3 Bedrooms</option>
                <option value="4 Bedrooms">4 Bedrooms</option>
                <option value="5+ Bedrooms">5+ Bedrooms</option>
              </select>
              <select
                value={quickBathrooms}
                onChange={(e) => setQuickBathrooms(e.target.value)}
                className="px-2.5 py-2 rounded-xl bg-[#141824] border border-slate-700 text-xs text-white"
              >
                <option value="1 Bathroom">1 Bathroom</option>
                <option value="1.5 Bathrooms">1.5 Bathrooms</option>
                <option value="2 Bathrooms">2 Bathrooms</option>
                <option value="2.5 Bathrooms">2.5 Bathrooms</option>
                <option value="3+ Bathrooms">3+ Bathrooms</option>
              </select>
              <input
                type="number"
                step="0.01"
                value={quickPrice}
                onChange={(e) => setQuickPrice(e.target.value)}
                placeholder="Total $"
                className="px-3 py-2 rounded-xl bg-[#141824] border border-emerald-500/40 text-xs text-emerald-300 font-mono font-bold"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <input
                type="text"
                value={quickService}
                onChange={(e) => setQuickService(e.target.value)}
                placeholder="Service Requested (e.g. 3Bed 2Bath Basic Initial Cleaning)"
                className="flex-1 px-3 py-2 rounded-xl bg-[#141824] border border-slate-700 text-xs text-slate-200"
              />
              <input
                type="text"
                value={quickNotes}
                onChange={(e) => setQuickNotes(e.target.value)}
                placeholder="Notes (e.g. inside oven, pets, deposit $50)"
                className="flex-1 px-3 py-2 rounded-xl bg-[#141824] border border-slate-700 text-xs text-slate-200"
              />
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={() => handleAddQuickSingleRow(false, false)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Add to Sheet Only</span>
                </button>
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={() => handleAddQuickSingleRow(true, true)}
                  className="px-3 py-2 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/40 text-cyan-200 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5 text-cyan-400" />
                  <span>1. Client → 2. Jobber Request + Sheet</span>
                </button>
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={() => handleAddQuickSingleRow(true, false)}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>1. Client → 2. Jobber Quote + Sheet</span>
                </button>
              </div>
            </div>
          </div>

          {/* Multi-Row Paste Table Box */}
          <div className="space-y-2">
            <label className="block text-[11px] font-extrabold uppercase tracking-wider text-purple-300">
              Bulk Paste Table (Paste from Google Sheets, Excel, Facebook Leads CSV, or Google Ads)
            </label>
            <textarea
              rows={3}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={`Paste 1 or more rows here (Tab, Comma, or Pipe separated):\nSarah Miller\t780-555-0192\t10420 Jasper Ave NW, Edmonton\t3 Bedrooms\t2.5 Bathrooms\tDeep Cleaning\t$285.00`}
              className="w-full p-3 rounded-2xl bg-[#0b0e17] border border-slate-700 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          {parsedPreviewRows.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-[#0b0e17] border border-emerald-500/40 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-emerald-300">
                  Ready to Import {parsedPreviewRows.length} Pasted Row(s) into [{targetSheetTab}]
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={() => handleImportPastedRows(false, false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
                  >
                    Add {parsedPreviewRows.length} Row(s) to Clean Sheet Only
                  </button>
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={() => handleImportPastedRows(true, true)}
                    className="px-3 py-1.5 rounded-xl bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/40 text-cyan-200 text-xs font-extrabold cursor-pointer"
                  >
                    1. Create Client → 2. Create Request in Jobber + Sheet
                  </button>
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={() => handleImportPastedRows(true, false)}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md cursor-pointer"
                  >
                    1. Create Client → 2. Create Quote in Jobber + Sheet
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-44">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-1.5 px-2">Client Name</th>
                      <th className="py-1.5 px-2">Phone</th>
                      <th className="py-1.5 px-2">Street Address</th>
                      <th className="py-1.5 px-2">Bed / Bath</th>
                      <th className="py-1.5 px-2">Service</th>
                      <th className="py-1.5 px-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedPreviewRows.map((r, i) => (
                      <tr key={i} className="border-b border-slate-800/50 text-slate-200">
                        <td className="py-1.5 px-2 font-bold text-white">{r.customerName}</td>
                        <td className="py-1.5 px-2 font-mono text-emerald-300">{r.phone || '—'}</td>
                        <td className="py-1.5 px-2">{r.address}</td>
                        <td className="py-1.5 px-2">
                          {r.bedrooms} • {r.bathrooms}
                        </td>
                        <td className="py-1.5 px-2">{r.serviceRequested}</td>
                        <td className="py-1.5 px-2 font-mono font-bold text-emerald-400">
                          ${r.quotedAmount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
      {/* ─────────────────────────────────────────────────────────────────────────────
          CLEAN GOOGLE SHEET LIVE SPREADSHEET TABLE (Frozen Headers + Source Colors + Summary Footer)
         ───────────────────────────────────────────────────────────────────────────── */}
      <div className="bg-[#121623] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        {/* Executive Title Header Banner */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-[#0f172a] via-[#131c33] to-[#0f292a] border-b border-slate-800 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2.5 flex-wrap">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="text-xs sm:text-sm font-extrabold text-white tracking-wide">
              ✨ TIDYUPS MASTER LEADS &amp; QUOTES TABLE ({filteredLeads.length} Row{filteredLeads.length === 1 ? '' : 's'})
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-extrabold">
              📌 Frozen Headers Active
            </span>
            <span className="text-[11px] text-slate-400">
              • Showing {activeTab === 'ALL' ? 'All Channels (Color-Coded)' : activeTab}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleAddSampleMultiChannelLeads}
              disabled={isSyncing}
              className="px-3 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-400/40 text-indigo-200 text-[11px] font-extrabold cursor-pointer transition-all"
              title="Add sample Facebook (Blue), Google (Green), and Pasted (Amber) rows so you can see all 4 source colors in this table and your Google Sheet"
            >
              + Add Sample FB / Google / Pasted Rows
            </button>

            <button
              type="button"
              onClick={() => setConfirmDriveSyncModal(true)}
              disabled={isSyncingDriveSheet}
              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-extrabold cursor-pointer transition-all"
            >
              ✨ Push Frozen Headers &amp; Colors to Google Sheet
            </button>

            {leadsList.length === 0 && (
              <button
                type="button"
                onClick={() => handleClearCleanSheet(true)}
                className="px-3 py-1 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold cursor-pointer"
              >
                Restore Live Jobber Quote #4293 (Rahum)
              </button>
            )}
          </div>
        </div>

        {/* 5-Color Channel Legend & Live KPI Bar (Matches Row 2 of Google Sheet) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 border-b border-slate-800 text-[11px] font-extrabold">
          <div className="px-3.5 py-2 bg-[#1e293b] text-white flex items-center justify-between border-r border-slate-700/60">
            <span>📊 TOTAL LEADS: {leadsList.length}</span>
            <span className="text-emerald-300 font-mono">
              ${leadsList.reduce((acc, l) => acc + (Number(l.quotedAmount) || 0), 0).toFixed(2)}
            </span>
          </div>
          <div className="px-3.5 py-2 bg-[#1877F2] text-white flex items-center justify-between border-r border-blue-400/30">
            <span>🔵 FACEBOOK LEADS</span>
            <span className="px-1.5 py-0.5 rounded bg-black/25 font-mono">
              {tabCounts['Facebook Leads']}
            </span>
          </div>
          <div className="px-3.5 py-2 bg-[#0F9D58] text-white flex items-center justify-between border-r border-emerald-400/30">
            <span>🟢 GOOGLE LEADS</span>
            <span className="px-1.5 py-0.5 rounded bg-black/25 font-mono">
              {tabCounts['Google Leads']}
            </span>
          </div>
          <div className="px-3.5 py-2 bg-[#7C3AED] text-white flex items-center justify-between border-r border-purple-400/30">
            <span>🟣 VOICE &amp; QUICK QUOTES</span>
            <span className="px-1.5 py-0.5 rounded bg-black/25 font-mono">
              {tabCounts['Voice & Quick Quotes']}
            </span>
          </div>
          <div className="px-3.5 py-2 bg-[#D97706] text-white flex items-center justify-between col-span-2 sm:col-span-1">
            <span>🟠 PASTED LEADS</span>
            <span className="px-1.5 py-0.5 rounded bg-black/25 font-mono">
              {tabCounts['Pasted Leads']}
            </span>
          </div>
        </div>

        {filteredLeads.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileSpreadsheet className="w-10 h-10 text-emerald-400/60 mx-auto" />
            <div className="text-base font-extrabold text-white">
              Your Clean Google Sheet ({activeTab === 'ALL' ? 'All Tabs' : activeTab}) is Ready &amp; Blank
            </div>
            <p className="text-xs text-slate-400 max-w-lg mx-auto">
              Use the Quick Single-Row Entry or Paste Table above to add Facebook Leads, Google Leads, or Pasted Leads — or click <strong>"+ Add Sample FB / Google / Pasted Rows"</strong> above to preview all 4 channel colors right away.
            </p>
          </div>
        ) : (
          <div className="overflow-auto max-h-[640px] relative">
            <table className="w-full text-left border-collapse text-xs">
              {/* FROZEN / STICKY TABLE HEADER */}
              <thead className="sticky top-0 z-20 bg-[#0b0f1a] shadow-lg border-b-2 border-emerald-500/50">
                <tr className="text-[11px] font-extrabold uppercase tracking-wider text-slate-200">
                  <th className="py-3.5 px-3 bg-[#0b0f1a] border-r border-slate-800/80">
                    Date &amp; Channel Color
                  </th>
                  <th className="py-3.5 px-3 bg-[#0b0f1a] border-r border-slate-800/80">
                    Client Name &amp; Contact
                  </th>
                  <th className="py-3.5 px-3 bg-[#0b0f1a] border-r border-slate-800/80">
                    Service Property Address
                  </th>
                  <th className="py-3.5 px-3 bg-[#0b0f1a] border-r border-slate-800/80">
                    Bed / Bath &amp; Service
                  </th>
                  <th className="py-3.5 px-3 bg-[#0b0f1a] border-r border-slate-800/80">
                    Quoted Total ($)
                  </th>
                  <th className="py-3.5 px-3 bg-[#0b0f1a] border-r border-slate-800/80">
                    Jobber Status (1. Client → 2. Quote)
                  </th>
                  <th className="py-3.5 px-3 bg-[#0b0f1a] border-r border-slate-800/80">
                    Verdict
                  </th>
                  <th className="py-3.5 px-3 bg-[#0b0f1a] text-right">
                    Jobber &amp; Quote Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredLeads.map((lead) => {
                  const rawTab = String((lead as any).sourceTab || '');
                  const rawSource = String(lead.source || '');
                  const combined = `${rawTab} ${rawSource}`.toLowerCase();

                  const isFacebook =
                    combined.includes('fb') ||
                    combined.includes('facebook') ||
                    combined.includes('meta');
                  const isGoogle =
                    combined.includes('google') || combined.includes('lsa');
                  const isPasted =
                    combined.includes('paste') || combined.includes('manual');

                  const rowTab = isFacebook
                    ? 'Facebook Leads'
                    : isGoogle
                    ? 'Google Leads'
                    : isPasted
                    ? 'Pasted Leads'
                    : 'Voice & Quick Quotes';

                  const rowColorClasses = isFacebook
                    ? 'border-l-4 border-l-[#1877F2] bg-blue-950/30 hover:bg-blue-900/40'
                    : isGoogle
                    ? 'border-l-4 border-l-[#0F9D58] bg-emerald-950/30 hover:bg-emerald-900/40'
                    : isPasted
                    ? 'border-l-4 border-l-[#D97706] bg-amber-950/30 hover:bg-amber-900/40'
                    : 'border-l-4 border-l-[#7C3AED] bg-purple-950/30 hover:bg-purple-900/40';

                  const badgeColorClasses = isFacebook
                    ? 'bg-[#1877F2] text-white shadow-xs'
                    : isGoogle
                    ? 'bg-[#0F9D58] text-white shadow-xs'
                    : isPasted
                    ? 'bg-[#D97706] text-white shadow-xs'
                    : 'bg-[#7C3AED] text-white shadow-xs';

                  const channelIcon = isFacebook
                    ? '🔵 '
                    : isGoogle
                    ? '🟢 '
                    : isPasted
                    ? '🟠 '
                    : '🟣 ';

                  const matchedQuote = quotes.find(
                    (q) =>
                      q.id === lead.quoteId ||
                      (lead.quoteNumber && q.quoteNumber === lead.quoteNumber)
                  );
                  const numericQuoteId =
                    extractJobberNumericId(matchedQuote?.id) ||
                    extractJobberNumericId(lead.quoteId);
                  const realJobberQuoteUrl = numericQuoteId
                    ? `https://secure.getjobber.com/quotes/${numericQuoteId}`
                    : matchedQuote?.jobberWebUri &&
                      !matchedQuote.jobberWebUri.endsWith('/quotes/4331')
                    ? matchedQuote.jobberWebUri
                    : null;

                  const numericClientId = extractJobberNumericId(
                    (lead as any).jobberClientId || matchedQuote?.jobberClientId
                  );
                  const realJobberClientUrl = numericClientId
                    ? `https://secure.getjobber.com/clients/${numericClientId}`
                    : null;

                  const isRowSyncing = syncingRowId === lead.id;

                  return (
                    <tr
                      key={lead.id}
                      className={`transition-colors ${rowColorClasses}`}
                    >
                      {/* Date & Sheet Tab */}
                      <td className="py-3.5 px-3 align-top whitespace-nowrap border-r border-slate-800/50">
                        <div className="font-mono text-[11px] text-slate-200 font-bold">
                          {(lead.dateReceived || '').slice(0, 10) || '2026-10-16'}
                        </div>
                        <span
                          className={`inline-block mt-1 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold ${badgeColorClasses}`}
                        >
                          {channelIcon}
                          {rowTab}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1 font-medium">
                          {lead.source || rowTab}
                        </div>
                      </td>

                      {/* Client Name & Phone */}
                      <td className="py-3.5 px-3 align-top border-r border-slate-800/50">
                        <div className="font-extrabold text-white text-sm">
                          {lead.customerName}
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-300 font-mono text-xs mt-0.5">
                          <Phone className="w-3 h-3 shrink-0" />
                          <span>{lead.phone || 'No phone'}</span>
                        </div>
                        {lead.email && (
                          <div className="flex items-center gap-1 text-slate-300 text-[11px] mt-0.5">
                            <Mail className="w-3 h-3 shrink-0" />
                            <span>{lead.email}</span>
                          </div>
                        )}
                      </td>

                      {/* Property Address */}
                      <td className="py-3.5 px-3 align-top max-w-[220px] border-r border-slate-800/50">
                        <div className="flex items-start gap-1.5 text-slate-100 font-semibold">
                          <MapPin className="w-3.5 h-3.5 text-pink-400 shrink-0 mt-0.5" />
                          <span>
                            {lead.address || 'Edmonton, AB'}
                            {lead.postalCode ? `, ${lead.postalCode}` : ''}
                          </span>
                        </div>
                      </td>

                      {/* Bed / Bath & Service */}
                      <td className="py-3.5 px-3 align-top max-w-[260px] border-r border-slate-800/50">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span className="px-2 py-0.5 rounded bg-indigo-500/25 text-indigo-200 text-[10px] font-bold flex items-center gap-1">
                            <BedDouble className="w-3 h-3" />
                            {lead.bedrooms || '3 Bedrooms'}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-cyan-500/25 text-cyan-200 text-[10px] font-bold flex items-center gap-1">
                            <Bath className="w-3 h-3" />
                            {lead.bathrooms || '2 Bathrooms'}
                          </span>
                        </div>
                        <div className="font-bold text-white">
                          {lead.serviceRequested || 'Residential Standard Cleaning'}
                        </div>
                        {((lead as any).aiSummary || (lead as any).transcriptText) && (
                          <div className="mt-1.5 p-2 rounded-lg bg-purple-950/50 border border-purple-500/40 space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[10px] font-extrabold text-purple-200">
                                {(lead as any).answeredByAi
                                  ? '🤖 Sonia AI Screener Transcript'
                                  : '🎙️ Quo Call Transcript Connected'}
                              </span>
                              {(lead as any).transcriptText && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedTranscriptId(
                                      expandedTranscriptId === lead.id ? null : lead.id
                                    )
                                  }
                                  className="text-[10px] font-extrabold text-emerald-300 hover:underline cursor-pointer"
                                >
                                  {expandedTranscriptId === lead.id ? 'Hide Transcript' : 'Full Transcript'}
                                </button>
                              )}
                            </div>
                            {(lead as any).aiSummary && (
                              <div className="text-[11px] text-slate-200 leading-snug">
                                {(lead as any).aiSummary}
                              </div>
                            )}
                            {expandedTranscriptId === lead.id && (lead as any).transcriptText && (
                              <pre className="mt-1 p-2 rounded bg-black/50 border border-purple-500/30 text-[10px] text-slate-200 font-mono whitespace-pre-wrap max-h-36 overflow-y-auto">
                                {(lead as any).transcriptText}
                              </pre>
                            )}
                          </div>
                        )}
                        {lead.notes && !(lead as any).aiSummary && (
                          <div className="text-[11px] text-slate-300/90 line-clamp-2 mt-0.5">
                            {lead.notes}
                          </div>
                        )}
                      </td>

                      {/* Quoted Total */}
                      <td className="py-3.5 px-3 align-top whitespace-nowrap border-r border-slate-800/50 bg-emerald-950/20">
                        <div className="font-mono font-black text-sm text-emerald-300">
                          ${Number(lead.quotedAmount ?? 221.07).toFixed(2)}
                        </div>
                        <div className="text-[10px] text-emerald-400/80 font-semibold">CAD + GST</div>
                      </td>

                      {/* Jobber Sync Status */}
                      <td className="py-3.5 px-3 align-top border-r border-slate-800/50">
                        <div className="space-y-1">
                          {realJobberQuoteUrl ? (
                            <a
                              href={realJobberQuoteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-extrabold text-[11px]"
                              title={`Open Live Jobber Quote ${lead.quoteNumber || ''} (${realJobberQuoteUrl})`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{lead.quoteNumber || 'Jobber Quote'}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/90 text-slate-300 text-[11px] font-bold">
                              Ready for Jobber Push
                            </span>
                          )}

                          {realJobberClientUrl && (
                            <div>
                              <a
                                href={realJobberClientUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] text-cyan-300 hover:underline font-bold"
                              >
                                <span>Client #{numericClientId}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Verdict */}
                      <td className="py-3.5 px-3 align-top border-r border-slate-800/50">
                        <select
                          value={lead.verdict || 'Good lead'}
                          onChange={(e) =>
                            handleUpdateVerdict(lead.id, e.target.value as LeadVerdict)
                          }
                          className={`px-2 py-1 rounded-lg text-[11px] font-extrabold border ${
                            (lead.verdict || 'Good lead') === 'Good lead'
                              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
                              : lead.verdict === 'Spam'
                              ? 'bg-rose-500/20 border-rose-500/50 text-rose-200'
                              : 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                          }`}
                        >
                          <option value="Good lead">Good lead</option>
                          <option value="Spam">Spam</option>
                          <option value="Garbage">Garbage</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3 align-top text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            type="button"
                            disabled={isRowSyncing}
                            onClick={() => handleSyncRowToJobber(lead, false)}
                            className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[11px] font-extrabold flex items-center gap-1 shadow-sm cursor-pointer disabled:opacity-50"
                            title="Step 1: Create Client & Property in Jobber -> Step 2: Create Quote in Jobber"
                          >
                            {isRowSyncing ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Send className="w-3 h-3" />
                            )}
                            <span>1. Client → 2. Quote</span>
                          </button>

                          <button
                            type="button"
                            disabled={isRowSyncing}
                            onClick={() => handleSyncRowToJobber(lead, true)}
                            className="px-2.5 py-1.5 rounded-xl bg-cyan-600/25 hover:bg-cyan-600/40 border border-cyan-500/40 text-cyan-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            title="Step 1: Create Client & Property in Jobber -> Step 2: Create Request Only in Jobber"
                          >
                            <UserPlus className="w-3 h-3 text-cyan-400" />
                            <span>1. Client → 2. Request</span>
                          </button>

                          {matchedQuote && (
                            <button
                              type="button"
                              onClick={() => setSelectedQuoteForModal(matchedQuote)}
                              className="px-2.5 py-1.5 rounded-xl bg-purple-600/25 hover:bg-purple-600/40 border border-purple-500/40 text-purple-200 text-[11px] font-bold cursor-pointer"
                            >
                              View Quote
                            </button>
                          )}

                          {onOpenQuickQuote && (
                            <button
                              type="button"
                              onClick={() => onOpenQuickQuote(lead)}
                              className="px-2.5 py-1.5 rounded-xl bg-pink-600/25 hover:bg-pink-600/40 border border-pink-500/40 text-pink-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Calculator className="w-3 h-3" />
                              <span>Calculator</span>
                            </button>
                          )}

                          {onOpenSpamShield && lead.phone && (
                            <button
                              type="button"
                              onClick={() => onOpenSpamShield(lead.phone)}
                              className="p-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/30 cursor-pointer"
                              title="Block in Twilio Spam Shield"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* STICKY TABLE TOTALS & CHANNEL SUMMARY FOOTER */}
              <tfoot className="sticky bottom-0 z-10 bg-[#0b0f1a] border-t-2 border-emerald-500/50 text-xs font-extrabold text-white shadow-inner">
                <tr>
                  <td colSpan={2} className="py-3 px-3 border-r border-slate-800">
                    📊 TABLE SUMMARY &amp; TOTALS ({filteredLeads.length} Displayed)
                  </td>
                  <td colSpan={2} className="py-3 px-3 border-r border-slate-800">
                    <div className="flex items-center gap-2 flex-wrap text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-[#1877F2] text-white">
                        🔵 FB: {tabCounts['Facebook Leads']}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#0F9D58] text-white">
                        🟢 Google: {tabCounts['Google Leads']}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#7C3AED] text-white">
                        🟣 Voice: {tabCounts['Voice & Quick Quotes']}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#D97706] text-white">
                        🟠 Pasted: {tabCounts['Pasted Leads']}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono text-sm text-emerald-300 border-r border-slate-800 bg-emerald-950/40">
                    $
                    {filteredLeads
                      .reduce((sum, l) => sum + (Number(l.quotedAmount ?? 221.07) || 0), 0)
                      .toFixed(2)}
                  </td>
                  <td colSpan={3} className="py-3 px-3 text-[11px] text-slate-300">
                    ✅ Jobber Order: Step 1. Create Client &amp; Property → Step 2. Create Request / Quote
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Quote Detail Modal */}
      <QuoteDetailModal
        isOpen={Boolean(selectedQuoteForModal)}
        quote={selectedQuoteForModal}
        onClose={() => setSelectedQuoteForModal(null)}
        projectId={projectId}
      />
    </div>
  );
};
