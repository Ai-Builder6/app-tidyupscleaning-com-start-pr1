import type ExcelJS from 'exceljs';
import { CleanSheetTabName, CLEAN_SHEET_TABS, AdLeadItem } from '../types/lead';

export { CLEAN_SHEET_TABS };
export type { CleanSheetTabName };

export const ARCHIVED_OLD_GOOGLE_SHEETS = [
  {
    id: '1TifULi7n2BylQdvla-8DRvYHul_A1wXXzypUdBJwEeA',
    name: 'Archived Old Leads Sheet #1 (Historical Pre-Reset)',
    url: 'https://docs.google.com/spreadsheets/d/1TifULi7n2BylQdvla-8DRvYHul_A1wXXzypUdBJwEeA/edit',
    description: 'Previous Primary Google Sheet (Archived for historical reference only — no old rows pulled into new sheet)',
    notes: 'Previous Primary Google Sheet (Archived for historical reference only — no old rows pulled into new sheet)',
  },
  {
    id: '1-1palHco2hOEKDh8ivnLYX6-PuzeQtHhLQGkaD_Dp4I',
    name: 'Archived Old Leads Sheet #2 (Secondary Historical Sheet)',
    url: 'https://docs.google.com/spreadsheets/d/1-1palHco2hOEKDh8ivnLYX6-PuzeQtHhLQGkaD_Dp4I/edit',
    description: 'Previous Secondary Google Sheet (Archived for historical reference only)',
    notes: 'Previous Secondary Google Sheet (Archived for historical reference only)',
  },
];

export interface TabThemePalette {
  tabName: CleanSheetTabName;
  shortLabel: string;
  subtitle: string;
  icon: string;
  emoji: string;
  tabColorArgb: string;
  bannerBgArgb: string;
  headerBgArgb: string;
  kpiBgArgb: string;
  badgeBgArgb: string;
  badgeFgArgb: string;
  rowEvenBgArgb: string;
  rowOddBgArgb: string;
  accentHex: string;
  tailwindHeaderGradient: string;
  tailwindBadge: string;
  tailwindRowBg: string;
  tailwindDarkRowBg: string;
}

export const TAB_THEME_PALETTES: Record<CleanSheetTabName, TabThemePalette> = {
  'Facebook Leads 1': {
    tabName: 'Facebook Leads 1',
    shortLabel: 'Facebook Leads 1',
    subtitle: 'Primary Facebook Lead Ads & Instant Forms',
    icon: '🔵',
    emoji: '🔵',
    tabColorArgb: 'FF1877F2',
    bannerBgArgb: 'FF0F172A',
    headerBgArgb: 'FF1877F2',
    kpiBgArgb: 'FFDBEAFE',
    badgeBgArgb: 'FF1877F2',
    badgeFgArgb: 'FFFFFFFF',
    rowEvenBgArgb: 'FFEFF6FF',
    rowOddBgArgb: 'FFDBEAFE',
    accentHex: '#1877F2',
    tailwindHeaderGradient: 'from-[#1877F2] to-[#1558B0]',
    tailwindBadge: 'bg-[#1877F2] text-white',
    tailwindRowBg: 'bg-blue-50/70 hover:bg-blue-100/80',
    tailwindDarkRowBg: 'border-l-4 border-l-[#1877F2] bg-blue-950/30 hover:bg-blue-900/40',
  },
  'Facebook Leads 2': {
    tabName: 'Facebook Leads 2',
    shortLabel: 'Facebook Leads 2',
    subtitle: 'Secondary Facebook Ad Campaigns & Retargeting',
    icon: '🔷',
    emoji: '🔷',
    tabColorArgb: 'FF0A66C2',
    bannerBgArgb: 'FF0F172A',
    headerBgArgb: 'FF0A66C2',
    kpiBgArgb: 'FFE0F2FE',
    badgeBgArgb: 'FF0A66C2',
    badgeFgArgb: 'FFFFFFFF',
    rowEvenBgArgb: 'FFF0F9FF',
    rowOddBgArgb: 'FFE0F2FE',
    accentHex: '#0A66C2',
    tailwindHeaderGradient: 'from-[#0A66C2] to-[#034EA2]',
    tailwindBadge: 'bg-[#0A66C2] text-white',
    tailwindRowBg: 'bg-sky-50/70 hover:bg-sky-100/80',
    tailwindDarkRowBg: 'border-l-4 border-l-[#0A66C2] bg-sky-950/30 hover:bg-sky-900/40',
  },
  'Google Leads 1': {
    tabName: 'Google Leads 1',
    shortLabel: 'Google Leads 1',
    subtitle: 'Primary Google Search Ads & Local Services',
    icon: '🟢',
    emoji: '🟢',
    tabColorArgb: 'FF0F9D58',
    bannerBgArgb: 'FF0F172A',
    headerBgArgb: 'FF0F9D58',
    kpiBgArgb: 'FFD1FAE5',
    badgeBgArgb: 'FF0F9D58',
    badgeFgArgb: 'FFFFFFFF',
    rowEvenBgArgb: 'FFECFDF5',
    rowOddBgArgb: 'FFD1FAE5',
    accentHex: '#0F9D58',
    tailwindHeaderGradient: 'from-[#0F9D58] to-[#0B8043]',
    tailwindBadge: 'bg-[#0F9D58] text-white',
    tailwindRowBg: 'bg-emerald-50/70 hover:bg-emerald-100/80',
    tailwindDarkRowBg: 'border-l-4 border-l-[#0F9D58] bg-emerald-950/30 hover:bg-emerald-900/40',
  },
  'Google Leads 2': {
    tabName: 'Google Leads 2',
    shortLabel: 'Google Leads 2',
    subtitle: 'Secondary Google Ads, Maps & Website Forms',
    icon: '🌲',
    emoji: '🌲',
    tabColorArgb: 'FF0D9488',
    bannerBgArgb: 'FF0F172A',
    headerBgArgb: 'FF0D9488',
    kpiBgArgb: 'FFCCFBF1',
    badgeBgArgb: 'FF0D9488',
    badgeFgArgb: 'FFFFFFFF',
    rowEvenBgArgb: 'FFF0FDFA',
    rowOddBgArgb: 'FFCCFBF1',
    accentHex: '#0D9488',
    tailwindHeaderGradient: 'from-[#0D9488] to-[#0F766E]',
    tailwindBadge: 'bg-[#0D9488] text-white',
    tailwindRowBg: 'bg-teal-50/70 hover:bg-teal-100/80',
    tailwindDarkRowBg: 'border-l-4 border-l-[#0D9488] bg-teal-950/30 hover:bg-teal-900/40',
  },
  'Other Ads': {
    tabName: 'Other Ads',
    shortLabel: 'Other Ads',
    subtitle: 'Other Ad Channels, Referrals & Pasted Inquiries',
    icon: '🟠',
    emoji: '🟠',
    tabColorArgb: 'FFD97706',
    bannerBgArgb: 'FF0F172A',
    headerBgArgb: 'FFD97706',
    kpiBgArgb: 'FFFEF3C7',
    badgeBgArgb: 'FFD97706',
    badgeFgArgb: 'FFFFFFFF',
    rowEvenBgArgb: 'FFFFFBEB',
    rowOddBgArgb: 'FFFEF3C7',
    accentHex: '#D97706',
    tailwindHeaderGradient: 'from-[#D97706] to-[#B45309]',
    tailwindBadge: 'bg-[#D97706] text-white',
    tailwindRowBg: 'bg-amber-50/70 hover:bg-amber-100/80',
    tailwindDarkRowBg: 'border-l-4 border-l-[#D97706] bg-amber-950/30 hover:bg-amber-900/40',
  },
  'Facebook AI': {
    tabName: 'Facebook AI',
    shortLabel: 'Facebook AI',
    subtitle: 'Facebook Messenger AI & Automated Chat Leads',
    icon: '💬',
    emoji: '🤖',
    tabColorArgb: 'FF4F46E5',
    bannerBgArgb: 'FF0F172A',
    headerBgArgb: 'FF4F46E5',
    kpiBgArgb: 'FFE0E7FF',
    badgeBgArgb: 'FF4F46E5',
    badgeFgArgb: 'FFFFFFFF',
    rowEvenBgArgb: 'FFEEF2FF',
    rowOddBgArgb: 'FFE0E7FF',
    accentHex: '#4F46E5',
    tailwindHeaderGradient: 'from-[#4F46E5] to-[#3730A3]',
    tailwindBadge: 'bg-[#4F46E5] text-white',
    tailwindRowBg: 'bg-indigo-50/70 hover:bg-indigo-100/80',
    tailwindDarkRowBg: 'border-l-4 border-l-[#4F46E5] bg-indigo-950/30 hover:bg-indigo-900/40',
  },
  Quo: {
    tabName: 'Quo',
    shortLabel: 'Quo',
    subtitle: 'Quo / OpenPhone & Real Voice Call Quotes',
    icon: '🟣',
    emoji: '🟣',
    tabColorArgb: 'FF7C3AED',
    bannerBgArgb: 'FF0F172A',
    headerBgArgb: 'FF7C3AED',
    kpiBgArgb: 'FFEDE9FE',
    badgeBgArgb: 'FF7C3AED',
    badgeFgArgb: 'FFFFFFFF',
    rowEvenBgArgb: 'FFF5F3FF',
    rowOddBgArgb: 'FFEDE9FE',
    accentHex: '#7C3AED',
    tailwindHeaderGradient: 'from-[#7C3AED] to-[#5B21B6]',
    tailwindBadge: 'bg-[#7C3AED] text-white',
    tailwindRowBg: 'bg-purple-50/70 hover:bg-purple-100/80',
    tailwindDarkRowBg: 'border-l-4 border-l-[#7C3AED] bg-purple-950/30 hover:bg-purple-900/40',
  },
};

/**
 * Resolves any raw source string, campaign name, or legacy tab name into one of the 7 canonical tabs:
 * - Facebook Leads 1
 * - Facebook Leads 2
 * - Google Leads 1
 * - Google Leads 2
 * - Other Ads
 * - Facebook AI
 * - Quo
 */
export function resolveCleanSheetTab(rawSourceOrTab?: string, leadObj?: any): CleanSheetTabName {
  const exact = String(rawSourceOrTab || leadObj?.sourceTab || '').trim();
  if ((CLEAN_SHEET_TABS as string[]).includes(exact)) {
    return exact as CleanSheetTabName;
  }

  const combined = `${exact} ${leadObj?.source || ''} ${leadObj?.campaignName || ''}`.toLowerCase();

  if (
    combined.includes('facebook ai') ||
    combined.includes('fb ai') ||
    combined.includes('messenger') ||
    combined.includes('manychat') ||
    combined.includes('dm ai')
  ) {
    return 'Facebook AI';
  }

  if (
    combined.includes('facebook leads 2') ||
    combined.includes('fb leads 2') ||
    combined.includes('fb_leads_2') ||
    combined.includes('fb leads_v2') ||
    combined.includes('facebook 2')
  ) {
    return 'Facebook Leads 2';
  }

  if (
    combined.includes('facebook') ||
    combined.includes('fb ') ||
    combined.startsWith('fb') ||
    combined.includes('meta')
  ) {
    return 'Facebook Leads 1';
  }

  if (
    combined.includes('google leads 2') ||
    combined.includes('google_leads_2') ||
    combined.includes('google leads_v2') ||
    combined.includes('google leads_v3') ||
    combined.includes('google 2') ||
    combined.includes('lsa')
  ) {
    return 'Google Leads 2';
  }

  if (combined.includes('google') || combined.includes('gmb') || combined.includes('adwords')) {
    return 'Google Leads 1';
  }

  if (
    combined.includes('quo') ||
    combined.includes('openphone') ||
    combined.includes('sonia') ||
    combined.includes('sona') ||
    combined.includes('phone') ||
    combined.includes('call') ||
    combined.includes('voice') ||
    Boolean(leadObj?.quoCallId) ||
    Boolean(leadObj?.callTranscript)
  ) {
    return 'Quo';
  }

  return 'Other Ads';
}

/**
 * Checks if the user has communicated with a lead (called/texted, marked communicated, quoted, synced to Jobber, or converted).
 */
export function hasLeadBeenCommunicatedWith(lead: any): boolean {
  if (!lead || typeof lead !== 'object') return false;
  if (lead.communicatedAt || lead.hasCommunicated) return true;
  if (lead.isJobberSynced || lead.quoteId || lead.quoteNumber || lead.convertedJobId) return true;

  const statusLower = String(lead.status || '').trim().toLowerCase();
  if (
    statusLower === 'contacted' ||
    statusLower === 'communicated' ||
    statusLower === 'quoted' ||
    statusLower === 'converted' ||
    statusLower === 'booked' ||
    statusLower === 'client' ||
    statusLower === 'approved' ||
    statusLower === 'scheduled' ||
    statusLower === 'replied'
  ) {
    return true;
  }

  const verdictLower = String(lead.verdict || '').trim().toLowerCase();
  if (verdictLower === 'client') return true;

  return false;
}

/**
 * Strictly detects any fake, simulated, sample, or auto-generated seed lead so it is permanently deleted and never shown.
 */
export function isFakeOrSimulatedLead(lead: any): boolean {
  if (!lead || typeof lead !== 'object') return true;

  const id = String(lead.id || '').trim().toLowerCase();
  const quoteId = String(lead.quoteId || '').trim().toLowerCase();
  const name = String(lead.customerName || lead.clientName || '').trim().toLowerCase();
  const email = String(lead.email || '').trim().toLowerCase();
  const phone = String(lead.phone || lead.clientPhone || '').trim().toLowerCase();
  const notes = String(lead.notes || '').trim().toLowerCase();
  const campaign = String(lead.campaignName || '').trim().toLowerCase();

  // Block all legacy hardcoded/seed IDs, old sheet imports & auto-converted historical quote seeds
  if (
    id === 'lead-clean-rahum-4293' ||
    id.startsWith('lead-sheet-mvmw') ||
    id.startsWith('lead-sheet-mvo') ||
    id.startsWith('lead-quote-qt-2026-') ||
    id.startsWith('qt-2026-') ||
    id.startsWith('lead-quo-2026') ||
    id.startsWith('lead-fb-1') ||
    id.startsWith('lead-fb-2') ||
    id.startsWith('lead-fb-3') ||
    id.startsWith('lead-ig-1') ||
    id.startsWith('lead-g-1') ||
    id.startsWith('lead-g-2') ||
    id.startsWith('lead-web-1') ||
    quoteId.startsWith('qt-2026-') ||
    quoteId === 'qt-devon-clarke-2410'
  ) {
    return true;
  }

  if (isFalseOrCatalogLeadRow(name)) {
    return true;
  }

  // Block known fake/sample names, test webhook rows, and non-cleaning solicitors
  const fakeNames = [
    'rahum',
    'raheem',
    'sarah jenkins',
    'david chen',
    'amanda kowalski',
    'sarah (fb ad test)',
    'david (google ad test)',
    'test customer',
    'test lead',
    'sync verification canary',
    'sample campaign',
    'sample ad',
    'nick wilson',
    'nick (squarespace)',
    'squarespace',
    'north advance',
    'ferro capital',
    'simulation',
    'fake',
    'sample',
    'demo lead',
    'marcus vance',
    'elena rostova',
    'alistair finch',
    'chloe bennett',
    'heritage pointe',
    'lindqvist',
    'kestrel ridge',
    'al-mansoor',
  ];
  if (fakeNames.some((fn) => name.includes(fn))) {
    return true;
  }

  // Block fake sample emails / phones
  if (
    email.includes('@example.com') ||
    email === 'test@meta.com' ||
    email.includes('<test lead') ||
    email === 'leadtest@tidyupscleaning.com' ||
    phone.includes('555-0148') ||
    phone.includes('555-0194') ||
    phone.includes('555-0271') ||
    phone.includes('555-0100') ||
    phone.includes('555-0199')
  ) {
    return true;
  }

  // Block test/simulation notes or campaigns
  if (
    notes.includes('test inbound lead') ||
    notes.includes('simulation') ||
    notes.includes('canary row') ||
    notes.includes('business funding') ||
    notes.includes('north advance') ||
    notes.includes('squarespace advisor') ||
    (campaign.includes('direct webhook') && name.includes('test'))
  ) {
    return true;
  }

  // Block legacy "Voice & Quick Quotes" entries that were auto-created from base seed quotes without user action
  const rawTab = String(lead.sourceTab || '').toLowerCase();
  const rawSource = String(lead.source || '').toLowerCase();
  if (
    (rawTab.includes('voice') || rawSource.includes('voice') || rawSource.includes('quick quote')) &&
    !lead.quoCallId &&
    !lead.callTranscript &&
    !lead.isManualVoiceQuote &&
    (id.startsWith('lead-quote-') || id.startsWith('lead-clean-'))
  ) {
    return true;
  }

  return false;
}

/**
 * Enforces:
 * 1. No fake / simulated / sample leads (especially in Voice & Quick Quotes)
 * 2. Edmonton & Capital Region service area filter
 * 3. Hard 14-Day Cutoff: Nothing older than 14 days (2 weeks ago) is allowed on any Leads table or Google Sheet
 * 4. 7-Day Uncommunicated Cutoff: Any lead > 7 days old without communication is automatically excluded
 */
export function isOutOfEdmontonOrFakeOrOutdatedLead(lead: any): boolean {
  if (!lead || typeof lead !== 'object') return true;

  // 1. Fake / Simulated check
  if (isFakeOrSimulatedLead(lead)) {
    return true;
  }

  // 2. Out-of-Edmonton check
  const combinedLocation = `${lead.address || ''} ${lead.city || ''} ${lead.postalCode || ''}`.toLowerCase();
  const outOfServiceTerms = [
    'wetaskiwin',
    'red deer',
    'calgary',
    'toronto',
    'vancouver',
    'montreal',
    'ottawa',
    'winnipeg',
    't9a',
    't4n',
    't4r',
  ];
  if (outOfServiceTerms.some((term) => combinedLocation.includes(term))) {
    return true;
  }

  // 3. Parse lead creation/received date FIRST (never let dateOfServiceRequested mask an old dateAdded from months ago!)
  const rawDateStr = String(
    lead.dateAdded || lead.dateReceived || lead.createdAt || lead.dateOfServiceRequested || lead.scheduledDate || ''
  ).trim();

  if (!rawDateStr) {
    return true;
  }

  const parsedMs = Date.parse(rawDateStr);
  if (isNaN(parsedMs)) {
    return true;
  }

  const nowMs = Date.now();
  const ageMs = nowMs - parsedMs;
  const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  // Hard 14-Day Cutoff: Anything older than 14 days is excluded everywhere
  if (ageMs > FOURTEEN_DAYS_MS) {
    return true;
  }

  // 7-Day Uncommunicated Cutoff: Anything older than 7 days that hasn't been communicated with is excluded
  if (ageMs > SEVEN_DAYS_MS && !hasLeadBeenCommunicatedWith(lead)) {
    return true;
  }

  return false;
}

/**
 * Detects false/header/catalog rows in spreadsheet imports so they are never imported as customer leads.
 */
export function isFalseOrCatalogLeadRow(rawName?: string): boolean {
  const n = String(rawName || '').trim().toLowerCase();
  if (!n || n.length < 2) return true;
  if (
    n.startsWith('✨') ||
    n.startsWith('📊') ||
    n.startsWith('[') ||
    n.startsWith('http://') ||
    n.startsWith('https://') ||
    /^\d+\s*lead\(s\)/i.test(n) ||
    /^\d+bed\s+\d+(\.\d+)?bath/i.test(n) ||
    n.includes('discount $') ||
    n.includes('fuel surcharge') ||
    n.includes('online booking') ||
    n.includes('pro cleaner') ||
    n.includes('lead row')
  ) {
    return true;
  }
  const banned = [
    'client name',
    'customer name',
    'full_name',
    'full name',
    'first_name',
    'service package',
    'move-out cleaning',
    'deep cleaning',
    'standard cleaning',
    'basic cleaning',
    'carpet cleaning',
    'window cleaning',
    'appliance cleaning',
    'inside fridge',
    'inside oven',
    'hourly rate',
    'totals',
    'summary',
    'channel color key',
    'test lead',
    'dummy',
    'simulation',
    'sample',
    'sample campaign name',
    'sample ad name',
    'sync verification canary',
  ];
  return banned.some((b) => n === b);
}

/**
 * Checks if an address/city/postal code is within Greater Edmonton & Capital Region.
 */
export function isAddressInGreaterEdmonton(
  address?: string,
  city?: string,
  postalCode?: string
): boolean {
  const combined = `${address || ''} ${city || ''} ${postalCode || ''}`.toLowerCase();
  const outOfServiceTerms = [
    'wetaskiwin',
    'red deer',
    'calgary',
    'toronto',
    'vancouver',
    'montreal',
    'ottawa',
    'winnipeg',
    't9a',
    't4n',
    't4r',
  ];
  if (outOfServiceTerms.some((term) => combined.includes(term))) {
    return false;
  }
  return true;
}

/**
 * Filters a list of leads to only valid, non-fake Edmonton leads from the last 14 days
 * (and < 7 days if uncommunicated), normalizing each lead's `sourceTab` to one of the 7 new tabs.
 */
export function filterValidRecentLeads(rawLeads: any[]): AdLeadItem[] {
  if (!Array.isArray(rawLeads)) return [];
  const seenIds = new Set<string>();
  const result: AdLeadItem[] = [];

  for (const item of rawLeads) {
    if (!item || isOutOfEdmontonOrFakeOrOutdatedLead(item)) continue;
    const id = String(item.id || '').trim();
    if (!id || seenIds.has(id)) continue;
    seenIds.add(id);

    const normalizedTab = resolveCleanSheetTab(item.sourceTab, item);
    result.push({
      ...item,
      sourceTab: normalizedTab,
    });
  }

  return result;
}

function extractNumericJobberId(rawId?: string): string | null {
  if (!rawId) return null;
  const trimmed = String(rawId).trim();
  if (/^\d+$/.test(trimmed)) return trimmed;
  try {
    const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
    const m = decoded.match(/\/(\d+)$/);
    if (m) return m[1];
  } catch {
    // ignore
  }
  const tailMatch = trimmed.match(/(\d{6,})$/);
  return tailMatch ? tailMatch[1] : null;
}

const SHEET_COLUMNS = [
  { header: 'Date Received', key: 'date', width: 14 },
  { header: 'Sheet Tab', key: 'sheetTab', width: 20 },
  { header: 'Source / Campaign', key: 'source', width: 24 },
  { header: 'Client Name', key: 'customerName', width: 24 },
  { header: 'Phone Number', key: 'phone', width: 18 },
  { header: 'Email Address', key: 'email', width: 25 },
  { header: 'Street Address', key: 'address', width: 28 },
  { header: 'City', key: 'city', width: 14 },
  { header: 'Postal Code', key: 'postalCode', width: 13 },
  { header: 'Bedrooms', key: 'bedrooms', width: 14 },
  { header: 'Bathrooms', key: 'bathrooms', width: 14 },
  { header: 'Service Requested', key: 'serviceRequested', width: 28 },
  { header: 'Quoted Total ($)', key: 'quotedAmount', width: 16 },
  { header: 'Communicated?', key: 'communicated', width: 16 },
  { header: 'Jobber Quote #', key: 'quoteNumber', width: 16 },
  { header: 'Jobber Quote Link', key: 'quoteLink', width: 24 },
  { header: 'Verdict', key: 'verdict', width: 15 },
  { header: 'Lead Status', key: 'status', width: 15 },
  { header: 'Notes & AI Call Summary', key: 'notes', width: 46 },
];

function styleWorksheetWithTheme(
  ws: ExcelJS.Worksheet,
  title: string,
  subtitle: string,
  headerBgArgb: string,
  kpiBgArgb: string,
  rows: any[],
  quotes: any[]
) {
  ws.columns = SHEET_COLUMNS.map((c) => ({ key: c.key, width: c.width }));

  // Freeze top 3 rows (Row 1: Title Banner, Row 2: KPI & Archive Links Bar, Row 3: Column Headers) and first 4 columns
  ws.views = [
    {
      state: 'frozen',
      xSplit: 4,
      ySplit: 3,
      topLeftCell: 'E4',
      activeCell: 'A4',
    },
  ];

  // Row 1: Executive Title Banner
  ws.mergeCells('A1:S1');
  const titleCell = ws.getCell('A1');
  titleCell.value = `✨ ${title} — TIDYUPS CLEANING (14-DAY FRESH WINDOW • 7-DAY UNCOMMUNICATED CUTOFF)`;
  titleCell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' },
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(1).height = 30;

  // Row 2: KPI Summary + Quick Reference note
  ws.mergeCells('A2:S2');
  const kpiCell = ws.getCell('A2');
  const totalQuoted = rows.reduce((sum, l) => sum + (Number(l.quotedAmount ?? 0) || 0), 0);
  kpiCell.value = `📊 Active Leads in Tab: ${rows.length}   |   💰 Total Quoted Value: $${totalQuoted.toFixed(
    2
  )} CAD   |   🕒 Rules: Max 14 Days Old (7 Days if Uncommunicated)   |   🔗 See "Archived Old Sheets" Tab for Historical Sheets   |   ${subtitle}`;
  kpiCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
  kpiCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: kpiBgArgb },
  };
  kpiCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(2).height = 24;

  // Row 3: AutoFilter Column Headers
  const headerRow = ws.getRow(3);
  headerRow.values = SHEET_COLUMNS.map((c) => c.header);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: headerBgArgb },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });

  ws.autoFilter = {
    from: { row: 3, column: 1 },
    to: { row: Math.max(4, rows.length + 3), column: SHEET_COLUMNS.length },
  };

  // Populate Data Rows starting at Row 4
  rows.forEach((lead, idx) => {
    const rowNumber = idx + 4;
    const tabName = resolveCleanSheetTab(lead.sourceTab, lead);
    const palette = TAB_THEME_PALETTES[tabName] || TAB_THEME_PALETTES['Other Ads'];
    const isEven = idx % 2 === 0;
    const rowBgArgb = isEven ? palette.rowEvenBgArgb : palette.rowOddBgArgb;

    const matchedQuote = Array.isArray(quotes)
      ? quotes.find((q) => q && (q.id === lead.quoteId || (lead.quoteNumber && q.quoteNumber === lead.quoteNumber)))
      : null;
    const numericQuoteId = extractNumericJobberId(matchedQuote?.id) || extractNumericJobberId(lead.quoteId);
    const quoteUrl = numericQuoteId ? `https://secure.getjobber.com/quotes/${numericQuoteId}` : '';

    const communicated = hasLeadBeenCommunicatedWith(lead);
    const dateStr = String(lead.dateReceived || lead.createdAt || new Date().toISOString()).slice(0, 10);

    const row = ws.getRow(rowNumber);
    row.values = [
      dateStr,
      `${palette.icon} ${tabName}`,
      lead.source || lead.campaignName || tabName,
      lead.customerName || '',
      lead.phone || '',
      lead.email || '',
      lead.address || 'Edmonton, AB',
      lead.city || 'Edmonton',
      lead.postalCode || '',
      lead.bedrooms || '3 Bedrooms',
      lead.bathrooms || '2 Bathrooms',
      lead.serviceRequested || 'Residential Cleaning',
      lead.quotedAmount !== undefined && lead.quotedAmount !== null ? Number(lead.quotedAmount) : 0,
      communicated ? '✅ Yes (Communicated)' : '⏳ Needs Follow-Up (<7d)',
      lead.quoteNumber || '',
      quoteUrl ? { text: `Open Quote ${lead.quoteNumber || `#${numericQuoteId}`}`, hyperlink: quoteUrl } : '',
      lead.verdict || 'Good lead',
      lead.status || (communicated ? 'Contacted' : 'New'),
      lead.notes || lead.callSummary || '',
    ];
    row.height = 22;

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF0F172A' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: rowBgArgb },
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: colNumber === 13 ? 'right' : colNumber === 1 || colNumber === 14 || colNumber === 17 || colNumber === 18 ? 'center' : 'left',
        wrapText: colNumber === 19,
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };

      // Highlight Sheet Tab badge column (Column 2)
      if (colNumber === 2) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: palette.badgeBgArgb },
        };
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: palette.badgeFgArgb } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }

      // Bold Client Name (Column 4)
      if (colNumber === 4) {
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      }

      // Currency format on Quoted Total (Column 13)
      if (colNumber === 13) {
        cell.numFmt = '$#,##0.00';
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF065F46' } };
      }

      // Hyperlink styling on Jobber Quote Link (Column 16)
      if (colNumber === 16 && quoteUrl) {
        cell.font = { name: 'Calibri', size: 10, bold: true, underline: true, color: { argb: 'FF1D4ED8' } };
      }
    });
  });

  // Summary Footer Row
  const footerRowNum = Math.max(4, rows.length + 4);
  const footerRow = ws.getRow(footerRowNum);
  footerRow.values = [
    'TOTALS',
    `${rows.length} Lead(s)`,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'Total Quoted Pipeline:',
    rows.length > 0 ? { formula: `SUM(M4:M${rows.length + 3})`, result: totalQuoted } : 0,
    '',
    '',
    '',
    '',
    '',
    'Only leads within the last 14 days (and <7 days if uncommunicated) are kept.',
  ];
  footerRow.height = 25;
  footerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F172A' },
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: colNumber === 13 ? 'right' : 'left',
    };
    if (colNumber === 13) {
      cell.numFmt = '$#,##0.00';
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF34D399' } };
    }
  });
}

/**
 * Generates the brand-new, visually appealing multi-tab Google Sheets (.xlsx) workbook with:
 * - All New Leads (14-Day)
 * - Facebook Leads 1
 * - Facebook Leads 2
 * - Google Leads 1
 * - Google Leads 2
 * - Other Ads
 * - Facebook AI
 * - Quo
 * - Archived Old Sheets (Direct clickable links to the 2 historical Google Sheets)
 */
export async function generateStyledLeadsWorkbookBuffer(
  rawLeadsOrOptions:
    | any[]
    | {
        leads?: any[];
        quotes?: any[];
        appLeadHeaders?: string[];
        resolveJobberWebUri?: (type: string, id?: string) => string;
      },
  maybeQuotes: any[] = []
): Promise<Buffer> {
  const rawLeads = Array.isArray(rawLeadsOrOptions)
    ? rawLeadsOrOptions
    : Array.isArray(rawLeadsOrOptions?.leads)
    ? rawLeadsOrOptions.leads
    : [];
  const quotes = Array.isArray(rawLeadsOrOptions)
    ? maybeQuotes
    : Array.isArray(rawLeadsOrOptions?.quotes)
    ? rawLeadsOrOptions.quotes
    : maybeQuotes;

  const excelPkg = 'exceljs';
  const ExcelJSMod: any = await import(/* @vite-ignore */ excelPkg);
  const ExcelJSRuntime = ExcelJSMod.default || ExcelJSMod;
  const workbook = new ExcelJSRuntime.Workbook();
  workbook.creator = 'TidyUps Cleaning Edmonton';
  workbook.created = new Date();
  workbook.modified = new Date();

  const cleanLeads = filterValidRecentLeads(rawLeads);

  // 1. Master Overview Tab: All New Leads (14-Day)
  const masterWs = workbook.addWorksheet('All New Leads (14-Day)', {
    properties: { tabColor: { argb: 'FF10B981' } },
  });
  styleWorksheetWithTheme(
    masterWs,
    'ALL NEW LEADS OVERVIEW (LAST 14 DAYS)',
    'Combined view of Facebook Leads 1 & 2, Google Leads 1 & 2, Other Ads, Facebook AI, and Quo',
    'FF0F766E',
    'FFD1FAE5',
    cleanLeads,
    quotes
  );

  // 2. Create each of the 7 requested tabs in exact order
  for (const tabName of CLEAN_SHEET_TABS) {
    const palette = TAB_THEME_PALETTES[tabName];
    const tabRows = cleanLeads.filter((l) => resolveCleanSheetTab(l.sourceTab, l) === tabName);
    const ws = workbook.addWorksheet(tabName, {
      properties: { tabColor: { argb: palette.tabColorArgb } },
    });
    styleWorksheetWithTheme(
      ws,
      `${palette.icon} ${tabName.toUpperCase()}`,
      `Dedicated ${tabName} Tab — Starting Fresh (14-Day Window)`,
      palette.headerBgArgb,
      palette.kpiBgArgb,
      tabRows,
      quotes
    );
  }

  // 3. Dedicated "Archived Old Sheets" Reference Tab with clickable links to the old Google Sheets
  const archiveWs = workbook.addWorksheet('Archived Old Sheets', {
    properties: { tabColor: { argb: 'FF64748B' } },
  });
  archiveWs.columns = [
    { header: 'Archive Name', key: 'name', width: 42 },
    { header: 'Direct Google Sheet Link (Click to Open)', key: 'link', width: 62 },
    { header: 'Spreadsheet ID', key: 'id', width: 48 },
    { header: 'Notes', key: 'notes', width: 65 },
  ];

  archiveWs.mergeCells('A1:D1');
  const archTitle = archiveWs.getCell('A1');
  archTitle.value = '🗄️ ARCHIVED / PREVIOUS GOOGLE SHEETS (LINKED FOR HISTORICAL REFERENCE ONLY)';
  archTitle.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  archTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  archTitle.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  archiveWs.getRow(1).height = 30;

  archiveWs.mergeCells('A2:D2');
  const archSub = archiveWs.getCell('A2');
  archSub.value =
    'Your brand-new Google Sheet starts fresh with only new leads (max 14 days old, or 7 days if uncommunicated). Click any link below to log into your old sheets if you ever need historical data:';
  archSub.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
  archSub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  archSub.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  archiveWs.getRow(2).height = 24;

  const archHeader = archiveWs.getRow(3);
  archHeader.values = [
    'Archived Google Sheet Name',
    'Clickable Link to Open Old Google Sheet',
    'Google Spreadsheet ID',
    'Status & Policy',
  ];
  archHeader.height = 25;
  archHeader.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  });

  ARCHIVED_OLD_GOOGLE_SHEETS.forEach((sheet, idx) => {
    const r = archiveWs.getRow(idx + 4);
    r.values = [
      sheet.name,
      { text: `🔗 Open ${sheet.name} (${sheet.url})`, hyperlink: sheet.url },
      sheet.id,
      sheet.description,
    ];
    r.height = 26;
    r.eachCell((cell, colNumber) => {
      cell.font = {
        name: 'Calibri',
        size: 10,
        bold: colNumber === 1 || colNumber === 2,
        underline: colNumber === 2,
        color: { argb: colNumber === 2 ? 'FF1D4ED8' : 'FF0F172A' },
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: idx % 2 === 0 ? 'FFF8FAFC' : 'FFF1F5F9' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    });
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
