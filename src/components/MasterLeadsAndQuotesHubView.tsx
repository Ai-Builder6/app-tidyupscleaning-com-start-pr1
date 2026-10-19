import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  FileSpreadsheet,
  ClipboardPaste,
  Calendar,
  Map as MapIcon,
  Search,
  RefreshCw,
  Plus,
  Sparkles,
  Phone,
  MapPin,
  ExternalLink,
  CheckCircle2,
  Calculator,
  Trash2,
  UserCheck,
  Navigation,
  Clock,
  Truck,
  ShieldAlert,
  FileCheck,
  Receipt,
  Users,
  PhoneCall,
  CloudUpload,
  Maximize2,
  Minimize2,
  Send,
  Layers,
  Filter,
  ArrowRight,
} from 'lucide-react';
import { AdLeadItem } from '../types/lead';
import { Technician, ServiceTicket } from '../types/dispatch';
import { ScheduledJobItem } from './ScheduledJobsView';
import { getEdmontonToday, getCleanerColor } from '../data/jobberCalendarData';
import { JobberQuote, JobberInvoice, extractJobberNumericId } from '../services/jobberSyncModules';
import { ClientRecord } from '../types/client';
import { LEADS_SPREADSHEET_ID } from '../services/leadSheetSync';
import { syncLeadsToLiveGoogleSheetInDrive } from '../services/googleDriveBackupService';
import { forwardGeocode } from '../services/geocodingService';
import { QuickMapScheduleRadarView } from './QuickMapScheduleRadarView';

export type MasterHubFocusBlock = 'ALL' | 'PASTE_TABLE' | 'MASTER_TABLE' | 'SCHEDULE_SEARCH' | 'QUICK_MAPS';

export type MasterCategoryFilter =
  | 'ALL'
  | 'FB Leads'
  | 'Google Leads'
  | 'Voice & Quick Quotes'
  | 'Pasted Leads'
  | 'Jobber Quotes';

interface MasterLeadsAndQuotesHubViewProps {
  leads: AdLeadItem[];
  quotes: JobberQuote[];
  invoices: JobberInvoice[];
  scheduledJobs: ScheduledJobItem[];
  unscheduledJobs: any[];
  clients: ClientRecord[];
  calls: any[];
  spamShieldConfig?: any;
  blockedCallsHistory?: any[];
  onToggleBlockScreenedCall?: (params: {
    callId?: string;
    callerPhone: string;
    callerName?: string;
    reason?: string;
    block: boolean;
  }) => Promise<any>;
  technicians: Technician[];
  tickets: ServiceTicket[];
  projectId: 'dispatchgeeni' | 'tidyups';
  focusBlock?: MasterHubFocusBlock;
  onFocusBlockChange?: (block: MasterHubFocusBlock) => void;
  onSyncEverything: () => Promise<void>;
  isSyncingEverything: boolean;
  lastSyncedAllAt: string | null;
  syncAllStatusMessage: string | null;
  onLeadsUpdated: (leads: AdLeadItem[]) => void;
  onQuotesUpdated: (quotes: JobberQuote[]) => void;
  onClientsUpdated: (clients: ClientRecord[]) => void;
  onConvertLeadToJob: (lead: AdLeadItem) => void;
  onOpenQuickQuote: (lead?: AdLeadItem) => void;
  onOpenQuoteDetail: (quote: JobberQuote) => void;
  onOpenSpamShield: (phone?: string) => void;
  onNavigateToFullMap: () => void;
  onNavigateToFullSchedule: () => void;
  onNavigateToAddressRadar: () => void;
  onNavigateToFullLeadsSheet: () => void;
  onNavigateToQuotes: () => void;
  onNavigateToInvoices: () => void;
  onSelectJobOnMap: (job: ScheduledJobItem) => void;
  onToggleScheduledJobStatus: (jobId: string, newStatus: 'SCHEDULED' | 'COMPLETED') => void;
}

interface PasteDraftRow {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  bedrooms: string;
  bathrooms: string;
  serviceRequested: string;
  quotedAmount: number;
  sourceTab: 'Pasted Leads' | 'FB Leads' | 'Google Leads' | 'Voice & Quick Quotes';
  notes: string;
}

function parseSmartPasteText(rawText: string): PasteDraftRow[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const rows: PasteDraftRow[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (
      i === 0 &&
      /^(date|name|client|customer|source|phone)\b/i.test(line) &&
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

    const phoneMatch = line.match(/(?:\+?1[-.\s]?)?\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/);
    const phone = phoneMatch ? `(${phoneMatch[1]}) ${phoneMatch[2]}-${phoneMatch[3]}` : '';
    const emailMatch = line.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const email = emailMatch ? emailMatch[0] : '';

    const bedMatch = line.match(/(\d+)\s*(?:bed|bd|br|bedroom)/i);
    const bathMatch = line.match(/(\d+(?:\.\d+)?)\s*(?:bath|ba|bathroom)/i);
    const bedrooms = bedMatch ? `${bedMatch[1]} Bedrooms` : '3 Bedrooms';
    const bathrooms = bathMatch ? `${bathMatch[1]} Bathrooms` : '2 Bathrooms';

    const priceMatch = line.match(/\$\s*(\d{2,4}(?:\.\d{1,2})?)/);
    let quotedAmount = priceMatch ? parseFloat(priceMatch[1]) : 0;

    let serviceRequested = 'Residential Standard Cleaning';
    if (/move[\s-]*out|move[\s-]*in/i.test(line)) {
      serviceRequested = 'Move-In / Move-Out Cleaning';
    } else if (/deep/i.test(line)) {
      serviceRequested = 'Residential Deep Cleaning';
    } else if (/carpet|steam/i.test(line)) {
      serviceRequested = 'Carpet & Upholstery Steam Cleaning';
    }

    let sourceTab: PasteDraftRow['sourceTab'] = 'Pasted Leads';
    if (/\b(fb|facebook|meta|instagram)\b/i.test(line)) {
      sourceTab = 'FB Leads';
    } else if (/\b(google|gmb|lsa)\b/i.test(line)) {
      sourceTab = 'Google Leads';
    } else if (/\b(voice|call|quo|sona)\b/i.test(line)) {
      sourceTab = 'Voice & Quick Quotes';
    }

    if (!quotedAmount) {
      const bCount = parseInt(bedrooms, 10) || 3;
      quotedAmount = serviceRequested.includes('Deep') || serviceRequested.includes('Move')
        ? 245 + Math.max(0, bCount - 2) * 35
        : 185 + Math.max(0, bCount - 2) * 25;
    }

    let customerName = 'Pasted Lead';
    let address = 'Edmonton, AB';
    let city = 'Edmonton';

    if (delimiter) {
      const parts = line.split(delimiter).map((p) => p.trim()).filter(Boolean);
      const nonPhoneParts = parts.filter(
        (p) => !p.includes('@') && !/^\$?\d+(\.\d+)?$/.test(p) && (!phone || !p.includes(phone.slice(-4)))
      );
      if (nonPhoneParts[0]) customerName = nonPhoneParts[0];
      const addrCandidate = nonPhoneParts.find((p) => /\d+\s+[A-Za-z0-9]+/.test(p));
      if (addrCandidate) address = addrCandidate;
    } else {
      const addrMatch = line.match(
        /\b(\d{2,5}\s+(?:[A-Za-z0-9]+\s+){1,4}(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Blvd|Way|Lane|Cres|Crescent|Pl|Place|Court|Ct|Trail|Trl)\b(?:\s*(?:NW|NE|SW|SE))?)/i
      );
      if (addrMatch) address = addrMatch[1].trim();
      const cleanedForName = line
        .replace(phoneMatch?.[0] || '', '')
        .replace(email, '')
        .replace(addrMatch?.[0] || '', '')
        .split(/[-–—,;|]/)[0]
        .trim();
      if (cleanedForName && cleanedForName.length >= 2 && cleanedForName.length <= 40) {
        customerName = cleanedForName;
      }
    }

    if (/st\.?\s*albert/i.test(line)) city = 'St. Albert';
    else if (/sherwood\s*park/i.test(line)) city = 'Sherwood Park';
    else if (/spruce\s*grove/i.test(line)) city = 'Spruce Grove';
    else if (/leduc/i.test(line)) city = 'Leduc';
    else if (/beaumont/i.test(line)) city = 'Beaumont';

    rows.push({
      id: `paste-draft-${Date.now()}-${i}`,
      customerName,
      phone,
      email,
      address,
      city,
      bedrooms,
      bathrooms,
      serviceRequested,
      quotedAmount,
      sourceTab,
      notes: line,
    });
  }

  return rows;
}

// Haversine distance in km between two coordinates
function calcDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function estimateAddressCoords(address: string): { lat: number; lng: number } {
  const norm = (address || '').toLowerCase();
  if (norm.includes('st. albert') || norm.includes('st albert')) return { lat: 53.6385, lng: -113.6268 };
  if (norm.includes('sherwood park')) return { lat: 53.5320, lng: -113.3150 };
  if (norm.includes('spruce grove')) return { lat: 53.5465, lng: -113.8980 };
  if (norm.includes('beaumont')) return { lat: 53.3572, lng: -113.4146 };
  if (norm.includes('windermere') || norm.includes('ambleside') || norm.includes('sw')) return { lat: 53.4342, lng: -113.6045 };
  if (norm.includes('49 street') || norm.includes('t6b')) return { lat: 53.5085, lng: -113.4165 };
  if (norm.includes('106 street') || norm.includes('downtown') || norm.includes('jasper')) return { lat: 53.5405, lng: -113.5035 };
  const aveMatch = norm.match(/(\d{1,3})\s*(?:ave|avenue)/i);
  const stMatch = norm.match(/(\d{1,3})\s*(?:st|street)/i);
  let lat = 53.5412;
  let lng = -113.4988;
  if (aveMatch) lat = 53.5412 + (parseInt(aveMatch[1], 10) - 100) * 0.00115;
  if (stMatch) lng = -113.4988 - (parseInt(stMatch[1], 10) - 100) * 0.00175;
  return {
    lat: Math.max(53.30, Math.min(53.70, lat)),
    lng: Math.max(-113.90, Math.min(-113.25, lng)),
  };
}

export const MasterLeadsAndQuotesHubView: React.FC<MasterLeadsAndQuotesHubViewProps> = ({
  leads,
  quotes,
  invoices,
  scheduledJobs,
  unscheduledJobs,
  clients,
  calls,
  spamShieldConfig,
  blockedCallsHistory = [],
  onToggleBlockScreenedCall,
  technicians,
  projectId,
  focusBlock = 'ALL',
  onFocusBlockChange,
  onSyncEverything,
  isSyncingEverything,
  lastSyncedAllAt,
  syncAllStatusMessage,
  onLeadsUpdated,
  onQuotesUpdated,
  onClientsUpdated,
  onConvertLeadToJob,
  onOpenQuickQuote,
  onOpenQuoteDetail,
  onOpenSpamShield,
  onNavigateToFullMap,
  onNavigateToFullSchedule,
  onNavigateToAddressRadar,
  onNavigateToFullLeadsSheet,
  onNavigateToQuotes,
  onNavigateToInvoices,
  onSelectJobOnMap,
  onToggleScheduledJobStatus,
}) => {
  const pasteBlockRef = useRef<HTMLDivElement>(null);
  const masterTableBlockRef = useRef<HTMLDivElement>(null);
  const scheduleSearchBlockRef = useRef<HTMLDivElement>(null);
  const quickMapsBlockRef = useRef<HTMLDivElement>(null);

  const [activeCategory, setActiveCategory] = useState<MasterCategoryFilter>('ALL');
  const [masterSearchQuery, setMasterSearchQuery] = useState('');
  const [expandedTranscriptRowId, setExpandedTranscriptRowId] = useState<string | null>(null);
  const [showScreenedCallsList, setShowScreenedCallsList] = useState<boolean>(true);
  const [screenedCallFilter, setScreenedCallFilter] = useState<'ALL' | 'BLOCKED' | 'CLEANING'>('ALL');
  const [togglingCallId, setTogglingCallId] = useState<string | null>(null);
  const [sheetUrl, setSheetUrl] = useState(`https://docs.google.com/spreadsheets/d/${LEADS_SPREADSHEET_ID}/edit`);
  const [spreadsheetId, setSpreadsheetId] = useState(LEADS_SPREADSHEET_ID);
  const [isSyncingGoogleDriveSheet, setIsSyncingGoogleDriveSheet] = useState(false);
  const [localBanner, setLocalBanner] = useState<string | null>(null);

  const isCallerPhoneBlocked = (rawPhone?: string, callObj?: any): boolean => {
    if (callObj?.isBlocked || callObj?.status === 'SOLICITOR_BLOCKED') return true;
    const digits = String(rawPhone || '').replace(/\D/g, '');
    const norm = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
    if (!norm) return false;
    const list: string[] = spamShieldConfig?.blockedNumbers || [];
    return list.some((b) => {
      const bDigits = String(b || '').replace(/\D/g, '');
      const bNorm = bDigits.length === 11 && bDigits.startsWith('1') ? bDigits.slice(1) : bDigits;
      return bNorm === norm;
    });
  };

  // Block 1: Paste Table states
  const [rawPasteInput, setRawPasteInput] = useState('');
  const [pasteDraftRows, setPasteDraftRows] = useState<PasteDraftRow[]>([]);
  const [isSavingPasteRows, setIsSavingPasteRows] = useState(false);

  // Block 3: Schedule & Search states
  const [scheduleSearchQuery, setScheduleSearchQuery] = useState('');
  const [selectedCleanerFilter, setSelectedCleanerFilter] = useState<string>('ALL');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>(() => getEdmontonToday().dateString);
  const [radarAddressInput, setRadarAddressInput] = useState<string>('10405 Jasper Ave NW, Edmonton, AB');
  const [radarTargetCoords, setRadarTargetCoords] = useState<{ lat: number; lng: number }>(() =>
    estimateAddressCoords('10405 Jasper Ave NW, Edmonton, AB')
  );
  const [isQuickMapGeocoding, setIsQuickMapGeocoding] = useState<boolean>(false);

  // Block 4: Quick Maps states
  const [pinnedMapItem, setPinnedMapItem] = useState<{
    title: string;
    subtitle: string;
    address: string;
    phone?: string;
    amount?: number;
    lat: number;
    lng: number;
    type: 'LEAD' | 'QUOTE' | 'VISIT' | 'HUB';
    addAsExtraPin?: boolean;
    timestamp: number;
  } | null>(null);

  // Helper to shift ISO date string by N days
  const shiftQuickMapDate = (isoDate: string, deltaDays: number): string => {
    const base = isoDate || getEdmontonToday().dateString;
    const [y, m, d] = base.split('-').map(Number);
    const dt = new Date(Date.UTC(y || 2026, (m || 1) - 1, (d || 1) + deltaDays));
    return dt.toISOString().slice(0, 10);
  };

  // Build 14-day (This Week Mon-Sun + Next Week Mon-Sun) strip for Quick Map & Schedule
  const quickMapTwoWeekDays = useMemo(() => {
    const todayStr = getEdmontonToday().dateString;
    const [ty, tm, td] = todayStr.split('-').map(Number);
    const todayUtc = new Date(Date.UTC(ty, tm - 1, td));
    const dow = todayUtc.getUTCDay();
    const diffToMon = dow === 0 ? -6 : 1 - dow;
    const monUtc = new Date(Date.UTC(ty, tm - 1, td + diffToMon));

    const list: {
      iso: string;
      dayShort: string;
      dateLabel: string;
      isToday: boolean;
      jobCount: number;
    }[] = [];

    for (let i = 0; i < 14; i++) {
      const dUtc = new Date(Date.UTC(monUtc.getUTCFullYear(), monUtc.getUTCMonth(), monUtc.getUTCDate() + i));
      const iso = dUtc.toISOString().slice(0, 10);
      const dayShort = dUtc.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
      const dateLabel = dUtc.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
      const jobCount = scheduledJobs.filter((j) => String(j.startAt || '').slice(0, 10) === iso).length;
      list.push({
        iso,
        dayShort,
        dateLabel,
        isToday: iso === todayStr,
        jobCount,
      });
    }
    return list;
  }, [scheduledJobs]);

  // Scheduled jobs on the selected Quick Map / Schedule date
  const quickMapDateJobs = useMemo(() => {
    if (!selectedDateFilter) return scheduledJobs.slice(0, 20);
    return scheduledJobs
      .filter((j) => String(j.startAt || '').slice(0, 10) === selectedDateFilter)
      .sort((a, b) => String(a.startAt || '').localeCompare(String(b.startAt || '')));
  }, [scheduledJobs, selectedDateFilter]);

  // Load connected Google Sheet URL
  useEffect(() => {
    fetch('/api/google-sheets/config')
      .then((r) => r.json())
      .then((d) => {
        if (d?.createdDriveSheetUrl) {
          setSheetUrl(d.createdDriveSheetUrl);
          if (d.createdDriveSheetId) setSpreadsheetId(d.createdDriveSheetId);
        } else if (d?.sheetUrl) {
          setSheetUrl(d.sheetUrl);
          if (d.spreadsheetId) setSpreadsheetId(d.spreadsheetId);
        }
      })
      .catch(() => {});
  }, []);

  // Scroll to block when focusBlock changes
  useEffect(() => {
    if (focusBlock === 'PASTE_TABLE' && pasteBlockRef.current) {
      pasteBlockRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (focusBlock === 'MASTER_TABLE' && masterTableBlockRef.current) {
      masterTableBlockRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (focusBlock === 'SCHEDULE_SEARCH' && scheduleSearchBlockRef.current) {
      scheduleSearchBlockRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (focusBlock === 'QUICK_MAPS' && quickMapsBlockRef.current) {
      quickMapsBlockRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [focusBlock]);

  // Auto-parse raw paste input into editable Paste Table rows
  useEffect(() => {
    if (!rawPasteInput.trim()) return;
    const parsed = parseSmartPasteText(rawPasteInput);
    if (parsed.length > 0) {
      setPasteDraftRows(parsed);
    }
  }, [rawPasteInput]);

  const handleAddBlankPasteRow = () => {
    setPasteDraftRows((prev) => [
      ...prev,
      {
        id: `paste-manual-${Date.now()}`,
        customerName: '',
        phone: '',
        email: '',
        address: 'Edmonton, AB',
        city: 'Edmonton',
        bedrooms: '3 Bedrooms',
        bathrooms: '2 Bathrooms',
        serviceRequested: 'Residential Standard Cleaning',
        quotedAmount: 221.07,
        sourceTab: 'Pasted Leads',
        notes: 'Added via Paste Table',
      },
    ]);
  };

  const handleSavePasteTableRows = async (syncToJobberAndQuotes: boolean) => {
    const validRows = pasteDraftRows.filter((r) => r.customerName.trim() || r.phone.trim() || r.address.trim());
    if (validRows.length === 0) return;

    setIsSavingPasteRows(true);
    try {
      const res = await fetch(`/api/leads/add?project=${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-project-id': projectId },
        body: JSON.stringify({
          leads: validRows.map((r) => ({
            ...r,
            customerName: r.customerName.trim() || 'Pasted Quote Lead',
            source: r.sourceTab === 'FB Leads'
              ? 'Facebook Lead'
              : r.sourceTab === 'Google Leads'
              ? 'Google Lead'
              : r.sourceTab === 'Voice & Quick Quotes'
              ? 'Voice / Quick Quote'
              : 'Pasted message',
          })),
          syncToJobber: syncToJobberAndQuotes,
        }),
      });
      const data = await res.json();
      if (data?.leads) onLeadsUpdated(data.leads);
      if (data?.quotes) onQuotesUpdated(data.quotes);
      if (data?.clients) onClientsUpdated(data.clients);
      setRawPasteInput('');
      setPasteDraftRows([]);
      setLocalBanner(
        syncToJobberAndQuotes
          ? `✓ Saved ${validRows.length} pasted row(s) to Master Leads Table, created Jobber Client & Quote, and linked to Schedule/Maps!`
          : `✓ Added ${validRows.length} row(s) to Master Leads & Quotes Table!`
      );
      setTimeout(() => setLocalBanner(null), 6000);
    } catch (err: any) {
      setLocalBanner(`Could not save pasted rows: ${err?.message || 'Error'}`);
    } finally {
      setIsSavingPasteRows(false);
    }
  };

  const handleSyncToGoogleDriveSheet = async () => {
    setIsSyncingGoogleDriveSheet(true);
    try {
      const result = await syncLeadsToLiveGoogleSheetInDrive({
        spreadsheetId,
        leads,
      });
      setLocalBanner(`✓ Master Leads & Quotes Google Sheet formatted with frozen headers & color-coded sections (${result.updatedRows} rows)!`);
      setTimeout(() => setLocalBanner(null), 6000);
    } catch (err: any) {
      setLocalBanner(`Google Sheet sync note: ${err?.message || 'Click Open Master Sheet to view.'}`);
      setTimeout(() => setLocalBanner(null), 5000);
    } finally {
      setIsSyncingGoogleDriveSheet(false);
    }
  };

  // Unified Master Rows combining all Clean Sheet Leads (FB, Google, Voice/Quo, Pasted) + Jobber Quotes
  const categorizedMasterData = useMemo(() => {
    const qLower = masterSearchQuery.trim().toLowerCase();

    const filterLead = (l: AdLeadItem) => {
      if (!qLower) return true;
      return (
        (l.customerName || '').toLowerCase().includes(qLower) ||
        (l.phone || '').toLowerCase().includes(qLower) ||
        (l.address || '').toLowerCase().includes(qLower) ||
        (l.serviceRequested || '').toLowerCase().includes(qLower) ||
        (l.quoteNumber || '').toLowerCase().includes(qLower) ||
        (l.notes || '').toLowerCase().includes(qLower)
      );
    };

    const filterQuote = (q: JobberQuote) => {
      if (!qLower) return true;
      return (
        (q.clientName || '').toLowerCase().includes(qLower) ||
        (q.clientPhone || '').toLowerCase().includes(qLower) ||
        (q.serviceAddress || '').toLowerCase().includes(qLower) ||
        (q.service || '').toLowerCase().includes(qLower) ||
        (q.quoteNumber || '').toLowerCase().includes(qLower) ||
        (q.notes || '').toLowerCase().includes(qLower)
      );
    };

    const seenLeadIds = new Set<string>();
    const uniqueLeads = leads.filter((l) => {
      if (!l || !l.id) return false;
      if (seenLeadIds.has(l.id)) return false;
      seenLeadIds.add(l.id);
      return filterLead(l);
    });

    const fbLeads: AdLeadItem[] = [];
    const googleLeads: AdLeadItem[] = [];
    const pastedLeads: AdLeadItem[] = [];
    const voiceLeads: AdLeadItem[] = [];

    for (const l of uniqueLeads) {
      const tab = String(l.sourceTab || '');
      const src = String(l.source || '').toLowerCase();
      if (tab === 'FB Leads' || (!tab && (src.includes('fb') || src.includes('facebook')))) {
        fbLeads.push(l);
      } else if (tab === 'Google Leads' || (!tab && src.includes('google'))) {
        googleLeads.push(l);
      } else if (tab === 'Pasted Leads' || (!tab && src.includes('paste'))) {
        pastedLeads.push(l);
      } else {
        voiceLeads.push(l);
      }
    }

    const seenQuoteIds = new Set<string>();
    const seenQuoteNumbers = new Set<string>();
    const jobberQuotesFiltered = quotes.filter((q) => {
      if (!q) return false;
      const id = String(q.id || '').trim();
      const num = String(q.quoteNumber || '').trim();
      if ((id && seenQuoteIds.has(id)) || (num && seenQuoteNumbers.has(num))) return false;
      if (id) seenQuoteIds.add(id);
      if (num) seenQuoteNumbers.add(num);
      return filterQuote(q);
    });

    return {
      fbLeads,
      googleLeads,
      voiceLeads,
      pastedLeads,
      jobberQuotes: jobberQuotesFiltered,
      totalCount:
        fbLeads.length +
        googleLeads.length +
        voiceLeads.length +
        pastedLeads.length +
        jobberQuotesFiltered.length,
    };
  }, [leads, quotes, masterSearchQuery]);

  // Block 3: Filtered Schedule & Search results
  const filteredScheduleJobs = useMemo(() => {
    const q = scheduleSearchQuery.trim().toLowerCase();
    return scheduledJobs
      .filter((job) => {
        if (selectedCleanerFilter !== 'ALL') {
          const matchesCleaner = (job.assignedCleaners || []).some((c) =>
            c.toLowerCase().includes(selectedCleanerFilter.toLowerCase())
          );
          if (!matchesCleaner) return false;
        }
        if (selectedDateFilter) {
          if (!String(job.startAt || '').startsWith(selectedDateFilter)) return false;
        }
        if (!q) return true;
        return (
          (job.clientName || '').toLowerCase().includes(q) ||
          (job.clientPhone || '').toLowerCase().includes(q) ||
          (job.serviceAddress || '').toLowerCase().includes(q) ||
          (job.visitNumber || '').toLowerCase().includes(q) ||
          (job.serviceType || '').toLowerCase().includes(q) ||
          (job.assignedCleaners || []).some((c) => c.toLowerCase().includes(q))
        );
      })
      .slice(0, 25);
  }, [scheduledJobs, scheduleSearchQuery, selectedCleanerFilter, selectedDateFilter]);

  // Closest Cleaners & Hubs to the searched/pinned address (including each cleaner's scheduled jobs on selectedDateFilter!)
  const rankedCleanersByDistance = useMemo(() => {
    const targetAddr = pinnedMapItem?.address || radarAddressInput || 'Edmonton, AB';
    const targetCoords = pinnedMapItem
      ? { lat: pinnedMapItem.lat, lng: pinnedMapItem.lng }
      : radarTargetCoords || estimateAddressCoords(targetAddr);

    return technicians
      .map((tech) => {
        const hubLat = tech.depotLocation?.lat || tech.currentLocation?.lat || 53.5412;
        const hubLng = tech.depotLocation?.lng || tech.currentLocation?.lng || -113.4988;
        const hubAddr = tech.depotLocation?.address || tech.homeAddress || tech.currentLocation?.address || 'Edmonton Hub';
        const hubDistKm = calcDistanceKm(targetCoords.lat, targetCoords.lng, hubLat, hubLng);
        const hubEstMinutes = Math.max(6, Math.round(hubDistKm * 1.65));

        const techFirst = tech.name.split(' ')[0].toLowerCase();
        const jobsOnSelectedDay = quickMapDateJobs.filter((j) =>
          (j.assignedCleaners || []).some(
            (c) => c.toLowerCase().includes(techFirst) || c.toLowerCase().includes(tech.name.toLowerCase())
          )
        );
        const activeJobOnDay = jobsOnSelectedDay[0];
        const jobDistKm = activeJobOnDay
          ? calcDistanceKm(targetCoords.lat, targetCoords.lng, activeJobOnDay.lat, activeJobOnDay.lng)
          : null;
        const jobEstMinutes = jobDistKm !== null ? Math.max(6, Math.round(jobDistKm * 1.65)) : null;

        const distKm = jobDistKm !== null ? Math.min(hubDistKm, jobDistKm) : hubDistKm;
        const estMinutes = jobEstMinutes !== null ? Math.min(hubEstMinutes, jobEstMinutes) : hubEstMinutes;

        return {
          tech,
          hubLat,
          hubLng,
          hubAddr,
          hubDistKm,
          hubEstMinutes,
          jobsOnSelectedDay,
          activeJobOnDay,
          jobDistKm,
          jobEstMinutes,
          distKm,
          estMinutes,
        };
      })
      .sort((a, b) => a.distKm - b.distKm);
  }, [technicians, pinnedMapItem, radarAddressInput, radarTargetCoords, quickMapDateJobs]);

  const handleGeocodeQuickMapAddress = async (addrToSearch?: string) => {
    const query = (addrToSearch ?? radarAddressInput).trim();
    if (!query) return;
    setPinnedMapItem(null);
    setIsQuickMapGeocoding(true);
    try {
      const geo = await forwardGeocode(query);
      setRadarTargetCoords({ lat: geo.lat, lng: geo.lng });
      if (geo.formattedAddress) setRadarAddressInput(geo.formattedAddress);
    } catch {
      setRadarTargetCoords(estimateAddressCoords(query));
    } finally {
      setIsQuickMapGeocoding(false);
    }
  };

  const handlePinItemOnQuickMap = (item: {
    title: string;
    subtitle: string;
    address: string;
    phone?: string;
    amount?: number;
    lat?: number;
    lng?: number;
    type: 'LEAD' | 'QUOTE' | 'VISIT' | 'HUB';
    addAsExtraPin?: boolean;
  }) => {
    const coords =
      item.lat && item.lng ? { lat: item.lat, lng: item.lng } : estimateAddressCoords(item.address);
    setPinnedMapItem({
      ...item,
      lat: coords.lat,
      lng: coords.lng,
      timestamp: Date.now(),
    });
    setRadarAddressInput(item.address);
    setRadarTargetCoords(coords);
    if (quickMapsBlockRef.current) {
      quickMapsBlockRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  // Clickable Category Header definitions matching our Google Sheet colors
  const categoryHeaders: Array<{
    id: MasterCategoryFilter;
    label: string;
    shortLabel: string;
    count: number;
    bgHeader: string;
    badgeBg: string;
    borderCol: string;
    icon: string;
  }> = [
    {
      id: 'ALL',
      label: 'All Master Leads & Quotes',
      shortLabel: 'All Master Rows',
      count: categorizedMasterData.totalCount,
      bgHeader: 'from-slate-800 to-slate-900',
      badgeBg: 'bg-emerald-500 text-white',
      borderCol: 'border-slate-700',
      icon: '📊',
    },
    {
      id: 'FB Leads',
      label: 'Facebook Ads & Messenger Leads',
      shortLabel: 'Facebook Leads',
      count: categorizedMasterData.fbLeads.length,
      bgHeader: 'from-[#1877F2] to-[#1558B0]',
      badgeBg: 'bg-blue-100 text-blue-900',
      borderCol: 'border-blue-500',
      icon: '🔵',
    },
    {
      id: 'Google Leads',
      label: 'Google Ads & Local Search Leads',
      shortLabel: 'Google Leads',
      count: categorizedMasterData.googleLeads.length,
      bgHeader: 'from-[#0F9D58] to-[#0B8043]',
      badgeBg: 'bg-emerald-100 text-emerald-900',
      borderCol: 'border-emerald-500',
      icon: '🟢',
    },
    {
      id: 'Voice & Quick Quotes',
      label: 'Voice Quotes & Sona AI Call Transcripts',
      shortLabel: 'Voice & Quick Quotes',
      count: categorizedMasterData.voiceLeads.length,
      bgHeader: 'from-[#7C3AED] to-[#5B21B6]',
      badgeBg: 'bg-purple-100 text-purple-900',
      borderCol: 'border-purple-500',
      icon: '🟣',
    },
    {
      id: 'Pasted Leads',
      label: 'Pasted Leads & Pasted Quotes',
      shortLabel: 'Pasted Leads',
      count: categorizedMasterData.pastedLeads.length,
      bgHeader: 'from-[#D97706] to-[#B45309]',
      badgeBg: 'bg-amber-100 text-amber-950',
      borderCol: 'border-amber-500',
      icon: '🟠',
    },
    {
      id: 'Jobber Quotes',
      label: 'Synced Jobber Quotes Ledger',
      shortLabel: 'Jobber Quotes',
      count: categorizedMasterData.jobberQuotes.length,
      bgHeader: 'from-[#0284C7] to-[#0369A1]',
      badgeBg: 'bg-sky-100 text-sky-950',
      borderCol: 'border-sky-500',
      icon: '🩵',
    },
  ];

  const renderLeadRow = (lead: AdLeadItem, theme: { rowBg: string; badgeClass: string; iconLabel: string }) => {
    const hasTranscript = Boolean(
      (lead as any).transcriptText ||
        (lead as any).aiSummary ||
        (lead.notes && (lead.notes.includes('Transcript:') || lead.notes.includes('AI Summary:')))
    );
    const isExpanded = expandedTranscriptRowId === lead.id;

    return (
      <React.Fragment key={`lead-row-${lead.id}`}>
        <tr className={`border-b border-slate-200/80 transition-colors ${theme.rowBg}`}>
          <td className="px-3 py-2.5 whitespace-nowrap">
            <button
              type="button"
              onClick={() =>
                setActiveCategory(
                  lead.sourceTab === 'FB Leads'
                    ? 'FB Leads'
                    : lead.sourceTab === 'Google Leads'
                    ? 'Google Leads'
                    : lead.sourceTab === 'Pasted Leads'
                    ? 'Pasted Leads'
                    : 'Voice & Quick Quotes'
                )
              }
              className={`px-2.5 py-1 rounded-lg text-[11px] font-black inline-flex items-center gap-1 shadow-2xs cursor-pointer hover:opacity-90 ${theme.badgeClass}`}
              title="Click to filter by this source category"
            >
              <span>{theme.iconLabel}</span>
            </button>
          </td>
          <td className="px-3 py-2.5 text-xs font-mono font-bold text-slate-700 whitespace-nowrap">
            {String(lead.dateOfServiceRequested || lead.dateReceived || '').slice(0, 10) || '2026-10-16'}
          </td>
          <td className="px-3 py-2.5">
            <div className="font-black text-slate-900 text-xs sm:text-sm">{lead.customerName}</div>
            {lead.email && <div className="text-[11px] text-slate-500 font-mono">{lead.email}</div>}
          </td>
          <td className="px-3 py-2.5 whitespace-nowrap">
            {lead.phone ? (
              <a
                href={`tel:${lead.phone.replace(/\D/g, '')}`}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-slate-200 text-xs font-mono font-black text-slate-800 hover:border-emerald-400 hover:text-emerald-700 shadow-2xs"
              >
                <Phone className="w-3 h-3 text-emerald-600" />
                <span>{lead.phone}</span>
              </a>
            ) : (
              <span className="text-[11px] text-amber-700 font-bold">No Phone</span>
            )}
          </td>
          <td className="px-3 py-2.5 max-w-[220px]">
            <button
              type="button"
              onClick={() =>
                handlePinItemOnQuickMap({
                  title: lead.customerName,
                  subtitle: `${lead.bedrooms || '3 Bed'} • ${lead.bathrooms || '2 Bath'} — ${lead.serviceRequested}`,
                  address: `${lead.address || 'Edmonton'}, ${lead.city || 'Edmonton'}, AB`,
                  phone: lead.phone,
                  amount: lead.quotedAmount,
                  type: 'LEAD',
                })
              }
              className="text-left group cursor-pointer"
              title="Click to pin this address on Quick Maps & calculate cleaner distance"
            >
              <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span className="truncate">{lead.address || 'Edmonton, AB'}</span>
              </div>
              <div className="text-[10px] text-slate-500 font-semibold pl-4">
                {lead.city || 'Edmonton'} {lead.postalCode ? `• ${lead.postalCode}` : ''}
              </div>
            </button>
          </td>
          <td className="px-3 py-2.5 max-w-[260px]">
            <div className="text-xs font-extrabold text-slate-900">{lead.serviceRequested || 'Residential Cleaning'}</div>
            <div className="text-[11px] text-slate-600 font-medium">
              {lead.bedrooms || '3 Bedrooms'} • {lead.bathrooms || '2 Bathrooms'}
            </div>
            {lead.notes && (
              <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5" title={lead.notes}>
                {lead.notes}
              </div>
            )}
            {hasTranscript && (
              <button
                type="button"
                onClick={() => setExpandedTranscriptRowId(isExpanded ? null : lead.id)}
                className="mt-1 px-2 py-0.5 rounded-md bg-violet-100 hover:bg-violet-200 text-violet-900 border border-violet-300 text-[10px] font-black inline-flex items-center gap-1 cursor-pointer"
              >
                <span>🎙️ {isExpanded ? 'Hide Call Transcript' : 'View Missed Call / Sona AI Transcript'}</span>
              </button>
            )}
          </td>
          <td className="px-3 py-2.5 whitespace-nowrap">
            <div className="text-xs sm:text-sm font-black font-mono text-emerald-800">
              ${Number(lead.quotedAmount || 221.07).toFixed(2)}
            </div>
            {lead.quoteNumber && (
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                {lead.quoteNumber}
              </span>
            )}
          </td>
          <td className="px-3 py-2.5 whitespace-nowrap">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                lead.isJobberSynced
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}
            >
              {lead.isJobberSynced ? '✓ Synced' : lead.status || 'New Lead'}
            </span>
          </td>
          <td className="px-3 py-2.5 whitespace-nowrap">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onOpenQuickQuote(lead)}
                className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-95 text-white text-[11px] font-black flex items-center gap-1 shadow-2xs cursor-pointer"
                title="Open Quick Quote & Jobber Estimator for this Lead"
              >
                <Calculator className="w-3 h-3" />
                <span>Quote</span>
              </button>
              <button
                type="button"
                onClick={() => onConvertLeadToJob(lead)}
                className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black flex items-center gap-1 shadow-2xs cursor-pointer"
                title="Convert Lead into Scheduled Job"
              >
                <Calendar className="w-3 h-3" />
                <span>Book</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  handlePinItemOnQuickMap({
                    title: lead.customerName,
                    subtitle: `${lead.bedrooms || '3 Bed'} • ${lead.bathrooms || '2 Bath'}`,
                    address: `${lead.address || 'Edmonton'}, ${lead.city || 'Edmonton'}, AB`,
                    phone: lead.phone,
                    amount: lead.quotedAmount,
                    type: 'LEAD',
                  })
                }
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 cursor-pointer"
                title="Pin on Quick Map & Check Cleaner Distance"
              >
                <MapPin className="w-3.5 h-3.5 text-rose-600" />
              </button>
            </div>
          </td>
        </tr>
        {isExpanded && (
          <tr className="bg-violet-50/90 border-b border-violet-200">
            <td colSpan={9} className="px-4 py-3">
              <div className="rounded-xl bg-white border border-violet-300 p-3 shadow-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-violet-900">
                    🎙️ Screened Call / Sona AI &amp; Voicemail Transcript — {lead.customerName} ({lead.phone})
                  </span>
                  <button
                    type="button"
                    onClick={() => setExpandedTranscriptRowId(null)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Close ✕
                  </button>
                </div>
                {(lead as any).aiSummary && (
                  <p className="text-xs text-slate-800 bg-violet-50 p-2 rounded-lg border border-violet-200 font-medium">
                    <strong>AI Summary:</strong> {(lead as any).aiSummary}
                  </p>
                )}
                <pre className="text-[11px] text-slate-700 whitespace-pre-wrap font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-200 max-h-44 overflow-y-auto">
                  {(lead as any).transcriptText || lead.notes}
                </pre>
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  const renderQuoteRow = (quote: JobberQuote) => {
    const numId = extractJobberNumericId(quote.id);
    const jobberUrl =
      quote.jobberWebUri && !quote.jobberWebUri.includes('Z2lkOi8v')
        ? quote.jobberWebUri
        : numId
        ? `https://secure.getjobber.com/quotes/${numId}`
        : 'https://secure.getjobber.com/quotes';

    return (
      <tr key={`quote-row-${quote.id || quote.quoteNumber}`} className="border-b border-sky-200/70 bg-sky-50/55 hover:bg-sky-100/70 transition-colors">
        <td className="px-3 py-2.5 whitespace-nowrap">
          <button
            type="button"
            onClick={() => setActiveCategory('Jobber Quotes')}
            className="px-2.5 py-1 rounded-lg text-[11px] font-black inline-flex items-center gap-1 bg-sky-600 text-white shadow-2xs cursor-pointer"
          >
            <span>🩵 Jobber Quote</span>
          </button>
        </td>
        <td className="px-3 py-2.5 text-xs font-mono font-bold text-slate-700 whitespace-nowrap">
          {String(quote.scheduledDate || quote.createdAt || '').slice(0, 10) || '2026-10-16'}
        </td>
        <td className="px-3 py-2.5">
          <div className="font-black text-slate-900 text-xs sm:text-sm">{quote.clientName}</div>
          <div className="text-[11px] font-mono font-bold text-sky-700">{quote.quoteNumber}</div>
        </td>
        <td className="px-3 py-2.5 whitespace-nowrap">
          {quote.clientPhone ? (
            <a
              href={`tel:${quote.clientPhone.replace(/\D/g, '')}`}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-slate-200 text-xs font-mono font-black text-slate-800 hover:border-sky-400 hover:text-sky-700 shadow-2xs"
            >
              <Phone className="w-3 h-3 text-sky-600" />
              <span>{quote.clientPhone}</span>
            </a>
          ) : (
            <span className="text-[11px] text-slate-400">—</span>
          )}
        </td>
        <td className="px-3 py-2.5 max-w-[220px]">
          <button
            type="button"
            onClick={() =>
              handlePinItemOnQuickMap({
                title: `${quote.clientName} (${quote.quoteNumber})`,
                subtitle: quote.service || 'Residential Cleaning',
                address: quote.serviceAddress || 'Edmonton, AB',
                phone: quote.clientPhone,
                amount: quote.total,
                type: 'QUOTE',
              })
            }
            className="text-left group cursor-pointer"
          >
            <div className="text-xs font-bold text-slate-800 group-hover:text-sky-700 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span className="truncate">{quote.serviceAddress || 'Edmonton, AB'}</span>
            </div>
          </button>
        </td>
        <td className="px-3 py-2.5 max-w-[260px]">
          <div className="text-xs font-extrabold text-slate-900">{quote.service || 'Residential Cleaning'}</div>
          <div className="text-[11px] text-slate-600 font-medium">
            {quote.bedrooms || '3 Bedrooms'} • {quote.bathrooms || '2 Bathrooms'}
          </div>
          {quote.notes && (
            <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5" title={quote.notes}>
              {quote.notes}
            </div>
          )}
        </td>
        <td className="px-3 py-2.5 whitespace-nowrap">
          <div className="text-xs sm:text-sm font-black font-mono text-sky-900">
            ${Number(quote.total || 0).toFixed(2)}
          </div>
          {quote.depositRequired ? (
            <div className="text-[10px] font-mono text-emerald-700 font-bold">
              Dep: ${Number(quote.depositRequired).toFixed(0)}
            </div>
          ) : null}
        </td>
        <td className="px-3 py-2.5 whitespace-nowrap">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
              quote.quoteStatus === 'APPROVED' || quote.quoteStatus === 'CONVERTED'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : quote.quoteStatus === 'AWAITING_RESPONSE'
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'bg-sky-100 text-sky-800 border border-sky-300'
            }`}
          >
            {quote.quoteStatus || 'DRAFT'}
          </span>
        </td>
        <td className="px-3 py-2.5 whitespace-nowrap">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onOpenQuoteDetail(quote)}
              className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-black flex items-center gap-1 shadow-2xs cursor-pointer"
              title="Open Quote Details & Send SMS"
            >
              <FileCheck className="w-3 h-3" />
              <span>Open Quote</span>
            </button>
            <a
              href={jobberUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-[11px] font-bold flex items-center gap-1 shadow-2xs"
              title="Open in Jobber"
            >
              <ExternalLink className="w-3 h-3 text-emerald-600" />
              <span>Jobber</span>
            </a>
            <button
              type="button"
              onClick={() =>
                handlePinItemOnQuickMap({
                  title: `${quote.clientName} (${quote.quoteNumber})`,
                  subtitle: quote.service || 'Residential Cleaning',
                  address: quote.serviceAddress || 'Edmonton, AB',
                  phone: quote.clientPhone,
                  amount: quote.total,
                  type: 'QUOTE',
                })
              }
              className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 cursor-pointer"
              title="Pin Quote Address on Quick Map"
            >
              <MapPin className="w-3.5 h-3.5 text-rose-600" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-100 text-slate-900 p-3 sm:p-5 space-y-5 pb-20">
      {/* ───────────────────────────────────────────────────────────────────────
          TOP MASTER COMMAND HEADER & 1-BUTTON "SYNC EVERYTHING" BAR
      ─────────────────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-4 sm:p-5 shadow-xl border border-emerald-500/30">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Auto-Sync on Login Active
              </span>
              {lastSyncedAllAt && (
                <span className="text-[11px] text-slate-300 font-mono">
                  Last Synced: {new Date(lastSyncedAllAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2.5">
              <FileSpreadsheet className="w-7 h-7 text-emerald-400 shrink-0" />
              <span>TidyUps Master Leads &amp; Quotes Table</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl">
              All 4 daily command blocks on one page: <strong>1. Paste Table</strong> • <strong>2. Master Leads &amp; Quotes Table</strong> (Clickable Facebook, Google, Voice Quotes &amp; Pasted Headers) • <strong>3. Schedule &amp; Search</strong> • <strong>4. Quick Maps</strong>
            </p>
          </div>

          {/* 1-BUTTON SYNC ALL + GOOGLE SHEET SHORTCUTS */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onSyncEverything}
              disabled={isSyncingEverything}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer transition-all active:scale-95 disabled:opacity-60"
              title="One Button Syncs Everything: Jobber Quotes, Jobber Invoices, Jobber Calendar Visits, Jobber Clients, Outbound Push, Quo/Sona AI Calls, and Master Leads Sheet!"
            >
              <RefreshCw className={`w-4 h-4 stroke-[2.5] ${isSyncingEverything ? 'animate-spin' : ''}`} />
              <span>
                {isSyncingEverything
                  ? 'Syncing All 6 Modules...'
                  : '🔄 Sync Everything (Quotes + Invoices + Jobber + Calls + Leads)'}
              </span>
            </button>

            <a
              href={sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Open your formatted TidyUps Master Google Sheet in Google Drive"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Open Master Google Sheet</span>
              <ExternalLink className="w-3.5 h-3.5 text-emerald-300" />
            </a>

            <button
              type="button"
              onClick={handleSyncToGoogleDriveSheet}
              disabled={isSyncingGoogleDriveSheet}
              className="px-3.5 py-2.5 rounded-2xl bg-emerald-800/80 hover:bg-emerald-700 border border-emerald-500/40 text-emerald-100 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              title="Format & push color-coded sections and frozen headers to Google Drive Sheet"
            >
              <CloudUpload className="w-4 h-4 text-emerald-300" />
              <span>{isSyncingGoogleDriveSheet ? 'Formatting Sheet...' : 'Push Styled Colors to Google Sheet'}</span>
            </button>
          </div>
        </div>

        {/* Status Toast Banner */}
        {(syncAllStatusMessage || localBanner) && (
          <div className="mt-3 px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-100 text-xs font-bold flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{localBanner || syncAllStatusMessage}</span>
            </div>
          </div>
        )}

        {/* 6Synced Module Summary Pills + 4-Block Jump Bar */}
        <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={() => onFocusBlockChange?.('ALL')}
              className={`px-3 py-1 rounded-xl font-black cursor-pointer transition-all ${
                focusBlock === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'bg-white/10 text-slate-200 hover:bg-white/20'
              }`}
            >
              🏛️ All 4 Blocks View
            </button>
            <button
              type="button"
              onClick={() => onFocusBlockChange?.('PASTE_TABLE')}
              className={`px-3 py-1 rounded-xl font-black cursor-pointer transition-all ${
                focusBlock === 'PASTE_TABLE'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'bg-amber-500/20 text-amber-200 border border-amber-400/30 hover:bg-amber-500/30'
              }`}
            >
              📋 1. Paste Table ({categorizedMasterData.pastedLeads.length})
            </button>
            <button
              type="button"
              onClick={() => onFocusBlockChange?.('MASTER_TABLE')}
              className={`px-3 py-1 rounded-xl font-black cursor-pointer transition-all ${
                focusBlock === 'MASTER_TABLE'
                  ? 'bg-emerald-400 text-slate-950 shadow-xs'
                  : 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 hover:bg-emerald-500/30'
              }`}
            >
              📊 2. Master Leads &amp; Quotes Table ({categorizedMasterData.totalCount})
            </button>
            <button
              type="button"
              onClick={() => onFocusBlockChange?.('SCHEDULE_SEARCH')}
              className={`px-3 py-1 rounded-xl font-black cursor-pointer transition-all ${
                focusBlock === 'SCHEDULE_SEARCH'
                  ? 'bg-purple-400 text-slate-950 shadow-xs'
                  : 'bg-purple-500/20 text-purple-200 border border-purple-400/30 hover:bg-purple-500/30'
              }`}
            >
              📅 3. Schedule &amp; Search ({scheduledJobs.length})
            </button>
            <button
              type="button"
              onClick={onNavigateToAddressRadar}
              className="px-3 py-1 rounded-xl font-black cursor-pointer transition-all bg-sky-400 hover:bg-sky-300 text-slate-950 shadow-xs flex items-center gap-1.5"
              title="Open Quick Map & Schedule Radar on its own dedicated full page"
            >
              <span>🗺️ 4. Quick Map &amp; Schedule Radar (Open Page ↗)</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
            <button
              type="button"
              onClick={onNavigateToQuotes}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-sky-200 font-bold cursor-pointer"
            >
              Quotes: {quotes.length}
            </button>
            <button
              type="button"
              onClick={onNavigateToInvoices}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-emerald-200 font-bold cursor-pointer"
            >
              Invoices: {invoices.length}
            </button>
            <span className="px-2.5 py-1 rounded-lg bg-white/10 text-purple-200 font-bold">
              Clients: {clients.length}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/10 text-amber-200 font-bold">
              Calls/Sona AI: {calls.length}
            </span>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          BLOCK 1: THE PASTE TABLE (PASTE QUOTES & PASTED LEADS)
      ─────────────────────────────────────────────────────────────────────── */}
      {(focusBlock === 'ALL' || focusBlock === 'PASTE_TABLE') && (
        <section
          ref={pasteBlockRef}
          id="block-paste-table"
          className="rounded-3xl bg-white border-2 border-amber-300 shadow-md overflow-hidden"
        >
          <div className="bg-gradient-to-r from-[#D97706] via-[#EA580C] to-[#B45309] px-4 sm:px-6 py-3.5 text-white flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-black text-lg">
                📋
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                  <span>BLOCK 1: THE PASTE TABLE (Paste Quotes &amp; Pasted Leads)</span>
                  <span className="px-2 py-0.5 rounded-full bg-white text-amber-900 text-xs font-mono font-black">
                    {categorizedMasterData.pastedLeads.length} Saved
                  </span>
                </h2>
                <p className="text-xs text-amber-100">
                  Paste raw customer texts, quote notes, Facebook/Google lead messages, or spreadsheet rows — auto-links into Master Table, Jobber Quotes, Schedule &amp; Maps!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddBlankPasteRow}
                className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-black text-xs flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Blank Row</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenQuickQuote()}
                className="px-3 py-1.5 rounded-xl bg-white text-amber-950 hover:bg-amber-50 font-black text-xs flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <Calculator className="w-3.5 h-3.5 text-amber-700" />
                <span>Open Full Quote Calculator</span>
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left: Instant Paste Box */}
              <div className="lg:col-span-5 space-y-2">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">
                  1. Paste Customer Quote / Lead Text or Spreadsheet Rows Here:
                </label>
                <textarea
                  value={rawPasteInput}
                  onChange={(e) => setRawPasteInput(e.target.value)}
                  rows={4}
                  placeholder={`Paste anything here! Examples:\nSarah Jenkins (780) 555-0144, 10420 122 St NW Edmonton, 3 Bed 2 Bath Deep Cleaning $265\nJohn Miller\t587-555-0192\t8812 149 St NW\tMove Out Cleaning\t$320`}
                  className="w-full rounded-2xl border-2 border-amber-300 bg-amber-50/40 focus:bg-white focus:border-amber-500 p-3 text-xs font-mono text-slate-800 outline-none transition-all"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={pasteDraftRows.length === 0 || isSavingPasteRows}
                    onClick={() => handleSavePasteTableRows(true)}
                    className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {isSavingPasteRows
                        ? 'Saving & Linking...'
                        : `Save & Link to Everything (${pasteDraftRows.length || 0} Row${pasteDraftRows.length === 1 ? '' : 's'})`}
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={pasteDraftRows.length === 0 || isSavingPasteRows}
                    onClick={() => handleSavePasteTableRows(false)}
                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                  >
                    Save to Master Table Only
                  </button>
                </div>
              </div>

              {/* Right: Live Editable Paste Staging Table OR Saved Pasted Leads */}
              <div className="lg:col-span-7 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                    {pasteDraftRows.length > 0
                      ? `2. Review & Edit Pasted Rows Before Saving (${pasteDraftRows.length})`
                      : `Recent Pasted Quotes & Leads (${categorizedMasterData.pastedLeads.length})`}
                  </span>
                  {pasteDraftRows.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setRawPasteInput('');
                        setPasteDraftRows([]);
                      }}
                      className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      Clear Drafts
                    </button>
                  )}
                </div>

                {pasteDraftRows.length > 0 ? (
                  <div className="overflow-x-auto rounded-2xl border border-amber-300 bg-amber-50/30 max-h-60">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-amber-100/90 text-amber-950 font-black sticky top-0 z-10">
                        <tr>
                          <th className="p-2">Source</th>
                          <th className="p-2">Client Name</th>
                          <th className="p-2">Phone</th>
                          <th className="p-2">Address</th>
                          <th className="p-2">Bed/Bath &amp; Service</th>
                          <th className="p-2">Quote ($)</th>
                          <th className="p-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-200/60">
                        {pasteDraftRows.map((row, idx) => (
                          <tr key={row.id} className="bg-white/90">
                            <td className="p-1.5">
                              <select
                                value={row.sourceTab}
                                onChange={(e) => {
                                  const val = e.target.value as PasteDraftRow['sourceTab'];
                                  setPasteDraftRows((prev) =>
                                    prev.map((r, i) => (i === idx ? { ...r, sourceTab: val } : r))
                                  );
                                }}
                                className="rounded-lg border border-slate-300 px-1.5 py-1 text-[11px] font-bold bg-white"
                              >
                                <option value="Pasted Leads">🟠 Pasted</option>
                                <option value="FB Leads">🔵 Facebook</option>
                                <option value="Google Leads">🟢 Google</option>
                                <option value="Voice & Quick Quotes">🟣 Voice</option>
                              </select>
                            </td>
                            <td className="p-1.5">
                              <input
                                type="text"
                                value={row.customerName}
                                onChange={(e) =>
                                  setPasteDraftRows((prev) =>
                                    prev.map((r, i) => (i === idx ? { ...r, customerName: e.target.value } : r))
                                  )
                                }
                                className="w-28 rounded-lg border border-slate-300 px-2 py-1 text-xs font-bold"
                                placeholder="Name"
                              />
                            </td>
                            <td className="p-1.5">
                              <input
                                type="text"
                                value={row.phone}
                                onChange={(e) =>
                                  setPasteDraftRows((prev) =>
                                    prev.map((r, i) => (i === idx ? { ...r, phone: e.target.value } : r))
                                  )
                                }
                                className="w-28 rounded-lg border border-slate-300 px-2 py-1 text-xs font-mono"
                                placeholder="(780) 555-0199"
                              />
                            </td>
                            <td className="p-1.5">
                              <input
                                type="text"
                                value={row.address}
                                onChange={(e) =>
                                  setPasteDraftRows((prev) =>
                                    prev.map((r, i) => (i === idx ? { ...r, address: e.target.value } : r))
                                  )
                                }
                                className="w-36 rounded-lg border border-slate-300 px-2 py-1 text-xs"
                                placeholder="Address"
                              />
                            </td>
                            <td className="p-1.5">
                              <input
                                type="text"
                                value={row.serviceRequested}
                                onChange={(e) =>
                                  setPasteDraftRows((prev) =>
                                    prev.map((r, i) => (i === idx ? { ...r, serviceRequested: e.target.value } : r))
                                  )
                                }
                                className="w-36 rounded-lg border border-slate-300 px-2 py-1 text-xs"
                              />
                            </td>
                            <td className="p-1.5">
                              <input
                                type="number"
                                step="0.01"
                                value={row.quotedAmount}
                                onChange={(e) =>
                                  setPasteDraftRows((prev) =>
                                    prev.map((r, i) =>
                                      i === idx ? { ...r, quotedAmount: parseFloat(e.target.value) || 0 } : r
                                    )
                                  )
                                }
                                className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-xs font-mono font-bold"
                              />
                            </td>
                            <td className="p-1.5">
                              <button
                                type="button"
                                onClick={() => setPasteDraftRows((prev) => prev.filter((_, i) => i !== idx))}
                                className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-amber-200 bg-amber-50/40 max-h-56">
                    {categorizedMasterData.pastedLeads.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500">
                        No pasted leads yet — paste any quote or customer message on the left or click <strong>+ Add Blank Row</strong> to start!
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-amber-100/80 text-amber-950 font-black sticky top-0">
                          <tr>
                            <th className="p-2">Client</th>
                            <th className="p-2">Phone</th>
                            <th className="p-2">Address</th>
                            <th className="p-2">Service</th>
                            <th className="p-2">Quote</th>
                            <th className="p-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-200/50">
                          {categorizedMasterData.pastedLeads.map((pl) => (
                            <tr key={pl.id} className="bg-white/80 hover:bg-amber-50">
                              <td className="p-2 font-black text-slate-900">{pl.customerName}</td>
                              <td className="p-2 font-mono text-slate-700">{pl.phone || '—'}</td>
                              <td className="p-2 text-slate-700 truncate max-w-[150px]">{pl.address}</td>
                              <td className="p-2 text-slate-700 truncate max-w-[150px]">{pl.serviceRequested}</td>
                              <td className="p-2 font-mono font-black text-emerald-700">
                                ${Number(pl.quotedAmount || 221.07).toFixed(2)}
                              </td>
                              <td className="p-2">
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => onOpenQuickQuote(pl)}
                                    className="px-2 py-0.5 rounded bg-amber-600 text-white font-bold text-[10px] cursor-pointer"
                                  >
                                    Quote
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onConvertLeadToJob(pl)}
                                    className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px] cursor-pointer"
                                  >
                                    Book
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          BLOCK 2: TIDYUPS MASTER LEADS & QUOTES TABLE (FROZEN HEADERS & CLICKABLE COLOR SECTIONS)
      ─────────────────────────────────────────────────────────────────────── */}
      {(focusBlock === 'ALL' || focusBlock === 'MASTER_TABLE') && (
        <section
          ref={masterTableBlockRef}
          id="block-master-leads-table"
          className="rounded-3xl bg-white border-2 border-emerald-400 shadow-lg overflow-hidden"
        >
          {/* Top Bar of Block 2 */}
          <div className="bg-gradient-to-r from-[#0F4C3A] via-[#0D5C46] to-[#0F4C3A] px-4 sm:px-6 py-4 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-400/20 border border-emerald-300/40 flex items-center justify-center text-xl">
                📊
              </div>
              <div>
                <h2 className="text-base sm:text-xl font-black tracking-tight flex items-center gap-2">
                  <span>BLOCK 2: TIDYUPS MASTER LEADS &amp; QUOTES TABLE</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-400 text-slate-950 text-xs font-mono font-black">
                    {categorizedMasterData.totalCount} Total Rows
                  </span>
                </h2>
                <p className="text-xs text-emerald-100">
                  Frozen headers &amp; color-coded clickable sections: Click <strong>Facebook Leads</strong>, <strong>Google Leads</strong>, <strong>Voice &amp; Quick Quotes</strong>, <strong>Pasted Leads</strong>, or <strong>Jobber Quotes</strong> below!
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={masterSearchQuery}
                  onChange={(e) => setMasterSearchQuery(e.target.value)}
                  placeholder="Search name, phone, address, quote #..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white text-slate-900 text-xs font-bold border border-emerald-300 outline-none"
                />
              </div>
              <button
                type="button"
                onClick={onNavigateToFullLeadsSheet}
                className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1 cursor-pointer border border-white/20"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
                <span>Full Sheet Tools &amp; Webhooks</span>
              </button>
            </div>
          </div>

          {/* CLICKABLE COLOR-CODED CATEGORY HEADERS (Facebook, Google, Voice Quotes, Pasted Leads, Jobber Quotes) */}
          <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
            {categoryHeaders.map((cat) => {
              const isSelected = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`p-2.5 rounded-2xl bg-gradient-to-r ${cat.bgHeader} text-white text-left transition-all cursor-pointer flex flex-col justify-between shadow-sm hover:scale-[1.01] active:scale-98 ${
                    isSelected ? 'ring-4 ring-emerald-400 shadow-md scale-[1.01]' : 'opacity-90 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between w-full gap-1">
                    <span className="text-sm">{cat.icon}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-black ${cat.badgeBg}`}>
                      {cat.count}
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <div className="text-xs font-black leading-tight">{cat.shortLabel}</div>
                    <div className="text-[10px] text-white/80 font-medium truncate">
                      {isSelected ? '✓ Showing Now' : 'Click to View'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* SPREADSHEET TABLE WITH FROZEN STICKY HEADER */}
          <div className="overflow-x-auto max-h-[540px] overflow-y-auto relative">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-900 text-white text-[11px] font-black uppercase tracking-wider sticky top-0 z-20 shadow-sm">
                <tr>
                  <th className="px-3 py-3 border-r border-slate-700">Source Tab (Clickable)</th>
                  <th className="px-3 py-3 border-r border-slate-700">Date</th>
                  <th className="px-3 py-3 border-r border-slate-700">Customer Name</th>
                  <th className="px-3 py-3 border-r border-slate-700">Phone</th>
                  <th className="px-3 py-3 border-r border-slate-700">Address &amp; Map Pin</th>
                  <th className="px-3 py-3 border-r border-slate-700">Bed / Bath &amp; Service</th>
                  <th className="px-3 py-3 border-r border-slate-700">Quote / Total ($)</th>
                  <th className="px-3 py-3 border-r border-slate-700">Status</th>
                  <th className="px-3 py-3">Quick Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* 1. FACEBOOK LEADS SECTION */}
                {(activeCategory === 'ALL' || activeCategory === 'FB Leads') && (
                  <>
                    <tr
                      onClick={() => setActiveCategory(activeCategory === 'FB Leads' ? 'ALL' : 'FB Leads')}
                      className="bg-gradient-to-r from-[#1877F2] to-[#1558B0] text-white cursor-pointer hover:opacity-95"
                      title="Click header to toggle Facebook Leads view"
                    >
                      <td colSpan={9} className="px-4 py-2 text-xs font-black tracking-wide">
                        <div className="flex items-center justify-between">
                          <span>🔵 FACEBOOK ADS &amp; MESSENGER LEADS ({categorizedMasterData.fbLeads.length}) — Click Header to Filter</span>
                          <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-md font-mono">
                            {activeCategory === 'FB Leads' ? 'Showing Only Facebook Leads (Click to Show All)' : 'Click to Isolate Facebook Leads'}
                          </span>
                        </div>
                      </td>
                    </tr>
                    {categorizedMasterData.fbLeads.map((lead) =>
                      renderLeadRow(lead, {
                        rowBg: 'bg-blue-50/60 hover:bg-blue-100/70',
                        badgeClass: 'bg-[#1877F2] text-white',
                        iconLabel: '🔵 FB Lead',
                      })
                    )}
                  </>
                )}

                {/* 2. GOOGLE LEADS SECTION */}
                {(activeCategory === 'ALL' || activeCategory === 'Google Leads') && (
                  <>
                    <tr
                      onClick={() => setActiveCategory(activeCategory === 'Google Leads' ? 'ALL' : 'Google Leads')}
                      className="bg-gradient-to-r from-[#0F9D58] to-[#0B8043] text-white cursor-pointer hover:opacity-95"
                      title="Click header to toggle Google Leads view"
                    >
                      <td colSpan={9} className="px-4 py-2 text-xs font-black tracking-wide">
                        <div className="flex items-center justify-between">
                          <span>🟢 GOOGLE ADS &amp; LOCAL SEARCH LEADS ({categorizedMasterData.googleLeads.length}) — Click Header to Filter</span>
                          <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-md font-mono">
                            {activeCategory === 'Google Leads' ? 'Showing Only Google Leads (Click to Show All)' : 'Click to Isolate Google Leads'}
                          </span>
                        </div>
                      </td>
                    </tr>
                    {categorizedMasterData.googleLeads.map((lead) =>
                      renderLeadRow(lead, {
                        rowBg: 'bg-emerald-50/60 hover:bg-emerald-100/70',
                        badgeClass: 'bg-[#0F9D58] text-white',
                        iconLabel: '🟢 Google Lead',
                      })
                    )}
                  </>
                )}

                {/* 3. VOICE & QUICK QUOTES (QUO / SONA AI) SECTION */}
                {(activeCategory === 'ALL' || activeCategory === 'Voice & Quick Quotes') && (
                  <>
                    <tr
                      onClick={() =>
                        setActiveCategory(activeCategory === 'Voice & Quick Quotes' ? 'ALL' : 'Voice & Quick Quotes')
                      }
                      className="bg-gradient-to-r from-[#7C3AED] to-[#5B21B6] text-white cursor-pointer hover:opacity-95"
                      title="Click header to toggle Voice & Quick Quotes view"
                    >
                      <td colSpan={9} className="px-4 py-2 text-xs font-black tracking-wide">
                        <div className="flex items-center justify-between">
                          <span>
                            🟣 VOICE &amp; QUICK QUOTES • QUO / SONA AI SCREENED CALLS ({categorizedMasterData.voiceLeads.length}) — Click Header to Filter
                          </span>
                          <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-md font-mono">
                            {activeCategory === 'Voice & Quick Quotes'
                              ? 'Showing Only Voice Quotes (Click to Show All)'
                              : 'Click to Isolate Voice Quotes'}
                          </span>
                        </div>
                      </td>
                    </tr>
                    {categorizedMasterData.voiceLeads.map((lead) =>
                      renderLeadRow(lead, {
                        rowBg: 'bg-purple-50/60 hover:bg-purple-100/70',
                        badgeClass: 'bg-[#7C3AED] text-white',
                        iconLabel: '🟣 Voice Quote',
                      })
                    )}
                  </>
                )}

                {/* 4. PASTED LEADS & QUOTES SECTION */}
                {(activeCategory === 'ALL' || activeCategory === 'Pasted Leads') && (
                  <>
                    <tr
                      onClick={() => setActiveCategory(activeCategory === 'Pasted Leads' ? 'ALL' : 'Pasted Leads')}
                      className="bg-gradient-to-r from-[#D97706] to-[#B45309] text-white cursor-pointer hover:opacity-95"
                      title="Click header to toggle Pasted Leads view"
                    >
                      <td colSpan={9} className="px-4 py-2 text-xs font-black tracking-wide">
                        <div className="flex items-center justify-between">
                          <span>🟠 PASTED LEADS &amp; PASTED QUOTES ({categorizedMasterData.pastedLeads.length}) — Click Header to Filter</span>
                          <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-md font-mono">
                            {activeCategory === 'Pasted Leads' ? 'Showing Only Pasted Leads (Click to Show All)' : 'Click to Isolate Pasted Leads'}
                          </span>
                        </div>
                      </td>
                    </tr>
                    {categorizedMasterData.pastedLeads.map((lead) =>
                      renderLeadRow(lead, {
                        rowBg: 'bg-amber-50/60 hover:bg-amber-100/70',
                        badgeClass: 'bg-[#D97706] text-white',
                        iconLabel: '🟠 Pasted Lead',
                      })
                    )}
                  </>
                )}

                {/* 5. JOBBER QUOTES LEDGER SECTION */}
                {(activeCategory === 'ALL' || activeCategory === 'Jobber Quotes') && (
                  <>
                    <tr
                      onClick={() => setActiveCategory(activeCategory === 'Jobber Quotes' ? 'ALL' : 'Jobber Quotes')}
                      className="bg-gradient-to-r from-[#0284C7] to-[#0369A1] text-white cursor-pointer hover:opacity-95"
                      title="Click header to toggle Jobber Quotes view"
                    >
                      <td colSpan={9} className="px-4 py-2 text-xs font-black tracking-wide">
                        <div className="flex items-center justify-between">
                          <span>🩵 SYNCED JOBBER QUOTES LEDGER ({categorizedMasterData.jobberQuotes.length}) — Click Header to Filter</span>
                          <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-md font-mono">
                            {activeCategory === 'Jobber Quotes' ? 'Showing Only Jobber Quotes (Click to Show All)' : 'Click to Isolate Jobber Quotes'}
                          </span>
                        </div>
                      </td>
                    </tr>
                    {categorizedMasterData.jobberQuotes.map((quote) => renderQuoteRow(quote))}
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* SAVED BLOCKED & SCREENED CALL LIST (SONIA AI SCREENER + SPAM SHIELD DATABASE) */}
          <div className="border-t-2 border-slate-200 bg-slate-900 text-slate-100 p-4 sm:p-5 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-lg shrink-0">
                  🛡️
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm sm:text-base font-black text-white">
                      Saved Blocked &amp; Screened Call List (Sonia AI Screener + Database Sync)
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500/25 border border-rose-400/40 text-rose-200 text-[11px] font-mono font-black">
                      {(spamShieldConfig?.blockedNumbers || []).length} Blocked Numbers Saved in DB
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black">
                      ✓ Synced with Cloud Firestore &amp; Local Store
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Every screened call and blocked number from yesterday &amp; today is permanently saved in your database. Soliciting/robocall numbers stay blocked across refreshes, logins, and live call syncs.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    { id: 'ALL', label: `All Screened Calls (${calls.length})` },
                    {
                      id: 'BLOCKED',
                      label: `🚫 Blocked Solicitors & Spam (${
                        calls.filter((c) => isCallerPhoneBlocked(c.callerPhone, c)).length
                      })`,
                    },
                    {
                      id: 'CLEANING',
                      label: `✅ Cleaning Leads (${calls.filter((c) => c.hasCleaningIntent).length})`,
                    },
                  ] as const
                ).map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setScreenedCallFilter(pill.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all ${
                      screenedCallFilter === pill.id
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => onOpenSpamShield()}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-xs font-black cursor-pointer"
                >
                  ⚙️ Manage Full Blocklist ({(spamShieldConfig?.blockedNumbers || []).length})
                </button>

                <button
                  type="button"
                  onClick={() => setShowScreenedCallsList((v) => !v)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer border border-slate-700"
                >
                  {showScreenedCallsList ? 'Hide List ▲' : 'Show List ▼'}
                </button>
              </div>
            </div>

            {showScreenedCallsList && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 max-h-[340px] overflow-y-auto pr-1 pt-1">
                {calls
                  .filter((call) => {
                    const blocked = isCallerPhoneBlocked(call.callerPhone, call);
                    if (screenedCallFilter === 'BLOCKED') return blocked;
                    if (screenedCallFilter === 'CLEANING') return Boolean(call.hasCleaningIntent);
                    return true;
                  })
                  .slice(0, 18)
                  .map((call) => {
                    const blocked = isCallerPhoneBlocked(call.callerPhone, call);
                    const isCleaning = Boolean(call.hasCleaningIntent);
                    const isBusy = togglingCallId === call.id;
                    return (
                      <div
                        key={call.id}
                        className={`p-3 rounded-2xl border text-xs flex flex-col justify-between gap-2 transition-all ${
                          blocked
                            ? 'bg-rose-950/40 border-rose-500/50'
                            : isCleaning
                            ? 'bg-emerald-950/35 border-emerald-500/50'
                            : 'bg-slate-800/80 border-slate-700'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-black text-white text-xs sm:text-sm flex items-center gap-1.5 flex-wrap">
                                <span>{call.callerName || call.callerPhone}</span>
                                {call.answeredByAi && (
                                  <span className="px-1.5 py-0.5 rounded bg-purple-500/30 border border-purple-400/40 text-purple-200 text-[10px] font-bold">
                                    🤖 Sonia AI
                                  </span>
                                )}
                              </div>
                              <div className="font-mono text-emerald-300 text-[11px] font-bold">
                                {call.callerPhone} • {String(call.timestamp || '').slice(0, 16).replace('T', ' ')}
                              </div>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black shrink-0 ${
                                blocked
                                  ? 'bg-rose-600 text-white shadow-2xs'
                                  : isCleaning
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-700 text-slate-300'
                              }`}
                            >
                              {blocked
                                ? '🚫 BLOCKED IN DB'
                                : isCleaning
                                ? '✅ CLEANING LEAD'
                                : '🛡️ SCREENED'}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-200 bg-black/30 p-2 rounded-xl border border-white/10 line-clamp-2">
                            {call.summary || call.blockedReason || 'Screened inbound call'}
                          </p>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
                          <span className="text-[10px] font-mono text-slate-400 truncate">
                            {call.callCategory || (blocked ? 'SOLICITOR_BLOCKED' : 'SCREENED')}
                          </span>
                          {onToggleBlockScreenedCall && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={async () => {
                                setTogglingCallId(call.id);
                                await onToggleBlockScreenedCall({
                                  callId: call.id,
                                  callerPhone: call.callerPhone,
                                  callerName: call.callerName,
                                  reason: call.summary
                                    ? `Screened Call (${call.callerName || call.callerPhone}): ${String(call.summary).slice(0, 80)}`
                                    : undefined,
                                  block: !blocked,
                                });
                                setTogglingCallId(null);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-black cursor-pointer transition-all disabled:opacity-50 ${
                                blocked
                                  ? 'bg-slate-800 hover:bg-emerald-700 text-slate-200 border border-slate-600'
                                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-2xs'
                              }`}
                            >
                              {isBusy
                                ? 'Saving...'
                                : blocked
                                ? '✓ Saved as Blocked (Click to Unblock)'
                                : '🚫 Block & Save to DB'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          BOTTOM SPLIT GRID: BLOCK 3 (SCHEDULE & SEARCH) + BLOCK 4 (QUICK MAPS)
      ─────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* BLOCK 3: THE SCHEDULE AND SEARCH */}
        {(focusBlock === 'ALL' || focusBlock === 'SCHEDULE_SEARCH') && (
          <section
            ref={scheduleSearchBlockRef}
            id="block-schedule-search"
            className={`${
              focusBlock === 'SCHEDULE_SEARCH' ? 'xl:col-span-12' : 'xl:col-span-6'
            } rounded-3xl bg-white border-2 border-purple-300 shadow-md overflow-hidden flex flex-col`}
          >
            <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 px-4 sm:px-5 py-3.5 text-white flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg">
                  📅
                </div>
                <div>
                  <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                    <span>BLOCK 3: SCHEDULE &amp; SEARCH</span>
                    <span className="px-2 py-0.5 rounded-full bg-white text-purple-900 text-xs font-mono font-black">
                      {scheduledJobs.length} Visits
                    </span>
                  </h2>
                  <p className="text-[11px] text-purple-100">
                    Search visits, clients &amp; quotes • Check closest cleaner distances • Manage daily schedule
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onNavigateToFullSchedule}
                  className="px-3 py-1.5 rounded-xl bg-white text-purple-900 hover:bg-purple-50 font-black text-xs flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Full Calendar</span>
                </button>
                <button
                  type="button"
                  onClick={onNavigateToAddressRadar}
                  className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Distance Radar</span>
                </button>
              </div>
            </div>

            <div className="p-4 space-y-3 flex-1 flex flex-col">
              {/* Search & Cleaner Filter Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-6 relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={scheduleSearchQuery}
                    onChange={(e) => setScheduleSearchQuery(e.target.value)}
                    placeholder="Search client, phone, street, cleaner..."
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 outline-none focus:border-purple-500"
                  />
                </div>
                <div className="sm:col-span-3">
                  <select
                    value={selectedCleanerFilter}
                    onChange={(e) => setSelectedCleanerFilter(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white"
                  >
                    <option value="ALL">All 15 Cleaners</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <input
                    type="date"
                    value={selectedDateFilter}
                    onChange={(e) => setSelectedDateFilter(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Closest Cleaner Distance Finder Box */}
              <div className="rounded-2xl bg-purple-50/80 border border-purple-200 p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-black text-purple-950 uppercase tracking-wider flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-purple-700" />
                    <span>Closest Cleaners to Address:</span>
                  </span>
                  <input
                    type="text"
                    value={pinnedMapItem?.address || radarAddressInput}
                    onChange={(e) => {
                      setPinnedMapItem(null);
                      setRadarAddressInput(e.target.value);
                    }}
                    placeholder="Enter street address or postal code..."
                    className="flex-1 min-w-[200px] px-2.5 py-1 rounded-lg bg-white border border-purple-300 text-xs font-bold text-slate-800"
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {rankedCleanersByDistance.slice(0, 3).map(({ tech, distKm, estMinutes }, idx) => (
                    <div
                      key={tech.id}
                      className="p-2 rounded-xl bg-white border border-purple-200/80 flex items-center justify-between gap-1.5 shadow-2xs"
                    >
                      <div className="min-w-0">
                        <div className="text-[11px] font-black text-slate-900 truncate">
                          #{idx + 1} {tech.name}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {tech.depotLocation?.address || tech.homeAddress || 'Edmonton Hub'}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[10px] font-black block">
                          {distKm} km
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono">~{estMinutes} min</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Filtered Schedule Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 flex-1 max-h-[320px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-900 text-white text-[10px] font-black uppercase sticky top-0 z-10">
                    <tr>
                      <th className="p-2.5">Date &amp; Time</th>
                      <th className="p-2.5">Client &amp; Address</th>
                      <th className="p-2.5">Assigned Cleaner(s)</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Map</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredScheduleJobs.map((job) => (
                      <tr key={job.id} className="hover:bg-purple-50/40 transition-colors">
                        <td className="p-2.5 whitespace-nowrap font-mono">
                          <div className="font-black text-slate-900">{String(job.startAt || '').slice(0, 10)}</div>
                          <div className="text-[10px] text-purple-700 font-bold">
                            {new Date(job.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="p-2.5 max-w-[190px]">
                          <div className="font-black text-slate-900 truncate">{job.clientName}</div>
                          <div className="text-[11px] text-slate-600 truncate">{job.serviceAddress}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{job.clientPhone}</div>
                        </td>
                        <td className="p-2.5">
                          <div className="flex flex-wrap gap-1">
                            {(job.assignedCleaners || ['Unassigned']).map((c, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 font-bold text-[10px]"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() =>
                              onToggleScheduledJobStatus(
                                job.id,
                                job.status === 'COMPLETED' ? 'SCHEDULED' : 'COMPLETED'
                              )
                            }
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black cursor-pointer ${
                              job.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {job.status}
                          </button>
                        </td>
                        <td className="p-2.5 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                handlePinItemOnQuickMap({
                                  title: job.clientName,
                                  subtitle: `${job.serviceType} (${(job.assignedCleaners || []).join(', ')})`,
                                  address: job.serviceAddress,
                                  phone: job.clientPhone,
                                  lat: job.lat,
                                  lng: job.lng,
                                  type: 'VISIT',
                                })
                              }
                              className="px-2 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-black cursor-pointer"
                              title="Pin on Quick Map"
                            >
                              Pin
                            </button>
                            <button
                              type="button"
                              onClick={() => onSelectJobOnMap(job)}
                              className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold cursor-pointer"
                              title="Open on Full Dispatch Map"
                            >
                              Full Map
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* BLOCK 4: THE QUICK MAPS (Interactive Multi-Pin Street-Zoom Address Radar + Cleaner Hubs + Day-of-Week Schedule Map) */}
        {(focusBlock === 'ALL' || focusBlock === 'QUICK_MAPS') && (
          <section
            ref={quickMapsBlockRef}
            id="block-quick-maps"
            className={`${
              focusBlock === 'QUICK_MAPS' ? 'xl:col-span-12' : 'xl:col-span-6'
            } flex flex-col`}
          >
            <QuickMapScheduleRadarView
              mode="EMBEDDED"
              technicians={technicians}
              scheduledJobs={scheduledJobs}
              leads={leads}
              quotes={categorizedMasterData.jobberQuotes}
              selectedDate={selectedDateFilter}
              onSelectedDateChange={setSelectedDateFilter}
              externalPinRequest={pinnedMapItem}
              onOpenDedicatedPage={onNavigateToAddressRadar}
              onNavigateToFullDispatchMap={onNavigateToFullMap}
              onNavigateToSchedule={onNavigateToFullSchedule}
            />
          </section>
        )}
      </div>
    </div>
  );
};
