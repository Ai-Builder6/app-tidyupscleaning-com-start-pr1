import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Upload,
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
import { AdLeadItem, LeadStatus, LeadVerdict, CleanSheetTabName, CLEAN_SHEET_TABS } from '../types/lead';
import { JobberQuote, extractJobberNumericId } from '../services/jobberSyncModules';
import { QuoteDetailModal } from './QuoteDetailModal';
import {
  LEADS_SPREADSHEET_ID,
  SECONDARY_LEADS_SPREADSHEET_ID,
  APP_LEAD_HEADERS,
} from '../services/leadSheetSync';
import {
  TIDYUPS_DRIVE_FOLDER_NAME,
  DEFAULT_NEW_CLEAN_SHEET_URL,
  DEFAULT_NEW_CLEAN_SHEET_ID,
  isArchivedOldSheetUrlOrId,
  createNewCleanLeadsSheetInDrive,
  syncLeadsToLiveGoogleSheetInDrive,
  pullNewLeadsFromGoogleSheetInDrive,
  downloadFileFromApiWithoutNavigation,
} from '../services/googleDriveBackupService';
import { saveLeadToFirestore, saveClientToFirestore } from '../services/firestoreSyncService';
import {
  ARCHIVED_OLD_GOOGLE_SHEETS,
  TAB_THEME_PALETTES,
  resolveCleanSheetTab,
  hasLeadBeenCommunicatedWith,
  filterValidRecentLeads,
} from '../services/styledLeadsWorkbookBuilder';

export type CleanSheetTab = 'ALL' | CleanSheetTabName;

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
  const [leadsList, setLeadsList] = useState<AdLeadItem[]>(() => filterValidRecentLeads(initialLeads || []));
  const [activeTab, setActiveTab] = useState<CleanSheetTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [verdictFilter, setVerdictFilter] = useState<'ALL' | LeadVerdict>('ALL');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncingRowId, setSyncingRowId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copiedTsv, setCopiedTsv] = useState(false);
  const [selectedQuoteForModal, setSelectedQuoteForModal] = useState<JobberQuote | null>(null);

  // Paste Table & Quick Row Entry State
  const [targetSheetTab, setTargetSheetTab] = useState<CleanSheetTabName>('Facebook Leads 1');
  const [pasteText, setPasteText] = useState('');
  const [showPasteBox, setShowPasteBox] = useState(false);

  // Quick 1-Line Manual Add Row state
  const [quickName, setQuickName] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [quickAddress, setQuickAddress] = useState('');
  const [quickBedrooms, setQuickBedrooms] = useState('3 Bedrooms');
  const [quickBathrooms, setQuickBathrooms] = useState('2 Bathrooms');
  const [quickService, setQuickService] = useState('3Bed 2Bath Basic Initial Cleaning (1 Pro Cleaner)');
  const [quickPrice, setQuickPrice] = useState('221.07');
  const [quickNotes, setQuickNotes] = useState('');

  // Connected Clean Google Sheet URL state — NEVER defaults to the old archived 1TifULi7 sheet!
  const [googleSheetUrl, setGoogleSheetUrl] = useState(DEFAULT_NEW_CLEAN_SHEET_URL);
  const [createdDriveSheetUrl, setCreatedDriveSheetUrl] = useState<string>('');
  const [createdDriveSheetName, setCreatedDriveSheetName] = useState<string>(
    'TidyUps Brand-New 7-Tab Clean Leads Sheet (Fresh Start)'
  );
  const [webhookUrl, setWebhookUrl] = useState<string>('https://app.tidyupscleaning.com/api/leads/webhook');
  const [isSavingSheetUrl, setIsSavingSheetUrl] = useState(false);
  const [isCreatingDriveSheet, setIsCreatingDriveSheet] = useState(false);
  const [isSyncingDriveSheet, setIsSyncingDriveSheet] = useState(false);
  const [isDownloadingFile, setIsDownloadingFile] = useState<'XLSX' | 'CSV' | null>(null);
  const [showAdsConnectPanel, setShowAdsConnectPanel] = useState(false);
  const [isReconnectingSheets, setIsReconnectingSheets] = useState(false);
  const [isUploadingSheetFile, setIsUploadingSheetFile] = useState(false);
  const sheetFileInputRef = useRef<HTMLInputElement | null>(null);
  const cleanTableSectionRef = useRef<HTMLDivElement | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [confirmDriveSyncModal, setConfirmDriveSyncModal] = useState(false);

  // Quo / OpenPhone Missed Calls, Sonia AI Screener & Voicemail Transcripts State
  const [quoCallsList, setQuoCallsList] = useState<any[]>(propCalls || []);
  const [isSyncingQuoCalls, setIsSyncingQuoCalls] = useState(false);
  const [showQuoCallsPanel, setShowQuoCallsPanel] = useState(false);
  const [expandedTranscriptId, setExpandedTranscriptId] = useState<string | null>(null);
  const [togglingBlockId, setTogglingBlockId] = useState<string | null>(null);

  useEffect(() => {
    setLeadsList(filterValidRecentLeads(initialLeads || []));
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
        if (d?.createdDriveSheetUrl && !isArchivedOldSheetUrlOrId(d.createdDriveSheetUrl)) {
          setGoogleSheetUrl(d.createdDriveSheetUrl);
          setCreatedDriveSheetUrl(d.createdDriveSheetUrl);
        } else if (d?.sheetUrl && !isArchivedOldSheetUrlOrId(d.sheetUrl) && !String(d.sheetUrl).includes('clean_sheet')) {
          setGoogleSheetUrl(d.sheetUrl);
        } else {
          setGoogleSheetUrl(DEFAULT_NEW_CLEAN_SHEET_URL);
        }
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
  }, [projectId]);

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
          `✓ Synced ${data.syncedCallsCount || 0} Quo / Sonia AI calls & transcripts! Cleaning leads with transcripts are connected directly to your Quo sheet tab.`
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
      'Facebook Leads 1': 0,
      'Facebook Leads 2': 0,
      'Google Leads 1': 0,
      'Google Leads 2': 0,
      'Other Ads': 0,
      'Facebook AI': 0,
      Quo: 0,
    };
    for (const l of leadsList) {
      const resolvedTab = resolveCleanSheetTab(l.sourceTab, l);
      counts[resolvedTab] = (counts[resolvedTab] || 0) + 1;
    }
    return counts;
  }, [leadsList]);

  const filteredLeads = useMemo(() => {
    return leadsList.filter((l) => {
      const rowTab = resolveCleanSheetTab(l.sourceTab, l);
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

  // Save connected Google Sheet URL (blocks accidentally saving the 2 archived old sheets as the new clean sheet)
  const handleSaveSheetUrl = async (customUrl?: string) => {
    const urlToSave = (customUrl ?? googleSheetUrl).trim();
    if (!urlToSave || urlToSave.includes('clean_sheet')) {
      setNotice('Please enter a valid Google Sheets URL or click "+ Create New 7-Tab Sheet in Google Drive".');
      return;
    }
    if (isArchivedOldSheetUrlOrId(urlToSave)) {
      setGoogleSheetUrl(createdDriveSheetUrl || DEFAULT_NEW_CLEAN_SHEET_URL);
      setNotice(
        'That URL is one of your Archived Old Sheets (already linked under "Log Into Archived Old Sheets"). Click "+ Create New 7-Tab Sheet in Drive" or paste a brand-new Google Sheet URL!'
      );
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
        setNotice('✓ Connected your Brand-New 7-Tab Google Sheet URL! All new Facebook Ads, Google Ads, Facebook AI, and Quo leads sync here.');
      }
    } catch (e: any) {
      setNotice(`Could not save Sheet URL: ${e.message}`);
    } finally {
      setIsSavingSheetUrl(false);
    }
  };

  // 1-Click: Create a brand-new native 7-tab Google Sheet in user's Google Drive (FB Ads & Google Ads Ready)
  const handleCreateNewSheetInDrive = async () => {
    setIsCreatingDriveSheet(true);
    setNotice(null);
    try {
      const res = await createNewCleanLeadsSheetInDrive();
      setGoogleSheetUrl(res.sheetUrl);
      if (!isArchivedOldSheetUrlOrId(res.sheetUrl)) {
        setCreatedDriveSheetUrl(res.sheetUrl);
      }
      setCreatedDriveSheetName(res.sheetName);
      setNotice(
        res.sheetUrl.includes('docs.google.com/spreadsheets')
          ? `✓ Created brand-new 7-Tab Google Sheet "${res.sheetName}" inside "${TIDYUPS_DRIVE_FOLDER_NAME}" in your Google Drive and set it as your Connected Google Sheet URL!`
          : `✓ Initialized your Brand-New 7-Tab Clean Leads Sheet (${CLEAN_SHEET_TABS.join(', ')}) starting fresh from now! Click "Download Styled .XLSX" or sign into Google to push to Google Drive.`
      );
    } catch (err: any) {
      setNotice(`Could not create Google Sheet in Drive: ${err?.message || 'Please allow Google Drive access.'}`);
    } finally {
      setIsCreatingDriveSheet(false);
    }
  };

  // Confirmed handler: Sync all current rows directly to the live Google Sheet in Google Drive (pulls any new FB/Google sheet rows first!)
  const handleConfirmedSyncToDriveSheet = async () => {
    setConfirmDriveSyncModal(false);
    setIsSyncingDriveSheet(true);
    setNotice(null);
    try {
      const match = googleSheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      const currentId = match && !isArchivedOldSheetUrlOrId(match[1]) ? match[1] : undefined;
      const res = await syncLeadsToLiveGoogleSheetInDrive({ spreadsheetId: currentId });
      if (res.sheetUrl && !isArchivedOldSheetUrlOrId(res.sheetUrl)) {
        setGoogleSheetUrl(res.sheetUrl);
        if (res.sheetUrl.includes('docs.google.com/spreadsheets')) {
          setCreatedDriveSheetUrl(res.sheetUrl);
          setCreatedDriveSheetName(res.sheetName);
        }
      }
      if (Array.isArray(res.leads)) {
        setLeadsList(res.leads);
        if (onLeadsUpdated) onLeadsUpdated(res.leads);
      }
      if (Array.isArray(res.newlyImportedLeads)) {
        for (const nl of res.newlyImportedLeads) {
          saveLeadToFirestore(nl).catch(() => {});
        }
      }
      const pulledMsg =
        res.pulledRowsCount && res.pulledRowsCount > 0
          ? ` (First pulled ${res.pulledRowsCount} new Facebook/Google row(s) from the sheet so nothing was overwritten!)`
          : '';
      setNotice(
        `✓ Synced ${(res.leads || leadsList).length} lead row(s) across all tabs directly into your live Google Sheet in Google Drive!${pulledMsg}`
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

  const handleReconnectAndPullSheets = async (promptAuth = true) => {
    setIsReconnectingSheets(true);
    if (promptAuth) setNotice(null);
    try {
      const data = await pullNewLeadsFromGoogleSheetInDrive({
        sheetUrl: googleSheetUrl,
        projectId,
        promptAuthIfNeeded: promptAuth,
      });
      if (data.success) {
        if (data.discoveredDriveSheetUrl && !createdDriveSheetUrl) {
          setCreatedDriveSheetUrl(data.discoveredDriveSheetUrl);
          if (data.discoveredDriveSheetName) setCreatedDriveSheetName(data.discoveredDriveSheetName);
        }
        if (Array.isArray(data.leads)) {
          setLeadsList(data.leads);
          if (onLeadsUpdated) onLeadsUpdated(data.leads);
        }
        if (Array.isArray(data.clients) && onClientsUpdated) {
          onClientsUpdated(data.clients);
        }
        if (Array.isArray(data.quotes) && onQuotesUpdated) {
          onQuotesUpdated(data.quotes);
        }
        if (Array.isArray(data.newlyImportedLeads) && data.newlyImportedLeads.length > 0) {
          for (const nl of data.newlyImportedLeads) {
            saveLeadToFirestore(nl).catch(() => {});
          }
          if (Array.isArray(data.clients)) {
            for (const cl of data.clients.slice(0, data.newlyImportedLeads.length)) {
              saveClientToFirestore(cl).catch(() => {});
            }
          }
        }
        if (promptAuth || (data.pulledRowsCount && data.pulledRowsCount > 0)) {
          setNotice(
            data.message ||
              '✓ Pulled latest Facebook Lead Ads & Google Ads rows from your connected Google Sheet!'
          );
        }
      }
    } catch (err: any) {
      if (promptAuth) {
        setNotice(`Reconnect error: ${err?.message}`);
      }
    } finally {
      setIsReconnectingSheets(false);
    }
  };

  const handleUploadSheetFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingSheetFile(true);
    setNotice(null);
    try {
      const isCsv = file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv';
      let payload: Record<string, any> = { fileName: file.name };

      if (isCsv) {
        const csvText = await file.text();
        payload.csvText = csvText;
      } else {
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        payload.xlsxBase64 = btoa(binary);
      }

      const res = await fetch(`/api/leads/import-sheet-file?project=${encodeURIComponent(projectId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-project-id': projectId },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data?.success) {
        if (Array.isArray(data.leads)) {
          setLeadsList(data.leads);
          if (onLeadsUpdated) onLeadsUpdated(data.leads);
        }
        if (Array.isArray(data.clients) && onClientsUpdated) {
          onClientsUpdated(data.clients);
        }
        if (Array.isArray(data.newlyImportedLeads)) {
          for (const nl of data.newlyImportedLeads) {
            saveLeadToFirestore(nl).catch(() => {});
          }
        }
        setNotice(data.message || `✓ Imported leads from ${file.name}!`);
      } else {
        setNotice(`Import error: ${data?.error || 'Could not parse file'}`);
      }
    } catch (err: any) {
      setNotice(`File import failed: ${err?.message}`);
    } finally {
      setIsUploadingSheetFile(false);
      if (sheetFileInputRef.current) sheetFileInputRef.current.value = '';
    }
  };

  const handleToggleCommunicated = async (lead: AdLeadItem) => {
    const currentlyCommunicated = hasLeadBeenCommunicatedWith(lead);
    const nextCommunicated = !currentlyCommunicated;
    const nowIso = nextCommunicated ? new Date().toISOString() : undefined;
    const nextStatus: LeadStatus = nextCommunicated
      ? lead.status === 'New' || !lead.status
        ? 'Contacted'
        : lead.status
      : 'New';

    const updated = leadsList.map((l) =>
      l.id === lead.id
        ? {
            ...l,
            hasCommunicated: nextCommunicated,
            communicatedAt: nowIso,
            status: nextStatus,
          }
        : l
    );
    setLeadsList(updated);
    if (onLeadsUpdated) onLeadsUpdated(updated);

    await fetch(`/api/leads/${encodeURIComponent(lead.id)}?project=${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-project-id': projectId },
      body: JSON.stringify({
        hasCommunicated: nextCommunicated,
        communicatedAt: nowIso || null,
        status: nextStatus,
      }),
    }).catch(() => {});
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
        resolveCleanSheetTab(l.sourceTab, l),
        l.source || 'Quo Call / Voice',
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
                Brand-New Google Sheets Lead Hub (7 Fresh Tabs • 14-Day Window)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                14-Day Max Cutoff • 7-Day Uncommunicated Cutoff • Zero Fake Leads
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Fresh Google Sheet with 7 dedicated tabs: <strong>Facebook Leads 1</strong>, <strong>Facebook Leads 2</strong>, <strong>Google Leads 1</strong>, <strong>Google Leads 2</strong>, <strong>Other Ads</strong>, <strong>Facebook AI</strong>, and <strong>Quo</strong>. Leads older than 14 days (or &gt;7 days without communication) are automatically excluded. Your old Google Sheets are linked below for reference.
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
            onClick={handleConfirmedSyncToDriveSheet}
            disabled={isSyncingDriveSheet}
            className="px-3.5 py-2 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-600 hover:to-emerald-600 text-white border border-teal-400/40 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
            title="1-Click Sync: Pulls any new leads, syncs Jobber quotes, and formats headers & rows (no Google sign-in popup required)"
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
                  <li>📌 <strong>Frozen Top 3 Header Rows:</strong> Executive Title Banner + 7-Tab KPI Bar + AutoFilter Column Headers</li>
                  <li>🔵 <strong>Facebook Leads 1 &amp; 2:</strong> Royal &amp; Sky Blue badges and soft blue alternating rows</li>
                  <li>🟢 <strong>Google Leads 1 &amp; 2:</strong> Emerald &amp; Teal Green badges and soft mint alternating rows</li>
                  <li>🟠 <strong>Other Ads:</strong> Warm Amber badges and gold rows</li>
                  <li>💬 <strong>Facebook AI:</strong> Indigo Messenger AI badges and soft indigo rows</li>
                  <li>🟣 <strong>Quo:</strong> Royal Purple Quo / Sonia AI Call badges and soft lavender rows</li>
                  <li>🗄️ <strong>Archived Old Sheets Tab:</strong> Direct clickable links to your previous historical Google Sheets</li>
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
        {/* Row 1: Brand-New Google Sheet Status + Archived Old Google Sheets Reference Links */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-extrabold">
              ✨ Active Brand-New Google Sheet (7 Tabs • 14-Day Fresh Window)
            </span>
            <span className="text-slate-400 font-bold ml-1">🗄️ Log Into Archived Old Sheets:</span>
            {ARCHIVED_OLD_GOOGLE_SHEETS.map((arch, idx) => (
              <a
                key={arch.id}
                href={arch.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-amber-200 border border-amber-500/30 font-bold inline-flex items-center gap-1.5 transition-all"
                title={arch.description}
              >
                <ExternalLink className="w-3 h-3 text-amber-400" />
                <span>Old Google Sheet #{idx + 1} ({arch.id.slice(0, 8)}...)</span>
              </a>
            ))}
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

        {/* Row 2: Active Brand-New Clean Sheet URL Input + Open Clean Sheet + Create New 7-Tab Sheet in Drive */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-1">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs font-extrabold text-emerald-300 whitespace-nowrap">
              Connected Clean Sheet URL (New 7-Tab):
            </span>
            <input
              type="text"
              value={googleSheetUrl}
              onChange={(e) => setGoogleSheetUrl(e.target.value)}
              placeholder="https://app.tidyupscleaning.com/clean-sheet (or paste a new Google Drive Sheet URL)"
              className="flex-1 px-3 py-1.5 rounded-xl bg-[#0b0e17] border border-emerald-500/50 text-xs text-emerald-300 font-mono focus:outline-none focus:border-emerald-400"
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
            {googleSheetUrl.includes('docs.google.com/spreadsheets') && !isArchivedOldSheetUrlOrId(googleSheetUrl) ? (
              <a
                href={googleSheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm"
              >
                <ExternalLink className="w-3.5 h-3.5 text-white" />
                <span>Open New 7-Tab Google Sheet</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={() => cleanTableSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm cursor-pointer"
                title="Jump to the live 7-Tab Clean Leads Spreadsheet Table below (or click + Create New 7-Tab Sheet in Drive to create a new Google Drive spreadsheet)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
                <span>View Clean 7-Tab Table ({leadsList.length} Rows)</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCreateNewSheetInDrive}
              disabled={isCreatingDriveSheet}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Creates a brand-new 7-tab Google Sheet in your Google Drive (Facebook Leads 1, Facebook Leads 2, Google Leads 1, Google Leads 2, Other Ads, Facebook AI, Quo) and connects its URL here!"
            >
              <CloudUpload className="w-3.5 h-3.5 text-white" />
              <span>
                {isCreatingDriveSheet ? 'Creating 7-Tab Sheet in Drive...' : '+ Create New 7-Tab Sheet in Drive'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleClearCleanSheet(false)}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/40 text-amber-200 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
              title="Start 100% fresh from right now (0 old leads)"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Start Fresh From Now (0 Old Leads)</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPasteBox((v) => !v)}
              className="px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-purple-400" />
              <span>{showPasteBox ? 'Hide Paste / Quick Add' : '+ Paste / Quick Add Row'}</span>
            </button>
          </div>
        </div>

        {/* Collapsible Facebook Lead Ads, Google Ads & app.tidyupscleaning.com/booking Connection Panel */}
        {showAdsConnectPanel && (
          <div className="mt-3 pt-3 border-t border-slate-800 bg-[#0d111c] rounded-xl p-4 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2 flex-wrap">
                  <Globe className="w-4 h-4 text-blue-400" />
                  <span>
                    Reconnect Facebook Lead Ads, Google Ads &amp; Customer Booking Site (
                    <a
                      href="/booking"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-300 hover:text-cyan-200 underline"
                    >
                      app.tidyupscleaning.com/booking
                    </a>
                    )
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black">
                    ✓ All New Protocols Active (7 Tabs • 14-Day Window • Anti-Merge Guard)
                  </span>
                </h3>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Send Facebook Ads &amp; Google Ads traffic directly to{' '}
                  <a
                    href="/booking"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-300 hover:text-cyan-200 font-extrabold underline font-mono"
                  >
                    https://app.tidyupscleaning.com/booking
                  </a>{' '}
                  (bookable live right now — and <code className="text-slate-300">book.tidyupscleaning.com</code> auto-redirects there) or connect your Meta / Google Ads Webhooks &amp; 7-Tab Google Sheet below.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="/booking"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-[11px] font-black flex items-center gap-1.5 shadow-xs"
                  title="Open the live customer booking form at app.tidyupscleaning.com/booking"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Live /booking Form</span>
                </a>
                <input
                  ref={sheetFileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleUploadSheetFile}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => handleReconnectAndPullSheets(true)}
                  disabled={isReconnectingSheets}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-[11px] font-black flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  title="Reads all 7 tabs of your connected Google Sheet in Google Drive and pulls any new Facebook or Google Ads leads into the app"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isReconnectingSheets ? 'animate-spin' : ''}`} />
                  <span>
                    {isReconnectingSheets
                      ? 'Scanning 7 Sheet Tabs...'
                      : '🔄 Pull New FB & Google Leads from Sheet'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => sheetFileInputRef.current?.click()}
                  disabled={isUploadingSheetFile}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-extrabold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  title="Upload a downloaded Facebook Lead Form (.csv / .xlsx) or Google Sheet file to import new leads in 1 click"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>
                    {isUploadingSheetFile
                      ? 'Importing File...'
                      : '📥 Upload FB Form / Sheet (.CSV / .XLSX)'}
                  </span>
                </button>
              </div>
            </div>

            {/* 3-Way Guide with Bookable Links & Updated 7-Tab Protocols */}
            <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/40 text-[11px] text-blue-100 space-y-1.5">
              <div className="font-extrabold text-blue-300 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  How Jess Connects Facebook Ads &amp; Google Ads to <code className="text-cyan-300">app.tidyupscleaning.com/booking</code> &amp; Your 7-Tab Google Sheet:
                </span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                All links below are <strong>live, bookable, and updated with your new protocols</strong> (7 Google Sheet tabs, 14-day fresh lead window, 7-day uncommunicated filter, strict 2-of-3 client anti-merge protection, and automatic redirect to <code className="text-pink-300">app.tidyupscleaning.com/thank-you</code> with Google Ads Tag <code className="text-emerald-300">AW-18539302675</code>):
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1">
                <div className="p-2.5 rounded-lg bg-[#0b0e17]/90 border border-blue-500/30 space-y-1">
                  <div className="font-extrabold text-cyan-300">
                    Option A (Best — Direct Bookable Page):
                  </div>
                  <div className="text-slate-300">
                    Use{' '}
                    <a
                      href="/booking"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-200 font-mono underline hover:text-white font-bold"
                    >
                      https://app.tidyupscleaning.com/booking
                    </a>{' '}
                    (or add <code className="text-cyan-300">?source=fb1</code>, <code className="text-cyan-300">?source=fb2</code>, <code className="text-emerald-300">?source=google1</code>, <code className="text-emerald-300">?source=google2</code>). Customers pick <strong>Move-Out, Basic, or Deep</strong> and sync to your 7-tab Sheet &amp; Jobber!
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#0b0e17]/90 border border-blue-500/30 space-y-1">
                  <div className="font-extrabold text-emerald-300">
                    Option B (Meta / Google Form → 7-Tab Sheet):
                  </div>
                  <div className="text-slate-300">
                    In Meta Ads Manager or Google Ads → <strong>Google Sheets CRM Setup</strong>, connect your active sheet and choose any of your 7 tabs (<strong>Facebook Leads 1, Facebook Leads 2, Google Leads 1, Google Leads 2, Other Ads, Facebook AI, Quo</strong>), then click <strong>🔄 Pull New FB &amp; Google Leads</strong> above.
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#0b0e17]/90 border border-blue-500/30 space-y-1">
                  <div className="font-extrabold text-indigo-300">
                    Option C (Direct Webhook — Same Key for Both!):
                  </div>
                  <div className="text-slate-300">
                    In Google Ads or Meta CRM Webhooks, paste{' '}
                    <code className="text-indigo-200 font-mono">https://app.tidyupscleaning.com/api/leads/webhook</code>.{' '}
                    <strong>Both Google Ads &amp; Facebook Ads use the exact same Webhook Key:</strong>{' '}
                    <code className="text-emerald-300 font-mono font-bold">tidyups-yeg-leads-2026</code> (also accepts <code className="text-emerald-300 font-mono">tidyups-google-ads-2026</code>).
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              {/* 1. Direct Customer Booking Site & Ad Landing URLs (All Bookable) */}
              <div className="p-3 rounded-xl bg-[#131724] border border-cyan-500/40 space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-bold text-cyan-300">
                    1. Customer Booking Page (/booking)
                  </span>
                  <div className="flex items-center gap-2">
                    <a
                      href="/booking"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-pink-400 hover:underline font-extrabold"
                    >
                      Book Now ↗
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopyHelper('bookUrl', 'https://app.tidyupscleaning.com/booking')}
                      className="text-[11px] text-cyan-400 hover:underline font-bold cursor-pointer"
                    >
                      {copiedField === 'bookUrl' ? 'Copied!' : 'Copy URL'}
                    </button>
                  </div>
                </div>
                <a
                  href="/booking"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block font-mono text-[11px] text-cyan-200 hover:text-white bg-[#0b0e17] px-2.5 py-1.5 rounded border border-slate-800 truncate underline"
                  title="Click to open live bookable page: https://app.tidyupscleaning.com/booking"
                >
                  https://app.tidyupscleaning.com/booking
                </a>
                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyHelper('fb1BookUrl', 'https://app.tidyupscleaning.com/booking?source=fb1')
                    }
                    className="px-2 py-0.5 rounded bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-[10px] font-bold text-blue-200 cursor-pointer"
                    title="Copy bookable link for Facebook Leads 1 tab"
                  >
                    {copiedField === 'fb1BookUrl' ? 'Copied FB 1!' : 'Copy FB Leads 1'}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyHelper('fb2BookUrl', 'https://app.tidyupscleaning.com/booking?source=fb2')
                    }
                    className="px-2 py-0.5 rounded bg-sky-600/30 hover:bg-sky-600/50 border border-sky-500/40 text-[10px] font-bold text-sky-200 cursor-pointer"
                    title="Copy bookable link for Facebook Leads 2 tab"
                  >
                    {copiedField === 'fb2BookUrl' ? 'Copied FB 2!' : 'Copy FB Leads 2'}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyHelper('goog1BookUrl', 'https://app.tidyupscleaning.com/booking?source=google1')
                    }
                    className="px-2 py-0.5 rounded bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-[10px] font-bold text-emerald-200 cursor-pointer"
                    title="Copy bookable link for Google Leads 1 tab"
                  >
                    {copiedField === 'goog1BookUrl' ? 'Copied Google 1!' : 'Copy Google 1'}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyHelper('goog2BookUrl', 'https://app.tidyupscleaning.com/booking?source=google2')
                    }
                    className="px-2 py-0.5 rounded bg-teal-600/30 hover:bg-teal-600/50 border border-teal-500/40 text-[10px] font-bold text-teal-200 cursor-pointer"
                    title="Copy bookable link for Google Leads 2 tab"
                  >
                    {copiedField === 'goog2BookUrl' ? 'Copied Google 2!' : 'Copy Google 2'}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyHelper('otherBookUrl', 'https://app.tidyupscleaning.com/booking?source=other')
                    }
                    className="px-2 py-0.5 rounded bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/40 text-[10px] font-bold text-amber-200 cursor-pointer"
                    title="Copy bookable link for Other Ads tab"
                  >
                    {copiedField === 'otherBookUrl' ? 'Copied Other!' : 'Copy Other Ads'}
                  </button>
                </div>
              </div>

              {/* 2. Active Spreadsheet ID & 7 Fresh Tabs */}
              <div className="p-3 rounded-xl bg-[#131724] border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300">2. Active 7-Tab Clean Sheet ID</span>
                  <button
                    type="button"
                    onClick={() => {
                      const matched = googleSheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1];
                      const id =
                        matched && !isArchivedOldSheetUrlOrId(matched)
                          ? matched
                          : DEFAULT_NEW_CLEAN_SHEET_ID;
                      handleCopyHelper('sheetId', id);
                    }}
                    className="text-[11px] text-emerald-400 hover:underline font-bold cursor-pointer"
                  >
                    {copiedField === 'sheetId' ? 'Copied!' : 'Copy ID'}
                  </button>
                </div>
                <div className="font-mono text-[11px] text-emerald-300 bg-[#0b0e17] px-2.5 py-1.5 rounded border border-slate-800 truncate">
                  {(() => {
                    const matched = googleSheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1];
                    return matched && !isArchivedOldSheetUrlOrId(matched)
                      ? matched
                      : `${DEFAULT_NEW_CLEAN_SHEET_ID} (Click + Create New 7-Tab Sheet in Drive)`;
                  })()}
                </div>
                <p className="text-[10px] text-slate-400 leading-snug">
                  7 Tabs auto-synced: <strong className="text-slate-200">Facebook Leads 1</strong>,{' '}
                  <strong className="text-slate-200">Facebook Leads 2</strong>,{' '}
                  <strong className="text-slate-200">Google Leads 1</strong>,{' '}
                  <strong className="text-slate-200">Google Leads 2</strong>,{' '}
                  <strong className="text-slate-200">Other Ads</strong>,{' '}
                  <strong className="text-slate-200">Facebook AI</strong>,{' '}
                  <strong className="text-slate-200">Quo</strong>
                </p>
              </div>

              {/* 3. Direct Inbound Webhook URL & Shared Google/FB Ads Key */}
              <div className="p-3 rounded-xl bg-[#131724] border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300">
                    3. FB &amp; Google Ads Webhook &amp; Key
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyHelper('webhook', webhookUrl)}
                    className="text-[11px] text-blue-400 hover:underline font-bold cursor-pointer"
                  >
                    {copiedField === 'webhook' ? 'Copied URL!' : 'Copy Webhook URL'}
                  </button>
                </div>
                <div className="font-mono text-[11px] text-blue-300 bg-[#0b0e17] px-2.5 py-1.5 rounded border border-slate-800 truncate">
                  {webhookUrl}
                </div>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[10px] text-slate-300" title="Works for both Google Ads Webhook Key and Facebook Ads Verify Token">
                    Shared Key (Google &amp; FB):{' '}
                    <code className="text-emerald-300 font-mono font-bold bg-[#0b0e17] px-1.5 py-0.5 rounded border border-slate-800">
                      tidyups-yeg-leads-2026
                    </code>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyHelper('google_key', 'tidyups-yeg-leads-2026')}
                    className="text-[10px] text-emerald-400 hover:underline font-bold cursor-pointer shrink-0"
                  >
                    {copiedField === 'google_key' ? 'Copied Key!' : 'Copy Key'}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                  <span className="text-[10px] text-slate-400 truncate">
                    Thank-You URL:{' '}
                    <a
                      href="/thank-you"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pink-300 font-mono font-bold underline hover:text-white"
                    >
                      https://app.tidyupscleaning.com/thank-you
                    </a>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyHelper('thank_you_url', 'https://app.tidyupscleaning.com/thank-you')}
                    className="text-[10px] text-pink-400 hover:underline font-bold cursor-pointer shrink-0"
                  >
                    {copiedField === 'thank_you_url' ? 'Copied /thank-you!' : 'Copy /thank-you'}
                  </button>
                </div>
              </div>

              {/* 4. 20-Column Lead Schema & Active Protocols */}
              <div className="p-3 rounded-xl bg-[#131724] border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300">
                    4. 20-Column Headers &amp; Protocols
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
                <p className="text-[10px] text-emerald-300/90 leading-snug">
                  ✓ 14-day fresh lead cutoff • 7-day uncommunicated filter • Strict 2-of-3 client anti-merge guard active.
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
                    Missed Calls, Sonia AI Assistant &amp; Voicemail Transcripts → Clean Google Sheet (Quo Tab)
                  </h3>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold font-mono">
                    Webhook Active: https://app.tidyupscleaning.com/api/quo/webhook
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1">
                  When a caller misses you and leaves a message with <strong>Sonia (Tidyups AI Cleaning Assistant)</strong> or voicemail asking for a cleaning, their full <strong>Transcript &amp; AI Summary</strong> is automatically connected and added to your <strong>🎙️ Quo</strong> Google Sheet tab. Non-cleaning calls (Yelp ad reps, car lease reps, personal callbacks) are automatically filtered so they don&apos;t clutter your Lead Sheet.
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
          BRAND-NEW 7 GOOGLE SHEET TABS (Facebook Leads 1 & 2, Google Leads 1 & 2, Other Ads, Facebook AI, Quo)
         ───────────────────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'ALL'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg ring-2 ring-emerald-500/30'
                : 'bg-[#141824] hover:bg-[#1c2233] text-slate-300 border border-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All New Leads (14-Day)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-black/30 text-white">
              {tabCounts.ALL}
            </span>
          </button>

          {CLEAN_SHEET_TABS.map((tabName) => {
            const palette = TAB_THEME_PALETTES[tabName];
            const isActive = activeTab === tabName;
            return (
              <button
                key={tabName}
                type="button"
                onClick={() => {
                  setActiveTab(tabName);
                  setTargetSheetTab(tabName);
                }}
                className={`px-3.5 py-2 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? `bg-gradient-to-r ${palette.tailwindHeaderGradient} text-white shadow-lg ring-2 ring-white/30`
                    : 'bg-[#141824] hover:bg-[#1c2233] text-slate-200 border border-slate-800'
                }`}
              >
                <span>{palette.icon}</span>
                <span>{tabName}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-black/30 text-white' : palette.tailwindBadge
                  }`}
                >
                  {tabCounts[tabName] || 0}
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
              placeholder="Search name, phone, address..."
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
          PASTE TABLE & QUICK ADD WORKSPACE (Routes into any of the 7 New Tabs)
         ───────────────────────────────────────────────────────────────────────────── */}
      {showPasteBox && (
        <div className="bg-gradient-to-br from-[#141928] via-[#131724] to-[#111520] border border-emerald-500/30 rounded-3xl p-5 space-y-4 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <ClipboardPaste className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm sm:text-base font-extrabold text-white">
                  Paste Table or Add New Lead → Brand-New Google Sheet &amp; Jobber (1. Client → 2. Request / Quote)
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Paste rows from Facebook Ads, Google Ads, Facebook AI, or Quo — or add a single row below. Choose which of the 7 tabs it goes into.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300">Send into Sheet Tab:</span>
              <select
                value={targetSheetTab}
                onChange={(e) => setTargetSheetTab(e.target.value as CleanSheetTabName)}
                className="px-3 py-1.5 rounded-xl bg-[#0b0e17] border border-emerald-500/50 text-emerald-300 text-xs font-extrabold"
              >
                {CLEAN_SHEET_TABS.map((t) => (
                  <option key={t} value={t}>
                    {TAB_THEME_PALETTES[t].icon} {t}
                  </option>
                ))}
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
          CLEAN GOOGLE SHEET LIVE SPREADSHEET TABLE (Frozen Headers + Source Colors + Summary Footer)
         ───────────────────────────────────────────────────────────────────────────── */}
      <div
        ref={cleanTableSectionRef}
        className="bg-[#121623] border-2 border-emerald-500/40 rounded-3xl overflow-hidden shadow-2xl"
      >
        {/* Executive Title Header Banner */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-[#0f172a] via-[#131c33] to-[#0f292a] border-b border-slate-800 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2.5 flex-wrap">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <span className="text-sm sm:text-base font-extrabold text-white tracking-wide">
              ✨ BRAND-NEW 7-TAB CLEAN LEADS TABLE ({filteredLeads.length} New Lead{filteredLeads.length === 1 ? '' : 's'})
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-extrabold">
              📌 7 Fresh Tabs • Started Fresh From Now • Zero Old/Fake Rows
            </span>
            <span className="text-[11px] text-slate-300 font-bold">
              • Active Tab: {activeTab === 'ALL' ? 'All 7 Clean Tabs (Color-Coded)' : activeTab}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleCreateNewSheetInDrive}
              disabled={isCreatingDriveSheet}
              className="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-extrabold cursor-pointer transition-all flex items-center gap-1"
            >
              <CloudUpload className="w-3.5 h-3.5" />
              <span>{isCreatingDriveSheet ? 'Creating in Drive...' : '+ Create New 7-Tab Sheet in Google Drive'}</span>
            </button>
            <button
              type="button"
              onClick={() => setConfirmDriveSyncModal(true)}
              disabled={isSyncingDriveSheet}
              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-extrabold cursor-pointer transition-all"
            >
              ✨ Push 7 Tabs, Frozen Headers &amp; Colors to Google Sheet
            </button>
          </div>
        </div>

        {/* 8-Column Channel Legend & Live KPI Bar (Matches the 7 New Tabs + Total) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 border-b border-slate-800 text-[11px] font-extrabold">
          <button
            type="button"
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-2.5 bg-[#1e293b] text-white flex items-center justify-between border-r border-slate-700/60 cursor-pointer hover:bg-slate-800 ${
              activeTab === 'ALL' ? 'ring-2 ring-inset ring-emerald-400' : ''
            }`}
          >
            <span>📊 ALL 7 TABS: {leadsList.length}</span>
            <span className="text-emerald-300 font-mono">
              ${leadsList.reduce((acc, l) => acc + (Number(l.quotedAmount) || 0), 0).toFixed(0)}
            </span>
          </button>
          {CLEAN_SHEET_TABS.map((tabName) => {
            const palette = TAB_THEME_PALETTES[tabName];
            return (
              <button
                key={tabName}
                type="button"
                onClick={() => setActiveTab(activeTab === tabName ? 'ALL' : tabName)}
                className={`px-3 py-2.5 bg-gradient-to-r ${palette.tailwindHeaderGradient} text-white flex items-center justify-between border-r border-white/15 cursor-pointer hover:opacity-95 text-left ${
                  activeTab === tabName ? 'ring-2 ring-inset ring-white' : ''
                }`}
              >
                <span className="truncate">
                  {palette.icon} {tabName}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-black/25 font-mono ml-1">
                  {tabCounts[tabName] || 0}
                </span>
              </button>
            );
          })}
        </div>

        {filteredLeads.length === 0 ? (
          <div className="p-10 text-center space-y-4 bg-gradient-to-b from-[#121623] to-[#0d111c]">
            <div className="inline-flex items-center justify-center p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <div className="text-base sm:text-lg font-extrabold text-white">
                ✨ Your Brand-New 7-Tab Clean Leads Table ({activeTab === 'ALL' ? 'All 7 Tabs' : activeTab}) is 100% Clean &amp; Ready!
              </div>
              <p className="text-xs text-slate-300 max-w-2xl mx-auto leading-relaxed">
                All old leads, price-list rows, and historical data have been cleared from your active sheet so you are starting fresh from right now. Click any of your 7 tabs above (<strong>Facebook Leads 1</strong>, <strong>Facebook Leads 2</strong>, <strong>Google Leads 1</strong>, <strong>Google Leads 2</strong>, <strong>Other Ads</strong>, <strong>Facebook AI</strong>, <strong>Quo</strong>) — new incoming leads will land here automatically!
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleCreateNewSheetInDrive}
                disabled={isCreatingDriveSheet}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <CloudUpload className="w-4 h-4" />
                <span>
                  {isCreatingDriveSheet
                    ? 'Creating 7-Tab Google Sheet in Drive...'
                    : '+ Create Brand-New 7-Tab Google Sheet in Your Google Drive'}
                </span>
              </button>
              <button
                type="button"
                onClick={handleDownloadXlsx}
                className="px-4 py-2 rounded-xl bg-[#1b2234] hover:bg-[#232c42] text-emerald-300 border border-emerald-500/40 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Clean 7-Tab .XLSX Workbook</span>
              </button>
              <button
                type="button"
                onClick={() => setShowPasteBox(true)}
                className="px-4 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add or Paste First New Lead</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-auto max-h-[640px] relative">
            <table className="w-full text-left border-collapse text-xs">
              {/* FROZEN / STICKY TABLE HEADER */}
              <thead className="sticky top-0 z-20 bg-[#0b0f1a] shadow-lg border-b-2 border-emerald-500/50">
                <tr className="text-[11px] font-extrabold uppercase tracking-wider text-slate-200">
                  <th className="py-3.5 px-3 bg-[#0b0f1a] border-r border-slate-800/80">
                    Date &amp; Sheet Tab
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
                    Communication &amp; Jobber Status
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
                  const rowTab = resolveCleanSheetTab(lead.sourceTab, lead);
                  const palette = TAB_THEME_PALETTES[rowTab] || TAB_THEME_PALETTES['Other Ads'];
                  const rowColorClasses = palette.tailwindDarkRowBg;
                  const badgeColorClasses = `${palette.tailwindBadge} shadow-xs`;
                  const channelIcon = `${palette.icon} `;
                  const communicated = hasLeadBeenCommunicatedWith(lead);

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

                      {/* Communication & Jobber Sync Status */}
                      <td className="py-3.5 px-3 align-top border-r border-slate-800/50">
                        <div className="space-y-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleCommunicated(lead)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold cursor-pointer transition-all ${
                              communicated
                                ? 'bg-emerald-500/25 border border-emerald-500/50 text-emerald-200'
                                : 'bg-amber-500/20 border border-amber-500/40 text-amber-200 hover:bg-emerald-600/30'
                            }`}
                            title="Leads > 7 days old without communication are automatically removed. Click to toggle communication status."
                          >
                            <span>{communicated ? '✅ Communicated' : '⏳ Mark Communicated'}</span>
                          </button>

                          <div>
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
                          </div>

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

              {/* STICKY TABLE TOTALS & 7-TAB SUMMARY FOOTER */}
              <tfoot className="sticky bottom-0 z-10 bg-[#0b0f1a] border-t-2 border-emerald-500/50 text-xs font-extrabold text-white shadow-inner">
                <tr>
                  <td colSpan={2} className="py-3 px-3 border-r border-slate-800">
                    📊 14-DAY FRESH TABLE TOTALS ({filteredLeads.length} Displayed)
                  </td>
                  <td colSpan={2} className="py-3 px-3 border-r border-slate-800">
                    <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                      {CLEAN_SHEET_TABS.map((t) => (
                        <span key={t} className={`px-2 py-0.5 rounded ${TAB_THEME_PALETTES[t].tailwindBadge}`}>
                          {TAB_THEME_PALETTES[t].icon} {t}: {tabCounts[t] || 0}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono text-sm text-emerald-300 border-r border-slate-800 bg-emerald-950/40">
                    $
                    {filteredLeads
                      .reduce((sum, l) => sum + (Number(l.quotedAmount ?? 221.07) || 0), 0)
                      .toFixed(2)}
                  </td>
                  <td colSpan={3} className="py-3 px-3 text-[11px] text-slate-300">
                    ✅ 14-Day Cutoff Active • &gt;7 Days Uncommunicated Excluded • Zero Fake Leads
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
