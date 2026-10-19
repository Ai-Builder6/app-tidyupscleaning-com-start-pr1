import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Calculator,
  Sparkles,
  Phone,
  User,
  MapPin,
  Calendar,
  Clock,
  Users,
  Tag,
  Copy,
  Check,
  CheckCircle2,
  ArrowRight,
  FileText,
  Send,
  Mic,
  MicOff,
  Home,
  Navigation,
  Compass,
  Award,
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Wand2,
  BedDouble,
  Bath,
  ClipboardList,
  ShieldAlert,
  FileArchive,
  FileSpreadsheet,
  DollarSign,
  ExternalLink,
  Route,
} from 'lucide-react';
import { getCustomerIntelligence } from '../services/customerIntelligenceService';
import { CustomerIntelligenceBadge } from './CustomerIntelligenceBadge';
import { QuoteDetailModal } from './QuoteDetailModal';
import { AddressAutocompleteInput } from './AddressAutocompleteInput';
import { AdLeadItem } from '../types/lead';
import { JobberQuote } from '../services/jobberSyncModules';
import { Technician, ServiceTicket } from '../types/dispatch';
import { INITIAL_TECHNICIANS } from '../data/cleaningData';
import { getEdmontonToday, formatDateTime } from '../data/jobberCalendarData';
import { ServiceCatalogModal } from './ServiceCatalogModal';
import { ServiceCatalogItem, CANONICAL_SERVICE_CATALOG, matchCatalogItem } from '../data/serviceCatalogData';
import { saveQuoteToFirestore, saveClientToFirestore } from '../services/firestoreSyncService';
import { syncLeadsToLiveGoogleSheetInDrive } from '../services/googleDriveBackupService';

function resolveQuickEdmontonCoords(address?: string): { lat: number; lng: number } {
  const norm = (address || '').toLowerCase();
  if (norm.includes('st. albert') || norm.includes('st albert') || norm.includes('boudreau')) return { lat: 53.6385, lng: -113.6268 };
  if (norm.includes('sherwood park') || norm.includes('premier way')) return { lat: 53.5320, lng: -113.3150 };
  if (norm.includes('spruce grove') || norm.includes('greenbury')) return { lat: 53.5465, lng: -113.8980 };
  if (norm.includes('beaumont')) return { lat: 53.3572, lng: -113.4146 };
  if (norm.includes('windermere') || norm.includes('ambleside')) return { lat: 53.4342, lng: -113.6045 };
  if (norm.includes('terwillegar')) return { lat: 53.4418, lng: -113.5882 };
  if (norm.includes('summerside') || norm.includes('ellingson')) return { lat: 53.4150, lng: -113.4650 };
  if (norm.includes('whyte') || norm.includes('82 ave')) return { lat: 53.5215, lng: -113.5040 };
  if (norm.includes('jasper')) return { lat: 53.5412, lng: -113.4988 };

  const isSW = /\bsw\b|southwest/i.test(norm);
  const aveMatch = norm.match(/(\d{1,3})[a-z]?\s*(?:ave|avenue)/i);
  const stMatch = norm.match(/(\d{1,3})[a-z]?\s*(?:st|street)/i);
  let lat = isSW ? 53.4350 : 53.5412;
  let lng = isSW ? -113.5650 : -113.4988;
  if (aveMatch) {
    const ave = parseInt(aveMatch[1], 10);
    lat = isSW && ave < 50 ? 53.4350 - ave * 0.0011 : 53.5412 + (ave - 100) * 0.00115;
  }
  if (stMatch) {
    const st = parseInt(stMatch[1], 10);
    lng = -113.4988 - (st - 100) * 0.00175;
  }
  return {
    lat: Math.max(53.30, Math.min(53.67, lat)),
    lng: Math.max(-113.70, Math.min(-113.28, lng)),
  };
}

interface QuickQuoteViewProps {
  initialLead?: AdLeadItem | null;
  technicians?: Technician[];
  onVisitCreated?: (visit: any) => void;
  onQuoteCreated?: (quote: any) => void;
  onBookingSubmitted?: (ticket: ServiceTicket) => void;
  onNavigateToMap?: () => void;
  onNavigateToSchedule?: () => void;
  onNavigateToIntakes?: () => void;
  calls?: any[];
  visits?: any[];
  clients?: any[];
  quotes?: any[];
  projectId?: 'dispatchgeeni' | 'tidyups';
  onOpenSpamShield?: (num?: string) => void;
  onOpenProjectBackup?: () => void;
  onClientsUpdated?: (clients: any[]) => void;
  onLeadsUpdated?: (leads: AdLeadItem[]) => void;
  serviceCatalog?: ServiceCatalogItem[];
  onCatalogUpdated?: (newCatalog: ServiceCatalogItem[]) => void;
}

const QUICK_ADDON_TAGS = [
  'Inside Oven',
  'Inside Fridge',
  'Baseboards Scrub',
  'Inside Cabinets',
  'Interior Windows',
  'Basement Included',
  'Pets in Home',
  'Lockbox Entry',
];

const SAMPLE_VOICE_PROMPTS = [
  {
    label: 'Devon Clarke (3 Bed / 2 Bath St. Albert)',
    text: 'Devon Clarke calling from 9620 144 Ave NW in St. Albert, phone 780-802-4918, email devonclarke@gmail.com. Needs Residential Standard Cleaning for a 3 bedroom 2 bathroom home, 3 hours with 1 cleaner. Please clean inside the oven and wipe baseboards.',
  },
  {
    label: 'Move-Out Clean (4 Bed / 2.5 Bath Edmonton)',
    text: 'Customer Sarah Jenkins at 10405 Jasper Ave NW Edmonton, phone 780-555-0144. Move-out cleaning for a 4 bedroom 2.5 bathroom house, 4 hours with 2 cleaners. Inside fridge, inside oven, and all cabinets. Lockbox code is 4482.',
  },
  {
    label: 'Deep Clean (2 Bed / 2 Bath Sherwood Park)',
    text: 'Client Marcus Vance at 2000 Premier Way Sherwood Park, phone 780-555-0188. Deep cleaning for a 2 bedroom 2 bathroom condo, 3 hours with 1 cleaner. Has one friendly dog, please focus on bathrooms and baseboards.',
  },
];

function playVoiceChime(type: 'start' | 'stop') {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    if (type === 'start') {
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
    } else {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
    }
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  } catch {}
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const QuickQuoteView: React.FC<QuickQuoteViewProps> = ({
  initialLead,
  technicians = INITIAL_TECHNICIANS,
  onVisitCreated,
  onQuoteCreated,
  onBookingSubmitted,
  onNavigateToMap,
  onNavigateToSchedule,
  onNavigateToIntakes,
  calls = [],
  visits = [],
  clients = [],
  quotes = [],
  projectId = 'tidyups',
  onOpenSpamShield,
  onOpenProjectBackup,
  onClientsUpdated,
  onLeadsUpdated,
  serviceCatalog,
  onCatalogUpdated,
}) => {
  // Service Catalog Price List state
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState<boolean>(false);
  const [localCatalog, setLocalCatalog] = useState<ServiceCatalogItem[]>(serviceCatalog || CANONICAL_SERVICE_CATALOG);

  useEffect(() => {
    if (serviceCatalog && serviceCatalog.length > 0) {
      setLocalCatalog(serviceCatalog);
    }
  }, [serviceCatalog]);

  // 1. Live Voice Dictation + Parallel Audio Recording + Live Green Block Highlighting state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [isParsingVoice, setIsParsingVoice] = useState<boolean>(false);
  const [voiceStatusMsg, setVoiceStatusMsg] = useState<string | null>(null);
  const [reconciliationNote, setReconciliationNote] = useState<string | null>(null);
  const [hasParallelAudio, setHasParallelAudio] = useState<boolean>(false);
  const [flashingFields, setFlashingFields] = useState<Record<string, boolean>>({});
  const [voiceCapturedFields, setVoiceCapturedFields] = useState<Record<string, string>>({});
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const flashTimersRef = useRef<Record<string, any>>({});
  const liveValuesRef = useRef<{
    name: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    bedrooms: string;
    bathrooms: string;
    serviceType: string;
    hours: number;
    crew: string;
    notes: string;
  }>({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: 'Edmonton',
    bedrooms: '3 Bedrooms',
    bathrooms: '2 Bathrooms',
    serviceType: 'Residential Standard Cleaning',
    hours: 3,
    crew: '1_CLEANER',
    notes: '',
  });

  const triggerFieldHighlight = useCallback((fieldKey: string, capturedLabel?: string) => {
    setFlashingFields((prev) => ({ ...prev, [fieldKey]: true }));
    if (capturedLabel) {
      setVoiceCapturedFields((prev) => ({ ...prev, [fieldKey]: capturedLabel }));
    }
    if (flashTimersRef.current[fieldKey]) {
      clearTimeout(flashTimersRef.current[fieldKey]);
    }
    flashTimersRef.current[fieldKey] = setTimeout(() => {
      setFlashingFields((prev) => ({ ...prev, [fieldKey]: false }));
    }, 4500);
  }, []);

  // 2. Hours & Crew Calculator + Custom Discount + Deposit Link
  const [hours, setHours] = useState<number>(3);
  const [crewSelection, setCrewSelection] = useState<'1_CLEANER' | '2_CLEANERS' | 'CUSTOM'>('1_CLEANER');
  const [customHourlyRate, setCustomHourlyRate] = useState<number>(55);
  const [selectedSource, setSelectedSource] = useState<string>(initialLead?.source || 'Phone / Voice Intake');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [fuelSurcharge, setFuelSurcharge] = useState<number>(12.50);
  const [depositAmount, setDepositAmount] = useState<number>(50);
  const [showDepositPanel, setShowDepositPanel] = useState<boolean>(true);
  const [applyTax, setApplyTax] = useState<boolean>(true);
  const taxRate = 0.125; // 12.5% tax

  // Google Exact Layout Sync State
  const [googleSyncedRow, setGoogleSyncedRow] = useState<any | null>(null);
  const [googleSyncedTsv, setGoogleSyncedTsv] = useState<string>('');
  const [copiedGoogleRow, setCopiedGoogleRow] = useState<boolean>(false);

  // 3. Customer Request & Intake Form Fields (Matches Customer Booking Page + Bedrooms & Bathrooms & Specific Info)
  const [customerName, setCustomerName] = useState<string>(initialLead?.customerName || '');
  const [customerPhone, setCustomerPhone] = useState<string>(initialLead?.phone || '');
  const [customerEmail, setCustomerEmail] = useState<string>(initialLead?.email || '');
  const [serviceAddress, setServiceAddress] = useState<string>(initialLead?.address || '10405 Jasper Ave NW, Edmonton, AB');
  const [city, setCity] = useState<string>('Edmonton');
  const [bedrooms, setBedrooms] = useState<string>('3 Bedrooms');
  const [bathrooms, setBathrooms] = useState<string>('2 Bathrooms');
  const [serviceType, setServiceType] = useState<string>(
    initialLead?.serviceRequested || 'Residential Standard Cleaning'
  );
  // Live Edmonton Today tracker (e.g., Wednesday, October 14, 2026) — updates automatically every 60s
  const [liveToday, setLiveToday] = useState(() => getEdmontonToday());
  useEffect(() => {
    const timer = setInterval(() => {
      const next = getEdmontonToday();
      setLiveToday((prev) => (prev.dateString !== next.dateString ? next : prev));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const [scheduledDate, setScheduledDate] = useState<string>(() => getEdmontonToday().dateString);
  const [scheduledTime, setScheduledTime] = useState<string>('10:00');
  const [timeWindow, setTimeWindow] = useState<string>('Morning (8:00 AM - 12:00 PM)');
  // Default to No One (empty array) so no cleaner is auto-assigned until dispatcher adds 1 or more people
  const [assignedCleaners, setAssignedCleaners] = useState<string[]>([]);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [quoteNotes, setQuoteNotes] = useState<string>(initialLead?.notes || '');

  const toggleCleanerSelection = useCallback((cleanerName: string) => {
    if (!cleanerName) return;
    setAssignedCleaners((prev) =>
      prev.includes(cleanerName) ? prev.filter((c) => c !== cleanerName) : [...prev, cleanerName]
    );
  }, []);

  const addCleanerSelection = useCallback((cleanerName: string) => {
    if (!cleanerName || cleanerName === 'NONE') {
      setAssignedCleaners([]);
      return;
    }
    setAssignedCleaners((prev) => (prev.includes(cleanerName) ? prev : [...prev, cleanerName]));
  }, []);

  const removeCleanerSelection = useCallback((cleanerName: string) => {
    setAssignedCleaners((prev) => prev.filter((c) => c !== cleanerName));
  }, []);

  // 4. Quick Map, Two-Address Picker & Weekly/Monthly Schedule State
  const [targetCoords, setTargetCoords] = useState<{ lat: number; lng: number }>({
    lat: 53.5412,
    lng: -113.4988,
  });
  const [secondAddress, setSecondAddress] = useState<string>('9620 144 Ave NW, St. Albert, AB');
  const [secondCoords, setSecondCoords] = useState<{ lat: number; lng: number }>({
    lat: 53.6385,
    lng: -113.6268,
  });
  const [showTwoAddressCompare, setShowTwoAddressCompare] = useState<boolean>(true);
  const [scheduleHorizon, setScheduleHorizon] = useState<
    'TODAY' | 'TOMORROW' | 'CUSTOM_DATE' | 'WEEK' | 'WEEKS_3_4' | 'MONTH' | 'WEEK_1' | 'WEEK_2' | 'WEEK_3' | 'WEEK_4' | 'ALL'
  >('CUSTOM_DATE');
  const [selectedQuickMapDate, setSelectedQuickMapDate] = useState<string>(() => getEdmontonToday().dateString);
  const [isGeocodingMap, setIsGeocodingMap] = useState<boolean>(false);
  const [quickMapType, setQuickMapType] = useState<'roadmap' | 'hybrid'>('roadmap');
  const [quickMapZoom, setQuickMapZoom] = useState<number>(1.2);
  const [quickMapPan, setQuickMapPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingMap, setIsDraggingMap] = useState<boolean>(false);
  const [mapDragStart, setMapDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // UI state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const isSubmittingRef = useRef<boolean>(false);
  const [copiedBreakdown, setCopiedBreakdown] = useState<boolean>(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<'success' | 'warning'>('success');
  const [isSyncingLiveSheet, setIsSyncingLiveSheet] = useState<boolean>(false);
  const [activeSheetUrl, setActiveSheetUrl] = useState<string>(
    'https://docs.google.com/spreadsheets/d/1TifULi7n2BylQdvla-8DRvYHul_A1wXXzypUdBJwEeA/edit'
  );
  const [createdQuoteModalItem, setCreatedQuoteModalItem] = useState<JobberQuote | null>(null);

  useEffect(() => {
    fetch(`/api/google-sheets/config?project=${projectId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.createdDriveSheetUrl) {
          setActiveSheetUrl(d.createdDriveSheetUrl);
        } else if (d?.sheetUrl && !String(d.sheetUrl).includes('clean_sheet')) {
          setActiveSheetUrl(d.sheetUrl);
        }
      })
      .catch(() => {});
  }, [projectId]);

  // Sync initialLead if changed
  useEffect(() => {
    if (initialLead) {
      if (initialLead.customerName) setCustomerName(initialLead.customerName);
      if (initialLead.phone) setCustomerPhone(initialLead.phone);
      if (initialLead.email) setCustomerEmail(initialLead.email);
      if (initialLead.address) {
        setServiceAddress(initialLead.address);
        geocodeAddressOnQuickMap(initialLead.address);
      }
      if (initialLead.serviceRequested) setServiceType(initialLead.serviceRequested);
      if (initialLead.notes) setQuoteNotes(initialLead.notes);
    }
  }, [initialLead]);

  // Geocode address to update the Quick Map & Closest Cleaners
  const geocodeAddressOnQuickMap = useCallback(async (addr: string, isSecond = false) => {
    if (!addr || addr.trim().length < 4) return;
    const instant = resolveQuickEdmontonCoords(addr);
    if (isSecond) {
      setSecondCoords(instant);
    } else {
      setTargetCoords(instant);
    }
    setIsGeocodingMap(true);
    try {
      const res = await fetch(`/api/geocode/forward?address=${encodeURIComponent(addr.trim())}`);
      const data = await res.json();
      if (data && typeof data.lat === 'number' && typeof data.lng === 'number') {
        if (isSecond) {
          setSecondCoords({ lat: data.lat, lng: data.lng });
        } else {
          setTargetCoords({ lat: data.lat, lng: data.lng });
          setQuickMapPan({ x: 0, y: 0 });
        }
      }
    } catch {} finally {
      setIsGeocodingMap(false);
    }
  }, []);

  // Fast live client-side extraction that runs IN REAL TIME as the user speaks into the microphone
  const applyLiveSpeechExtraction = useCallback(
    (rawSpeech: string, isFinalMerge = false) => {
      const t = (rawSpeech || '').trim();
      if (!t) return;

      const singleDigitWordMap: Record<string, string> = {
        zero: '0',
        oh: '0',
        one: '1',
        two: '2',
        three: '3',
        four: '4',
        five: '5',
        six: '6',
        seven: '7',
        eight: '8',
        nine: '9',
      };

      const normalized = t
        .replace(/\b(one|two|three|four|1|2|3|4)\s+and\s+a\s+half\b/gi, (_, d) => {
          const base = singleDigitWordMap[String(d).toLowerCase()] || d;
          return `${base}.5`;
        })
        .replace(
          /\b(?:(zero|oh|one|two|three|four|five|six|seven|eight|nine)(?:[\s-]+|$)){2,10}/gi,
          (seq) => {
            const trailingSpace = /\s$/.test(seq) ? ' ' : '';
            const digits = seq
              .trim()
              .split(/[\s-]+/)
              .map((w) => singleDigitWordMap[w.toLowerCase()] ?? w)
              .join('');
            return digits + trailingSpace;
          }
        )
        .replace(/\b(one|two|three|four|five|six|seven|eight|nine)\b/gi, (m) => singleDigitWordMap[m.toLowerCase()] || m)
        .replace(/\b(?:child'?s|shrivers?|shivers?)\s+place\b/gi, 'Chivers Place')
        .replace(/\b(?:child'?s|shrivers?|shivers?)\s+way\b/gi, 'Chivers Way')
        .replace(/\bsouth\s*west\b/gi, 'SW')
        .replace(/\bnorth\s*west\b/gi, 'NW')
        .replace(/\bsouth\s*east\b/gi, 'SE')
        .replace(/\bnorth\s*east\b/gi, 'NE');

      const lower = normalized.toLowerCase();
      const newlyHighlighted: string[] = [];

      // 1. Live Customer Name detection
      const stopWords = new Set([
        'calling', 'from', 'at', 'phone', 'number', 'needs', 'need', 'wants', 'want', 'looking', 'for',
        'okay', 'ok', 'and', 'what', 'whats', 'is', 'your', 'address', 'seven', 'two', 'one', 'three',
        'four', 'five', 'six', 'eight', 'nine', 'bedroom', 'bedrooms', 'bathroom', 'bathrooms', 'clean', 'cleaning',
      ]);
      const namePatterns = [
        /(?:my name is|caller'?s? name is|name is|caller is|client is|customer is|this is)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+){0,2})/i,
        /(?:for|client|customer)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})/,
        /^([A-Z][a-z]+\s+[A-Z][a-z]+)\b/,
      ];
      for (const pat of namePatterns) {
        const m = normalized.match(pat) || t.match(pat);
        if (m && m[1]) {
          const rawTokens = m[1]
            .trim()
            .split(/\s+/)
            .filter((w) => w.length >= 2 && !stopWords.has(w.toLowerCase()));
          const deduped: string[] = [];
          for (const tok of rawTokens) {
            if (!deduped.some((ex) => ex.toLowerCase() === tok.toLowerCase())) {
              deduped.push(tok.charAt(0).toUpperCase() + tok.slice(1));
            }
            if (deduped.length >= 2) break;
          }
          const candidateName = deduped.join(' ');
          if (candidateName && candidateName !== liveValuesRef.current.name) {
            liveValuesRef.current.name = candidateName;
            setCustomerName(candidateName);
            triggerFieldHighlight('name', candidateName);
            newlyHighlighted.push(`Name: ${candidateName}`);
          }
          break;
        }
      }

      // 2. Live Phone Number detection
      const phoneMatch =
        normalized.match(/\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/) ||
        t.match(/\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/) ||
        normalized.match(/\b(780|587|825|403)[-.\s]?([0-9]{3})[-.\s]?([0-9]{3,4})\b/);
      if (phoneMatch) {
        const formattedPhone = `(${phoneMatch[1]}) ${phoneMatch[2]}-${phoneMatch[3]}`;
        if (formattedPhone !== liveValuesRef.current.phone) {
          liveValuesRef.current.phone = formattedPhone;
          setCustomerPhone(formattedPhone);
          triggerFieldHighlight('phone', formattedPhone);
          newlyHighlighted.push(`Phone: ${formattedPhone}`);
        }
      }

      // 3. Live Email detection
      const emailMatch = t.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
      if (emailMatch && emailMatch[0] !== liveValuesRef.current.email) {
        liveValuesRef.current.email = emailMatch[0];
        setCustomerEmail(emailMatch[0]);
        triggerFieldHighlight('email', emailMatch[0]);
        newlyHighlighted.push(`Email: ${emailMatch[0]}`);
      }

      // 4. Live City detection
      let detectedCity = liveValuesRef.current.city || 'Edmonton';
      if (lower.includes('st albert') || lower.includes('st. albert') || lower.includes('boudreau')) {
        detectedCity = 'St. Albert';
      } else if (lower.includes('sherwood park') || lower.includes('premier way')) {
        detectedCity = 'Sherwood Park';
      } else if (lower.includes('spruce grove')) {
        detectedCity = 'Spruce Grove';
      } else if (lower.includes('leduc')) {
        detectedCity = 'Leduc';
      }
      if (detectedCity !== liveValuesRef.current.city) {
        liveValuesRef.current.city = detectedCity;
        setCity(detectedCity);
        triggerFieldHighlight('city', detectedCity);
      }

      // 5. Live Street Address detection
      const addrRegex =
        /\b(\d{2,5}\s+[A-Za-z0-9.'\s]{2,28}?\b(?:Ave|Avenue|St|Street|Rd|Road|Dr|Drive|Blvd|Boulevard|Way|Pl|Place|Cres|Crescent|Trail|Tr|Ct|Court|Close|Lane|Ln)\b(?:\s*(?:NW|NE|SW|SE))?)/gi;
      const addrMatches = Array.from(normalized.matchAll(addrRegex));
      if (addrMatches.length > 0) {
        const bestStreet = addrMatches[addrMatches.length - 1][1].replace(/\s+/g, ' ').trim();
        const fullAddr = `${bestStreet}, ${detectedCity}, AB`;
        if (fullAddr !== liveValuesRef.current.address) {
          liveValuesRef.current.address = fullAddr;
          setServiceAddress(fullAddr);
          geocodeAddressOnQuickMap(fullAddr);
          triggerFieldHighlight('address', bestStreet);
          newlyHighlighted.push(`Address: ${bestStreet}`);
        }
      }

      // 6. Live Bedrooms & Bathrooms detection
      let nextBedrooms = liveValuesRef.current.bedrooms;
      const bedMatch = normalized.match(/\b([1-6])\s*(?:\+)?\s*(?:bed|beds|bedroom|bedrooms|bdrm|br)\b/i);
      if (bedMatch) {
        const n = parseInt(bedMatch[1], 10);
        const mappedBed = n === 1 ? '1 Bedroom' : n >= 5 ? '5+ Bedrooms' : `${n} Bedrooms`;
        if (mappedBed !== liveValuesRef.current.bedrooms) {
          nextBedrooms = mappedBed;
          liveValuesRef.current.bedrooms = mappedBed;
          setBedrooms(mappedBed);
          triggerFieldHighlight('bedrooms', mappedBed);
          newlyHighlighted.push(mappedBed);
        }
      }

      let nextBathrooms = liveValuesRef.current.bathrooms;
      const bathMatch = normalized.match(/\b([1-5](?:\.5)?)\s*(?:\+)?\s*(?:bath|baths|bathroom|bathrooms|ba)\b/i);
      if (bathMatch) {
        const b = parseFloat(bathMatch[1]);
        const mappedBath =
          b === 1
            ? '1 Bathroom'
            : b === 1.5
            ? '1.5 Bathrooms'
            : b === 2
            ? '2 Bathrooms'
            : b === 2.5
            ? '2.5 Bathrooms'
            : b === 3
            ? '3 Bathrooms'
            : '4+ Bathrooms';
        if (mappedBath !== liveValuesRef.current.bathrooms) {
          nextBathrooms = mappedBath;
          liveValuesRef.current.bathrooms = mappedBath;
          setBathrooms(mappedBath);
          triggerFieldHighlight('bathrooms', mappedBath);
          newlyHighlighted.push(mappedBath);
        }
      }

      // 7. Live Service Type detection
      let nextServiceType = liveValuesRef.current.serviceType;
      if (lower.includes('move out') || lower.includes('move-out') || lower.includes('vacate')) {
        nextServiceType = 'Move-Out / Turnover Vacate Cleaning';
      } else if (lower.includes('move in') || lower.includes('move-in') || lower.includes('airbnb')) {
        nextServiceType = 'Move-In Detailed Sanitization';
      } else if (lower.includes('post-reno') || lower.includes('renovation')) {
        nextServiceType = 'Post-Renovation HEPA Vacuum & Scrub';
      } else if (lower.includes('commercial') || lower.includes('office')) {
        nextServiceType = 'Commercial Office Cleaning';
      } else if (lower.includes('deep clean') || lower.includes('deep scrub')) {
        nextServiceType = 'Deep Cleaning & Baseboards';
      } else if (lower.includes('standard') || lower.includes('basic clean') || lower.includes('regular clean')) {
        nextServiceType = 'Residential Standard Cleaning';
      }
      if (nextServiceType !== liveValuesRef.current.serviceType) {
        liveValuesRef.current.serviceType = nextServiceType;
        setServiceType(nextServiceType);
        triggerFieldHighlight('serviceType', nextServiceType);
      }

      // Auto-sync catalog hours/cleaners when bedrooms or bathrooms change live
      const explicitHoursMatch = normalized.match(/\b([1-8](?:\.5)?)\s*(?:hour|hours|hr|hrs)\b/i);
      const explicitCleanersMatch = normalized.match(/\b([1-3])\s*(?:cleaner|cleaners|person|people|techs|crew)\b/i);
      if (explicitHoursMatch) {
        const h = parseFloat(explicitHoursMatch[1]);
        if (h !== liveValuesRef.current.hours) {
          liveValuesRef.current.hours = h;
          setHours(h);
          triggerFieldHighlight('hours', `${h} hrs`);
        }
      }
      if (explicitCleanersMatch) {
        const c = parseInt(explicitCleanersMatch[1], 10) >= 2 ? '2_CLEANERS' : '1_CLEANER';
        if (c !== liveValuesRef.current.crew) {
          liveValuesRef.current.crew = c;
          setCrewSelection(c);
          triggerFieldHighlight('cleaners', c === '2_CLEANERS' ? '2 Cleaners' : '1 Cleaner');
        }
      } else if (bedMatch || bathMatch) {
        const catMatch = matchCatalogItem(
          nextServiceType,
          nextBedrooms,
          nextBathrooms,
          localCatalog || CANONICAL_SERVICE_CATALOG
        );
        if (catMatch) {
          const catHours = catMatch.quantity ?? catMatch.baseHours ?? 3;
          const catCrew = (catMatch.cleanersCount || 2) >= 2 ? '2_CLEANERS' : '1_CLEANER';
          if (catHours !== liveValuesRef.current.hours || catCrew !== liveValuesRef.current.crew) {
            liveValuesRef.current.hours = catHours;
            liveValuesRef.current.crew = catCrew;
            setHours(catHours);
            setCrewSelection(catCrew);
            if (catMatch.depositRequired !== undefined) {
              setDepositAmount(catMatch.depositRequired);
              triggerFieldHighlight('deposit', `$${catMatch.depositRequired} Dep`);
            }
            triggerFieldHighlight('hours', `${catHours} hrs`);
            triggerFieldHighlight('cleaners', catCrew === '2_CLEANERS' ? '2 Cleaners' : '1 Cleaner');
          }
        }
      }

      // 8. Live Add-ons & Notes
      const matchedTags: string[] = [];
      if (lower.includes('oven')) matchedTags.push('Inside Oven');
      if (lower.includes('fridge') || lower.includes('refrigerator')) matchedTags.push('Inside Fridge');
      if (lower.includes('baseboard')) matchedTags.push('Baseboards Scrub');
      if (lower.includes('cabinet') || lower.includes('cupboard')) matchedTags.push('Inside Cabinets');
      if (lower.includes('window')) matchedTags.push('Interior Windows');
      if (lower.includes('basement')) matchedTags.push('Basement Included');
      if (lower.includes('pet') || lower.includes('dog') || lower.includes('cat')) matchedTags.push('Pets in Home');
      if (lower.includes('lockbox') || lower.includes('code') || lower.includes('keypad')) matchedTags.push('Lockbox Entry');
      if (matchedTags.length > 0) {
        setSelectedAddons((prev) => {
          const merged = Array.from(new Set([...prev, ...matchedTags]));
          if (merged.length !== prev.length) {
            triggerFieldHighlight('notes', `${merged.length} Add-ons`);
          }
          return merged;
        });
      }

      if (isFinalMerge && t.length > 5 && t !== liveValuesRef.current.notes) {
        liveValuesRef.current.notes = t;
        setQuoteNotes(t);
        triggerFieldHighlight('notes', 'Notes Filled');
      }

      if (newlyHighlighted.length > 0) {
        setVoiceStatusMsg(`⚡ Live Filled: ${newlyHighlighted.join(' • ')}`);
      }
    },
    [geocodeAddressOnQuickMap, localCatalog, triggerFieldHighlight]
  );

  // Convert recorded audio Blob to base64 string for dual Audio + Transcript comparison
  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = String(reader.result || '');
        const base64 = res.includes(',') ? res.split(',')[1] : res;
        resolve(base64);
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });

  // Parse voice transcript + parallel recorded audio (Dual-Source Audio + Transcript Reconciliation)
  const handleExtractFromTranscript = useCallback(
    async (rawText?: string, recordedAudioBlob?: Blob | null) => {
      const textToParse = (rawText ?? voiceTranscript).trim();
      if (!textToParse && !recordedAudioBlob) {
        setVoiceStatusMsg('Please speak or type caller details first.');
        return;
      }

      // Immediately run client-side live extraction so blocks light up right away
      if (textToParse) {
        applyLiveSpeechExtraction(textToParse, true);
      }

      setIsParsingVoice(true);
      setVoiceStatusMsg(
        recordedAudioBlob
          ? 'Comparing Recorded Audio + Live Transcript to merge into 1 complete client...'
          : 'Extracting & verifying caller name, phone, address, bedrooms, bathrooms & cleaning details...'
      );

      try {
        let audioBase64 = '';
        let audioMimeType = 'audio/webm';
        if (recordedAudioBlob && recordedAudioBlob.size > 0) {
          audioMimeType = recordedAudioBlob.type || 'audio/webm';
          audioBase64 = await blobToBase64(recordedAudioBlob);
        }

        const res = await fetch('/api/dispatch/parse-voice-ticket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript: textToParse,
            audioBase64: audioBase64 || undefined,
            audioMimeType,
            currentForm: {
              customerName: liveValuesRef.current.name || customerName,
              customerPhone: liveValuesRef.current.phone || customerPhone,
              serviceAddress: liveValuesRef.current.address || serviceAddress,
              bedrooms: liveValuesRef.current.bedrooms || bedrooms,
              bathrooms: liveValuesRef.current.bathrooms || bathrooms,
            },
          }),
        });
        const data = await res.json();

        if (data) {
          if (data.customerName && data.customerName !== 'Residential Client') {
            liveValuesRef.current.name = data.customerName;
            setCustomerName(data.customerName);
            triggerFieldHighlight('name', data.customerName);
          }
          if (data.phone) {
            liveValuesRef.current.phone = data.phone;
            setCustomerPhone(data.phone);
            triggerFieldHighlight('phone', data.phone);
          }
          if (data.email) {
            liveValuesRef.current.email = data.email;
            setCustomerEmail(data.email);
            triggerFieldHighlight('email', data.email);
          }
          if (data.city) {
            liveValuesRef.current.city = data.city;
            setCity(data.city);
            triggerFieldHighlight('city', data.city);
          }
          if (data.address) {
            liveValuesRef.current.address = data.address;
            setServiceAddress(data.address);
            geocodeAddressOnQuickMap(data.address);
            triggerFieldHighlight('address', data.address);
          }
          if (data.bedrooms) {
            liveValuesRef.current.bedrooms = data.bedrooms;
            setBedrooms(data.bedrooms);
            triggerFieldHighlight('bedrooms', data.bedrooms);
          }
          if (data.bathrooms) {
            liveValuesRef.current.bathrooms = data.bathrooms;
            setBathrooms(data.bathrooms);
            triggerFieldHighlight('bathrooms', data.bathrooms);
          }
          if (data.serviceCategory) {
            liveValuesRef.current.serviceType = data.serviceCategory;
            setServiceType(data.serviceCategory);
            triggerFieldHighlight('serviceType', data.serviceCategory);
          }

          // Match canonical price catalog for the reconciled bedrooms/bathrooms/service
          const catMatch = matchCatalogItem(
            data.serviceCategory || liveValuesRef.current.serviceType || serviceType,
            data.bedrooms || liveValuesRef.current.bedrooms || bedrooms,
            data.bathrooms || liveValuesRef.current.bathrooms || bathrooms,
            localCatalog || CANONICAL_SERVICE_CATALOG
          );
          if (catMatch) {
            const catHours = catMatch.quantity ?? catMatch.baseHours ?? 3;
            const catCrew = (catMatch.cleanersCount || 2) >= 2 ? '2_CLEANERS' : '1_CLEANER';
            liveValuesRef.current.hours = catHours;
            liveValuesRef.current.crew = catCrew;
            setHours(catHours);
            setCrewSelection(catCrew);
            if (catMatch.depositRequired !== undefined) {
              setDepositAmount(catMatch.depositRequired);
              triggerFieldHighlight('deposit', `$${catMatch.depositRequired} Dep`);
            }
            triggerFieldHighlight('hours', `${catHours} hrs`);
            triggerFieldHighlight('cleaners', catCrew === '2_CLEANERS' ? '2 Cleaners' : '1 Cleaner');
          } else {
            if (typeof data.recommendedHours === 'number' && data.recommendedHours > 0) {
              liveValuesRef.current.hours = data.recommendedHours;
              setHours(data.recommendedHours);
              triggerFieldHighlight('hours', `${data.recommendedHours} hrs`);
            }
            if (data.recommendedCleaners === 2) {
              liveValuesRef.current.crew = '2_CLEANERS';
              setCrewSelection('2_CLEANERS');
              triggerFieldHighlight('cleaners', '2 Cleaners');
            } else if (data.recommendedCleaners === 1) {
              liveValuesRef.current.crew = '1_CLEANER';
              setCrewSelection('1_CLEANER');
              triggerFieldHighlight('cleaners', '1 Cleaner');
            }
          }

          if (data.specificInstructions) {
            liveValuesRef.current.notes = data.specificInstructions;
            setQuoteNotes(data.specificInstructions);
            triggerFieldHighlight('notes', 'Notes Reconciled');
          } else if (textToParse) {
            liveValuesRef.current.notes = textToParse;
            setQuoteNotes(textToParse);
            triggerFieldHighlight('notes', 'Notes Filled');
          }

          // Auto-select any detected add-on tags
          const lower = textToParse.toLowerCase();
          const matchedTags: string[] = [];
          if (lower.includes('oven')) matchedTags.push('Inside Oven');
          if (lower.includes('fridge') || lower.includes('refrigerator')) matchedTags.push('Inside Fridge');
          if (lower.includes('baseboard')) matchedTags.push('Baseboards Scrub');
          if (lower.includes('cabinet') || lower.includes('cupboard')) matchedTags.push('Inside Cabinets');
          if (lower.includes('window')) matchedTags.push('Interior Windows');
          if (lower.includes('basement')) matchedTags.push('Basement Included');
          if (lower.includes('pet') || lower.includes('dog') || lower.includes('cat')) matchedTags.push('Pets in Home');
          if (lower.includes('lockbox') || lower.includes('code') || lower.includes('keypad')) matchedTags.push('Lockbox Entry');
          if (matchedTags.length > 0) {
            setSelectedAddons(matchedTags);
          }

          // Detect deposit ($50 or $100) and custom discount ($40 etc.) from voice dictation
          const depMatch =
            lower.match(/\$?\s*(\d+)\s*(?:dollar\s*)?deposit/i) ||
            lower.match(/deposit\s*(?:of\s*)?\$?\s*(\d+)/i);
          if (depMatch) {
            const depVal = Number(depMatch[1]) || 50;
            setDepositAmount(depVal);
            setShowDepositPanel(true);
            triggerFieldHighlight('deposit', `$${depVal} Dep`);
          }
          const discMatch =
            lower.match(/\$?\s*(\d+)\s*(?:dollar\s*)?(?:discount|off)/i) ||
            lower.match(/discount\s*(?:of\s*)?\$?\s*(\d+)/i);
          if (discMatch) {
            const discVal = Number(discMatch[1]) || 0;
            setDiscountAmount(discVal);
            triggerFieldHighlight('discount', `-$${discVal}`);
          }

          if (data.reconciliationSummary) {
            setReconciliationNote(data.reconciliationSummary);
          }
          setVoiceStatusMsg(
            `✓ Reconciled into 1 Complete Client: ${data.customerName || liveValuesRef.current.name || 'Caller'} • ${
              data.bedrooms || bedrooms
            } / ${data.bathrooms || bathrooms} • ${data.address || liveValuesRef.current.address || city}`
          );
        }
      } catch (err: any) {
        setVoiceStatusMsg('Extracted caller details into form fields.');
      } finally {
        setIsParsingVoice(false);
      }
    },
    [
      voiceTranscript,
      customerName,
      customerPhone,
      serviceAddress,
      bedrooms,
      bathrooms,
      serviceType,
      city,
      localCatalog,
      geocodeAddressOnQuickMap,
      applyLiveSpeechExtraction,
      triggerFieldHighlight,
    ]
  );

  // Toggle Web Speech API live microphone dictation + Parallel MediaRecorder Audio Capture
  const handleToggleVoiceDictation = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsRecording(false);
      playVoiceChime('stop');

      // Stop parallel MediaRecorder and compare recorded audio + live transcript together
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        const recorder = mediaRecorderRef.current;
        recorder.onstop = () => {
          const audioBlob =
            audioChunksRef.current.length > 0
              ? new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
              : null;
          try {
            recorder.stream.getTracks().forEach((track) => track.stop());
          } catch {}
          setHasParallelAudio(Boolean(audioBlob && audioBlob.size > 0));
          handleExtractFromTranscript(voiceTranscript, audioBlob);
        };
        try {
          recorder.stop();
        } catch {
          if (voiceTranscript.trim()) {
            handleExtractFromTranscript(voiceTranscript, null);
          }
        }
      } else if (voiceTranscript.trim()) {
        handleExtractFromTranscript(voiceTranscript, null);
      }
      return;
    }

    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setVoiceStatusMsg(
        'Browser microphone API not detected — type or paste your dictation in the box below and click "AI Fill Form Blanks".'
      );
      return;
    }

    try {
      // 1. Start parallel MediaRecorder audio stream so we can compare Audio + Transcript
      audioChunksRef.current = [];
      setHasParallelAudio(false);
      setReconciliationNote(null);
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices
          .getUserMedia({ audio: true })
          .then((stream) => {
            try {
              const mr = new MediaRecorder(stream);
              mr.ondataavailable = (ev) => {
                if (ev.data && ev.data.size > 0) {
                  audioChunksRef.current.push(ev.data);
                }
              };
              mr.start(1000);
              mediaRecorderRef.current = mr;
              setHasParallelAudio(true);
            } catch {}
          })
          .catch(() => {});
      }

      // 2. Start live Web Speech API recognition with real-time field extraction & green block highlighting
      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-CA';

      recognition.onstart = () => {
        setIsRecording(true);
        setVoiceStatusMsg(
          'Listening live (Audio + Transcript active)... Each field block will light up bright green as you speak!'
        );
        playVoiceChime('start');
      };

      recognition.onresult = (event: any) => {
        let finalChunk = '';
        let interimChunk = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalChunk += t + ' ';
          } else {
            interimChunk += t;
          }
        }
        setVoiceTranscript((prev) => {
          const updated = finalChunk ? `${prev} ${finalChunk}`.trim() : prev;
          const combinedLiveStream = `${updated} ${interimChunk}`.trim();
          if (combinedLiveStream) {
            applyLiveSpeechExtraction(combinedLiveStream, Boolean(finalChunk));
          }
          return updated;
        });
        setInterimTranscript(interimChunk);
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsRecording(false);
    }
  };

  // Auto-estimate recommended hours from Bedrooms, Bathrooms & Service Type
  const handleAutoEstimateHoursFromRooms = () => {
    const bedNum = parseInt(bedrooms, 10) || 3;
    const bathNum = parseFloat(bathrooms) || 2;
    const isMoveOutOrDeep =
      serviceType.toLowerCase().includes('move') ||
      serviceType.toLowerCase().includes('deep') ||
      serviceType.toLowerCase().includes('reno');
    let est = 2 + (bedNum - 1) * 0.5 + (bathNum - 1) * 0.5 + (isMoveOutOrDeep ? 1.5 : 0) + selectedAddons.length * 0.5;
    est = Math.max(2, Math.min(10, Math.round(est * 2) / 2));
    setHours(est);
    if (est >= 4.5) {
      setCrewSelection('2_CLEANERS');
      setHours(Math.max(2.5, Math.round((est / 2) * 2) / 2));
    }
  };

  const toggleAddonTag = (tag: string) => {
    setSelectedAddons((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Combined specific information string including Bedrooms, Bathrooms, Add-ons, and Notes
  const combinedPropertyAndNotesSummary = useMemo(() => {
    const parts = [
      `Property: ${bedrooms}, ${bathrooms} (${city})`,
      selectedAddons.length > 0 ? `Requested Add-ons: ${selectedAddons.join(', ')}` : '',
      quoteNotes.trim() ? `Specific Instructions: ${quoteNotes.trim()}` : '',
    ].filter(Boolean);
    return parts.join(' | ');
  }, [bedrooms, bathrooms, city, selectedAddons, quoteNotes]);

  // Match live Service Catalog Price List item based on serviceType, bedrooms & bathrooms
  const matchedCatalogItem = useMemo(() => {
    return matchCatalogItem(serviceType, bedrooms, bathrooms, localCatalog || CANONICAL_SERVICE_CATALOG);
  }, [serviceType, bedrooms, bathrooms, localCatalog]);

  const applyCatalogItemToQuote = useCallback((item: ServiceCatalogItem) => {
    if (item.categoryLabel) setServiceType(item.categoryLabel);
    if (item.bedrooms) setBedrooms(item.bedrooms);
    if (item.bathrooms) setBathrooms(item.bathrooms);
    const qty = item.quantity ?? item.baseHours ?? 3;
    const unitPrice = item.unitPrice ?? item.basePrice ?? 105;
    const total = item.total ?? Math.round(qty * unitPrice * 100) / 100;
    const cleaners = item.cleanersCount || 2;
    setHours(qty);
    if (cleaners >= 2) setCrewSelection('2_CLEANERS');
    else setCrewSelection('1_CLEANER');
    if (item.depositRequired !== undefined) setDepositAmount(item.depositRequired);
    setFeedbackNotice(
      `✓ Applied "${item.name}": ${cleaners} Cleaner${cleaners > 1 ? 's' : ''} (${qty} × $${unitPrice.toFixed(2)}) = $${total.toFixed(2)} CAD`
    );
  }, []);

  // Hourly Rate resolution
  const hourlyRate = useMemo(() => {
    if (crewSelection === '1_CLEANER') return 52.50;
    if (crewSelection === '2_CLEANERS') return 105.00;
    return customHourlyRate;
  }, [crewSelection, customHourlyRate]);

  // Calculations: Labor, Fuel, Discount, Tax, Total, Balance Due after Deposit
  const calculations = useMemo(() => {
    const labor = Math.round(hours * hourlyRate * 100) / 100;
    const subtotalBeforeDiscount = labor + Number(fuelSurcharge);
    const subtotal = Math.max(0, subtotalBeforeDiscount - Number(discountAmount));
    const tax = applyTax ? Math.round(subtotal * taxRate * 100) / 100 : 0;
    const total = Math.round((subtotal + tax) * 100) / 100;
    const balanceDue = Math.max(0, Math.round((total - Number(depositAmount || 0)) * 100) / 100);

    return {
      labor,
      subtotal,
      tax,
      total,
      balanceDue,
    };
  }, [hours, hourlyRate, fuelSurcharge, discountAmount, applyTax, taxRate, depositAmount]);

  // Real-time Customer Intelligence lookup as dispatcher types phone/name
  const intelligence = useMemo(() => {
    return getCustomerIntelligence(customerPhone, customerName, { calls, visits, clients, quotes });
  }, [customerPhone, customerName, calls, visits, clients, quotes]);

  // Ranked closest cleaners to targetCoords for the Quick Map
  const closestCleaners = useMemo(() => {
    const list = (technicians && technicians.length > 0 ? technicians : INITIAL_TECHNICIANS).map((tech) => {
      const lat = tech.depotLocation?.lat || tech.currentLocation.lat;
      const lng = tech.depotLocation?.lng || tech.currentLocation.lng;
      const straightKm = haversineKm(targetCoords.lat, targetCoords.lng, lat, lng);
      const drivingKm = Math.round(straightKm * 1.28 * 10) / 10;
      const driveMins = Math.max(4, Math.round((drivingKm / 42) * 60));
      return {
        tech,
        lat,
        lng,
        drivingKm,
        driveMins,
      };
    });
    return list.sort((a, b) => a.drivingKm - b.drivingKm);
  }, [technicians, targetCoords]);

  // Two-Address Route & Distance Comparison Metrics (Address A ↔ Address B)
  const twoAddressMetrics = useMemo(() => {
    const straightKm = haversineKm(targetCoords.lat, targetCoords.lng, secondCoords.lat, secondCoords.lng);
    const drivingKm = Math.round(straightKm * 1.28 * 10) / 10;
    const driveMins = Math.max(4, Math.round((drivingKm / 42) * 60));
    return { straightKm, drivingKm, driveMins };
  }, [targetCoords, secondCoords]);

  // Helper to shift ISO date string by N days
  const shiftQuickDate = useCallback((isoDate: string, deltaDays: number): string => {
    const base = isoDate || liveToday.dateString;
    const [y, m, d] = base.split('-').map(Number);
    const dt = new Date(Date.UTC(y || 2026, (m || 1) - 1, (d || 1) + deltaDays));
    return dt.toISOString().slice(0, 10);
  }, [liveToday.dateString]);

  // 14-day (This Week Mon-Sun + Next Week Mon-Sun) selector pills for Quick Map
  const quickMapTwoWeekDays = useMemo(() => {
    const todayStr = liveToday.dateString;
    const [ty, tm, td] = todayStr.split('-').map(Number);
    const todayUtc = new Date(Date.UTC(ty, tm - 1, td));
    const dow = todayUtc.getUTCDay();
    const diffToMon = dow === 0 ? -6 : 1 - dow;
    const monUtc = new Date(Date.UTC(ty, tm - 1, td + diffToMon));

    const days: {
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
      const jobCount = (visits || []).filter((v: any) => String(v.startAt || '').slice(0, 10) === iso).length;
      days.push({
        iso,
        dayShort,
        dateLabel,
        isToday: iso === todayStr,
        jobCount,
      });
    }
    return days;
  }, [visits, liveToday.dateString]);

  // Filtered Scheduled Jobs for Selected Date, Today, Tomorrow, Week Forward, Full Month, or All
  const filteredScheduleVisits = useMemo(() => {
    const todayStr = liveToday.dateString; // e.g. '2026-10-14'
    const tomorrowStr = shiftQuickDate(todayStr, 1);
    const currentMonthPrefix = `${liveToday.year}-${String(liveToday.month).padStart(2, '0')}`;
    const anchorMs = new Date(liveToday.year, liveToday.monthIndex, liveToday.day).getTime();

    return (visits || [])
      .filter((v: any) => {
        const datePart = String(v.startAt || '').slice(0, 10);
        if (!datePart) return true;
        if (scheduleHorizon === 'ALL') return true;
        if (scheduleHorizon === 'TODAY') return datePart === todayStr;
        if (scheduleHorizon === 'TOMORROW') return datePart === tomorrowStr;
        if (scheduleHorizon === 'CUSTOM_DATE') return datePart === selectedQuickMapDate;

        const parts = datePart.split('-').map(Number);
        const jobDay = parts[2] || 1;
        const vMs = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]).getTime() : anchorMs;
        const diffDays = Math.round((vMs - anchorMs) / (1000 * 60 * 60 * 24));

        if (scheduleHorizon === 'WEEK') return diffDays >= 0 && diffDays <= 7;
        if (scheduleHorizon === 'WEEKS_3_4') return datePart.startsWith(currentMonthPrefix) && jobDay >= 15;
        if (scheduleHorizon === 'WEEK_1') return datePart.startsWith(currentMonthPrefix) && jobDay >= 1 && jobDay <= 7;
        if (scheduleHorizon === 'WEEK_2') return datePart.startsWith(currentMonthPrefix) && jobDay >= 8 && jobDay <= 14;
        if (scheduleHorizon === 'WEEK_3') return datePart.startsWith(currentMonthPrefix) && jobDay >= 15 && jobDay <= 21;
        if (scheduleHorizon === 'WEEK_4') return datePart.startsWith(currentMonthPrefix) && jobDay >= 22 && jobDay <= 31;
        if (scheduleHorizon === 'MONTH') return datePart.startsWith(currentMonthPrefix) || (diffDays >= 0 && diffDays <= 31);
        return true;
      })
      .sort((a: any, b: any) => String(a.startAt || '').localeCompare(String(b.startAt || '')));
  }, [visits, scheduleHorizon, selectedQuickMapDate, liveToday, shiftQuickDate]);

  // Auto-apply loyalty discount
  const handleApplyLoyaltyDiscount = (percent: number) => {
    const labor = hours * hourlyRate;
    const val = Math.round(labor * (percent / 100));
    setDiscountAmount(val);
    setQuoteNotes((prev) => `${prev ? prev + ' ' : ''}[Applied ${percent}% Repeat Customer Loyalty Discount (-$${val})]`);
  };

  // Copy SMS / Phone ready breakdown (with Bedrooms, Bathrooms, Custom Discount & Deposit)
  const handleCopyBreakdown = () => {
    const text = `TidyUps Cleaning Estimate for ${customerName || 'Customer'}:
• Service: ${serviceType}
• Property Size: ${bedrooms} • ${bathrooms}
• Address: ${serviceAddress || `${city}, AB`}
• Time: ${hours} hours (${crewSelection === '1_CLEANER' ? '1 Cleaner @ $52.50/hr' : crewSelection === '2_CLEANERS' ? '2 Cleaners @ $105/hr' : `Custom @ $${hourlyRate}/hr`})
• Labor: $${calculations.labor.toFixed(2)}
• Fuel Surcharge: $${Number(fuelSurcharge).toFixed(2)}
${discountAmount > 0 ? `• Discount Applied: -$${Number(discountAmount).toFixed(2)}\n` : ''}• Subtotal: $${calculations.subtotal.toFixed(2)}
• Tax (12.5%): $${calculations.tax.toFixed(2)}
• TOTAL QUOTED: $${calculations.total.toFixed(2)} CAD
${depositAmount > 0 ? `• Deposit Required: $${Number(depositAmount).toFixed(2)} (Balance Due After Cleaning: $${calculations.balanceDue.toFixed(2)})\n` : ''}${selectedAddons.length > 0 ? `• Add-ons: ${selectedAddons.join(', ')}\n` : ''}${quoteNotes ? `• Specific Notes: ${quoteNotes}` : ''}`;

    navigator.clipboard.writeText(text);
    setCopiedBreakdown(true);
    setTimeout(() => setCopiedBreakdown(false), 2500);
  };

  // Sync Client, Exact Layout, Custom Discount & Deposit Amount to Google
  const syncClientAndQuoteToGoogle = async (skipStoreUpsert = false) => {
    try {
      const gRes = await fetch(`/api/google-sheets/sync-quote?project=${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-project-id': projectId },
        body: JSON.stringify({
          skipStoreUpsert,
          customerName: customerName.trim() || 'Phone Lead',
          customerPhone: customerPhone.trim() || '(780) 555-0199',
          customerEmail: customerEmail.trim(),
          serviceAddress: serviceAddress.trim() || `${city}, AB`,
          city,
          serviceType,
          bedrooms,
          bathrooms,
          hours,
          crewSelection,
          hourlyRate,
          labor: calculations.labor,
          fuelSurcharge: Number(fuelSurcharge),
          discountAmount: Number(discountAmount),
          subtotal: calculations.subtotal,
          tax: calculations.tax,
          total: calculations.total,
          depositAmount: Number(depositAmount),
          balanceDue: calculations.balanceDue,
          scheduledDate,
          timeWindow,
          assignedCleaner: assignedCleaners.length > 0 ? assignedCleaners.join(' & ') : 'Unassigned',
          assignedCleaners,
          selectedSource,
          addons: selectedAddons,
          notes: quoteNotes,
        }),
      });
      const gData = await gRes.json();
      if (gData?.success) {
        setGoogleSyncedRow(gData.row);
        setGoogleSyncedTsv(gData.tsv || '');
        if (!skipStoreUpsert) {
          if (gData.clients && onClientsUpdated) {
            onClientsUpdated(gData.clients);
          }
          if (gData.leads && onLeadsUpdated) {
            onLeadsUpdated(gData.leads);
          }
          syncLeadsToLiveGoogleSheetInDrive({ silentIfNoAuth: true })
            .then((driveRes) => {
              if (driveRes?.sheetUrl) setActiveSheetUrl(driveRes.sheetUrl);
            })
            .catch(() => {});
        }
      }
      return gData;
    } catch (e) {
      console.warn('Google layout sync note:', e);
      return null;
    }
  };

  const handlePushLiveToDriveGoogleSheet = async () => {
    setIsSyncingLiveSheet(true);
    try {
      await syncClientAndQuoteToGoogle(false);
      const driveRes = await syncLeadsToLiveGoogleSheetInDrive();
      if (driveRes?.sheetUrl) {
        setActiveSheetUrl(driveRes.sheetUrl);
      }
      setFeedbackTone('success');
      setFeedbackNotice(
        `✓ Pushed "${customerName || 'Client'}" ($${calculations.total.toFixed(2)}) directly into your live Google Sheet "${driveRes.sheetName}" in Google Drive!`
      );
    } catch (err: any) {
      setFeedbackTone('warning');
      setFeedbackNotice(
        `Google Drive Sheet sync notice: ${err?.message || 'Please authorize Google Drive to push live.'}`
      );
    } finally {
      setIsSyncingLiveSheet(false);
    }
  };

  const handleOneClickReconnectJobber = () => {
    window.location.href = `/api/jobber/oauth/authorize?project=tidyups&sourceOrigin=${encodeURIComponent(window.location.origin)}`;
  };

  // 1-Click Send to Booking System, Jobber Client+Quote & Dispatch Job (Saves Bedrooms, Bathrooms, Custom Discount & Deposit + Clean Google Sheet Sync)
  const handleSendToBookingAndDispatch = async () => {
    if (isSubmittingRef.current) return;
    setIsSubmitting(true);
    setFeedbackNotice(null);
    try {
      // 1. Create Client + Property + Quote in Jobber & Sync to Clean Google Sheet (only if not already created)
      if (!createdQuoteModalItem) {
        await handleSaveJobberQuote(false);
      }

      isSubmittingRef.current = true;
      // 2. Send to Booking System (/api/public/book) with bedrooms, bathrooms, discount & deposit
      const bookRes = await fetch('/api/public/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim() || 'Phone Intake Lead',
          customerPhone: customerPhone.trim() || '(780) 555-0199',
          customerEmail: customerEmail.trim(),
          serviceType: `${serviceType} (${bedrooms}, ${bathrooms})`,
          address: serviceAddress.trim() || `${city}, AB`,
          city,
          postalCode: '',
          bedrooms,
          bathrooms,
          preferredDate: scheduledDate,
          preferredTime: timeWindow,
          specialInstructions: `${combinedPropertyAndNotesSummary} | Quoted: $${calculations.total.toFixed(2)} CAD (${hours} hrs) | Discount: -$${Number(discountAmount).toFixed(2)} | Deposit: $${Number(depositAmount).toFixed(2)} (Balance: $${calculations.balanceDue.toFixed(2)})`,
          estimatedPrice: `$${calculations.total.toFixed(2)}`,
        }),
      });
      const bookData = await bookRes.json().catch(() => ({}));
      if (bookData?.ticket && onBookingSubmitted) {
        onBookingSubmitted(bookData.ticket);
      }

      // 3. Also create Scheduled Visit in Jobber Calendar
      const res = await fetch(`/api/quo/calls/convert-to-job?project=${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-project-id': projectId },
        body: JSON.stringify({
          callerName: customerName || 'Phone Lead',
          callerPhone: customerPhone || '(780) 555-0199',
          serviceAddress: serviceAddress || `${city}, AB`,
          serviceType: `${serviceType} (${bedrooms}, ${bathrooms} • ${hours} hrs)`,
          scheduledDate,
          scheduledTime,
          assignedCleaners,
          totalAmount: calculations.total,
          notes: `${combinedPropertyAndNotesSummary} | Quick Quoted: ${hours} hrs @ $${hourlyRate}/hr + $${fuelSurcharge} fuel - $${discountAmount} discount = $${calculations.total.toFixed(2)} (Deposit: $${depositAmount}, Balance: $${calculations.balanceDue.toFixed(2)}). Source: ${selectedSource}.`,
        }),
      });
      const data = await res.json();
      if (data.success && data.newVisit) {
        if (onVisitCreated) onVisitCreated(data.newVisit);
      }
    } catch (err: any) {
      setFeedbackNotice(`Error: ${err.message}`);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // Create official Jobber Client FIRST (Step 1), then Jobber Request or Quote (Step 2) & Sync to Clean Google Sheet
  const handleSaveJobberQuote = async (createRequestOnly: boolean = false) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setFeedbackNotice(null);
    try {
      const gData = await syncClientAndQuoteToGoogle(true);

      const primaryLineItemName = matchedCatalogItem
        ? matchedCatalogItem.jobberItemName
        : `${serviceType} — ${bedrooms}, ${bathrooms} (${hours} hrs)`;

      const primaryDescription = `${bedrooms}, ${bathrooms} • ${
        crewSelection === '1_CLEANER'
          ? '1 Cleaner @ $52.50/hr'
          : crewSelection === '2_CLEANERS'
          ? '2 Cleaners @ $105.00/hr'
          : `Custom Crew @ $${hourlyRate.toFixed(2)}/hr`
      } — ${serviceAddress || `${city}, AB`}${
        selectedAddons.length > 0 ? ` | Add-ons: ${selectedAddons.join(', ')}` : ''
      }${quoteNotes.trim() ? ` | Notes: ${quoteNotes.trim()}` : ''}`;

      const addonLineItems = selectedAddons.map((addon) => {
        const matchedAddon = (localCatalog || CANONICAL_SERVICE_CATALOG).find(
          (c) =>
            c.isAddon &&
            (c.name.toLowerCase().includes(addon.toLowerCase()) ||
              addon.toLowerCase().includes(c.shortName.toLowerCase()))
        );
        const price = matchedAddon ? matchedAddon.basePrice : 45.0;
        return {
          name: matchedAddon ? matchedAddon.jobberItemName : `${addon} Cleaning Detail`,
          description: matchedAddon ? matchedAddon.description : `Customer selected add-on: ${addon}`,
          quantity: 1,
          unitPrice: price,
          total: price,
        };
      });

      const lineItems = [
        {
          name: primaryLineItemName,
          description: primaryDescription,
          quantity: hours,
          unitPrice: hourlyRate,
          total: calculations.labor,
        },
        ...addonLineItems,
        ...(Number(fuelSurcharge) > 0
          ? [
              {
                name: 'Fuel & Mobile Dispatch Surcharge',
                description: 'Standard Greater Edmonton mobile dispatch fuel surcharge',
                quantity: 1,
                unitPrice: Number(fuelSurcharge),
                total: Number(fuelSurcharge),
              },
            ]
          : []),
        ...(Number(discountAmount) > 0
          ? [
              {
                name: `Custom / Promotional Discount (-$${Number(discountAmount).toFixed(2)})`,
                description: 'Applied customer discount',
                quantity: 1,
                unitPrice: -Number(discountAmount),
                total: -Number(discountAmount),
              },
            ]
          : []),
      ];

      const res = await fetch(`/api/database/quotes?project=${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-project-id': projectId },
        body: JSON.stringify({
          clientName: customerName || 'Phone Lead',
          clientPhone: customerPhone || '(780) 555-0199',
          clientEmail: customerEmail,
          serviceAddress: serviceAddress || `${city}, AB`,
          service: `${serviceType} (${bedrooms}, ${bathrooms} • ${hours} hrs)`,
          bedrooms,
          bathrooms,
          total: calculations.total,
          depositRequired: depositAmount,
          lineItems,
          createRequestOnly,
          notes: `${combinedPropertyAndNotesSummary} | Quick Quoted: ${hours} hrs @ $${hourlyRate}/hr + $${fuelSurcharge} fuel - $${discountAmount} discount = $${calculations.total.toFixed(2)} CAD | Deposit Required: $${depositAmount} (Balance Due: $${calculations.balanceDue.toFixed(2)}). Source: ${selectedSource}.`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.quote) {
          saveQuoteToFirestore(data.quote).catch(() => {});
        }
        if (data.client) {
          saveClientToFirestore(data.client).catch(() => {});
        }
        if (data.clients && onClientsUpdated) {
          onClientsUpdated(data.clients);
        }
        if ((data.leads || gData?.leads) && onLeadsUpdated) {
          onLeadsUpdated(data.leads || gData.leads);
        }

        // Automatically push updated leads/quotes workbook to live Google Sheet in Drive if Google Drive token is active
        syncLeadsToLiveGoogleSheetInDrive({ silentIfNoAuth: true })
          .then((driveRes) => {
            if (driveRes?.sheetUrl) setActiveSheetUrl(driveRes.sheetUrl);
          })
          .catch(() => {});

        const isLiveJobber = Boolean(data.isLiveSynced || data.isLive);
        setFeedbackTone(isLiveJobber ? 'success' : 'warning');

        if (createRequestOnly) {
          setFeedbackNotice(
            data.message ||
              (isLiveJobber
                ? `✓ Step 1: Created Client "${customerName || 'Client'}" & Service Property in Jobber → Step 2: Created Jobber Request & Added to Clean Google Sheet!`
                : `Saved "${customerName || 'Client'}" Request in Clean Sheet Hub & Firestore! Reconnect Jobber OAuth (60-min token expired) to push live to Jobber.`)
          );
        } else if (data.quote) {
          setFeedbackNotice(
            data.message ||
              (isLiveJobber
                ? `✓ Step 1: Created Client "${customerName || 'Client'}" in Jobber → Step 2: Created Single Jobber Quote ${data.quote.quoteNumber} ($${calculations.total.toFixed(2)}, Deposit $${depositAmount}) & Synced to Clean Google Sheet!`
                : `Saved "${customerName || 'Client'}" (${data.quote.quoteNumber}, $${calculations.total.toFixed(2)}) to Clean Sheet Hub & Firestore! Jobber 60-min access token expired — click "1-Click Reconnect Jobber" to push live.`)
          );
          if (onQuoteCreated) onQuoteCreated(data.quote);
          setCreatedQuoteModalItem(data.quote);
        }
      } else {
        setFeedbackTone('warning');
        setFeedbackNotice(data.error || 'Failed to sync with Jobber.');
      }
    } catch (err: any) {
      setFeedbackTone('warning');
      setFeedbackNotice(`Error: ${err.message}`);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setServiceAddress('');
    setBedrooms('3 Bedrooms');
    setBathrooms('2 Bathrooms');
    setAssignedCleaners([]);
    setSelectedAddons([]);
    setQuoteNotes('');
    setVoiceTranscript('');
    setDiscountAmount(0);
    setDepositAmount(50);
    setFeedbackNotice(null);
    setVoiceStatusMsg(null);
    setReconciliationNote(null);
    setFlashingFields({});
    setVoiceCapturedFields({});
    liveValuesRef.current = {
      name: '',
      phone: '',
      email: '',
      address: '',
      city: 'Edmonton',
      bedrooms: '3 Bedrooms',
      bathrooms: '2 Bathrooms',
      serviceType: 'Residential Standard Cleaning',
      hours: 3,
      crew: '1_CLEANER',
      notes: '',
    };
  };

  // Map coordinate projection helper for Quick Map
  const MAP_BOUNDS = { minLat: 53.28, maxLat: 53.68, minLng: -113.72, maxLng: -113.26 };
  const projectMapCoord = (lat: number, lng: number) => ({
    x: Math.max(3, Math.min(97, ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * 100)),
    y: Math.max(3, Math.min(97, ((MAP_BOUNDS.maxLat - lat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * 100)),
  });
  const targetPinPos = projectMapCoord(targetCoords.lat, targetCoords.lng);
  const secondPinPos = projectMapCoord(secondCoords.lat, secondCoords.lng);

  return (
    <div className="flex-1 overflow-y-auto bg-[#0d0f17] text-slate-100 font-sans p-4 sm:p-6 lg:p-8 space-y-6 animate-fadeIn min-h-[calc(100vh-4rem)]">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-pink-600 via-fuchsia-600 to-purple-600 text-white shadow-lg">
            <Mic className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Voice Dictation Intake, Quick Quote &amp; Quick Map
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Speak or dictate caller details to auto-fill Name, Address, Bedrooms, Bathrooms &amp; Specific Notes — then sync to Jobber or your Booking System in 1 click.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          {onOpenProjectBackup && (
            <button
              type="button"
              onClick={onOpenProjectBackup}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
              title="Download Complete Project ZIP for app.tidyupscleaning.com"
            >
              <FileArchive className="w-3.5 h-3.5 text-white" />
              <span>Project ZIP</span>
            </button>
          )}
          {onOpenSpamShield && (
            <button
              type="button"
              onClick={() => onOpenSpamShield(customerPhone || '')}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md active:scale-95"
              title="Block this caller or entire area code in Twilio Spam Shield"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-white" />
              <span>Block Spam Caller</span>
            </button>
          )}
          {onNavigateToIntakes && (
            <button
              onClick={onNavigateToIntakes}
              className="px-3.5 py-2 bg-purple-600/25 hover:bg-purple-600/40 text-purple-200 rounded-xl text-xs font-extrabold transition-all border border-purple-500/40 flex items-center gap-1.5 cursor-pointer"
            >
              <ClipboardList className="w-3.5 h-3.5 text-purple-400" />
              <span>Intakes Log</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsCatalogModalOpen(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-purple-700 to-pink-600 hover:from-purple-600 hover:to-pink-500 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="View or Paste Service Catalog Price List"
          >
            <Tag className="w-3.5 h-3.5 text-white" />
            <span>Price List &amp; Catalog</span>
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-2 bg-[#1b1e2b] hover:bg-[#252a3d] text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-700/80 cursor-pointer"
          >
            Clear / New Caller
          </button>
          <button
            onClick={handleCopyBreakdown}
            className="px-4 py-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            {copiedBreakdown ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedBreakdown ? 'Copied Estimate!' : 'Copy SMS Quote Breakdown'}</span>
          </button>
        </div>
      </div>

      {feedbackNotice && (
        <div
          className={`p-4 rounded-2xl text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-bold shadow-lg animate-fadeIn ${
            feedbackTone === 'warning'
              ? 'bg-amber-950/95 border border-amber-500/70 text-amber-100'
              : 'bg-emerald-950/90 border border-emerald-700 text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {feedbackTone === 'warning' ? (
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            <span>{feedbackNotice}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {feedbackTone === 'warning' && (
              <button
                type="button"
                onClick={handleOneClickReconnectJobber}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black whitespace-nowrap cursor-pointer shadow-md"
              >
                1-Click Reconnect Jobber OAuth ↗
              </button>
            )}
            <button
              type="button"
              disabled={isSyncingLiveSheet}
              onClick={handlePushLiveToDriveGoogleSheet}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold whitespace-nowrap cursor-pointer disabled:opacity-50"
            >
              {isSyncingLiveSheet ? 'Pushing to Google Sheet...' : 'Push Live to Google Sheet in Drive'}
            </button>
            {onNavigateToSchedule && (
              <button
                onClick={onNavigateToSchedule}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold whitespace-nowrap cursor-pointer"
              >
                View in Schedule →
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          SECTION 1: LIVE VOICE DICTATION & AI SMART AUTO-FILL BAR
         ───────────────────────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-[#171324] via-[#191528] to-[#141826] border border-pink-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider text-pink-400">
                Step 1 • Live Call Voice Dictation + Audio &amp; Transcript Reconciler
              </span>
              {isRecording && (
                <span className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-300 bg-emerald-500/20 border border-emerald-400/60 px-2.5 py-0.5 rounded-lg animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Live Streaming Fill + Audio Recording Active
                </span>
              )}
              {Object.keys(voiceCapturedFields).length > 0 && (
                <span className="px-2.5 py-0.5 rounded-lg bg-[#00ff66]/20 border border-[#00ff66] text-[#5cff9d] text-[11px] font-black shadow-[0_0_15px_rgba(0,255,102,0.35)]">
                  ✨ {Object.keys(voiceCapturedFields).length} Field{Object.keys(voiceCapturedFields).length === 1 ? '' : 's'} Lit Up Green Live
                </span>
              )}
            </div>
            <h2 className="text-lg font-extrabold text-white">
              Dictate Caller Info to Live-Fill &amp; Light Up Each Block in Real Time
            </h2>
            <p className="text-xs text-slate-400">
              As you speak, each block (Name, Phone, Address, Bedrooms, Bathrooms, Hours, Notes) lights up <strong className="text-[#4dff88]">bright green</strong> live — and when you stop, we compare the <strong className="text-emerald-300">Recorded Audio + Transcript</strong> so Jobber creates <strong className="text-white underline">1 complete client</strong> instead of duplicates.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleToggleVoiceDictation}
              className={`px-5 py-3 rounded-2xl font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-xl transition-all cursor-pointer active:scale-95 ${
                isRecording
                  ? 'bg-rose-600 hover:bg-rose-700 text-white ring-4 ring-rose-500/30 animate-pulse'
                  : 'bg-gradient-to-r from-pink-600 via-fuchsia-600 to-purple-600 hover:opacity-95 text-white'
              }`}
            >
              {isRecording ? (
                <>
                  <MicOff className="w-4 h-4" />
                  <span>Stop &amp; Reconcile Audio + Transcript</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  <span>Start Live Voice Dictation</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isParsingVoice || !voiceTranscript.trim()}
              onClick={() => handleExtractFromTranscript(voiceTranscript)}
              className="px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <Wand2 className="w-4 h-4" />
              <span>{isParsingVoice ? 'Comparing Audio & Transcript...' : 'Compare & Fill Blanks'}</span>
            </button>
          </div>
        </div>

        {/* Voice Transcript Input + Sample Dictation Presets */}
        <div className="space-y-2.5">
          <div className="relative">
            <textarea
              rows={2}
              value={voiceTranscript + (interimTranscript ? ` ${interimTranscript}` : '')}
              onChange={(e) => {
                setVoiceTranscript(e.target.value);
                applyLiveSpeechExtraction(e.target.value);
              }}
              placeholder='Click "Start Live Voice Dictation" and speak — watch Name, Phone, Address, Bedrooms & Bathrooms light up bright green as you talk! Or type/paste call notes here...'
              className={`w-full px-4 py-3 bg-[#0e1018] border rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none leading-relaxed transition-all ${
                isRecording
                  ? 'border-[#00ff66] ring-2 ring-[#00ff66]/30 shadow-[0_0_20px_rgba(0,255,102,0.2)]'
                  : 'border-slate-700/90 focus:border-pink-500'
              }`}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 mr-1">Test Live Green Auto-Fill:</span>
              {SAMPLE_VOICE_PROMPTS.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setVoiceTranscript(sample.text);
                    applyLiveSpeechExtraction(sample.text);
                    handleExtractFromTranscript(sample.text);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  🎙️ {sample.label}
                </button>
              ))}
            </div>

            {voiceStatusMsg && (
              <span className="text-xs font-extrabold text-[#4dff88] bg-[#00ff66]/10 border border-[#00ff66]/40 px-3 py-1 rounded-xl">
                {voiceStatusMsg}
              </span>
            )}
          </div>

          {reconciliationNote && (
            <div className="px-3.5 py-2 rounded-xl bg-emerald-950/80 border border-[#00ff66]/60 text-[11px] text-emerald-200 flex items-center justify-between gap-2 shadow-[0_0_15px_rgba(0,255,102,0.15)]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00ff66] shrink-0" />
                <span>
                  <strong className="text-[#4dff88]">Audio + Transcript Verified (Single Jobber Client Guaranteed):</strong> {reconciliationNote}
                </span>
              </div>
              <span className="text-[10px] font-mono uppercase font-black text-[#4dff88] shrink-0">
                No Duplicate Clients
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          SECTION 2: MAIN 12-COLUMN WORKSPACE (REQUEST FORM + QUICK QUOTE + QUICK MAP)
         ───────────────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (7 Cols): Customer Request & Intake Form (With Bedrooms, Bathrooms & Specific Info) */}
        <div className="lg:col-span-7 bg-[#121520] border border-slate-800/90 rounded-3xl p-5 sm:p-6 space-y-5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div>
              <span className="text-[10px] font-bold text-pink-400 uppercase tracking-wider block">
                Step 2 • Customer Request &amp; Property Intake Form
              </span>
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-pink-500" />
                <span>Request Your Cleaning &amp; Property Details</span>
              </h2>
            </div>
            <span className="text-xs text-slate-400">
              1 Unified Client + Quote Synced to Jobber
            </span>
          </div>

          {/* Caller Intelligence Banner */}
          {customerPhone.trim().length > 3 && (
            <div className="animate-fadeIn">
              <CustomerIntelligenceBadge
                intelligence={intelligence}
                showDiscountPrompt={intelligence.loyaltyDiscountEligible && discountAmount === 0}
                onApplyDiscount={(percent) => handleApplyLoyaltyDiscount(percent)}
              />
            </div>
          )}

          {/* Service Type Package Selector Buttons */}
          <div
            className={`space-y-1.5 p-3 rounded-2xl border transition-all duration-300 ${
              flashingFields.serviceType
                ? 'bg-[#00ff66]/20 border-[#00ff66] ring-4 ring-[#00ff66]/40 shadow-[0_0_25px_rgba(0,255,102,0.45)] scale-[1.01]'
                : voiceCapturedFields.serviceType
                ? 'bg-emerald-950/35 border-[#00ff66]/60 shadow-[0_0_12px_rgba(0,255,102,0.18)]'
                : 'bg-transparent border-transparent p-0'
            }`}
          >
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-300">
                What Kind of Cleaning? (Service Package) *
              </label>
              {voiceCapturedFields.serviceType && (
                <span className="px-2 py-0.5 rounded-md bg-[#00ff66] text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-sm">
                  ✓ Voice Filled
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { label: 'Standard Cleaning', value: 'Residential Standard Cleaning' },
                { label: 'Deep Cleaning', value: 'Deep Cleaning & Baseboards' },
                { label: 'Move-Out / Move-In', value: 'Move-Out / Turnover Vacate Cleaning' },
                { label: 'Airbnb Turnover', value: 'Move-In Detailed Sanitization' },
                { label: 'Post-Renovation', value: 'Post-Renovation HEPA Vacuum & Scrub' },
                { label: 'Commercial Office', value: 'Commercial Office Cleaning' },
              ].map((pkg) => {
                const isSelected = serviceType === pkg.value;
                return (
                  <button
                    key={pkg.value}
                    type="button"
                    onClick={() => setServiceType(pkg.value)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border text-left transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? voiceCapturedFields.serviceType
                          ? 'bg-gradient-to-r from-[#00c853] to-emerald-600 text-slate-950 font-black border-[#00ff66] shadow-[0_0_15px_rgba(0,255,102,0.4)]'
                          : 'bg-gradient-to-r from-pink-600 to-purple-600 text-white border-pink-400 shadow-md'
                        : 'bg-[#171b29] text-slate-300 border-slate-700/80 hover:border-slate-600'
                    }`}
                  >
                    <span className="truncate">{pkg.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Customer Contact Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* FULL NAME BLOCK */}
            <div
              className={`p-2.5 rounded-2xl border transition-all duration-300 ${
                flashingFields.name
                  ? 'bg-[#00ff66]/25 border-[#00ff66] ring-4 ring-[#00ff66]/50 shadow-[0_0_28px_rgba(0,255,102,0.6)] scale-[1.02]'
                  : voiceCapturedFields.name
                  ? 'bg-emerald-950/40 border-[#00ff66]/70 shadow-[0_0_14px_rgba(0,255,102,0.22)]'
                  : 'bg-[#151926]/60 border-slate-800/80'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-200">
                  Full Name <span className="text-pink-500">*</span>
                </label>
                {voiceCapturedFields.name && (
                  <span className="px-1.5 py-0.5 rounded bg-[#00ff66] text-slate-950 text-[9px] font-black uppercase tracking-wider shadow-xs">
                    {flashingFields.name ? '⚡ LIVE FILLING' : '✓ VOICE FILLED'}
                  </span>
                )}
              </div>
              <div className="relative">
                <User className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${voiceCapturedFields.name ? 'text-[#00ff66]' : 'text-slate-500'}`} />
                <input
                  type="text"
                  placeholder="e.g. Rachel Macdonald"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    liveValuesRef.current.name = e.target.value;
                  }}
                  className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-xs font-bold placeholder-slate-500 focus:outline-none transition-all ${
                    voiceCapturedFields.name
                      ? 'bg-[#091f14] border-2 border-[#00ff66] text-[#6bffa3] focus:border-[#00ff66]'
                      : 'bg-[#171b29] border border-slate-700/80 text-white focus:border-pink-500'
                  }`}
                />
              </div>
            </div>

            {/* PHONE NUMBER BLOCK */}
            <div
              className={`p-2.5 rounded-2xl border transition-all duration-300 ${
                flashingFields.phone
                  ? 'bg-[#00ff66]/25 border-[#00ff66] ring-4 ring-[#00ff66]/50 shadow-[0_0_28px_rgba(0,255,102,0.6)] scale-[1.02]'
                  : voiceCapturedFields.phone
                  ? 'bg-emerald-950/40 border-[#00ff66]/70 shadow-[0_0_14px_rgba(0,255,102,0.22)]'
                  : 'bg-[#151926]/60 border-slate-800/80'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-200">
                  Phone Number <span className="text-pink-500">*</span>
                </label>
                {voiceCapturedFields.phone ? (
                  <span className="px-1.5 py-0.5 rounded bg-[#00ff66] text-slate-950 text-[9px] font-black uppercase tracking-wider shadow-xs">
                    {flashingFields.phone ? '⚡ LIVE FILLING' : '✓ VOICE FILLED'}
                  </span>
                ) : (
                  onOpenSpamShield &&
                  customerPhone.trim().length >= 3 && (
                    <button
                      type="button"
                      onClick={() => onOpenSpamShield(customerPhone)}
                      className="text-[10px] text-rose-400 hover:text-rose-300 font-extrabold flex items-center gap-1 cursor-pointer"
                      title="Block this caller in Twilio Spam Shield"
                    >
                      <ShieldAlert className="w-3 h-3 text-rose-400" />
                      <span>Block</span>
                    </button>
                  )
                )}
              </div>
              <div className="relative">
                <Phone className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${voiceCapturedFields.phone ? 'text-[#00ff66]' : 'text-slate-500'}`} />
                <input
                  type="tel"
                  placeholder="(780) 953-2409"
                  value={customerPhone}
                  onChange={(e) => {
                    setCustomerPhone(e.target.value);
                    liveValuesRef.current.phone = e.target.value;
                  }}
                  className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-xs font-mono font-bold placeholder-slate-500 focus:outline-none transition-all ${
                    voiceCapturedFields.phone
                      ? 'bg-[#091f14] border-2 border-[#00ff66] text-[#6bffa3] focus:border-[#00ff66]'
                      : 'bg-[#171b29] border border-slate-700/80 text-white focus:border-pink-500'
                  }`}
                />
              </div>
            </div>

            {/* EMAIL BLOCK */}
            <div
              className={`p-2.5 rounded-2xl border transition-all duration-300 ${
                flashingFields.email
                  ? 'bg-[#00ff66]/25 border-[#00ff66] ring-4 ring-[#00ff66]/50 shadow-[0_0_28px_rgba(0,255,102,0.6)] scale-[1.02]'
                  : voiceCapturedFields.email
                  ? 'bg-emerald-950/40 border-[#00ff66]/70 shadow-[0_0_14px_rgba(0,255,102,0.22)]'
                  : 'bg-[#151926]/60 border-slate-800/80'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-200">
                  Email (For Quote)
                </label>
                {voiceCapturedFields.email && (
                  <span className="px-1.5 py-0.5 rounded bg-[#00ff66] text-slate-950 text-[9px] font-black uppercase tracking-wider shadow-xs">
                    {flashingFields.email ? '⚡ LIVE FILLING' : '✓ VOICE FILLED'}
                  </span>
                )}
              </div>
              <input
                type="email"
                placeholder="client@gmail.com"
                value={customerEmail}
                onChange={(e) => {
                  setCustomerEmail(e.target.value);
                  liveValuesRef.current.email = e.target.value;
                }}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold placeholder-slate-500 focus:outline-none transition-all ${
                  voiceCapturedFields.email
                    ? 'bg-[#091f14] border-2 border-[#00ff66] text-[#6bffa3] focus:border-[#00ff66]'
                    : 'bg-[#171b29] border border-slate-700/80 text-white focus:border-pink-500'
                }`}
              />
            </div>
          </div>

          {/* Street Address with Google Places Autocomplete + Pin on Map button */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div
              className={`sm:col-span-8 p-2.5 rounded-2xl border transition-all duration-300 ${
                flashingFields.address
                  ? 'bg-[#00ff66]/25 border-[#00ff66] ring-4 ring-[#00ff66]/50 shadow-[0_0_28px_rgba(0,255,102,0.6)] scale-[1.01]'
                  : voiceCapturedFields.address
                  ? 'bg-emerald-950/40 border-[#00ff66]/70 shadow-[0_0_14px_rgba(0,255,102,0.22)]'
                  : 'bg-[#151926]/60 border-slate-800/80'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-200">
                  Property Street Address <span className="text-pink-500">*</span>
                </label>
                {voiceCapturedFields.address && (
                  <span className="px-2 py-0.5 rounded bg-[#00ff66] text-slate-950 text-[9px] font-black uppercase tracking-wider shadow-xs">
                    {flashingFields.address ? '⚡ LIVE FILLING ADDRESS' : '✓ VOICE FILLED'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className={`flex-1 rounded-xl ${voiceCapturedFields.address ? 'ring-2 ring-[#00ff66]' : ''}`}>
                  <AddressAutocompleteInput
                    value={serviceAddress}
                    onChange={(val) => {
                      setServiceAddress(val);
                      liveValuesRef.current.address = val;
                    }}
                    onSelect={(pred) => {
                      const full = pred.description || pred.mainText;
                      setServiceAddress(full);
                      liveValuesRef.current.address = full;
                      geocodeAddressOnQuickMap(full);
                    }}
                    placeholder="Start typing street address (e.g. 7221 Chivers Place SW)..."
                    className="text-xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => geocodeAddressOnQuickMap(serviceAddress)}
                  className="px-3 py-2.5 rounded-xl bg-purple-600/90 hover:bg-purple-600 text-white text-xs font-bold whitespace-nowrap flex items-center gap-1 cursor-pointer shrink-0"
                  title="Locate address on Quick Map & calculate closest cleaners"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{isGeocodingMap ? 'Locating...' : 'Pin Map'}</span>
                </button>
              </div>
            </div>

            <div
              className={`sm:col-span-4 p-2.5 rounded-2xl border transition-all duration-300 ${
                flashingFields.city
                  ? 'bg-[#00ff66]/25 border-[#00ff66] ring-4 ring-[#00ff66]/50 shadow-[0_0_28px_rgba(0,255,102,0.6)]'
                  : voiceCapturedFields.city
                  ? 'bg-emerald-950/40 border-[#00ff66]/70'
                  : 'bg-[#151926]/60 border-slate-800/80'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-200">
                  City / Service Area
                </label>
                {voiceCapturedFields.city && (
                  <span className="px-1.5 py-0.5 rounded bg-[#00ff66] text-slate-950 text-[9px] font-black uppercase">
                    ✓ VOICE
                  </span>
                )}
              </div>
              <select
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  liveValuesRef.current.city = e.target.value;
                }}
                className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold focus:outline-none cursor-pointer ${
                  voiceCapturedFields.city
                    ? 'bg-[#091f14] border-2 border-[#00ff66] text-[#6bffa3]'
                    : 'bg-[#171b29] border border-slate-700/80 text-white focus:border-pink-500'
                }`}
              >
                <option value="Edmonton">Edmonton</option>
                <option value="St. Albert">St. Albert</option>
                <option value="Sherwood Park">Sherwood Park</option>
                <option value="Leduc">Leduc</option>
                <option value="Spruce Grove">Spruce Grove</option>
              </select>
            </div>
          </div>

          {/* HOW MANY BEDROOMS & HOW MANY BATHROOMS (Highlighted Property Size Row) */}
          <div
            className={`p-4 rounded-2xl border space-y-3 transition-all duration-300 ${
              flashingFields.bedrooms || flashingFields.bathrooms
                ? 'bg-[#00ff66]/20 border-[#00ff66] ring-4 ring-[#00ff66]/45 shadow-[0_0_28px_rgba(0,255,102,0.5)]'
                : voiceCapturedFields.bedrooms || voiceCapturedFields.bathrooms
                ? 'bg-emerald-950/30 border-[#00ff66]/60 shadow-[0_0_15px_rgba(0,255,102,0.18)]'
                : 'bg-[#171b29] border-pink-500/30'
            }`}
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-extrabold text-pink-300 flex items-center gap-1.5">
                <BedDouble className="w-4 h-4 text-pink-400" />
                <span>Property Size: How Many Bedrooms &amp; Bathrooms?</span>
                {(voiceCapturedFields.bedrooms || voiceCapturedFields.bathrooms) && (
                  <span className="px-2 py-0.5 rounded bg-[#00ff66] text-slate-950 text-[9px] font-black uppercase tracking-wider">
                    ✓ Voice Filled
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={handleAutoEstimateHoursFromRooms}
                className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
              >
                ⚡ Auto-Estimate Hours from Rooms
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div
                className={`p-2 rounded-xl transition-all ${
                  flashingFields.bedrooms ? 'bg-[#00ff66]/25 ring-2 ring-[#00ff66]' : ''
                }`}
              >
                <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
                  How Many Bedrooms? *
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {['1 Bedroom', '2 Bedrooms', '3 Bedrooms', '4 Bedrooms', '5+ Bedrooms'].map((b) => {
                    const shortLabel = b.split(' ')[0] + ' Bed';
                    const isSelected = bedrooms === b;
                    return (
                      <button
                        key={b}
                        type="button"
                        onClick={() => {
                          setBedrooms(b);
                          liveValuesRef.current.bedrooms = b;
                        }}
                        className={`py-2 px-1.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer text-center ${
                          isSelected
                            ? voiceCapturedFields.bedrooms
                              ? 'bg-[#00ff66] text-slate-950 border-[#00ff66] font-black shadow-[0_0_14px_rgba(0,255,102,0.5)]'
                              : 'bg-pink-600 text-white border-pink-400 shadow-md'
                            : 'bg-[#0f121c] text-slate-300 border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        {shortLabel}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                className={`p-2 rounded-xl transition-all ${
                  flashingFields.bathrooms ? 'bg-[#00ff66]/25 ring-2 ring-[#00ff66]' : ''
                }`}
              >
                <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
                  How Many Bathrooms? *
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {[
                    { label: '1 Bath', val: '1 Bathroom' },
                    { label: '1.5 Bath', val: '1.5 Bathrooms' },
                    { label: '2 Bath', val: '2 Bathrooms' },
                    { label: '2.5 Bath', val: '2.5 Bathrooms' },
                    { label: '3 Bath', val: '3 Bathrooms' },
                    { label: '4+ Bath', val: '4+ Bathrooms' },
                  ].map((ba) => {
                    const isSelected = bathrooms === ba.val;
                    return (
                      <button
                        key={ba.val}
                        type="button"
                        onClick={() => {
                          setBathrooms(ba.val);
                          liveValuesRef.current.bathrooms = ba.val;
                        }}
                        className={`py-2 px-1 rounded-xl text-[11px] font-extrabold border transition-all cursor-pointer text-center ${
                          isSelected
                            ? voiceCapturedFields.bathrooms
                              ? 'bg-[#00ff66] text-slate-950 border-[#00ff66] font-black shadow-[0_0_14px_rgba(0,255,102,0.5)]'
                              : 'bg-purple-600 text-white border-purple-400 shadow-md'
                            : 'bg-[#0f121c] text-slate-300 border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        {ba.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Live Service Catalog Price List Match Banner */}
          {matchedCatalogItem && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-purple-950/80 border border-purple-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-purple-600/30 text-purple-300 border border-purple-400/30 flex items-center justify-center shrink-0">
                  <Tag className="w-4 h-4 text-purple-300" />
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-extrabold">
                      Catalog Price List Match
                    </span>
                    <span className="text-purple-200 text-[10px] font-bold font-mono">
                      · {matchedCatalogItem.categoryLabel}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-white mt-0.5">
                    {matchedCatalogItem.name} —{' '}
                    <span className="font-mono font-extrabold text-emerald-400">
                      {matchedCatalogItem.cleanersCount || 2} Cleaner{(matchedCatalogItem.cleanersCount || 2) > 1 ? 's' : ''} ({matchedCatalogItem.quantity ?? matchedCatalogItem.baseHours} × ${(matchedCatalogItem.unitPrice ?? 105).toFixed(2)}) = ${(matchedCatalogItem.total ?? matchedCatalogItem.basePrice).toFixed(2)} CAD
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                    1 Cleaner Eq: 1 ({Math.round(((matchedCatalogItem.quantity ?? matchedCatalogItem.baseHours ?? 3) * (matchedCatalogItem.cleanersCount || 2)) * 100) / 100} × $52.50) = ${(matchedCatalogItem.total ?? matchedCatalogItem.basePrice).toFixed(2)} • Deposit: ${matchedCatalogItem.depositRequired}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => applyCatalogItemToQuote(matchedCatalogItem)}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Apply Catalog Price</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCatalogModalOpen(true)}
                  className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-white/15 cursor-pointer"
                  title="Open full price list to select any service or paste price list"
                >
                  <span>Browse All</span>
                </button>
              </div>
            </div>
          )}

          {/* Timing & Cleaner Assignment Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Preferred Date
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#171b29] border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Time Window / Start
              </label>
              <select
                value={timeWindow}
                onChange={(e) => {
                  setTimeWindow(e.target.value);
                  if (e.target.value.startsWith('Morning')) setScheduledTime('09:00');
                  else if (e.target.value.startsWith('Afternoon')) setScheduledTime('13:00');
                  else if (e.target.value.startsWith('Evening')) setScheduledTime('16:30');
                }}
                className="w-full px-3 py-2 bg-[#171b29] border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-pink-500 cursor-pointer"
              >
                <option value="Morning (8:00 AM - 12:00 PM)">Morning (8:00 AM - 12:00 PM)</option>
                <option value="Afternoon (12:00 PM - 4:00 PM)">Afternoon (12:00 PM - 4:00 PM)</option>
                <option value="Evening (4:00 PM - 7:00 PM)">Evening (4:00 PM - 7:00 PM)</option>
                <option value="Anytime Today (Urgent)">Anytime Today (Urgent)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-300">
                  Assign Cleaner(s) / Crew
                </label>
                {assignedCleaners.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setAssignedCleaners([])}
                    className="text-[10px] font-extrabold text-amber-400 hover:text-amber-300 underline cursor-pointer"
                  >
                    Reset to No One
                  </button>
                ) : (
                  <span className="text-[10px] font-bold text-slate-400">Default: No One</span>
                )}
              </div>
              <select
                value=""
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'NONE') {
                    setAssignedCleaners([]);
                  } else if (val) {
                    addCleanerSelection(val);
                  }
                }}
                className="w-full px-3 py-2 bg-[#171b29] border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:border-pink-500 cursor-pointer"
              >
                <option value="">
                  {assignedCleaners.length === 0
                    ? '— No One Assigned (Click to Add Cleaner) —'
                    : `+ Add Another Cleaner (${assignedCleaners.length} Assigned)...`}
                </option>
                <option value="NONE">✕ No One / Leave Unassigned</option>
                {closestCleaners.map((c) => {
                  const alreadyAdded = assignedCleaners.includes(c.tech.name);
                  return (
                    <option key={c.tech.id} value={c.tech.name}>
                      {alreadyAdded ? `✓ ${c.tech.name} (Assigned)` : `+ ${c.tech.name}`} ({c.drivingKm} km • ~{c.driveMins}m)
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Multi-Cleaner Assignment Strip (Default: No One + Click to Add 1, 2, or More Cleaners) */}
          <div className="p-3 rounded-2xl bg-[#171b29] border border-slate-800 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <Users className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span className="text-xs font-extrabold text-slate-200">
                  Assigned to Job:
                </span>
                {assignedCleaners.length === 0 ? (
                  <span className="px-2.5 py-0.5 rounded-lg bg-slate-800 border border-slate-600 text-slate-300 text-[11px] font-extrabold">
                    No One Assigned Yet (Unassigned)
                  </span>
                ) : (
                  assignedCleaners.map((name) => (
                    <span
                      key={`assigned-chip-${name}`}
                      className="px-2.5 py-0.5 rounded-lg bg-emerald-600/25 border border-emerald-400/60 text-emerald-200 text-[11px] font-extrabold flex items-center gap-1.5"
                    >
                      <span>✓ {name}</span>
                      <button
                        type="button"
                        onClick={() => removeCleanerSelection(name)}
                        className="text-emerald-300 hover:text-white font-black cursor-pointer"
                        title={`Remove ${name}`}
                      >
                        ✕
                      </button>
                    </span>
                  ))
                )}
              </div>
              {assignedCleaners.length > 0 && (
                <button
                  type="button"
                  onClick={() => setAssignedCleaners([])}
                  className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-rose-950/70 text-slate-300 hover:text-rose-200 border border-slate-700 text-[10px] font-bold cursor-pointer"
                >
                  Set to No One (Clear All)
                </button>
              )}
            </div>

            {/* Quick Multi-Select Cleaner Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-800/80">
              <span className="text-[10px] font-bold text-slate-400 mr-1">
                Quick Add / Toggle Cleaners (Multi-Select):
              </span>
              <button
                type="button"
                onClick={() => setAssignedCleaners([])}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border transition-all cursor-pointer ${
                  assignedCleaners.length === 0
                    ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-xs'
                    : 'bg-[#0f121c] text-slate-300 border-slate-700 hover:border-slate-500'
                }`}
              >
                {assignedCleaners.length === 0 ? '✓ No One (Default)' : 'No One'}
              </button>
              {closestCleaners.slice(0, 8).map((c) => {
                const isSelected = assignedCleaners.includes(c.tech.name);
                return (
                  <button
                    key={`quick-pick-${c.tech.id}`}
                    type="button"
                    onClick={() => toggleCleanerSelection(c.tech.name)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-xs font-extrabold'
                        : 'bg-[#0f121c] text-slate-300 border-slate-700 hover:border-purple-500/50'
                    }`}
                    title={`${c.tech.name} (${c.drivingKm} km • ~${c.driveMins}m) — Click to ${isSelected ? 'remove' : 'add'}`}
                  >
                    <span>{isSelected ? `✓ ${c.tech.name}` : `+ ${c.tech.name}`}</span>
                    <span className="text-[9.5px] opacity-75 font-mono">({c.drivingKm}km)</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Specific Information, Add-Ons & Access Notes */}
          <div
            className={`space-y-2 p-3 rounded-2xl border transition-all duration-300 ${
              flashingFields.notes || flashingFields.addons
                ? 'bg-[#00ff66]/20 border-[#00ff66] ring-4 ring-[#00ff66]/45 shadow-[0_0_25px_rgba(0,255,102,0.45)]'
                : voiceCapturedFields.notes || voiceCapturedFields.addons
                ? 'bg-emerald-950/30 border-[#00ff66]/60'
                : 'bg-[#151926]/40 border-slate-800/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-300">
                Any Specific Information, Add-ons, or Access Notes (Sent to Jobber &amp; Booking System)
              </label>
              {(voiceCapturedFields.notes || voiceCapturedFields.addons) && (
                <span className="px-2 py-0.5 rounded bg-[#00ff66] text-slate-950 text-[9px] font-black uppercase tracking-wider">
                  ✓ Voice Captured
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_ADDON_TAGS.map((tag) => {
                const active = selectedAddons.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleAddonTag(tag)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                      active
                        ? 'bg-[#00ff66] text-slate-950 border-[#00ff66] font-black shadow-xs'
                        : 'bg-[#171b29] text-slate-300 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    {active ? `✓ ${tag}` : `+ ${tag}`}
                  </button>
                );
              })}
            </div>
            <textarea
              rows={3}
              placeholder="e.g. Lockbox code 4482 on front porch. Please clean inside the oven and fridge, focus on master bath grout, 1 friendly golden retriever..."
              value={quoteNotes}
              onChange={(e) => {
                setQuoteNotes(e.target.value);
                liveValuesRef.current.notes = e.target.value;
              }}
              className={`w-full px-3.5 py-2.5 rounded-xl text-xs placeholder-slate-500 focus:outline-none leading-relaxed ${
                voiceCapturedFields.notes
                  ? 'bg-[#091f14] border-2 border-[#00ff66] text-[#6bffa3]'
                  : 'bg-[#171b29] border border-slate-700/80 text-white focus:border-pink-500'
              }`}
            />
          </div>
        </div>

        {/* RIGHT COLUMN (5 Cols): Quick Quote Price Calculator & 1-Click Jobber / Booking Sync */}
        <div className="lg:col-span-5 bg-[#141218] border border-[#2b2533] rounded-3xl p-5 sm:p-6 space-y-5 shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-[#2b2533]">
            <div>
              <span className="text-[10px] font-bold text-pink-400 uppercase tracking-wider block">
                Step 3 • Instant Phone Quote Calculator
              </span>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <Calculator className="w-4 h-4 text-pink-500" />
                <span>Quick Quote &amp; Jobber Sync</span>
              </h2>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">{bedrooms} • {bathrooms}</span>
          </div>

          {/* 1. Hours Selection */}
          <div
            className={`space-y-2 p-2.5 rounded-2xl border transition-all duration-300 ${
              flashingFields.hours
                ? 'bg-[#00ff66]/20 border-[#00ff66] ring-4 ring-[#00ff66]/45 shadow-[0_0_25px_rgba(0,255,102,0.45)]'
                : voiceCapturedFields.hours
                ? 'bg-emerald-950/30 border-[#00ff66]/60'
                : 'border-transparent p-0'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <span>Hours needed:</span>
                {voiceCapturedFields.hours && (
                  <span className="px-1.5 py-0.5 rounded bg-[#00ff66] text-slate-950 text-[9px] font-black uppercase">
                    ✓ Voice
                  </span>
                )}
              </span>
              <span className={`font-mono font-bold text-base ${voiceCapturedFields.hours ? 'text-[#00ff66]' : 'text-pink-400'}`}>
                {hours} {hours === 1 ? 'hour' : 'hours'}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {[1, 2, 3, 4, 5, 6].map((h) => {
                const isSelected = hours === h;
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => {
                      setHours(h);
                      liveValuesRef.current.hours = h;
                    }}
                    className={`w-10 h-10 rounded-full font-extrabold text-sm transition-all cursor-pointer flex items-center justify-center border ${
                      isSelected
                        ? voiceCapturedFields.hours
                          ? 'bg-[#00ff66] text-slate-950 border-[#00ff66] shadow-[0_0_15px_rgba(0,255,102,0.5)] scale-105 font-black'
                          : 'bg-gradient-to-r from-pink-600 to-rose-600 text-white border-pink-500 shadow-lg scale-105'
                        : 'bg-[#221d2b] text-slate-300 border-[#322c3e] hover:bg-[#2b2537]'
                    }`}
                  >
                    {h}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setHours((prev) => Math.min(16, prev + 1))}
                className="px-3 h-10 rounded-full bg-[#221d2b] hover:bg-[#2b2537] text-slate-200 border border-[#322c3e] font-bold text-xs transition-colors cursor-pointer"
              >
                +1 hr
              </button>
              <button
                type="button"
                onClick={() => setHours((prev) => prev + 0.5)}
                className="px-3 h-10 rounded-full bg-[#221d2b] hover:bg-[#2b2537] text-slate-200 border border-[#322c3e] font-bold text-xs transition-colors cursor-pointer"
              >
                +½ hr
              </button>
            </div>
          </div>

          {/* 2. Cleaner Crew Selection — Formula: Number of Cleaners ( QTY × Unit Price ) = Total */}
          <div
            className={`space-y-2 p-2.5 rounded-2xl border transition-all duration-300 ${
              flashingFields.crew
                ? 'bg-[#00ff66]/20 border-[#00ff66] ring-4 ring-[#00ff66]/45 shadow-[0_0_25px_rgba(0,255,102,0.45)]'
                : voiceCapturedFields.crew
                ? 'bg-emerald-950/30 border-[#00ff66]/60'
                : 'border-transparent p-0'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="block font-semibold text-slate-300 text-xs flex items-center gap-1.5">
                <span>Cleaners &amp; Unit Price:</span>
                {voiceCapturedFields.crew && (
                  <span className="px-1.5 py-0.5 rounded bg-[#00ff66] text-slate-950 text-[9px] font-black uppercase">
                    ✓ Voice
                  </span>
                )}
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                {crewSelection === '2_CLEANERS' ? '2 Cleaners' : '1 Cleaner'} ({hours} × ${hourlyRate.toFixed(2)}) = ${calculations.labor.toFixed(2)}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  if (crewSelection === '2_CLEANERS') {
                    setHours((prev) => Math.round(prev * 2 * 100) / 100);
                  }
                  setCrewSelection('1_CLEANER');
                }}
                className={`p-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer border text-center ${
                  crewSelection === '1_CLEANER'
                    ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white border-pink-500 shadow-md'
                    : 'bg-[#221d2b] text-slate-300 border-[#322c3e] hover:bg-[#2b2537]'
                }`}
              >
                <div className="font-extrabold">1 cleaner</div>
                <div className="text-[11px] font-mono mt-0.5 opacity-90">$52.50/hr</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (crewSelection === '1_CLEANER') {
                    setHours((prev) => Math.max(1, Math.round((prev / 2) * 100) / 100));
                  }
                  setCrewSelection('2_CLEANERS');
                }}
                className={`p-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer border text-center ${
                  crewSelection === '2_CLEANERS'
                    ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white border-pink-500 shadow-md'
                    : 'bg-[#221d2b] text-slate-300 border-[#322c3e] hover:bg-[#2b2537]'
                }`}
              >
                <div className="font-extrabold">2 cleaners</div>
                <div className="text-[11px] font-mono mt-0.5 opacity-90">$105.00/hr</div>
              </button>
              <button
                type="button"
                onClick={() => setCrewSelection('CUSTOM')}
                className={`p-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer border text-center ${
                  crewSelection === 'CUSTOM'
                    ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white border-pink-500 shadow-md'
                    : 'bg-[#221d2b] text-slate-300 border-[#322c3e] hover:bg-[#2b2537]'
                }`}
              >
                <div className="font-extrabold">Custom</div>
                <div className="text-[11px] font-mono mt-0.5 opacity-90">${customHourlyRate}/hr</div>
              </button>
            </div>
          </div>

          {/* 3. Big Calculated Price Box (Includes Deposit & Balance Due) */}
          <div className="p-4 bg-gradient-to-b from-[#1b1724] to-[#16131d] border border-[#322c3e] rounded-2xl shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-pink-400 uppercase tracking-widest font-black">
                Total Quoted Price (Synced with Google)
              </span>
              <span className="text-[11px] font-bold text-slate-300">
                {bedrooms} • {bathrooms}
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight flex items-baseline gap-1">
                  <span className="text-pink-500 text-2xl">$</span>
                  <span>{calculations.total.toFixed(2)}</span>
                  <span className="text-xs text-slate-400 font-sans font-medium ml-1">CAD</span>
                </div>
                {depositAmount > 0 && (
                  <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-[11px] font-extrabold">
                      Deposit: ${Number(depositAmount).toFixed(2)}
                    </span>
                    <span className="text-[11px] text-slate-300 font-mono">
                      Balance Due: <strong className="text-emerald-400">${calculations.balanceDue.toFixed(2)}</strong>
                    </span>
                  </div>
                )}
              </div>
              <div className="text-right text-xs text-slate-400 font-mono space-y-0.5">
                <div>Labor: <span className="text-slate-200 font-bold">${calculations.labor.toFixed(2)}</span></div>
                <div>Fuel: <span className="text-slate-200 font-bold">+${Number(fuelSurcharge).toFixed(2)}</span></div>
                {discountAmount > 0 && (
                  <div className="text-emerald-400 font-bold">Discount: -${Number(discountAmount).toFixed(2)}</div>
                )}
                <div>Tax (12.5%): <span className="text-slate-200 font-bold">+{applyTax ? `$${calculations.tax.toFixed(2)}` : '$0'}</span></div>
              </div>
            </div>
          </div>

          {/* 4. Customizable Discount Price ($10, $20, $40, $50 or Custom $) */}
          <div className="p-3.5 bg-[#1b1724] border border-[#322c3e] rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-emerald-400 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                <span>Customize Discount Price</span>
              </span>
              <button
                type="button"
                onClick={() => setApplyTax(!applyTax)}
                className={`py-0.5 px-2.5 rounded-lg text-[11px] font-bold border cursor-pointer ${
                  applyTax
                    ? 'bg-pink-600/20 text-pink-300 border-pink-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {applyTax ? '12.5% Tax ON' : 'Tax Exempt'}
              </button>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {[10, 20, 40, 50].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setDiscountAmount(discountAmount === amt ? 0 : amt)}
                  className={`py-1.5 px-3 rounded-xl text-xs font-extrabold border cursor-pointer transition-all ${
                    discountAmount === amt
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow-md'
                      : 'bg-[#221d2b] text-slate-300 border-[#322c3e] hover:bg-[#2b2537]'
                  }`}
                >
                  -${amt} off
                </button>
              ))}
              {discountAmount > 0 && (
                <button
                  type="button"
                  onClick={() => setDiscountAmount(0)}
                  className="py-1 px-2 text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Direct Custom Discount Dollar Input (e.g., $40 or any custom amount) */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-slate-300 font-semibold whitespace-nowrap">Custom Discount -$</span>
              <input
                type="number"
                min="0"
                step="5"
                placeholder="40"
                value={discountAmount || ''}
                onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value) || 0))}
                className="w-28 px-3 py-1.5 bg-[#120f18] border border-emerald-500/40 rounded-xl text-emerald-300 font-mono font-bold text-xs focus:outline-none focus:border-emerald-400"
              />
              <span className="text-[11px] text-slate-400">Type $40 or any custom discount</span>
            </div>
          </div>

          {/* 5. Add Deposit Amount Link & Selector ($50 / $100 / Custom — Syncs with Google) */}
          <div className="p-3.5 bg-[#1b1724] border border-amber-500/30 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowDepositPanel(!showDepositPanel)}
                className="text-xs font-extrabold text-amber-300 hover:text-amber-200 flex items-center gap-1.5 cursor-pointer underline decoration-amber-500/60 underline-offset-4"
              >
                <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {depositAmount > 0
                    ? `Deposit Added: $${Number(depositAmount).toFixed(2)} (Click to Edit)`
                    : '+ Add a Deposit Amount ($50 or $100)'}
                </span>
              </button>
              <span className="text-[10px] font-bold text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 rounded-md">
                Syncs to Google
              </span>
            </div>

            {showDepositPanel && (
              <div className="space-y-2 pt-1 animate-fadeIn">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDepositAmount(50)}
                    className={`py-2 px-3 rounded-xl text-xs font-black border cursor-pointer transition-all ${
                      depositAmount === 50
                        ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md'
                        : 'bg-[#221d2b] text-slate-200 border-[#322c3e] hover:bg-[#2b2537]'
                    }`}
                  >
                    $50 Deposit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDepositAmount(100)}
                    className={`py-2 px-3 rounded-xl text-xs font-black border cursor-pointer transition-all ${
                      depositAmount === 100
                        ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md'
                        : 'bg-[#221d2b] text-slate-200 border-[#322c3e] hover:bg-[#2b2537]'
                    }`}
                  >
                    $100 Deposit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDepositAmount(0)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                      depositAmount === 0
                        ? 'bg-slate-700 text-white border-slate-500'
                        : 'bg-[#221d2b] text-slate-400 border-[#322c3e] hover:bg-[#2b2537]'
                    }`}
                  >
                    No Deposit ($0)
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-300 font-semibold whitespace-nowrap">Custom Deposit $</span>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(Math.max(0, Number(e.target.value) || 0))}
                    className="w-28 px-3 py-1.5 bg-[#120f18] border border-amber-500/40 rounded-xl text-amber-300 font-mono font-bold text-xs focus:outline-none focus:border-amber-400"
                  />
                  <span className="text-[11px] text-slate-400">
                    Remaining balance: <strong className="text-white font-mono">${calculations.balanceDue.toFixed(2)}</strong>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 6. Primary Action Buttons: Strict Jobber Order (Step 1: Create Client -> Step 2: Create Request or Quote) + Clean Google Sheet Sync */}
          <div className="space-y-2.5 pt-1">
            <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between gap-2 text-[11px] text-emerald-200 font-bold">
              <span>Jobber Sync Order: <strong>1. Create Client &amp; Property</strong> → <strong>2. Create Request or Quote</strong> → <strong>3. Clean Google Sheet</strong></span>
              <span className="px-2 py-0.5 rounded bg-emerald-600/30 text-emerald-300 font-mono text-[10px]">Client ID: 27966135...</span>
            </div>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSaveJobberQuote(false)}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-xs sm:text-sm font-black shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>1. Create Client in Jobber → 2. Create Quote (${calculations.total.toFixed(2)}, ${depositAmount} Dep) + Clean Sheet</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSaveJobberQuote(true)}
              className="w-full py-2.5 px-4 bg-[#182235] hover:bg-[#1f2c44] border border-cyan-500/40 text-cyan-200 rounded-2xl text-xs font-extrabold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
            >
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span>1. Create Client in Jobber → 2. Create Service Request Only + Add to Clean Sheet</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSendToBookingAndDispatch}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-pink-600 via-fuchsia-600 to-purple-600 hover:opacity-95 text-white rounded-2xl text-xs sm:text-sm font-black shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>Send to Booking System, Clean Google Sheet &amp; Dispatch (${calculations.total.toFixed(2)})</span>
            </button>
          </div>

          {/* Live Google Exact Layout & Prices Preview Box */}
          <div className="p-3.5 bg-[#121521] border border-blue-500/30 rounded-2xl space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 font-extrabold text-blue-300">
                <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                <span>Google Synced Layout &amp; Prices</span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  disabled={isSyncingLiveSheet}
                  onClick={handlePushLiveToDriveGoogleSheet}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-3 h-3" />
                  <span>{isSyncingLiveSheet ? 'Pushing to Drive...' : 'Push to Live Google Sheet'}</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const data = await syncClientAndQuoteToGoogle();
                    const tsvToCopy = data?.tsv || googleSyncedTsv;
                    if (tsvToCopy) {
                      navigator.clipboard?.writeText(tsvToCopy);
                      setCopiedGoogleRow(true);
                      setTimeout(() => setCopiedGoogleRow(false), 2500);
                    }
                    setFeedbackTone('success');
                    setFeedbackNotice(
                      `✓ Synced ${customerName || 'Client'} to Clean Sheet Hub & copied TSV row (Total $${calculations.total.toFixed(2)}, Discount -$${discountAmount}, Deposit $${depositAmount})!`
                    );
                  }}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  {copiedGoogleRow ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedGoogleRow ? 'Synced & Copied!' : 'Sync & Copy Google Row'}</span>
                </button>
                <a
                  href={activeSheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 border border-blue-500/30 font-bold text-[11px] flex items-center gap-1"
                >
                  <span>Open Google Sheet</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-1 text-[10px] font-mono">
              <div className="p-1.5 rounded-lg bg-[#191d2d] border border-slate-800">
                <span className="text-slate-400 block">Labor</span>
                <span className="text-white font-bold">${calculations.labor.toFixed(2)}</span>
              </div>
              <div className="p-1.5 rounded-lg bg-[#191d2d] border border-slate-800">
                <span className="text-slate-400 block">Fuel</span>
                <span className="text-white font-bold">+${Number(fuelSurcharge).toFixed(2)}</span>
              </div>
              <div className="p-1.5 rounded-lg bg-[#191d2d] border border-slate-800">
                <span className="text-slate-400 block">Discount</span>
                <span className="text-emerald-400 font-bold">-${Number(discountAmount).toFixed(2)}</span>
              </div>
              <div className="p-1.5 rounded-lg bg-[#191d2d] border border-slate-800">
                <span className="text-slate-400 block">Tax 12.5%</span>
                <span className="text-white font-bold">${calculations.tax.toFixed(2)}</span>
              </div>
              <div className="p-1.5 rounded-lg bg-[#191d2d] border border-pink-500/40">
                <span className="text-pink-300 block">Total</span>
                <span className="text-pink-400 font-black">${calculations.total.toFixed(2)}</span>
              </div>
              <div className="p-1.5 rounded-lg bg-[#191d2d] border border-amber-500/40">
                <span className="text-amber-300 block">Deposit</span>
                <span className="text-amber-400 font-black">${Number(depositAmount).toFixed(2)}</span>
              </div>
            </div>
            {googleSyncedRow && (
              <div className="text-[11px] text-emerald-400 font-bold flex items-center gap-1.5 pt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Last synced to Google: {googleSyncedRow.clientName} ({googleSyncedRow.totalQuotedPrice}, Deposit {googleSyncedRow.depositRequired})</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          SECTION 3: EMBEDDED QUICK MAP, 2-ADDRESS PICKER & WEEKLY/MONTHLY SCHEDULE
         ───────────────────────────────────────────────────────────────────────────── */}
      <div className="bg-[#121520] border border-slate-800/90 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">
              Step 4 • Live Two-Address Route Picker &amp; Weekly / Monthly Schedule Map
            </span>
            <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
              <Compass className="w-5 h-5 text-purple-400" />
              <span>Quick Map: Pick 2 Addresses &amp; View Schedule ({filteredScheduleVisits.length} Visits)</span>
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Any-Date Picker Input */}
            <div className="flex items-center gap-1 bg-[#191d2c] p-1 rounded-xl border border-purple-500/40">
              <button
                type="button"
                onClick={() => {
                  const next = shiftQuickDate(selectedQuickMapDate, -1);
                  setSelectedQuickMapDate(next);
                  setScheduleHorizon('CUSTOM_DATE');
                }}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-black text-white cursor-pointer"
                title="Previous Day"
              >
                &larr;
              </button>
              <input
                type="date"
                value={selectedQuickMapDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedQuickMapDate(e.target.value);
                    setScheduleHorizon('CUSTOM_DATE');
                  }
                }}
                className="bg-transparent text-white text-xs font-mono font-black px-2 py-0.5 focus:outline-none cursor-pointer"
              />
              <button
                type="button"
                onClick={() => {
                  const next = shiftQuickDate(selectedQuickMapDate, 1);
                  setSelectedQuickMapDate(next);
                  setScheduleHorizon('CUSTOM_DATE');
                }}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-black text-white cursor-pointer"
                title="Next Day"
              >
                &rarr;
              </button>
            </div>

            {/* Schedule Horizon Filter Buttons: Selected Date, Today, Tomorrow, 7d Forward, Full Month, All */}
            <div className="flex items-center bg-[#191d2c] p-1 rounded-xl border border-slate-700/80 gap-1 flex-wrap">
              {(
                [
                  { id: 'CUSTOM_DATE', label: `Selected Day (${selectedQuickMapDate})` },
                  { id: 'TODAY', label: `Today (${liveToday.formattedShort})` },
                  { id: 'TOMORROW', label: 'Tomorrow' },
                  { id: 'WEEK', label: '7 Days Forward' },
                  { id: 'MONTH', label: 'Full Month' },
                  { id: 'ALL', label: 'All Scheduled' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    if (tab.id === 'TODAY') setSelectedQuickMapDate(liveToday.dateString);
                    if (tab.id === 'TOMORROW') setSelectedQuickMapDate(shiftQuickDate(liveToday.dateString, 1));
                    setScheduleHorizon(tab.id);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                    scheduleHorizon === tab.id
                      ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowTwoAddressCompare(!showTwoAddressCompare)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                showTwoAddressCompare
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-slate-800 text-slate-200 border-slate-700'
              }`}
            >
              <Route className="w-3.5 h-3.5" />
              <span>Pick 2 Addresses</span>
            </button>

            <button
              type="button"
              onClick={() => setQuickMapType(quickMapType === 'roadmap' ? 'hybrid' : 'roadmap')}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              <span>{quickMapType === 'roadmap' ? 'Satellite' : 'Streets'}</span>
            </button>
            {onNavigateToMap && (
              <button
                type="button"
                onClick={onNavigateToMap}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <span>Open Full Dispatch Map</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 14-Day (This Week Mon-Sun + Next Week Mon-Sun) Quick Day-of-Week Selector Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {quickMapTwoWeekDays.map((d, idx) => {
            const isSel = scheduleHorizon === 'CUSTOM_DATE' && selectedQuickMapDate === d.iso;
            return (
              <React.Fragment key={d.iso}>
                {idx === 0 && (
                  <span className="text-[9px] font-black uppercase text-purple-400 pr-1 shrink-0">This Wk:</span>
                )}
                {idx === 7 && (
                  <span className="text-[9px] font-black uppercase text-pink-400 pl-2 pr-1 border-l border-slate-700 shrink-0">
                    Next Wk:
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedQuickMapDate(d.iso);
                    setScheduleHorizon('CUSTOM_DATE');
                  }}
                  className={`px-2.5 py-1 rounded-xl text-left shrink-0 cursor-pointer transition-all border flex items-center gap-1.5 ${
                    isSel
                      ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white border-pink-400 font-black shadow-md'
                      : d.jobCount > 0
                      ? 'bg-[#191d2c] hover:bg-slate-800 text-white border-slate-700'
                      : 'bg-[#141724] hover:bg-slate-800 text-slate-400 border-slate-800'
                  }`}
                >
                  <div>
                    <div className="text-[10px] font-black leading-none">{d.dayShort}</div>
                    <div className="text-[9px] font-mono opacity-80">{d.dateLabel}</div>
                  </div>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-black ${
                      isSel
                        ? 'bg-white text-purple-900'
                        : d.jobCount > 0
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {d.jobCount}
                  </span>
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Two-Address Picker Bar (Address A ↔ Address B Distance & Drive Time Calculator) */}
        {showTwoAddressCompare && (
          <div className="p-4 rounded-2xl bg-[#181c2b] border border-emerald-500/30 grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
            <div className="lg:col-span-4 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-extrabold text-pink-400 uppercase tracking-wider">📍 Address A (First Address)</span>
                <select
                  value=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    setServiceAddress(e.target.value);
                    geocodeAddressOnQuickMap(e.target.value, false);
                  }}
                  className="bg-[#111420] border border-slate-700 rounded-lg px-2 py-0.5 text-[10px] text-slate-300"
                >
                  <option value="">Pick from scheduled jobs...</option>
                  {filteredScheduleVisits.map((v: any) => (
                    <option key={`a-${v.id}`} value={v.serviceAddress}>
                      {formatDateTime(v.startAt).dateStr} • {v.clientName} — {v.serviceAddress}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={serviceAddress}
                  onChange={(e) => {
                    setServiceAddress(e.target.value);
                    geocodeAddressOnQuickMap(e.target.value, false);
                  }}
                  placeholder="Enter first address in Edmonton..."
                  className="w-full px-3 py-2 rounded-xl bg-[#111420] border border-pink-500/40 text-xs text-white font-semibold focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>

            <div className="lg:col-span-4 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-extrabold text-cyan-400 uppercase tracking-wider">🏁 Address B (Second Address)</span>
                <select
                  value=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    setSecondAddress(e.target.value);
                    geocodeAddressOnQuickMap(e.target.value, true);
                  }}
                  className="bg-[#111420] border border-slate-700 rounded-lg px-2 py-0.5 text-[10px] text-slate-300"
                >
                  <option value="">Pick from scheduled jobs...</option>
                  {filteredScheduleVisits.map((v: any) => (
                    <option key={`b-${v.id}`} value={v.serviceAddress}>
                      {formatDateTime(v.startAt).dateStr} • {v.clientName} — {v.serviceAddress}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={secondAddress}
                  onChange={(e) => {
                    setSecondAddress(e.target.value);
                    geocodeAddressOnQuickMap(e.target.value, true);
                  }}
                  placeholder="Enter second address to compare..."
                  className="w-full px-3 py-2 rounded-xl bg-[#111420] border border-cyan-500/40 text-xs text-white font-semibold focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="lg:col-span-4 flex items-center justify-between gap-3 bg-[#111420] p-3 rounded-xl border border-slate-800">
              <div>
                <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                  Route A ↔ B Distance &amp; Drive Time
                </div>
                <div className="text-base font-black text-white font-mono mt-0.5">
                  {twoAddressMetrics.drivingKm} km • ~{twoAddressMetrics.driveMins} mins drive
                </div>
                <div className="text-[10px] text-slate-400 truncate max-w-[210px]">
                  {serviceAddress.split(',')[0]} → {secondAddress.split(',')[0]}
                </div>
              </div>
              <a
                href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(serviceAddress)}&destination=${encodeURIComponent(secondAddress)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-1 shrink-0 shadow-md"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Directions</span>
              </a>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Interactive Street & Satellite Quick Map (7 Cols) */}
          <div className="lg:col-span-7 h-[420px] sm:h-[460px] rounded-2xl overflow-hidden border border-slate-700/80 relative bg-slate-200 select-none">
            <div
              onMouseDown={(e) => {
                if (e.button !== 0) return;
                setIsDraggingMap(true);
                setMapDragStart({ x: e.clientX - quickMapPan.x, y: e.clientY - quickMapPan.y });
              }}
              onMouseMove={(e) => {
                if (!isDraggingMap) return;
                setQuickMapPan({ x: e.clientX - mapDragStart.x, y: e.clientY - mapDragStart.y });
              }}
              onMouseUp={() => setIsDraggingMap(false)}
              className={`w-full h-full relative overflow-hidden cursor-${isDraggingMap ? 'grabbing' : 'grab'}`}
            >
              <div
                className="absolute inset-0 transition-transform duration-75 origin-center"
                style={{
                  transform: `translate(${quickMapPan.x}px, ${quickMapPan.y}px) scale(${quickMapZoom})`,
                  width: '100%',
                  height: '100%',
                }}
              >
                {/* Real Georeferenced Edmonton Street & Satellite Map Tiles */}
                <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">
                  {[665, 666, 667, 668, 669, 670].map((ty) =>
                    [376, 377, 378, 379, 380].map((tx) => {
                      const z = 11;
                      const nTiles = Math.pow(2, z);
                      const tileMinLng = (tx / nTiles) * 360 - 180;
                      const tileMaxLng = ((tx + 1) / nTiles) * 360 - 180;
                      const tileMaxLat = (180 / Math.PI) * Math.atan(Math.sinh(Math.PI * (1 - (2 * ty) / nTiles)));
                      const tileMinLat = (180 / Math.PI) * Math.atan(Math.sinh(Math.PI * (1 - (2 * (ty + 1)) / nTiles)));

                      const leftPct = ((tileMinLng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * 100;
                      const rightPct = ((tileMaxLng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * 100;
                      const topPct = ((MAP_BOUNDS.maxLat - tileMaxLat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * 100;
                      const bottomPct = ((MAP_BOUNDS.maxLat - tileMinLat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * 100;

                      const isSat = quickMapType === 'hybrid';
                      const url = isSat
                        ? `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${ty}/${tx}`
                        : `https://basemaps.cartocdn.com/rastertiles/voyager/${z}/${tx}/${ty}@2x.png`;

                      return (
                        <img
                          key={`qm-${tx}-${ty}`}
                          src={url}
                          alt=""
                          draggable={false}
                          style={{
                            position: 'absolute',
                            left: `${leftPct}%`,
                            top: `${topPct}%`,
                            width: `${rightPct - leftPct + 0.08}%`,
                            height: `${bottomPct - topPct + 0.08}%`,
                            maxWidth: 'none',
                          }}
                          className="select-none pointer-events-none object-fill"
                        />
                      );
                    })
                  )}
                </div>

                {/* Connector Lines: Address A ↔ Address B + Top 3 Closest Cleaners */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {showTwoAddressCompare && (
                    <path
                      d={`M ${targetPinPos.x} ${targetPinPos.y} L ${secondPinPos.x} ${secondPinPos.y}`}
                      fill="none"
                      stroke="#06B6D4"
                      strokeWidth="0.9"
                      strokeDasharray="1.5,0.8"
                    />
                  )}
                  {closestCleaners.slice(0, 3).map((c, idx) => {
                    const cPos = projectMapCoord(c.lat, c.lng);
                    return (
                      <path
                        key={`qm-line-${c.tech.id}`}
                        d={`M ${cPos.x} ${cPos.y} L ${targetPinPos.x} ${targetPinPos.y}`}
                        fill="none"
                        stroke={idx === 0 ? '#10B981' : '#9333EA'}
                        strokeWidth={idx === 0 ? '0.65' : '0.4'}
                        strokeDasharray={idx === 0 ? undefined : '1.2,0.8'}
                      />
                    );
                  })}
                </svg>

                {/* Scheduled Jobs Pins for Selected Schedule Horizon (All Weeks Included) */}
                {filteredScheduleVisits.map((v: any) => {
                  const vCoords = v.lat && v.lng ? { lat: v.lat, lng: v.lng } : resolveQuickEdmontonCoords(v.serviceAddress);
                  const pos = projectMapCoord(vCoords.lat, vCoords.lng);
                  const dt = formatDateTime(v.startAt);
                  return (
                    <div
                      key={`qm-visit-${v.id}`}
                      onClick={() => {
                        setSecondAddress(v.serviceAddress);
                        setSecondCoords(vCoords);
                        setShowTwoAddressCompare(true);
                      }}
                      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-15 flex flex-col items-center cursor-pointer group"
                      title={`${v.clientName} (${dt.dateStr}) — Click to set as Address B`}
                    >
                      <div className="px-1.5 py-0.5 rounded bg-purple-900/90 text-purple-100 border border-purple-400/60 text-[8.5px] font-bold whitespace-nowrap mb-0.5 shadow-sm">
                        📅 {dt.dateStr} • {v.clientName.split(' ')[0]}
                      </div>
                      <div className="w-4 h-4 rounded-full bg-purple-600 border border-white shadow-md" />
                    </div>
                  );
                })}

                {/* Pin A: Caller Property Pin */}
                <div
                  style={{ left: `${targetPinPos.x}%`, top: `${targetPinPos.y}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center"
                >
                  <div className="px-2.5 py-1 bg-pink-600 text-white rounded-lg text-[10px] font-black shadow-xl whitespace-nowrap mb-1 border border-white">
                    📍 A: {customerName || serviceAddress.split(',')[0]} (${calculations.total.toFixed(0)})
                  </div>
                  <div className="w-7 h-7 rounded-full bg-pink-600 border-2 border-white shadow-xl flex items-center justify-center text-white font-black text-xs">
                    A
                  </div>
                </div>

                {/* Pin B: Second Comparison Address Pin */}
                {showTwoAddressCompare && (
                  <div
                    style={{ left: `${secondPinPos.x}%`, top: `${secondPinPos.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center"
                  >
                    <div className="px-2.5 py-1 bg-cyan-600 text-white rounded-lg text-[10px] font-black shadow-xl whitespace-nowrap mb-1 border border-white">
                      🏁 B: {secondAddress.split(',')[0]} ({twoAddressMetrics.drivingKm} km)
                    </div>
                    <div className="w-7 h-7 rounded-full bg-cyan-600 border-2 border-white shadow-xl flex items-center justify-center text-white font-black text-xs">
                      B
                    </div>
                  </div>
                )}

                {/* All 15 Cleaner Home Hubs & Cleaners Pins */}
                {closestCleaners.map((c) => {
                  const pos = projectMapCoord(c.lat, c.lng);
                  const isAssigned = assignedCleaners.includes(c.tech.name);
                  return (
                    <div
                      key={`qm-tech-${c.tech.id}`}
                      onClick={() => toggleCleanerSelection(c.tech.name)}
                      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center cursor-pointer group"
                      title={`Click to ${isAssigned ? 'remove' : 'add'} ${c.tech.name}`}
                    >
                      <div
                        className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold shadow-md border whitespace-nowrap mb-0.5 ${
                          isAssigned
                            ? 'bg-emerald-600 text-white border-emerald-300'
                            : 'bg-white text-slate-900 border-slate-300'
                        }`}
                      >
                        {isAssigned ? '✓ ' : ''}{c.tech.name.split(' ')[0]} • {c.drivingKm}km
                      </div>
                      <div
                        className="w-6 h-6 rounded-xl border-2 border-white shadow-md flex items-center justify-center text-white"
                        style={{ backgroundColor: c.tech.color || '#7C3AED' }}
                      >
                        <Home className="w-3 h-3" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Zoom Controls on Quick Map */}
              <div className="absolute bottom-3 right-3 z-30 flex flex-col gap-1 bg-white/95 rounded-xl border border-slate-300 p-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => setQuickMapZoom((z) => Math.min(3.2, Number((z + 0.25).toFixed(2))))}
                  className="p-1.5 text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setQuickMapZoom((z) => Math.max(0.85, Number((z - 0.25).toFixed(2))))}
                  className="p-1.5 text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setQuickMapZoom(1.2);
                    setQuickMapPan({ x: 0, y: 0 });
                  }}
                  className="p-1.5 text-slate-800 hover:bg-slate-100 rounded-lg border-t border-slate-200 cursor-pointer"
                  title="Reset Map"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column (5 Cols): Closest Cleaners + Live Today / Week / Month Schedule List */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            {/* Closest Cleaners (Multi-Select or Leave as No One) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs gap-2 flex-wrap">
                <span className="font-extrabold text-white">
                  Closest Cleaners to Address A ({assignedCleaners.length === 0 ? 'No One Assigned' : `${assignedCleaners.length} Assigned`})
                </span>
                <div className="flex items-center gap-2">
                  {assignedCleaners.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setAssignedCleaners([])}
                      className="text-[10px] font-extrabold text-amber-400 hover:text-amber-300 underline cursor-pointer"
                    >
                      Set to No One
                    </button>
                  )}
                  <span className="text-slate-400 text-[11px]">Click to add/remove multiple</span>
                </div>
              </div>

              <div className="space-y-1.5 max-h-[195px] overflow-y-auto pr-1">
                {closestCleaners.map((c, idx) => {
                  const isAssigned = assignedCleaners.includes(c.tech.name);
                  return (
                    <div
                      key={c.tech.id}
                      onClick={() => toggleCleanerSelection(c.tech.name)}
                      className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isAssigned
                          ? 'bg-emerald-950/60 border-emerald-500/80 shadow-md'
                          : 'bg-[#171b29] border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-7 h-7 rounded-xl flex items-center justify-center text-white font-black text-xs shrink-0"
                          style={{ backgroundColor: c.tech.color || '#7C3AED' }}
                        >
                          {isAssigned ? '✓' : `#${idx + 1}`}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-extrabold text-xs text-white truncate">{c.tech.name}</span>
                            {isAssigned && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 border border-emerald-400/50 text-[9.5px] font-black text-emerald-300">
                                ASSIGNED
                              </span>
                            )}
                            {idx === 0 && (
                              <span className="text-[10px] font-bold text-amber-300 flex items-center gap-0.5">
                                <Award className="w-3 h-3" /> Closest
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 truncate">
                            {c.tech.depotLocation?.address || c.tech.homeAddress}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono font-black text-xs text-emerald-400">
                          {c.drivingKm} km
                        </div>
                        <div className="text-[10px] text-slate-400">~{c.driveMins} mins</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Fully Scrollable 4-Week / Full-Month Schedule on Quick Map */}
            <div className="p-3.5 rounded-2xl bg-[#171b29] border border-purple-500/30 space-y-2.5 flex flex-col">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-extrabold text-white">
                    Live Schedule • Today is {liveToday.formattedFull} ({filteredScheduleVisits.length} Visits)
                  </span>
                </div>
                {onNavigateToSchedule && (
                  <button
                    type="button"
                    onClick={onNavigateToSchedule}
                    className="text-[11px] font-bold text-purple-300 hover:text-white cursor-pointer"
                  >
                    Full Calendar →
                  </button>
                )}
              </div>

              {/* Direct Week 1 / Week 2 / Week 3 / Week 4 / Last 2 Weeks Quick Filter */}
              <div className="flex items-center gap-1 flex-wrap">
                {(
                  [
                    { id: 'TODAY', label: `Today (${liveToday.formattedShort})` },
                    { id: 'WEEK_1', label: 'Wk 1 (1–7)' },
                    { id: 'WEEK_2', label: 'Wk 2 (8–14)' },
                    { id: 'WEEK_3', label: 'Wk 3 (15–21)' },
                    { id: 'WEEK_4', label: 'Wk 4 (22–31)' },
                    { id: 'WEEKS_3_4', label: 'Last 2 Wks (15–31)' },
                    { id: 'MONTH', label: 'All 4 Wks (Full Month)' },
                  ] as const
                ).map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setScheduleHorizon(w.id)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border transition-all cursor-pointer ${
                      scheduleHorizon === w.id
                        ? 'bg-purple-600 text-white border-purple-400 shadow-2xs'
                        : 'bg-[#111420] text-slate-300 border-slate-700 hover:border-purple-500/50'
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>

              <div className="space-y-1.5 max-h-[310px] overflow-y-auto pr-1">
                {filteredScheduleVisits.length === 0 ? (
                  <div className="p-3 rounded-xl bg-[#111420] text-slate-400 text-xs text-center">
                    No scheduled visits in this window. Click "All 4 Wks (Full Month)" or "Last 2 Wks (15–31)" above.
                  </div>
                ) : (
                  filteredScheduleVisits.map((v: any) => {
                    const dt = formatDateTime(v.startAt);
                    const isVisitToday = dt.dateString === liveToday.dateString;
                    return (
                      <div
                        key={v.id}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                          isVisitToday
                            ? 'bg-amber-950/40 border-amber-500/70'
                            : 'bg-[#111420] border-slate-800 hover:border-purple-500/50'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${
                                isVisitToday
                                  ? 'bg-amber-500 text-slate-950 font-black'
                                  : 'bg-purple-500/20 text-purple-300'
                              }`}
                            >
                              {isVisitToday ? `TODAY • ${dt.dateStr}` : dt.dateStr} • {dt.timeStr}
                            </span>
                            <span className="font-bold text-white truncate">{v.clientName}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">
                            📍 {v.serviceAddress} • {(v.assignedCleaners && v.assignedCleaners.join(' & ')) || 'Assigned'}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setServiceAddress(v.serviceAddress);
                              geocodeAddressOnQuickMap(v.serviceAddress, false);
                            }}
                            className="px-2 py-1 rounded-lg bg-pink-600/20 hover:bg-pink-600 text-pink-300 hover:text-white border border-pink-500/40 text-[10px] font-black cursor-pointer"
                            title="Set as Address A"
                          >
                            Set A
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSecondAddress(v.serviceAddress);
                              geocodeAddressOnQuickMap(v.serviceAddress, true);
                              setShowTwoAddressCompare(true);
                            }}
                            className="px-2 py-1 rounded-lg bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/40 text-[10px] font-black cursor-pointer"
                            title="Set as Address B to compare distance"
                          >
                            Set B
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Quote Detail & "This is your quote" SMS Modal */}
      {createdQuoteModalItem && (
        <QuoteDetailModal
          isOpen={Boolean(createdQuoteModalItem)}
          quote={createdQuoteModalItem}
          projectId={projectId}
          onClose={() => setCreatedQuoteModalItem(null)}
          onQuoteUpdated={(updated) => {
            setCreatedQuoteModalItem(updated);
            if (onQuoteCreated) onQuoteCreated(updated);
          }}
        />
      )}

      {/* Service Catalog & Price List Modal */}
      <ServiceCatalogModal
        isOpen={isCatalogModalOpen}
        onClose={() => setIsCatalogModalOpen(false)}
        catalog={localCatalog || CANONICAL_SERVICE_CATALOG}
        onCatalogUpdated={(newCat) => {
          setLocalCatalog(newCat);
          if (onCatalogUpdated) onCatalogUpdated(newCat);
        }}
        onSelectForQuote={(item) => {
          applyCatalogItemToQuote(item);
        }}
        projectId={projectId}
      />
    </div>
  );
};
