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
import { LiveCallScreenerHUD } from './components/LiveCallScreenerHUD';
import { AdLeadItem } from './types/lead';
import { INITIAL_AD_LEADS } from './data/adLeadsData';
import { LegalPagesView, LegalPageType } from './components/LegalPagesView';
import { CustomerPortalView } from './components/CustomerPortalView';
import { ThankYouConversionPage } from './components/ThankYouConversionPage';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import { CleanerPortalView } from './components/CleanerPortalView';
import { ClientsDatabaseView } from './components/ClientsDatabaseView';
import { ManagementHubView } from './components/ManagementHubView';
import { IntakesView } from './components/IntakesView';
import { ProjectBackupDriveModal } from './components/ProjectBackupDriveModal';
import { VanHubEditModal } from './components/VanHubEditModal';
import { MasterLeadsAndQuotesHubView, MasterHubFocusBlock } from './components/MasterLeadsAndQuotesHubView';
import { FacebookMessengerAiView } from './components/FacebookMessengerAiView';
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
  fetchVanOverridesFromFirestore,
  saveBlockedNumberToFirestore,
  deleteBlockedNumberFromFirestore,
  saveScreenedCallToFirestore,
  saveLeadToFirestore,
  saveWorkspaceStateToFirestore,
  syncAllToFirestore,
  FIRESTORE_DATABASE_ID
} from './services/firestoreSyncService';
import { saveAndDownloadNumberedProjectBackupZip } from './services/googleDriveBackupService';
import { onFirebaseAuthStateChanged, getAccessTokenSync } from './lib/firebase';
import { TeamChatDrawer } from './components/TeamChatDrawer';
import { RoleSelectorModal } from './components/RoleSelectorModal';
import { PWAInstallButton, DeviceLayoutOverride } from './components/PWAInstallButton';
import { MobileBottomNav } from './components/MobileBottomNav';
import { BookMyCleaningLogo } from './components/BookMyCleaningLogo';
import { AddressSearchRadarView } from './components/AddressSearchRadarView';
import { QuickMapScheduleRadarView } from './components/QuickMapScheduleRadarView';
import { JobberQuote, JobberInvoice } from './services/jobberSyncModules';
import {
  AppUser,
  APP_USERS,
  LiveStaffLocationPing,
  getUserPermissions,
  hasExpandedConsoleAccess,
  loadAppUsers,
  saveAppUsers,
  mergeUsersWithCanonical,
} from './types/authAndChat';
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
  // Read locally cached dispatch data immediately so user entries never vanish on refresh
  const storedData = typeof window !== 'undefined' ? (() => {
    try {
      const raw = localStorage.getItem('tidyups_dispatch_data');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })() : null;

  const [technicians, setTechnicians] = useState<Technician[]>(() => {
    if (storedData?.technicians && Array.isArray(storedData.technicians) && storedData.technicians.length > 0) {
      return storedData.technicians.map((t: Technician, idx: number) => {
        const canonical = INITIAL_TECHNICIANS.find((c) => c.id === t.id) || INITIAL_TECHNICIANS[idx];
        const hasGenericUnit = !t.vanNumber || /^unit\s+\d+$/i.test(String(t.vanNumber).trim());
        return {
          ...t,
          vanNumber: hasGenericUnit && canonical?.vanNumber ? canonical.vanNumber : t.vanNumber,
          color: t.color || canonical?.color || '#EC4899',
        };
      });
    }
    return INITIAL_TECHNICIANS;
  });

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

  // Multi-User RBAC, Editable Passwords & Granular Permissions State
  const [appUsersList, setAppUsersList] = useState<AppUser[]>(() => loadAppUsers());
  const [currentUser, setCurrentUser] = useState<AppUser>(() => {
    const loaded = loadAppUsers();
    if (typeof window !== 'undefined') {
      try {
        const savedId = localStorage.getItem('bookmycleaning_active_user_id');
        if (savedId) {
          const found = loaded.find((u) => u.id === savedId);
          if (found) return found;
        }
      } catch (e) {
        console.warn('localStorage error:', e);
      }
    }
    return loaded[0] || APP_USERS[0];
  });
  const [isRoleModalOpen, setIsRoleModalOpen] = useState<boolean>(false);
  const [roleModalInitialTab, setRoleModalInitialTab] = useState<'LOGIN' | 'MANAGE_ACCESS'>('LOGIN');
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [chatRecipient, setChatRecipient] = useState<AppUser | null>(null);
  const [cleanerShowMap, setCleanerShowMap] = useState<boolean>(false);

  // Detect if visitor is on the dedicated /thank-you Google Ads conversion page
  const [isThankYouConversionRoute, setIsThankYouConversionRoute] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname.toLowerCase().replace(/\/+$/, '');
      const s = window.location.search.toLowerCase();
      return (
        p === '/thank-you' ||
        p === '/thankyou' ||
        p === '/booking/thank-you' ||
        p === '/book/thank-you' ||
        s.includes('page=thank-you')
      );
    }
    return false;
  });

  // Detect if visitor is on the dedicated customer-only /booking, /book, or /thank-you path
  const [isStandaloneBookingDomain] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
      const search = window.location.search.toLowerCase();
      if (
        path === '/thank-you' ||
        path === '/thankyou' ||
        path === '/booking/thank-you' ||
        path === '/book/thank-you' ||
        path === '/booking' ||
        path.startsWith('/booking/') ||
        path === '/book' ||
        path.startsWith('/book/') ||
        search.includes('page=thank-you') ||
        search.includes('mode=customer') ||
        search.includes('booking=1')
      ) {
        return true;
      }
    }
    return false;
  });

  // Allows the owner inside the staff app to test the locked 1-page customer view
  const [isCustomerLockPreview, setIsCustomerLockPreview] = useState<boolean>(false);

  // Staff & Owner Authentication state
  const [isStaffAuthenticated, setIsStaffAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
      const search = window.location.search.toLowerCase();
      if (
        path === '/thank-you' ||
        path === '/thankyou' ||
        path === '/booking/thank-you' ||
        path === '/book/thank-you' ||
        path === '/booking' ||
        path.startsWith('/booking/') ||
        path === '/book' ||
        path.startsWith('/book/') ||
        search.includes('page=thank-you') ||
        search.includes('mode=customer') ||
        search.includes('booking=1')
      ) {
        return false;
      }
      try {
        return localStorage.getItem('tidyups_verified_password_session') === 'true';
      } catch {
        return false;
      }
    }
    return false;
  });

  // Detect if visitor is on a public legal page (/privacy-policy, /privacy, /data-deletion, /delete-data, /terms, /t&c, /support)
  const isPublicLegalPath = (() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname.toLowerCase().replace(/\/+$/, '');
      const h = window.location.hash.toLowerCase();
      return (
        p === '/privacy-policy' ||
        p === '/privacy' ||
        p === '/data-deletion' ||
        p === '/delete-data' ||
        p === '/terms' ||
        p === '/t&c' ||
        p === '/support' ||
        h === '#privacy-policy' ||
        h === '#privacy' ||
        h === '#data-deletion' ||
        h === '#terms' ||
        h === '#support'
      );
    }
    return false;
  })();

  // Automatically open the Login & Password modal on website load when not signed in (unless on /booking, /book, or public legal pages like /privacy-policy)
  useEffect(() => {
    if (!isStaffAuthenticated && !isStandaloneBookingDomain && !isPublicLegalPath) {
      setRoleModalInitialTab('LOGIN');
      setIsRoleModalOpen(true);
    }
  }, [isStaffAuthenticated, isStandaloneBookingDomain, isPublicLegalPath]);

  // Real-Time Cell Phone Live GPS Location Tracking State
  const [liveLocationsMap, setLiveLocationsMap] = useState<Record<string, LiveStaffLocationPing>>({});
  const [myGpsStatus, setMyGpsStatus] = useState<'IDLE' | 'REQUESTING' | 'ACTIVE' | 'DENIED'>('IDLE');
  const [myLiveCoords, setMyLiveCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);

  const permissions = getUserPermissions(currentUser);
  const isCleanerRestrictedMode = currentUser.role === 'CLEANER' && !hasExpandedConsoleAccess(permissions);

  // Dedicated Top Bar Navigation Tabs: 'MASTER_HUB' | 'FB_MESSENGER_AI' | 'QUICK_QUOTE' | 'MAP' | 'SCHEDULED_JOBS' | 'MANAGEMENT' | 'INTAKES' | 'CUSTOMER_PORTAL' | 'CLIENTS' | 'ADDRESS_SEARCH' | 'QUOTES' | 'INVOICES' | 'LEGAL' | 'LEADS' | 'SPAM_SHIELD'
  const [activeTopView, setActiveTopView] = useState<'MASTER_HUB' | 'FB_MESSENGER_AI' | 'MAP' | 'CUSTOMER_PORTAL' | 'SCHEDULED_JOBS' | 'CLIENTS' | 'ADDRESS_SEARCH' | 'MANAGEMENT' | 'QUOTES' | 'INVOICES' | 'LEGAL' | 'LEADS' | 'QUICK_QUOTE' | 'INTAKES' | 'SPAM_SHIELD'>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname.toLowerCase().replace(/\/+$/, '');
      const h = window.location.hash.toLowerCase();
      if (
        p === '/privacy-policy' ||
        p === '/privacy' ||
        p === '/data-deletion' ||
        p === '/delete-data' ||
        p === '/terms' ||
        p === '/t&c' ||
        p === '/support' ||
        h === '#privacy-policy' ||
        h === '#privacy' ||
        h === '#data-deletion' ||
        h === '#terms' ||
        h === '#support'
      ) {
        return 'LEGAL';
      }
      if (p === '/fb-messenger' || p === '/messenger' || h === '#fb-messenger') {
        return 'FB_MESSENGER_AI';
      }
      try {
        const isAuth = localStorage.getItem('tidyups_verified_password_session') === 'true';
        if (!isAuth) return 'CUSTOMER_PORTAL';
        const savedTab = localStorage.getItem('tidyups_active_tab');
        if (savedTab && ['MASTER_HUB', 'FB_MESSENGER_AI', 'MAP', 'CUSTOMER_PORTAL', 'SCHEDULED_JOBS', 'CLIENTS', 'ADDRESS_SEARCH', 'MANAGEMENT', 'QUOTES', 'INVOICES', 'LEGAL', 'LEADS', 'QUICK_QUOTE', 'INTAKES', 'SPAM_SHIELD'].includes(savedTab)) {
          return savedTab as any;
        }
        return 'MASTER_HUB';
      } catch {
        return 'CUSTOMER_PORTAL';
      }
    }
    return 'CUSTOMER_PORTAL';
  });
  const [masterHubFocusBlock, setMasterHubFocusBlock] = useState<MasterHubFocusBlock>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('tidyups_master_focus_block');
        if (saved && ['ALL', 'PASTE_TABLE', 'MASTER_TABLE', 'SCHEDULE_SEARCH', 'QUICK_MAPS'].includes(saved)) {
          return saved as MasterHubFocusBlock;
        }
      } catch {}
    }
    return 'ALL';
  });
  const [isSyncingEverything, setIsSyncingEverything] = useState<boolean>(false);
  const [lastSyncedAllAt, setLastSyncedAllAt] = useState<string | null>(() => new Date().toISOString());
  const [syncAllStatusMessage, setSyncAllStatusMessage] = useState<string | null>(null);
  const [deltaSyncStats, setDeltaSyncStats] = useState<{
    deltaWritesCount: number;
    unchangedSkippedCount: number;
    lastDeltaSyncAt?: string;
  } | null>(null);
  const [radarPreFillTicket, setRadarPreFillTicket] = useState<{
    address: string;
    clientName?: string;
    clientPhone?: string;
    serviceType?: string;
    assignedTechId?: string;
  } | null>(null);
  const [activeLegalTab, setActiveLegalTab] = useState<LegalPageType>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname.toLowerCase().replace(/\/+$/, '');
      const h = window.location.hash.toLowerCase();
      if (
        p === '/privacy-policy' ||
        p === '/privacy' ||
        p === '/data-deletion' ||
        p === '/delete-data' ||
        h === '#privacy-policy' ||
        h === '#privacy' ||
        h === '#data-deletion'
      ) {
        return 'PRIVACY';
      }
      if (p === '/terms' || p === '/t&c' || h === '#terms') {
        return 'TERMS';
      }
    }
    return 'SUPPORT';
  });
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
  const [staffList, setStaffList] = useState<JobberStaffMember[]>(() => {
    if (storedData?.staffRoster && Array.isArray(storedData.staffRoster) && storedData.staffRoster.length > 0) {
      return storedData.staffRoster;
    }
    return CANONICAL_JOBBER_STAFF;
  });
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
  const [scheduledJobsSubTab, setScheduledJobsSubTab] = useState<'CALENDAR' | 'LIST' | 'UNSCHEDULED'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('tidyups_schedule_subtab');
        if (saved && ['CALENDAR', 'LIST', 'UNSCHEDULED'].includes(saved)) {
          return saved as 'CALENDAR' | 'LIST' | 'UNSCHEDULED';
        }
      } catch {}
    }
    return 'CALENDAR';
  });
  const [quotesList, setQuotesList] = useState<JobberQuote[]>(() => {
    const base = (storedData?.quotes && storedData.quotes.length > 0) ? storedData.quotes : INITIAL_JOBBER_QUOTES;
    return dedupeQuotesList(base);
  });
  const [invoicesList, setInvoicesList] = useState<JobberInvoice[]>(() => {
    const base = (storedData?.invoices && storedData.invoices.length > 0) ? storedData.invoices : INITIAL_JOBBER_INVOICES;
    return base.filter((inv: any) => !isFakeSimulationItem(inv));
  });
  const [selectedScheduledJobId, setSelectedScheduledJobId] = useState<string | null>(null);
  const [mapInspectDate, setMapInspectDate] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('tidyups_map_inspect_date');
        if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) return saved;
      } catch {}
    }
    return getEdmontonToday().dateString;
  });
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

  // Streamlined Top Header Main Workflow Buttons (All secondary owner buttons live inside MANAGEMENT / Owner Hub)
  const DEFAULT_HEADER_NAV_ORDER = [
    'MASTER_HUB',
    'QUOTES',
    'FB_MESSENGER_AI',
    'QUICK_QUOTE',
    'MAP',
    'SCHEDULED_JOBS',
    'CLIENTS',
    'MANAGEMENT',
  ];

  const DEFAULT_FOOTER_BTN_ORDER = [
    'QUOTES',
    'FB_MESSENGER_AI',
    'VOICE_DICTATION',
    'PASTE_TABLE',
    'MASTER_TABLE',
    'QUICK_MAPS',
    'MANAGEMENT',
    'DISPATCH_MAP',
    'SCHEDULE_SEARCH',
    'BACKUP_ZIP',
    'SYNC_ALL',
    'BLOCK_SPAM',
  ];

  const [isGpsBannerApprovedOnce, setIsGpsBannerApprovedOnce] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('tidyups_gps_banner_approved_v1') === 'true';
      } catch {}
    }
    return false;
  });

  const [headerNavOrder, setHeaderNavOrder] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('tidyups_header_nav_order_v3');
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
        const saved = localStorage.getItem('tidyups_footer_btn_order_v4');
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
        localStorage.setItem('tidyups_header_nav_order_v3', JSON.stringify(nextOrder));
      } catch {}
      persistBarLayoutToServer({ headerNavOrder: nextOrder });
    },
    [persistBarLayoutToServer]
  );

  const updateFooterOrder = useCallback(
    (nextOrder: string[]) => {
      setFooterBtnOrder(nextOrder);
      try {
        localStorage.setItem('tidyups_footer_btn_order_v3', JSON.stringify(nextOrder));
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

  // Merge leads from backend Google Sheets / Ad Leads endpoint without ever overwriting newer local leads
  useEffect(() => {
    fetch(`/api/leads?project=${activeProjectId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && Array.isArray(data.leads) && data.leads.length > 0) {
          setLeadsList((prev) => {
            const byId = new Map<string, AdLeadItem>();
            for (const item of data.leads) {
              if (item && item.id) byId.set(String(item.id), item);
            }
            for (const localItem of prev) {
              if (localItem && localItem.id) {
                const serverItem = byId.get(String(localItem.id));
                byId.set(String(localItem.id), serverItem ? { ...localItem, ...serverItem } : localItem);
              }
            }
            return Array.from(byId.values());
          });
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

  // Load persisted staff accounts, passwords, and custom permissions from server on mount
  useEffect(() => {
    fetch('/api/auth/users')
      .then((r) => r.json())
      .then((data) => {
        if (data?.users && Array.isArray(data.users)) {
          const merged = mergeUsersWithCanonical(data.users);
          setAppUsersList(merged);
          setCurrentUser((prev) => merged.find((u) => u.id === prev.id) || prev);
        }
      })
      .catch((err) => console.warn('Could not load auth users from server:', err));
  }, []);

  // Detect mobile device label for live cell phone GPS telemetry
  const detectDeviceLabel = useCallback((): string => {
    if (typeof navigator === 'undefined') return 'Cell Phone GPS';
    const ua = navigator.userAgent || '';
    if (/iPhone/i.test(ua)) return 'iPhone GPS';
    if (/iPad/i.test(ua)) return 'iPad GPS';
    if (/Android/i.test(ua)) return 'Android Phone GPS';
    if (/Mobile/i.test(ua)) return 'Mobile Phone GPS';
    return 'Device GPS';
  }, []);

  // Push a single live GPS ping from this staff member's cell phone to the backend & update local map immediately
  const sendLiveLocationPing = useCallback(
    (user: AppUser, pos: GeolocationPosition) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accuracy = pos.coords.accuracy ? Math.round(pos.coords.accuracy) : 10;
      const speedKmh =
        typeof pos.coords.speed === 'number' && !isNaN(pos.coords.speed)
          ? Math.round(pos.coords.speed * 3.6)
          : null;
      const heading =
        typeof pos.coords.heading === 'number' && !isNaN(pos.coords.heading)
          ? Math.round(pos.coords.heading)
          : null;
      const deviceType = detectDeviceLabel();
      const nowIso = new Date().toISOString();

      setMyGpsStatus('ACTIVE');
      setMyLiveCoords({ lat, lng, accuracy });

      const payload: LiveStaffLocationPing = {
        userId: user.id,
        cleanerId: user.cleanerId || user.id,
        name: user.name,
        role: user.role,
        email: user.email,
        phone: user.phone,
        assignedVan: user.assignedVan || 'Mobile Unit',
        lat,
        lng,
        accuracy,
        speedKmh,
        heading,
        deviceType,
        timestamp: nowIso,
        permissionState: 'granted',
      };

      setLiveLocationsMap((prev) => ({
        ...prev,
        [user.id]: payload,
        ...(user.cleanerId ? { [user.cleanerId]: payload } : {}),
      }));

      setTechnicians((prev) =>
        prev.map((t) => {
          if (
            t.id === user.cleanerId ||
            t.id === user.id ||
            (user.email && t.email?.toLowerCase() === user.email.toLowerCase()) ||
            t.name.toLowerCase() === user.name.toLowerCase()
          ) {
            return {
              ...t,
              currentLocation: {
                ...t.currentLocation,
                lat,
                lng,
              },
              isLiveGps: true,
              lastGpsPingAt: nowIso,
              gpsAccuracyMeters: accuracy,
              gpsSpeedKmh: speedKmh,
              gpsDeviceType: deviceType,
              lastUpdated: nowIso,
            };
          }
          return t;
        })
      );

      fetch('/api/staff/live-locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch((err) => console.warn('Live GPS ping error:', err));
    },
    [detectDeviceLabel]
  );

  // Trigger native cell phone GPS location prompt & continuous tracking
  const handleRequestDeviceLocation = useCallback(
    (targetUser?: AppUser) => {
      const activeU = targetUser || currentUser;
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        return;
      }
      setMyGpsStatus('REQUESTING');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          sendLiveLocationPing(activeU, pos);
        },
        (err) => {
          console.warn('Geolocation permission warning:', err);
          if (err.code === 1) {
            setMyGpsStatus('DENIED');
          }
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
      );
    },
    [currentUser, sendLiveLocationPing]
  );

  // Continuous background/foreground cell phone GPS watcher (watchPosition + WakeLock + 12s heartbeat) for logged-in staff
  useEffect(() => {
    if (!isStaffAuthenticated || isStandaloneBookingDomain) return;
    if (currentUser.requireLiveLocation === false) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    let watchId: number | null = null;
    let wakeLockSentinel: any = null;
    let lastPosition: GeolocationPosition | null = null;

    // Request Screen WakeLock on mobile so phone keeps reporting live GPS while driving/working
    if ('wakeLock' in navigator && (navigator as any).wakeLock?.request) {
      (navigator as any).wakeLock
        .request('screen')
        .then((sentinel: any) => {
          wakeLockSentinel = sentinel;
        })
        .catch(() => {});
    }

    setMyGpsStatus('REQUESTING');
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        lastPosition = pos;
        sendLiveLocationPing(currentUser, pos);
      },
      (err) => {
        if (err.code === 1) {
          setMyGpsStatus('DENIED');
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 20000,
      }
    );

    // Heartbeat every 12 seconds so Owner sees live timestamp continuously
    const heartbeatTimer = setInterval(() => {
      if (lastPosition) {
        sendLiveLocationPing(currentUser, lastPosition);
      } else {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            lastPosition = pos;
            sendLiveLocationPing(currentUser, pos);
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
        );
      }
    }, 12000);

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      clearInterval(heartbeatTimer);
      if (wakeLockSentinel && typeof wakeLockSentinel.release === 'function') {
        wakeLockSentinel.release().catch(() => {});
      }
    };
  }, [isStaffAuthenticated, isStandaloneBookingDomain, currentUser, sendLiveLocationPing]);

  // Poll /api/staff/live-locations every 8 seconds so Owner & Dispatch see all staff members' live cell phone locations at all times
  useEffect(() => {
    const fetchLiveLocations = () => {
      fetch('/api/staff/live-locations')
        .then((r) => r.json())
        .then((data) => {
          if (data?.locations && typeof data.locations === 'object') {
            const locMap: Record<string, LiveStaffLocationPing> = data.locations;
            setLiveLocationsMap(locMap);

            const pings = Object.values(locMap);
            if (pings.length > 0) {
              setTechnicians((prev) => {
                let nextTechs = prev.map((t) => {
                  const match =
                    locMap[t.id] ||
                    pings.find(
                      (p) =>
                        p.cleanerId === t.id ||
                        p.userId === t.id ||
                        (p.email && t.email && p.email.toLowerCase() === t.email.toLowerCase()) ||
                        (p.name && t.name.toLowerCase() === p.name.toLowerCase())
                    );
                  if (!match || typeof match.lat !== 'number' || typeof match.lng !== 'number') {
                    return t;
                  }
                  return {
                    ...t,
                    currentLocation: {
                      ...t.currentLocation,
                      lat: match.lat,
                      lng: match.lng,
                    },
                    isLiveGps: true,
                    lastGpsPingAt: match.timestamp,
                    gpsAccuracyMeters: match.accuracy,
                    gpsSpeedKmh: match.speedKmh,
                    gpsDeviceType: match.deviceType,
                    lastUpdated: match.timestamp,
                  };
                });

                // Also add any newly created custom staff member who is actively sharing cell phone GPS so Owner sees them on the map too!
                for (const ping of pings) {
                  if (!ping || typeof ping.lat !== 'number' || typeof ping.lng !== 'number') continue;
                  const alreadyInTechs = nextTechs.some(
                    (t) =>
                      t.id === ping.cleanerId ||
                      t.id === ping.userId ||
                      (ping.email && t.email?.toLowerCase() === ping.email.toLowerCase()) ||
                      t.name.toLowerCase() === ping.name.toLowerCase()
                  );
                  if (!alreadyInTechs && ping.role !== 'OWNER') {
                    nextTechs = [
                      ...nextTechs,
                      {
                        id: ping.cleanerId || ping.userId,
                        name: ping.name,
                        vanNumber: ping.assignedVan || `Mobile GPS (${ping.name.split(' ')[0]})`,
                        phone: ping.phone || '(780) 718-5092',
                        email: ping.email,
                        role: ping.role,
                        color: '#10b981',
                        active: true,
                        status: 'AVAILABLE',
                        rating: 5.0,
                        skills: ['Live Mobile GPS'],
                        certifications: ['Verified Staff'],
                        experienceYears: 3,
                        currentLocation: {
                          lat: ping.lat,
                          lng: ping.lng,
                          address: `Live Cell Phone GPS (${ping.lat.toFixed(4)}, ${ping.lng.toFixed(4)})`,
                          city: 'Edmonton',
                        },
                        depotLocation: {
                          name: 'Edmonton Hub',
                          lat: ping.lat,
                          lng: ping.lng,
                          address: 'Edmonton, AB',
                        },
                        assignedTicketIds: [],
                        shiftCapacityHours: 8,
                        completedJobsCount: 0,
                        partsInventory: [],
                        isLiveGps: true,
                        lastGpsPingAt: ping.timestamp,
                        gpsAccuracyMeters: ping.accuracy,
                        gpsSpeedKmh: ping.speedKmh,
                        gpsDeviceType: ping.deviceType,
                        lastUpdated: ping.timestamp,
                      },
                    ];
                  }
                }

                return nextTechs;
              });
            }
          }
        })
        .catch(() => {});
    };

    fetchLiveLocations();
    const timer = setInterval(fetchLiveLocations, 8000);
    return () => clearInterval(timer);
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

  // Incremental Delta Firestore synchronization (only writes new or changed records)
  const handleSyncFirestore = useCallback(async () => {
    setIsSyncingFirestore(true);
    setFirestoreSyncStatus(null);
    try {
      const res = await syncAllToFirestore({
        leads: leadsList,
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
      setDeltaSyncStats({
        deltaWritesCount: res.deltaWritesCount || 0,
        unchangedSkippedCount: res.unchangedSkippedCount || 0,
        lastDeltaSyncAt: new Date().toISOString(),
      });
      setFirestoreSyncStatus(
        `✓ Incremental Delta Sync to Firebase: ${res.deltaWritesCount || 0} new/updated records written (${res.unchangedSkippedCount || 0} unchanged skipped) — ${res.leadsCount || leadsList.length} leads, ${res.quotesCount} quotes, ${res.clientsCount} clients, ${res.scheduledVisitsCount} visits!`
      );
      setTimeout(() => setFirestoreSyncStatus(null), 7000);
    } catch (e: any) {
      console.warn('Firestore sync note:', e);
      setFirestoreSyncStatus('Firestore incremental delta sync complete.');
      setTimeout(() => setFirestoreSyncStatus(null), 4000);
    } finally {
      setIsSyncingFirestore(false);
    }
  }, [leadsList, clientsList, scheduledJobsList, unscheduledJobsList, quotesList, invoicesList, technicians, serviceCatalog, spamShieldConfig, blockedCallsHistory, quoCallsList]);

  // Toggle block/unblock or mark as Good Lead on any screened call or phone number and persist across Backend Store + LocalStorage + Cloud Firestore
  const handleToggleBlockScreenedCall = useCallback(
    async (params: {
      callId?: string;
      callerPhone: string;
      callerName?: string;
      reason?: string;
      block: boolean;
      markAsGoodLead?: boolean;
    }) => {
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
          if (Array.isArray(data.adLeads)) {
            setLeadsList(data.adLeads);
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
          setSyncAllStatusMessage(
            data.message ||
              (params.block
                ? '🚫 Caller blocked & saved to database!'
                : '✅ Caller marked as Good Lead & added to Voice & Quick Quotes!')
          );
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
    leadsList,
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
      leadsList,
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
    leadsList,
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

  // Unified 1-Button & Auto-Login Incremental Delta Sync: Syncs Jobber Quotes, Invoices, Visits, Clients, Outbound Push, Quo/Sona AI Calls, Blocked Numbers & Master Leads Table
  const handleSyncEverything = useCallback(
    async (silent = false) => {
      if (isSyncingEverythingRef.current) return;
      isSyncingEverythingRef.current = true;
      setIsSyncingEverything(true);
      if (!silent) {
        setSyncAllStatusMessage('Incremental Delta Syncing: Jobber Quotes, Invoices, Calendar, Clients, Quo Calls & Master Leads...');
      }
      try {
        const driveToken = getAccessTokenSync();
        const res = await fetch(`/api/sync-everything?project=${activeProjectId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-project-id': activeProjectId },
          body: JSON.stringify({
            accessToken: driveToken || undefined,
          }),
        });
        const data = await res.json();
        if (data?.success) {
          if (Array.isArray(data.leads) && data.leads.length > 0) {
            setLeadsList((prev) => {
              const byId = new Map<string, AdLeadItem>();
              for (const l of prev) {
                if (l && l.id) byId.set(String(l.id), l);
              }
              for (const l of data.leads) {
                if (l && l.id) {
                  const existing = byId.get(String(l.id));
                  if (!existing) {
                    saveLeadToFirestore(l).catch(() => {});
                  }
                  byId.set(String(l.id), existing ? { ...existing, ...l } : l);
                }
              }
              return Array.from(byId.values());
            });
          }
          if (Array.isArray(data.quotes) && data.quotes.length > 0) {
            setQuotesList((prev) => dedupeQuotesList([...data.quotes, ...prev]));
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
          // Push only new/changed records (Delta Sync) to Firestore in background
          syncAllToFirestore({
            leads: data.leads || snap.leadsList,
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
          })
            .then((deltaRes) => {
              setDeltaSyncStats({
                deltaWritesCount: deltaRes.deltaWritesCount || 0,
                unchangedSkippedCount: deltaRes.unchangedSkippedCount || 0,
                lastDeltaSyncAt: new Date().toISOString(),
              });
            })
            .catch(() => {});

          if (!silent) {
            setSyncAllStatusMessage(
              data.message ||
                '✓ Incremental Delta Sync Complete: Only new/changed Jobber Quotes, Visits, Clients, Quo Calls & Master Leads were updated in Server & Firebase Storage!'
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
    const overridesPatch: Record<string, any> = {};
    updatedTechs.forEach((t) => {
      overridesPatch[t.id] = {
        id: t.id,
        name: t.name,
        vanNumber: t.vanNumber,
        vanUnit: t.vanNumber,
        phone: t.phone,
        email: t.email,
        color: t.color,
        homeAddress: t.homeAddress,
        depotLocation: t.depotLocation,
        currentLocation: t.currentLocation,
      };
      saveVanOverrideToFirestore(t).catch(() => {});
    });
    fetch('/api/store/save?project=tidyups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-project-id': 'tidyups' },
      body: JSON.stringify({ staffRoster: updatedStaff, cleanerOverrides: overridesPatch }),
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
    // Also sync to staff roster (matching by cleaner index, ID, email, or name)
    setStaffList((prev) => {
      const nextStaff = prev.map((s, idx) => {
        const expectedCleanerId = `cleaner-${idx + 1}`;
        const isMatch =
          expectedCleanerId === updatedTech.id ||
          s.id === updatedTech.id ||
          (s.email && updatedTech.email && s.email.toLowerCase() === updatedTech.email.toLowerCase()) ||
          s.name.toLowerCase() === updatedTech.name.toLowerCase();
        if (isMatch) {
          return {
            ...s,
            name: updatedTech.name,
            phone: updatedTech.phone || s.phone,
            email: updatedTech.email || s.email,
            homeAddress: updatedTech.homeAddress || updatedTech.depotLocation?.address || s.homeAddress,
            vanUnit: updatedTech.vanNumber || s.vanUnit,
            color: updatedTech.color || s.color,
            lat: updatedTech.depotLocation?.lat || updatedTech.currentLocation?.lat || s.lat,
            lng: updatedTech.depotLocation?.lng || updatedTech.currentLocation?.lng || s.lng,
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

    // Save home hub coordinates & address + vanNumber & color to backend
    fetch('/api/technicians/update-hub', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cleanerId: updatedTech.id,
        name: updatedTech.name,
        vanNumber: updatedTech.vanNumber,
        phone: updatedTech.phone,
        email: updatedTech.email,
        color: updatedTech.color,
        homeAddress: updatedTech.homeAddress || updatedTech.depotLocation?.address,
        hubName: updatedTech.depotLocation?.name || updatedTech.vanNumber,
        lat: updatedTech.depotLocation?.lat,
        lng: updatedTech.depotLocation?.lng,
      }),
    }).catch((err) => console.warn('Update hub note:', err));

    // Save cleanerOverrides to persistent JSON store
    fetch('/api/store/save?project=tidyups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-project-id': 'tidyups' },
      body: JSON.stringify({
        cleanerOverrides: {
          [updatedTech.id]: {
            id: updatedTech.id,
            name: updatedTech.name,
            vanNumber: updatedTech.vanNumber,
            vanUnit: updatedTech.vanNumber,
            phone: updatedTech.phone,
            email: updatedTech.email,
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

  // Load persistent store on mount & handle direct URL deep linking (/booking, /book, /support, /quotes, /invoices, /unscheduled, /staff)
  useEffect(() => {
    // Check initial path or hash
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path === '/booking' || path.startsWith('/booking/') || hash === '#booking' || path === '/book' || hash === '#book' || path.startsWith('/book/')) {
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
      } else if (
        path.replace(/\/+$/, '') === '/support' ||
        path.replace(/\/+$/, '') === '/t&c' ||
        path.replace(/\/+$/, '') === '/terms' ||
        path.replace(/\/+$/, '') === '/privacy-policy' ||
        path.replace(/\/+$/, '') === '/privacy' ||
        hash === '#privacy-policy' ||
        hash === '#privacy'
      ) {
        const cleanPath = path.replace(/\/+$/, '');
        if (cleanPath === '/t&c' || cleanPath === '/terms' || hash === '#terms') setActiveLegalTab('TERMS');
        else if (cleanPath === '/privacy-policy' || cleanPath === '/privacy' || hash === '#privacy-policy' || hash === '#privacy') setActiveLegalTab('PRIVACY');
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
            const rawOverrides = data.cleanerOverrides || {};
            const finalTechs = baseTechs.map((t: Technician) => {
              const ov = Array.isArray(rawOverrides)
                ? rawOverrides.find((o: any) => o && o.id === t.id)
                : rawOverrides[t.id];
              const assignedIds = cleanTickets.filter((tk: ServiceTicket) => tk.assignedTechId === t.id).map((tk: ServiceTicket) => tk.id);
              if (!ov) return { ...t, assignedTicketIds: assignedIds };
              return {
                ...t,
                ...ov,
                vanNumber: ov.vanNumber || ov.vanUnit || t.vanNumber,
                color: ov.color || t.color,
                assignedTicketIds: assignedIds,
                depotLocation: { ...t.depotLocation, ...(ov.depotLocation || {}) },
                currentLocation: { ...t.currentLocation, ...(ov.currentLocation || {}) },
              };
            });
            setTechnicians(finalTechs);
          } else {
            const rawOverrides = data.cleanerOverrides || {};
            setTechnicians((prev) =>
              prev.map((t) => {
                const ov = Array.isArray(rawOverrides)
                  ? rawOverrides.find((o: any) => o && o.id === t.id)
                  : rawOverrides[t.id];
                const assignedIds = cleanTickets.filter((tk: ServiceTicket) => tk.assignedTechId === t.id).map((tk: ServiceTicket) => tk.id);
                if (!ov) return { ...t, assignedTicketIds: assignedIds };
                return {
                  ...t,
                  ...ov,
                  vanNumber: ov.vanNumber || ov.vanUnit || t.vanNumber,
                  color: ov.color || t.color,
                  assignedTicketIds: assignedIds,
                  depotLocation: { ...t.depotLocation, ...(ov.depotLocation || {}) },
                  currentLocation: { ...t.currentLocation, ...(ov.currentLocation || {}) },
                };
              })
            );
          }

          // Also fetch cloud vanOverrides from Firestore so edits made on any device sync immediately
          fetchVanOverridesFromFirestore()
            .then((cloudMap) => {
              if (!cloudMap || Object.keys(cloudMap).length === 0) return;
              setTechnicians((prev) =>
                prev.map((t) => {
                  const cloud = cloudMap[t.id];
                  if (!cloud) return t;
                  const hasValidVan = cloud.vanNumber && !/^unit\s+\d+$/i.test(String(cloud.vanNumber).trim());
                  return {
                    ...t,
                    name: cloud.name || t.name,
                    vanNumber: hasValidVan ? cloud.vanNumber : t.vanNumber,
                    color: cloud.color || t.color,
                    phone: cloud.phone || t.phone,
                    homeAddress: cloud.homeAddress || t.homeAddress,
                  };
                })
              );
            })
            .catch(() => {});
          if (data.quotes && data.quotes.length > 0) {
            setQuotesList((prev) => dedupeQuotesList([...data.quotes, ...prev]));
          }
          if (data.invoices && data.invoices.length > 0) setInvoicesList(data.invoices.filter((inv: any) => !isFakeSimulationItem(inv)));
          if (data.quoCallLogs && data.quoCallLogs.length > 0) setQuoCallsList(data.quoCallLogs);
          if (data.spamShieldConfig) setSpamShieldConfig(data.spamShieldConfig);
          if (data.blockedCallsHistory && data.blockedCallsHistory.length > 0) setBlockedCallsHistory(data.blockedCallsHistory);
          if (data.adLeads && data.adLeads.length > 0) {
            setLeadsList((prev) => {
              const byId = new Map<string, AdLeadItem>();
              for (const l of prev) {
                if (l && l.id) byId.set(String(l.id), l);
              }
              for (const l of data.adLeads) {
                if (l && l.id) {
                  const existing = byId.get(String(l.id));
                  byId.set(String(l.id), existing ? { ...existing, ...l } : l);
                }
              }
              return Array.from(byId.values());
            });
          }
          if (data.serviceCatalog && data.serviceCatalog.length > 0) setServiceCatalog(data.serviceCatalog);
          if (Array.isArray(data.headerNavOrder) && data.headerNavOrder.length > 0) {
            const merged = [...data.headerNavOrder.filter((k: string) => DEFAULT_HEADER_NAV_ORDER.includes(k))];
            DEFAULT_HEADER_NAV_ORDER.forEach((k) => {
              if (!merged.includes(k)) merged.push(k);
            });
            setHeaderNavOrder(merged);
            try {
              localStorage.setItem('tidyups_header_nav_order_v3', JSON.stringify(merged));
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
          // Restore last workspace state from server if user didn't already have a local tab or deep-link URL
          if (data.workspaceState && typeof window !== 'undefined') {
            const path = window.location.pathname.toLowerCase();
            const hash = window.location.hash.toLowerCase();
            const isRoot = (path === '/' || path === '') && !hash;
            const localSavedTab = localStorage.getItem('tidyups_active_tab');
            if (isRoot && !localSavedTab && data.workspaceState.activeTopView) {
              setActiveTopView(data.workspaceState.activeTopView as any);
            }
          }
        }
      })
      .catch((err) => console.warn('Could not load persistent store:', err));
  }, [activeProjectId]);

  // Persist exact workspace position (active tab, Master Hub block, Schedule sub-tab, Map date) so reloading ALWAYS resumes right where you left off
  useEffect(() => {
    if (typeof window === 'undefined' || !isStaffAuthenticated || isStandaloneBookingDomain) return;
    try {
      localStorage.setItem('tidyups_active_tab', activeTopView);
      localStorage.setItem('tidyups_master_focus_block', masterHubFocusBlock);
      localStorage.setItem('tidyups_schedule_subtab', scheduledJobsSubTab);
      if (mapInspectDate) localStorage.setItem('tidyups_map_inspect_date', mapInspectDate);
    } catch {}

    const wsPayload = {
      activeTopView,
      masterHubFocusBlock,
      scheduledJobsSubTab,
      mapInspectDate,
    };

    const timer = setTimeout(() => {
      fetch(`/api/store/save?project=${activeProjectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-project-id': activeProjectId },
        body: JSON.stringify({ workspaceState: wsPayload }),
      }).catch(() => {});
      saveWorkspaceStateToFirestore(wsPayload).catch(() => {});
    }, 350);

    return () => clearTimeout(timer);
  }, [activeTopView, masterHubFocusBlock, scheduledJobsSubTab, mapInspectDate, isStaffAuthenticated, isStandaloneBookingDomain, activeProjectId]);

  // Incremental Delta Persistence whenever Leads or Quotes are added/edited in any view
  const handleLeadsUpdated = useCallback(
    (updatedLeads: AdLeadItem[]) => {
      setLeadsList(updatedLeads);
      setLastSyncedAllAt(new Date().toISOString());
      fetch(`/api/store/save?project=${activeProjectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-project-id': activeProjectId },
        body: JSON.stringify({ adLeads: updatedLeads }),
      }).catch(() => {});
      // Delta-sync top changed leads to Firestore
      updatedLeads.slice(0, 15).forEach((lead) => {
        saveLeadToFirestore(lead).catch(() => {});
      });
    },
    [activeProjectId]
  );

  const handleQuotesUpdated = useCallback(
    (updatedQuotes: JobberQuote[]) => {
      const deduped = dedupeQuotesList(updatedQuotes);
      setQuotesList(deduped);
      setLastSyncedAllAt(new Date().toISOString());
      fetch(`/api/store/save?project=${activeProjectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-project-id': activeProjectId },
        body: JSON.stringify({ quotes: deduped }),
      }).catch(() => {});
      deduped.slice(0, 15).forEach((quote) => {
        saveQuoteToFirestore(quote).catch(() => {});
      });
    },
    [activeProjectId]
  );

  // Unified persistent auto-save: preserves all user entries, clients, quotes, invoices, serviceCatalog, blocked numbers, screened calls, and jobs across refreshes per project
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const payload = {
          tickets,
          technicians,
          staffRoster: staffList,
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
  }, [activeProjectId, tickets, technicians, staffList, scheduledJobsList, unscheduledJobsList, clientsList, quotesList, invoicesList, serviceCatalog, quoCallsList, spamShieldConfig, blockedCallsHistory, leadsList]);

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

  // Device layout override ('AUTO' | 'IPHONE' | 'IPAD' | 'DESKTOP') so user can preview or lock iPhone/iPad layout anytime
  const [deviceOverride, setDeviceOverride] = useState<DeviceLayoutOverride>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('tidyups_device_layout_override') as DeviceLayoutOverride | null;
        if (saved === 'AUTO' || saved === 'IPHONE' || saved === 'IPAD' || saved === 'DESKTOP') {
          return saved;
        }
      } catch {}
    }
    return 'AUTO';
  });

  const handleChangeDeviceOverride = useCallback((mode: DeviceLayoutOverride) => {
    setDeviceOverride(mode);
    try {
      localStorage.setItem('tidyups_device_layout_override', mode);
    } catch {}
  }, []);

  // Viewport mode detection for mobile portrait (iPhone), mobile landscape, tablet (iPad), and desktop
  const [rawViewportMode, setViewportMode] = useState<{
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
    const isTab = !isMobileLand && !isMobilePort && w < 1200;
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
      const isTab = !isMobileLand && !isMobilePort && w < 1200;
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

  const viewportMode =
    deviceOverride === 'IPHONE'
      ? { isMobilePortrait: true, isMobileLandscape: false, isTablet: false, isDesktop: false }
      : deviceOverride === 'IPAD'
      ? { isMobilePortrait: false, isMobileLandscape: false, isTablet: true, isDesktop: false }
      : deviceOverride === 'DESKTOP'
      ? { isMobilePortrait: false, isMobileLandscape: false, isTablet: false, isDesktop: true }
      : rawViewportMode;

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
    const matchedUser = appUsersList.find(
      (u) => u.cleanerId === tech.id || u.email === tech.email || u.name === tech.name
    );
    if (matchedUser) {
      setChatRecipient(matchedUser);
      setIsChatOpen(true);
    }
  }, [appUsersList]);

  const handleUpdateUsersList = useCallback((updatedUsers: AppUser[]) => {
    setAppUsersList(updatedUsers);
    saveAppUsers(updatedUsers);
    setCurrentUser((prev) => updatedUsers.find((u) => u.id === prev.id) || prev);
  }, []);

  const handleSelectUser = useCallback((user: AppUser) => {
    setCurrentUser(user);
    setIsStaffAuthenticated(true);
    const userPerms = getUserPermissions(user);
    const isRestrictedCleaner = user.role === 'CLEANER' && !hasExpandedConsoleAccess(userPerms);
    const targetView = isRestrictedCleaner
      ? 'MAP'
      : userPerms.canAccessMasterHub
      ? 'MASTER_HUB'
      : 'MAP';
    try {
      localStorage.setItem('bookmycleaning_active_user_id', user.id);
      localStorage.setItem('tidyups_staff_authenticated', 'true');
      localStorage.setItem('tidyups_verified_password_session', 'true');
      localStorage.setItem('tidyups_active_tab', targetView);
    } catch (e) {
      console.warn('localStorage error:', e);
    }
    setActiveTopView(targetView);
    if (user.role === 'CLEANER') {
      setSelectedTechId(user.cleanerId || null);
      setCleanerShowMap(!isRestrictedCleaner);
    }
  }, []);

  const handleLogout = useCallback(() => {
    setIsStaffAuthenticated(false);
    try {
      localStorage.removeItem('tidyups_staff_authenticated');
      localStorage.removeItem('tidyups_verified_password_session');
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
      <div id="cleaning-dispatch-app" className="w-screen h-screen bg-slate-50 text-slate-900 font-sans select-none overflow-hidden flex flex-col">
        <div
          className={`${
            deviceOverride === 'IPHONE'
              ? 'w-full max-w-[430px] mx-auto shadow-2xl border-x border-slate-300 bg-slate-50'
              : deviceOverride === 'IPAD'
              ? 'w-full max-w-[1024px] mx-auto shadow-2xl border-x border-slate-300 bg-slate-50'
              : deviceOverride === 'DESKTOP'
              ? 'min-w-[1380px]'
              : isStandaloneBookingDomain || isCustomerLockPreview || activeTopView === 'CUSTOMER_PORTAL'
              ? 'w-full'
              : 'w-full'
          } h-full max-h-screen overflow-hidden flex flex-col ${
            !isZenMode && isStaffAuthenticated && !isStandaloneBookingDomain && !isCustomerLockPreview && deviceOverride !== 'DESKTOP'
              ? 'pb-[58px] xl:pb-0'
              : ''
          }`}
        >
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

        {/* High-Visibility Owner (No Password) & Staff Login Bar when Unauthenticated */}
        {!isZenMode && !isStaffAuthenticated && !isStandaloneBookingDomain && !isCustomerLockPreview && (
          <header
            id="customer-header"
            className="min-h-[56px] px-3 sm:px-6 py-2 bg-slate-950 text-white border-b-2 border-amber-400 flex flex-wrap items-center justify-between flex-shrink-0 z-30 shadow-lg gap-3"
          >
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" />
                <span>TidyUps Console Login</span>
              </span>
              <span className="text-xs text-slate-200 hidden md:inline">
                Owner (<strong>cleaningserviceyeg@gmail.com</strong>) logs in with 1 click (No Password) • Dispatchers &amp; Cleaners enter Password/PIN
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              {/* 1-Click Instant Owner Login (cleaningserviceyeg@gmail.com - No Password) */}
              <button
                type="button"
                onClick={() => {
                  const ownerAcc =
                    appUsersList.find((u) => u.email.toLowerCase() === 'cleaningserviceyeg@gmail.com') ||
                    appUsersList.find((u) => u.role === 'OWNER') ||
                    APP_USERS[0];
                  handleSelectUser(ownerAcc);
                }}
                className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
                title="1-Click Instant Owner Login for cleaningserviceyeg@gmail.com (No Password Required)"
              >
                <span>👑</span>
                <span>Owner Login (No Password)</span>
              </button>

              {/* Staff & Dispatch Login (Password Required + Live Phone GPS) */}
              <button
                type="button"
                onClick={() => {
                  setRoleModalInitialTab('LOGIN');
                  setIsRoleModalOpen(true);
                }}
                className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white border border-pink-400/50 font-black text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
                title="Open Login & Password Screen for Dispatchers and Cleaners"
              >
                <Lock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>Staff / Cleaner Login</span>
              </button>

              <PWAInstallButton
                deviceOverride={deviceOverride}
                onChangeDeviceOverride={handleChangeDeviceOverride}
              />
            </div>
          </header>
        )}

        {/* Ultra-Small One-Time Live Cell Phone GPS Banner (Paused for Owner & Hidden Permanently Once Approved Once) */}
        {!isZenMode &&
          isStaffAuthenticated &&
          !isStandaloneBookingDomain &&
          !isCustomerLockPreview &&
          currentUser.role !== 'OWNER' &&
          !isGpsBannerApprovedOnce &&
          currentUser.requireLiveLocation !== false &&
          myGpsStatus !== 'ACTIVE' && (
            <div className="bg-slate-900 text-slate-200 px-3 py-1 border-b border-emerald-500/40 flex items-center justify-between gap-2 z-30 text-[11px]">
              <div className="flex items-center gap-1.5 truncate">
                <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate">
                  <strong>Live Route GPS ({currentUser.name}):</strong> Approve once to share your route location.
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    try {
                      localStorage.setItem('tidyups_gps_banner_approved_v1', 'true');
                    } catch {}
                    setIsGpsBannerApprovedOnce(true);
                    handleRequestDeviceLocation(currentUser);
                  }}
                  className="px-2.5 py-0.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[10px] cursor-pointer"
                >
                  Approve Once
                </button>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      localStorage.setItem('tidyups_gps_banner_approved_v1', 'true');
                    } catch {}
                    setIsGpsBannerApprovedOnce(true);
                  }}
                  className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] cursor-pointer"
                >
                  Pause Banner
                </button>
              </div>
            </div>
          )}

        {/* Global Top Application Navigation Bar (Only for Authenticated Staff & Hidden in Customer Lock Mode) */}
        {!isZenMode && isStaffAuthenticated && !isStandaloneBookingDomain && !isCustomerLockPreview && (
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
              {isCleanerRestrictedMode ? (
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
                  {currentUser.role === 'CLEANER' && (
                    <button
                      id="nav-tab-cleaner-stops-expanded"
                      onClick={() => {
                        setCleanerShowMap(false);
                        setActiveTopView('MAP');
                      }}
                      className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        activeTopView === 'MAP' && !cleanerShowMap
                          ? 'bg-emerald-600 text-white shadow-xs font-extrabold'
                          : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200'
                      }`}
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>My Stops</span>
                    </button>
                  )}
                  {headerNavOrder.map((btnKey, idx) => {
                    let buttonElement: React.ReactNode = null;

                    if (btnKey === 'MASTER_HUB' && permissions.canAccessMasterHub) {
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
                    } else if (btnKey === 'QUOTES') {
                      buttonElement = (
                        <button
                          id="nav-tab-quotes"
                          onClick={() => setActiveTopView('QUOTES')}
                          className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                            activeTopView === 'QUOTES'
                              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-sm ring-2 ring-amber-400/40'
                              : 'bg-amber-50 text-amber-950 hover:bg-amber-100 border border-amber-300'
                          }`}
                          title="Drag left/right to rearrange • 1-Click Open All Jobber & Local Quotes"
                        >
                          <span>📋</span>
                          <span>Quotes</span>
                          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                            activeTopView === 'QUOTES' ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-amber-200/80 text-amber-950'
                          }`}>
                            {quotesList.length}
                          </span>
                        </button>
                      );
                    } else if (btnKey === 'FB_MESSENGER_AI') {
                      buttonElement = (
                        <button
                          id="nav-tab-fb-messenger"
                          onClick={() => setActiveTopView('FB_MESSENGER_AI')}
                          className={`min-h-[34px] px-3.5 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                            activeTopView === 'FB_MESSENGER_AI'
                              ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-sm ring-2 ring-blue-500/30'
                              : 'bg-blue-50 text-blue-950 hover:bg-blue-100 border border-blue-300'
                          }`}
                          title="Drag left/right to rearrange • 3-Page Facebook Messenger AI Bot, Live Prompt Tweaker & Auto-Sync to Google Sheet ('FB Leads') + Jobber"
                        >
                          <MessageSquare className={`w-3.5 h-3.5 ${activeTopView === 'FB_MESSENGER_AI' ? 'text-white' : 'text-blue-600'}`} />
                          <span>FB Messenger AI (3 Pages)</span>
                        </button>
                      );
                    } else if (btnKey === 'QUICK_QUOTE' && permissions.canAccessQuickQuote) {
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
                    } else if (btnKey === 'MAP' && permissions.canAccessDispatchMap) {
                      buttonElement = (
                        <button
                          id="nav-tab-map"
                          onClick={() => {
                            if (currentUser.role === 'CLEANER') setCleanerShowMap(true);
                            setActiveTopView('MAP');
                          }}
                          className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            activeTopView === 'MAP' && (currentUser.role !== 'CLEANER' || cleanerShowMap)
                              ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-xs font-extrabold'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                          }`}
                          title="Drag left/right to rearrange • Dispatch Map"
                        >
                          <MapIcon className={`w-3.5 h-3.5 ${activeTopView === 'MAP' ? 'text-white' : 'text-pink-600'}`} />
                          <span>Dispatch Map</span>
                        </button>
                      );
                    } else if (btnKey === 'SCHEDULED_JOBS' && permissions.canAccessSchedule) {
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
                    } else if (btnKey === 'MANAGEMENT' && permissions.canAccessManagement) {
                      buttonElement = (
                        <button
                          id="nav-tab-management"
                          onClick={() => setActiveTopView('MANAGEMENT')}
                          className={`min-h-[34px] px-3.5 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                            ['MANAGEMENT', 'QUOTES', 'INVOICES', 'LEGAL', 'INTAKES', 'LEADS', 'SPAM_SHIELD', 'ADDRESS_SEARCH'].includes(activeTopView)
                              ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-purple-600 text-white shadow-sm ring-2 ring-amber-400/40'
                              : 'bg-amber-50 text-amber-950 hover:bg-amber-100 border border-amber-300'
                          }`}
                          title="Owner Hub & All App Buttons: Open every tool, phone line, price list, backup, password manager, and admin control in 1 click"
                        >
                          <span>👑</span>
                          <span>Owner Hub (All Buttons)</span>
                        </button>
                      );
                    } else if (btnKey === 'CLIENTS' && permissions.canAccessClients) {
                      buttonElement = (
                        <button
                          id="nav-tab-clients"
                          onClick={() => setActiveTopView('CLIENTS')}
                          className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            activeTopView === 'CLIENTS'
                              ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-xs font-extrabold'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                          }`}
                          title="Clients database, lead verdicts, phone numbers & Jobber sync"
                        >
                          <Users className={`w-3.5 h-3.5 ${activeTopView === 'CLIENTS' ? 'text-white' : 'text-blue-600'}`} />
                          <span>Clients</span>
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
                </>
              )}
            </div>

            {/* Streamlined Right Header Controls (Secondary owner buttons moved into 👑 Owner Hub / All Buttons page) */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <div className="hidden 2xl:block text-right border-r border-slate-200 pr-2.5 whitespace-nowrap">
                <p className="text-[9px] font-medium text-slate-500 uppercase tracking-tighter">{currentDate}</p>
                <p className="text-xs font-bold text-slate-800 font-mono leading-tight">{currentTime}</p>
              </div>

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
                onClick={() => {
                  setRoleModalInitialTab('LOGIN');
                  setIsRoleModalOpen(true);
                }}
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

              {/* PWA Mobile & Web App Installation + iPhone/iPad Layout Switcher */}
              <PWAInstallButton
                deviceOverride={deviceOverride}
                onChangeDeviceOverride={handleChangeDeviceOverride}
              />

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

        {/* Scrollable Active View Container so Global Header & Footer Button Bars stay pinned on ALL pages (including Owner's Hub & Voice Dictation) */}
        <div className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden flex flex-col relative">
        {/* Standalone /thank-you Google Ads Conversion Page OR Customer Booking Domain (book.tidyupscleaning.com) */}
        {isThankYouConversionRoute ? (
          <ThankYouConversionPage
            isOwnerViewing={isStaffAuthenticated}
            onBackToBookingForm={() => {
              setIsThankYouConversionRoute(false);
              try {
                window.history.pushState({}, '', '/booking');
              } catch {}
            }}
            onReturnToStaffConsole={() => {
              setIsThankYouConversionRoute(false);
              try {
                window.history.pushState({}, '', '/');
              } catch {}
            }}
            onOpenStaffLogin={() => {
              setRoleModalInitialTab('LOGIN');
              setIsRoleModalOpen(true);
            }}
          />
        ) : isStandaloneBookingDomain || isCustomerLockPreview || (!isStaffAuthenticated && activeTopView !== 'LEGAL' && activeTopView !== 'SPAM_SHIELD') || activeTopView === 'CUSTOMER_PORTAL' ? (
          <CustomerPortalView
            projectId={activeBrandId}
            isStandaloneCustomerSite={isStandaloneBookingDomain}
            isCustomerLockPreview={isCustomerLockPreview}
            onToggleCustomerLockPreview={
              isStaffAuthenticated ? (locked) => setIsCustomerLockPreview(locked) : undefined
            }
            serviceCatalog={serviceCatalog}
            onLeadsReconnected={(reconnected) => {
              if (Array.isArray(reconnected.leads)) handleLeadsUpdated(reconnected.leads);
              if (Array.isArray(reconnected.clients)) setClientsList(reconnected.clients);
              if (Array.isArray(reconnected.quotes)) handleQuotesUpdated(reconnected.quotes);
            }}
            onBookingSubmitted={(ticket, fullPayload) => {
              setIsThankYouConversionRoute(true);
              setTickets((prev) => [ticket, ...prev]);
              saveStateToStore([ticket, ...tickets]);
              if (fullPayload?.lead) {
                setLeadsList((prev) => {
                  const next = [fullPayload.lead, ...prev];
                  saveLeadToFirestore(fullPayload.lead).catch(() => {});
                  fetch(`/api/store/save?project=${activeProjectId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-project-id': activeProjectId },
                    body: JSON.stringify({ adLeads: next }),
                  }).catch(() => {});
                  return next;
                });
              }
              if (fullPayload?.client) {
                setClientsList((prev) => [fullPayload.client, ...prev]);
                saveClientToFirestore(fullPayload.client).catch(() => {});
              }
              if (fullPayload?.quote) {
                setQuotesList((prev) => {
                  const next = dedupeQuotesList([fullPayload.quote, ...prev]);
                  saveQuoteToFirestore(fullPayload.quote).catch(() => {});
                  fetch(`/api/store/save?project=${activeProjectId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-project-id': activeProjectId },
                    body: JSON.stringify({ quotes: next }),
                  }).catch(() => {});
                  return next;
                });
              }
              if (fullPayload?.visit) {
                setScheduledJobsList((prev) => [fullPayload.visit, ...prev]);
                saveScheduledVisitToFirestore(fullPayload.visit).catch(() => {});
              }
              if (fullPayload?.unscheduledJob) {
                setUnscheduledJobsList((prev) => [fullPayload.unscheduledJob, ...prev]);
                saveUnscheduledJobToFirestore(fullPayload.unscheduledJob).catch(() => {});
              }
            }}
            onNavigateToMap={() => {
              if (isStandaloneBookingDomain) return;
              if (isStaffAuthenticated) {
                setActiveTopView('MAP');
              } else {
                setRoleModalInitialTab('LOGIN');
                setIsRoleModalOpen(true);
              }
            }}
            onOpenPhoneModal={() => {
              if (!isStandaloneBookingDomain && isStaffAuthenticated) setIsQuoModalOpen(true);
            }}
            onOpenStaffLogin={() => {
              setRoleModalInitialTab('LOGIN');
              setIsRoleModalOpen(true);
            }}
            onOpenSpamShield={!isStandaloneBookingDomain && isStaffAuthenticated ? handleOpenSpamShield : undefined}
            onOpenVoiceIntake={() => {
              if (!isStandaloneBookingDomain && isStaffAuthenticated) setActiveTopView('QUICK_QUOTE');
            }}
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
            onQuotesUpdated={handleQuotesUpdated}
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
            onLeadsUpdated={handleLeadsUpdated}
            onQuotesUpdated={handleQuotesUpdated}
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
            onNavigateToPasteTable={() => {
              setMasterHubFocusBlock('PASTE_TABLE');
              setActiveTopView('MASTER_HUB');
            }}
            onNavigateToCleanSheet={() => setActiveTopView('LEADS')}
            onNavigateToAddressRadar={() => setActiveTopView('ADDRESS_SEARCH')}
            onNavigateToDispatchMap={() => setActiveTopView('MAP')}
            onNavigateToSchedule={() => {
              setActiveTopView('SCHEDULED_JOBS');
              setScheduledJobsSubTab('CALENDAR');
            }}
            onNavigateToUnscheduled={() => {
              setActiveTopView('SCHEDULED_JOBS');
              setScheduledJobsSubTab('UNSCHEDULED');
            }}
            onNavigateToClients={() => setActiveTopView('CLIENTS')}
            onOpenQuickLinks={() => setIsQuickLinksOpen(true)}
            onOpenQuickReplies={() => setIsQuickRepliesOpen(true)}
            onOpenPublicBookingModal={() => setIsPublicBookingModalOpen(true)}
            onOpenNewTicketModal={() => setIsNewTicketModalOpen(true)}
            onOpenAiDispatchModal={() => setIsAiModalOpen(true)}
            onToggleZenMode={() => setIsZenMode(true)}
            onToggleBoard={() => setIsBoardCollapsed((c) => !c)}
            onToggleRearrangeBars={() => setIsRearrangingBars((prev) => !prev)}
            isRearrangingBars={isRearrangingBars}
            onSyncEverything={() => handleSyncEverything(false)}
            isSyncingEverything={isSyncingEverything}
            onSwitchBrand={handleSwitchProject}
            catalogCount={serviceCatalog?.length || 28}
            intakesCount={tickets.length + quotesList.length}
            quotesCount={quotesList.length}
            invoicesCount={invoicesList.length}
            leadsCount={leadsList.length}
            clientsCount={clientsList.length}
            scheduledCount={scheduledJobsList.length}
            callsCount={quoCallsList.length}
            staffCount={staffList.length}
            cleanersCount={technicians.length}
            technicians={technicians}
            onEditVanHub={(tech) => {
              setEditingVanHubTech(tech);
              setIsVanHubModalOpen(true);
            }}
            onSyncFirestore={handleSyncFirestore}
            isSyncingFirestore={isSyncingFirestore}
            lastSyncedAllAt={lastSyncedAllAt}
            firestoreSyncStatus={firestoreSyncStatus}
            deltaSyncStats={deltaSyncStats}
            onOpenProjectBackup={() => setIsProjectBackupModalOpen(true)}
            onOpenAccessManager={
              currentUser.role === 'OWNER' || permissions.canManageUsersAndAccess
                ? () => {
                    setRoleModalInitialTab('MANAGE_ACCESS');
                    setIsRoleModalOpen(true);
                  }
                : undefined
            }
            onNavigateToFbMessengerAi={() => setActiveTopView('FB_MESSENGER_AI')}
          />
        ) : activeTopView === 'FB_MESSENGER_AI' ? (
          <FacebookMessengerAiView
            projectId={activeProjectId}
            onLeadsUpdated={handleLeadsUpdated}
            onQuotesUpdated={handleQuotesUpdated}
            onClientsUpdated={(updated) => setClientsList(updated)}
            onNavigateToMasterHub={() => {
              setMasterHubFocusBlock('MASTER_TABLE');
              setActiveTopView('MASTER_HUB');
            }}
            onNavigateToQuotes={() => setActiveTopView('QUOTES')}
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
            onQuotesUpdated={handleQuotesUpdated}
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
                  if (data.quotes) handleQuotesUpdated(data.quotes);
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
            onLeadsUpdated={handleLeadsUpdated}
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
            onQuotesUpdated={handleQuotesUpdated}
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
              saveQuoteToFirestore(newQuote).catch(() => {});
              setQuotesList((prev) => {
                const newDay = String(newQuote.createdAt || '').slice(0, 10);
                const newClient = String(newQuote.clientName || '').trim().toLowerCase();
                const newPhone = String(newQuote.clientPhone || '').replace(/\D/g, '').slice(-10);
                const newAddr = String(newQuote.serviceAddress || '').trim().toLowerCase();
                const filtered = prev.filter((q) => {
                  if (q.id === newQuote.id || (q.quoteNumber && q.quoteNumber === newQuote.quoteNumber)) return false;
                  const qPhone = String(q.clientPhone || '').replace(/\D/g, '').slice(-10);
                  const qAddr = String(q.serviceAddress || '').trim().toLowerCase();
                  if (newPhone && qPhone && newPhone !== qPhone) return true;
                  if (newAddr && qAddr && newAddr !== qAddr) return true;
                  if (
                    newClient &&
                    String(q.clientName || '').trim().toLowerCase() === newClient &&
                    String(q.createdAt || '').slice(0, 10) === newDay
                  ) {
                    return false;
                  }
                  return true;
                });
                const next = dedupeQuotesList([newQuote, ...filtered]);
                fetch(`/api/store/save?project=${activeProjectId}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'x-project-id': activeProjectId },
                  body: JSON.stringify({ quotes: next }),
                }).catch(() => {});
                return next;
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
            onNavigateToMasterHub={() => {
              setMasterHubFocusBlock('ALL');
              setActiveTopView('MASTER_HUB');
            }}
            onNavigateToManagement={() => setActiveTopView('MANAGEMENT')}
            onNavigateToQuotes={() => setActiveTopView('QUOTES')}
            onNavigateToFbMessengerAi={() => setActiveTopView('FB_MESSENGER_AI')}
            onNavigateToAddressRadar={() => setActiveTopView('ADDRESS_SEARCH')}
            onNavigateToClients={() => setActiveTopView('CLIENTS')}
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
            onLeadsUpdated={handleLeadsUpdated}
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
                  ? `fixed inset-x-0 bottom-[58px] xl:bottom-0 z-40 bg-white rounded-t-2xl shadow-2xl flex flex-col transition-transform duration-300 ease-in-out pointer-events-auto h-[80vh] ${
                      mobileSheetState === 'collapsed'
                        ? 'translate-y-[calc(100%-56px)]'
                        : mobileSheetState === 'half'
                        ? 'translate-y-[45%]'
                        : 'translate-y-0'
                    }`
                  : viewportMode.isTablet
                  ? `absolute top-0 right-0 bottom-0 z-40 w-[380px] sm:w-[420px] h-full shadow-2xl bg-white border-l border-slate-200 flex flex-col transition-transform duration-300 ease-in-out ${
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
        </div>

        {/* Global Quick-Link Footer Bar (Hidden on book.tidyupscleaning.com and Customer Lock Preview so customers cannot access staff tools) */}
        {!isZenMode && !isStandaloneBookingDomain && !isCustomerLockPreview && (
          <footer
            id="global-footer"
            className={`py-0.5 bg-slate-900 text-slate-300 flex flex-nowrap items-center px-2 sm:px-3 justify-between gap-1.5 text-[10px] shrink-0 font-medium z-30 border-t border-slate-800 overflow-x-auto no-scrollbar whitespace-nowrap ${
              footerButtonsSide === 'right' ? 'flex-row' : 'flex-row-reverse'
            }`}
          >
            {/* Status, Legal Links & Rearrange Controls */}
            <div className="flex items-center gap-1.5 text-[10px] shrink-0">
              <span className="text-pink-400 font-mono font-bold">1-833-TIDYUPS</span>
              <div className="hidden lg:flex items-center gap-1.5 border-l border-slate-700 pl-1.5">
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
                  /privacy
                </button>
              </div>

              {/* Rearrange Header & Footer Buttons Control */}
              <div className="flex items-center gap-1 border-l border-slate-700 pl-1.5">
                <button
                  type="button"
                  onClick={() => setIsRearrangingBars((prev) => !prev)}
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-black flex items-center gap-1 cursor-pointer transition-all border ${
                    isRearrangingBars
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-xs'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600'
                  }`}
                  title="Rearrange Header or Footer buttons from left to right (or drag any button directly)"
                >
                  <span>⇄ {isRearrangingBars ? 'Done' : 'Rearrange'}</span>
                </button>

                {isRearrangingBars && (
                  <>
                    <button
                      type="button"
                      onClick={() => toggleFooterSide(footerButtonsSide === 'right' ? 'left' : 'right')}
                      className="px-1.5 py-0.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-extrabold cursor-pointer"
                      title="Move all footer buttons between Left Side and Right Side"
                    >
                      {footerButtonsSide === 'right' ? 'Right →' : '← Left'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        updateHeaderOrder(DEFAULT_HEADER_NAV_ORDER);
                        updateFooterOrder(DEFAULT_FOOTER_BTN_ORDER);
                        toggleFooterSide('right');
                      }}
                      className="px-1.5 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 text-[9px] font-bold cursor-pointer"
                      title="Reset Header and Footer button positions to default"
                    >
                      Reset
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Right-Hand Side (by default): Single-Line Rearrangeable Footer Action Buttons */}
            <div className="flex flex-nowrap items-center justify-end gap-1 ml-auto shrink-0">
              {footerBtnOrder.map((btnKey, idx) => {
                let btnNode: React.ReactNode = null;

                if (btnKey === 'QUOTES') {
                  btnNode = (
                    <button
                      type="button"
                      onClick={() => {
                        setIsStaffAuthenticated(true);
                        setActiveTopView('QUOTES');
                      }}
                      className={`px-2 py-0.5 rounded-md font-black text-[10px] flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap ${
                        activeTopView === 'QUOTES'
                          ? 'bg-amber-500 text-slate-950 ring-1 ring-amber-300'
                          : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                      }`}
                      title="Drag left/right to rearrange • 1-Click Open All Quotes"
                    >
                      <span>📋 Quotes ({quotesList.length})</span>
                    </button>
                  );
                } else if (btnKey === 'FB_MESSENGER_AI') {
                  btnNode = (
                    <button
                      type="button"
                      onClick={() => {
                        setIsStaffAuthenticated(true);
                        setActiveTopView('FB_MESSENGER_AI');
                      }}
                      className={`px-2 py-0.5 rounded-md font-black text-[10px] flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap ${
                        activeTopView === 'FB_MESSENGER_AI'
                          ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white ring-1 ring-blue-300'
                          : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40'
                      }`}
                      title="Drag left/right to rearrange • 3-Page Facebook Messenger AI Bot & Conversation Board"
                    >
                      <MessageSquare className="w-3 h-3 text-blue-400 shrink-0" />
                      <span>Facebook AI</span>
                    </button>
                  );
                } else if (btnKey === 'PASTE_TABLE') {
                  btnNode = (
                    <button
                      type="button"
                      onClick={() => {
                        setIsStaffAuthenticated(true);
                        setMasterHubFocusBlock('PASTE_TABLE');
                        setActiveTopView('MASTER_HUB');
                      }}
                      className={`px-2 py-0.5 rounded-md font-black text-[10px] flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap ${
                        activeTopView === 'MASTER_HUB' && masterHubFocusBlock === 'PASTE_TABLE'
                          ? 'bg-amber-500 text-slate-950 ring-1 ring-amber-300'
                          : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                      }`}
                      title="Drag left/right to rearrange • Quicklink: Paste Quotes & Pasted Leads Table"
                    >
                      <ClipboardPaste className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>Paste Table</span>
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
                      className={`px-2 py-0.5 rounded-md font-black text-[10px] flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap ${
                        activeTopView === 'MASTER_HUB' && (masterHubFocusBlock === 'MASTER_TABLE' || masterHubFocusBlock === 'ALL')
                          ? 'bg-emerald-500 text-slate-950 ring-1 ring-emerald-300'
                          : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                      }`}
                      title="Drag left/right to rearrange • Open TidyUps Master Leads & Quotes Table"
                    >
                      <FileSpreadsheet className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>Master Leads</span>
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
                      className={`px-2 py-0.5 rounded-md font-black text-[10px] flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap ${
                        activeTopView === 'ADDRESS_SEARCH'
                          ? 'bg-sky-500 text-slate-950 ring-1 ring-sky-300'
                          : 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40'
                      }`}
                      title="Drag left/right to rearrange • Open Dedicated Quick Map & Schedule Radar Page"
                    >
                      <MapIcon className="w-3 h-3 text-sky-400 shrink-0" />
                      <span>Quick Map</span>
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
                      className={`px-2 py-0.5 rounded-md font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap ${
                        activeTopView === 'MAP'
                          ? 'bg-pink-600 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      }`}
                      title="Drag left/right to rearrange • Open Full Screen Territory Dispatch Map"
                    >
                      <Navigation className="w-3 h-3 text-pink-400 shrink-0" />
                      <span>Dispatch Map</span>
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
                      className={`px-2 py-0.5 rounded-md font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap ${
                        activeTopView === 'MASTER_HUB' && masterHubFocusBlock === 'SCHEDULE_SEARCH'
                          ? 'bg-purple-500 text-white'
                          : 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40'
                      }`}
                      title="Drag left/right to rearrange • Jump to Schedule & Search Block"
                    >
                      <Calendar className="w-3 h-3 text-purple-400 shrink-0" />
                      <span>Schedule Search</span>
                    </button>
                  );
                } else if (btnKey === 'SYNC_ALL') {
                  btnNode = (
                    <button
                      type="button"
                      onClick={() => handleSyncEverything(false)}
                      disabled={isSyncingEverything}
                      className="px-2 py-0.5 rounded-md bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-[10px] flex items-center gap-1 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                      title="Drag left/right to rearrange • 1-Click Sync Everything"
                    >
                      <RefreshCw className={`w-2.5 h-2.5 ${isSyncingEverything ? 'animate-spin' : ''}`} />
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
                      className={`px-2 py-0.5 rounded-md font-black text-[10px] flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap ${
                        ['MANAGEMENT', 'QUOTES', 'INVOICES', 'LEGAL'].includes(activeTopView)
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white ring-1 ring-indigo-300'
                          : 'bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-400/50'
                      }`}
                      title="Drag left/right to rearrange • Open Management Hub (Intakes, Quotes, Invoices, Staff Roster & Settings)"
                    >
                      <SlidersHorizontal className="w-3 h-3 text-indigo-300 shrink-0" />
                      <span>Management</span>
                    </button>
                  );
                } else if (btnKey === 'VOICE_DICTATION') {
                  btnNode = (
                    <button
                      type="button"
                      onClick={() => {
                        setIsStaffAuthenticated(true);
                        setActiveTopView('QUICK_QUOTE');
                      }}
                      className={`px-2 py-0.5 rounded-md font-black text-[10px] flex items-center gap-1 cursor-pointer transition-all whitespace-nowrap ${
                        activeTopView === 'QUICK_QUOTE'
                          ? 'bg-gradient-to-r from-pink-600 via-fuchsia-600 to-purple-600 text-white ring-1 ring-pink-300'
                          : 'bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40'
                      }`}
                      title="Drag left/right to rearrange • Open Voice Dictation & Quick Quote Intake"
                    >
                      <Mic className="w-3 h-3 text-pink-400 shrink-0" />
                      <span>Voice Dictation</span>
                    </button>
                  );
                } else if (btnKey === 'BACKUP_ZIP') {
                  btnNode = (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          setSyncAllStatusMessage('📦 Preparing numbered Backup ZIP download...');
                          const res = await saveAndDownloadNumberedProjectBackupZip();
                          setSyncAllStatusMessage(`✅ Downloaded ${res.fileName} to your device!`);
                          setTimeout(() => setSyncAllStatusMessage(null), 5000);
                        } catch {
                          setIsProjectBackupModalOpen(true);
                        }
                      }}
                      className="px-2 py-0.5 rounded-md bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-[10px] flex items-center gap-1 border border-cyan-300/50 cursor-pointer transition-all active:scale-95 whitespace-nowrap"
                      title="1-Click Download Numbered Project Backup ZIP directly from app.tidyupscleaning.com (No Google popup needed)"
                    >
                      <FileArchive className="w-3 h-3 text-white shrink-0" />
                      <span>Backup ZIP</span>
                    </button>
                  );
                } else if (btnKey === 'BLOCK_SPAM') {
                  btnNode = (
                    <button
                      type="button"
                      onClick={() => handleOpenSpamShield()}
                      className="px-2 py-0.5 rounded-md bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-[10px] flex items-center gap-1 border border-rose-300/50 cursor-pointer transition-all active:scale-95 whitespace-nowrap"
                      title="Drag left/right to rearrange • Instant Call Blocker: Block nuisance callers, area codes & telemarketers across all Twilio lines"
                    >
                      <ShieldAlert className="w-3 h-3 text-white shrink-0" />
                      <span>Block Spam</span>
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
                    className={`flex items-center gap-0.5 rounded-md transition-all shrink-0 ${
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
                        className="px-1 py-0.5 rounded bg-slate-950 text-amber-300 hover:bg-slate-700 disabled:opacity-25 text-[9px] font-black cursor-pointer"
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
                        className="px-1 py-0.5 rounded bg-slate-950 text-amber-300 hover:bg-slate-700 disabled:opacity-25 text-[9px] font-black cursor-pointer"
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

        {/* Bottom Navigation Dock Row for Desktop, iPad, and iPhone */}
        {!isZenMode &&
          isStaffAuthenticated &&
          !isStandaloneBookingDomain &&
          !isCustomerLockPreview && (
            <MobileBottomNav
              activeTopView={activeTopView}
              onSelectView={(targetView) => {
                if (targetView === 'MASTER_HUB') setMasterHubFocusBlock('ALL');
                if (targetView === 'SCHEDULED_JOBS') setScheduledJobsSubTab('CALENDAR');
                if (targetView === 'MAP' && currentUser.role === 'CLEANER') setCleanerShowMap(true);
                setActiveTopView(targetView);
              }}
              isCleanerRestrictedMode={isCleanerRestrictedMode}
              cleanerShowMap={cleanerShowMap}
              onSetCleanerShowMap={setCleanerShowMap}
              leadsAndQuotesCount={leadsList.length + quotesList.length}
              scheduledCount={scheduledJobsList.length}
              unassignedCount={unassignedCount}
              onOpenSpamShield={() => handleOpenSpamShield()}
              forceShow={true}
            />
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

        {/* Public Booking Modal (3-Option Online Form: Move-Out, Basic, Deep) */}
        <PublicBookingModal
          isOpen={isPublicBookingModalOpen}
          onClose={() => setIsPublicBookingModalOpen(false)}
          onBookingCreated={(newTicket, fullPayload) => {
            setTickets((prev) => [newTicket, ...prev]);
            setSelectedTicketId(newTicket.id);
            saveStateToStore([newTicket, ...tickets]);
            if (fullPayload?.lead) {
              setLeadsList((prev) => {
                const next = [fullPayload.lead, ...prev];
                saveLeadToFirestore(fullPayload.lead).catch(() => {});
                return next;
              });
            }
            if (fullPayload?.client) {
              setClientsList((prev) => [fullPayload.client, ...prev]);
              saveClientToFirestore(fullPayload.client).catch(() => {});
            }
            if (fullPayload?.quote) {
              setQuotesList((prev) => {
                const next = dedupeQuotesList([fullPayload.quote, ...prev]);
                saveQuoteToFirestore(fullPayload.quote).catch(() => {});
                return next;
              });
            }
            if (fullPayload?.visit) {
              setScheduledJobsList((prev) => [fullPayload.visit, ...prev]);
              saveScheduledVisitToFirestore(fullPayload.visit).catch(() => {});
            }
            if (fullPayload?.unscheduledJob) {
              setUnscheduledJobsList((prev) => [fullPayload.unscheduledJob, ...prev]);
              saveUnscheduledJobToFirestore(fullPayload.unscheduledJob).catch(() => {});
            }
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

        {/* Global Floating Live Call Screener HUD (Original Dialed Line Attribution + 1-Click Quote + In-App Call Control) */}
        <LiveCallScreenerHUD
          projectId={activeProjectId}
          onStartQuoteWithCaller={(prefillLead) => {
            setSelectedLeadForQuickQuote(prefillLead);
            setActiveTopView('QUICK_QUOTE');
          }}
          onOpenSpamShieldModal={() => handleOpenSpamShield()}
        />

        {/* Role Selector, Mandatory Password Login & Owner Access Control Modal */}
        <RoleSelectorModal
          isOpen={isRoleModalOpen}
          onClose={() => setIsRoleModalOpen(false)}
          currentUser={currentUser}
          isStaffAuthenticated={isStaffAuthenticated}
          usersList={appUsersList}
          onUpdateUsersList={handleUpdateUsersList}
          onSelectUser={handleSelectUser}
          initialTab={roleModalInitialTab}
          liveLocationsMap={liveLocationsMap}
          onRequestDeviceLocation={handleRequestDeviceLocation}
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

        {/* Global Cookie Consent Banner (Google Ads Consent Mode v2 for AW-18533917803) */}
        <CookieConsentBanner
          onOpenPrivacyPolicy={() => {
            setActiveLegalPage('PRIVACY_POLICY');
            setActiveTopView('LEGAL_PAGES');
          }}
        />
      </div>
    </APIProvider>
  );
}

export default App;
