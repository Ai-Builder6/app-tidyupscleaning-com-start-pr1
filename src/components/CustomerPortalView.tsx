import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  Calendar,
  MapPin,
  ShieldCheck,
  Phone,
  Mail,
  ArrowRight,
  Check,
  Star,
  Home,
  Building2,
  Key,
  Brush,
  HeartHandshake,
  Award,
  ExternalLink,
  PhoneCall,
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
} from 'lucide-react';
import { AddressAutocompleteInput } from './AddressAutocompleteInput';
import { ServiceTicket } from '../types/dispatch';
import { ServiceCatalogItem, CANONICAL_SERVICE_CATALOG } from '../data/serviceCatalogData';

export interface CustomerBookingSubmissionPayload {
  ticket: ServiceTicket;
  quote?: any;
  lead?: any;
  client?: any;
  visit?: any;
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

export type CleaningCategory =
  | 'standard'
  | 'deep'
  | 'move-out'
  | 'airbnb'
  | 'commercial'
  | 'post-renovation';

interface ServiceDetail {
  id: CleaningCategory;
  name: string;
  shortName: string;
  badge: string;
  tagline: string;
  startingPrice: string;
  recommendedFor: string;
  duration: string;
  icon: any;
  accentGradient: string;
  lightBg: string;
  borderActive: string;
  checklist: string[];
}

const OFFICIAL_LOGO_URL = '/assets/aistudio/833Tidyups_Logo_2025-removebg_b60e5c87.png';

const OFFICIAL_COMPANY_BANNERS = [
  {
    id: 'banner-3',
    src: '/assets/aistudio/833_Banner_003_16385828.png',
    title: '833 TidyUps Cleaning Service — Residential, Deep & Move-Out Specialists',
    caption: 'Standard & Deep Cleans • Move In & Move Out • AirBnBs Across Edmonton & Area',
  },
  {
    id: 'banner-4',
    src: '/assets/aistudio/833_Banner_004_-_Copy__2__3861ba3f.png',
    title: '1-833-TIDYUPS (833-843-9877) — Vetted Professional Cleaning Crew',
    caption: 'Commercial & Residential • Move In/Out • Deep Cleans • AirBnB Turnovers',
  },
  {
    id: 'banner-1',
    src: '/assets/aistudio/833_Banner_001_de5f6067.png',
    title: 'Hotel-Grade Kitchen, Bathroom & Whole-Home Detailing',
    caption: 'Direct Line: 780-718-5092 • Toll-Free: 833-843-9877 • tidyupscleaning.com',
  },
  {
    id: 'banner-5',
    src: '/assets/aistudio/833_Banner_005_-_Copy_62f2c130.png',
    title: 'Fully Equipped 1, 2 & 3-Cleaner Teams Ready for Your Home',
    caption: 'Established 2012 • 100% Satisfaction & 24-Hour Free Re-Clean Guarantee',
  },
];

const ADDON_OPTIONS = [
  { id: 'oven', label: 'Inside Oven Deep Degrease', price: 35, icon: '🔥' },
  { id: 'fridge', label: 'Inside Fridge Sanitize', price: 35, icon: '❄️' },
  { id: 'cabinets', label: 'Inside Kitchen Cabinets', price: 45, icon: '🗄️' },
  { id: 'windows', label: 'Interior Window Glass & Tracks', price: 40, icon: '🪟' },
  { id: 'baseboards', label: 'Hand-Wash All Baseboards & Trim', price: 35, icon: '✨' },
  { id: 'laundry', label: '1 Load Laundry Wash & Fold', price: 30, icon: '🧺' },
];

const CLEANING_SERVICES: ServiceDetail[] = [
  {
    id: 'standard',
    name: 'Standard / Basic Residential Cleaning',
    shortName: 'Basic / Standard Clean',
    badge: 'Most Popular • 1, 2 or 3 Cleaners',
    tagline: 'Bright, spotless upkeep that keeps your home fresh, sanitized, and stress-free.',
    startingPrice: '$145.50',
    recommendedFor: 'Busy families, professionals & regular weekly/bi-weekly/monthly care',
    duration: '3 - 4.5 Hours',
    icon: Brush,
    accentGradient: 'from-cyan-500 via-teal-500 to-emerald-500',
    lightBg: 'from-cyan-50 to-teal-50',
    borderActive: 'border-cyan-500 ring-cyan-400/30',
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
    name: 'Deep Cleaning & Full Sanitization',
    shortName: 'Deep Cleaning',
    badge: 'Top Seasonal Pick',
    tagline: 'Intensive top-to-bottom scrub targeting built-up grime, soap scale, and neglected corners.',
    startingPrice: '$210.00',
    recommendedFor: 'Spring/Fall refresh, first-time cleans, homes uncleaned for 60+ days',
    duration: '4 - 6 Hours',
    icon: Sparkles,
    accentGradient: 'from-pink-500 via-fuchsia-500 to-purple-600',
    lightBg: 'from-pink-50 to-fuchsia-50',
    borderActive: 'border-pink-500 ring-pink-400/30',
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
  {
    id: 'move-out',
    name: 'Move-Out & Move-In Inspection Clean',
    shortName: 'Move-Out / Move-In',
    badge: '100% Deposit Guarantee',
    tagline: 'Inspection-ready turnkey reset for tenants, landlords, home buyers, and realtors.',
    startingPrice: '$262.50',
    recommendedFor: 'Lease-end inspections, home sales, possession day move-ins',
    duration: '5 - 7 Hours (1-3 Cleaners)',
    icon: Key,
    accentGradient: 'from-amber-500 via-orange-500 to-pink-600',
    lightBg: 'from-amber-50 to-pink-50',
    borderActive: 'border-amber-500 ring-amber-400/30',
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
    id: 'airbnb',
    name: 'Airbnb & Short-Term Rental Turnovers',
    shortName: 'Airbnb Turnover',
    badge: 'Same-Day Fast Turn',
    tagline: 'Hotel-grade 5-star guest turnaround with fresh linens, staging, and photo verification.',
    startingPrice: '$169.00',
    recommendedFor: 'Airbnb Superhosts, VRBO hosts & executive rental managers',
    duration: '2 - 3.5 Hours (Tight Window)',
    icon: Home,
    accentGradient: 'from-teal-500 via-cyan-500 to-blue-600',
    lightBg: 'from-teal-50 to-sky-50',
    borderActive: 'border-teal-500 ring-teal-400/30',
    checklist: [
      'Same-day check-out to check-in scheduling window',
      'Hotel-style bed making with fresh linens & towel staging',
      'Full kitchen sanitization, dishwasher unload & coffee station reset',
      'Sparkling bathroom disinfection with hospitality presentation',
      'Restocking guest toiletries, paper products & supplies',
      'Damage & left-behind item inspection report with photos',
      'Lockbox code verification & entryway sweep',
      'Multi-property recurring host scheduling available',
    ],
  },
  {
    id: 'commercial',
    name: 'Commercial & Office Cleaning',
    shortName: 'Commercial / Office',
    badge: 'Daytime or After-Hours',
    tagline: 'Spotless offices, clinics, retail storefronts, and common areas for a stellar impression.',
    startingPrice: '$189.00',
    recommendedFor: 'Offices, medical/dental clinics, retail stores, showrooms & studios',
    duration: 'Flexible / Custom Crew',
    icon: Building2,
    accentGradient: 'from-blue-600 via-indigo-600 to-purple-600',
    lightBg: 'from-blue-50 to-indigo-50',
    borderActive: 'border-blue-500 ring-blue-400/30',
    checklist: [
      'Workstations, desks, reception & conference tables sanitized',
      'Staff breakroom, sink, microwave & fridge upkeep',
      'Commercial restroom hygiene sanitization & supply restocking',
      'High-traffic commercial carpet vacuuming & floor mopping',
      'Entryway glass doors, mirrors & fingerprint removal',
      'Trash & recycling consolidation and bin relining',
      'Touchpoint antibacterial wipe-down (handles, POS, railings)',
      'Secure alarm arming & lock-up compliance',
    ],
  },
  {
    id: 'post-renovation',
    name: 'Post-Construction & Renovation Clean',
    shortName: 'Post-Renovation',
    badge: 'Fine Drywall Dust Removal',
    tagline: 'Specialized multi-pass extraction of drywall dust, sawdust, and contractor residue.',
    startingPrice: '$289.00',
    recommendedFor: 'Homeowners, builders & designers after remodeling or new builds',
    duration: '5 - 8 Hours',
    icon: Award,
    accentGradient: 'from-fuchsia-600 via-pink-600 to-rose-600',
    lightBg: 'from-fuchsia-50 to-rose-50',
    borderActive: 'border-fuchsia-500 ring-fuchsia-400/30',
    checklist: [
      'Multi-pass HEPA micro-filtration fine dust extraction',
      'Wiping drywall dust off walls, baseboards, doors & trim',
      'Removing manufacturer stickers & protective films from fixtures',
      'Window tracks, sills & interior glass detailing',
      'Vacuuming & wiping inside all new cabinets, drawers & closets',
      'Polishing chrome plumbing fixtures, stone counters & tile',
      'Scrubbing hard floors to remove construction haze',
      'HVAC register & air vent cover washing',
    ],
  },
];

export const CustomerPortalView: React.FC<CustomerPortalViewProps> = ({
  onBookingSubmitted,
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

  const [selectedService, setSelectedService] = useState<CleaningCategory>('standard');
  const [activeBannerIdx, setActiveBannerIdx] = useState<number>(0);

  // Booking Sheet Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Edmonton');
  const [postalCode, setPostalCode] = useState('');
  const [bedrooms, setBedrooms] = useState('3 Bedrooms');
  const [bathrooms, setBathrooms] = useState('2 Bathrooms');
  const [cleanerCount, setCleanerCount] = useState<1 | 2 | 3>(1);
  const [frequency, setFrequency] = useState<'One-Time' | 'Weekly (15% Off)' | 'Bi-Weekly (10% Off)' | 'Monthly (5% Off)'>('One-Time');
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

  // Staff Control Bar State (Only when viewed by owner inside app.tidyupscleaning.com)
  const [copiedLinkKey, setCopiedLinkKey] = useState<string | null>(null);
  const [isReconnectingLeads, setIsReconnectingLeads] = useState<boolean>(false);
  const [staffStatusMessage, setStaffStatusMessage] = useState<string | null>(null);

  // Optional Voice Fill for Customers/Callers
  const [isRecordingFormVoice, setIsRecordingFormVoice] = useState(false);
  const [dictationText, setDictationText] = useState('');
  const [isParsingFormVoice, setIsParsingFormVoice] = useState(false);
  const [voiceFillStatus, setVoiceFillStatus] = useState<string | null>(null);

  const activeServiceData =
    CLEANING_SERVICES.find((s) => s.id === selectedService) || CLEANING_SERVICES[0];

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

  // Calculate live price from the 108-item Jobber Service Catalog
  const priceCalculation = useMemo(() => {
    const bedNumMatch = bedrooms.match(/\d+/);
    const bathNumMatch = bathrooms.match(/\d+/);
    const bedNum = bedNumMatch ? parseInt(bedNumMatch[0], 10) : 3;
    const bathNum = bathNumMatch ? parseInt(bathNumMatch[0], 10) : 2;

    const categoryKeyword =
      selectedService === 'move-out'
        ? 'move'
        : selectedService === 'deep'
        ? 'deep'
        : 'basic';

    const catalogList =
      Array.isArray(serviceCatalog) && serviceCatalog.length > 0
        ? serviceCatalog
        : CANONICAL_SERVICE_CATALOG;

    const matchedItem = catalogList.find((item) => {
      const nameLower = (item.jobberItemName || item.name || '').toLowerCase();
      const matchesBed = nameLower.includes(`${bedNum}bed`) || item.bedrooms === bedNum;
      const matchesBath = nameLower.includes(`${bathNum}bath`) || item.bathrooms === bathNum;
      const matchesCat = nameLower.includes(categoryKeyword);
      const matchesCrew =
        (item.cleanerCount || 1) === cleanerCount ||
        (cleanerCount === 1 && nameLower.includes('1 pro')) ||
        (cleanerCount === 2 && nameLower.includes('2 pro')) ||
        (cleanerCount === 3 && nameLower.includes('3 pro'));
      return matchesBed && matchesBath && matchesCat && matchesCrew;
    });

    let basePackagePrice = matchedItem?.basePrice || 0;
    if (!basePackagePrice) {
      const baseRatePerHr =
        selectedService === 'move-out' || selectedService === 'post-renovation'
          ? 52.5
          : selectedService === 'deep'
          ? 52.5
          : 48.5;
      const estHours = Math.max(3, bedNum * 1.0 + bathNum * 0.75 + (selectedService === 'move-out' ? 1.5 : 0));
      const crewDiscount = cleanerCount === 2 ? 0.96 : cleanerCount === 3 ? 0.93 : 1.0;
      basePackagePrice = Math.round(estHours * baseRatePerHr * crewDiscount * 100) / 100;
    }

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
      matchedItemName:
        matchedItem?.jobberItemName ||
        `${bedNum}Bed ${bathNum}Bath ${activeServiceData.shortName} (${cleanerCount} Pro Cleaner${
          cleanerCount > 1 ? 's' : ''
        })`,
      basePackagePrice,
      discountedBase,
      addonsTotal,
      subtotal,
      gst,
      total,
      hoursLabel: matchedItem?.baseHours
        ? `${matchedItem.baseHours} hrs (${cleanerCount} Cleaner${cleanerCount > 1 ? 's' : ''})`
        : activeServiceData.duration,
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
            '✓ Reconnected Facebook Lead Ads, Google Ads Webhooks & Google Sheets! All new customer bookings on book.tidyupscleaning.com also flow straight into your Master Leads Table.'
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

  const handleParseDictationIntoBlanks = async (textToUse?: string) => {
    const raw = (textToUse ?? dictationText).trim();
    if (!raw) return;
    setIsParsingFormVoice(true);
    setVoiceFillStatus('Filling form blanks from voice dictation...');
    try {
      const res = await fetch('/api/dispatch/parse-voice-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: raw }),
      });
      const data = await res.json();
      if (data) {
        if (data.customerName && data.customerName !== 'Residential Client') setCustomerName(data.customerName);
        if (data.phone) setCustomerPhone(data.phone);
        if (data.email) setCustomerEmail(data.email);
        if (data.address) setAddress(data.address);
        if (data.city) setCity(data.city);
        if (data.preferredDate) setPreferredDate(data.preferredDate);
        if (data.timeWindow) setPreferredTime(data.timeWindow);
        if (data.bedrooms) setBedrooms(data.bedrooms);
        if (data.bathrooms) setBathrooms(data.bathrooms);
        if (data.specificInstructions) setSpecialInstructions(data.specificInstructions);
        else setSpecialInstructions(raw);

        const cat = (data.serviceCategory || '').toLowerCase();
        if (cat.includes('move')) setSelectedService('move-out');
        else if (cat.includes('deep')) setSelectedService('deep');
        else if (cat.includes('standard') || cat.includes('basic')) setSelectedService('standard');
        else if (cat.includes('reno')) setSelectedService('post-renovation');
        else if (cat.includes('commercial')) setSelectedService('commercial');

        setVoiceFillStatus(
          `✓ Auto-filled: ${data.customerName || 'Customer'} • ${data.address || city} • ${
            data.preferredDayLabel || data.preferredDate || 'Date Set'
          }`
        );
      }
    } catch {
      setVoiceFillStatus('Added voice notes to special instructions.');
    } finally {
      setIsParsingFormVoice(false);
    }
  };

  const handleToggleFormMic = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setVoiceFillStatus('Type or paste your details below and click "Fill Blanks".');
      return;
    }
    if (isRecordingFormVoice) {
      setIsRecordingFormVoice(false);
      return;
    }
    try {
      const rec = new SpeechRec();
      rec.lang = 'en-CA';
      rec.continuous = false;
      rec.interimResults = false;
      rec.onstart = () => {
        setIsRecordingFormVoice(true);
        setVoiceFillStatus('Listening... Speak your name, phone, address, bedrooms, bathrooms & preferred date.');
      };
      rec.onresult = (ev: any) => {
        const t = ev.results?.[0]?.[0]?.transcript || '';
        if (t) {
          setDictationText(t);
          handleParseDictationIntoBlanks(t);
        }
      };
      rec.onend = () => setIsRecordingFormVoice(false);
      rec.start();
    } catch {
      setIsRecordingFormVoice(false);
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !address.trim()) {
      setErrorMessage('Please enter your full name, phone number, and street address.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const fullAddress = address.toLowerCase().includes(city.toLowerCase())
      ? address.trim()
      : `${address.trim()}, ${city}, AB ${postalCode.trim()}`.trim();

    const addonLabels = selectedAddons
      .map((id) => ADDON_OPTIONS.find((a) => a.id === id)?.label)
      .filter(Boolean) as string[];

    try {
      const res = await fetch('/api/public/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim(),
          serviceType: priceCalculation.matchedItemName,
          address: fullAddress,
          city,
          postalCode: postalCode.trim(),
          bedrooms,
          bathrooms,
          cleanerCount,
          frequency,
          selectedAddons: addonLabels,
          estimatedSubtotal: priceCalculation.subtotal,
          estimatedTotal: priceCalculation.total,
          preferredDate: preferredDate || new Date().toISOString().slice(0, 10),
          preferredTime,
          specialInstructions: specialInstructions.trim(),
          heardAbout,
          utmSource:
            heardAbout.includes('Facebook')
              ? 'Facebook Leads'
              : heardAbout.includes('Google')
              ? 'Google Leads'
              : 'book.tidyupscleaning.com',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setConfirmedBookingId(data.jobberJobId || `JOB-${Math.floor(10000 + Math.random() * 90000)}`);
        setConfirmedQuoteNumber(data.quoteNumber || 'QT-4390');
        setFormSubmitted(true);
        if (onBookingSubmitted && data.ticket) {
          onBookingSubmitted(data.ticket, {
            ticket: data.ticket,
            quote: data.quote,
            lead: data.lead,
            client: data.client,
            visit: data.visit,
          });
        }
      } else {
        setErrorMessage(data.error || 'Could not submit booking. Please call 1-833-TIDYUPS (833-843-9877).');
      }
    } catch {
      setErrorMessage('Network connection error. Please call 1-833-TIDYUPS (833-843-9877) or (780) 718-5092.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showStaffPreviewBanner = !isStandaloneCustomerSite && Boolean(onToggleCustomerLockPreview);

  return (
    <div className="flex-1 h-full w-full overflow-y-auto overflow-x-hidden bg-gradient-to-b from-cyan-50 via-pink-50/40 to-amber-50/30 font-sans text-slate-900">
      {/* ─────────────────────────────────────────────────────────────────────────────
          OWNER-ONLY CONTROL BAR (NEVER SHOWN TO CUSTOMERS ON book.tidyupscleaning.com)
         ───────────────────────────────────────────────────────────────────────────── */}
      {showStaffPreviewBanner && !isCustomerLockPreview && (
        <div className="bg-slate-950 text-white px-4 py-3 border-b-2 border-cyan-400 shadow-lg">
          <div className="max-w-7xl mx-auto flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3 flex-wrap">
              <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                <Globe className="w-3.5 h-3.5" />
                <span>book.tidyupscleaning.com Ready</span>
              </span>
              <div className="text-xs text-slate-200">
                <strong className="text-amber-300">Customer-Only 1-Page Booking Site:</strong> Customers sent to{' '}
                <code className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono font-bold">
                  book.tidyupscleaning.com
                </code>{' '}
                are <strong>locked strictly to this 1-page booking sheet</strong> (they cannot see or use the rest of your app), while every booking &amp; Facebook/Google lead goes straight into your <strong>Master Leads &amp; Quotes Table</strong>!
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleCopyBookingLink('main', 'https://book.tidyupscleaning.com')}
                className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                title="Copy https://book.tidyupscleaning.com to send to customers"
              >
                {copiedLinkKey === 'main' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLinkKey === 'main' ? 'Copied book.tidyupscleaning.com!' : 'Copy Customer Link (book.tidyupscleaning.com)'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopyBookingLink('fb', 'https://book.tidyupscleaning.com/?source=facebook')}
                className="px-2.5 py-1.5 rounded-xl bg-[#1877F2] hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shadow-xs"
                title="Copy Facebook Ad Landing URL — auto-tags bookings under Facebook Leads"
              >
                {copiedLinkKey === 'fb' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLinkKey === 'fb' ? 'Copied FB Link!' : '🔵 Copy FB Ad Link'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopyBookingLink('google', 'https://book.tidyupscleaning.com/?source=google')}
                className="px-2.5 py-1.5 rounded-xl bg-[#0F9D58] hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shadow-xs"
                title="Copy Google Ad Landing URL — auto-tags bookings under Google Leads"
              >
                {copiedLinkKey === 'google' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLinkKey === 'google' ? 'Copied Google Link!' : '🟢 Copy Google Ad Link'}</span>
              </button>

              <button
                type="button"
                onClick={handleReconnectFacebookAndGoogleLeads}
                disabled={isReconnectingLeads}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-fuchsia-600 hover:from-pink-400 hover:to-fuchsia-500 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                title="Reconnect Facebook Lead Ads, Google Ads Webhooks & Pull Latest Rows from Google Sheets"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isReconnectingLeads ? 'animate-spin' : ''}`} />
                <span>{isReconnectingLeads ? 'Reconnecting...' : '🔄 Reconnect FB & Google Leads'}</span>
              </button>

              {onToggleCustomerLockPreview && (
                <button
                  type="button"
                  onClick={() => onToggleCustomerLockPreview(true)}
                  className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Preview exact Customer-Only Locked Mode (hides all staff bars & buttons)"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Test Customer-Only Lock</span>
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
            className="px-4 py-2 rounded-2xl bg-slate-950/90 hover:bg-slate-900 text-amber-300 border border-amber-400/50 text-xs font-black flex items-center gap-2 shadow-2xl cursor-pointer"
          >
            <Unlock className="w-4 h-4 text-amber-400" />
            <span>Exit Customer-Only Lock Preview (Return to Staff App)</span>
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          1. DEDICATED CUSTOMER-ONLY STICKY TOP HEADER (833 TIDYUPS BRIGHT BRANDING)
             No internal app tabs — only Logo, Main Website link, Phone Lines & Book Now!
         ───────────────────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b-4 border-cyan-400 shadow-md px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Official 833 Tidyups Crest Logo & Name */}
          <div className="flex items-center gap-3">
            <img
              src={OFFICIAL_LOGO_URL}
              alt="833 Tidyups Cleaning Service Logo"
              className="w-12 h-12 sm:w-14 sm:h-14 object-contain drop-shadow-sm shrink-0"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg sm:text-xl font-black tracking-tight bg-gradient-to-r from-pink-600 via-fuchsia-600 to-cyan-600 bg-clip-text text-transparent">
                  833 TidyUps Cleaning Service
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-amber-300 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                  Est. 2012 • Edmonton &amp; Area
                </span>
              </div>
              <p className="text-[11px] sm:text-xs font-bold text-slate-600">
                Residential • Commercial • Deep Cleans • Move-In / Move-Out • AirBnB
              </p>
            </div>
          </div>

          {/* Customer-Only Actions: Visit Main Website + Official Phone Numbers + Jump to Booking Form */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <a
              href="https://tidyupscleaning.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 border-2 border-cyan-400 text-cyan-950 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              title="Visit our main company website at tidyupscleaning.com"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-600" />
              <span>Visit Website (tidyupscleaning.com)</span>
              <ExternalLink className="w-3 h-3 text-cyan-700" />
            </a>

            <a
              href="tel:18338439877"
              className="px-3 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-fuchsia-600 hover:from-pink-500 hover:to-fuchsia-500 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <PhoneCall className="w-3.5 h-3.5 text-amber-300" />
              <span>1-833-TIDYUPS (833-843-9877)</span>
            </a>

            <a
              href="tel:7807185092"
              className="hidden md:flex px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5 text-slate-950" />
              <span>(780) 718-5092</span>
            </a>

            <button
              type="button"
              onClick={() => bookingFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Book Now ↓</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────────────────────
          2. BRIGHT VIBRANT HERO + OFFICIAL 833 TIDYUPS BANNERS SHOWCASE
         ───────────────────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[#ec4899] via-[#9333ea] to-[#06b6d4] text-white py-8 sm:py-10 px-4 sm:px-6 lg:px-8 border-b-4 border-amber-400 shadow-lg">
        {/* Bright decorative glow accents */}
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-amber-300/30 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-cyan-300/30 blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Hero Copy & Trust Badges */}
          <div className="lg:col-span-6 space-y-4 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-300 text-slate-950 text-xs font-black uppercase tracking-wide shadow-md">
              <Sparkles className="w-4 h-4 text-pink-600 fill-pink-600" />
              <span>Official Customer Booking Page • book.tidyupscleaning.com</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight drop-shadow-sm">
              Book Your Sparkling Clean Home in{' '}
              <span className="text-amber-300 underline decoration-cyan-300 decoration-4 underline-offset-4">
                60 Seconds!
              </span>
            </h1>

            <p className="text-white/95 text-sm sm:text-base font-medium leading-relaxed max-w-xl mx-auto lg:mx-0">
              Whether you need a <strong>Standard / Basic Clean</strong>, a restorative <strong>Deep Clean</strong>, an inspection-guaranteed <strong>Move-Out / Move-In Clean</strong>, or an <strong>AirBnB Turnover</strong> — pick your package, see your instant price, and choose your preferred date below!
            </p>

            {/* Bright Pill Trust Badges */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 pt-1">
              <span className="px-3 py-1.5 rounded-xl bg-white/95 text-slate-900 text-xs font-black flex items-center gap-1.5 shadow-sm">
                <ShieldCheck className="w-4 h-4 text-teal-600" /> Insured &amp; Bonded Since 2012
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-white/95 text-slate-900 text-xs font-black flex items-center gap-1.5 shadow-sm">
                <Star className="w-4 h-4 text-amber-500 fill-amber-400" /> 5.0★ Rated Edmonton Crews
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-white/95 text-slate-900 text-xs font-black flex items-center gap-1.5 shadow-sm">
                <CheckCircle2 className="w-4 h-4 text-pink-600" /> 1, 2 &amp; 3-Cleaner Teams
              </span>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-3">
              <button
                type="button"
                onClick={() => bookingFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="px-6 py-3 rounded-2xl bg-amber-300 hover:bg-amber-200 text-slate-950 font-black text-sm flex items-center gap-2 shadow-xl transition-all active:scale-95 cursor-pointer"
              >
                <span>Start Your Booking Sheet Below</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href="https://tidyupscleaning.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-3 rounded-2xl bg-white/20 hover:bg-white/30 border-2 border-white/60 text-white font-black text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span>Explore Main Website (tidyupscleaning.com)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Right: Interactive Showcase of User's Uploaded 833 Tidyups Banners & Crew Photos */}
          <div className="lg:col-span-6">
            <div className="bg-white/95 p-3 rounded-3xl shadow-2xl border-4 border-amber-300 space-y-2.5">
              <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-[16/9] shadow-inner">
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
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-slate-950/75 hover:bg-slate-950 text-white flex items-center justify-center shadow-lg cursor-pointer"
                  aria-label="Previous company banner"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActiveBannerIdx((prev) => (prev + 1) % OFFICIAL_COMPANY_BANNERS.length)
                  }
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-slate-950/75 hover:bg-slate-950 text-white flex items-center justify-center shadow-lg cursor-pointer"
                  aria-label="Next company banner"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Thumbnail Strip of All 4 Official Banners */}
              <div className="grid grid-cols-4 gap-2">
                {OFFICIAL_COMPANY_BANNERS.map((b, idx) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setActiveBannerIdx(idx)}
                    className={`rounded-xl overflow-hidden border-2 aspect-[16/9] cursor-pointer transition-all ${
                      activeBannerIdx === idx
                        ? 'border-pink-600 ring-2 ring-pink-400 scale-[1.02]'
                        : 'border-slate-200 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <img src={b.src} alt={b.title} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between px-1 text-[11px] font-extrabold text-slate-700">
                <span>{OFFICIAL_COMPANY_BANNERS[activeBannerIdx].title}</span>
                <span className="text-pink-600 font-mono">1-833-TIDYUPS</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          3. 1-PAGE INTERACTIVE CUSTOMER BOOKING SHEET & INSTANT PRICE ESTIMATOR
         ───────────────────────────────────────────────────────────────────────────── */}
      <section ref={bookingFormRef} className="max-w-7xl mx-auto py-8 sm:py-10 px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Step 1: Bright Cleaning Service Selector Cards */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-gradient-to-r from-pink-500 to-cyan-500 text-white text-[11px] font-black uppercase tracking-wider">
                Step 1 of 3 • Pick Your Cleaning Service
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                What Type of Cleaning Can We Help You With?
              </h2>
            </div>
            <span className="text-xs font-extrabold text-teal-800 bg-teal-100 border border-teal-300 px-3 py-1.5 rounded-xl">
              ✨ All Supplies, HEPA Vacuums &amp; Eco-Safe Products Included!
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {CLEANING_SERVICES.map((s) => {
              const IconComp = s.icon;
              const isSelected = selectedService === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedService(s.id)}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    isSelected
                      ? `bg-gradient-to-b ${s.lightBg} ${s.borderActive} ring-4 shadow-lg scale-[1.01]`
                      : 'bg-white border-slate-200 hover:border-cyan-400 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-xs ${
                        isSelected
                          ? `bg-gradient-to-br ${s.accentGradient} text-white`
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      <IconComp className="w-4 h-4" />
                    </div>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        isSelected ? 'bg-amber-300 text-slate-950' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      From {s.startingPrice}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-black text-xs sm:text-sm text-slate-900 leading-snug">
                      {s.shortName}
                    </h3>
                    <span className="text-[10px] font-bold text-pink-600 block mt-0.5">
                      {s.badge}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Split Grid: Left = Booking Sheet Form (Cols 1-7) | Right = Live Estimate, Checklist & Photos (Cols 8-12) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: THE 1-PAGE CUSTOMER BOOKING SHEET */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-3xl border-4 border-cyan-400 shadow-xl p-5 sm:p-7 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-pink-500 via-amber-400 to-cyan-500" />

              {formSubmitted ? (
                <div className="py-8 text-center space-y-5 animate-fadeIn">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center mx-auto shadow-lg">
                    <CheckCircle2 className="w-11 h-11" />
                  </div>
                  <div className="space-y-1.5">
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase">
                      ✓ Booking Confirmed &amp; Sent to 833 TidyUps Dispatch
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                      Thank You, {customerName}!
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                      Your cleaning request and instant estimate have been received by our Edmonton team. We will text/call you at{' '}
                      <strong className="text-slate-900">{customerPhone}</strong> to confirm your arrival window.
                    </p>
                  </div>

                  <div className="p-5 bg-gradient-to-br from-cyan-50 via-white to-pink-50 rounded-2xl border-2 border-cyan-300 max-w-md mx-auto text-left text-xs space-y-2 shadow-xs">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="text-slate-500 font-bold">Booking Reference:</span>
                      <span className="font-black font-mono text-pink-600 text-sm">
                        #{confirmedBookingId} ({confirmedQuoteNumber})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">Selected Package:</span>
                      <span className="font-black text-slate-900 text-right">{priceCalculation.matchedItemName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">Property Address:</span>
                      <span className="font-bold text-slate-800 text-right">{address}, {city}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">Preferred Date &amp; Time:</span>
                      <span className="font-black text-teal-700 text-right">
                        {formattedPreferredDateLabel} • {preferredTime}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-200 text-sm">
                      <span className="font-black text-slate-900">Estimated Total (incl. GST):</span>
                      <span className="font-black font-mono text-emerald-700 text-base">
                        ${priceCalculation.total.toFixed(2)} CAD
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 flex flex-wrap gap-3 justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        setFormSubmitted(false);
                        setCustomerName('');
                        setCustomerPhone('');
                        setAddress('');
                      }}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-cyan-600 text-white text-xs font-black hover:opacity-95 transition-all cursor-pointer shadow-md"
                    >
                      Book Another Cleaning
                    </button>
                    <a
                      href="https://tidyupscleaning.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-2.5 rounded-xl border-2 border-cyan-500 text-cyan-900 text-xs font-black hover:bg-cyan-50 transition-colors flex items-center gap-1.5"
                    >
                      <span>Return to tidyupscleaning.com</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleBookingSubmit} className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                    <div>
                      <span className="text-[11px] font-black text-pink-600 uppercase tracking-wider block">
                        Step 2 of 3 • Complete Your Customer Booking Sheet
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                        {activeServiceData.name}
                      </h3>
                    </div>
                    <div className="text-right bg-gradient-to-r from-amber-100 to-yellow-100 border-2 border-amber-400 px-3.5 py-1.5 rounded-2xl">
                      <span className="text-[10px] font-black uppercase text-amber-900 block">
                        Instant Estimate (+GST)
                      </span>
                      <span className="text-xl sm:text-2xl font-black font-mono text-slate-950">
                        ${priceCalculation.total.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Optional Quick Voice Fill Bar for Customers Who Prefer Speaking Their Details */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-50 via-pink-50 to-amber-50 border-2 border-pink-300 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <Mic className="w-4 h-4 text-pink-600" />
                        <span>Want to Fill This Form by Voice? Speak Your Info!</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleToggleFormMic}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs transition-all ${
                            isRecordingFormVoice
                              ? 'bg-rose-600 text-white animate-pulse'
                              : 'bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:opacity-95'
                          }`}
                        >
                          {isRecordingFormVoice ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                          <span>{isRecordingFormVoice ? 'Stop & Fill' : '🎙️ Speak Details'}</span>
                        </button>
                        <button
                          type="button"
                          disabled={isParsingFormVoice || !dictationText.trim()}
                          onClick={() => handleParseDictationIntoBlanks(dictationText)}
                          className="px-2.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white text-xs font-black flex items-center gap-1 cursor-pointer"
                        >
                          <Wand2 className="w-3.5 h-3.5" />
                          <span>Fill Form</span>
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={dictationText}
                      onChange={(e) => setDictationText(e.target.value)}
                      placeholder='Or type/speak here: e.g. "Sarah Jenkins, 780-555-0199, 10420 98 Ave NW Edmonton, 3 bedrooms 2 bathrooms, Friday morning"'
                      className="w-full px-3 py-2 bg-white border border-pink-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-pink-600"
                    />
                    {voiceFillStatus && (
                      <p className="text-[11px] font-black text-teal-800">{voiceFillStatus}</p>
                    )}
                  </div>

                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-800 text-xs font-bold">
                      {errorMessage}
                    </div>
                  )}

                  {/* Home Size, Bathrooms & Cleaner Crew Size */}
                  <div className="p-4 rounded-2xl bg-cyan-50/70 border-2 border-cyan-200 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-black text-slate-800 mb-1">
                          How Many Bedrooms? *
                        </label>
                        <select
                          value={bedrooms}
                          onChange={(e) => setBedrooms(e.target.value)}
                          className="w-full px-3 py-2.5 bg-white border-2 border-cyan-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-pink-500"
                        >
                          <option value="1 Bedroom">1 Bedroom / Condo</option>
                          <option value="2 Bedrooms">2 Bedrooms</option>
                          <option value="3 Bedrooms">3 Bedrooms</option>
                          <option value="4 Bedrooms">4 Bedrooms</option>
                          <option value="5 Bedrooms">5 Bedrooms</option>
                          <option value="6 Bedrooms">6+ Bedrooms</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-black text-slate-800 mb-1">
                          How Many Bathrooms? *
                        </label>
                        <select
                          value={bathrooms}
                          onChange={(e) => setBathrooms(e.target.value)}
                          className="w-full px-3 py-2.5 bg-white border-2 border-cyan-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-pink-500"
                        >
                          <option value="1 Bathroom">1 Bathroom</option>
                          <option value="2 Bathrooms">2 Bathrooms</option>
                          <option value="3 Bathrooms">3 Bathrooms</option>
                          <option value="4 Bathrooms">4+ Bathrooms</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-black text-slate-800 mb-1">
                          How Often? (Save up to 15%)
                        </label>
                        <select
                          value={frequency}
                          onChange={(e) => setFrequency(e.target.value as any)}
                          className="w-full px-3 py-2.5 bg-white border-2 border-cyan-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-pink-500"
                        >
                          <option value="One-Time">One-Time Cleaning</option>
                          <option value="Weekly (15% Off)">Weekly (Save 15%)</option>
                          <option value="Bi-Weekly (10% Off)">Bi-Weekly (Save 10%)</option>
                          <option value="Monthly (5% Off)">Monthly (Save 5%)</option>
                        </select>
                      </div>
                    </div>

                    {/* 1, 2, or 3 Cleaners Selector */}
                    <div>
                      <label className="block text-xs font-black text-slate-800 mb-1.5 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-pink-600" />
                        <span>Preferred Crew Size (Synced with Our Official Price List):</span>
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {([1, 2, 3] as const).map((cnt) => (
                          <button
                            key={cnt}
                            type="button"
                            onClick={() => setCleanerCount(cnt)}
                            className={`py-2 px-3 rounded-xl border-2 text-xs font-black transition-all cursor-pointer ${
                              cleanerCount === cnt
                                ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white border-pink-600 shadow-sm'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-pink-400'
                            }`}
                          >
                            {cnt === 1
                              ? '👤 1 Pro Cleaner'
                              : cnt === 2
                              ? '👥 2 Cleaners (Faster!)'
                              : '👩‍👩‍👧 3 Cleaners (Express!)'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Optional Add-ons */}
                  <div>
                    <label className="block text-xs font-black text-slate-800 mb-2 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-pink-600" />
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
                                ? 'bg-pink-50 border-pink-500 text-pink-950 font-black shadow-2xs'
                                : 'bg-slate-50 border-slate-200 text-slate-700 font-bold hover:border-cyan-400'
                            }`}
                          >
                            <span className="truncate">
                              {addon.icon} {addon.label}
                            </span>
                            <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-white border border-slate-200 shrink-0">
                              +${addon.price}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Interactive Preferred Date Pop-Up Calendar Picker & Time Window */}
                  <div className="p-4 rounded-2xl bg-amber-50/80 border-2 border-amber-300 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div ref={datePickerContainerRef} className="relative">
                        <label className="block text-xs font-black text-slate-900 mb-1 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-pink-600" />
                          <span>Preferred Cleaning Date (Click Calendar) *</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsCalendarPopupOpen((o) => !o)}
                          className="w-full px-3.5 py-2.5 bg-white border-2 border-amber-400 hover:border-pink-500 rounded-xl text-xs font-black text-slate-900 flex items-center justify-between shadow-2xs cursor-pointer"
                        >
                          <span>📅 {formattedPreferredDateLabel}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-pink-100 text-pink-800 font-extrabold">
                            Pick Date ▾
                          </span>
                        </button>

                        {/* Pop-Up Month Calendar */}
                        {isCalendarPopupOpen && (
                          <div className="absolute left-0 top-full mt-2 z-40 w-72 sm:w-80 rounded-2xl bg-white border-4 border-cyan-400 shadow-2xl p-3.5 space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setCalendarMonthDate(
                                    new Date(calendarMonthDate.getFullYear(), calendarMonthDate.getMonth() - 1, 1)
                                  )
                                }
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-black cursor-pointer"
                              >
                                ◀
                              </button>
                              <span className="text-xs font-black text-slate-900">
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
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-black cursor-pointer"
                              >
                                ▶
                              </button>
                            </div>

                            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-slate-500">
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
                                      setIsCalendarPopupOpen(false);
                                    }}
                                    className={`py-1.5 rounded-lg text-xs font-black cursor-pointer transition-all ${
                                      isSelected
                                        ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-sm'
                                        : 'hover:bg-cyan-100 text-slate-800'
                                    }`}
                                  >
                                    {cell.day}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-black text-slate-900 mb-1 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-teal-600" />
                          <span>Preferred Arrival Window *</span>
                        </label>
                        <select
                          value={preferredTime}
                          onChange={(e) => setPreferredTime(e.target.value)}
                          className="w-full px-3 py-2.5 bg-white border-2 border-amber-400 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-pink-500"
                        >
                          <option value="Morning (8:00 AM - 12:00 PM)">☀️ Morning (8:00 AM - 12:00 PM)</option>
                          <option value="Afternoon (12:00 PM - 4:00 PM)">🌤️ Afternoon (12:00 PM - 4:00 PM)</option>
                          <option value="Evening (4:00 PM - 7:00 PM)">🌙 Evening (4:00 PM - 7:00 PM)</option>
                          <option value="Flexible / Earliest Available">⚡ Flexible / Earliest Available</option>
                        </select>
                      </div>
                    </div>

                    {/* 1-Click Quick Day Pills */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-black uppercase text-amber-900 mr-1">
                        Quick Pick Day:
                      </span>
                      {quickDatePills.map((p) => (
                        <button
                          key={p.iso}
                          type="button"
                          onClick={() => setPreferredDate(p.iso)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-black cursor-pointer transition-all ${
                            preferredDate === p.iso
                              ? 'bg-pink-600 text-white shadow-2xs'
                              : 'bg-white hover:bg-pink-50 text-slate-800 border border-amber-300'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Customer Contact & Property Address */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black text-slate-800 mb-1">
                        Your Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Sarah Jenkins"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-800 mb-1">
                        Best Phone Number (For Confirmation) *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="(780) 555-0199"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-pink-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black text-slate-800 mb-1">
                        Email Address (For Receipt &amp; Quote)
                      </label>
                      <input
                        type="email"
                        placeholder="sarah@example.com"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-800 mb-1">
                        How Did You Hear About Us?
                      </label>
                      <select
                        value={heardAbout}
                        onChange={(e) => setHeardAbout(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-pink-500"
                      >
                        <option value="Website (tidyupscleaning.com)">🌐 tidyupscleaning.com Website</option>
                        <option value="Facebook / Instagram Ad">🔵 Facebook / Instagram</option>
                        <option value="Google Search / Ad">🟢 Google Search / Google Maps</option>
                        <option value="Friend / Family Referral">💛 Friend / Realtor Referral</option>
                        <option value="Returning TidyUps Client">⭐ Returning TidyUps Customer</option>
                      </select>
                    </div>
                  </div>

                  {/* Property Street Address */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-8">
                      <label className="block text-xs font-black text-slate-800 mb-1">
                        Property Street Address *
                      </label>
                      <AddressAutocompleteInput
                        value={address}
                        onChange={setAddress}
                        onSelect={(pred) => {
                          setAddress(pred.description || pred.mainText);
                        }}
                        placeholder="Start typing your Edmonton & area street address..."
                        className="text-xs"
                        required
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <label className="block text-xs font-black text-slate-800 mb-1">
                        City / Community
                      </label>
                      <select
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-pink-500"
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

                  {/* Special Instructions */}
                  <div>
                    <label className="block text-xs font-black text-slate-800 mb-1">
                      Special Notes, Pets, Parking or Lockbox / Entry Instructions
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Friendly dog in backyard, key in lockbox #1234, please focus on master bathroom shower glass..."
                      value={specialInstructions}
                      onChange={(e) => setSpecialInstructions(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border-2 border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-pink-600 via-fuchsia-600 to-cyan-600 hover:opacity-95 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>Submitting Your Cleaning Booking...</span>
                    ) : (
                      <>
                        <span>
                          Confirm &amp; Request Booking — ${priceCalculation.total.toFixed(2)} CAD
                        </span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-center font-bold text-slate-500">
                    🔒 No upfront card charge today • $50 deposit holds your spot after we confirm your time window!
                  </p>
                </form>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: LIVE INSTANT PRICE SUMMARY + PACKAGE CHECKLIST + GUARANTEE */}
          <div className="lg:col-span-5 space-y-6">
            {/* Instant Price Summary Card */}
            <div className="bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white rounded-3xl border-4 border-amber-400 shadow-xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/15 pb-3">
                <div className="flex items-center gap-2.5">
                  <img
                    src={OFFICIAL_LOGO_URL}
                    alt="833 Tidyups"
                    className="w-11 h-11 object-contain"
                  />
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 block">
                      Step 3 of 3 • Official Price Breakdown
                    </span>
                    <h3 className="text-base font-black text-white">
                      Your InstantTidyUps Estimate
                    </h3>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-cyan-400 text-slate-950 text-[10px] font-black uppercase">
                  {frequency}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="font-black text-amber-300">{priceCalculation.matchedItemName}</div>
                    <div className="text-[11px] text-slate-300">
                      {bedrooms} • {bathrooms} • {priceCalculation.hoursLabel}
                    </div>
                  </div>
                  <span className="font-mono font-black text-white text-sm">
                    ${priceCalculation.discountedBase.toFixed(2)}
                  </span>
                </div>

                {selectedAddons.length > 0 && (
                  <div className="pt-2 border-t border-white/10 space-y-1">
                    <span className="text-[10px] font-black uppercase text-cyan-300 block">
                      Selected Add-Ons:
                    </span>
                    {selectedAddons.map((id) => {
                      const addon = ADDON_OPTIONS.find((a) => a.id === id);
                      if (!addon) return null;
                      return (
                        <div key={id} className="flex justify-between text-xs text-slate-200">
                          <span>
                            {addon.icon} {addon.label}
                          </span>
                          <span className="font-mono font-bold">+${addon.price.toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="pt-3 border-t border-white/15 space-y-1">
                  <div className="flex justify-between text-slate-300">
                    <span>Subtotal:</span>
                    <span className="font-mono font-bold">${priceCalculation.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Alberta GST (5%):</span>
                    <span className="font-mono font-bold">${priceCalculation.gst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-white/20 text-base font-black text-amber-300">
                    <span>Estimated Total (CAD):</span>
                    <span className="font-mono text-2xl">${priceCalculation.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Package Checklist Card */}
            <div className="bg-white rounded-3xl border-2 border-pink-300 shadow-md p-6 space-y-4">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-700 text-[10px] font-black uppercase">
                    {activeServiceData.badge}
                  </span>
                  <h4 className="text-lg font-black text-slate-900 mt-1">
                    What&apos;s Included in {activeServiceData.shortName}
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">{activeServiceData.tagline}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {activeServiceData.checklist.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-800 font-medium">
                    <div className="w-4 h-4 rounded-full bg-teal-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 24-Hour Satisfaction Guarantee & Direct Contact Card */}
            <div className="bg-gradient-to-r from-amber-300 via-yellow-200 to-cyan-200 rounded-3xl border-2 border-amber-400 p-5 space-y-3 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-950 text-amber-300 flex items-center justify-center shrink-0 shadow-md">
                  <HeartHandshake className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-950">
                    The 833 TidyUps 24-Hour Clean Guarantee
                  </h4>
                  <p className="text-xs font-bold text-slate-800 leading-snug">
                    If you or your landlord spot any missed item on your checklist within 24 hours, our crew returns and re-cleans it free of charge!
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t border-amber-400/60 flex flex-wrap items-center justify-between gap-2 text-xs font-black text-slate-900">
                <span>Questions? Call our Edmonton office:</span>
                <div className="flex items-center gap-2">
                  <a href="tel:18338439877" className="underline hover:text-pink-700 font-mono">
                    833-843-9877
                  </a>
                  <span>•</span>
                  <a href="tel:7807185092" className="underline hover:text-pink-700 font-mono">
                    780-718-5092
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────────────
          4. CUSTOMER-ONLY FOOTER (STRICTLY PUBLIC — LINKS TO MAIN WEBSITE & PHONES)
         ───────────────────────────────────────────────────────────────────────────── */}
      <footer className="bg-slate-950 text-slate-300 border-t-4 border-pink-500 py-8 px-4 sm:px-6 lg:px-8 mt-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <img
              src={OFFICIAL_LOGO_URL}
              alt="833 Tidyups Logo"
              className="w-10 h-10 object-contain"
            />
            <div>
              <p className="font-black text-white">
                833 TidyUps Cleaning Service Inc. • Established 2012
              </p>
              <p className="text-[11px] text-slate-400">
                Serving Edmonton, St. Albert, Sherwood Park, Spruce Grove, Leduc &amp; Beaumont
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 font-bold">
            <a
              href="https://tidyupscleaning.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              <span>Main Website: tidyupscleaning.com</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a href="tel:18338439877" className="text-pink-400 hover:text-pink-300 font-mono">
              1-833-TIDYUPS (833-843-9877)
            </a>
            <a href="tel:7807185092" className="text-amber-300 hover:text-amber-200 font-mono">
              (780) 718-5092
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
