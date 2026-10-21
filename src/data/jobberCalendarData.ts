import { JobberQuote, JobberInvoice } from '../services/jobberSyncModules';
import baseJobberSeed from './baseJobberStoreSeed.json';

export interface ScheduledJobItem {
  id: string;
  visitNumber: string;
  title: string;
  clientName: string;
  clientPhone: string;
  secondaryPhone?: string;
  clientTags?: string[];
  serviceAddress: string;
  city?: string;
  lat: number;
  lng: number;
  startAt: string;
  endAt: string;
  assignedCleaners: string[];
  serviceType: 'Standard Cleaning' | 'Deep Cleaning' | 'Move-Out Cleaning';
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
  jobStatus?: string;
  jobberWebUri: string;
  notes?: string;
  callTranscripts?: any[];
  quoteNumber?: string;
  quoteTotal?: number;
  quoteStatus?: 'APPROVED' | 'CONVERTED' | 'AWAITING_RESPONSE' | 'DRAFT';
  invoiceNumber?: string;
  invoiceTotal?: number;
  invoiceStatus?: 'PAID' | 'AWAITING_PAYMENT' | 'DRAFT' | 'BAD_DEBT';
  syncedAt?: string;
}

// Cleaner color map matching Jobber staff roster
export const CLEANER_COLOR_MAP: Record<string, string> = {
  'Boss iPad Pro 《iPhone》': '#EC4899',   // Hot pink - Admin
  'Boss iPad Pro': '#EC4899',
  'Boss iPad  Pro': '#EC4899',
  'Richard "Owner Account"': '#7C3AED',  // Royal violet - Owner
  'Richard “Owner Account”': '#7C3AED',
  'Richard': '#7C3AED',
  '1 Joseph Juma': '#0891B2',            // Ocean cyan
  'Joseph Juma': '#0891B2',
  'Adison Haugland': '#D97706',          // Warm amber
  'Cindy Guay': '#10B981',               // Mint emerald
  'Dominic Mancini': '#4F46E5',          // Slate indigo - Dispatcher
  'Jasmin Kunin': '#6366F1',             // Indigo blue
  'Jen & Bryan Cabugon': '#F59E0B',      // Golden amber team
  'Joel MBATCHOU': '#8B5CF6',            // Electric violet
  'Joel Mbatchou': '#8B5CF6',
  'Kilab': '#3B82F6',                    // Electric blue
  'Kilab Facility Services': '#3B82F6',
  'Melissa Clarke': '#2563EB',           // Royal blue
  'Melissa': '#2563EB',
  'N.Dinku': '#06B6D4',                  // Teal cyan
  'N. Dinku': '#06B6D4',
  'Neth & Carmen': '#F43F5E',            // Ruby rose team
  'Robyn Adele': '#059669',              // Forest emerald
  'Sergine Ngongang wetie': '#D946EF',    // Fuchsia magenta
  'Sergine Ngongang': '#D946EF',
  'Unassigned': '#64748B',               // Slate
};

export function getCleanerColor(cleanerName: string): string {
  if (!cleanerName) return '#8B5CF6';
  if (CLEANER_COLOR_MAP[cleanerName]) return CLEANER_COLOR_MAP[cleanerName];
  const lower = cleanerName.toLowerCase();
  if (lower.includes('joel')) return '#8B5CF6';
  if (lower.includes('melissa')) return '#2563EB';
  if (lower.includes('juma') || lower.includes('joseph')) return '#0891B2';
  if (lower.includes('adison')) return '#D97706';
  if (lower.includes('cindy')) return '#10B981';
  if (lower.includes('dominic')) return '#4F46E5';
  if (lower.includes('jasmin')) return '#6366F1';
  if (lower.includes('cabugon') || lower.includes('jen')) return '#F59E0B';
  if (lower.includes('kilab')) return '#3B82F6';
  if (lower.includes('dinku')) return '#06B6D4';
  if (lower.includes('neth') || lower.includes('carmen')) return '#F43F5E';
  if (lower.includes('robyn')) return '#059669';
  if (lower.includes('sergine') || lower.includes('wetie')) return '#D946EF';
  if (lower.includes('richard')) return '#7C3AED';
  if (lower.includes('ipad')) return '#EC4899';
  return '#8B5CF6';
}

/**
 * Returns 2-3 letter uppercase initials badge for a cleaner, matching Jobber
 * e.g. "Cindy Guay" -> "CG", "Joel MBATCHOU" -> "JM", "Joseph Juma" -> "JJ", "Jen & Bryan" -> "JB"
 */
export function getCleanerInitials(cleanerName: string): string {
  if (!cleanerName) return '??';
  const clean = cleanerName.replace(/[《》"']/g, '').trim();
  const lower = clean.toLowerCase();
  if (lower.includes('cindy')) return 'CG';
  if (lower.includes('joel')) return 'JM';
  if (lower.includes('juma') || lower.includes('joseph')) return 'JJ';
  if (lower.includes('melissa')) return 'MC';
  if (lower.includes('adison')) return 'AH';
  if (lower.includes('dominic')) return 'DM';
  if (lower.includes('jasmin')) return 'JK';
  if (lower.includes('cabugon') || lower.includes('jen')) return 'JC';
  if (lower.includes('kilab')) return 'KF';
  if (lower.includes('dinku')) return 'ND';
  if (lower.includes('neth') || lower.includes('carmen')) return 'NC';
  if (lower.includes('robyn')) return 'RA';
  if (lower.includes('sergine') || lower.includes('wetie')) return 'SN';
  if (lower.includes('richard')) return 'RC';
  if (lower.includes('ipad')) return 'HQ';

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Returns the real-time current date in Edmonton (America/Edmonton)
 */
export function getEdmontonToday() {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1;
  let day = now.getDate();

  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Edmonton',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const y = Number(parts.find((p) => p.type === 'year')?.value);
    const m = Number(parts.find((p) => p.type === 'month')?.value);
    const d = Number(parts.find((p) => p.type === 'day')?.value);
    if (y && m && d) {
      year = y;
      month = m;
      day = d;
    }
  } catch {
    // Fallback to local system date if Intl timezone is unavailable
  }

  const monthIndex = month - 1;
  const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const date = new Date(year, monthIndex, day, 12, 0, 0);

  return {
    year,
    month,
    monthIndex,
    day,
    dateString,
    date,
    formattedFull: date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
    formattedShort: date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }),
  };
}

/**
 * Convert any UTC or ISO timestamp to America/Edmonton local ISO string with offset (-06:00 or -07:00)
 */
export function toEdmontonIsoString(isoStr?: string): string {
  if (!isoStr) return new Date().toISOString();
  const raw = String(isoStr).trim();
  if (/[+-]\d{2}:\d{2}$/.test(raw)) return raw;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Edmonton',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZoneName: 'longOffset',
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || '00';
  const hr = get('hour') === '24' ? '00' : get('hour');
  const tzOffset = (parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT-06:00').replace('GMT', '') || '-06:00';
  return `${get('year')}-${get('month')}-${get('day')}T${hr}:${get('minute')}:${get('second')}${tzOffset}`;
}

/**
 * Format ISO datetime string nicely for calendar and map views in America/Edmonton time
 */
export function formatDateTime(iso: string) {
  try {
    const raw = String(iso || '').trim();
    const localIso = raw.endsWith('Z') ? toEdmontonIsoString(raw) : raw;
    const match = localIso.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/);
    if (match) {
      const year = Number(match[1]);
      const monthIndex = Number(match[2]) - 1;
      const day = Number(match[3]);
      const hour = match[4] !== undefined ? Number(match[4]) : 9;
      const minute = match[5] !== undefined ? Number(match[5]) : 0;
      const d = new Date(year, monthIndex, day, hour, minute);
      return {
        dateStr: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        timeStr: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        hour,
        dateString: `${match[1]}-${match[2]}-${match[3]}`,
      };
    }

    const d = new Date(raw);
    return {
      dateStr: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Edmonton' }),
      timeStr: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Edmonton' }),
      hour: d.getHours(),
      dateString: localIso.slice(0, 10),
    };
  } catch {
    return {
      dateStr: iso,
      timeStr: 'Scheduled',
      hour: 9,
      dateString: String(iso || '').slice(0, 10),
    };
  }
}

/**
 * 15 Jobber Team Members
 */
export interface JobberTeamMember {
  id: string;
  name: string;
  jobberLinkedName: string;
  isLinked: boolean;
  role: 'Owner' | 'Dispatcher' | 'Cleaner';
  color: string;
  vanUnit?: string;
  phone: string;
  email: string;
  address?: string;
}

export const JOBBER_TEAM_MEMBERS: JobberTeamMember[] = [
  { id: 'tm-1', name: 'Boss iPad Pro 《iPhone》', jobberLinkedName: 'Boss iPad Pro 《iPhone》', isLinked: true, role: 'Dispatcher', color: '#EC4899', vanUnit: 'Executive HQ', phone: '(780) 718-5092', email: 'booking@tidyupscleaning.com', address: '8306 Chappelle Way Southwest, Edmonton, AB' },
  { id: 'tm-2', name: 'Richard "Owner Account"', jobberLinkedName: 'Richard "Owner Account"', isLinked: true, role: 'Owner', color: '#7C3AED', vanUnit: 'Executive HQ', phone: '(780) 718-5092', email: 'booking@tidyupscleaning.com', address: '8306 Chappelle Way Southwest, Edmonton, AB' },
  { id: 'tm-3', name: '1 Joseph Juma', jobberLinkedName: '1 Joseph Juma', isLinked: true, role: 'Cleaner', color: '#0891B2', vanUnit: 'Unit 5', phone: '(780) 267-3472', email: 'baraka.cleaningservices95@gmail.com', address: '3751 139 Ave NW, Edmonton, AB' },
  { id: 'tm-4', name: 'Adison Haugland', jobberLinkedName: 'Adison Haugland', isLinked: true, role: 'Cleaner', color: '#D97706', vanUnit: 'Unit 4', phone: '(780) 554-2851', email: 'hauglandadison@gmail.com', address: '10231 120 St NW, Edmonton, AB' },
  { id: 'tm-5', name: 'Cindy Guay', jobberLinkedName: 'Cindy Guay', isLinked: true, role: 'Cleaner', color: '#10B981', vanUnit: 'Unit 7', phone: '(780) 863-0896', email: 'cindybg@live.ca', address: '740 Knottwood Rd S NW, Edmonton, AB' },
  { id: 'tm-6', name: 'Dominic Mancini', jobberLinkedName: 'Dominic Mancini', isLinked: true, role: 'Dispatcher', color: '#4F46E5', vanUnit: 'Unit 15 (Lead Mobile)', phone: '(587) 385-8329', email: 'mittens45dm@gmail.com', address: '9722 154 St, Edmonton, AB T5P 2G3' },
  { id: 'tm-7', name: 'Jasmin Kunin', jobberLinkedName: 'Jasmin Kunin', isLinked: true, role: 'Cleaner', color: '#6366F1', vanUnit: 'Unit 8', phone: '(780) 802-3373', email: 'kuninjasmin@gmail.com', address: '10740 109 St NW, Edmonton, AB' },
  { id: 'tm-8', name: 'Jen & Bryan Cabugon', jobberLinkedName: 'Jen & Bryan Cabugon', isLinked: true, role: 'Cleaner', color: '#F59E0B', vanUnit: 'Unit 9 (Team)', phone: '(825) 888-3251', email: 'cedi.cleans@gmail.com', address: '9434 208 St NW, Edmonton, AB' },
  { id: 'tm-9', name: 'Joel MBATCHOU', jobberLinkedName: 'Joel MBATCHOU', isLinked: true, role: 'Cleaner', color: '#8B5CF6', vanUnit: 'Unit 11', phone: '(587) 937-9408', email: 'mbatchoujoakim@yahoo.fr', address: '17908 61 Ave NW, Edmonton, AB' },
  { id: 'tm-10', name: 'Kilab', jobberLinkedName: 'Kilab', isLinked: true, role: 'Cleaner', color: '#3B82F6', vanUnit: 'Unit 12', phone: '(647) 466-4476', email: 'kffsfacilityservice10@gmail.com', address: '12219 103 St NW, Edmonton, AB' },
  { id: 'tm-11', name: 'Melissa Clarke', jobberLinkedName: 'Melissa Clarke', isLinked: true, role: 'Cleaner', color: '#2563EB', vanUnit: 'Unit 1', phone: '(780) 954-2409', email: 'clarkemelissa2025@gmail.com', address: '7221 Chivers Pl SW, Edmonton, AB' },
  { id: 'tm-12', name: 'N.Dinku', jobberLinkedName: 'N.Dinku', isLinked: true, role: 'Cleaner', color: '#06B6D4', vanUnit: 'Unit 13', phone: '(587) 500-7911', email: 'bultoefa@gmail.com', address: '10408 155 Ave NW, Edmonton, AB' },
  { id: 'tm-13', name: 'Neth & Carmen', jobberLinkedName: 'Neth & Carmen', isLinked: true, role: 'Cleaner', color: '#F43F5E', vanUnit: 'Unit 14 (Team)', phone: '(780) 729-2031', email: 'nhettemcarmen@yahoo.com', address: '20123 58 Ave NW, Edmonton, AB' },
  { id: 'tm-14', name: 'Robyn Adele', jobberLinkedName: 'Robyn Adele', isLinked: true, role: 'Cleaner', color: '#059669', vanUnit: 'Unit 3', phone: '(780) 660-0681', email: 'robynkierstead@hotmail.com', address: '574 Saddleback Rd NW, Edmonton, AB' },
  { id: 'tm-15', name: 'Sergine Ngongang wetie', jobberLinkedName: 'Sergine Ngongang wetie', isLinked: true, role: 'Cleaner', color: '#D946EF', vanUnit: 'Unit 10', phone: '(418) 261-4689', email: 'tatiwetie@gmail.com', address: '17115 61 Ave NW, Edmonton, AB' },
];

const BASE_SCHEDULED_VISITS: ScheduledJobItem[] = ((baseJobberSeed as any)?.scheduledVisits || []) as ScheduledJobItem[];
const BASE_JOBBER_QUOTES: JobberQuote[] = ((baseJobberSeed as any)?.quotes || []) as JobberQuote[];
const BASE_JOBBER_INVOICES: JobberInvoice[] = ((baseJobberSeed as any)?.invoices || []) as JobberInvoice[];

/**
 * Canonical 2026 Base Schedule (726 real Jobber visits starting Jan 1, 2026 through Dec 31, 2026).
 * Served up as the immutable base so any new visits add onto this base and never revert to 7 visits.
 */
export function generateHistoricAndFutureVisits(): ScheduledJobItem[] {
  return BASE_SCHEDULED_VISITS.map((v) => ({ ...v }));
}

/**
 * Merges any incoming or existing visits onto the 726 canonical 2026 base visits.
 * - Starts with all 726 base visits.
 * - Applies any status/cleaner/detail updates to matching base visits.
 * - Appends any newly created or newly synced visits on top of the base.
 */
export function mergeWithBaseScheduledVisits(incoming?: any[] | null): ScheduledJobItem[] {
  const map = new Map<string, ScheduledJobItem>();
  for (const baseVisit of BASE_SCHEDULED_VISITS) {
    const key = baseVisit.id || `${baseVisit.visitNumber}_${baseVisit.startAt}`;
    map.set(key, { ...baseVisit });
  }

  if (Array.isArray(incoming) && incoming.length > 0) {
    for (const raw of incoming) {
      if (!raw || typeof raw !== 'object') continue;
      // Skip legacy mock/simulation items
      const nameLower = String(raw.clientName || raw.title || '').toLowerCase();
      if (
        nameLower.includes('vance') ||
        nameLower.includes('lindqvist') ||
        nameLower.includes('heritage pointe') ||
        nameLower.includes('al-mansoor') ||
        nameLower.includes('simulation')
      ) {
        continue;
      }

      const key = raw.id || `${raw.visitNumber || 'VISIT'}_${raw.startAt || ''}`;
      const existing = map.get(key);
      if (existing) {
        map.set(key, {
          ...existing,
          ...raw,
          lat: raw.lat || existing.lat,
          lng: raw.lng || existing.lng,
          assignedCleaners:
            Array.isArray(raw.assignedCleaners) && raw.assignedCleaners.length > 0
              ? raw.assignedCleaners
              : existing.assignedCleaners,
        });
      } else {
        map.set(key, { ...raw } as ScheduledJobItem);
      }
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    String(a.startAt || '').localeCompare(String(b.startAt || ''))
  );
}

export interface UnscheduledJobItem {
  id: string;
  jobNumber: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  serviceAddress: string;
  serviceType: 'Standard Cleaning' | 'Deep Cleaning' | 'Move-Out Cleaning';
  totalAmount: number;
  status: 'UNSCHEDULED' | 'APPROVED' | 'SCHEDULED';
  requestedWindow: string;
  preferredCleaners?: string[];
  assignedCleaners?: string[];
  scheduledDate?: string;
  scheduledTime?: string;
  notes?: string;
  jobberWebUri: string;
  lineItems: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
  createdAt: string;
  approvedAt?: string;
}

export const INITIAL_UNSCHEDULED_JOBS: UnscheduledJobItem[] = [];

export function generateJobberQuotes(): JobberQuote[] {
  return BASE_JOBBER_QUOTES.map((q) => ({ ...q }));
}

export function generateJobberInvoices(): JobberInvoice[] {
  return BASE_JOBBER_INVOICES.map((inv) => ({ ...inv }));
}

export const INITIAL_JOBBER_QUOTES: JobberQuote[] = BASE_JOBBER_QUOTES;
export const INITIAL_JOBBER_INVOICES: JobberInvoice[] = BASE_JOBBER_INVOICES;

