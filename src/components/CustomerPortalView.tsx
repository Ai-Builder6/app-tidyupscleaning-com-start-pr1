import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { triggerGoogleAdsConversion } from './CookieConsentBanner';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  Calendar,
  ShieldCheck,
  Mail,
  ArrowRight,
  Check,
  Star,
  Key,
  Brush,
  HeartHandshake,
  ExternalLink,
  Mic,
  MicOff,
  Wand2,
  Copy,
  RefreshCw,
  Globe,
  Lock,
  Unlock,
  Users,
  ChevronLeft,
  ChevronRight,
  Tag,
  FileText,
  HelpCircle,
  X,
  Volume2,
  Calculator,
} from 'lucide-react';
import { AddressAutocompleteInput } from './AddressAutocompleteInput';
import { ServiceTicket } from '../types/dispatch';
import {
  ServiceCatalogItem,
  CANONICAL_SERVICE_CATALOG,
  matchCatalogItem,
} from '../data/serviceCatalogData';
import { PublicBookingModal } from './PublicBookingModal';
import { TidyUpsBunnyLogo } from './TidyUpsBunnyLogo';

export interface CustomerBookingSubmissionPayload {
  ticket: ServiceTicket;
  quote?: any;
  lead?: any;
  client?: any;
  visit?: any;
  unscheduledJob?: any;
}

interface CustomerPortalViewProps {
  onBookingSubmitted?: (ticket: ServiceTicket, fullPayload?: CustomerBookingSubmissionPayload) => void;
  onNavigateToMap?: () => void;
  onOpenPhoneModal?: () => void;
  onOpenStaffLogin?: () => void;
  onOpenVoiceIntake?: () => void;
  onOpenSpamShield?: () => void;
  projectId?: 'dispatchgeeni' | 'tidyups' | 'easycleans';
  isStandaloneCustomerSite?: boolean;
  isCustomerLockPreview?: boolean;
  onToggleCustomerLockPreview?: (locked: boolean) => void;
  serviceCatalog?: ServiceCatalogItem[];
  onLeadsReconnected?: (data: { leads?: any[]; clients?: any[]; quotes?: any[] }) => void;
}

export type CleaningCategory = 'move-out' | 'standard' | 'deep';

interface ServiceDetail {
  id: CleaningCategory;
  name: string;
  shortName: string;
  badge: string;
  ruleSummary: string;
  tagline: string;
  startingPrice: string;
  recommendedFor: string;
  duration: string;
  icon: any;
  accentGradient: string;
  checklist: string[];
}

const OFFICIAL_COMPANY_BANNERS = [
  {
    id: 'banner-bunny-wrap',
    src: '/assets/aistudio/39x14_ver_0001__1__d4ddd987.png',
    title: 'TidyUps Cleaning Service — Official Bunny Fleet & Vetted Edmonton Teams',
    caption: 'Move-Out • Basic • Deep Cleaning • app.tidyupscleaning.com/book',
  },
  {
    id: 'banner-desktop-bunny',
    src: '/assets/aistudio/download__5__a6150ad7.jpg',
    title: 'TidyUps Cleaning Service Inc. — Edmonton Command & Bunny Crest',
    caption: 'Move-Out Turnovers • Basic Maintenance • Deep Cleans • tidyupscleaning.com',
  },
  {
    id: 'banner-3',
    src: '/assets/aistudio/833_Banner_003_16385828.png',
    title: 'TidyUps Cleaning Service — Move-Out, Basic & Deep Cleaning Specialists',
    caption: 'Move-Out • Basic • Deep Cleaning Across Edmonton & Area',
  },
  {
    id: 'banner-4',
    src: '/assets/aistudio/833_Banner_004_-_Copy__2__3861ba3f.png',
    title: 'TidyUps Cleaning Service — Vetted Professional Cleaning Crew',
    caption: 'Established 2012 • 100% Satisfaction & 24-Hour Free Re-Clean Guarantee',
  },
];

const ADDON_OPTIONS = [
  { id: 'Inside Oven Cleaning', label: 'Inside Oven Deep Degrease', price: 45, icon: '🔥' },
  { id: 'Inside Fridge Cleaning', label: 'Inside Fridge Sanitize', price: 45, icon: '❄️' },
  { id: 'Inside Cabinets & Drawers', label: 'Inside Kitchen Cabinets', price: 55, icon: '🗄️' },
  { id: 'Interior Windows & Tracks', label: 'Interior Window Glass & Tracks', price: 65, icon: '🪟' },
  { id: 'Baseboards & Trim Detail', label: 'Hand-Wash All Baseboards & Trim', price: 45, icon: '✨' },
  { id: 'Laundry Wash & Fold', label: '1 Load Laundry Wash & Fold', price: 35, icon: '🧺' },
];

const CLEANING_SERVICES: ServiceDetail[] = [
  {
    id: 'move-out',
    name: 'Move-Out Cleaning',
    shortName: 'Move-Out Cleaning',
    badge: 'Min 3 Hrs (2 Cleaners) or 6 Hrs (1 Cleaner)',
    ruleSummary: '2 Cleaners: Min 3 hrs ($105/hr = $315+) • 1 Cleaner: Starts at 6 hrs ($52.50/hr = $315+)',
    tagline: 'Inspection-ready turnkey reset for tenants, landlords, home buyers, and realtors.',
    startingPrice: '$315.00',
    recommendedFor: 'Lease-end inspections, home sales, possession day move-ins',
    duration: 'Min 3 hrs (2 Cleaners) / 6 hrs (1 Cleaner)',
    icon: Key,
    accentGradient: 'from-pink-600 via-red-600 to-rose-600',
    checklist: [
      'Full interior oven degrease & rack scrubbing',
      'Interior & exterior refrigerator and freezer sanitization',
      'All kitchen & bathroom cabinets and drawers wiped inside & out',
      'Baseboards, doors, closets & trim scrubbed throughout',
      'Full bathroom tile grout & shower glass descaling',
      'Interior window glass, tracks & sills wiped clean',
      'Light fixtures, switch plates & outlet covers detailed',
      'Complete HEPA vacuuming & edge-to-edge floor mopping',
    ],
  },
  {
    id: 'standard',
    name: 'Basic Cleaning',
    shortName: 'Basic Cleaning',
    badge: '1 Pro Cleaner Only ($52.50/hr)',
    ruleSummary: '1 Dedicated Cleaner ($52.50/hr) • Standard Residential Maintenance',
    tagline: 'Bright, spotless upkeep with 1 dedicated cleaner that keeps your home fresh and sanitized.',
    startingPrice: '$131.25',
    recommendedFor: 'Busy families, professionals & regular residential maintenance care',
    duration: '1 Cleaner @ $52.50/hr',
    icon: Brush,
    accentGradient: 'from-red-600 via-pink-600 to-fuchsia-600',
    checklist: [
      'Dusting all furniture, ledges, frames & decor',
      'Kitchen countertops, sink, backsplash & exterior appliances wiped',
      'Bathroom sinks, mirrors, toilets, tubs & showers disinfected',
      'Trash & recycling bins emptied and re-lined',
      'Beds neatly made (linens changed upon request)',
      'All carpets HEPA-vacuumed & hard floors damp-mopped',
      'Microwave interior scrubbed clean',
      'High-touch door handles, switches & railings sanitized',
    ],
  },
  {
    id: 'deep',
    name: 'Deep Cleaning',
    shortName: 'Deep Cleaning',
    badge: 'Min 2 Cleaners for 2 Hrs ($105/hr)',
    ruleSummary: 'Minimum 2 Cleaners for 2+ Hours ($105/hr = $210.00+)',
    tagline: 'Intensive 2-cleaner top-to-bottom scrub targeting built-up grime, soap scale, and corners.',
    startingPrice: '$210.00',
    recommendedFor: 'Spring/Fall refresh, first-time cleans, homes needing extra detail',
    duration: 'Min 2 Cleaners for 2+ Hours',
    icon: Sparkles,
    accentGradient: 'from-pink-500 via-red-600 to-purple-600',
    checklist: [
      'Heavy soap scum, hard water & limescale removal in bathrooms',
      'Hand-wiping baseboards, door frames, window sills & wainscoting',
      'Dust extraction under & behind reachable furniture',
      'Kitchen range hood, stovetop & backsplash degreasing',
      'All kitchen & bathroom cabinet fronts detailed and polished',
      'Ceiling fan blades, light fixtures & air vents hand-dusted',
      'Complete sanitization of all high-touch surfaces',
      'Hardwood, luxury vinyl & tile deep wash',
    ],
  },
];

type HighlightFieldKey =
  | 'selectedService'
  | 'firstName'
  | 'lastName'
  | 'customerPhone'
  | 'customerEmail'
  | 'address'
  | 'city'
  | 'bedrooms'
  | 'bathrooms'
  | 'cleanerCount'
  | 'preferredDate'
  | 'preferredTime'
  | 'specialInstructions';

export const CustomerPortalView: React.FC<CustomerPortalViewProps> = ({
  onBookingSubmitted,
  onOpenStaffLogin,
  isStandaloneCustomerSite = false,
  isCustomerLockPreview = false,
  onToggleCustomerLockPreview,
  serviceCatalog = CANONICAL_SERVICE_CATALOG,
  onLeadsReconnected,
}) => {
  const bookingFormRef = useRef<HTMLDivElement | null>(null);
  const datePickerContainerRef = useRef<HTMLDivElement | null>(null);

  // Detect URL parameters (?source=facebook, ?source=google, ?fbclid=..., ?gclid=...)
  const initialSourceFromUrl = useMemo(() => {
    if (typeof window === 'undefined') return 'Website (tidyupscleaning.com)';
    const params = new URLSearchParams(window.location.search);
    const src = (params.get('source') || params.get('utm_source') || '').toLowerCase();
    if (src.includes('fb') || src.includes('facebook') || src.includes('instagram') || params.has('fbclid')) {
      return 'Facebook / Instagram Ad';
    }
    if (src.includes('google') || params.has('gclid')) {
      return 'Google Search / Ad';
    }
    return 'Website (tidyupscleaning.com)';
  }, []);

  const [activeLegalModal, setActiveLegalModal] = useState<'PRIVACY' | 'TERMS' | 'SUPPORT' | null>(() => {
    if (typeof window === 'undefined') return null;
    const path = window.location.pathname.toLowerCase();
    const search = window.location.search.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    if (
      path.includes('privacy') ||
      search.includes('legal=privacy') ||
      search.includes('page=privacy') ||
      hash.includes('privacy')
    ) {
      return 'PRIVACY';
    }
    if (
      path.includes('terms') ||
      path.includes('t&c') ||
      path.includes('tos') ||
      search.includes('legal=terms') ||
      search.includes('page=terms') ||
      hash.includes('terms')
    ) {
      return 'TERMS';
    }
    if (path.includes('support') || search.includes('legal=support') || hash.includes('support')) {
      return 'SUPPORT';
    }
    return null;
  });

  const handleOpenLegalModal = (tab: 'PRIVACY' | 'TERMS' | 'SUPPORT' | null) => {
    setActiveLegalModal(tab);
    if (typeof window !== 'undefined') {
      try {
        const currentUrl = new URL(window.location.href);
        const pathLower = currentUrl.pathname.toLowerCase();
        const isBookSubpath = pathLower === '/book' || pathLower.startsWith('/book/');
        const basePrefix = isBookSubpath ? '/book' : '';
        if (tab === 'PRIVACY') {
          window.history.replaceState({}, '', `${basePrefix}/privacy-policy${currentUrl.search}`);
        } else if (tab === 'TERMS') {
          window.history.replaceState({}, '', `${basePrefix}/terms${currentUrl.search}`);
        } else if (tab === 'SUPPORT') {
          window.history.replaceState({}, '', `${basePrefix}/support${currentUrl.search}`);
        } else {
          const fallbackRoot = isBookSubpath ? '/book' : '/';
          window.history.replaceState({}, '', `${fallbackRoot}${currentUrl.search}`);
        }
      } catch {
        // Ignore history state errors in sandboxed iframes
      }
    }
  };

  // Route mode:
  // - /book    (Quote Calculator & Lit-Box Voice Form — default when visiting /book or app.tidyupscleaning.com/book)
  // - /booking (Simple 3-Option Form: Move-Out, Basic, Deep)
  const [bookingRouteVariant, setBookingRouteVariant] = useState<'SIMPLE_3_OPTION' | 'CALCULATOR'>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname.toLowerCase();
      const s = window.location.search.toLowerCase();
      if (p === '/booking' || p.startsWith('/booking/') || s.includes('variant=simple')) {
        return 'SIMPLE_3_OPTION';
      }
      if (p === '/book' || p.startsWith('/book/') || s.includes('variant=calculator')) {
        return 'CALCULATOR';
      }
    }
    return 'CALCULATOR';
  });

  const handleSwitchRouteVariant = (nextVariant: 'SIMPLE_3_OPTION' | 'CALCULATOR') => {
    setBookingRouteVariant(nextVariant);
    if (typeof window !== 'undefined') {
      try {
        const currentUrl = new URL(window.location.href);
        const targetPath = nextVariant === 'SIMPLE_3_OPTION' ? '/booking' : '/book';
        window.history.replaceState({}, '', `${targetPath}${currentUrl.search}`);
      } catch {}
    }
  };

  const [selectedService, setSelectedService] = useState<CleaningCategory>('move-out');
  const [activeBannerIdx, setActiveBannerIdx] = useState<number>(0);

  // Split Customer Name: First Name + Last Name
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Edmonton');
  const [postalCode, setPostalCode] = useState('');
  const [bedrooms, setBedrooms] = useState('3 Bedrooms');
  const [bathrooms, setBathrooms] = useState('2 Bathrooms');
  const [cleanerCount, setCleanerCount] = useState<1 | 2>(2);
  const [frequency, setFrequency] = useState<
    'One-Time' | 'Weekly (15% Off)' | 'Bi-Weekly (10% Off)' | 'Monthly (5% Off)'
  >('One-Time');
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [preferredDate, setPreferredDate] = useState<string>(() => {
    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    return tmrw.toISOString().slice(0, 10);
  });
  const [preferredTime, setPreferredTime] = useState('Morning (8:00 AM - 12:00 PM)');
  const [heardAbout, setHeardAbout] = useState<string>(initialSourceFromUrl);
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Interactive Pop-Up Calendar State
  const [isCalendarPopupOpen, setIsCalendarPopupOpen] = useState(false);
  const [calendarMonthDate, setCalendarMonthDate] = useState<Date>(() => new Date());

  // Submission & Feedback State
  const [formSubmitted, setFormSubmitted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [confirmedBookingId, setConfirmedBookingId] = useState<string>('');
  const [confirmedQuoteNumber, setConfirmedQuoteNumber] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Staff Control Bar State
  const [copiedLinkKey, setCopiedLinkKey] = useState<string | null>(null);
  const [isReconnectingLeads, setIsReconnectingLeads] = useState<boolean>(false);
  const [staffStatusMessage, setStaffStatusMessage] = useState<string | null>(null);

  // Continuous Voice Dictation & Box Lighting State (Never shuts off on pause until user clicks Stop!)
  const [isRecordingFormVoice, setIsRecordingFormVoice] = useState(false);
  const [dictationText, setDictationText] = useState('');
  const [interimDictation, setInterimDictation] = useState('');
  const [isParsingFormVoice, setIsParsingFormVoice] = useState(false);
  const [voiceFillStatus, setVoiceFillStatus] = useState<string | null>(null);
  const [flashingFields, setFlashingFields] = useState<Record<string, boolean>>({});
  const [voiceCapturedFields, setVoiceCapturedFields] = useState<Record<string, boolean>>({});

  const recognitionRef = useRef<any>(null);
  const shouldKeepRecordingRef = useRef<boolean>(false);
  const latestTranscriptRef = useRef<string>('');
  const latestInterimRef = useRef<string>('');

  const activeServiceData =
    CLEANING_SERVICES.find((s) => s.id === selectedService) || CLEANING_SERVICES[0];

  // Enforce strict Cleaner Crew rules whenever Service Category changes:
  // - Basic ('standard'): 1 Cleaner ONLY ($52.50/hr)
  // - Deep ('deep'): Minimum 2 Cleaners for 2+ hours ($105.00/hr)
  // - Move-Out ('move-out'): Default 2 Cleaners (min 3 hrs @ $105/hr) or 1 Cleaner (starts at 6 hrs @ $52.50/hr)
  useEffect(() => {
    if (selectedService === 'standard') {
      setCleanerCount(1);
    } else if (selectedService === 'deep') {
      setCleanerCount(2);
    } else if (selectedService === 'move-out') {
      setCleanerCount((prev) => (prev === 1 ? 1 : 2));
    }
  }, [selectedService]);

  // Cleanup recognition on unmount
  useEffect(() => {
    return () => {
      shouldKeepRecordingRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  // Close Calendar Popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (ev: MouseEvent) => {
      if (
        isCalendarPopupOpen &&
        datePickerContainerRef.current &&
        !datePickerContainerRef.current.contains(ev.target as Node)
      ) {
        setIsCalendarPopupOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCalendarPopupOpen]);

  const triggerFieldHighlight = useCallback((fieldKey: HighlightFieldKey) => {
    setFlashingFields((prev) => ({ ...prev, [fieldKey]: true }));
    setVoiceCapturedFields((prev) => ({ ...prev, [fieldKey]: true }));
    setTimeout(() => {
      setFlashingFields((prev) => ({ ...prev, [fieldKey]: false }));
    }, 2600);
  }, []);

  // Live real-time speech extraction so boxes light up immediately while customer speaks
  const applyLiveSpeechExtraction = useCallback(
    (rawText: string) => {
      const text = rawText.trim();
      if (!text) return;
      const lower = text.toLowerCase();

      // 1. Service Type
      if (lower.includes('move out') || lower.includes('move-out') || lower.includes('moving out')) {
        setSelectedService('move-out');
        triggerFieldHighlight('selectedService');
      } else if (lower.includes('deep clean') || lower.includes('deep')) {
        setSelectedService('deep');
        setCleanerCount(2);
        triggerFieldHighlight('selectedService');
        triggerFieldHighlight('cleanerCount');
      } else if (lower.includes('basic') || lower.includes('standard') || lower.includes('regular')) {
        setSelectedService('standard');
        setCleanerCount(1);
        triggerFieldHighlight('selectedService');
        triggerFieldHighlight('cleanerCount');
      }

      // 2. Cleaner Count
      if (lower.includes('one cleaner') || lower.includes('1 cleaner') || lower.includes('single cleaner')) {
        if (selectedService !== 'deep') {
          setCleanerCount(1);
          triggerFieldHighlight('cleanerCount');
        }
      } else if (lower.includes('two cleaner') || lower.includes('2 cleaner')) {
        if (selectedService !== 'standard') {
          setCleanerCount(2);
          triggerFieldHighlight('cleanerCount');
        }
      }

      // 3. Phone Number
      const phoneMatch = text.match(/(?:\+?1[-.\s]?)?\(?([2-9]\d{2})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/);
      if (phoneMatch) {
        setCustomerPhone(`(${phoneMatch[1]}) ${phoneMatch[2]}-${phoneMatch[3]}`);
        triggerFieldHighlight('customerPhone');
      }

      // 4. Email
      const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (emailMatch) {
        setCustomerEmail(emailMatch[1].toLowerCase());
        triggerFieldHighlight('customerEmail');
      }

      // 5. Split First Name & Last Name
      const namePatterns = [
        /(?:my name is|name is|this is|i am|i'm|for)\s+([A-Z][a-z]+)(?:\s+([A-Z][a-z]+))?/i,
        /^([A-Z][a-z]{2,15})\s+([A-Z][a-z]{2,18})\b/,
      ];
      for (const pat of namePatterns) {
        const m = text.match(pat);
        if (m && m[1]) {
          const stopWords = new Set(['looking', 'calling', 'booking', 'needing', 'wanting', 'moving', 'cleaning', 'basic', 'deep', 'move']);
          const candFirst = m[1].trim();
          const candLast = (m[2] || '').trim();
          if (!stopWords.has(candFirst.toLowerCase())) {
            setFirstName(candFirst.charAt(0).toUpperCase() + candFirst.slice(1));
            triggerFieldHighlight('firstName');
            if (candLast && !stopWords.has(candLast.toLowerCase())) {
              setLastName(candLast.charAt(0).toUpperCase() + candLast.slice(1));
              triggerFieldHighlight('lastName');
            }
            break;
          }
        }
      }

      // 6. Bedrooms & Bathrooms
      const bedMatch = lower.match(/(\d+|one|two|three|four|five|six)\s*(?:bed|bedroom|bdrm)/i);
      if (bedMatch) {
        const wordToNum: Record<string, string> = { one: '1', two: '2', three: '3', four: '4', five: '5', six: '6' };
        const n = wordToNum[bedMatch[1].toLowerCase()] || bedMatch[1];
        setBedrooms(n === '1' ? '1 Bedroom' : `${n} Bedrooms`);
        triggerFieldHighlight('bedrooms');
      }
      const bathMatch = lower.match(/(\d+(?:\.5)?|one|two|three|four)\s*(?:bath|bathroom)/i);
      if (bathMatch) {
        const wordToNum: Record<string, string> = { one: '1', two: '2', three: '3', four: '4' };
        const n = wordToNum[bathMatch[1].toLowerCase()] || bathMatch[1];
        setBathrooms(n === '1' ? '1 Bathroom' : `${n} Bathrooms`);
        triggerFieldHighlight('bathrooms');
      }

      // 7. Street Address & City
      const addrMatch = text.match(
        /\b(\d{2,5}\s+(?:[A-Za-z0-9.]+\s+){1,4}(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Boulevard|Blvd|Way|Lane|Ln|Court|Ct|Place|Pl|Crescent|Cres|Trail|Tr|Close|Loop|Gate|Point|Terrace)(?:\s+(?:NW|NE|SW|SE|North|South|East|West))?)/i
      );
      if (addrMatch && addrMatch[1]) {
        setAddress(addrMatch[1].trim());
        triggerFieldHighlight('address');
      }
      if (lower.includes('st. albert') || lower.includes('st albert') || lower.includes('saint albert')) {
        setCity('St. Albert');
        triggerFieldHighlight('city');
      } else if (lower.includes('sherwood park')) {
        setCity('Sherwood Park');
        triggerFieldHighlight('city');
      } else if (lower.includes('spruce grove')) {
        setCity('Spruce Grove');
        triggerFieldHighlight('city');
      } else if (lower.includes('leduc')) {
        setCity('Leduc');
        triggerFieldHighlight('city');
      } else if (lower.includes('beaumont')) {
        setCity('Beaumont');
        triggerFieldHighlight('city');
      } else if (lower.includes('fort saskatchewan')) {
        setCity('Fort Saskatchewan');
        triggerFieldHighlight('city');
      } else if (lower.includes('edmonton')) {
        setCity('Edmonton');
        triggerFieldHighlight('city');
      }

      // 8. Time Window
      if (lower.includes('morning')) {
        setPreferredTime('Morning (8:00 AM - 12:00 PM)');
        triggerFieldHighlight('preferredTime');
      } else if (lower.includes('afternoon')) {
        setPreferredTime('Afternoon (12:00 PM - 4:00 PM)');
        triggerFieldHighlight('preferredTime');
      } else if (lower.includes('evening')) {
        setPreferredTime('Evening (4:00 PM - 7:00 PM)');
        triggerFieldHighlight('preferredTime');
      }
    },
    [selectedService, triggerFieldHighlight]
  );

  // Calculate live price directly from the canonical Jobber Service Catalog + strict owner minimum rules:
  // - Basic Cleaning: 1 Cleaner ($52.50/hr)
  // - Move-Out Cleaning: 2 Cleaners (min 3 hrs @ $105/hr = $315+) OR 1 Cleaner (starts at 6 hrs @ $52.50/hr = $315+)
  // - Deep Cleaning: Minimum 2 Cleaners for 2 hrs (@ $105/hr = $210+)
  const priceCalculation = useMemo(() => {
    const catalogList =
      Array.isArray(serviceCatalog) && serviceCatalog.length > 0
        ? serviceCatalog
        : CANONICAL_SERVICE_CATALOG;

    const lookupServiceLabel =
      selectedService === 'move-out'
        ? 'Move-Out Cleaning'
        : selectedService === 'deep'
        ? 'Deep Cleaning'
        : 'Standard Cleaning';

    const effectiveCleaners: 1 | 2 =
      selectedService === 'standard'
        ? 1
        : selectedService === 'deep'
        ? 2
        : cleanerCount === 1
        ? 1
        : 2;

    const matchedItem = matchCatalogItem(
      lookupServiceLabel,
      bedrooms,
      bathrooms,
      catalogList,
      effectiveCleaners
    );

    let itemQty = matchedItem?.quantity || matchedItem?.baseHours || 3;
    const itemUnitPrice =
      matchedItem?.unitPrice || (effectiveCleaners === 1 ? 52.5 : 105.0);

    // Enforce strict owner minimum hours:
    if (selectedService === 'move-out') {
      itemQty = effectiveCleaners === 1 ? Math.max(6, itemQty) : Math.max(3, itemQty);
    } else if (selectedService === 'deep') {
      itemQty = Math.max(2, itemQty);
    }

    const basePackagePrice = Math.max(
      matchedItem?.total || matchedItem?.basePrice || 0,
      Math.round(itemQty * itemUnitPrice * 100) / 100
    );

    const addonsTotal = selectedAddons.reduce((sum, id) => {
      const found = ADDON_OPTIONS.find((a) => a.id === id);
      return sum + (found ? found.price : 0);
    }, 0);

    const discountMultiplier =
      frequency === 'Weekly (15% Off)'
        ? 0.85
        : frequency === 'Bi-Weekly (10% Off)'
        ? 0.9
        : frequency === 'Monthly (5% Off)'
        ? 0.95
        : 1.0;

    const discountedBase = Math.round(basePackagePrice * discountMultiplier * 100) / 100;
    const subtotal = Math.round((discountedBase + addonsTotal) * 100) / 100;
    const gst = Math.round(subtotal * 0.05 * 100) / 100;
    const total = Math.round((subtotal + gst) * 100) / 100;

    return {
      effectiveCleaners,
      itemQty,
      itemUnitPrice,
      matchedItemName:
        matchedItem?.jobberItemName ||
        `${bedrooms} ${bathrooms} ${activeServiceData.shortName} (${effectiveCleaners} Cleaner${
          effectiveCleaners > 1 ? 's' : ''
        })`,
      basePackagePrice,
      discountedBase,
      addonsTotal,
      subtotal,
      gst,
      total,
      hoursLabel: `${itemQty} hrs × $${itemUnitPrice.toFixed(2)}/hr (${effectiveCleaners} Cleaner${
        effectiveCleaners > 1 ? 's' : ''
      })`,
    };
  }, [bedrooms, bathrooms, selectedService, cleanerCount, selectedAddons, frequency, serviceCatalog, activeServiceData]);

  // Quick Date Pills & Calendar Grid helpers
  const quickDatePills = useMemo(() => {
    const today = new Date();
    const list: Array<{ label: string; iso: string }> = [];
    const addDays = (d: number) => {
      const dt = new Date(today);
      dt.setDate(today.getDate() + d);
      return dt;
    };
    const tmrw = addDays(1);
    list.push({
      label: `Tomorrow (${tmrw.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })})`,
      iso: tmrw.toISOString().slice(0, 10),
    });
    for (let i = 2; i <= 6; i++) {
      const dt = addDays(i);
      list.push({
        label: dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        iso: dt.toISOString().slice(0, 10),
      });
    }
    return list;
  }, []);

  const calendarDaysGrid = useMemo(() => {
    const year = calendarMonthDate.getFullYear();
    const month = calendarMonthDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ day: number | null; iso: string }> = [];
    for (let i = 0; i < firstDay; i++) {
      cells.push({ day: null, iso: '' });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, iso });
    }
    return cells;
  }, [calendarMonthDate]);

  const formattedPreferredDateLabel = useMemo(() => {
    if (!preferredDate) return 'Click to Pick a Date';
    try {
      const [y, m, d] = preferredDate.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      return dt.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return preferredDate;
    }
  }, [preferredDate]);

  const handleToggleAddon = (addonId: string) => {
    setSelectedAddons((prev) =>
      prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]
    );
  };

  const handleCopyBookingLink = (key: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLinkKey(key);
    setTimeout(() => setCopiedLinkKey(null), 2500);
  };

  const handleReconnectFacebookAndGoogleLeads = async () => {
    setIsReconnectingLeads(true);
    setStaffStatusMessage(null);
    try {
      const res = await fetch('/api/leads/reconnect-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data?.success) {
        setStaffStatusMessage(
          data.message ||
            '✓ Reconnected Facebook Lead Ads, Google Ads Webhooks & Google Sheets! All new customer bookings on app.tidyupscleaning.com/book flow straight into your Master Leads Table.'
        );
        if (onLeadsReconnected) {
          onLeadsReconnected({
            leads: data.leads,
            clients: data.clients,
            quotes: data.quotes,
          });
        }
      }
    } catch (e: any) {
      setStaffStatusMessage(`Reconnect notice: ${e?.message || 'Checked lead webhooks'}`);
    } finally {
      setIsReconnectingLeads(false);
    }
  };

  const handleParseDictationIntoBlanks = useCallback(
    async (textToUse?: string) => {
      const raw = (textToUse ?? dictationText).trim();
      if (!raw) return;
      setIsParsingFormVoice(true);
      setVoiceFillStatus('Lighting up form boxes from your voice dictation...');
      applyLiveSpeechExtraction(raw);
      try {
        const res = await fetch('/api/dispatch/parse-voice-ticket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: raw }),
        });
        const data = await res.json();
        if (data) {
          if (data.customerName && data.customerName !== 'Residential Client') {
            const parts = String(data.customerName).trim().split(/\s+/);
            if (parts[0]) {
              setFirstName(parts[0]);
              triggerFieldHighlight('firstName');
            }
            if (parts.length > 1) {
              setLastName(parts.slice(1).join(' '));
              triggerFieldHighlight('lastName');
            }
          }
          if (data.phone) {
            setCustomerPhone(data.phone);
            triggerFieldHighlight('customerPhone');
          }
          if (data.email) {
            setCustomerEmail(data.email);
            triggerFieldHighlight('customerEmail');
          }
          if (data.address) {
            setAddress(data.address);
            triggerFieldHighlight('address');
          }
          if (data.city) {
            setCity(data.city);
            triggerFieldHighlight('city');
          }
          if (data.preferredDate) {
            setPreferredDate(data.preferredDate);
            triggerFieldHighlight('preferredDate');
          }
          if (data.timeWindow) {
            setPreferredTime(data.timeWindow);
            triggerFieldHighlight('preferredTime');
          }
          if (data.bedrooms) {
            setBedrooms(data.bedrooms);
            triggerFieldHighlight('bedrooms');
          }
          if (data.bathrooms) {
            setBathrooms(data.bathrooms);
            triggerFieldHighlight('bathrooms');
          }
          if (data.specificInstructions) {
            setSpecialInstructions(data.specificInstructions);
            triggerFieldHighlight('specialInstructions');
          } else {
            setSpecialInstructions(raw);
            triggerFieldHighlight('specialInstructions');
          }

          const cat = (data.serviceCategory || '').toLowerCase();
          if (cat.includes('move')) {
            setSelectedService('move-out');
            triggerFieldHighlight('selectedService');
          } else if (cat.includes('deep')) {
            setSelectedService('deep');
            setCleanerCount(2);
            triggerFieldHighlight('selectedService');
            triggerFieldHighlight('cleanerCount');
          } else if (cat.includes('basic') || cat.includes('standard')) {
            setSelectedService('standard');
            setCleanerCount(1);
            triggerFieldHighlight('selectedService');
            triggerFieldHighlight('cleanerCount');
          }

          setVoiceFillStatus(
            `✓ Lit Up & Auto-Filled: ${data.customerName || `${firstName} ${lastName}`.trim() || 'Customer'} • ${
              data.address || city
            } • ${data.preferredDayLabel || data.preferredDate || 'Date Ready'}`
          );
        }
      } catch {
        setVoiceFillStatus('✓ Applied spoken details to form boxes.');
      } finally {
        setIsParsingFormVoice(false);
      }
    },
    [dictationText, applyLiveSpeechExtraction, triggerFieldHighlight, firstName, lastName, city]
  );

  // Continuous Microphone Toggle — Never shuts off when user pauses speaking!
  const handleToggleFormMic = () => {
    if (isRecordingFormVoice) {
      shouldKeepRecordingRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsRecordingFormVoice(false);
      const fullFinal = `${latestTranscriptRef.current || dictationText} ${
        latestInterimRef.current || interimDictation
      }`.trim();
      if (fullFinal) {
        latestTranscriptRef.current = fullFinal;
        latestInterimRef.current = '';
        setDictationText(fullFinal);
        setInterimDictation('');
        handleParseDictationIntoBlanks(fullFinal);
      }
      return;
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setVoiceFillStatus('Type or paste your details below and click "Light Up Boxes".');
      return;
    }

    try {
      shouldKeepRecordingRef.current = true;
      latestTranscriptRef.current = dictationText;
      latestInterimRef.current = '';

      const rec = new SpeechRec();
      rec.lang = 'en-CA';
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 3;

      rec.onstart = () => {
        setIsRecordingFormVoice(true);
        setVoiceFillStatus(
          '🎙️ Continuous Mic Active (Will NOT shut off when you pause!) — Speak First & Last Name, Phone, Address, Bedrooms, Bathrooms & Preferred Date...'
        );
      };

      rec.onresult = (ev: any) => {
        let finalChunk = '';
        let interimChunk = '';
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const t = ev.results[i][0].transcript;
          if (ev.results[i].isFinal) {
            finalChunk += t + ' ';
          } else {
            interimChunk += t;
          }
        }
        const prevBase = latestTranscriptRef.current;
        const updated = finalChunk ? `${prevBase} ${finalChunk}`.trim() : prevBase;
        latestTranscriptRef.current = updated;
        latestInterimRef.current = interimChunk;

        const combinedLive = `${updated} ${interimChunk}`.trim();
        if (combinedLive) {
          applyLiveSpeechExtraction(combinedLive);
        }
        setDictationText(updated);
        setInterimDictation(interimChunk);
      };

      rec.onerror = (ev: any) => {
        if (ev?.error === 'not-allowed' || ev?.error === 'service-not-allowed') {
          shouldKeepRecordingRef.current = false;
          setIsRecordingFormVoice(false);
          setVoiceFillStatus('Microphone access was blocked by browser permissions.');
        }
      };

      rec.onend = () => {
        // Automatically restart on pause so the mic NEVER shuts off until the user clicks Stop!
        if (shouldKeepRecordingRef.current) {
          try {
            rec.start();
            return;
          } catch {}
        }
        setIsRecordingFormVoice(false);
        setInterimDictation('');
      };

      recognitionRef.current = rec;
      rec.start();
    } catch {
      shouldKeepRecordingRef.current = false;
      setIsRecordingFormVoice(false);
    }
  };

  // Glowing Lit-Up Box Styling helper (matching Voice Dictation Intake page)
  const getLitBoxClass = (fieldKey: HighlightFieldKey, isFilled: boolean) => {
    const isFlashing = Boolean(flashingFields[fieldKey]);
    if (isFlashing) {
      return 'border-pink-400 bg-gradient-to-br from-pink-950/90 via-red-950/80 to-black ring-4 ring-pink-500/50 shadow-[0_0_25px_rgba(236,72,153,0.65)] scale-[1.01] transition-all duration-300';
    }
    if (isFilled) {
      return 'border-emerald-400/90 bg-gradient-to-br from-emerald-950/55 via-zinc-900 to-black ring-2 ring-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.25)] transition-all duration-300';
    }
    return 'border-zinc-800 bg-zinc-900/90 hover:border-pink-500/60 transition-all duration-300';
  };

  const renderLitBadge = (fieldKey: HighlightFieldKey, isFilled: boolean, required = false) => {
    const wasVoice = Boolean(voiceCapturedFields[fieldKey]);
    if (isFilled) {
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-xs ${
            wasVoice
              ? 'bg-gradient-to-r from-pink-500 to-red-500 text-white animate-pulse'
              : 'bg-emerald-500/20 border border-emerald-400 text-emerald-300'
          }`}
        >
          <CheckCircle2 className="w-3 h-3" />
          <span>{wasVoice ? 'Voice Lit ✓' : 'Filled ✓'}</span>
        </span>
      );
    }
    return required ? (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-950/90 border border-red-500/50 text-red-300 text-[10px] font-black uppercase">
        Required *
      </span>
    ) : (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[10px] font-bold">
        Optional
      </span>
    );
  };

  const requiredBoxesStatus = useMemo(() => {
    return [
      { key: 'selectedService', label: '1. Service Type', filled: Boolean(selectedService) },
      { key: 'firstName', label: '2. First Name', filled: Boolean(firstName.trim()) },
      { key: 'lastName', label: '3. Last Name', filled: Boolean(lastName.trim()) },
      { key: 'customerPhone', label: '4. Mobile Phone', filled: Boolean(customerPhone.trim()) },
      { key: 'address', label: '5. Street Address', filled: Boolean(address.trim()) },
      { key: 'bedrooms', label: '6. Bedrooms', filled: Boolean(bedrooms) },
      { key: 'bathrooms', label: '7. Bathrooms', filled: Boolean(bathrooms) },
      { key: 'preferredDate', label: '8. Preferred Date', filled: Boolean(preferredDate) },
    ];
  }, [selectedService, firstName, lastName, customerPhone, address, bedrooms, bathrooms, preferredDate]);

  const filledRequiredCount = requiredBoxesStatus.filter((b) => b.filled).length;
  const fullNameCombined = `${firstName.trim()} ${lastName.trim()}`.trim();

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !customerPhone.trim() || !address.trim()) {
      setErrorMessage('Please enter your First Name, Last Name, Mobile Phone Number, and Street Address so all required boxes light up.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const fullAddress = address.toLowerCase().includes(city.toLowerCase())
      ? address.trim()
      : `${address.trim()}, ${city}, AB ${postalCode.trim()}`.trim();

    try {
      const res = await fetch('/api/public/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          customerName: fullNameCombined,
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim(),
          serviceType:
            selectedService === 'move-out'
              ? 'Move-Out Cleaning'
              : selectedService === 'deep'
              ? 'Deep Cleaning'
              : 'Basic Cleaning',
          address: fullAddress,
          city,
          postalCode: postalCode.trim(),
          bedrooms,
          bathrooms,
          cleanerCount: priceCalculation.effectiveCleaners,
          frequency,
          selectedAddons: selectedAddons,
          estimatedSubtotal: priceCalculation.subtotal,
          estimatedTotal: priceCalculation.total,
          preferredDate: preferredDate || new Date().toISOString().slice(0, 10),
          preferredTime,
          specialInstructions: specialInstructions.trim(),
          heardAbout,
          bookingFormVariant: 'CALCULATOR',
          utmSource:
            heardAbout.includes('Facebook')
              ? 'Facebook Leads'
              : heardAbout.includes('Google')
              ? 'Google Leads'
              : 'app.tidyupscleaning.com/book',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        triggerGoogleAdsConversion(priceCalculation.total || 1.0, 'CAD');
        const resolvedBookingId = data.jobberJobId || `JOB-${Math.floor(10000 + Math.random() * 90000)}`;
        const resolvedQuoteNum = data.quoteNumber || 'QT-4390';
        setConfirmedBookingId(resolvedBookingId);
        setConfirmedQuoteNumber(resolvedQuoteNum);
        try {
          sessionStorage.setItem(
            'tidyups_last_completed_booking',
            JSON.stringify({
              customerName: fullNameCombined,
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              customerPhone: customerPhone.trim(),
              customerEmail: customerEmail.trim(),
              serviceType: activeServiceData.name,
              packageName: priceCalculation.matchedItemName,
              hoursLabel: priceCalculation.hoursLabel,
              address: address.trim(),
              city,
              bedrooms,
              bathrooms,
              preferredDateLabel: formattedPreferredDateLabel,
              preferredTime,
              totalAmount: priceCalculation.total,
              bookingId: resolvedBookingId,
              quoteNumber: resolvedQuoteNum,
              submittedAt: new Date().toISOString(),
            })
          );
          // Update browser URL to /thank-you so Google Ads URL-based conversion rules fire immediately
          window.history.pushState({}, '', '/thank-you');
        } catch {
          // ignore storage/history errors
        }
        setFormSubmitted(true);
        if (onBookingSubmitted && data.ticket) {
          onBookingSubmitted(data.ticket, {
            ticket: data.ticket,
            quote: data.quote,
            lead: data.lead,
            client: data.client,
            visit: data.visit,
            unscheduledJob: data.unscheduledJob,
          });
        }
      } else {
        setErrorMessage(data.error || 'Could not submit booking. Please email booking@tidyupscleaning.com.');
      }
    } catch {
      setErrorMessage('Network connection error. Please email booking@tidyupscleaning.com.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showStaffPreviewBanner = !isStandaloneCustomerSite && Boolean(onToggleCustomerLockPreview);

  if (bookingRouteVariant === 'SIMPLE_3_OPTION') {
    return (
      <div className="flex-1 h-full w-full overflow-y-auto overflow-x-hidden bg-black">
        <PublicBookingModal
          isOpen={true}
          mode="STANDALONE_PAGE"
          isOwnerViewing={showStaffPreviewBanner && !isCustomerLockPreview}
          onSwitchToCalculatorMode={() => handleSwitchRouteVariant('CALCULATOR')}
          onOpenStaffLogin={onOpenStaffLogin}
          onBookingCreated={(ticket, fullData) => {
            if (onBookingSubmitted && ticket) {
              onBookingSubmitted(ticket, {
                ticket,
                quote: fullData?.quote,
                lead: fullData?.lead,
                client: fullData?.client,
                visit: fullData?.visit,
                unscheduledJob: fullData?.unscheduledJob,
              });
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 h-full w-full overflow-y-auto overflow-x-hidden bg-black font-sans text-white">
      {/* ─────────────────────────────────────────────────────────────────────────────
          OWNER-ONLY CONTROL BAR (NEVER SHOWN TO CUSTOMERS ON app.tidyupscleaning.com/book)
         ───────────────────────────────────────────────────────────────────────────── */}
      {showStaffPreviewBanner && !isCustomerLockPreview && (
        <div className="bg-zinc-950 text-white px-4 py-3 border-b-2 border-pink-500 shadow-lg">
          <div className="max-w-7xl mx-auto flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3 flex-wrap">
              <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-pink-500 to-red-600 text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                <Lock className="w-3.5 h-3.5" />
                <span>Customer Quote &amp; Voice Booking Page (/book)</span>
              </span>
              <div className="text-xs text-zinc-200">
                <strong className="text-pink-400">Live Customer Booking URLs:</strong>{' '}
                <code className="px-1.5 py-0.5 rounded bg-zinc-900 border border-pink-500/40 text-pink-300 font-mono font-bold">
                  https://app.tidyupscleaning.com/book
                </code>{' '}
                (Voice + Lit-Box Quote Calculator) &amp;{' '}
                <code className="px-1.5 py-0.5 rounded bg-zinc-900 border border-red-500/40 text-red-300 font-mono font-bold">
                  https://app.tidyupscleaning.com/booking
                </code>{' '}
                (Simple 3-Option Form).
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleSwitchRouteVariant('SIMPLE_3_OPTION')}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-500 hover:to-red-500 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                title="Switch to the Simple 3-Option Booking Form (/booking: Move-Out, Basic, Deep)"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Switch to /booking (3-Option Form)</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopyBookingLink('main', 'https://app.tidyupscleaning.com/book')}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-pink-500 text-pink-300 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
              >
                {copiedLinkKey === 'main' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLinkKey === 'main' ? 'Copied /book!' : 'Copy /book Link'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopyBookingLink('booking3', 'https://app.tidyupscleaning.com/booking')}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-red-500 text-red-300 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
              >
                {copiedLinkKey === 'booking3' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLinkKey === 'booking3' ? 'Copied /booking!' : 'Copy /booking Link'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopyBookingLink('thankyou', 'https://app.tidyupscleaning.com/thank-you')}
                className="px-3 py-1.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-400 text-emerald-300 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                title="Copy Google Ads Conversion Page URL (https://app.tidyupscleaning.com/thank-you)"
              >
                {copiedLinkKey === 'thankyou' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLinkKey === 'thankyou' ? 'Copied /thank-you!' : 'Copy /thank-you Ads Link'}</span>
              </button>

              <button
                type="button"
                onClick={handleReconnectFacebookAndGoogleLeads}
                disabled={isReconnectingLeads}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-pink-600 hover:opacity-95 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isReconnectingLeads ? 'animate-spin' : ''}`} />
                <span>{isReconnectingLeads ? 'Reconnecting...' : '🔄 Sync Leads'}</span>
              </button>

              {onToggleCustomerLockPreview && (
                <button
                  type="button"
                  onClick={() => onToggleCustomerLockPreview(true)}
                  className="px-3 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-400 text-black font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Preview Customer-Only Lock</span>
                </button>
              )}
            </div>
          </div>

          {staffStatusMessage && (
            <div className="max-w-7xl mx-auto mt-2.5 px-3.5 py-2 rounded-xl bg-emerald-950/90 border border-emerald-400/50 text-emerald-200 text-xs font-bold flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{staffStatusMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setStaffStatusMessage(null)}
                className="text-emerald-300 hover:text-white text-xs font-black cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}

      {/* Floating Exit Button ONLY when the Owner is testing Customer Lock Preview inside the console */}
      {!isStandaloneCustomerSite && isCustomerLockPreview && onToggleCustomerLockPreview && (
        <div className="fixed bottom-4 left-4 z-50">
          <button
            type="button"
            onClick={() => onToggleCustomerLockPreview(false)}
            className="px-4 py-2 rounded-2xl bg-zinc-950 hover:bg-zinc-900 text-pink-300 border-2 border-pink-500 text-xs font-black flex items-center gap-2 shadow-2xl cursor-pointer"
          >
            <Unlock className="w-4 h-4 text-pink-400" />
            <span>Exit Customer-Only Lock Preview (Return to Staff App)</span>
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          1. DEDICATED STICKY TOP HEADER (BLACK, HOT PINK & BRIGHT RED + TIDYUPS BUNNY)
         ───────────────────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-black/95 backdrop-blur-md border-b-2 border-pink-500 shadow-[0_4px_25px_rgba(236,72,153,0.25)] px-4 sm:px-6 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* TidyUps Bunny Mascot Crest & Brand Name */}
          <div className="flex items-center gap-3.5">
            <TidyUpsBunnyLogo size="md" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg sm:text-2xl font-black tracking-tight bg-gradient-to-r from-white via-pink-400 to-red-500 bg-clip-text text-transparent">
                  TidyUps Cleaning Service Inc.
                </span>
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-gradient-to-r from-pink-600 to-red-600 text-white text-[10px] font-black uppercase tracking-wider">
                  🐰 Est. 2012 • Edmonton &amp; Area
                </span>
              </div>
              <p className="text-[11px] sm:text-xs font-bold text-zinc-400">
                Move-Out Cleaning • Basic Cleaning • Deep Cleaning • Instant Voice &amp; Online Quotes
              </p>
            </div>
          </div>

          {/* Customer-Only Actions (Zero Phone Numbers) */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <a
              href="https://tidyupscleaning.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-pink-500/60 text-pink-300 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-pink-400" />
              <span>tidyupscleaning.com</span>
              <ExternalLink className="w-3 h-3 text-pink-400" />
            </a>

            <a
              href="mailto:booking@tidyupscleaning.com"
              className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-red-500/60 text-red-300 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5 text-red-400" />
              <span>booking@tidyupscleaning.com</span>
            </a>

            <button
              type="button"
              onClick={() => handleOpenLegalModal('PRIVACY')}
              className="px-2.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-black text-xs flex items-center gap-1 transition-all cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-pink-500" />
              <span>Privacy</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenLegalModal('TERMS')}
              className="px-2.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-black text-xs flex items-center gap-1 transition-all cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-red-500" />
              <span>T&amp;C</span>
            </button>

            <button
              type="button"
              onClick={() => bookingFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 via-red-600 to-pink-600 hover:opacity-95 text-white font-black text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(236,72,153,0.4)] cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Book Now ↓</span>
            </button>

            {!isStandaloneCustomerSite && !isCustomerLockPreview && onOpenStaffLogin && (
              <button
                type="button"
                onClick={onOpenStaffLogin}
                className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-pink-300 border-2 border-pink-500 font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-pink-400" />
                <span>👑 Owner Login</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────────────────────
          2. BLACK, HOT PINK & BRIGHT RED HERO + TIDYUPS BUNNY FLEET SHOWCASE
         ───────────────────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-r from-black via-zinc-950 to-red-950/60 text-white py-8 sm:py-10 px-4 sm:px-6 lg:px-8 border-b-2 border-pink-500/60 shadow-2xl">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-pink-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-red-600/20 blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Hero Copy */}
          <div className="lg:col-span-6 space-y-4 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-pink-600 to-red-600 text-white text-xs font-black uppercase tracking-wide shadow-md">
              <Sparkles className="w-4 h-4" />
              <span>🐰 TidyUps Bunny Voice &amp; Instant Quote Portal • app.tidyupscleaning.com/book</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              Speak or Click to Book Your{' '}
              <span className="bg-gradient-to-r from-pink-400 via-red-400 to-pink-500 bg-clip-text text-transparent underline decoration-red-500 decoration-4 underline-offset-4">
                Move-Out, Basic, or Deep Clean!
              </span>
            </h1>

            <p className="text-zinc-300 text-sm sm:text-base font-medium leading-relaxed max-w-xl mx-auto lg:mx-0">
              Use our <strong className="text-pink-400">Continuous Voice Dictation</strong> or fill in the boxes below — watch every box <strong className="text-emerald-400">light up</strong> as your First Name, Last Name, Address, Home Size, and Crew are captured!
            </p>

            {/* Crew & Minimum Hours Rule Pills */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-1">
              <span className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-pink-500/60 text-pink-300 text-xs font-black flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-pink-400" /> Basic: 1 Cleaner ($52.50/hr)
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-red-500/60 text-red-300 text-xs font-black flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-red-400" /> Move-Out: 2 Cleaners (3h Min) or 1 Cleaner (6h Min)
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-pink-500/60 text-pink-300 text-xs font-black flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-pink-400" /> Deep Clean: Min 2 Cleaners for 2 Hrs
              </span>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-3">
              <button
                type="button"
                onClick={() => bookingFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-pink-500 via-red-600 to-pink-600 hover:opacity-95 text-white font-black text-sm flex items-center gap-2 shadow-[0_0_25px_rgba(236,72,153,0.45)] transition-all active:scale-95 cursor-pointer"
              >
                <Mic className="w-4 h-4" />
                <span>Start Voice or Online Booking Below</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleSwitchRouteVariant('SIMPLE_3_OPTION')}
                className="px-4 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border-2 border-pink-500/60 text-pink-200 font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span>Open Simple Popup Form (/booking)</span>
              </button>
            </div>
          </div>

          {/* Right: TidyUps Bunny Fleet & Mascot Banner Showcase */}
          <div className="lg:col-span-6">
            <div className="bg-zinc-950 p-3 rounded-3xl shadow-[0_0_35px_rgba(236,72,153,0.3)] border-2 border-pink-500 space-y-2.5">
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-[16/9] border border-zinc-800">
                <img
                  src={OFFICIAL_COMPANY_BANNERS[activeBannerIdx].src}
                  alt={OFFICIAL_COMPANY_BANNERS[activeBannerIdx].title}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() =>
                    setActiveBannerIdx(
                      (prev) => (prev - 1 + OFFICIAL_COMPANY_BANNERS.length) % OFFICIAL_COMPANY_BANNERS.length
                    )
                  }
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/80 hover:bg-pink-600 text-white border border-pink-500/50 flex items-center justify-center shadow-lg cursor-pointer"
                  aria-label="Previous company banner"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActiveBannerIdx((prev) => (prev + 1) % OFFICIAL_COMPANY_BANNERS.length)
                  }
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/80 hover:bg-pink-600 text-white border border-pink-500/50 flex items-center justify-center shadow-lg cursor-pointer"
                  aria-label="Next company banner"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {OFFICIAL_COMPANY_BANNERS.map((b, idx) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setActiveBannerIdx(idx)}
                    className={`rounded-xl overflow-hidden border-2 aspect-[16/9] cursor-pointer transition-all ${
                      activeBannerIdx === idx
                        ? 'border-pink-500 ring-2 ring-red-500 scale-[1.02]'
                        : 'border-zinc-800 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={b.src} alt={b.title} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between px-1 text-[11px] font-extrabold text-zinc-300">
                <span className="truncate">{OFFICIAL_COMPANY_BANNERS[activeBannerIdx].title}</span>
                <span className="text-pink-400 font-mono shrink-0 ml-2">app.tidyupscleaning.com/book</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          3. VOICE DICTATION & LIT-UP BOXES CUSTOMER BOOKING SHEET + QUOTE CALCULATOR
         ───────────────────────────────────────────────────────────────────────────── */}
      <section ref={bookingFormRef} className="max-w-7xl mx-auto py-8 sm:py-10 px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Step 1: 3 Cleaning Service Options (Move-Out, Basic, Deep) */}
        <div className={`p-5 rounded-3xl border-2 ${getLitBoxClass('selectedService', Boolean(selectedService))}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-block px-3 py-1 rounded-full bg-gradient-to-r from-pink-600 to-red-600 text-white text-[11px] font-black uppercase tracking-wider">
                  Step 1 of 3 • Pick Your Cleaning Service (3 Core Options)
                </span>
                {renderLitBadge('selectedService', Boolean(selectedService), true)}
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white mt-1.5">
                Choose Move-Out, Basic, or Deep Cleaning
              </h2>
            </div>
            <span className="text-xs font-extrabold text-pink-300 bg-pink-950/60 border border-pink-500/50 px-3 py-1.5 rounded-xl">
              ✨ All Supplies, HEPA Vacuums &amp; Eco-Safe Products Included!
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {CLEANING_SERVICES.map((s) => {
              const IconComp = s.icon;
              const isSelected = selectedService === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSelectedService(s.id);
                    triggerFieldHighlight('selectedService');
                  }}
                  className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'bg-gradient-to-b from-pink-950/90 via-red-950/60 to-black border-pink-500 ring-2 ring-pink-500/40 shadow-[0_0_25px_rgba(236,72,153,0.4)] scale-[1.01]'
                      : 'bg-zinc-950 border-zinc-800 hover:border-pink-500/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${
                        isSelected
                          ? `bg-gradient-to-br ${s.accentGradient} text-white`
                          : 'bg-zinc-900 text-zinc-400'
                      }`}
                    >
                      <IconComp className="w-5 h-5" />
                    </div>
                    <span
                      className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                        isSelected
                          ? 'bg-gradient-to-r from-pink-500 to-red-600 text-white'
                          : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                      }`}
                    >
                      From {s.startingPrice}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-black text-base text-white">{s.shortName}</h3>
                      {isSelected && <CheckCircle2 className="w-5 h-5 text-pink-400" />}
                    </div>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-red-600/20 border border-red-500/40 text-[10px] font-black text-red-300">
                      {s.badge}
                    </span>
                    <p className="text-[11px] text-zinc-300 mt-1.5 leading-relaxed">{s.tagline}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Split Grid: Left = Voice & Lit-Box Booking Form (Cols 1-7) | Right = Live Estimate, Checklist & Guarantee (Cols 8-12) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: THE CUSTOMER BOOKING SHEET WITH LIT-UP BOXES */}
          <div className="lg:col-span-7">
            <div className="bg-zinc-950 rounded-3xl border-2 border-pink-500 shadow-[0_0_40px_rgba(236,72,153,0.25)] p-5 sm:p-7 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-pink-500 via-red-600 to-pink-500" />

              {formSubmitted ? (
                <div className="py-8 text-center space-y-5 animate-fadeIn">
                  <div className="flex justify-center">
                    <TidyUpsBunnyLogo size="lg" />
                  </div>
                  <div className="space-y-2">
                    <span className="inline-block px-3.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-xs font-black uppercase">
                      ✓ Form Completed &amp; Sent to TidyUps Dispatch
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-black text-white">
                      Thank you{firstName ? `, ${firstName},` : ''} for completing the form!
                    </h3>
                    <p className="text-base sm:text-lg font-extrabold text-pink-400 max-w-md mx-auto">
                      A team member will be in contact with you shortly.
                    </p>
                    <p className="text-xs sm:text-sm text-zinc-300 max-w-md mx-auto">
                      Your <strong>{activeServiceData.name}</strong> booking and instant quote have been saved in Jobber. We will confirm your arrival window at{' '}
                      <strong className="text-pink-400">{customerPhone}</strong>.
                    </p>
                  </div>

                  <div className="p-5 bg-zinc-900 rounded-2xl border-2 border-pink-500/60 max-w-md mx-auto text-left text-xs space-y-2.5 shadow-lg">
                    <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                      <span className="text-zinc-400 font-bold">Booking Reference:</span>
                      <span className="font-black font-mono text-pink-400 text-sm">
                        #{confirmedBookingId} ({confirmedQuoteNumber})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400 font-bold">Client Name:</span>
                      <span className="font-black text-white text-right">
                        {firstName} {lastName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400 font-bold">Selected Package:</span>
                      <span className="font-black text-pink-300 text-right">{priceCalculation.matchedItemName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400 font-bold">Crew &amp; Minimum Hours:</span>
                      <span className="font-bold text-red-300 text-right">{priceCalculation.hoursLabel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400 font-bold">Property Address:</span>
                      <span className="font-bold text-white text-right">{address}, {city}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400 font-bold">Preferred Date &amp; Time:</span>
                      <span className="font-black text-emerald-400 text-right">
                        {formattedPreferredDateLabel} • {preferredTime}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-zinc-800 text-sm">
                      <span className="font-black text-white">Estimated Total (incl. GST):</span>
                      <span className="font-black font-mono text-pink-400 text-base">
                        ${priceCalculation.total.toFixed(2)} CAD
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 flex flex-wrap gap-3 justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        setFormSubmitted(false);
                        setFirstName('');
                        setLastName('');
                        setCustomerPhone('');
                        setAddress('');
                        setVoiceCapturedFields({});
                      }}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-red-600 text-white text-xs font-black hover:opacity-95 transition-all cursor-pointer shadow-md"
                    >
                      Book Another Cleaning
                    </button>
                    <a
                      href="https://tidyupscleaning.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-2.5 rounded-xl border-2 border-pink-500 text-pink-300 text-xs font-black hover:bg-pink-950/40 transition-colors flex items-center gap-1.5"
                    >
                      <span>Return to tidyupscleaning.com</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleBookingSubmit} className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                    <div className="flex items-center gap-3">
                      <TidyUpsBunnyLogo size="sm" showRibbonText={false} />
                      <div>
                        <span className="text-[11px] font-black text-pink-400 uppercase tracking-wider block">
                          Step 2 of 3 • Voice &amp; Lit-Box Customer Booking Sheet
                        </span>
                        <h3 className="text-xl sm:text-2xl font-black text-white">
                          {activeServiceData.name}
                        </h3>
                      </div>
                    </div>
                    <div className="text-right bg-gradient-to-r from-pink-950 via-red-950 to-black border-2 border-pink-500 px-3.5 py-1.5 rounded-2xl shadow-md">
                      <span className="text-[10px] font-black uppercase text-pink-300 block">
                        Instant Estimate (+GST)
                      </span>
                      <span className="text-xl sm:text-2xl font-black font-mono text-white">
                        ${priceCalculation.total.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* ─────────────────────────────────────────────────────────────────
                      CONTINUOUS VOICE DICTATION BAR (NEVER SHUTS OFF ON PAUSE!)
                     ───────────────────────────────────────────────────────────────── */}
                  <div
                    className={`p-4 rounded-2xl border-2 transition-all space-y-2.5 ${
                      isRecordingFormVoice
                        ? 'border-red-500 bg-gradient-to-r from-red-950/90 via-pink-950/80 to-black ring-4 ring-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.45)]'
                        : 'border-pink-500/80 bg-gradient-to-r from-black via-pink-950/35 to-black'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isRecordingFormVoice
                              ? 'bg-red-600 text-white animate-pulse'
                              : 'bg-gradient-to-br from-pink-500 to-red-600 text-white'
                          }`}
                        >
                          {isRecordingFormVoice ? <Volume2 className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </div>
                        <div>
                          <span className="text-xs sm:text-sm font-black text-white block">
                            🎙️ Fill Out by Voice — Watch Every Box Light Up!
                          </span>
                          <span className="text-[11px] text-pink-200/90 block">
                            {isRecordingFormVoice
                              ? '● Continuous Mic Active — Pausing will NOT stop the mic! Click "Stop Mic" when finished.'
                              : 'Speak your First Name, Last Name, Phone, Address, Bedrooms, Bathrooms & Date at your own pace.'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleToggleFormMic}
                          className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md transition-all ${
                            isRecordingFormVoice
                              ? 'bg-red-600 hover:bg-red-500 text-white ring-2 ring-white/50'
                              : 'bg-gradient-to-r from-pink-500 to-red-600 hover:from-pink-400 hover:to-red-500 text-white'
                          }`}
                        >
                          {isRecordingFormVoice ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                          <span>{isRecordingFormVoice ? 'Stop Mic' : '🎙️ Start Continuous Mic'}</span>
                        </button>
                        <button
                          type="button"
                          disabled={isParsingFormVoice || !dictationText.trim()}
                          onClick={() => handleParseDictationIntoBlanks(dictationText)}
                          className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-pink-600 disabled:opacity-40 border border-pink-500/50 text-white text-xs font-black flex items-center gap-1 cursor-pointer"
                        >
                          <Wand2 className="w-3.5 h-3.5 text-pink-400" />
                          <span>{isParsingFormVoice ? 'Lighting...' : 'Light Up Boxes'}</span>
                        </button>
                      </div>
                    </div>

                    <input
                      type="text"
                      value={
                        interimDictation
                          ? `${dictationText} ${interimDictation}`.trim()
                          : dictationText
                      }
                      onChange={(e) => {
                        setDictationText(e.target.value);
                        latestTranscriptRef.current = e.target.value;
                        applyLiveSpeechExtraction(e.target.value);
                      }}
                      placeholder='Speak or type here: e.g. "My name is Sarah Jenkins, 780-555-0199, 10420 98 Ave NW Edmonton, 3 bedrooms 2 bathrooms, Friday morning"'
                      className="w-full px-3.5 py-2 bg-black/90 border border-pink-500/50 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-pink-400"
                    />
                    {voiceFillStatus && (
                      <p className="text-[11px] font-black text-emerald-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                        <span>{voiceFillStatus}</span>
                      </p>
                    )}
                  </div>

                  {/* ─────────────────────────────────────────────────────────────────
                      LIVE BOX LIGHTING PROGRESS BAR (See when every box is filled in!)
                     ───────────────────────────────────────────────────────────────── */}
                  <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[11px] font-black uppercase tracking-wider text-pink-400">
                        ✨ Live Box Lighting Tracker — See Every Box Light Up When Filled
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                          filledRequiredCount === requiredBoxesStatus.length
                            ? 'bg-emerald-500 text-black shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                            : 'bg-pink-600 text-white'
                        }`}
                      >
                        {filledRequiredCount} / {requiredBoxesStatus.length} Required Boxes Lit Up ✓
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {requiredBoxesStatus.map((b) => (
                        <div
                          key={b.key}
                          className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-black flex items-center justify-between gap-1.5 transition-all ${
                            b.filled
                              ? 'bg-emerald-950/70 border-emerald-400 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                          }`}
                        >
                          <span className="truncate">{b.label}</span>
                          {b.filled ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-red-500/70 shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-red-950/90 border-2 border-red-500 text-red-200 text-xs font-bold">
                      {errorMessage}
                    </div>
                  )}

                  {/* SPLIT CUSTOMER NAME: FIRST NAME + LAST NAME + PHONE + EMAIL */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* FIRST NAME BOX */}
                    <div className={`p-3.5 rounded-2xl border-2 ${getLitBoxClass('firstName', Boolean(firstName.trim()))}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-black text-white">
                          First Name *
                        </label>
                        {renderLitBadge('firstName', Boolean(firstName.trim()), true)}
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Sarah"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-black/90 border border-zinc-700 rounded-xl text-xs font-bold text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500"
                      />
                    </div>

                    {/* LAST NAME BOX */}
                    <div className={`p-3.5 rounded-2xl border-2 ${getLitBoxClass('lastName', Boolean(lastName.trim()))}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-black text-white">
                          Last Name *
                        </label>
                        {renderLitBadge('lastName', Boolean(lastName.trim()), true)}
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Jenkins"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-black/90 border border-zinc-700 rounded-xl text-xs font-bold text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500"
                      />
                    </div>

                    {/* MOBILE PHONE BOX */}
                    <div className={`p-3.5 rounded-2xl border-2 ${getLitBoxClass('customerPhone', Boolean(customerPhone.trim()))}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-black text-white">
                          Best Mobile Number (For Confirmation) *
                        </label>
                        {renderLitBadge('customerPhone', Boolean(customerPhone.trim()), true)}
                      </div>
                      <input
                        type="tel"
                        required
                        placeholder="(780) 555-0199"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-black/90 border border-zinc-700 rounded-xl text-xs font-bold text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500"
                      />
                    </div>

                    {/* EMAIL BOX */}
                    <div className={`p-3.5 rounded-2xl border-2 ${getLitBoxClass('customerEmail', Boolean(customerEmail.trim()))}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-black text-white">
                          Email Address (For Official Quote &amp; Receipt)
                        </label>
                        {renderLitBadge('customerEmail', Boolean(customerEmail.trim()), false)}
                      </div>
                      <input
                        type="email"
                        placeholder="sarah@example.com"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-black/90 border border-zinc-700 rounded-xl text-xs font-bold text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500"
                      />
                    </div>
                  </div>

                  {/* Property Street Address & City */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                    <div className={`sm:col-span-8 p-3.5 rounded-2xl border-2 ${getLitBoxClass('address', Boolean(address.trim()))}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-black text-white">
                          Property Street Address *
                        </label>
                        {renderLitBadge('address', Boolean(address.trim()), true)}
                      </div>
                      <AddressAutocompleteInput
                        theme="dark"
                        value={address}
                        onChange={(newAddr) => {
                          setAddress(newAddr);
                          triggerFieldHighlight('address');
                          const lower = newAddr.toLowerCase();
                          if (lower.includes('st. albert') || lower.includes('st albert')) { setCity('St. Albert'); triggerFieldHighlight('city'); }
                          else if (lower.includes('sherwood park')) { setCity('Sherwood Park'); triggerFieldHighlight('city'); }
                          else if (lower.includes('leduc')) { setCity('Leduc'); triggerFieldHighlight('city'); }
                          else if (lower.includes('spruce grove')) { setCity('Spruce Grove'); triggerFieldHighlight('city'); }
                          else if (lower.includes('beaumont')) { setCity('Beaumont'); triggerFieldHighlight('city'); }
                          else if (lower.includes('fort saskatchewan')) { setCity('Fort Saskatchewan'); triggerFieldHighlight('city'); }
                          else if (lower.includes('edmonton')) { setCity('Edmonton'); triggerFieldHighlight('city'); }
                        }}
                        placeholder="Start typing house #, street, or neighborhood (auto-completes)..."
                        className="px-3.5 py-2.5 bg-black/90 border border-zinc-700 rounded-xl text-xs font-bold text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500"
                        required
                      />
                    </div>

                    <div className={`sm:col-span-4 p-3.5 rounded-2xl border-2 ${getLitBoxClass('city', Boolean(city))}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-black text-white">
                          City / Community
                        </label>
                        {renderLitBadge('city', Boolean(city), false)}
                      </div>
                      <select
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full px-3 py-2.5 bg-black/90 border border-zinc-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-pink-500"
                      >
                        <option value="Edmonton">Edmonton</option>
                        <option value="Sherwood Park">Sherwood Park</option>
                        <option value="St. Albert">St. Albert</option>
                        <option value="Spruce Grove">Spruce Grove</option>
                        <option value="Leduc">Leduc</option>
                        <option value="Beaumont">Beaumont</option>
                        <option value="Fort Saskatchewan">Fort Saskatchewan</option>
                        <option value="Stony Plain">Stony Plain</option>
                      </select>
                    </div>
                  </div>

                  {/* Home Size, Bathrooms & Strict Cleaner Crew Rules */}
                  <div className="space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div className={`p-3.5 rounded-2xl border-2 ${getLitBoxClass('bedrooms', Boolean(bedrooms))}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-black text-white">
                            Bedrooms *
                          </label>
                          {renderLitBadge('bedrooms', Boolean(bedrooms), true)}
                        </div>
                        <select
                          value={bedrooms}
                          onChange={(e) => setBedrooms(e.target.value)}
                          className="w-full px-3 py-2.5 bg-black/90 border border-zinc-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-pink-500"
                        >
                          <option value="1 Bedroom">1 Bedroom / Condo</option>
                          <option value="2 Bedrooms">2 Bedrooms</option>
                          <option value="3 Bedrooms">3 Bedrooms</option>
                          <option value="4 Bedrooms">4 Bedrooms</option>
                          <option value="5 Bedrooms">5 Bedrooms</option>
                          <option value="6 Bedrooms">6+ Bedrooms</option>
                        </select>
                      </div>

                      <div className={`p-3.5 rounded-2xl border-2 ${getLitBoxClass('bathrooms', Boolean(bathrooms))}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-black text-white">
                            Bathrooms *
                          </label>
                          {renderLitBadge('bathrooms', Boolean(bathrooms), true)}
                        </div>
                        <select
                          value={bathrooms}
                          onChange={(e) => setBathrooms(e.target.value)}
                          className="w-full px-3 py-2.5 bg-black/90 border border-zinc-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-pink-500"
                        >
                          <option value="1 Bathroom">1 Bathroom</option>
                          <option value="1.5 Bathrooms">1.5 Bathrooms</option>
                          <option value="2 Bathrooms">2 Bathrooms</option>
                          <option value="2.5 Bathrooms">2.5 Bathrooms</option>
                          <option value="3 Bathrooms">3 Bathrooms</option>
                          <option value="3.5 Bathrooms">3.5 Bathrooms</option>
                          <option value="4 Bathrooms">4+ Bathrooms</option>
                        </select>
                      </div>

                      <div className="p-3.5 rounded-2xl border-2 border-zinc-800 bg-zinc-900/90">
                        <label className="block text-xs font-black text-white mb-1.5">
                          Frequency (Save up to 15%)
                        </label>
                        <select
                          value={frequency}
                          onChange={(e) => setFrequency(e.target.value as any)}
                          className="w-full px-3 py-2.5 bg-black/90 border border-zinc-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-pink-500"
                        >
                          <option value="One-Time">One-Time Cleaning</option>
                          <option value="Weekly (15% Off)">Weekly (Save 15%)</option>
                          <option value="Bi-Weekly (10% Off)">Bi-Weekly (Save 10%)</option>
                          <option value="Monthly (5% Off)">Monthly (Save 5%)</option>
                        </select>
                      </div>
                    </div>

                    {/* STRICT CREW & MINIMUM HOURS RULES BOX */}
                    <div className={`p-4 rounded-2xl border-2 ${getLitBoxClass('cleanerCount', true)}`}>
                      <div className="flex items-center justify-between mb-2.5 flex-wrap gap-2">
                        <label className="text-xs font-black text-white flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-pink-500" />
                          <span>Cleaner Crew &amp; Minimum Hours ({activeServiceData.name}):</span>
                        </label>
                        {renderLitBadge('cleanerCount', true, true)}
                      </div>

                      {selectedService === 'standard' && (
                        <div className="p-3.5 rounded-xl bg-black border-2 border-pink-500 flex items-center justify-between gap-3">
                          <div>
                            <div className="text-xs sm:text-sm font-black text-white">
                              👤 1 Professional Cleaner ($52.50/hr)
                            </div>
                            <p className="text-[11px] text-zinc-300 mt-0.5">
                              Basic Cleaning is locked to <strong>1 Pro Cleaner</strong> ({priceCalculation.hoursLabel}).
                            </p>
                          </div>
                          <span className="px-3 py-1 rounded-xl bg-pink-600 text-white text-xs font-black shrink-0">
                            1 Cleaner Only
                          </span>
                        </div>
                      )}

                      {selectedService === 'deep' && (
                        <div className="p-3.5 rounded-xl bg-black border-2 border-pink-500 flex items-center justify-between gap-3">
                          <div>
                            <div className="text-xs sm:text-sm font-black text-white">
                              👥 2 Professional Cleaners — Minimum 2 Hours ($105.00/hr)
                            </div>
                            <p className="text-[11px] text-zinc-300 mt-0.5">
                              Deep Cleaning requires a <strong>minimum of 2 cleaners for 2+ hours</strong> ({priceCalculation.hoursLabel}).
                            </p>
                          </div>
                          <span className="px-3 py-1 rounded-xl bg-red-600 text-white text-xs font-black shrink-0">
                            Min 2 Cleaners • 2+ Hrs
                          </span>
                        </div>
                      )}

                      {selectedService === 'move-out' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setCleanerCount(2);
                              triggerFieldHighlight('cleanerCount');
                            }}
                            className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                              cleanerCount === 2
                                ? 'bg-gradient-to-r from-pink-950 via-red-950 to-black border-pink-500 text-white shadow-md'
                                : 'bg-black border-zinc-800 text-zinc-400 hover:border-pink-500/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-white">
                                👥 2 Cleaners (Min 3 Hours)
                              </span>
                              {cleanerCount === 2 && <CheckCircle2 className="w-4 h-4 text-pink-400" />}
                            </div>
                            <div className="text-[11px] font-bold text-pink-300 mt-1">
                              Minimum 3 Hrs @ $105.00/hr ($315.00+)
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setCleanerCount(1);
                              triggerFieldHighlight('cleanerCount');
                            }}
                            className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                              cleanerCount === 1
                                ? 'bg-gradient-to-r from-pink-950 via-red-950 to-black border-pink-500 text-white shadow-md'
                                : 'bg-black border-zinc-800 text-zinc-400 hover:border-pink-500/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-white">
                                👤 1 Cleaner (Starts at 6 Hours)
                              </span>
                              {cleanerCount === 1 && <CheckCircle2 className="w-4 h-4 text-pink-400" />}
                            </div>
                            <div className="text-[11px] font-bold text-red-300 mt-1">
                              Starts at 6 Hrs Minimum @ $52.50/hr ($315.00+)
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Optional Add-ons */}
                  <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800">
                    <label className="block text-xs font-black text-white mb-2.5 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-pink-500" />
                      <span>Optional Extra Add-Ons (Click to Add):</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {ADDON_OPTIONS.map((addon) => {
                        const isChecked = selectedAddons.includes(addon.id);
                        return (
                          <button
                            key={addon.id}
                            type="button"
                            onClick={() => handleToggleAddon(addon.id)}
                            className={`p-2.5 rounded-xl border-2 text-left text-xs transition-all cursor-pointer flex items-center justify-between gap-1.5 ${
                              isChecked
                                ? 'bg-pink-950/80 border-pink-500 text-white font-black shadow-sm'
                                : 'bg-black border-zinc-800 text-zinc-300 font-bold hover:border-pink-500/50'
                            }`}
                          >
                            <span className="truncate">
                              {addon.icon} {addon.label}
                            </span>
                            <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-zinc-900 border border-pink-500/40 text-pink-300 shrink-0">
                              +${addon.price}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Interactive Preferred Date Pop-Up Calendar Picker & Time Window */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div
                      ref={datePickerContainerRef}
                      className={`relative p-3.5 rounded-2xl border-2 ${getLitBoxClass(
                        'preferredDate',
                        Boolean(preferredDate)
                      )}`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-black text-white flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-pink-500" />
                          <span>Preferred Cleaning Date *</span>
                        </label>
                        {renderLitBadge('preferredDate', Boolean(preferredDate), true)}
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsCalendarPopupOpen((o) => !o)}
                        className="w-full px-3.5 py-2.5 bg-black/90 border border-zinc-700 hover:border-pink-500 rounded-xl text-xs font-black text-white flex items-center justify-between cursor-pointer"
                      >
                        <span>📅 {formattedPreferredDateLabel}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-pink-600 text-white font-extrabold">
                          Pick Date ▾
                        </span>
                      </button>

                      {/* Pop-Up Month Calendar */}
                      {isCalendarPopupOpen && (
                        <div className="absolute left-0 top-full mt-2 z-40 w-72 sm:w-80 rounded-2xl bg-zinc-950 border-2 border-pink-500 shadow-2xl p-3.5 space-y-3">
                          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                            <button
                              type="button"
                              onClick={() =>
                                setCalendarMonthDate(
                                  new Date(calendarMonthDate.getFullYear(), calendarMonthDate.getMonth() - 1, 1)
                                )
                              }
                              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-black cursor-pointer"
                            >
                              ◀
                            </button>
                            <span className="text-xs font-black text-white">
                              {calendarMonthDate.toLocaleDateString('en-US', {
                                month: 'long',
                                year: 'numeric',
                              })}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setCalendarMonthDate(
                                  new Date(calendarMonthDate.getFullYear(), calendarMonthDate.getMonth() + 1, 1)
                                )
                              }
                              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-black cursor-pointer"
                            >
                              ▶
                            </button>
                          </div>

                          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-zinc-400">
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                              <div key={d}>{d}</div>
                            ))}
                          </div>

                          <div className="grid grid-cols-7 gap-1">
                            {calendarDaysGrid.map((cell, idx) => {
                              if (!cell.day) return <div key={`empty-${idx}`} />;
                              const isSelected = preferredDate === cell.iso;
                              return (
                                <button
                                  key={cell.iso}
                                  type="button"
                                  onClick={() => {
                                    setPreferredDate(cell.iso);
                                    triggerFieldHighlight('preferredDate');
                                    setIsCalendarPopupOpen(false);
                                  }}
                                  className={`py-1.5 rounded-lg text-xs font-black cursor-pointer transition-all ${
                                    isSelected
                                      ? 'bg-gradient-to-r from-pink-600 to-red-600 text-white shadow-sm'
                                      : 'hover:bg-pink-950 text-zinc-200'
                                  }`}
                                >
                                  {cell.day}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Quick Date Pills */}
                      <div className="flex flex-wrap items-center gap-1 mt-2">
                        {quickDatePills.slice(0, 3).map((p) => (
                          <button
                            key={p.iso}
                            type="button"
                            onClick={() => {
                              setPreferredDate(p.iso);
                              triggerFieldHighlight('preferredDate');
                            }}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black cursor-pointer transition-all ${
                              preferredDate === p.iso
                                ? 'bg-pink-600 text-white'
                                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700'
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div
                      className={`p-3.5 rounded-2xl border-2 ${getLitBoxClass(
                        'preferredTime',
                        Boolean(preferredTime)
                      )}`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-black text-white flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-red-500" />
                          <span>Preferred Arrival Window *</span>
                        </label>
                        {renderLitBadge('preferredTime', Boolean(preferredTime), true)}
                      </div>
                      <select
                        value={preferredTime}
                        onChange={(e) => setPreferredTime(e.target.value)}
                        className="w-full px-3 py-2.5 bg-black/90 border border-zinc-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-pink-500"
                      >
                        <option value="Morning (8:00 AM - 12:00 PM)">☀️ Morning (8:00 AM - 12:00 PM)</option>
                        <option value="Afternoon (12:00 PM - 4:00 PM)">🌤️ Afternoon (12:00 PM - 4:00 PM)</option>
                        <option value="Evening (4:00 PM - 7:00 PM)">🌙 Evening (4:00 PM - 7:00 PM)</option>
                        <option value="Flexible / Earliest Available">⚡ Flexible / Earliest Available</option>
                      </select>
                    </div>
                  </div>

                  {/* Special Instructions Box */}
                  <div
                    className={`p-3.5 rounded-2xl border-2 ${getLitBoxClass(
                      'specialInstructions',
                      Boolean(specialInstructions.trim())
                    )}`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-black text-white">
                        Special Notes, Pets, Parking or Lockbox / Entry Instructions
                      </label>
                      {renderLitBadge('specialInstructions', Boolean(specialInstructions.trim()), false)}
                    </div>
                    <textarea
                      rows={2}
                      placeholder="e.g. Friendly dog in backyard, key in lockbox #1234, please focus on master bathroom shower glass..."
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      className="w-full px-3.5 py-2 bg-black/90 border border-zinc-700 rounded-xl text-xs font-medium text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  {/* Terms & Conditions and Privacy Policy Consent Notice */}
                  <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 leading-relaxed flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      By submitting your booking request, you agree to TidyUps Cleaning Service Inc.&apos;s{' '}
                      <button
                        type="button"
                        onClick={() => handleOpenLegalModal('TERMS')}
                        className="font-black text-pink-400 hover:text-pink-300 underline cursor-pointer"
                      >
                        Terms &amp; Conditions (T&amp;C)
                      </button>{' '}
                      and{' '}
                      <button
                        type="button"
                        onClick={() => handleOpenLegalModal('PRIVACY')}
                        className="font-black text-red-400 hover:text-red-300 underline cursor-pointer"
                      >
                        Privacy Policy
                      </button>
                      .
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-pink-600 via-red-600 to-pink-600 hover:from-pink-500 hover:via-red-500 hover:to-pink-500 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-[0_0_25px_rgba(236,72,153,0.45)] transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>Submitting Your Cleaning Booking...</span>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        <span>
                          Confirm &amp; Request Booking ({priceCalculation.effectiveCleaners} Cleaner
                          {priceCalculation.effectiveCleaners > 1 ? 's' : ''}) — ${priceCalculation.total.toFixed(2)} CAD
                        </span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-center font-bold text-zinc-400">
                    🔒 No upfront card charge today • Synced directly with our official Jobber Price List!
                  </p>
                </form>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: LIVE INSTANT PRICE SUMMARY + PACKAGE CHECKLIST + GUARANTEE */}
          <div className="lg:col-span-5 space-y-6">
            {/* Instant Price Summary Card */}
            <div className="bg-gradient-to-br from-zinc-950 via-black to-red-950/60 text-white rounded-3xl border-2 border-pink-500 shadow-[0_0_35px_rgba(236,72,153,0.25)] p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3.5">
                <div className="flex items-center gap-3">
                  <TidyUpsBunnyLogo size="md" />
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-pink-400 block">
                      Step 3 of 3 • Official Catalog Price Breakdown
                    </span>
                    <h3 className="text-base font-black text-white">
                      Your Instant TidyUps Estimate
                    </h3>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-pink-600 to-red-600 text-white text-[10px] font-black uppercase">
                  {frequency}
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="font-black text-pink-400">{priceCalculation.matchedItemName}</div>
                    <div className="text-[11px] text-zinc-300 mt-0.5">
                      {bedrooms} • {bathrooms} • {priceCalculation.hoursLabel}
                    </div>
                  </div>
                  <span className="font-mono font-black text-white text-sm">
                    ${priceCalculation.discountedBase.toFixed(2)}
                  </span>
                </div>

                {/* Crew & Minimum Hours Rule Callout */}
                <div className="p-2.5 rounded-xl bg-black/80 border border-pink-500/40 text-[11px] text-pink-200 font-bold">
                  🐰 <strong>Crew Rule:</strong> {activeServiceData.ruleSummary}
                </div>

                {selectedAddons.length > 0 && (
                  <div className="pt-2 border-t border-zinc-800 space-y-1">
                    <span className="text-[10px] font-black uppercase text-red-400 block">
                      Selected Add-Ons:
                    </span>
                    {selectedAddons.map((id) => {
                      const addon = ADDON_OPTIONS.find((a) => a.id === id);
                      if (!addon) return null;
                      return (
                        <div key={id} className="flex justify-between text-xs text-zinc-200">
                          <span>
                            {addon.icon} {addon.label}
                          </span>
                          <span className="font-mono font-bold text-pink-300">+${addon.price.toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="pt-3 border-t border-zinc-800 space-y-1">
                  <div className="flex justify-between text-zinc-300">
                    <span>Subtotal:</span>
                    <span className="font-mono font-bold">${priceCalculation.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-300">
                    <span>Alberta GST (5%):</span>
                    <span className="font-mono font-bold">${priceCalculation.gst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-zinc-800 text-base font-black text-pink-400">
                    <span>Estimated Total (CAD):</span>
                    <span className="font-mono text-2xl text-white">${priceCalculation.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Package Checklist Card */}
            <div className="bg-zinc-950 rounded-3xl border-2 border-pink-500/60 shadow-lg p-6 space-y-4">
              <div className="flex items-start justify-between gap-3 border-b border-zinc-800 pb-3">
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-red-600/20 border border-red-500/50 text-red-300 text-[10px] font-black uppercase">
                    {activeServiceData.badge}
                  </span>
                  <h4 className="text-lg font-black text-white mt-1">
                    What&apos;s Included in {activeServiceData.shortName}
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">{activeServiceData.tagline}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {activeServiceData.checklist.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-zinc-200 font-medium">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-r from-pink-500 to-red-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 24-Hour Satisfaction Guarantee Card */}
            <div className="bg-gradient-to-r from-pink-950 via-red-950 to-black rounded-3xl border-2 border-red-500 p-5 space-y-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-black border border-pink-500 text-pink-400 flex items-center justify-center shrink-0 shadow-md">
                  <HeartHandshake className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-white">
                    The TidyUps 24-Hour Clean Guarantee
                  </h4>
                  <p className="text-xs font-medium text-zinc-200 leading-snug mt-0.5">
                    If you or your landlord spot any missed item on your checklist within 24 hours, our crew returns and re-cleans it free of charge!
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t border-pink-500/30 flex flex-wrap items-center justify-between gap-2 text-xs font-black text-zinc-200">
                <span>Questions? Email our Edmonton booking team:</span>
                <a
                  href="mailto:booking@tidyupscleaning.com"
                  className="text-pink-400 underline hover:text-pink-300 font-mono"
                >
                  booking@tidyupscleaning.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          4. CUSTOMER-ONLY FOOTER (BLACK, HOT PINK & BRIGHT RED — NO PHONE NUMBERS)
         ───────────────────────────────────────────────────────────────────────────── */}
      <footer className="bg-zinc-950 text-zinc-300 border-t-2 border-pink-500 py-8 px-4 sm:px-6 lg:px-8 mt-4">
        <div className="max-w-7xl mx-auto space-y-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <TidyUpsBunnyLogo size="sm" />
              <div>
                <p className="font-black text-white">
                  TidyUps Cleaning Service Inc. • Established 2012
                </p>
                <p className="text-[11px] text-zinc-400">
                  Serving Edmonton, St. Albert, Sherwood Park, Spruce Grove, Leduc &amp; Beaumont
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 font-bold">
              <a
                href="https://tidyupscleaning.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-pink-400 hover:text-pink-300 flex items-center gap-1"
              >
                <span>Main Website: tidyupscleaning.com</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <a href="mailto:booking@tidyupscleaning.com" className="text-red-400 hover:text-red-300 font-mono">
                booking@tidyupscleaning.com
              </a>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-zinc-400">
            <div>
              © {new Date().getFullYear()} TidyUps Cleaning Service Inc. All rights reserved. • 8306 Chappelle Way SW, Edmonton, AB T6W 4L3
            </div>
            <div className="flex flex-wrap items-center gap-4 font-bold">
              <button
                type="button"
                onClick={() => handleOpenLegalModal('PRIVACY')}
                className="text-pink-400 hover:text-white underline cursor-pointer flex items-center gap-1"
              >
                <Lock className="w-3 h-3" />
                <span>Privacy Policy</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenLegalModal('TERMS')}
                className="text-red-400 hover:text-white underline cursor-pointer flex items-center gap-1"
              >
                <FileText className="w-3 h-3" />
                <span>Terms &amp; Conditions</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenLegalModal('SUPPORT')}
                className="text-zinc-300 hover:text-white underline cursor-pointer flex items-center gap-1"
              >
                <HelpCircle className="w-3 h-3" />
                <span>FAQ &amp; Support</span>
              </button>
              {onOpenStaffLogin && !isCustomerLockPreview && (
                <button
                  type="button"
                  onClick={onOpenStaffLogin}
                  className="text-zinc-500 hover:text-pink-400 underline cursor-pointer flex items-center gap-1"
                >
                  <Lock className="w-3 h-3" />
                  <span>Staff &amp; Owner Login</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </footer>

      {/* ─────────────────────────────────────────────────────────────────────────────
          5. BUILT-IN PRIVACY POLICY, TERMS & CONDITIONS (T&C) & SUPPORT MODAL
         ───────────────────────────────────────────────────────────────────────────── */}
      {activeLegalModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-zinc-950 rounded-3xl border-2 border-pink-500 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden my-auto text-white">
            <div className="bg-gradient-to-r from-black via-zinc-950 to-red-950 text-white px-5 py-4 border-b-2 border-pink-500 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <TidyUpsBunnyLogo size="sm" />
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white">
                    TidyUps Cleaning Service Inc.
                  </h2>
                  <p className="text-[11px] text-pink-400 font-mono">
                    https://app.tidyupscleaning.com/book • https://tidyupscleaning.com
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleOpenLegalModal('PRIVACY')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all ${
                    activeLegalModal === 'PRIVACY'
                      ? 'bg-pink-600 text-white'
                      : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Privacy Policy</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenLegalModal('TERMS')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all ${
                    activeLegalModal === 'TERMS'
                      ? 'bg-red-600 text-white'
                      : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Terms &amp; Conditions</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenLegalModal('SUPPORT')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all ${
                    activeLegalModal === 'SUPPORT'
                      ? 'bg-pink-500 text-black'
                      : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>FAQ &amp; Support</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenLegalModal(null)}
                  className="ml-1 p-2 rounded-xl bg-zinc-900 hover:bg-red-600 text-white cursor-pointer transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-5 sm:p-8 overflow-y-auto space-y-5 text-xs sm:text-sm text-zinc-300 leading-relaxed flex-1">
              {activeLegalModal === 'PRIVACY' && (
                <div className="space-y-4">
                  <h3 className="text-xl font-black text-white">
                    Privacy Policy — TidyUps Cleaning Service Inc.
                  </h3>
                  <p>
                    We collect your First Name, Last Name, mobile phone number, email address, and property details solely to prepare your cleaning quote, schedule your appointment in Jobber, and deliver your residential cleaning service. We never sell or share your personal data with third parties.
                  </p>
                  <p>
                    Questions? Email <a href="mailto:booking@tidyupscleaning.com" className="text-pink-400 underline font-bold">booking@tidyupscleaning.com</a>.
                  </p>
                </div>
              )}

              {activeLegalModal === 'TERMS' && (
                <div className="space-y-4">
                  <h3 className="text-xl font-black text-white">
                    Terms &amp; Conditions — TidyUps Cleaning Service Inc.
                  </h3>
                  <ul className="list-disc list-inside space-y-2">
                    <li><strong>Basic Cleaning:</strong> Scheduled with 1 professional cleaner ($52.50/hr).</li>
                    <li><strong>Move-Out Cleaning:</strong> Minimum 3 hours with 2 cleaners ($105.00/hr = $315.00 min), or starts at 6 hours minimum with 1 cleaner ($52.50/hr = $315.00 min).</li>
                    <li><strong>Deep Cleaning:</strong> Minimum 2 cleaners for 2 hours ($105.00/hr = $210.00 min).</li>
                    <li><strong>24-Hour Clean Guarantee:</strong> Report any missed checklist item within 24 hours and our team returns to re-clean it free of charge.</li>
                  </ul>
                </div>
              )}

              {activeLegalModal === 'SUPPORT' && (
                <div className="space-y-4">
                  <h3 className="text-xl font-black text-white">
                    Customer Support &amp; FAQ
                  </h3>
                  <p>
                    All supplies, HEPA vacuums, and eco-safe sanitizers are included with every clean. Email our Edmonton booking desk anytime at{' '}
                    <a href="mailto:booking@tidyupscleaning.com" className="text-pink-400 underline font-bold">
                      booking@tidyupscleaning.com
                    </a>
                    .
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
