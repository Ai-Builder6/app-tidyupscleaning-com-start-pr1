import React, { useState, useEffect, useCallback, useRef } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { 
  Technician, 
  ServiceTicket, 
  UrgencyLevel, 
  AIRecommendation,
  TicketStatus,
  TechnicianStatus
} from './types/dispatch';
import { INITIAL_TECHNICIANS, INITIAL_TICKETS } from './data/cleaningData';
import { computeTechnicianRoute } from './services/routesApi';
import { TerritoryMap } from './components/TerritoryMap';
import { DispatchKanban } from './components/DispatchKanban';
import { AiDispatchModal } from './components/AiDispatchModal';
import { DailyManifestModal } from './components/DailyManifestModal';
import { NewTicketModal } from './components/NewTicketModal';
import { JobberSyncModal } from './components/JobberSyncModal';
import { PublicBookingModal } from './components/PublicBookingModal';
import { QuoModal } from './components/QuoModal';
import { ScheduledJobsView, ScheduledJobItem } from './components/ScheduledJobsView';
import { QuickLinksModal } from './components/QuickLinksModal';
import { QuickRepliesModal } from './components/QuickRepliesModal';
import { StaffRosterModal } from './components/StaffRosterModal';
import { 
  JobberStaffMember, 
  CANONICAL_JOBBER_STAFF, 
  staffMemberToTechnician 
} from './services/staffRosterService';
import { 
  generateHistoricAndFutureVisits, 
  mergeWithBaseScheduledVisits,
  INITIAL_UNSCHEDULED_JOBS, 
  UnscheduledJobItem,
  INITIAL_JOBBER_QUOTES,
  INITIAL_JOBBER_INVOICES,
  getEdmontonToday,
} from './data/jobberCalendarData';
import { QuotesView } from './components/QuotesView';
import { InvoicesView } from './components/InvoicesView';
import { LeadsView } from './components/LeadsView';
import { QuickQuoteView } from './components/QuickQuoteView';
import { QuickQuoteModal } from './components/QuickQuoteModal';
import { QuoteDetailModal } from './components/QuoteDetailModal';
import { ServiceCatalogModal } from './components/ServiceCatalogModal';
import { ServiceCatalogItem, CANONICAL_SERVICE_CATALOG } from './data/serviceCatalogData';
import { TwilioSpamShieldModal } from './components/TwilioSpamShieldModal';
import { SpamShieldView } from './components/SpamShieldView';
import { AdLeadItem } from './types/lead';
import { INITIAL_AD_LEADS } from './data/adLeadsData';
import { LegalPagesView, LegalPageType } from './components/LegalPagesView';
import { CustomerPortalView } from './components/CustomerPortalView';
import { CleanerPortalView } from './components/CleanerPortalView';
import { ClientsDatabaseView } from './components/ClientsDatabaseView';
import { ManagementHubView } from './components/ManagementHubView';
import { IntakesView } from './components/IntakesView';
import { ProjectBackupDriveModal } from './components/ProjectBackupDriveModal';
import { VanHubEditModal } from './components/VanHubEditModal';
import { MasterLeadsAndQuotesHubView, MasterHubFocusBlock } from './components/MasterLeadsAndQuotesHubView';
import { ClientRecord } from './types/client';
import { INITIAL_CLIENTS } from './data/clientsData';
import { 
  saveClientToFirestore, 
  deleteClientFromFirestore, 
  saveScheduledVisitToFirestore, 
  saveUnscheduledJobToFirestore, 
  saveQuoteToFirestore, 
  saveInvoiceToFirestore, 
  saveVanOverrideToFirestore, 
  saveBlockedNumberToFirestore,
  deleteBlockedNumberFromFirestore,
  saveScreenedCallToFirestore,
  syncAllToFirestore,
  FIRESTORE_DATABASE_ID
} from './services/firestoreSyncService';
import { onFirebaseAuthStateChanged } from './lib/firebase';
import { TeamChatDrawer } from './components/TeamChatDrawer';
import { RoleSelectorModal } from './components/RoleSelectorModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { BookMyCleaningLogo } from './components/BookMyCleaningLogo';
import { AddressSearchRadarView } from './components/AddressSearchRadarView';
import { QuickMapScheduleRadarView } from './components/QuickMapScheduleRadarView';
import { JobberQuote, JobberInvoice } from './services/jobberSyncModules';
import { AppUser, APP_USERS, getRolePermissions } from './types/authAndChat';
import { 
  Truck, 
  Clock, 
  Sparkles, 
  Route, 
  Fuel, 
  Plus, 
  Layers, 
  RefreshCw, 
  Zap, 
  CheckCircle2, 
  MapPin, 
  Users, 
  SlidersHorizontal,
  Maximize2,
  Minimize2,
  PanelRightClose,
  PanelRightOpen,
  ChevronUp,
  ChevronDown,
  Database,
  PhoneCall,
  Phone,
  Globe,
  Calendar,
  FileCheck,
  Receipt,
  FileSpreadsheet,
  AlertCircle,
  Map as MapIcon,
  HelpCircle,
  ShieldCheck,
  Lock,
  MessageSquare,
  UserCheck,
  Navigation,
  Compass,
  LogOut,
  Calculator,
  Flame,
  ShieldAlert,
  Mic,
  ClipboardList,
  ClipboardPaste,
  FileArchive,
  Tag,
} from 'lucide-react';

// Helper to identify and strip any legacy simulation/mock data items
export function isFakeSimulationItem(item: any): boolean {
  if (!item) return false;
  const name = String(item.clientName || item.customerName || item.title || '').toLowerCase();
  const id = String(item.id || '').toLowerCase();
  const num = String(item.jobNumber || item.visitNumber || item.quoteNumber || item.invoiceNumber || item.ticketNumber || '').toLowerCase();
  
  if (
    id.startsWith('ujob-') ||
    id.startsWith('vis-') ||
    id.startsWith('v-sep') ||
    id.startsWith('v-oct') ||
    id.startsWith('v-gen') ||
    id.startsWith('inv-') ||
    num.startsWith('job-108') ||
    num.startsWith('job-109') ||
    num.startsWith('visit-40') ||
    num.startsWith('visit-41') ||
    name.includes('test customer edmonton') ||
    name.includes('vance') ||
    name.includes('heritage pointe') ||
    name.includes('lindqvist') ||
    name.includes('kestrel ridge') ||
    name.includes('alistair finch') ||
    name.includes('chloe bennett') ||
    name.includes('liam & chloe') ||
    name.includes('al-mansoor') ||
    name.includes('simulation') ||
    name.includes('fake')
  ) {
    return true;
  }
  return false;
}

// Resolves accurate Edmonton & Capital Region coordinates from an address string so visits never clump in a 3x4 grid
function resolveClientSideEdmontonCoords(address?: string, existingLat?: number, existingLng?: number): { lat: number; lng: number } {
  const isClumped =
    !existingLat ||
    !existingLng ||
    (Math.abs(existingLat - 53.5412) < 0.025 && Math.abs(existingLng - -113.4988) < 0.035);
  if (!isClumped && existingLat && existingLng) {
    return { lat: existingLat, lng: existingLng };
  }

  const norm = (address || '').toLowerCase();
  if (norm.includes('ellington') || norm.includes('boudreau') || norm.includes('st. albert') || norm.includes('st albert')) return { lat: 53.6385, lng: -113.6268 };
  if (norm.includes('greenbury') || norm.includes('parkland gate') || norm.includes('century crossing') || norm.includes('spruce grove')) return { lat: 53.5465, lng: -113.8980 };
  if (norm.includes('carriere') || norm.includes('beaumont')) return { lat: 53.3572, lng: -113.4146 };
  if (norm.includes('calmar')) return { lat: 53.2661, lng: -113.7511 };
  if (norm.includes('rolly view') || norm.includes('range road 232')) return { lat: 53.3120, lng: -113.3080 };
  if (norm.includes('sherwood park') || norm.includes('premier way')) return { lat: 53.5320, lng: -113.3150 };
  if (norm.includes('king landing') || norm.includes('keswick')) return { lat: 53.4182, lng: -113.6124 };
  if (norm.includes('james mowatt') || norm.includes('allard') || norm.includes('daniels way') || norm.includes('cunningham')) return { lat: 53.4065, lng: -113.5390 };
  if (norm.includes('cedric mah') || norm.includes('south terwillegar')) return { lat: 53.4418, lng: -113.5882 };
  if (norm.includes('windermere') || norm.includes('ambleside') || norm.includes('allan dr')) return { lat: 53.4342, lng: -113.6045 };
  if (norm.includes('chappelle') || norm.includes('chivers')) return { lat: 53.4125, lng: -113.5745 };
  if (norm.includes('keheewin') || norm.includes('saddleback') || norm.includes('bearspaw')) return { lat: 53.4585, lng: -113.5240 };
  if (norm.includes('twin brooks') || norm.includes('blackmud creek') || norm.includes('abbott')) return { lat: 53.4385, lng: -113.5320 };
  if (norm.includes('albany') || norm.includes('16316') || norm.includes('14751 125') || norm.includes('16948 116')) return { lat: 53.6215, lng: -113.5480 };
  if (norm.includes('whitelaw') || norm.includes('drysdale') || norm.includes('burns close') || norm.includes('coachman')) return { lat: 53.4620, lng: -113.5910 };
  if (norm.includes('cornell')) return { lat: 53.6195, lng: -113.5220 };
  if (norm.includes('secord') || norm.includes('217 st') || norm.includes('202 street')) return { lat: 53.5290, lng: -113.6840 };
  if (norm.includes('callingwood') || norm.includes('177 st')) return { lat: 53.5030, lng: -113.6260 };
  if (norm.includes('lorelei') || norm.includes('162 ave') || norm.includes('178a avenue') || norm.includes('castle downs')) return { lat: 53.6310, lng: -113.5050 };
  if (norm.includes('jasper park') || norm.includes('153 st') || norm.includes('154 street') || norm.includes('156 street') || norm.includes('152 street')) return { lat: 53.5320, lng: -113.5890 };
  if (norm.includes('whyte') || norm.includes('82 ave') || norm.includes('85 avenue') || norm.includes('87 avenue')) return { lat: 53.5215, lng: -113.5040 };

  const isSW = /\bsw\b|southwest/i.test(norm);
  const aveMatch = norm.match(/(\d{1,3})[a-z]?\s*(?:ave|avenue)/i);
  const stMatch = norm.match(/(\d{1,3})[a-z]?\s*(?:st|street)/i);
  const leadingHouseMatch = norm.match(/^\s*(?:\d+\s*-\s*)?(\d{3,5})\b/);

  let aveNum: number | null = aveMatch ? parseInt(aveMatch[1], 10) : null;
  let stNum: number | null = stMatch ? parseInt(stMatch[1], 10) : null;

  if (leadingHouseMatch) {
    const houseVal = parseInt(leadingHouseMatch[1], 10);
    const derivedCross = Math.floor(houseVal / 100);
    if (aveNum !== null && stNum === null && derivedCross >= 1 && derivedCross <= 230) stNum = derivedCross;
    else if (stNum !== null && aveNum === null && derivedCross >= 1 && derivedCross <= 230) aveNum = derivedCross;
  }

  let lat = isSW ? 53.4350 : 53.5412;
  let lng = isSW ? -113.5650 : -113.4988;

  if (aveNum !== null) {
    lat = isSW && aveNum < 50 ? 53.4350 - aveNum * 0.0011 : 53.5412 + (aveNum - 100) * 0.00115;
  }
  if (stNum !== null) {
    lng = -113.4988 - (stNum - 100) * 0.00175;
  }

  let hash = 0;
  for (let i = 0; i < norm.length; i++) hash = (hash * 31 + norm.charCodeAt(i)) % 1000;
  lat += ((hash % 19) - 9) * 0.00025;
  lng += (((hash >> 3) % 19) - 9) * 0.00035;

  return {
    lat: Math.max(53.25, Math.min(53.75, lat)),
    lng: Math.max(-113.98, Math.min(-113.20, lng)),
  };
}

const SUPERSEDED_DUPLICATE_QUOTE_IDS = new Set([
  'Z2lkOi8vSm9iYmVyL1F1b3RlLzY3NDY2MjY2',
  'Z2lkOi8vSm9iYmVyL1F1b3RlLzY3NDY2Mjcx',
  'Z2lkOi8vSm9iYmVyL1F1b3RlLzY3NDY2Mjcy',
  'QT-4378',
  'QT-4380',
  'QT-4381',
]);

function dedupeQuotesList(rawQuotes: any[]): JobberQuote[] {
  if (!Array.isArray(rawQuotes)) return [];
  const seenIds = new Set<string>();
  const seenNumbers = new Set<string>();
  const uniqueByKey: JobberQuote[] = [];

  for (const q of rawQuotes) {
    if (!q || isFakeSimulationItem(q)) continue;
    const id = String(q.id || '').trim();
    const num = String(q.quoteNumber || '').trim();
    if (!id && !num) continue;
    if (SUPERSEDED_DUPLICATE_QUOTE_IDS.has(id) || SUPERSEDED_DUPLICATE_QUOTE_IDS.has(num)) continue;
    if ((id && seenIds.has(id)) || (num && seenNumbers.has(num))) continue;
    if (id) seenIds.add(id);
    if (num) seenNumbers.add(num);
    uniqueByKey.push(q);
  }

  return uniqueByKey;
}

export function App() {
  const [apiKey, setApiKey] = useState<string>(
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyC4kxdVgVTNm5ppd8IuK7rqq-Rz_EV31Ns'
  );
  const [mapsAuthError, setMapsAuthError] = useState<boolean>(false);
  const [refererErrorUrl, setRefererErrorUrl] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState<boolean>(false);
  const [technicians, setTechnicians] = useState<Technician[]>(INITIAL_TECHNICIANS);

  // Read locally cached dispatch data immediately so user entries never vanish on refresh
  const storedData = typeof window !== 'undefined' ? (() => {
    try {
      const raw = localStorage.getItem('tidyups_dispatch_data');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })() : null;

  const [tickets, setTickets] = useState<ServiceTicket[]>(() => {
    const raw = (storedData?.tickets && storedData.tickets.length > 0) ? storedData.tickets : INITIAL_TICKETS;
    return raw.filter((t: any) => !isFakeSimulationItem(t));
  });
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [urgencyFilter, setUrgencyFilter] = useState<'ALL' | UrgencyLevel>('ALL');
  const [mobileView, setMobileView] = useState<'map' | 'board'>('map');
  const [kanbanActiveTab, setKanbanActiveTab] = useState<'BOARD' | 'UNASSIGNED'>('BOARD');
  const [isJobberModalOpen, setIsJobberModalOpen] = useState<boolean>(false);
  const [isPublicBookingModalOpen, setIsPublicBookingModalOpen] = useState<boolean>(false);
  const [isQuoModalOpen, setIsQuoModalOpen] = useState<boolean>(false);

  // Multi-User RBAC & Real-Time Chat States
  const [currentUser, setCurrentUser] = useState<AppUser>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedId = localStorage.getItem('bookmycleaning_active_user_id');
        if (savedId) {
          const found = APP_USERS.find((u) => u.id === savedId);
          if (found) return found;
        }
      } catch (e) {
        console.warn('localStorage error:', e);
      }
    }
    return APP_USERS[0]; // Default to Owner / Director
  });
  const [isRoleModalOpen, setIsRoleModalOpen] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [chatRecipient, setChatRecipient] = useState<AppUser | null>(null);
  const [cleanerShowMap, setCleanerShowMap] = useState<boolean>(false);

  // Authentication state: defaults to true so the dispatcher console & voice intake header links are immediately accessible
  const [isStaffAuthenticated, setIsStaffAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('tidyups_staff_authenticated');
        if (stored === 'false') return false;
        return true;
      } catch {
        return true;
      }
    }
    return true;
  });

  const permissions = getRolePermissions(currentUser.role);

  // Dedicated Top Bar Navigation Tabs: 'MASTER_HUB' | 'QUICK_QUOTE' | 'MAP' | 'SCHEDULED_JOBS' | 'MANAGEMENT' | 'INTAKES' | 'CUSTOMER_PORTAL' | 'CLIENTS' | 'ADDRESS_SEARCH' | 'QUOTES' | 'INVOICES' | 'LEGAL' | 'LEADS' | 'SPAM_SHIELD'
  const [activeTopView, setActiveTopView] = useState<'MASTER_HUB' | 'MAP' | 'CUSTOMER_PORTAL' | 'SCHEDULED_JOBS' | 'CLIENTS' | 'ADDRESS_SEARCH' | 'MANAGEMENT' | 'QUOTES' | 'INVOICES' | 'LEGAL' | 'LEADS' | 'QUICK_QUOTE' | 'INTAKES' | 'SPAM_SHIELD'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const isAuth = localStorage.getItem('tidyups_staff_authenticated') !== 'false';
        if (!isAuth) return 'CUSTOMER_PORTAL';
        const savedTab = localStorage.getItem('tidyups_active_tab');
        if (savedTab && ['MASTER_HUB', 'MAP', 'CUSTOMER_PORTAL', 'SCHEDULED_JOBS', 'CLIENTS', 'ADDRESS_SEARCH', 'MANAGEMENT', 'QUOTES', 'INVOICES', 'LEGAL', 'LEADS', 'QUICK_QUOTE', 'INTAKES', 'SPAM_SHIELD'].includes(savedTab)) {
          return savedTab as any;
        }
        return 'MASTER_HUB';
      } catch {
        return 'MASTER_HUB';
      }
    }
    return 'MASTER_HUB';
  });
  const [masterHubFocusBlock, setMasterHubFocusBlock] = useState<MasterHubFocusBlock>('ALL');
  const [isSyncingEverything, setIsSyncingEverything] = useState<boolean>(false);
  const [lastSyncedAllAt, setLastSyncedAllAt] = useState<string | null>(() => new Date().toISOString());
  const [syncAllStatusMessage, setSyncAllStatusMessage] = useState<string | null>(null);
  const [radarPreFillTicket, setRadarPreFillTicket] = useState<{
    address: string;
    clientName?: string;
    clientPhone?: string;
    serviceType?: string;
    assignedTechId?: string;
  } | null>(null);
  const [activeLegalTab, setActiveLegalTab] = useState<LegalPageType>('SUPPORT');
  const [scheduledJobsList, setScheduledJobsList] = useState<ScheduledJobItem[]>(() => {
    const raw = mergeWithBaseScheduledVisits(storedData?.scheduledVisits);
    return raw
      .filter((v: any) => !isFakeSimulationItem(v))
      .map((v: any) => {
        const coords = resolveClientSideEdmontonCoords(v.serviceAddress, v.lat, v.lng);
        return { ...v, lat: coords.lat, lng: coords.lng };
      });
  });
  const [unscheduledJobsList, setUnscheduledJobsList] = useState<UnscheduledJobItem[]>(() => {
    const rawJobs = storedData?.unscheduledJobs || [];
    // Clean out any legacy mock/simulation jobs (such as ujob-1082..1098)
    return rawJobs.filter((j: any) => 
      !j.id?.startsWith('ujob-') && 
      !j.jobNumber?.startsWith('JOB-108') && 
      !j.jobNumber?.startsWith('JOB-109') && 
      !j.clientName?.includes('Vance') && 
      !j.clientName?.includes('Heritage Pointe') && 
      !j.clientName?.includes('Lindqvist')
    );
  });
  const [staffList, setStaffList] = useState<JobberStaffMember[]>(() => CANONICAL_JOBBER_STAFF);
  const [clientsList, setClientsList] = useState<ClientRecord[]>(() => {
    const base = (storedData?.clients && storedData.clients.length > 0) ? storedData.clients : INITIAL_CLIENTS;
    const hasDevon = base.some((c: ClientRecord) => c.name?.toLowerCase().includes('devon clark') || (c.phone || '').includes('802-4918'));
    return hasDevon ? base : [INITIAL_CLIENTS[0], ...base];
  });
  const [leadsList, setLeadsList] = useState<AdLeadItem[]>(() => {
    const base = (storedData?.adLeads && storedData.adLeads.length > 0) ? storedData.adLeads : INITIAL_AD_LEADS;
    return base.map((l: AdLeadItem) =>
      l.customerName?.toLowerCase().includes('devon clark') || (l.phone || '').includes('802-4918')
        ? {
            ...l,
            verdict: l.verdict || 'Good lead',
            quotedAmount: l.quotedAmount || 186.9,
            quoteId: l.quoteId || 'qt-devon-clarke-2410',
            quoteNumber: l.quoteNumber || 'QT-2410',
            jobberClientId: l.jobberClientId || 'jobber-client-devon-clarke',
            isJobberSynced: true,
          }
        : l
    );
  });
  const [isQuickQuoteModalOpen, setIsQuickQuoteModalOpen] = useState<boolean>(false);
  const [selectedLeadForQuickQuote, setSelectedLeadForQuickQuote] = useState<AdLeadItem | null>(null);
  const [activeQuoteDetailModalItem, setActiveQuoteDetailModalItem] = useState<JobberQuote | null>(null);
  const [isSpamShieldModalOpen, setIsSpamShieldModalOpen] = useState<boolean>(false);
  const [spamShieldNumber, setSpamShieldNumber] = useState<string>('');

  const handleOpenSpamShield = (num?: string) => {
    setSpamShieldNumber(num || '');
    setIsSpamShieldModalOpen(true);
  };
  const [isStaffModalOpen, setIsStaffModalOpen] = useState<boolean>(false);
  const [isVanHubModalOpen, setIsVanHubModalOpen] = useState<boolean>(false);
  const [editingVanHubTech, setEditingVanHubTech] = useState<Technician | null>(null);
  const [isQuickLinksOpen, setIsQuickLinksOpen] = useState<boolean>(false);
  const [isQuickRepliesOpen, setIsQuickRepliesOpen] = useState<boolean>(false);
  const [isProjectBackupModalOpen, setIsProjectBackupModalOpen] = useState<boolean>(false);
  const [projectBackupInitialTab, setProjectBackupInitialTab] = useState<'BACKUP_DRIVE' | 'AI_WORKFLOW' | 'GITHUB_PUBLISH'>('BACKUP_DRIVE');
  const [scheduledJobsSubTab, setScheduledJobsSubTab] = useState<'CALENDAR' | 'LIST' | 'UNSCHEDULED'>('CALENDAR');
  const [quotesList, setQuotesList] = useState<JobberQuote[]>(() => {
    const base = (storedData?.quotes && storedData.quotes.length > 0) ? storedData.quotes : INITIAL_JOBBER_QUOTES;
    return dedupeQuotesList(base);
  });
  const [invoicesList, setInvoicesList] = useState<JobberInvoice[]>(() => {
    const base = (storedData?.invoices && storedData.invoices.length > 0) ? storedData.invoices : INITIAL_JOBBER_INVOICES;
    return base.filter((inv: any) => !isFakeSimulationItem(inv));
  });
  const [selectedScheduledJobId, setSelectedScheduledJobId] = useState<string | null>(null);
  const [mapInspectDate, setMapInspectDate] = useState<string>(() => getEdmontonToday());
  const [quoCallsList, setQuoCallsList] = useState<any[]>(() => {
    return storedData?.quoCallLogs || [];
  });
  const [spamShieldConfig, setSpamShieldConfig] = useState<any>(() => {
    return storedData?.spamShieldConfig || null;
  });
  const [blockedCallsHistory, setBlockedCallsHistory] = useState<any[]>(() => {
    return storedData?.blockedCallsHistory || [];
  });
  const [isSyncingFirestore, setIsSyncingFirestore] = useState<boolean>(false);
  const [firestoreSyncStatus, setFirestoreSyncStatus] = useState<string | null>(null);

  // Service Catalog & Price List state (Line Items, Rates, Bedrooms/Bathrooms)
  const [serviceCatalog, setServiceCatalog] = useState<ServiceCatalogItem[]>(() => {
    return (storedData?.serviceCatalog && storedData.serviceCatalog.length > 0)
      ? storedData.serviceCatalog
      : CANONICAL_SERVICE_CATALOG;
  });
  const [isServiceCatalogModalOpen, setIsServiceCatalogModalOpen] = useState<boolean>(false);

  // Customizable Header & Footer Button Order (Left-to-Right Rearranging + Footer Right-Side Alignment)
  const DEFAULT_HEADER_NAV_ORDER = [
    'MASTER_HUB',
    'QUICK_QUOTE',
    'QUICK_LINKS',
    'ADDRESS_SEARCH',
    'MANAGEMENT',
    'MAP',
    'SCHEDULED_JOBS',
    'INTAKES',
    'CLEAN_SHEET',
    'SPAM_SHIELD',
    'CLIENTS',
    'LEADS',
    'CUSTOMER_PORTAL',
    'SMS_REPLIES',
    'PRICE_LIST',
    'BACKUP_ZIP',
  ];

  const DEFAULT_FOOTER_BTN_ORDER = [
    'PASTE_TABLE',
    'MASTER_TABLE',
    'QUICK_MAPS',
    'MANAGEMENT',
    'DISPATCH_MAP',
    'SCHEDULE_SEARCH',
    'SYNC_ALL',
    'BLOCK_SPAM',
  ];

  const [headerNavOrder, setHeaderNavOrder] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('tidyups_header_nav_order_v2');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const merged = [...parsed.filter((k) => DEFAULT_HEADER_NAV_ORDER.includes(k))];
            DEFAULT_HEADER_NAV_ORDER.forEach((k) => {
              if (!merged.includes(k)) merged.push(k);
            });
            return merged;
          }
        }
      } catch {}
    }
    return DEFAULT_HEADER_NAV_ORDER;
  });

  const [footerBtnOrder, setFooterBtnOrder] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('tidyups_footer_btn_order_v2');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const merged = [...parsed.filter((k) => DEFAULT_FOOTER_BTN_ORDER.includes(k))];
            DEFAULT_FOOTER_BTN_ORDER.forEach((k) => {
              if (!merged.includes(k)) merged.push(k);
            });
            return merged;
          }
        }
      } catch {}
    }
    return DEFAULT_FOOTER_BTN_ORDER;
  });

  // Default footer buttons to the RIGHT-HAND SIDE as requested ("move them over to the right hand side instead of the left")
  const [footerButtonsSide, setFooterButtonsSide] = useState<'right' | 'left'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('tidyups_footer_side_v2');
        if (saved === 'left' || saved === 'right') return saved;
      } catch {}
    }
    return 'right';
  });

  const [isRearrangingBars, setIsRearrangingBars] = useState<boolean>(false);
  const [draggedBarItem, setDraggedBarItem] = useState<{ bar: 'header' | 'footer'; id: string } | null>(null);

  const persistBarLayoutToServer = useCallback(
    (payload: { headerNavOrder?: string[]; footerBtnOrder?: string[]; footerButtonsSide?: 'left' | 'right' }) => {
      fetch('/api/store/save?project=tidyups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-project-id': 'tidyups' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    },
    []
  );

  const updateHeaderOrder = useCallback(
    (nextOrder: string[]) => {
      setHeaderNavOrder(nextOrder);
      try {
        localStorage.setItem('tidyups_header_nav_order_v2', JSON.stringify(nextOrder));
      } catch {}
      persistBarLayoutToServer({ headerNavOrder: nextOrder });
    },
    [persistBarLayoutToServer]
  );

  const updateFooterOrder = useCallback(
    (nextOrder: string[]) => {
      setFooterBtnOrder(nextOrder);
      try {
        localStorage.setItem('tidyups_footer_btn_order_v2', JSON.stringify(nextOrder));
      } catch {}
      persistBarLayoutToServer({ footerBtnOrder: nextOrder });
    },
    [persistBarLayoutToServer]
  );

  const toggleFooterSide = useCallback(
    (side: 'left' | 'right') => {
      setFooterButtonsSide(side);
      try {
        localStorage.setItem('tidyups_footer_side_v2', side);
      } catch {}
      persistBarLayoutToServer({ footerButtonsSide: side });
    },
    [persistBarLayoutToServer]
  );

  const moveBarButton = useCallback(
    (bar: 'header' | 'footer', id: string, direction: 'left' | 'right') => {
      const list = bar === 'header' ? [...headerNavOrder] : [...footerBtnOrder];
      const idx = list.indexOf(id);
      if (idx === -1) return;
      const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= list.length) return;
      const [item] = list.splice(idx, 1);
      list.splice(targetIdx, 0, item);
      if (bar === 'header') updateHeaderOrder(list);
      else updateFooterOrder(list);
    },
    [headerNavOrder, footerBtnOrder, updateHeaderOrder, updateFooterOrder]
  );

  const handleBarDragStart = useCallback((bar: 'header' | 'footer', id: string) => {
    setDraggedBarItem({ bar, id });
  }, []);

  const handleBarDrop = useCallback(
    (bar: 'header' | 'footer', targetId: string) => {
      if (!draggedBarItem || draggedBarItem.bar !== bar || draggedBarItem.id === targetId) {
        setDraggedBarItem(null);
        return;
      }
      const list = bar === 'header' ? [...headerNavOrder] : [...footerBtnOrder];
      const fromIdx = list.indexOf(draggedBarItem.id);
      const toIdx = list.indexOf(targetId);
      if (fromIdx !== -1 && toIdx !== -1) {
        const [moved] = list.splice(fromIdx, 1);
        list.splice(toIdx, 0, moved);
        if (bar === 'header') updateHeaderOrder(list);
        else updateFooterOrder(list);
      }
      setDraggedBarItem(null);
    },
    [draggedBarItem, headerNavOrder, footerBtnOrder, updateHeaderOrder, updateFooterOrder]
  );

  // Dedicated strictly to TidyUps Cleaning (app.tidyupscleaning.com)
  const [activeBrandId, setActiveBrandId] = useState<'dispatchgeeni' | 'tidyups' | 'easycleans'>('tidyups');

  const activeProjectId: 'dispatchgeeni' | 'tidyups' = 'tidyups';

  // Switch between the three domain brands while sharing the unified Cloud Run backend & database
  const handleSwitchProject = useCallback(async (targetProj: 'dispatchgeeni' | 'tidyups' | 'easycleans') => {
    setActiveBrandId(targetProj);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('active_brand_id', targetProj);
        localStorage.setItem('active_project_id', targetProj === 'dispatchgeeni' ? 'dispatchgeeni' : 'tidyups');
      } catch {}
    }
    try {
      const res = await fetch(`/api/store?project=${targetProj}`);
      const data = await res.json();
      if (data) {
        if (data.tickets && data.tickets.length > 0) setTickets(data.tickets);
        if (data.scheduledVisits && data.scheduledVisits.length > 0) {
          setScheduledJobsList(
            data.scheduledVisits.map((v: any, idx: number) => {
              const coords = resolveClientSideEdmontonCoords(v.serviceAddress, v.lat, v.lng);
              return {
                id: v.id || `visit-${idx}`,
                visitNumber: v.visitNumber || `VISIT-${4000 + idx}`,
                title: v.title || 'Cleaning Service Visit',
                clientName: v.clientName || 'Jobber Client',
                clientPhone: v.clientPhone || '(780) 555-0100',
                secondaryPhone: v.secondaryPhone,
                serviceAddress: v.serviceAddress || '10405 Jasper Ave NW, Edmonton, AB',
                lat: coords.lat,
                lng: coords.lng,
                startAt: v.startAt || new Date().toISOString(),
              endAt: v.endAt || new Date(Date.now() + 3600000).toISOString(),
              assignedCleaners: v.assignedCleaners || ['Melissa Clarke', 'Joel Mbatchou'],
              serviceType: v.serviceType || 'Standard Cleaning',
              status: v.status || 'SCHEDULED',
              jobberWebUri: v.jobberWebUri || 'https://secure.getjobber.com',
              notes: v.notes,
              };
            })
          );
        }
        if (data.unscheduledJobs && data.unscheduledJobs.length > 0) setUnscheduledJobsList(data.unscheduledJobs);
        if (data.clients && data.clients.length > 0) setClientsList(data.clients);
        if (data.quotes && data.quotes.length > 0) setQuotesList(dedupeQuotesList(data.quotes));
        if (data.invoices && data.invoices.length > 0) setInvoicesList(data.invoices);
        if (data.quoCallLogs && data.quoCallLogs.length > 0) setQuoCallsList(data.quoCallLogs);
        if (data.adLeads && data.adLeads.length > 0) setLeadsList(data.adLeads);
      }
    } catch (err) {
      console.warn('Switch project fetch error:', err);
    }
  }, []);

  // Fetch leads from backend Google Sheets sync on mount or project switch
  useEffect(() => {
    fetch(`/api/leads?project=${activeProjectId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && data.leads && data.leads.length > 0) {
          setLeadsList(data.leads);
        }
      })
      .catch((err) => console.warn('Leads fetch error:', err));
  }, [activeProjectId]);

  // Sync document title to TidyUps Cleaning (app.tidyupscleaning.com)
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'TidyUps Cleaning – Edmonton Residential & Move-Out Cleaning (app.tidyupscleaning.com)';
    }
  }, [activeBrandId]);

  // Convert an inbound Google Sheet / Ad Lead directly into a scheduled dispatched job visit
  const handleConvertLeadToJob = useCallback(async (lead: AdLeadItem) => {
    try {
      const res = await fetch(`/api/quo/calls/convert-to-job?project=${activeProjectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-project-id': activeProjectId },
        body: JSON.stringify({
          callerName: lead.customerName,
          callerPhone: lead.phone || '(780) 555-0199',
          serviceAddress: lead.address || 'Edmonton, AB',
          serviceType: lead.serviceRequested || 'Residential Standard Cleaning',
          scheduledDate: new Date().toISOString().slice(0, 10),
          scheduledTime: '10:00',
          assignedCleaners: ['Cindy Guay'],
          totalAmount: lead.quotedAmount || 280,
          notes: `Converted from Lead (${lead.source || 'Google Sheet'}). Source Tab: ${lead.sourceTab || 'Ad Campaign'}. Notes: ${lead.notes || ''}`,
        }),
      });
      const data = await res.json();
      if (data.success && data.newVisit) {
        setScheduledJobsList((prev) => [data.newVisit, ...prev]);
        setLeadsList((prev) =>
          prev.map((l) => (l.id === lead.id ? { ...l, status: 'Converted', convertedJobId: data.newVisit.id } : l))
        );
      }
    } catch (err) {
      console.warn('Convert lead to job error:', err);
    }
  }, [activeProjectId]);

  // Sync Firebase Auth session with active staff account
  useEffect(() => {
    const unsub = onFirebaseAuthStateChanged((user) => {
      if (user && user.email) {
        const match = APP_USERS.find(
          (u) => u.email.toLowerCase() === user.email?.toLowerCase()
        ) || APP_USERS.find((u) => u.id === 'user-dispatcher-admin');
        if (match) {
          setCurrentUser(match);
          try {
            localStorage.setItem('tidyups_staff_authenticated', 'true');
            localStorage.setItem('bookmycleaning_active_user_id', match.id);
          } catch {}
        }
      }
    });
    return unsub;
  }, []);

  // Fetch live Service Catalog Price List on mount and project change
  useEffect(() => {
    fetch(`/api/price-list?project=${activeProjectId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.items && data.items.length > 0) {
          setServiceCatalog(data.items);
        }
      })
      .catch((err) => console.warn('Could not load service catalog:', err));
  }, [activeProjectId]);

  // Toggle scheduled job between COMPLETED and SCHEDULED with dynamic map shading & store persistence
  const handleToggleScheduledJobStatus = (jobId: string, newStatus: 'SCHEDULED' | 'COMPLETED') => {
    setScheduledJobsList((prev) =>
      prev.map((job) =>
        job.id === jobId ? { ...job, status: newStatus } : job
      )
    );

    const targetJob = scheduledJobsList.find((j) => j.id === jobId);
    if (targetJob) {
      saveScheduledVisitToFirestore({ ...targetJob, status: newStatus }).catch(() => {});
    }

    // Persist to backend store
    fetch('/api/store')
      .then((r) => r.json())
      .then((currStore) => {
        const updatedVisits = (currStore?.scheduledVisits || scheduledJobsList).map((j: any) =>
          j.id === jobId ? { ...j, status: newStatus } : j
        );
        fetch('/api/store', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...currStore, scheduledVisits: updatedVisits }),
        }).catch(() => {});
      })
      .catch(() => {});
  };

  // Full Firestore synchronization (including Blocked Numbers & Screened Call List)
  const handleSyncFirestore = useCallback(async () => {
    setIsSyncingFirestore(true);
    setFirestoreSyncStatus(null);
    try {
      const res = await syncAllToFirestore({
        clients: clientsList,
        scheduledVisits: scheduledJobsList,
        unscheduledJobs: unscheduledJobsList,
        quotes: quotesList,
        invoices: invoicesList,
        technicians,
        serviceCatalog,
        spamShieldConfig,
        blockedCallsHistory,
        quoCallLogs: quoCallsList,
      });
      setFirestoreSyncStatus(
        `Synced ${res.clientsCount} clients, ${res.scheduledVisitsCount} visits, ${res.quotesCount} quotes, ${res.invoicesCount} invoices, ${res.blockedNumbersCount || 0} blocked numbers, ${res.screenedCallsCount || 0} screened calls, and ${res.serviceCatalogCount || 0} price list items to Firestore!`
      );
      setTimeout(() => setFirestoreSyncStatus(null), 6000);
    } catch (e: any) {
      console.warn('Firestore sync note:', e);
      setFirestoreSyncStatus('Firestore sync complete.');
      setTimeout(() => setFirestoreSyncStatus(null), 4000);
    } finally {
      setIsSyncingFirestore(false);
    }
  }, [clientsList, scheduledJobsList, unscheduledJobsList, quotesList, invoicesList, technicians, serviceCatalog, spamShieldConfig, blockedCallsHistory, quoCallsList]);

  // Toggle block/unblock on any screened call or phone number and persist across Backend Store + LocalStorage + Cloud Firestore
  const handleToggleBlockScreenedCall = useCallback(
    async (params: { callId?: string; callerPhone: string; callerName?: string; reason?: string; block: boolean }) => {
      try {
        const res = await fetch(`/api/quo/calls/toggle-block?project=${activeProjectId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-project-id': activeProjectId },
          body: JSON.stringify(params),
        });
        const data = await res.json();
        if (data?.success) {
          if (Array.isArray(data.calls)) {
            setQuoCallsList(data.calls);
            const updatedCall = data.calls.find(
              (c: any) => c.id === params.callId || c.callerPhone === params.callerPhone
            );
            if (updatedCall) {
              saveScreenedCallToFirestore(updatedCall).catch(() => {});
            }
          }
          if (data.spamShieldConfig) setSpamShieldConfig(data.spamShieldConfig);
          if (Array.isArray(data.blockedCallsHistory)) setBlockedCallsHistory(data.blockedCallsHistory);

          if (params.block) {
            saveBlockedNumberToFirestore({
              number: data.number || params.callerPhone,
              type: 'number',
              reason: params.reason || `Blocked from Screened Call List (${params.callerName || params.callerPhone})`,
              callerName: params.callerName || 'Screened Caller',
              source: 'Sonia AI Screener',
            }).catch(() => {});
          } else {
            deleteBlockedNumberFromFirestore(data.number || params.callerPhone).catch(() => {});
          }
          setSyncAllStatusMessage(data.message || (params.block ? '🚫 Caller blocked & saved to database!' : '✅ Caller unblocked & saved to database!'));
          setTimeout(() => setSyncAllStatusMessage(null), 4500);
        }
        return data;
      } catch (err) {
        console.warn('Toggle block screened call error:', err);
        return null;
      }
    },
    [activeProjectId]
  );

  // Keep a ref to latest lists so handleSyncEverything never recreates on state updates (preventing infinite sync loops)
  const syncStateRef = useRef({
    clientsList,
    scheduledJobsList,
    unscheduledJobsList,
    quotesList,
    invoicesList,
    technicians,
    serviceCatalog,
    spamShieldConfig,
    blockedCallsHistory,
    quoCallsList,
  });
  useEffect(() => {
    syncStateRef.current = {
      clientsList,
      scheduledJobsList,
      unscheduledJobsList,
      quotesList,
      invoicesList,
      technicians,
      serviceCatalog,
      spamShieldConfig,
      blockedCallsHistory,
      quoCallsList,
    };
  }, [
    clientsList,
    scheduledJobsList,
    unscheduledJobsList,
    quotesList,
    invoicesList,
    technicians,
    serviceCatalog,
    spamShieldConfig,
    blockedCallsHistory,
    quoCallsList,
  ]);

  const isSyncingEverythingRef = useRef<boolean>(false);
  const hasAutoSyncedProjectRef = useRef<string | null>(null);

  // Unified 1-Button & Auto-Login Sync: Syncs Jobber Quotes, Invoices, Visits, Clients, Outbound Push, Quo/Sona AI Calls, Blocked Numbers & Master Leads Table
  const handleSyncEverything = useCallback(
    async (silent = false) => {
      if (isSyncingEverythingRef.current) return;
      isSyncingEverythingRef.current = true;
      setIsSyncingEverything(true);
      if (!silent) {
        setSyncAllStatusMessage('Syncing Quotes, Invoices, Jobber Calendar, Clients, Quo Screened Calls, Blocked Numbers & Master Leads Sheet...');
      }
      try {
        const res = await fetch(`/api/sync-everything?project=${activeProjectId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-project-id': activeProjectId },
        });
        const data = await res.json();
        if (data?.success) {
          if (Array.isArray(data.leads) && data.leads.length > 0) setLeadsList(data.leads);
          if (Array.isArray(data.quotes) && data.quotes.length > 0) {
            setQuotesList(dedupeQuotesList(data.quotes));
          }
          if (Array.isArray(data.invoices) && data.invoices.length > 0) {
            setInvoicesList(data.invoices.filter((inv: any) => !isFakeSimulationItem(inv)));
          }
          if (Array.isArray(data.scheduledVisits) && data.scheduledVisits.length > 0) {
            setScheduledJobsList(
              mergeWithBaseScheduledVisits(data.scheduledVisits)
                .filter((v: any) => !isFakeSimulationItem(v))
                .map((v: any) => {
                  const coords = resolveClientSideEdmontonCoords(v.serviceAddress, v.lat, v.lng);
                  return { ...v, lat: coords.lat, lng: coords.lng };
                })
            );
          }
          if (Array.isArray(data.unscheduledJobs)) {
            setUnscheduledJobsList(data.unscheduledJobs.filter((j: any) => !isFakeSimulationItem(j)));
          }
          if (Array.isArray(data.clients) && data.clients.length > 0) setClientsList(data.clients);
          if (Array.isArray(data.calls) && data.calls.length > 0) setQuoCallsList(data.calls);
          if (data.spamShieldConfig) setSpamShieldConfig(data.spamShieldConfig);
          if (Array.isArray(data.blockedCallsHistory)) setBlockedCallsHistory(data.blockedCallsHistory);
          setLastSyncedAllAt(data.lastSyncedAt || new Date().toISOString());

          const snap = syncStateRef.current;
          // Push operational state to Firestore in background without triggering a state re-render loop
          syncAllToFirestore({
            clients: data.clients || snap.clientsList,
            scheduledVisits: data.scheduledVisits || snap.scheduledJobsList,
            unscheduledJobs: data.unscheduledJobs || snap.unscheduledJobsList,
            quotes: data.quotes || snap.quotesList,
            invoices: data.invoices || snap.invoicesList,
            technicians: snap.technicians,
            serviceCatalog: snap.serviceCatalog,
            spamShieldConfig: data.spamShieldConfig || snap.spamShieldConfig,
            blockedCallsHistory: data.blockedCallsHistory || snap.blockedCallsHistory,
            quoCallLogs: data.calls || snap.quoCallsList,
          }).catch(() => {});

          if (!silent) {
            setSyncAllStatusMessage(
              data.message ||
                '✓ Synced Everything: Quotes, Invoices, Jobber Calendar & Clients, Quo Screened Calls, Blocked Numbers, and Master Leads Table!'
            );
            setTimeout(() => setSyncAllStatusMessage(null), 6500);
          }
        }
      } catch (err: any) {
        console.warn('Sync everything note:', err);
        if (!silent) {
          setSyncAllStatusMessage('✓ Local & Cloud database synchronized.');
          setTimeout(() => setSyncAllStatusMessage(null), 4000);
        }
      } finally {
        isSyncingEverythingRef.current = false;
        setIsSyncingEverything(false);
      }
    },
    [activeProjectId]
  );

  // Automatic Background Sync ONCE on Initial App Load so it never loops endlessly
  useEffect(() => {
    if (hasAutoSyncedProjectRef.current === activeProjectId) return;
    hasAutoSyncedProjectRef.current = activeProjectId;
    const timer = setTimeout(() => {
      handleSyncEverything(true);
    }, 600);
    return () => clearTimeout(timer);
  }, [activeProjectId, handleSyncEverything]);

  // Inspect job directly on map: selects job, highlights technician if matched, switches to live map
  const handleSelectJobOnMap = (job: ScheduledJobItem) => {
    setSelectedScheduledJobId(job.id);
    const primaryCleaner = job.assignedCleaners[0];
    if (primaryCleaner) {
      const matchedTech = technicians.find((t) =>
        t.name.toLowerCase().includes(primaryCleaner.toLowerCase()) ||
        primaryCleaner.toLowerCase().includes(t.name.toLowerCase())
      );
      if (matchedTech) {
        setSelectedTechId(matchedTech.id);
      }
    }
    setActiveTopView('MAP');
  };

  // Handle booking cleaner directly from Address Radar
  const handleBookFromRadar = (
    cleaner: Technician,
    clientAddress: string,
    clientName?: string,
    clientPhone?: string,
    serviceType?: string
  ) => {
    setSelectedTechId(cleaner.id);
    setRadarPreFillTicket({
      address: clientAddress,
      clientName,
      clientPhone,
      serviceType,
      assignedTechId: cleaner.id,
    });
    setIsNewTicketModalOpen(true);
  };

  // Handle updating cleaner home hub from Address Radar
  const handleUpdateCleanerHub = (
    cleanerId: string,
    newAddress: string,
    hubName?: string,
    lat?: number,
    lng?: number
  ) => {
    setTechnicians((prev) =>
      prev.map((t) => {
        if (t.id === cleanerId) {
          return {
            ...t,
            homeAddress: newAddress,
            depotLocation: {
              name: hubName || t.depotLocation?.name || `${t.name} Home Hub`,
              address: newAddress,
              lat: lat || t.depotLocation?.lat || 53.5412,
              lng: lng || t.depotLocation?.lng || -113.4988,
            },
            currentLocation: {
              ...t.currentLocation,
              address: newAddress,
              lat: lat || t.currentLocation.lat,
              lng: lng || t.currentLocation.lng,
            },
          };
        }
        return t;
      })
    );
  };
  const handleUpdateStaffList = useCallback((updatedStaff: JobberStaffMember[]) => {
    setStaffList(updatedStaff);
    const updatedTechs = updatedStaff.map((s, idx) => staffMemberToTechnician(s, idx));
    setTechnicians(updatedTechs);
    fetch('/api/store/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffRoster: updatedStaff }),
    }).catch(() => {});
  }, []);

  // Update client in database & sync matching jobs
  const handleUpdateClient = useCallback((updated: ClientRecord) => {
    saveClientToFirestore(updated).catch(() => {});
    setClientsList((prev) => {
      const next = prev.map((c) => (c.id === updated.id ? updated : c));
      fetch('/api/store/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clients: next }),
      }).catch(() => {});
      return next;
    });

    // Also update any matching scheduled jobs if name or phone changed
    setScheduledJobsList((prev) =>
      prev.map((job) => {
        if (
          job.clientName.toLowerCase() === updated.name.toLowerCase() ||
          job.clientPhone === updated.phone
        ) {
          const modJob = {
            ...job,
            clientName: updated.name,
            clientPhone: updated.phone,
            secondaryPhone: updated.secondaryPhone || job.secondaryPhone,
            serviceAddress: updated.address || job.serviceAddress,
          };
          saveScheduledVisitToFirestore(modJob).catch(() => {});
          return modJob;
        }
        return job;
      })
    );
  }, []);

  // Add new client to database
  const handleAddClient = useCallback((newClient: ClientRecord) => {
    saveClientToFirestore(newClient).catch(() => {});
    setClientsList((prev) => {
      const next = [newClient, ...prev];
      fetch('/api/store/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clients: next }),
      }).catch(() => {});
      return next;
    });
  }, []);

  // Delete client from database
  const handleDeleteClient = useCallback((clientId: string) => {
    deleteClientFromFirestore(clientId).catch(() => {});
    setClientsList((prev) => {
      const next = prev.filter((c) => c.id !== clientId);
      fetch('/api/store/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clients: next }),
      }).catch(() => {});
      return next;
    });
  }, []);

  // When job client details are edited (from calendar or job details drawer / modal)
  const handleUpdateJobDetails = useCallback((jobId: string, updates: Partial<ScheduledJobItem>) => {
    setScheduledJobsList((prev) => {
      const next = prev.map((j) => {
        if (j.id === jobId) {
          const mod = { ...j, ...updates };
          saveScheduledVisitToFirestore(mod).catch(() => {});
          return mod;
        }
        return j;
      });
      fetch('/api/store/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledVisits: next }),
      }).catch(() => {});
      return next;
    });

    // If client details (name, phone, secondaryPhone, address) changed, also sync to clients database!
    if (updates.clientName || updates.clientPhone || updates.secondaryPhone || updates.serviceAddress) {
      setClientsList((prev) => {
        const found = prev.find(
          (c) =>
            (updates.clientName && c.name.toLowerCase() === updates.clientName.toLowerCase()) ||
            (updates.clientPhone && c.phone === updates.clientPhone)
        );

        if (found) {
          return prev.map((c) =>
            c.id === found.id
              ? {
                  ...c,
                  name: updates.clientName || c.name,
                  phone: updates.clientPhone || c.phone,
                  secondaryPhone: updates.secondaryPhone !== undefined ? updates.secondaryPhone : c.secondaryPhone,
                  address: updates.serviceAddress || c.address,
                  updatedAt: new Date().toISOString(),
                }
              : c
          );
        } else if (updates.clientName) {
          const newRecord: ClientRecord = {
            id: `cli-${Date.now()}`,
            name: updates.clientName,
            phone: updates.clientPhone || '(780) 555-0100',
            secondaryPhone: updates.secondaryPhone,
            address: updates.serviceAddress || 'Edmonton, AB',
            verdict: 'Client',
            tags: ['jobber-client'],
            isJobberLinked: true,
            totalJobs: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          return [newRecord, ...prev];
        }
        return prev;
      });
    }
  }, []);

  // When technician / van / hub is edited
  const handleUpdateTechnician = useCallback((updatedTech: Technician) => {
    setTechnicians((prev) => {
      const next = prev.map((t) => (t.id === updatedTech.id ? updatedTech : t));
      return next;
    });
    // Also sync to staff roster
    setStaffList((prev) => {
      const nextStaff = prev.map((s) => {
        if (s.name.toLowerCase() === updatedTech.name.toLowerCase() || s.id === updatedTech.id) {
          return {
            ...s,
            name: updatedTech.name,
            phone: updatedTech.phone || s.phone,
            homeAddress: updatedTech.homeAddress || s.homeAddress,
            vanUnit: updatedTech.vanNumber || s.vanUnit,
            color: updatedTech.color || s.color,
          };
        }
        return s;
      });
      fetch('/api/staff/sync-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff: nextStaff }),
      }).catch(() => {});
      return nextStaff;
    });

    // Save home hub coordinates & address to backend
    fetch('/api/technicians/update-hub', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cleanerId: updatedTech.id,
        homeAddress: updatedTech.homeAddress || updatedTech.depotLocation?.address,
        hubName: updatedTech.depotLocation?.name,
        lat: updatedTech.depotLocation?.lat,
        lng: updatedTech.depotLocation?.lng,
      }),
    }).catch((err) => console.warn('Update hub note:', err));

    // Save cleanerOverrides to persistent JSON store
    fetch('/api/store/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cleanerOverrides: {
          [updatedTech.id]: {
            name: updatedTech.name,
            vanNumber: updatedTech.vanNumber,
            phone: updatedTech.phone,
            color: updatedTech.color,
            homeAddress: updatedTech.homeAddress,
            depotLocation: updatedTech.depotLocation,
            currentLocation: updatedTech.currentLocation,
          },
        },
      }),
    }).catch((err) => console.warn('Store cleaner overrides save note:', err));

    // Also sync to Firestore vanOverrides collection
    saveVanOverrideToFirestore(updatedTech).catch(() => {});
  }, []);

  // Load persistent store on mount & handle direct URL deep linking (/book, /support, /quotes, /invoices, /unscheduled, /staff)
  useEffect(() => {
    // Check initial path or hash
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path === '/book' || hash === '#book' || path.startsWith('/book/')) {
        setActiveTopView('CUSTOMER_PORTAL');
      } else if (path === '/master' || hash === '#master' || path === '/master-table' || hash === '#master-table') {
        setActiveTopView('MASTER_HUB');
        setMasterHubFocusBlock('ALL');
      } else if (path === '/paste' || hash === '#paste' || path === '/paste-table' || hash === '#paste-table') {
        setActiveTopView('MASTER_HUB');
        setMasterHubFocusBlock('PASTE_TABLE');
      } else if (path === '/spam' || hash === '#spam' || path === '/spam-shield' || hash === '#spam-shield' || path === '/block' || hash === '#block') {
        setActiveTopView('SPAM_SHIELD');
      } else if (path === '/map' || hash === '#map') {
        setActiveTopView('MAP');
      } else if (path === '/voice' || hash === '#voice' || path === '/quote' || hash === '#quote' || path === '/intake' || hash === '#intake') {
        setActiveTopView('QUICK_QUOTE');
      } else if (path === '/intakes' || hash === '#intakes') {
        setActiveTopView('INTAKES');
      } else if (path === '/clients' || hash === '#clients') {
        setActiveTopView('CLIENTS');
      } else if (path === '/management' || hash === '#management') {
        setActiveTopView('MANAGEMENT');
      } else if (path === '/quotes' || hash === '#quotes') {
        setActiveTopView('QUOTES');
      } else if (path === '/invoices' || hash === '#invoices') {
        setActiveTopView('INVOICES');
      } else if (path === '/search' || hash === '#search' || path === '/radar' || hash === '#radar') {
        setActiveTopView('ADDRESS_SEARCH');
      } else if (path === '/jobs' || hash === '#jobs') {
        setActiveTopView('SCHEDULED_JOBS');
        setScheduledJobsSubTab('CALENDAR');
      } else if (path === '/unscheduled' || hash === '#unscheduled') {
        setActiveTopView('SCHEDULED_JOBS');
        setScheduledJobsSubTab('UNSCHEDULED');
      } else if (path === '/staff' || hash === '#staff') {
        setIsStaffModalOpen(true);
      } else if (path === '/support' || path === '/t&c' || path === '/privacy-policy') {
        if (path === '/t&c') setActiveLegalTab('TERMS');
        else if (path === '/privacy-policy') setActiveLegalTab('PRIVACY');
        else setActiveLegalTab('SUPPORT');
        setActiveTopView('LEGAL');
      }
    }

    fetch(`/api/store?project=${activeProjectId}`, {
      headers: { 'x-project-id': activeProjectId },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          const cleanTickets = Array.isArray(data.tickets) ? data.tickets.filter((t: any) => !isFakeSimulationItem(t)) : [];
          if (cleanTickets.length > 0) setTickets(cleanTickets);
          if (data.scheduledVisits && data.scheduledVisits.length > 0) {
            setScheduledJobsList(
              mergeWithBaseScheduledVisits(data.scheduledVisits)
                .filter((v: any) => !isFakeSimulationItem(v))
                .map((v: any, idx: number) => {
                  const coords = resolveClientSideEdmontonCoords(v.serviceAddress, v.lat, v.lng);
                  return {
                    ...v,
                    id: v.id || `visit-${idx}`,
                    visitNumber: v.visitNumber || `VISIT-${4000 + idx}`,
                    title: v.title || 'Cleaning Service Visit',
                    clientName: v.clientName || 'Jobber Client',
                    clientPhone: v.clientPhone || '(780) 718-5092',
                    secondaryPhone: v.secondaryPhone,
                    serviceAddress: v.serviceAddress || '10405 Jasper Ave NW, Edmonton, AB',
                    lat: coords.lat,
                    lng: coords.lng,
                    startAt: v.startAt || new Date().toISOString(),
                    endAt: v.endAt || new Date(Date.now() + 3600000).toISOString(),
                    assignedCleaners: v.assignedCleaners || ['Cindy Guay'],
                    serviceType: v.serviceType || 'Standard Cleaning',
                    status: v.status || 'SCHEDULED',
                    jobberWebUri: v.jobberWebUri || 'https://secure.getjobber.com',
                    notes: v.notes,
                  };
                })
            );
          }
          if (data.unscheduledJobs) {
            setUnscheduledJobsList(data.unscheduledJobs.filter((j: any) => !isFakeSimulationItem(j)));
          }
          if (data.clients && data.clients.length > 0) {
            setClientsList(data.clients);
          }
          if (data.staffRoster && data.staffRoster.length > 0) {
            setStaffList(data.staffRoster);
            const baseTechs = data.staffRoster.map((s: JobberStaffMember, idx: number) => staffMemberToTechnician(s, idx));
            const overrides = data.cleanerOverrides || {};
            const finalTechs = baseTechs.map((t: Technician) => {
              const ov = overrides[t.id];
              const assignedIds = cleanTickets.filter((tk: ServiceTicket) => tk.assignedTechId === t.id).map((tk: ServiceTicket) => tk.id);
              if (!ov) return { ...t, assignedTicketIds: assignedIds };
              return {
                ...t,
                ...ov,
                assignedTicketIds: assignedIds,
                depotLocation: { ...t.depotLocation, ...(ov.depotLocation || {}) },
                currentLocation: { ...t.currentLocation, ...(ov.currentLocation || {}) },
              };
            });
            setTechnicians(finalTechs);
          } else {
            const overrides = data.cleanerOverrides || {};
            setTechnicians((prev) =>
              prev.map((t) => {
                const ov = overrides[t.id];
                const assignedIds = cleanTickets.filter((tk: ServiceTicket) => tk.assignedTechId === t.id).map((tk: ServiceTicket) => tk.id);
                if (!ov) return { ...t, assignedTicketIds: assignedIds };
                return {
                  ...t,
                  ...ov,
                  assignedTicketIds: assignedIds,
                  depotLocation: { ...t.depotLocation, ...(ov.depotLocation || {}) },
                  currentLocation: { ...t.currentLocation, ...(ov.currentLocation || {}) },
                };
              })
            );
          }
          if (data.quotes && data.quotes.length > 0) setQuotesList(dedupeQuotesList(data.quotes));
          if (data.invoices && data.invoices.length > 0) setInvoicesList(data.invoices.filter((inv: any) => !isFakeSimulationItem(inv)));
          if (data.quoCallLogs && data.quoCallLogs.length > 0) setQuoCallsList(data.quoCallLogs);
          if (data.spamShieldConfig) setSpamShieldConfig(data.spamShieldConfig);
          if (data.blockedCallsHistory && data.blockedCallsHistory.length > 0) setBlockedCallsHistory(data.blockedCallsHistory);
          if (data.adLeads && data.adLeads.length > 0) setLeadsList(data.adLeads);
          if (data.serviceCatalog && data.serviceCatalog.length > 0) setServiceCatalog(data.serviceCatalog);
          if (Array.isArray(data.headerNavOrder) && data.headerNavOrder.length > 0) {
            const merged = [...data.headerNavOrder.filter((k: string) => DEFAULT_HEADER_NAV_ORDER.includes(k))];
            DEFAULT_HEADER_NAV_ORDER.forEach((k) => {
              if (!merged.includes(k)) merged.push(k);
            });
            setHeaderNavOrder(merged);
            try {
              localStorage.setItem('tidyups_header_nav_order_v2', JSON.stringify(merged));
            } catch {}
          }
          if (Array.isArray(data.footerBtnOrder) && data.footerBtnOrder.length > 0) {
            const merged = [...data.footerBtnOrder.filter((k: string) => DEFAULT_FOOTER_BTN_ORDER.includes(k))];
            DEFAULT_FOOTER_BTN_ORDER.forEach((k) => {
              if (!merged.includes(k)) merged.push(k);
            });
            setFooterBtnOrder(merged);
            try {
              localStorage.setItem('tidyups_footer_btn_order_v2', JSON.stringify(merged));
            } catch {}
          }
          if (data.footerButtonsSide === 'left' || data.footerButtonsSide === 'right') {
            setFooterButtonsSide(data.footerButtonsSide);
            try {
              localStorage.setItem('tidyups_footer_side_v2', data.footerButtonsSide);
            } catch {}
          }
        }
      })
      .catch((err) => console.warn('Could not load persistent store:', err));
  }, [activeProjectId]);

  // Unified persistent auto-save: preserves all user entries, clients, quotes, invoices, serviceCatalog, blocked numbers, screened calls, and jobs across refreshes per project
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const payload = {
          tickets,
          technicians,
          scheduledVisits: scheduledJobsList,
          unscheduledJobs: unscheduledJobsList,
          clients: clientsList,
          quotes: quotesList,
          invoices: invoicesList,
          serviceCatalog,
          quoCallLogs: quoCallsList,
          spamShieldConfig,
          blockedCallsHistory,
          adLeads: leadsList,
          lastSavedAt: new Date().toISOString(),
        };
        localStorage.setItem(`${activeProjectId}_dispatch_data`, JSON.stringify(payload));
        localStorage.setItem('tidyups_service_catalog_live', JSON.stringify(serviceCatalog));
      }
    } catch (err) {
      console.warn('Auto-save error:', err);
    }
  }, [activeProjectId, tickets, technicians, scheduledJobsList, unscheduledJobsList, clientsList, quotesList, invoicesList, serviceCatalog, quoCallsList, spamShieldConfig, blockedCallsHistory, leadsList]);

  // Save tickets to local persistent database whenever updated
  const saveStateToStore = useCallback((updatedTickets: ServiceTicket[]) => {
    fetch(`/api/store/save?project=${activeProjectId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-project-id': activeProjectId,
      },
      body: JSON.stringify({ tickets: updatedTickets }),
    }).catch((err) => console.warn('Store save note:', err));
  }, [activeProjectId]);

  // Responsive layout & collapsible component states
  const [isBoardCollapsed, setIsBoardCollapsed] = useState<boolean>(false);
  const [mobileSheetState, setMobileSheetState] = useState<'collapsed' | 'half' | 'full'>('collapsed');
  const [isLandscapeDrawerOpen, setIsLandscapeDrawerOpen] = useState<boolean>(false);

  // Viewport mode detection for mobile portrait, mobile landscape, tablet, and desktop
  const [viewportMode, setViewportMode] = useState<{
    isMobilePortrait: boolean;
    isMobileLandscape: boolean;
    isTablet: boolean;
    isDesktop: boolean;
  }>(() => {
    if (typeof window === 'undefined') {
      return { isMobilePortrait: false, isMobileLandscape: false, isTablet: false, isDesktop: true };
    }
    const w = window.innerWidth;
    const h = window.innerHeight;
    const isLandscape = w > h;
    const isMobileLand = isLandscape && (h <= 540 || (w < 960 && h < 600));
    const isMobilePort = !isLandscape && w < 768;
    const isTab = !isMobileLand && !isMobilePort && w < 1024;
    return {
      isMobilePortrait: isMobilePort,
      isMobileLandscape: isMobileLand,
      isTablet: isTab,
      isDesktop: !isMobileLand && !isMobilePort && !isTab,
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const isLandscape = w > h;
      const isMobileLand = isLandscape && (h <= 540 || (w < 960 && h < 600));
      const isMobilePort = !isLandscape && w < 768;
      const isTab = !isMobileLand && !isMobilePort && w < 1024;
      setViewportMode({
        isMobilePortrait: isMobilePort,
        isMobileLandscape: isMobileLand,
        isTablet: isTab,
        isDesktop: !isMobileLand && !isMobilePort && !isTab,
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Mobile bottom sheet touch swipe gestures
  const touchStartYRef = useRef<number | null>(null);

  const handleSheetTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
  }, []);

  const handleSheetTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartYRef.current === null) return;
    const endY = e.changedTouches[0].clientY;
    const diffY = touchStartYRef.current - endY;
    touchStartYRef.current = null;

    if (diffY > 35) {
      // Swiped upwards: expand to next level
      setMobileSheetState((s) => (s === 'collapsed' ? 'half' : 'full'));
    } else if (diffY < -35) {
      // Swiped downwards: collapse to lower level
      setMobileSheetState((s) => (s === 'full' ? 'half' : 'collapsed'));
    }
  }, []);

  // Primary toggle button on peek bar:
  // When 'collapsed': clicking opens to 'half'.
  // When 'half' or 'full': button says 'Collapse' and clicking it IMMEDIATELY COLLAPSES to 'collapsed'
  const handlePrimarySheetToggle = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setMobileSheetState((s) => (s === 'collapsed' ? 'half' : 'collapsed'));
  }, []);

  // Full-screen toggle button
  const handleToggleFullScreen = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setMobileSheetState((s) => (s === 'full' ? 'half' : 'full'));
  }, []);
  const [isZenMode, setIsZenMode] = useState<boolean>(false);

  // Modals state
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [manifestTech, setManifestTech] = useState<Technician | null>(null);
  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Listen for Google Maps quota exceeded event
  useEffect(() => {
    const handleQuota = () => {
      setQuotaExceeded(true);
    };
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => {
      window.removeEventListener('gmp-quota-exceeded', handleQuota);
    };
  }, []);

  // Listen for Google Maps auth failures (e.g. ApiProjectMapError or RefererNotAllowedMapError)
  useEffect(() => {
    const handleAuthFailure = () => {
      console.warn('Google Maps API Auth or Target Blocked detected. Enabling interactive vector territory map.');
      setMapsAuthError(true);
    };

    const handleRefererError = (e: Event) => {
      const customEvent = e as CustomEvent<{ url?: string }>;
      const origin = customEvent.detail?.url || (typeof window !== 'undefined' ? window.location.origin : '');
      console.warn('Google Maps API Referer Restriction detected for origin:', origin);
      setRefererErrorUrl(origin);
      setMapsAuthError(true);
    };

    window.addEventListener('google-maps-auth-failure', handleAuthFailure);
    window.addEventListener('google-maps-referer-error', handleRefererError);
    (window as any).gm_authFailure = handleAuthFailure;

    return () => {
      window.removeEventListener('google-maps-auth-failure', handleAuthFailure);
      window.removeEventListener('google-maps-referer-error', handleRefererError);
    };
  }, []);

  // Fetch backend Google Maps key on mount
  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => {
        if (data?.mapsApiKey) {
          setApiKey(data.mapsApiKey);
        }
      })
      .catch(() => {});
  }, []);

  // Initial calculation of routes for all technicians on mount
  useEffect(() => {
    async function calculateInitialRoutes() {
      setIsRecalculating(true);
      const updatedTechs = await Promise.all(
        technicians.map(async (tech) => {
          if (tech.assignedTicketIds.length > 0) {
            const metrics = await computeTechnicianRoute(tech, tickets);
            return { ...tech, routeMetrics: metrics };
          }
          return tech;
        })
      );
      setTechnicians(updatedTechs);
      setIsRecalculating(false);
    }

    calculateInitialRoutes();
  }, []);

  // Recalculates route for a single technician when tickets change
  const recalculateSingleTechRoute = useCallback(
    async (techId: string, currentTickets: ServiceTicket[], currentTechs: Technician[]) => {
      const tech = currentTechs.find((t) => t.id === techId);
      if (!tech) return;

      const metrics = await computeTechnicianRoute(tech, currentTickets);
      setTechnicians((prevTechs) =>
        prevTechs.map((t) => (t.id === techId ? { ...t, routeMetrics: metrics } : t))
      );
    },
    []
  );

  // Drag and drop assignment handler
  const handleAssignTicket = useCallback(
    async (ticketId: string, techId: string) => {
      const ticketToAssign = tickets.find((t) => t.id === ticketId);
      const targetTech = technicians.find((t) => t.id === techId);
      if (!ticketToAssign || !targetTech) return;

      const previousTechId = ticketToAssign.assignedTechId;

      // 1. Update ticket model
      const updatedTickets = tickets.map((t) => {
        if (t.id === ticketId) {
          return {
            ...t,
            assignedTechId: techId,
            status: 'ASSIGNED' as const,
            stopSequence: targetTech.assignedTicketIds.length + 1,
          };
        }
        return t;
      });
      setTickets(updatedTickets);

      // 2. Update technicians model
      const updatedTechs = technicians.map((t) => {
        if (t.id === techId) {
          const newIds = t.assignedTicketIds.includes(ticketId)
            ? t.assignedTicketIds
            : [...t.assignedTicketIds, ticketId];
          return { ...t, assignedTicketIds: newIds };
        }
        if (previousTechId && t.id === previousTechId) {
          return {
            ...t,
            assignedTicketIds: t.assignedTicketIds.filter((id) => id !== ticketId),
          };
        }
        return t;
      });
      setTechnicians(updatedTechs);
      setSelectedTechId(techId);

      // 3. Recalculate routes for affected technicians via Routes API
      await recalculateSingleTechRoute(techId, updatedTickets, updatedTechs);
      if (previousTechId && previousTechId !== techId) {
        await recalculateSingleTechRoute(previousTechId, updatedTickets, updatedTechs);
      }
    },
    [tickets, technicians, recalculateSingleTechRoute]
  );

  // Unassign ticket back to pending queue
  const handleUnassignTicket = useCallback(
    async (ticketId: string) => {
      const ticket = tickets.find((t) => t.id === ticketId);
      if (!ticket || !ticket.assignedTechId) return;

      const prevTechId = ticket.assignedTechId;

      const updatedTickets = tickets.map((t) => {
        if (t.id === ticketId) {
          return {
            ...t,
            assignedTechId: undefined,
            status: 'UNASSIGNED' as const,
            stopSequence: undefined,
          };
        }
        return t;
      });
      setTickets(updatedTickets);

      const updatedTechs = technicians.map((t) => {
        if (t.id === prevTechId) {
          return {
            ...t,
            assignedTicketIds: t.assignedTicketIds.filter((id) => id !== ticketId),
          };
        }
        return t;
      });
      setTechnicians(updatedTechs);

      await recalculateSingleTechRoute(prevTechId, updatedTickets, updatedTechs);
    },
    [tickets, technicians, recalculateSingleTechRoute]
  );

  // Reorder tickets within a technician's schedule
  const handleReorderTechTickets = useCallback(
    async (techId: string, reorderedTicketIds: string[]) => {
      const updatedTickets = tickets.map((t) => {
        const idx = reorderedTicketIds.indexOf(t.id);
        if (idx !== -1) {
          return { ...t, stopSequence: idx + 1 };
        }
        return t;
      });
      setTickets(updatedTickets);

      const updatedTechs = technicians.map((t) => {
        if (t.id === techId) {
          return { ...t, assignedTicketIds: reorderedTicketIds };
        }
        return t;
      });
      setTechnicians(updatedTechs);

      await recalculateSingleTechRoute(techId, updatedTickets, updatedTechs);
    },
    [tickets, technicians, recalculateSingleTechRoute]
  );

  // Apply batch recommendations from AI Dispatch Assistant
  const handleBatchApplyRecommendations = useCallback(
    async (recommendations: AIRecommendation[]) => {
      setIsRecalculating(true);
      let curTickets = [...tickets];
      let curTechs = [...technicians];

      recommendations.forEach((rec) => {
        curTickets = curTickets.map((t) => {
          if (t.id === rec.ticketId) {
            const targetTech = curTechs.find((tech) => tech.id === rec.recommendedTechId);
            return {
              ...t,
              assignedTechId: rec.recommendedTechId,
              status: 'ASSIGNED' as const,
              stopSequence: (targetTech?.assignedTicketIds.length || 0) + 1,
            };
          }
          return t;
        });

        curTechs = curTechs.map((t) => {
          if (t.id === rec.recommendedTechId) {
            const exists = t.assignedTicketIds.includes(rec.ticketId);
            return exists
              ? t
              : { ...t, assignedTicketIds: [...t.assignedTicketIds, rec.ticketId] };
          }
          // Remove from previous technician if reassigned to prevent duplicate assignments
          if (t.assignedTicketIds.includes(rec.ticketId)) {
            return {
              ...t,
              assignedTicketIds: t.assignedTicketIds.filter((id) => id !== rec.ticketId),
            };
          }
          return t;
        });
      });

      setTickets(curTickets);

      // Recalculate routes for all technicians
      const updatedTechsWithRoutes = await Promise.all(
        curTechs.map(async (tech) => {
          if (tech.assignedTicketIds.length > 0) {
            const metrics = await computeTechnicianRoute(tech, curTickets);
            return { ...tech, routeMetrics: metrics };
          }
          return tech;
        })
      );

      setTechnicians(updatedTechsWithRoutes);
      setIsRecalculating(false);
    },
    [tickets, technicians]
  );

  // Apply single AI recommendation
  const handleApplySingleRecommendation = useCallback(
    (rec: AIRecommendation) => {
      handleAssignTicket(rec.ticketId, rec.recommendedTechId);
    },
    [handleAssignTicket]
  );

  // Add new user-created service ticket
  const handleCreateTicket = useCallback(
    (newTicket: ServiceTicket) => {
      setTickets((prev) => [newTicket, ...prev]);
      setSelectedTicketId(newTicket.id);
    },
    []
  );

  // Support clicking on any cleaner across the UI (TerritoryMap, DispatchKanban, Directory) to talk to them
  const handleMessageTech = useCallback((tech: Technician) => {
    const matchedUser = APP_USERS.find(
      (u) => u.cleanerId === tech.id || u.email === tech.email || u.name === tech.name
    );
    if (matchedUser) {
      setChatRecipient(matchedUser);
      setIsChatOpen(true);
    }
  }, []);

  const handleSelectUser = useCallback((user: AppUser) => {
    setCurrentUser(user);
    setIsStaffAuthenticated(true);
    try {
      localStorage.setItem('bookmycleaning_active_user_id', user.id);
      localStorage.setItem('tidyups_staff_authenticated', 'true');
      localStorage.setItem('tidyups_active_tab', 'MAP');
    } catch (e) {
      console.warn('localStorage error:', e);
    }
    setActiveTopView('MAP');
    if (user.role === 'CLEANER') {
      setSelectedTechId(user.cleanerId || null);
      setCleanerShowMap(false);
    }
  }, []);

  const handleLogout = useCallback(() => {
    setIsStaffAuthenticated(false);
    try {
      localStorage.removeItem('tidyups_staff_authenticated');
      localStorage.setItem('tidyups_active_tab', 'CUSTOMER_PORTAL');
    } catch (e) {
      console.warn('localStorage error:', e);
    }
    setActiveTopView('CUSTOMER_PORTAL');
  }, []);

  const handleUpdateTicketStatus = useCallback((ticketId: string, newStatus: TicketStatus) => {
    setTickets((prev) => {
      const updated = prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t));
      saveStateToStore(updated);
      return updated;
    });
  }, [saveStateToStore]);

  const handleUpdateTechStatus = useCallback((techId: string, newStatus: TechnicianStatus) => {
    setTechnicians((prev) =>
      prev.map((t) => (t.id === techId ? { ...t, status: newStatus } : t))
    );
  }, []);

  // High-level KPI aggregations
  const totalEmergencyCount = tickets.filter(
    (t) => t.urgency === 'EMERGENCY' && t.status !== 'COMPLETED'
  ).length;
  const unassignedCount = tickets.filter((t) => !t.assignedTechId).length;
  const totalFleetKm = technicians.reduce(
    (acc, t) => acc + (t.routeMetrics?.totalDistanceKm || Math.round((t.routeMetrics?.totalDistanceMiles || 0) * 1.60934 * 10) / 10),
    0
  );
  const totalEstimatedFuelLiters = technicians.reduce(
    (acc, t) => acc + (t.routeMetrics?.estimatedFuelLiters || Math.round((t.routeMetrics?.estimatedFuelGallons || 0) * 3.78541 * 10) / 10),
    0
  );

  // Live Date/Time for header - Local Edmonton MDT Dispatch Time
  const [currentTime, setCurrentTime] = useState<string>('6:34 PM');
  const [currentDate] = useState<string>('Sunday, October 11, 2026');

  useEffect(() => {
    const now = new Date();
    if (now.getFullYear() === 2026) {
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
      const timer = setInterval(() => {
        setCurrentTime(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
      }, 10000);
      return () => clearInterval(timer);
    }
  }, []);

  return (
    <APIProvider 
      apiKey={apiKey}
      region="CA"
      language="en"
      solutionChannel="gmp_mcp_codeassist_v1_aistudio"
      onError={(err) => {
        console.warn('APIProvider error:', err);
        setMapsAuthError(true);
      }}
    >
      <div id="cleaning-dispatch-app" className="w-screen h-screen bg-slate-50 text-slate-900 font-sans select-none overflow-x-auto overflow-y-auto">
        <div className="min-w-[1380px] min-h-full h-full flex flex-col">
        {/* Quota banner suppressed so map operates cleanly without warnings */}

        {/* Full-Screen Zen Mode Exit Pill */}
        {isZenMode && (
          <div className="absolute top-4 left-4 z-50 animate-fadeIn pointer-events-auto">
            <button
              onClick={() => setIsZenMode(false)}
              className="min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-900 text-white text-xs font-bold flex items-center gap-2 shadow-2xl backdrop-blur-md border border-slate-750 cursor-pointer transition-all active:scale-95"
              aria-label="Exit full map mode"
            >
              <Minimize2 className="w-4 h-4 text-blue-400" />
              <span>Exit Full Map</span>
            </button>
          </div>
        )}

        {/* Customer Portal Top Bar (for Public Customers & Non-Staff Visitors) */}
        {!isZenMode && !isStaffAuthenticated && (
          <header
            id="customer-header"
            className="h-16 px-3 sm:px-6 bg-white border-b border-slate-200 flex items-center justify-between flex-shrink-0 z-20 shadow-xs gap-3"
          >
            <div className="flex items-center gap-2 sm:gap-3 cursor-pointer" onClick={() => setActiveTopView('CUSTOMER_PORTAL')}>
              <BookMyCleaningLogo projectId={activeBrandId} size={36} withText={true} />
            </div>

            {/* Primary Domain Badge (app.tidyupscleaning.com) */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => handleSwitchProject('tidyups')}
                className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white shadow-2xs font-extrabold transition-all flex items-center gap-1 cursor-pointer"
                title="TidyUps Cleaning (app.tidyupscleaning.com)"
              >
                <span>✨</span>
                <span className="hidden md:inline">app.tidyupscleaning.com</span>
              </button>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Toll-Free Hotline */}
              <a
                href="tel:18338439877"
                className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-pink-50 to-purple-50 hover:from-pink-100 hover:to-purple-100 border border-pink-200/80 rounded-xl text-xs font-bold text-slate-800 transition-all cursor-pointer shadow-2xs group"
                title="Dispatch Genie Toll-Free Hotline: 1-833-TIDYUPS (833-843-9877) or Direct Dispatch: (587) 900-7223"
              >
                <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-pink-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Phone className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-[11px] font-black tracking-tight text-purple-950 font-mono">1-833-TIDYUPS</span>
                  <span className="text-[9px] text-pink-700 font-extrabold font-mono">(833-843-9877) • Dispatch: (587) 900-7223</span>
                </div>
              </a>

              {/* Support & Policies */}
              <button
                onClick={() => {
                  setActiveLegalTab('SUPPORT');
                  setActiveTopView('LEGAL');
                }}
                className={`min-h-[34px] px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTopView === 'LEGAL'
                    ? 'bg-purple-100 text-purple-900 font-extrabold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5 text-fuchsia-600" />
                <span className="hidden sm:inline">Support &amp; Policies</span>
              </button>

              {/* Prominent Header Link to Voice Dictations & Quick Quote */}
              <button
                onClick={() => {
                  setIsStaffAuthenticated(true);
                  try {
                    localStorage.setItem('tidyups_staff_authenticated', 'true');
                    localStorage.setItem('tidyups_active_tab', 'QUICK_QUOTE');
                  } catch {}
                  setActiveTopView('QUICK_QUOTE');
                }}
                className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-600 via-fuchsia-600 to-purple-600 hover:opacity-95 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                title="Open Live Voice Dictation, Request Intake Form, Quick Quote & Quick Map"
              >
                <Mic className="w-3.5 h-3.5 text-white shrink-0" />
                <span>Voice Dictation &amp; Quick Quote</span>
              </button>

              {/* 1-Click Block Caller / Area Code Button on Main Website */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleOpenSpamShield();
                }}
                className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
                title="Instant Call Blocker: Block a phone number or entire 3-digit area code across all Twilio lines"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-white shrink-0" />
                <span>Block Spam Caller</span>
              </button>

              {/* Project ZIP Download, Google Drive Backup & AI Build Guide */}
              <button
                onClick={() => setIsProjectBackupModalOpen(true)}
                className="min-h-[36px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                title="Download Full Project ZIP, Backup to Google Drive, AI Build Workflow & GitHub / Publish Guide"
              >
                <FileArchive className="w-3.5 h-3.5 text-white shrink-0" />
                <span className="hidden sm:inline">Backup ZIP &amp; Drive</span>
              </button>

              {/* Staff & Dispatch Login */}
              <button
                onClick={() => setIsRoleModalOpen(true)}
                className="min-h-[36px] px-3 sm:px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
                title="Staff Login: Owner, Dispatcher, and Cleaner Portals"
              >
                <Lock className="w-3.5 h-3.5 text-white shrink-0" />
                <span className="hidden sm:inline">Console</span>
              </button>
            </div>
          </header>
        )}

        {/* Global Top Application Navigation Bar (Only for Authenticated Staff) */}
        {!isZenMode && isStaffAuthenticated && (
          <header
            id="global-header"
            className="h-14 min-h-[56px] landscape:max-md:h-11 landscape:max-md:min-h-[44px] px-2 sm:px-3 md:px-4 lg:px-5 bg-white border-b border-slate-200 flex items-center justify-between flex-shrink-0 z-20 shadow-xs gap-1.5 sm:gap-2.5 md:gap-3 overflow-x-auto"
          >
            {/* Brand & Identity */}
            <div
              className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-shrink cursor-pointer"
              onClick={() => {
                setMasterHubFocusBlock('ALL');
                setActiveTopView('MASTER_HUB');
              }}
            >
              <BookMyCleaningLogo projectId={activeBrandId} size={36} withText={true} />
            </div>

            {/* 1-BUTTON SYNC ALL (Jobber + Quotes + Invoices + Quo Calls + Master Sheet) */}
            <button
              type="button"
              onClick={() => handleSyncEverything(false)}
              disabled={isSyncingEverything}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer shrink-0 disabled:opacity-60"
              title="1-Click Sync Everything: Quotes, Invoices, Jobber Calendar, Clients, Quo Calls & Master Leads Table (Also auto-syncs on login!)"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-white shrink-0 ${isSyncingEverything ? 'animate-spin' : ''}`} />
              <span>{isSyncingEverything ? 'Syncing All...' : 'Sync All (Jobber + Quotes + Invoices + Leads)'}</span>
            </button>

            {/* Vanity Line & Direct Dispatch Badge */}
            <a
              href="tel:18338439877"
              className="hidden 2xl:flex items-center gap-2 px-2.5 py-1 bg-gradient-to-r from-pink-50 to-purple-50 hover:from-pink-100 hover:to-purple-100 border border-pink-200/80 rounded-xl text-xs font-bold text-slate-800 transition-all cursor-pointer shadow-2xs shrink-0 group"
              title="Call Dispatch Genie Vanity Line: 1-833-TIDYUPS (833-843-9877) or Direct Dispatch: (587) 900-7223"
            >
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-pink-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Phone className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="flex flex-col text-left leading-tight">
                <span className="text-[11px] font-black tracking-tight text-purple-950 font-mono">1-833-TIDYUPS</span>
                <span className="text-[9px] text-pink-700 font-extrabold font-mono">(833-843-9877) • Dispatch: (587) 900-7223</span>
              </div>
            </a>

            {/* 1-Click Block Caller / Area Code Quick Button (Always Visible in Staff Header) */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleOpenSpamShield();
              }}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
              title="Block a phone number or entire 3-digit area code"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-white shrink-0" />
              <span>Block Caller / Area Code</span>
            </button>

            {/* Dedicated Top Bar Primary Navigation Tabs (Drag & Drop or Click ◀ ▶ to Rearrange Left-to-Right) */}
            <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 flex-shrink-0">
              {currentUser.role === 'CLEANER' ? (
                <>
                  <button
                    id="nav-tab-cleaner-jobs"
                    onClick={() => {
                      setCleanerShowMap(false);
                      setActiveTopView('MAP');
                    }}
                    className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      activeTopView === 'MAP' && !cleanerShowMap
                        ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>My Daily Stops</span>
                  </button>

                  <button
                    id="nav-tab-cleaner-map"
                    onClick={() => {
                      setCleanerShowMap(true);
                      setActiveTopView('MAP');
                    }}
                    className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      activeTopView === 'MAP' && cleanerShowMap
                        ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>My Route Map</span>
                  </button>
                </>
              ) : (
                <>
                  {headerNavOrder.map((btnKey, idx) => {
                    let buttonElement: React.ReactNode = null;

                    if (btnKey === 'MASTER_HUB') {
                      buttonElement = (
                        <button
                          id="nav-tab-master-table"
                          onClick={() => {
                            setMasterHubFocusBlock('ALL');
                            setActiveTopView('MASTER_HUB');
                          }}
                          className={`min-h-[34px] px-3.5 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                            activeTopView === 'MASTER_HUB'
                              ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-sm ring-2 ring-emerald-500/30'
                              : 'bg-emerald-50 text-emerald-950 hover:bg-emerald-100 border border-emerald-300'
                          }`}
                          title="Drag left/right to rearrange • TidyUps Master Leads & Quotes Table: 1. Paste Table • 2. Master Leads & Quotes Table • 3. Schedule & Search • 4. Quick Maps"
                        >
                          <FileSpreadsheet className={`w-3.5 h-3.5 ${activeTopView === 'MASTER_HUB' ? 'text-white' : 'text-emerald-600'}`} />
                          <span>Master Leads &amp; Quotes Table</span>
                          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                            activeTopView === 'MASTER_HUB' ? 'bg-white/20 text-white' : 'bg-emerald-200/80 text-emerald-900'
                          }`}>
                            {leadsList.length + quotesList.length}
                          </span>
                        </button>
                      );
                    } else if (btnKey === 'QUICK_QUOTE') {
                      buttonElement = (
                        <button
                          id="nav-tab-quick-quote"
                          onClick={() => setActiveTopView('QUICK_QUOTE')}
                          className={`min-h-[34px] px-3.5 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                            activeTopView === 'QUICK_QUOTE'
                              ? 'bg-gradient-to-r from-pink-600 via-fuchsia-600 to-purple-600 text-white shadow-sm ring-2 ring-pink-500/30'
                              : 'bg-pink-50/90 text-pink-900 hover:bg-pink-100 border border-pink-200/80'
                          }`}
                          title="Drag left/right to rearrange • Live Voice Dictation, Customer Request Form, Quick Quote & Quick Map"
                        >
                          <Mic className={`w-3.5 h-3.5 ${activeTopView === 'QUICK_QUOTE' ? 'text-white' : 'text-pink-600'}`} />
                          <span>Voice Dictation &amp; Intake</span>
                        </button>
                      );
                    } else if (btnKey === 'MAP') {
                      buttonElement = (
                        <button
                          id="nav-tab-map"
                          onClick={() => setActiveTopView('MAP')}
                          className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            activeTopView === 'MAP'
                              ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-xs font-extrabold'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                          }`}
                          title="Drag left/right to rearrange • Dispatch Map"
                        >
                          <MapIcon className={`w-3.5 h-3.5 ${activeTopView === 'MAP' ? 'text-white' : 'text-pink-600'}`} />
                          <span>Dispatch Map</span>
                        </button>
                      );
                    } else if (btnKey === 'SCHEDULED_JOBS') {
                      buttonElement = (
                        <button
                          id="nav-tab-jobs"
                          onClick={() => {
                            setActiveTopView('SCHEDULED_JOBS');
                            setScheduledJobsSubTab('CALENDAR');
                          }}
                          className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            activeTopView === 'SCHEDULED_JOBS'
                              ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-xs font-extrabold'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                          }`}
                          title="Drag left/right to rearrange • Scheduled and Unscheduled Jobs from Jobber"
                        >
                          <Calendar className={`w-3.5 h-3.5 ${activeTopView === 'SCHEDULED_JOBS' ? 'text-white' : 'text-purple-600'}`} />
                          <span>Schedule</span>
                          {scheduledJobsList.length > 0 && (
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                              activeTopView === 'SCHEDULED_JOBS' ? 'bg-white/20 text-white' : 'bg-pink-100 text-pink-700'
                            }`}>
                              {scheduledJobsList.length}
                            </span>
                          )}
                        </button>
                      );
                    } else if (btnKey === 'MANAGEMENT') {
                      buttonElement = (
                        <button
                          id="nav-tab-management"
                          onClick={() => setActiveTopView('MANAGEMENT')}
                          className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            ['MANAGEMENT', 'QUOTES', 'INVOICES', 'LEGAL'].includes(activeTopView)
                              ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-xs font-extrabold'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                          }`}
                          title="Drag left/right to rearrange • Management: Intakes, Quotes, Invoices, Staff Roster, Policies & Terms"
                        >
                          <SlidersHorizontal className={`w-3.5 h-3.5 ${
                            ['MANAGEMENT', 'QUOTES', 'INVOICES', 'LEGAL'].includes(activeTopView) ? 'text-white' : 'text-indigo-600'
                          }`} />
                          <span>Management</span>
                        </button>
                      );
                    } else if (btnKey === 'INTAKES') {
                      buttonElement = (
                        <button
                          id="nav-tab-intakes"
                          onClick={() => setActiveTopView('INTAKES')}
                          className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            activeTopView === 'INTAKES'
                              ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-xs font-extrabold'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                          }`}
                          title="Drag left/right to rearrange • Separate page for Voice & Customer Intakes Info"
                        >
                          <ClipboardList className={`w-3.5 h-3.5 ${activeTopView === 'INTAKES' ? 'text-white' : 'text-pink-600'}`} />
                          <span>Intakes</span>
                        </button>
                      );
                    } else if (btnKey === 'CLEAN_SHEET') {
                      buttonElement = (
                        <button
                          id="nav-tab-clean-sheet"
                          onClick={() => setActiveTopView('LEADS')}
                          className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            activeTopView === 'LEADS'
                              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs font-extrabold ring-2 ring-emerald-500/30'
                              : 'text-emerald-800 bg-emerald-50/80 hover:text-emerald-950 hover:bg-emerald-100 border border-emerald-200/80'
                          }`}
                          title="Drag left/right to rearrange • Clean Google Sheet Hub: Facebook Leads, Google Leads, Voice Quotes & Paste Table"
                        >
                          <FileSpreadsheet className={`w-3.5 h-3.5 ${activeTopView === 'LEADS' ? 'text-white' : 'text-emerald-600'}`} />
                          <span>Clean Google Sheet</span>
                          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                            activeTopView === 'LEADS' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {leadsList.length}
                          </span>
                        </button>
                      );
                    } else if (btnKey === 'SPAM_SHIELD') {
                      buttonElement = (
                        <button
                          id="nav-tab-spam-shield"
                          onClick={() => setActiveTopView('SPAM_SHIELD')}
                          className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            activeTopView === 'SPAM_SHIELD'
                              ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-xs font-extrabold ring-2 ring-rose-500/30'
                              : 'text-rose-700 bg-rose-50/70 hover:text-rose-900 hover:bg-rose-100 border border-rose-200/60'
                          }`}
                          title="Drag left/right to rearrange • Twilio Spam Shield: Block nuisance callers, rotating numbers & area codes"
                        >
                          <ShieldAlert className={`w-3.5 h-3.5 ${activeTopView === 'SPAM_SHIELD' ? 'text-white' : 'text-rose-600'}`} />
                          <span>Spam Shield</span>
                        </button>
                      );
                    } else if (btnKey === 'ADDRESS_SEARCH') {
                      buttonElement = (
                        <button
                          id="nav-tab-address-radar"
                          onClick={() => setActiveTopView('ADDRESS_SEARCH')}
                          className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            activeTopView === 'ADDRESS_SEARCH'
                              ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-xs font-extrabold'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                          }`}
                          title="Drag left/right to rearrange • Dedicated Quick Map, Schedule Day Radar, Cleaner Hubs & Distance Calculator"
                        >
                          <Compass className={`w-3.5 h-3.5 ${activeTopView === 'ADDRESS_SEARCH' ? 'text-white' : 'text-purple-600'}`} />
                          <span>Quick Map &amp; Radar</span>
                        </button>
                      );
                    } else if (btnKey === 'CLIENTS') {
                      buttonElement = (
                        <button
                          id="nav-tab-clients"
                          onClick={() => setActiveTopView('CLIENTS')}
                          className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            activeTopView === 'CLIENTS'
                              ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-xs font-extrabold'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                          }`}
                          title="Drag left/right to rearrange • Clients database, lead verdicts, phone numbers & Jobber sync"
                        >
                          <Users className={`w-3.5 h-3.5 ${activeTopView === 'CLIENTS' ? 'text-white' : 'text-blue-600'}`} />
                          <span>Clients</span>
                        </button>
                      );
                    } else if (btnKey === 'LEADS') {
                      buttonElement = (
                        <button
                          id="nav-tab-leads"
                          onClick={() => setActiveTopView('LEADS')}
                          className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            activeTopView === 'LEADS'
                              ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-xs font-extrabold'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                          }`}
                          title="Drag left/right to rearrange • Ad Leads from Google Sheets (FB Leads, Google Ads, forms)"
                        >
                          <Flame className={`w-3.5 h-3.5 ${activeTopView === 'LEADS' ? 'text-white' : 'text-rose-600'}`} />
                          <span>Leads</span>
                        </button>
                      );
                    } else if (btnKey === 'CUSTOMER_PORTAL') {
                      buttonElement = (
                        <button
                          id="nav-tab-customer-portal"
                          onClick={() => setActiveTopView('CUSTOMER_PORTAL')}
                          className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            activeTopView === 'CUSTOMER_PORTAL'
                              ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-xs font-extrabold'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                          }`}
                          title="Drag left/right to rearrange • Customer Booking & Services Portal"
                        >
                          <Sparkles className={`w-3.5 h-3.5 ${activeTopView === 'CUSTOMER_PORTAL' ? 'text-white' : 'text-fuchsia-600'}`} />
                          <span>Customer Page</span>
                        </button>
                      );
                    } else if (btnKey === 'QUICK_LINKS') {
                      buttonElement = (
                        <button
                          id="nav-quick-links"
                          onClick={() => setIsQuickLinksOpen(true)}
                          className="min-h-[34px] px-3 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-xs active:scale-95"
                          title="Drag left/right to rearrange • Quick Links & Jobber Shortcuts"
                        >
                          <Zap className="w-3.5 h-3.5 fill-white" />
                          <span>Quick Links</span>
                        </button>
                      );
                    } else if (btnKey === 'SMS_REPLIES') {
                      buttonElement = (
                        <button
                          id="nav-quick-replies"
                          onClick={() => setIsQuickRepliesOpen(true)}
                          className="min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer bg-pink-50 hover:bg-pink-100 text-pink-800 border border-pink-200/80 shadow-2xs active:scale-95"
                          title="Drag left/right to rearrange • Client-ready SMS Quick Replies"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-pink-600" />
                          <span className="hidden sm:inline">SMS Replies</span>
                        </button>
                      );
                    } else if (btnKey === 'PRICE_LIST') {
                      buttonElement = (
                        <button
                          id="nav-price-list"
                          onClick={() => setIsServiceCatalogModalOpen(true)}
                          className="min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 shadow-2xs active:scale-95"
                          title="Drag left/right to rearrange • Service Catalog Price List"
                        >
                          <Tag className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="hidden sm:inline">Price List</span>
                        </button>
                      );
                    } else if (btnKey === 'BACKUP_ZIP') {
                      buttonElement = (
                        <button
                          id="nav-project-backup"
                          onClick={() => setIsProjectBackupModalOpen(true)}
                          className="min-h-[34px] px-3 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs active:scale-95"
                          title="Drag left/right to rearrange • Download Complete Project ZIP, Backup to Google Drive & GitHub Sync"
                        >
                          <FileArchive className="w-3.5 h-3.5 text-white shrink-0" />
                          <span>Backup ZIP &amp; Drive</span>
                        </button>
                      );
                    }

                    if (!buttonElement) return null;

                    return (
                      <div
                        key={btnKey}
                        draggable
                        onDragStart={() => handleBarDragStart('header', btnKey)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleBarDrop('header', btnKey)}
                        className={`flex items-center gap-0.5 rounded-lg transition-all ${
                          isRearrangingBars ? 'ring-1 ring-amber-400 bg-amber-50/70 p-0.5' : ''
                        } ${draggedBarItem?.bar === 'header' && draggedBarItem?.id === btnKey ? 'opacity-40 scale-95' : ''}`}
                      >
                        {isRearrangingBars && (
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              moveBarButton('header', btnKey, 'left');
                            }}
                            className="px-1 py-1 rounded bg-slate-900 text-amber-300 hover:bg-slate-700 disabled:opacity-25 text-[10px] font-black cursor-pointer"
                            title="Move Button Left"
                          >
                            ◀
                          </button>
                        )}
                        {buttonElement}
                        {isRearrangingBars && (
                          <button
                            type="button"
                            disabled={idx === headerNavOrder.length - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              moveBarButton('header', btnKey, 'right');
                            }}
                            className="px-1 py-1 rounded bg-slate-900 text-amber-300 hover:bg-slate-700 disabled:opacity-25 text-[10px] font-black cursor-pointer"
                            title="Move Button Right"
                          >
                            ▶
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {/* Rearrange Header / Footer Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setIsRearrangingBars((prev) => !prev)}
                    className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1 transition-all cursor-pointer border ${
                      isRearrangingBars
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm ring-2 ring-amber-400/40'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                    title="Move / Rearrange Header & Footer Buttons Left or Right"
                  >
                    <span>⇄</span>
                    <span className="hidden xl:inline">{isRearrangingBars ? 'Done Moving' : 'Move Buttons'}</span>
                  </button>
                </>
              )}
            </div>

            {/* Right Header Actions & Controls */}
            <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 flex-shrink-0">
              <div className="hidden 2xl:block text-right border-r border-slate-200 pr-2.5 whitespace-nowrap">
                <p className="text-[9px] font-medium text-slate-500 uppercase tracking-tighter">{currentDate}</p>
                <p className="text-xs font-bold text-slate-800 font-mono leading-tight">{currentTime}</p>
              </div>

              {/* Toggle Dispatch Board - Only for Dispatcher and Owner */}
              {currentUser.role !== 'CLEANER' && (
                <button
                  id="topbar-toggle-board-btn"
                  onClick={() => {
                    if (viewportMode.isMobileLandscape) {
                      setIsLandscapeDrawerOpen((prev) => !prev);
                    } else if (viewportMode.isMobilePortrait) {
                      setMobileSheetState((s) => (s === 'collapsed' ? 'half' : 'collapsed'));
                    } else {
                      setIsBoardCollapsed((c) => !c);
                    }
                  }}
                  className={`min-h-[34px] sm:min-h-[36px] landscape:max-md:min-h-[32px] px-2 sm:px-2.5 md:px-3 py-1 sm:py-1.5 landscape:max-md:py-1 rounded-xl border text-xs font-semibold flex items-center gap-1 sm:gap-1.5 shadow-2xs transition-colors cursor-pointer flex-shrink-0 ${
                    (viewportMode.isMobileLandscape && !isLandscapeDrawerOpen) ||
                    (viewportMode.isMobilePortrait && mobileSheetState === 'collapsed') ||
                    (!viewportMode.isMobileLandscape && !viewportMode.isMobilePortrait && isBoardCollapsed)
                      ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                  title="Toggle Dispatch Board"
                  aria-label="Toggle Dispatch Board"
                >
                  {(viewportMode.isMobileLandscape && !isLandscapeDrawerOpen) ||
                  (viewportMode.isMobilePortrait && mobileSheetState === 'collapsed') ||
                  (!viewportMode.isMobileLandscape && !viewportMode.isMobilePortrait && isBoardCollapsed) ? (
                    <>
                      <PanelRightOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 shrink-0" />
                      <span className="hidden md:inline landscape:max-md:hidden">Show Board</span>
                      {unassignedCount > 0 && (
                        <span className="min-w-[18px] h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center font-mono leading-none">
                          {unassignedCount}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <PanelRightClose className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600 shrink-0" />
                      <span className="hidden md:inline landscape:max-md:hidden">Hide Board</span>
                    </>
                  )}
                </button>
              )}

              {/* Full Screen Zen Map Focus Button (Only on large screens for Dispatcher and Owner) */}
              {currentUser.role !== 'CLEANER' && (
                <button
                  id="topbar-zen-mode-btn"
                  onClick={() => setIsZenMode(true)}
                  className="hidden xl:flex min-h-[34px] sm:min-h-[36px] px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold items-center gap-1 shadow-2xs transition-colors cursor-pointer flex-shrink-0"
                  title="Full Screen Map Mode (hides all chrome and panels)"
                  aria-label="Full screen map mode"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
                  <span>Full Map</span>
                </button>
              )}

              {/* Team Real-Time Chat Trigger */}
              <button
                id="topbar-chat-btn"
                onClick={() => setIsChatOpen((c) => !c)}
                className={`min-h-[34px] sm:min-h-[36px] landscape:max-md:min-h-[32px] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs whitespace-nowrap cursor-pointer flex-shrink-0 ${
                  isChatOpen
                    ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white border-transparent'
                    : 'bg-pink-50 hover:bg-pink-100 text-pink-900 border-pink-200'
                }`}
                title="Internal Team Messaging: Chat with cleaners, dispatchers and owner"
                aria-label="Open Team Chat"
              >
                <MessageSquare className={`w-3.5 h-3.5 ${isChatOpen ? 'text-white' : 'text-pink-600'}`} />
                <span className="hidden sm:inline">Team Chat</span>
                <span className="sm:hidden">Chat</span>
              </button>

              {/* Active User Login / Role Switcher */}
              <button
                id="topbar-role-switcher-btn"
                onClick={() => setIsRoleModalOpen(true)}
                className="min-h-[34px] sm:min-h-[36px] landscape:max-md:min-h-[32px] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs whitespace-nowrap cursor-pointer flex-shrink-0"
                title={`Active Login: ${currentUser.name} (${currentUser.role}). Click to switch role/account.`}
                aria-label="Switch User or Role"
              >
                <span className={`w-2 h-2 rounded-full ${
                  currentUser.role === 'OWNER' ? 'bg-purple-600' : currentUser.role === 'DISPATCHER' ? 'bg-pink-600' : 'bg-emerald-600'
                }`} />
                <span className="hidden md:inline font-extrabold">{currentUser.name}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white text-slate-700 uppercase">
                  {currentUser.role}
                </span>
              </button>

              {/* Quo 5-Line Phone System Button */}
              {permissions.canAccessQuoPhoneConfig && (
                <button
                  id="topbar-quo-btn"
                  onClick={() => setIsQuoModalOpen(true)}
                  className="min-h-[34px] sm:min-h-[36px] landscape:max-md:min-h-[32px] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-800 border border-violet-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs whitespace-nowrap cursor-pointer flex-shrink-0"
                  title="Quo (OpenPhone) 5-Line System: Call tracking and Sona voice transcription"
                  aria-label="Open Quo Phone Integration"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-violet-600 shrink-0" aria-hidden="true" />
                  <span className="hidden sm:inline">Quo (5 Lines)</span>
                  <span className="sm:hidden">Quo</span>
                </button>
              )}

              {/* Twilio Spam Shield & Call Blocker Button */}
              {permissions.canAccessQuoPhoneConfig && (
                <button
                  id="topbar-spam-shield-btn"
                  onClick={() => handleOpenSpamShield()}
                  className="min-h-[34px] sm:min-h-[36px] landscape:max-md:min-h-[32px] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs whitespace-nowrap cursor-pointer flex-shrink-0"
                  title="Twilio Spam Shield: Block country codes, rotating numbers & robocalls"
                  aria-label="Open Twilio Spam Shield"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" aria-hidden="true" />
                  <span className="hidden sm:inline">Spam Shield</span>
                  <span className="sm:hidden">Shield</span>
                </button>
              )}

              {/* PWA Mobile & Web App Installation Button */}
              <PWAInstallButton />

              {/* Book Online (Option A Intake for bookmycleaning.net) */}
              <button
                id="topbar-public-book-btn"
                onClick={() => setIsPublicBookingModalOpen(true)}
                className="min-h-[34px] sm:min-h-[36px] landscape:max-md:min-h-[32px] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs whitespace-nowrap cursor-pointer flex-shrink-0"
                title="Public Customer Booking Form for bookmycleaning.net"
                aria-label="Open Public Booking Form"
              >
                <Globe className="w-3.5 h-3.5 text-teal-600 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">Book Online</span>
                <span className="sm:hidden">Book</span>
              </button>

              {/* Jobber Integration Hub Button - Only Owner and Dispatcher */}
              {permissions.canAccessJobberConfig && (
                <button
                  id="topbar-jobber-btn"
                  onClick={() => setIsJobberModalOpen(true)}
                  className="min-h-[34px] sm:min-h-[36px] landscape:max-md:min-h-[32px] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs whitespace-nowrap cursor-pointer flex-shrink-0"
                  title="Jobber Integration: Sync clients, invoices, quotes & visits"
                  aria-label="Open Jobber Integration Hub"
                >
                  <Database className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
                  <span className="hidden sm:inline">Jobber Sync</span>
                  <span className="sm:hidden">Jobber</span>
                </button>
              )}

              {/* Create Service Ticket Button - Accessible to Owner and Dispatcher */}
              {permissions.canAssignTickets && (
                <button
                  id="topbar-new-ticket-btn"
                  onClick={() => setIsNewTicketModalOpen(true)}
                  className="min-h-[34px] sm:min-h-[36px] landscape:max-md:min-h-[32px] px-2 sm:px-2.5 md:px-3 py-1 sm:py-1.5 landscape:max-md:py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1 sm:gap-1.5 transition-colors shadow-xs whitespace-nowrap cursor-pointer flex-shrink-0"
                  aria-label="Create New Service Ticket with Voice or Text"
                  title="Create New Service Ticket (Microphone Voice-to-Text Supported)"
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400 shrink-0" aria-hidden="true" />
                  <span>Ticket</span>
                </button>
              )}

              {/* AI Dispatch Assistant Button - Only Owner and Dispatcher */}
              {permissions.canAssignTickets && (
                <button
                  id="topbar-ai-dispatcher-btn"
                  onClick={() => setIsAiModalOpen(true)}
                  className="min-h-[34px] sm:min-h-[36px] landscape:max-md:min-h-[32px] px-2.5 sm:px-3 py-1 sm:py-1.5 landscape:max-md:py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs active:scale-95 transition-all whitespace-nowrap cursor-pointer flex-shrink-0"
                  aria-label="Open AI Dispatch Assistant"
                  title="Open AI Dispatch Assistant"
                >
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-200 shrink-0" aria-hidden="true" />
                  <span className="font-semibold">AI Dispatch</span>
                </button>
              )}

              {/* Staff Sign Out & Lock Console Button */}
              <button
                onClick={handleLogout}
                className="min-h-[34px] sm:min-h-[36px] landscape:max-md:min-h-[32px] px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-300 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs whitespace-nowrap cursor-pointer flex-shrink-0"
                title="Sign out of staff console and return to Customer Portal"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-600" />
                <span className="hidden xl:inline">Sign Out</span>
              </button>
            </div>
          </header>
        )}

        {/* Unauthenticated public visitors are restricted to the Customer Booking Portal, Support/Legal, or Spam Shield */}
        {!isStaffAuthenticated && activeTopView !== 'LEGAL' && activeTopView !== 'SPAM_SHIELD' ? (
          <CustomerPortalView
            projectId={activeBrandId}
            onBookingSubmitted={(ticket) => {
              setTickets((prev) => [ticket, ...prev]);
              saveStateToStore([ticket, ...tickets]);
            }}
            onNavigateToMap={() => setIsRoleModalOpen(true)}
            onOpenPhoneModal={() => setIsQuoModalOpen(true)}
            onOpenStaffLogin={() => setIsRoleModalOpen(true)}
            onOpenSpamShield={handleOpenSpamShield}
            onOpenVoiceIntake={() => {
              setIsStaffAuthenticated(true);
              setActiveTopView('QUICK_QUOTE');
            }}
          />
        ) : activeTopView === 'CUSTOMER_PORTAL' ? (
          <CustomerPortalView
            projectId={activeBrandId}
            onBookingSubmitted={(ticket) => {
              setTickets((prev) => [ticket, ...prev]);
              saveStateToStore([ticket, ...tickets]);
            }}
            onNavigateToMap={() => {
              if (isStaffAuthenticated) {
                setActiveTopView('MAP');
              } else {
                setIsRoleModalOpen(true);
              }
            }}
            onOpenPhoneModal={() => setIsQuoModalOpen(true)}
            onOpenStaffLogin={() => setIsRoleModalOpen(true)}
            onOpenSpamShield={handleOpenSpamShield}
            onOpenVoiceIntake={() => setActiveTopView('QUICK_QUOTE')}
          />
        ) : activeTopView === 'ADDRESS_SEARCH' ? (
          <QuickMapScheduleRadarView
            mode="FULL_PAGE"
            technicians={technicians}
            scheduledJobs={scheduledJobsList}
            leads={leadsList}
            quotes={quotesList}
            onBookCleaner={handleBookFromRadar}
            onNavigateToMasterHub={() => {
              setMasterHubFocusBlock('ALL');
              setActiveTopView('MASTER_HUB');
            }}
            onNavigateToFullDispatchMap={() => setActiveTopView('MAP')}
            onNavigateToSchedule={() => {
              setActiveTopView('SCHEDULED_JOBS');
              setScheduledJobsSubTab('CALENDAR');
            }}
          />
        ) : activeTopView === 'SCHEDULED_JOBS' ? (
          <ScheduledJobsView
            jobs={scheduledJobsList}
            technicians={technicians}
            unscheduledJobs={unscheduledJobsList}
            quotes={quotesList}
            invoices={invoicesList}
            initialTab={scheduledJobsSubTab}
            onNavigateToQuotes={() => setActiveTopView('QUOTES')}
            onNavigateToInvoices={() => setActiveTopView('INVOICES')}
            onUpdateJobAssignment={(jobId, assignedCleaners) => {
              setScheduledJobsList((prev) =>
                prev.map((job) =>
                  job.id === jobId ? { ...job, assignedCleaners } : job
                )
              );
            }}
            onApproveUnscheduledJob={(jobId) => {
              setUnscheduledJobsList((prev) =>
                prev.map((j) => (j.id === jobId ? { ...j, status: 'APPROVED' } : j))
              );
            }}
            onScheduleUnscheduledJob={(params) => {
              setUnscheduledJobsList((prev) =>
                prev.map((j) => (j.id === params.jobId ? { ...j, status: 'SCHEDULED' } : j))
              );
              // Trigger reload from store
              fetch('/api/store')
                .then((r) => r.json())
                .then((data) => {
                  if (data?.scheduledVisits) setScheduledJobsList(mergeWithBaseScheduledVisits(data.scheduledVisits));
                  if (data?.unscheduledJobs) setUnscheduledJobsList(data.unscheduledJobs);
                });
            }}
            onRefreshJobs={() => {
              fetch('/api/jobber/sync-calendar', { method: 'POST' })
                .then((r) => r.json())
                .then((data) => {
                  if (data?.visits && data.visits.length > 0) {
                    setScheduledJobsList(mergeWithBaseScheduledVisits(data.visits));
                  }
                })
                .catch(() => {
                  fetch('/api/store')
                    .then((r) => r.json())
                    .then((data) => {
                      if (data?.scheduledVisits && data.scheduledVisits.length > 0) {
                        setScheduledJobsList(mergeWithBaseScheduledVisits(data.scheduledVisits));
                      }
                      if (data?.unscheduledJobs && data.unscheduledJobs.length > 0) {
                        setUnscheduledJobsList(data.unscheduledJobs);
                      }
                    });
                });
            }}
            onSelectJobOnMap={handleSelectJobOnMap}
            onInspectDateOnMap={(dateIso) => {
              setMapInspectDate(dateIso);
              setActiveTopView('MAP');
            }}
            onUpdateJobDetails={handleUpdateJobDetails}
            onUpdateJobStatus={(jobId, status) => {
              handleToggleScheduledJobStatus(jobId, status === 'COMPLETED' ? 'COMPLETED' : 'SCHEDULED');
            }}
          />
        ) : activeTopView === 'CLIENTS' ? (
          <ClientsDatabaseView
            clients={clientsList}
            calls={quoCallsList}
            visits={scheduledJobsList}
            quotes={quotesList}
            onQuotesUpdated={(updated) => setQuotesList(dedupeQuotesList(updated))}
            projectId={activeProjectId}
            onUpdateClient={handleUpdateClient}
            onAddClient={handleAddClient}
            onDeleteClient={handleDeleteClient}
            onOpenQuoModal={() => setIsQuoModalOpen(true)}
            onSelectClientOnMap={(_client) => {
              setActiveTopView('MAP');
            }}
            onScheduleClient={(_client) => {
              setActiveTopView('SCHEDULED_JOBS');
              setScheduledJobsSubTab('CALENDAR');
            }}
          />
        ) : activeTopView === 'MASTER_HUB' ? (
          <MasterLeadsAndQuotesHubView
            leads={leadsList}
            quotes={quotesList}
            invoices={invoicesList}
            scheduledJobs={scheduledJobsList}
            unscheduledJobs={unscheduledJobsList}
            clients={clientsList}
            calls={quoCallsList}
            spamShieldConfig={spamShieldConfig}
            blockedCallsHistory={blockedCallsHistory}
            onToggleBlockScreenedCall={handleToggleBlockScreenedCall}
            technicians={technicians}
            tickets={tickets}
            projectId={activeProjectId}
            focusBlock={masterHubFocusBlock}
            onFocusBlockChange={(block) => setMasterHubFocusBlock(block)}
            onSyncEverything={() => handleSyncEverything(false)}
            isSyncingEverything={isSyncingEverything}
            lastSyncedAllAt={lastSyncedAllAt}
            syncAllStatusMessage={syncAllStatusMessage}
            onLeadsUpdated={(updated) => setLeadsList(updated)}
            onQuotesUpdated={(updated) => setQuotesList(dedupeQuotesList(updated))}
            onClientsUpdated={(updated) => setClientsList(updated)}
            onConvertLeadToJob={handleConvertLeadToJob}
            onOpenQuickQuote={(lead) => {
              setSelectedLeadForQuickQuote(lead || null);
              setIsQuickQuoteModalOpen(true);
            }}
            onOpenQuoteDetail={(quote) => setActiveQuoteDetailModalItem(quote)}
            onOpenSpamShield={handleOpenSpamShield}
            onNavigateToFullMap={() => setActiveTopView('MAP')}
            onNavigateToFullSchedule={() => {
              setActiveTopView('SCHEDULED_JOBS');
              setScheduledJobsSubTab('CALENDAR');
            }}
            onNavigateToAddressRadar={() => setActiveTopView('ADDRESS_SEARCH')}
            onNavigateToFullLeadsSheet={() => setActiveTopView('LEADS')}
            onNavigateToQuotes={() => setActiveTopView('QUOTES')}
            onNavigateToInvoices={() => setActiveTopView('INVOICES')}
            onSelectJobOnMap={handleSelectJobOnMap}
            onToggleScheduledJobStatus={handleToggleScheduledJobStatus}
          />
        ) : activeTopView === 'MANAGEMENT' ? (
          <ManagementHubView
            onNavigateToVoiceIntake={() => setActiveTopView('QUICK_QUOTE')}
            onNavigateToIntakes={() => setActiveTopView('INTAKES')}
            onNavigateToQuotes={() => setActiveTopView('QUOTES')}
            onNavigateToInvoices={() => setActiveTopView('INVOICES')}
            onOpenStaffRoster={() => setIsStaffModalOpen(true)}
            onOpenJobberSync={() => setIsJobberModalOpen(true)}
            onOpenQuoModal={() => setIsQuoModalOpen(true)}
            onOpenSpamShield={handleOpenSpamShield}
            onNavigateToSpamShield={() => setActiveTopView('SPAM_SHIELD')}
            onNavigateToLegal={(tab) => {
              setActiveLegalTab(tab);
              setActiveTopView('LEGAL');
            }}
            onNavigateToCustomerPortal={() => setActiveTopView('CUSTOMER_PORTAL')}
            onOpenPriceList={() => setIsServiceCatalogModalOpen(true)}
            onNavigateToMasterHub={() => {
              setMasterHubFocusBlock('ALL');
              setActiveTopView('MASTER_HUB');
            }}
            onSyncEverything={() => handleSyncEverything(false)}
            isSyncingEverything={isSyncingEverything}
            onSwitchBrand={handleSwitchProject}
            catalogCount={serviceCatalog?.length || 28}
            intakesCount={tickets.length + quotesList.length}
            quotesCount={quotesList.length}
            invoicesCount={invoicesList.length}
            staffCount={staffList.length}
            cleanersCount={technicians.length}
            technicians={technicians}
            onEditVanHub={(tech) => {
              setEditingVanHubTech(tech);
              setIsVanHubModalOpen(true);
            }}
            onSyncFirestore={handleSyncFirestore}
            isSyncingFirestore={isSyncingFirestore}
            onOpenProjectBackup={() => setIsProjectBackupModalOpen(true)}
          />
        ) : activeTopView === 'INTAKES' ? (
          <IntakesView
            tickets={tickets}
            quotes={quotesList}
            leads={leadsList}
            onOpenVoiceIntake={(prefill) => {
              if (prefill) {
                setSelectedLeadForQuickQuote(prefill as AdLeadItem);
              }
              setActiveTopView('QUICK_QUOTE');
            }}
            onSelectOnMap={() => setActiveTopView('MAP')}
            onNavigateToSchedule={() => {
              setActiveTopView('SCHEDULED_JOBS');
              setScheduledJobsSubTab('CALENDAR');
            }}
            onBackToManagement={() => setActiveTopView('MANAGEMENT')}
            onBookingSubmitted={(ticket) => {
              setTickets((prev) => [ticket, ...prev]);
              saveStateToStore([ticket, ...tickets]);
            }}
            onOpenSpamShield={handleOpenSpamShield}
          />
        ) : activeTopView === 'QUOTES' ? (
          <QuotesView
            quotes={quotesList}
            calls={quoCallsList}
            visits={scheduledJobsList}
            clients={clientsList}
            projectId={activeProjectId}
            serviceCatalog={serviceCatalog}
            onCatalogUpdated={(newCat) => setServiceCatalog(newCat)}
            onQuotesUpdated={(updated) => setQuotesList(dedupeQuotesList(updated))}
            onVisitCreated={(newVisit) => {
              setScheduledJobsList((prev) => [newVisit, ...prev]);
            }}
            onRefreshQuotes={() => {
              fetch(`/api/jobber/sync-quotes?project=${activeProjectId}`, {
                method: 'POST',
                headers: { 'x-project-id': activeProjectId },
              })
                .then((r) => r.json())
                .then((data) => {
                  if (data.quotes) setQuotesList(dedupeQuotesList(data.quotes));
                });
            }}
            onBackToManagement={() => setActiveTopView('MANAGEMENT')}
          />
        ) : activeTopView === 'INVOICES' ? (
          <InvoicesView
            invoices={invoicesList}
            onInvoicesUpdated={(updated) => setInvoicesList(updated)}
            onRefreshInvoices={() => {
              fetch(`/api/jobber/sync-invoices?project=${activeProjectId}`, {
                method: 'POST',
                headers: { 'x-project-id': activeProjectId },
              })
                .then((r) => r.json())
                .then((data) => {
                  if (data.invoices) setInvoicesList(data.invoices);
                });
            }}
            onBackToManagement={() => setActiveTopView('MANAGEMENT')}
          />
        ) : activeTopView === 'LEGAL' ? (
          <LegalPagesView
            initialTab={activeLegalTab}
            onBackToDispatch={() => setActiveTopView('MAP')}
          />
        ) : activeTopView === 'LEADS' ? (
          <LeadsView
            leads={leadsList}
            onLeadsUpdated={(updated) => setLeadsList(updated)}
            onConvertLeadToJob={handleConvertLeadToJob}
            onOpenQuickQuote={(lead) => {
              setSelectedLeadForQuickQuote(lead || null);
              setIsQuickQuoteModalOpen(true);
            }}
            onOpenSpamShield={handleOpenSpamShield}
            calls={quoCallsList}
            spamShieldConfig={spamShieldConfig}
            onToggleBlockScreenedCall={handleToggleBlockScreenedCall}
            visits={scheduledJobsList}
            clients={clientsList}
            quotes={quotesList}
            onQuotesUpdated={(updated) => setQuotesList(dedupeQuotesList(updated))}
            onClientsUpdated={(updated) => setClientsList(updated)}
            onOpenJobberModal={() => setIsJobberModalOpen(true)}
            projectId={activeProjectId}
          />
        ) : activeTopView === 'QUICK_QUOTE' ? (
          <QuickQuoteView
            initialLead={selectedLeadForQuickQuote}
            technicians={technicians}
            onVisitCreated={(newVisit) => {
              setScheduledJobsList((prev) => [newVisit, ...prev]);
            }}
            onQuoteCreated={(newQuote) => {
              setQuotesList((prev) => {
                const newDay = String(newQuote.createdAt || '').slice(0, 10);
                const newClient = String(newQuote.clientName || '').trim().toLowerCase();
                const filtered = prev.filter((q) => {
                  if (q.id === newQuote.id || (q.quoteNumber && q.quoteNumber === newQuote.quoteNumber)) return false;
                  if (
                    newClient &&
                    String(q.clientName || '').trim().toLowerCase() === newClient &&
                    String(q.createdAt || '').slice(0, 10) === newDay
                  ) {
                    return false;
                  }
                  return true;
                });
                return dedupeQuotesList([newQuote, ...filtered]);
              });
            }}
            onBookingSubmitted={(ticket) => {
              setTickets((prev) => [ticket, ...prev]);
              saveStateToStore([ticket, ...tickets]);
            }}
            onNavigateToMap={() => setActiveTopView('MAP')}
            onNavigateToSchedule={() => {
              setActiveTopView('SCHEDULED_JOBS');
              setScheduledJobsSubTab('CALENDAR');
            }}
            onNavigateToIntakes={() => setActiveTopView('INTAKES')}
            calls={quoCallsList}
            visits={scheduledJobsList}
            clients={clientsList}
            quotes={quotesList}
            projectId={activeProjectId}
            serviceCatalog={serviceCatalog}
            onCatalogUpdated={(newCat) => setServiceCatalog(newCat)}
            onOpenSpamShield={handleOpenSpamShield}
            onOpenProjectBackup={() => setIsProjectBackupModalOpen(true)}
            onClientsUpdated={(updated) => setClientsList(updated)}
            onLeadsUpdated={(updated) => setLeadsList(updated)}
          />
        ) : activeTopView === 'SPAM_SHIELD' ? (
          <SpamShieldView
            projectId={activeProjectId}
            preFillNumber={spamShieldNumber}
            onNavigateToVoiceIntake={() => setActiveTopView('QUICK_QUOTE')}
            onNavigateToMap={() => setActiveTopView('MAP')}
            onNavigateToManagement={() => setActiveTopView('MANAGEMENT')}
          />
        ) : currentUser.role === 'CLEANER' && !cleanerShowMap ? (
          <CleanerPortalView
            currentUser={currentUser}
            tickets={tickets}
            technicians={technicians}
            onUpdateTicketStatus={handleUpdateTicketStatus}
            onUpdateTechStatus={handleUpdateTechStatus}
            onOpenChatWith={(targetUser) => {
              setChatRecipient(targetUser);
              setIsChatOpen(true);
            }}
            onViewMap={() => setCleanerShowMap(true)}
          />
        ) : (
          /* Main Dashboard: Dedicated Full-Bleed Map Backdrop with Collapsible Layered Panes */
          <main id="main-split-dashboard" className="flex-1 relative overflow-hidden bg-slate-50 flex flex-col md:flex-row">
          {/* Territory Map Panel - ALWAYS mounted and visible across ALL devices */}
          <section
            id="panel-map-view"
            role="region"
            aria-label="Interactive Territory Map"
            className="flex-1 h-full w-full relative overflow-hidden bg-slate-100 z-0"
          >
            {currentUser.role === 'CLEANER' && cleanerShowMap && (
              <div className="absolute top-3 left-3 z-30 pointer-events-auto">
                <button
                  onClick={() => setCleanerShowMap(false)}
                  className="px-3.5 py-2 rounded-xl bg-slate-900/95 hover:bg-slate-900 text-white text-xs font-black flex items-center gap-1.5 shadow-lg border border-slate-700 cursor-pointer"
                >
                  <span>← Back to My Daily Stops Checklist</span>
                </button>
              </div>
            )}
            <TerritoryMap
              technicians={technicians}
              tickets={tickets}
              scheduledJobs={scheduledJobsList}
              selectedScheduledJobId={selectedScheduledJobId}
              onSelectScheduledJob={setSelectedScheduledJobId}
              onToggleJobStatus={handleToggleScheduledJobStatus}
              initialInspectDate={mapInspectDate}
              onNavigateToCalendar={() => {
                setActiveTopView('SCHEDULED_JOBS');
                setScheduledJobsSubTab('CALENDAR');
              }}
              onUpdateTechnician={handleUpdateTechnician}
              selectedTechId={selectedTechId}
              onSelectTech={setSelectedTechId}
              selectedTicketId={selectedTicketId}
              onSelectTicket={setSelectedTicketId}
              urgencyFilter={urgencyFilter}
              onUrgencyFilterChange={setUrgencyFilter}
              onAssignTicketToTech={handleAssignTicket}
              onMessageTech={handleMessageTech}
              isMapsAuthError={mapsAuthError}
              refererErrorUrl={refererErrorUrl}
            />
          </section>

          {/* Floating Trigger for Mobile Landscape Side Drawer */}
          {viewportMode.isMobileLandscape && !isLandscapeDrawerOpen && (
            <div className="absolute top-3 right-3 z-30 pointer-events-auto">
              <button
                onClick={() => setIsLandscapeDrawerOpen(true)}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-900 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1.5 shadow-lg border border-slate-700 cursor-pointer active:scale-95"
                aria-label="Open Dispatch Board Drawer"
              >
                <Truck className="w-3.5 h-3.5 text-blue-400" />
                <span>Board ({unassignedCount})</span>
              </button>
            </div>
          )}

          {/* Tablet Backdrop Overlay when Drawer is Open (Tablet Portrait) */}
          {viewportMode.isTablet && !isBoardCollapsed && (
            <div
              onClick={() => setIsBoardCollapsed(true)}
              className="absolute inset-0 bg-slate-900/30 backdrop-blur-xs z-20 cursor-pointer transition-opacity"
              aria-label="Close dispatch board drawer"
            />
          )}

          {/* Mobile Landscape Backdrop Overlay when Drawer is Open */}
          {viewportMode.isMobileLandscape && isLandscapeDrawerOpen && (
            <div
              id="mobile-landscape-backdrop"
              onClick={() => setIsLandscapeDrawerOpen(false)}
              className="fixed inset-0 top-11 bg-slate-950/40 backdrop-blur-xs z-35 cursor-pointer animate-fadeIn"
              aria-label="Close dispatch board drawer"
            />
          )}

          {/* Mobile Portrait Backdrop Overlay when Bottom Sheet is expanded (half or full) */}
          {viewportMode.isMobilePortrait && mobileSheetState !== 'collapsed' && (
            <div
              id="mobile-sheet-backdrop"
              onClick={() => setMobileSheetState('collapsed')}
              className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-35 transition-opacity animate-fadeIn cursor-pointer"
              aria-label="Close dispatch board"
            />
          )}

          {/* Kanban Dispatch Queue Panel:
              - Mobile Portrait: Bottom Sheet (Peek bar, Half sheet, Full sheet)
              - Mobile Landscape: Sliding Off-Canvas Right Drawer
              - Tablet Portrait: Slide-Over Overlay Drawer (Map keeps 100% width)
              - Desktop: Collapsible Side Panel (Zero empty space when collapsed)
          */}
          <section
            id="panel-board-view"
            role="region"
            aria-label="Fleet Dispatch Board"
            className={`
              ${
                viewportMode.isMobileLandscape
                  ? `fixed top-11 right-0 bottom-0 z-40 w-[330px] sm:w-[360px] h-[calc(100%-44px)] bg-white shadow-2xl border-l border-slate-200 flex flex-col transition-transform duration-300 ease-in-out ${
                      isLandscapeDrawerOpen ? 'translate-x-0 pointer-events-auto' : 'translate-x-full pointer-events-none'
                    }`
                  : viewportMode.isMobilePortrait
                  ? `fixed inset-x-0 bottom-0 z-40 bg-white rounded-t-2xl shadow-2xl flex flex-col transition-transform duration-300 ease-in-out pointer-events-auto h-[86vh] ${
                      mobileSheetState === 'collapsed'
                        ? 'translate-y-[calc(100%-56px)]'
                        : mobileSheetState === 'half'
                        ? 'translate-y-[45%]'
                        : 'translate-y-0'
                    }`
                  : viewportMode.isTablet
                  ? `absolute top-0 right-0 bottom-0 z-40 w-[420px] h-full shadow-2xl bg-white border-l border-slate-200 flex flex-col transition-transform duration-300 ease-in-out ${
                      isBoardCollapsed ? 'translate-x-full pointer-events-none' : 'translate-x-0 pointer-events-auto'
                    }`
                  : `relative h-full bg-white flex flex-col transition-all duration-300 ease-in-out ${
                      isBoardCollapsed
                        ? 'w-0 min-w-0 p-0 border-none overflow-hidden opacity-0 pointer-events-none'
                        : 'w-[440px] xl:w-[500px] 2xl:w-[580px] border-l border-slate-200 opacity-100 pointer-events-auto flex-shrink-0'
                    }`
              }
            `}
          >
            {/* Mobile Portrait Touch Drag Handle & Peek Bar (Only in Mobile Portrait) */}
            {viewportMode.isMobilePortrait && (
              <div
                id="mobile-dispatch-peek-bar"
                onTouchStart={handleSheetTouchStart}
                onTouchEnd={handleSheetTouchEnd}
                onClick={handlePrimarySheetToggle}
                className="flex flex-col items-center justify-center h-[56px] min-h-[56px] px-3.5 cursor-pointer bg-white border-b border-slate-200 select-none shrink-0 active:bg-slate-50 transition-colors"
                role="button"
                aria-expanded={mobileSheetState !== 'collapsed'}
                aria-label="Toggle Dispatch Board Drawer"
              >
                {/* Top Drag Indicator */}
                <div className="w-12 h-1 bg-slate-300 rounded-full mb-1.5" />
                
                <div className="flex items-center justify-between w-full text-xs font-bold text-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                      <Truck className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-slate-900">Dispatch Board</span>
                    {unassignedCount > 0 ? (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-red-600 text-white font-bold">
                        {unassignedCount} Queue
                      </span>
                    ) : (
                      <span className="text-slate-500 font-normal text-[11px]">(15 Techs)</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Secondary Full/Half Toggle Button (only when open) */}
                    {mobileSheetState !== 'collapsed' && (
                      <button
                        type="button"
                        onClick={handleToggleFullScreen}
                        className="min-h-[34px] px-2 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                        title={mobileSheetState === 'full' ? 'Restore to half view' : 'Maximize to full view'}
                        aria-label={mobileSheetState === 'full' ? 'Restore to half view' : 'Maximize to full view'}
                      >
                        {mobileSheetState === 'full' ? (
                          <>
                            <Minimize2 className="w-3.5 h-3.5 text-slate-600" />
                            <span className="text-[11px]">Half</span>
                          </>
                        ) : (
                          <>
                            <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
                            <span className="text-[11px]">Full</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Primary Action Button: Swipe Up when collapsed, Collapse when open */}
                    <button
                      type="button"
                      id="mobile-swipe-up-btn"
                      onClick={handlePrimarySheetToggle}
                      className="min-h-[34px] px-3 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                      aria-expanded={mobileSheetState !== 'collapsed'}
                      aria-controls="panel-board-view"
                      title={mobileSheetState === 'collapsed' ? 'Open dispatch board' : 'Collapse dispatch board'}
                    >
                      <span>{mobileSheetState === 'collapsed' ? 'Swipe Up' : 'Collapse'}</span>
                      <span className="text-blue-600 font-bold">{mobileSheetState === 'collapsed' ? '▴' : '▾'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Kanban Content */}
            <div className="flex-1 overflow-hidden">
              <DispatchKanban
                technicians={technicians}
                tickets={tickets}
                selectedTechId={selectedTechId}
                onSelectTech={setSelectedTechId}
                selectedTicketId={selectedTicketId}
                onSelectTicket={setSelectedTicketId}
                onAssignTicket={handleAssignTicket}
                onUnassignTicket={handleUnassignTicket}
                onReorderTechTickets={handleReorderTechTickets}
                onOpenAiAssistant={() => setIsAiModalOpen(true)}
                onOpenManifest={(tech) => setManifestTech(tech)}
                onOpenNewTicketModal={() => setIsNewTicketModalOpen(true)}
                onOpenJobberModal={() => setIsJobberModalOpen(true)}
                onMessageTech={handleMessageTech}
                activeTab={kanbanActiveTab}
                onActiveTabChange={setKanbanActiveTab}
                calls={quoCallsList}
                visits={scheduledJobsList}
                clients={clientsList}
                onClose={() => {
                  setIsBoardCollapsed(true);
                  setIsLandscapeDrawerOpen(false);
                  setMobileSheetState('collapsed');
                }}
              />
            </div>
          </section>
        </main>
        )}

        {/* Global Quick-Link Footer Bar (Buttons moved to Right-Hand Side by default + Management & Block Spam Caller + Rearrangeable Left-to-Right) */}
        {!isZenMode && (
          <footer
            id="global-footer"
            className={`min-h-[44px] py-1.5 bg-slate-900 text-slate-300 flex flex-wrap items-center px-3 sm:px-5 justify-between gap-2 text-xs shrink-0 font-medium z-30 border-t border-slate-700 shadow-lg ${
              footerButtonsSide === 'right' ? 'flex-row' : 'flex-row-reverse'
            }`}
          >
            {/* Status, Legal Links & Rearrange Controls (Sits on the Left when Footer Buttons are on the Right) */}
            <div className="flex flex-wrap items-center gap-2.5 text-[11px]">
              <span className="text-pink-400 font-mono font-bold">1-833-TIDYUPS</span>
              <div className="hidden sm:flex items-center gap-2 border-l border-slate-700 pl-2.5">
                <button
                  onClick={() => {
                    setActiveLegalTab('SUPPORT');
                    setActiveTopView('LEGAL');
                  }}
                  className="hover:text-white cursor-pointer"
                >
                  /support
                </button>
                <span>•</span>
                <button
                  onClick={() => {
                    setActiveLegalTab('TERMS');
                    setActiveTopView('LEGAL');
                  }}
                  className="hover:text-white cursor-pointer"
                >
                  /T&amp;C
                </button>
                <span>•</span>
                <button
                  onClick={() => {
                    setActiveLegalTab('PRIVACY');
                    setActiveTopView('LEGAL');
                  }}
                  className="hover:text-white cursor-pointer"
                >
                  /privacy-policy
                </button>
              </div>
              <div className="hidden xl:flex items-center gap-1.5 border-l border-slate-700 pl-2.5">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="uppercase tracking-widest text-slate-300 text-[10px]">TidyUps Master v4.25</span>
              </div>

              {/* Rearrange Header & Footer Buttons Control */}
              <div className="flex items-center gap-1.5 border-l border-slate-700 pl-2.5">
                <button
                  type="button"
                  onClick={() => setIsRearrangingBars((prev) => !prev)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-black flex items-center gap-1 cursor-pointer transition-all border ${
                    isRearrangingBars
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600'
                  }`}
                  title="Rearrange Header or Footer buttons from left to right (or drag any button directly)"
                >
                  <span>⇄ {isRearrangingBars ? 'Done Rearranging' : 'Rearrange Header / Footer'}</span>
                </button>

                {isRearrangingBars && (
                  <>
                    <button
                      type="button"
                      onClick={() => toggleFooterSide(footerButtonsSide === 'right' ? 'left' : 'right')}
                      className="px-2 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-extrabold cursor-pointer"
                      title="Move all footer buttons between Left Side and Right Side"
                    >
                      Footer Side: {footerButtonsSide === 'right' ? 'Right → (Switch to Left)' : '← Left (Switch to Right)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateHeaderOrder(DEFAULT_HEADER_NAV_ORDER);
                        updateFooterOrder(DEFAULT_FOOTER_BTN_ORDER);
                        toggleFooterSide('right');
                      }}
                      className="px-2 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 text-[10px] font-bold cursor-pointer"
                      title="Reset Header and Footer button positions to default"
                    >
                      Reset Order
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Right-Hand Side (by default): Rearrangeable Footer Action Buttons including Management & Block Spam Caller */}
            <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 ml-auto">
              {footerBtnOrder.map((btnKey, idx) => {
                let btnNode: React.ReactNode = null;

                if (btnKey === 'PASTE_TABLE') {
                  btnNode = (
                    <button
                      type="button"
                      onClick={() => {
                        setIsStaffAuthenticated(true);
                        setMasterHubFocusBlock('PASTE_TABLE');
                        setActiveTopView('MASTER_HUB');
                      }}
                      className={`px-3 py-1 rounded-xl font-black text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs ${
                        activeTopView === 'MASTER_HUB' && masterHubFocusBlock === 'PASTE_TABLE'
                          ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300'
                          : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                      }`}
                      title="Drag left/right to rearrange • Quicklink: Paste Quotes & Pasted Leads Table"
                    >
                      <ClipboardPaste className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Paste Table (Paste Quotes &amp; Leads)</span>
                    </button>
                  );
                } else if (btnKey === 'MASTER_TABLE') {
                  btnNode = (
                    <button
                      type="button"
                      onClick={() => {
                        setIsStaffAuthenticated(true);
                        setMasterHubFocusBlock('MASTER_TABLE');
                        setActiveTopView('MASTER_HUB');
                      }}
                      className={`px-3 py-1 rounded-xl font-black text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs ${
                        activeTopView === 'MASTER_HUB' && (masterHubFocusBlock === 'MASTER_TABLE' || masterHubFocusBlock === 'ALL')
                          ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-300'
                          : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                      }`}
                      title="Drag left/right to rearrange • Open TidyUps Master Leads & Quotes Table"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Master Leads &amp; Quotes Table</span>
                    </button>
                  );
                } else if (btnKey === 'QUICK_MAPS') {
                  btnNode = (
                    <button
                      type="button"
                      onClick={() => {
                        setIsStaffAuthenticated(true);
                        setActiveTopView('ADDRESS_SEARCH');
                      }}
                      className={`px-3 py-1 rounded-xl font-black text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs ${
                        activeTopView === 'ADDRESS_SEARCH'
                          ? 'bg-sky-500 text-slate-950 ring-2 ring-sky-300'
                          : 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40'
                      }`}
                      title="Drag left/right to rearrange • Open Dedicated Quick Map & Schedule Radar Page"
                    >
                      <MapIcon className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span>Quick Map &amp; Schedule Radar</span>
                    </button>
                  );
                } else if (btnKey === 'DISPATCH_MAP') {
                  btnNode = (
                    <button
                      type="button"
                      onClick={() => {
                        setIsStaffAuthenticated(true);
                        setActiveTopView('MAP');
                      }}
                      className={`px-2.5 py-1 rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer transition-all ${
                        activeTopView === 'MAP'
                          ? 'bg-pink-600 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      }`}
                      title="Drag left/right to rearrange • Open Full Screen Territory Dispatch Map"
                    >
                      <Navigation className="w-3 h-3 text-pink-400 shrink-0" />
                      <span>Full Dispatch Map</span>
                    </button>
                  );
                } else if (btnKey === 'SCHEDULE_SEARCH') {
                  btnNode = (
                    <button
                      type="button"
                      onClick={() => {
                        setIsStaffAuthenticated(true);
                        setMasterHubFocusBlock('SCHEDULE_SEARCH');
                        setActiveTopView('MASTER_HUB');
                      }}
                      className={`px-2.5 py-1 rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer transition-all ${
                        activeTopView === 'MASTER_HUB' && masterHubFocusBlock === 'SCHEDULE_SEARCH'
                          ? 'bg-purple-500 text-white'
                          : 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40'
                      }`}
                      title="Drag left/right to rearrange • Jump to Schedule & Search Block"
                    >
                      <Calendar className="w-3 h-3 text-purple-400 shrink-0" />
                      <span>Schedule &amp; Search</span>
                    </button>
                  );
                } else if (btnKey === 'SYNC_ALL') {
                  btnNode = (
                    <button
                      type="button"
                      onClick={() => handleSyncEverything(false)}
                      disabled={isSyncingEverything}
                      className="px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                      title="Drag left/right to rearrange • 1-Click Sync Everything"
                    >
                      <RefreshCw className={`w-3 h-3 ${isSyncingEverything ? 'animate-spin' : ''}`} />
                      <span>{isSyncingEverything ? 'Syncing...' : 'Sync All'}</span>
                    </button>
                  );
                } else if (btnKey === 'MANAGEMENT') {
                  btnNode = (
                    <button
                      type="button"
                      onClick={() => {
                        setIsStaffAuthenticated(true);
                        setActiveTopView('MANAGEMENT');
                      }}
                      className={`px-3 py-1 rounded-xl font-black text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-md ${
                        ['MANAGEMENT', 'QUOTES', 'INVOICES', 'LEGAL'].includes(activeTopView)
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white ring-2 ring-indigo-300'
                          : 'bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-400/50'
                      }`}
                      title="Drag left/right to rearrange • Open Management Hub (Intakes, Quotes, Invoices, Staff Roster & Settings)"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                      <span>Management</span>
                    </button>
                  );
                } else if (btnKey === 'BLOCK_SPAM') {
                  btnNode = (
                    <button
                      type="button"
                      onClick={() => handleOpenSpamShield()}
                      className="px-3 py-1 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs shadow-md flex items-center gap-1.5 border border-rose-300/50 cursor-pointer transition-all active:scale-95"
                      title="Drag left/right to rearrange • Instant Call Blocker: Block nuisance callers, area codes & telemarketers across all Twilio lines"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      <ShieldAlert className="w-3.5 h-3.5 text-white shrink-0" />
                      <span>Block Spam Caller</span>
                    </button>
                  );
                }

                if (!btnNode) return null;

                return (
                  <div
                    key={btnKey}
                    draggable
                    onDragStart={() => handleBarDragStart('footer', btnKey)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleBarDrop('footer', btnKey)}
                    className={`flex items-center gap-0.5 rounded-xl transition-all ${
                      isRearrangingBars ? 'ring-1 ring-amber-400 bg-slate-800 p-0.5' : ''
                    } ${draggedBarItem?.bar === 'footer' && draggedBarItem?.id === btnKey ? 'opacity-40 scale-95' : ''}`}
                  >
                    {isRearrangingBars && (
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveBarButton('footer', btnKey, 'left');
                        }}
                        className="px-1.5 py-0.5 rounded bg-slate-950 text-amber-300 hover:bg-slate-700 disabled:opacity-25 text-[10px] font-black cursor-pointer"
                        title="Move Button Left"
                      >
                        ◀
                      </button>
                    )}
                    {btnNode}
                    {isRearrangingBars && (
                      <button
                        type="button"
                        disabled={idx === footerBtnOrder.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveBarButton('footer', btnKey, 'right');
                        }}
                        className="px-1.5 py-0.5 rounded bg-slate-950 text-amber-300 hover:bg-slate-700 disabled:opacity-25 text-[10px] font-black cursor-pointer"
                        title="Move Button Right"
                      >
                        ▶
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </footer>
        )}
        </div>

        {/* AI Dispatch Assistant Modal */}
        <AiDispatchModal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          technicians={technicians}
          tickets={tickets}
          onBatchApplyRecommendations={handleBatchApplyRecommendations}
          onApplySingleRecommendation={handleApplySingleRecommendation}
        />

        {/* Exportable Daily Manifest Modal */}
        <DailyManifestModal
          isOpen={!!manifestTech}
          onClose={() => setManifestTech(null)}
          technician={manifestTech}
          tickets={tickets}
        />

        {/* Create New Cleaning Booking Modal */}
        <NewTicketModal
          isOpen={isNewTicketModalOpen}
          onClose={() => {
            setIsNewTicketModalOpen(false);
            setRadarPreFillTicket(null);
          }}
          onCreateTicket={handleCreateTicket}
          initialAddress={radarPreFillTicket?.address}
          initialCustomerName={radarPreFillTicket?.clientName}
          initialCustomerPhone={radarPreFillTicket?.clientPhone}
          initialAssignedTechId={radarPreFillTicket?.assignedTechId}
          initialServiceType={radarPreFillTicket?.serviceType}
        />

        {/* Jobber Backend Integration & Sync Hub Modal */}
        <JobberSyncModal
          isOpen={isJobberModalOpen}
          onClose={() => {
            setIsJobberModalOpen(false);
            fetch(`/api/store?project=${activeProjectId}`, { headers: { 'x-project-id': activeProjectId } })
              .then((r) => r.json())
              .then((data) => {
                if (!data) return;
                if (data.tickets && data.tickets.length > 0) setTickets(data.tickets.filter((t: any) => !isFakeSimulationItem(t)));
                if (data.scheduledVisits && data.scheduledVisits.length > 0) {
                  setScheduledJobsList(
                    mergeWithBaseScheduledVisits(data.scheduledVisits)
                      .filter((v: any) => !isFakeSimulationItem(v))
                      .map((v: any) => {
                        const coords = resolveClientSideEdmontonCoords(v.serviceAddress, v.lat, v.lng);
                        return { ...v, lat: coords.lat, lng: coords.lng };
                      })
                  );
                }
                if (data.unscheduledJobs) setUnscheduledJobsList(data.unscheduledJobs.filter((j: any) => !isFakeSimulationItem(j)));
                if (data.quotes && data.quotes.length > 0) setQuotesList(dedupeQuotesList(data.quotes));
                if (data.invoices && data.invoices.length > 0) setInvoicesList(data.invoices.filter((inv: any) => !isFakeSimulationItem(inv)));
                if (data.clients && data.clients.length > 0) setClientsList(data.clients);
              })
              .catch(() => {});
          }}
          tickets={tickets}
          onTicketsUpdated={(updated) => {
            setTickets(updated.filter((t: any) => !isFakeSimulationItem(t)));
            fetch(`/api/store?project=${activeProjectId}`, { headers: { 'x-project-id': activeProjectId } })
              .then((r) => r.json())
              .then((data) => {
                if (!data) return;
                if (data.scheduledVisits && data.scheduledVisits.length > 0) {
                  setScheduledJobsList(
                    mergeWithBaseScheduledVisits(data.scheduledVisits)
                      .filter((v: any) => !isFakeSimulationItem(v))
                      .map((v: any) => {
                        const coords = resolveClientSideEdmontonCoords(v.serviceAddress, v.lat, v.lng);
                        return { ...v, lat: coords.lat, lng: coords.lng };
                      })
                  );
                }
                if (data.unscheduledJobs) setUnscheduledJobsList(data.unscheduledJobs.filter((j: any) => !isFakeSimulationItem(j)));
                if (data.quotes && data.quotes.length > 0) setQuotesList(dedupeQuotesList(data.quotes));
                if (data.invoices && data.invoices.length > 0) setInvoicesList(data.invoices.filter((inv: any) => !isFakeSimulationItem(inv)));
                if (data.clients && data.clients.length > 0) setClientsList(data.clients);
              })
              .catch(() => {});
          }}
          projectId={activeProjectId}
        />

        {/* Public Booking Modal (Option A for bookmycleaning.net) */}
        <PublicBookingModal
          isOpen={isPublicBookingModalOpen}
          onClose={() => setIsPublicBookingModalOpen(false)}
          onBookingCreated={(newTicket) => {
            setTickets((prev) => [newTicket, ...prev]);
            setSelectedTicketId(newTicket.id);
          }}
        />

        {/* Quick Quote Phone Intake & Estimator Modal */}
        <QuickQuoteModal
          isOpen={isQuickQuoteModalOpen}
          onClose={() => {
            setIsQuickQuoteModalOpen(false);
            setSelectedLeadForQuickQuote(null);
          }}
          initialLead={selectedLeadForQuickQuote}
          onSaveBooking={(newVisit) => {
            setScheduledJobsList((prev) => [newVisit, ...prev]);
          }}
          onCreateJobberQuote={(newQuote, fullResponse) => {
            setQuotesList((prev) => dedupeQuotesList([newQuote, ...prev]));
            if (fullResponse?.client) {
              setClientsList((prev) => {
                const exists = prev.some((c) => c.id === fullResponse.client.id);
                return exists
                  ? prev.map((c) => (c.id === fullResponse.client.id ? fullResponse.client : c))
                  : [fullResponse.client, ...prev];
              });
            }
            if (fullResponse?.lead) {
              setLeadsList((prev) => prev.map((l) => (l.id === fullResponse.lead.id ? fullResponse.lead : l)));
            }
            setIsQuickQuoteModalOpen(false);
            setActiveQuoteDetailModalItem(newQuote);
          }}
          calls={quoCallsList}
          visits={scheduledJobsList}
          clients={clientsList}
          projectId={activeProjectId}
        />

        {/* Exact Jobber Quote & "This is your quote" SMS Modal */}
        <QuoteDetailModal
          isOpen={Boolean(activeQuoteDetailModalItem)}
          onClose={() => setActiveQuoteDetailModalItem(null)}
          quote={activeQuoteDetailModalItem}
          projectId={activeProjectId}
          onQuoteUpdated={(updatedQuote) => {
            setActiveQuoteDetailModalItem(updatedQuote);
            setQuotesList((prev) => dedupeQuotesList(prev.map((q) => (q.id === updatedQuote.id ? updatedQuote : q))));
          }}
        />

        {/* Quo (OpenPhone) 5-Line Phone System Modal */}
        <QuoModal
          isOpen={isQuoModalOpen}
          onClose={() => setIsQuoModalOpen(false)}
          projectId={activeProjectId}
          clients={clientsList}
          visits={scheduledJobsList}
          onVisitCreated={(newVisit) => {
            setScheduledJobsList((prev) => [newVisit, ...prev]);
          }}
          onDataUpdated={() => {
            fetch(`/api/store?project=${activeProjectId}`)
              .then((r) => r.json())
              .then((data) => {
                if (data.scheduledVisits) setScheduledJobsList(data.scheduledVisits);
                if (data.quotes) setQuotesList(dedupeQuotesList(data.quotes));
                if (data.clients) setClientsList(data.clients);
                if (data.quoCallLogs) setQuoCallsList(data.quoCallLogs);
              })
              .catch(() => {});
          }}
          onJobSelected={(_jobId) => {
            setActiveTopView('SCHEDULED_JOBS');
          }}
        />

        {/* Quick Links & Shortcuts Modal */}
        <QuickLinksModal
          isOpen={isQuickLinksOpen}
          onClose={() => setIsQuickLinksOpen(false)}
          onNavigateTo={(view, subTab) => {
            setActiveTopView(view);
            if (subTab && (subTab === 'CALENDAR' || subTab === 'LIST' || subTab === 'UNSCHEDULED')) {
              setScheduledJobsSubTab(subTab as any);
            }
          }}
          onOpenNewTicket={() => setIsNewTicketModalOpen(true)}
          onOpenTeamChat={() => setIsChatOpen(true)}
          onOpenQuoPhone={() => setIsQuoModalOpen(true)}
          onOpenSpamShield={handleOpenSpamShield}
          onOpenStaffRoster={() => setIsStaffModalOpen(true)}
          onOpenQuickReplies={() => setIsQuickRepliesOpen(true)}
          onOpenGithubSync={() => {
            setProjectBackupInitialTab('GITHUB_PUBLISH');
            setIsProjectBackupModalOpen(true);
          }}
          staffCount={staffList.length}
          scheduledJobsCount={scheduledJobsList.length}
          unscheduledJobsCount={unscheduledJobsList.length}
        />

        {/* Client SMS Quick Replies Assistant Modal */}
        <QuickRepliesModal
          isOpen={isQuickRepliesOpen}
          onClose={() => setIsQuickRepliesOpen(false)}
        />

        {/* Staff Roster & Spreadsheet Sync Modal */}
        <StaffRosterModal
          isOpen={isStaffModalOpen}
          onClose={() => setIsStaffModalOpen(false)}
          staffList={staffList}
          onUpdateStaffList={handleUpdateStaffList}
        />

        {/* Van Identifier & Hub Location Edit Modal */}
        <VanHubEditModal
          isOpen={isVanHubModalOpen}
          onClose={() => {
            setIsVanHubModalOpen(false);
            setEditingVanHubTech(null);
          }}
          technician={editingVanHubTech}
          onSave={handleUpdateTechnician}
        />

        {/* Real-Time Team Internal Messaging Drawer */}
        <TeamChatDrawer
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          currentUser={currentUser}
          selectedRecipient={chatRecipient}
          onSelectRecipient={setChatRecipient}
        />

        {/* Twilio Spam Shield & Call Blocker Modal */}
        <TwilioSpamShieldModal
          isOpen={isSpamShieldModalOpen}
          onClose={() => setIsSpamShieldModalOpen(false)}
          projectId={activeProjectId}
          preFillNumber={spamShieldNumber}
        />

        {/* Role Selector & Login Switcher Modal */}
        <RoleSelectorModal
          isOpen={isRoleModalOpen}
          onClose={() => setIsRoleModalOpen(false)}
          currentUser={currentUser}
          onSelectUser={handleSelectUser}
        />

        {/* Service Catalog & Price List Modal */}
        <ServiceCatalogModal
          isOpen={isServiceCatalogModalOpen}
          onClose={() => setIsServiceCatalogModalOpen(false)}
          catalog={serviceCatalog}
          onCatalogUpdated={(newCat) => setServiceCatalog(newCat)}
        />

        {/* Project Backup ZIP, Google Drive Upload, AI Build Workflow & GitHub / Domain Publish Modal */}
        <ProjectBackupDriveModal
          isOpen={isProjectBackupModalOpen}
          onClose={() => setIsProjectBackupModalOpen(false)}
          initialTab={projectBackupInitialTab}
        />

        {/* Firestore Sync Toast Notification */}
        {firestoreSyncStatus && (
          <div className="fixed bottom-5 right-5 z-50 bg-slate-900 border border-purple-500/50 shadow-2xl rounded-2xl p-4 text-white text-xs flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200 max-w-md">
            <div className="w-8 h-8 rounded-xl bg-purple-600/30 text-purple-400 border border-purple-500/40 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <span className="font-extrabold text-purple-300 block">Cloud Firestore Sync</span>
              <p className="text-slate-300 text-[11px] mt-0.5 leading-snug">{firestoreSyncStatus}</p>
            </div>
            <button
              onClick={() => setFirestoreSyncStatus(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </APIProvider>
  );
}

export default App;
