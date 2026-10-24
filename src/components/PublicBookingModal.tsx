import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { triggerGoogleAdsConversion } from './CookieConsentBanner';
import {
  CheckCircle2,
  Sparkles,
  Calendar,
  Clock,
  User,
  Mail,
  Home,
  ShieldCheck,
  ArrowRight,
  X,
  ExternalLink,
  Copy,
  Check,
  Calculator,
  Lock,
  Mic,
  MicOff,
  Wand2,
  Users,
  Volume2,
} from 'lucide-react';
import { ServiceTicket } from '../types/dispatch';
import { AddressAutocompleteInput } from './AddressAutocompleteInput';
import { TidyUpsBunnyLogo } from './TidyUpsBunnyLogo';

export interface PublicBookingModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onBookingCreated?: (ticket: ServiceTicket, fullPayload?: any) => void;
  mode?: 'MODAL' | 'STANDALONE_PAGE';
  onSwitchToCalculatorMode?: () => void;
  onOpenStaffLogin?: () => void;
  isOwnerViewing?: boolean;
}

const THREE_BOOKING_OPTIONS = [
  {
    id: 'Move-Out Cleaning' as const,
    shortLabel: 'Move-Out',
    title: 'Move-Out Cleaning',
    badge: 'Min 3 Hrs (2 Cleaners) or 6 Hrs (1 Cleaner)',
    ruleSummary: '2 Cleaners: 3 hrs min ($105/hr) • 1 Cleaner: Starts at 6 hrs ($52.50/hr)',
    description:
      'Complete empty-home or condo turnover: inside oven, inside fridge, inside all cabinets & drawers, baseboards, bathrooms, and floors.',
  },
  {
    id: 'Basic Cleaning' as const,
    shortLabel: 'Basic',
    title: 'Basic Cleaning',
    badge: '1 Pro Cleaner ($52.50/hr)',
    ruleSummary: '1 Dedicated Cleaner • Standard Residential Maintenance',
    description:
      'Essential residential refresh with 1 professional cleaner: kitchen counters & exterior appliances, bathrooms sanitized, dusting, HEPA vacuuming & mopping.',
  },
  {
    id: 'Deep Cleaning' as const,
    shortLabel: 'Deep',
    title: 'Deep Cleaning',
    badge: 'Min 2 Cleaners for 2 Hrs ($105/hr)',
    ruleSummary: 'Minimum 2 Cleaners for 2+ Hours • Top-to-Bottom Detail Scrub',
    description:
      'Intensive 2-cleaner team scrub: hand-wiped baseboards, doors, frames, light switches, heavy kitchen degreasing, and bathroom tile & grout scrub.',
  },
] as const;

type HighlightFieldKey =
  | 'serviceType'
  | 'firstName'
  | 'lastName'
  | 'phone'
  | 'email'
  | 'address'
  | 'city'
  | 'bedrooms'
  | 'bathrooms'
  | 'cleanerCount'
  | 'preferredDate'
  | 'preferredTime'
  | 'specialInstructions';

export const PublicBookingModal: React.FC<PublicBookingModalProps> = ({
  isOpen,
  onClose,
  onBookingCreated,
  mode = 'MODAL',
  onSwitchToCalculatorMode,
  onOpenStaffLogin,
  isOwnerViewing = false,
}) => {
  const [step, setStep] = useState<'FORM' | 'SUCCESS'>('FORM');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdSummary, setCreatedSummary] = useState<any>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // 3 Simple Options: Move-Out, Basic, Deep
  const [serviceType, setServiceType] = useState<
    'Move-Out Cleaning' | 'Basic Cleaning' | 'Deep Cleaning'
  >('Move-Out Cleaning');

  // Split Customer Name: First Name + Last Name
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Edmonton');
  const [postalCode, setPostalCode] = useState('');
  const [bedrooms, setBedrooms] = useState('3 Bedrooms');
  const [bathrooms, setBathrooms] = useState('2 Bathrooms');
  const [cleanerCount, setCleanerCount] = useState<1 | 2>(2);
  const [preferredDate, setPreferredDate] = useState(() => {
    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    return tmrw.toISOString().slice(0, 10);
  });
  const [preferredTime, setPreferredTime] = useState('Morning (8:00 AM - 12:00 PM)');
  const [heardAbout, setHeardAbout] = useState('Website (tidyupscleaning.com)');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Continuous Voice Dictation & Box Lighting State (Never shuts off on pause until Stop is clicked)
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isParsingVoice, setIsParsingVoice] = useState(false);
  const [voiceStatusMsg, setVoiceStatusMsg] = useState<string | null>(null);
  const [flashingFields, setFlashingFields] = useState<Record<string, boolean>>({});
  const [voiceCapturedFields, setVoiceCapturedFields] = useState<Record<string, boolean>>({});

  const recognitionRef = useRef<any>(null);
  const shouldKeepRecordingRef = useRef<boolean>(false);
  const latestTranscriptRef = useRef<string>('');
  const latestInterimRef = useRef<string>('');

  // Enforce strict Cleaner Crew rules whenever Service Type changes:
  // - Basic Cleaning: 1 Cleaner only
  // - Deep Cleaning: Minimum 2 Cleaners (2 hrs min)
  // - Move-Out Cleaning: Default 2 Cleaners (min 3 hrs) or allow 1 Cleaner (starts at 6 hrs)
  useEffect(() => {
    if (serviceType === 'Basic Cleaning') {
      setCleanerCount(1);
    } else if (serviceType === 'Deep Cleaning') {
      setCleanerCount(2);
    } else if (serviceType === 'Move-Out Cleaning') {
      setCleanerCount((prev) => (prev === 1 ? 1 : 2));
    }
  }, [serviceType]);

  // Stop recognition on unmount
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

  const triggerFieldHighlight = useCallback((fieldKey: HighlightFieldKey) => {
    setFlashingFields((prev) => ({ ...prev, [fieldKey]: true }));
    setVoiceCapturedFields((prev) => ({ ...prev, [fieldKey]: true }));
    setTimeout(() => {
      setFlashingFields((prev) => ({ ...prev, [fieldKey]: false }));
    }, 2600);
  }, []);

  // Real-time live speech extraction as user speaks so boxes light up immediately
  const applyLiveSpeechExtraction = useCallback(
    (rawText: string) => {
      const text = rawText.trim();
      if (!text) return;
      const lower = text.toLowerCase();

      // 1. Service Type
      if (lower.includes('move out') || lower.includes('move-out') || lower.includes('moving out')) {
        setServiceType('Move-Out Cleaning');
        triggerFieldHighlight('serviceType');
      } else if (lower.includes('deep clean') || lower.includes('deep')) {
        setServiceType('Deep Cleaning');
        setCleanerCount(2);
        triggerFieldHighlight('serviceType');
        triggerFieldHighlight('cleanerCount');
      } else if (lower.includes('basic') || lower.includes('standard') || lower.includes('regular')) {
        setServiceType('Basic Cleaning');
        setCleanerCount(1);
        triggerFieldHighlight('serviceType');
        triggerFieldHighlight('cleanerCount');
      }

      // 2. Cleaner Crew count (if Move-Out)
      if (lower.includes('one cleaner') || lower.includes('1 cleaner') || lower.includes('single cleaner')) {
        if (serviceType !== 'Deep Cleaning') {
          setCleanerCount(1);
          triggerFieldHighlight('cleanerCount');
        }
      } else if (lower.includes('two cleaner') || lower.includes('2 cleaner')) {
        if (serviceType !== 'Basic Cleaning') {
          setCleanerCount(2);
          triggerFieldHighlight('cleanerCount');
        }
      }

      // 3. Phone Number
      const phoneMatch = text.match(/(?:\+?1[-.\s]?)?\(?([2-9]\d{2})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})/);
      if (phoneMatch) {
        const formattedPhone = `(${phoneMatch[1]}) ${phoneMatch[2]}-${phoneMatch[3]}`;
        setPhone(formattedPhone);
        triggerFieldHighlight('phone');
      }

      // 4. Email
      const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (emailMatch) {
        setEmail(emailMatch[1].toLowerCase());
        triggerFieldHighlight('email');
      }

      // 5. First Name & Last Name
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

      // 8. Preferred Time Window
      if (lower.includes('morning')) {
        setPreferredTime('Morning (8:00 AM - 12:00 PM)');
        triggerFieldHighlight('preferredTime');
      } else if (lower.includes('afternoon')) {
        setPreferredTime('Afternoon (12:00 PM - 4:00 PM)');
        triggerFieldHighlight('preferredTime');
      }
    },
    [serviceType, triggerFieldHighlight]
  );

  const handleServerVoiceParse = useCallback(
    async (transcriptToParse: string) => {
      const clean = transcriptToParse.trim();
      if (!clean) return;
      setIsParsingVoice(true);
      applyLiveSpeechExtraction(clean);
      try {
        const res = await fetch('/api/dispatch/parse-voice-ticket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript: clean }),
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
            setPhone(data.phone);
            triggerFieldHighlight('phone');
          }
          if (data.email) {
            setEmail(data.email);
            triggerFieldHighlight('email');
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
            setSpecialInstructions(clean);
            triggerFieldHighlight('specialInstructions');
          }

          const cat = String(data.serviceCategory || '').toLowerCase();
          if (cat.includes('move')) {
            setServiceType('Move-Out Cleaning');
            triggerFieldHighlight('serviceType');
          } else if (cat.includes('deep')) {
            setServiceType('Deep Cleaning');
            setCleanerCount(2);
            triggerFieldHighlight('serviceType');
            triggerFieldHighlight('cleanerCount');
          } else if (cat.includes('basic') || cat.includes('standard')) {
            setServiceType('Basic Cleaning');
            setCleanerCount(1);
            triggerFieldHighlight('serviceType');
            triggerFieldHighlight('cleanerCount');
          }
          setVoiceStatusMsg('✓ All spoken details matched & lit up in the boxes below!');
        }
      } catch {
        setVoiceStatusMsg('✓ Live voice details applied to form boxes!');
      } finally {
        setIsParsingVoice(false);
      }
    },
    [applyLiveSpeechExtraction, triggerFieldHighlight]
  );

  // Continuous Microphone Toggle — Never shuts off on pause until user clicks Stop
  const handleToggleContinuousMic = () => {
    if (isRecordingVoice) {
      shouldKeepRecordingRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsRecordingVoice(false);
      const fullFinal = `${latestTranscriptRef.current || voiceTranscript} ${
        latestInterimRef.current || interimTranscript
      }`.trim();
      if (fullFinal) {
        latestTranscriptRef.current = fullFinal;
        latestInterimRef.current = '';
        setVoiceTranscript(fullFinal);
        setInterimTranscript('');
        handleServerVoiceParse(fullFinal);
      }
      return;
    }

    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setVoiceStatusMsg(
        'Microphone API not detected in this browser — type or paste below and click "Light Up Boxes".'
      );
      return;
    }

    try {
      shouldKeepRecordingRef.current = true;
      latestTranscriptRef.current = voiceTranscript;
      latestInterimRef.current = '';

      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;
      recognition.lang = 'en-CA';

      recognition.onstart = () => {
        setIsRecordingVoice(true);
        setVoiceStatusMsg(
          '🎙️ Continuous Mic Active (Will NOT shut off when you pause!) — Speak First & Last Name, Phone, Address, Bedrooms, Bathrooms & Date...'
        );
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
        const prevBase = latestTranscriptRef.current;
        const updated = finalChunk ? `${prevBase} ${finalChunk}`.trim() : prevBase;
        latestTranscriptRef.current = updated;
        latestInterimRef.current = interimChunk;

        const combinedStream = `${updated} ${interimChunk}`.trim();
        if (combinedStream) {
          applyLiveSpeechExtraction(combinedStream);
        }
        setVoiceTranscript(updated);
        setInterimTranscript(interimChunk);
      };

      recognition.onerror = (ev: any) => {
        if (ev?.error === 'not-allowed' || ev?.error === 'service-not-allowed') {
          shouldKeepRecordingRef.current = false;
          setIsRecordingVoice(false);
          setVoiceStatusMsg('Microphone permission was blocked by browser settings.');
        }
      };

      recognition.onend = () => {
        // Auto-restart immediately if user hasn't clicked Stop so pauses never cut off speech!
        if (shouldKeepRecordingRef.current) {
          try {
            recognition.start();
            return;
          } catch {}
        }
        setIsRecordingVoice(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      shouldKeepRecordingRef.current = false;
      setIsRecordingVoice(false);
    }
  };

  // Compute live crew & minimum hours summary based on owner's rules
  const crewRuleDetails = useMemo(() => {
    if (serviceType === 'Basic Cleaning') {
      return {
        cleaners: 1,
        minHours: 3,
        hourlyRate: 52.5,
        startingSubtotal: 157.5,
        badgeText: '1 Cleaner Only ($52.50/hr)',
        ruleExplanation: 'Basic Cleaning is performed by 1 dedicated cleaner.',
      };
    }
    if (serviceType === 'Deep Cleaning') {
      return {
        cleaners: 2,
        minHours: 2,
        hourlyRate: 105.0,
        startingSubtotal: 210.0,
        badgeText: 'Minimum 2 Cleaners for 2 Hrs ($105/hr = $210+)',
        ruleExplanation: 'Deep Cleaning requires a minimum of 2 cleaners for 2+ hours.',
      };
    }
    // Move-Out Cleaning
    if (cleanerCount === 1) {
      return {
        cleaners: 1,
        minHours: 6,
        hourlyRate: 52.5,
        startingSubtotal: 315.0,
        badgeText: '1 Cleaner • Starts at 6 Hours Minimum ($52.50/hr = $315+)',
        ruleExplanation: 'Move-Out Cleaning with 1 cleaner starts at a 6-hour minimum.',
      };
    }
    return {
      cleaners: 2,
      minHours: 3,
      hourlyRate: 105.0,
      startingSubtotal: 315.0,
      badgeText: '2 Cleaners • Minimum 3 Hours ($105/hr = $315+)',
      ruleExplanation: 'Move-Out Cleaning with 2 cleaners has a 3-hour minimum.',
    };
  }, [serviceType, cleanerCount]);

  // Helper for glowing lit-up box styling (matches Voice Dictation Intake page)
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

  // Track required boxes status so user sees all boxes light up in a progress bar
  const requiredBoxesStatus = useMemo(() => {
    return [
      { key: 'serviceType', label: '1. Service Type', filled: Boolean(serviceType) },
      { key: 'firstName', label: '2. First Name', filled: Boolean(firstName.trim()) },
      { key: 'lastName', label: '3. Last Name', filled: Boolean(lastName.trim()) },
      { key: 'phone', label: '4. Mobile Phone', filled: Boolean(phone.trim()) },
      { key: 'address', label: '5. Street Address', filled: Boolean(address.trim()) },
      { key: 'bedrooms', label: '6. Bedrooms', filled: Boolean(bedrooms) },
      { key: 'bathrooms', label: '7. Bathrooms', filled: Boolean(bathrooms) },
      { key: 'preferredDate', label: '8. Preferred Date', filled: Boolean(preferredDate) },
    ];
  }, [serviceType, firstName, lastName, phone, address, bedrooms, bathrooms, preferredDate]);

  const filledRequiredCount = requiredBoxesStatus.filter((b) => b.filled).length;

  if (mode === 'MODAL' && !isOpen) return null;

  const handleCopyBookingUrl = (url: string, key: string) => {
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedUrl(key);
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  const fullNameCombined = `${firstName.trim()} ${lastName.trim()}`.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !address.trim()) {
      setErrorMsg('Please fill in your First Name, Last Name, Mobile Phone Number, and Street Address so every required box is lit up.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const bookingPayload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      customerName: fullNameCombined,
      customerPhone: phone.trim(),
      customerEmail: email.trim(),
      serviceType,
      cleanerCount: crewRuleDetails.cleaners,
      address: address.trim(),
      city,
      postalCode: postalCode.trim(),
      bedrooms,
      bathrooms,
      preferredDate: preferredDate || new Date().toISOString().slice(0, 10),
      preferredTime,
      heardAbout,
      specialInstructions: specialInstructions.trim(),
      bookingFormVariant: 'SIMPLE_3_OPTION',
    };

    try {
      const res = await fetch('/api/public/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingPayload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        try {
          const w = window as any;
          w.dataLayer = w.dataLayer || [];
          const estValue = Number(data?.quote?.total || crewRuleDetails.startingSubtotal || 1.0);
          w.dataLayer.push({
            event: 'generate_lead',
            lead_source: heardAbout || 'Online Booking Form',
            service_type: serviceType,
            cleaners_count: crewRuleDetails.cleaners,
            estimated_value: estValue,
            currency: 'CAD',
            quote_number: data?.quoteNumber || '',
          });
          triggerGoogleAdsConversion(estValue, 'CAD');
          sessionStorage.setItem(
            'tidyups_last_completed_booking',
            JSON.stringify({
              customerName: fullNameCombined,
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              customerPhone: phone.trim(),
              customerEmail: email.trim(),
              serviceType,
              hoursLabel: crewRuleDetails.badgeText,
              address: address.trim(),
              city,
              bedrooms,
              bathrooms,
              preferredDateLabel: preferredDate,
              preferredTime,
              totalAmount: estValue,
              bookingId: data?.jobberJobId || '',
              quoteNumber: data?.quoteNumber || '',
              submittedAt: new Date().toISOString(),
            })
          );
          if (mode === 'STANDALONE_PAGE') {
            window.history.pushState({}, '', '/thank-you');
          }
        } catch {
          // ignore dataLayer notice
        }
        setCreatedSummary(data);
        if (onBookingCreated && data.ticket) {
          onBookingCreated(data.ticket, data);
        }
        setStep('SUCCESS');
      } else {
        setErrorMsg(data.error || 'Unable to submit booking request. Please try again.');
      }
    } catch {
      setErrorMsg('Network connection error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep('FORM');
    setFirstName('');
    setLastName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setSpecialInstructions('');
    setVoiceCapturedFields({});
    if (mode === 'MODAL' && onClose) {
      onClose();
    }
  };

  const formCardContent = (
    <div
      className={`w-full ${
        mode === 'STANDALONE_PAGE' ? 'max-w-4xl mx-auto' : 'max-w-3xl'
      } bg-zinc-950 border-2 border-pink-500 rounded-3xl shadow-[0_0_50px_rgba(236,72,153,0.35)] overflow-hidden text-white font-sans ${
        mode === 'MODAL' ? 'max-h-[94vh] flex flex-col' : ''
      }`}
    >
      {/* Top Neon Accent Strip */}
      <div className="h-2 bg-gradient-to-r from-pink-500 via-red-600 to-pink-500" />

      {/* Top Header with TidyUps Bunny Mascot Logo & Black/Pink/Red Theme */}
      <div className="p-5 sm:p-6 border-b border-pink-500/40 bg-gradient-to-r from-black via-zinc-950 to-red-950/60 text-white flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <TidyUpsBunnyLogo size="lg" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-0.5 rounded-full bg-gradient-to-r from-pink-500 to-red-600 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                🐰 TidyUps Bunny Voice &amp; Online Booking
              </span>
              <span className="text-[11px] text-pink-300 font-mono font-bold">
                app.tidyupscleaning.com/booking
              </span>
            </div>
            <h2 className="font-black text-xl sm:text-2xl text-white mt-1 tracking-tight">
              TidyUps Cleaning — <span className="text-pink-400">Move-Out</span>, <span className="text-red-400">Basic</span> &amp; <span className="text-pink-400">Deep Clean</span>
            </h2>
            <p className="text-xs text-zinc-300 mt-0.5">
              Speak or type your details below — watch each box <strong className="text-emerald-400">light up</strong> as it fills in!
            </p>
          </div>
        </div>

        {mode === 'MODAL' && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-xl bg-zinc-900 border border-pink-500/40 text-zinc-300 hover:text-white hover:bg-red-600 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Form Body */}
      <div className={`p-5 sm:p-7 ${mode === 'MODAL' ? 'flex-1 overflow-y-auto' : ''} bg-black space-y-6`}>
        {step === 'FORM' ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* TidyUps Bunny Black & Pink Wrapped SUV Banner */}
            <div className="relative rounded-2xl overflow-hidden border-2 border-pink-500/60 shadow-lg bg-zinc-950">
              <img
                src="/assets/aistudio/39x14_ver_0001__1__d4ddd987.png"
                alt="TidyUps Cleaning Bunny Wrapped Fleet"
                className="w-full h-28 sm:h-36 object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent flex items-center px-4 sm:px-6">
                <div className="max-w-md space-y-1">
                  <span className="px-2.5 py-0.5 rounded-md bg-red-600 text-white text-[10px] font-black uppercase tracking-wider">
                    Edmonton &amp; Area • Vetted Teams
                  </span>
                  <p className="text-xs sm:text-sm font-black text-white drop-shadow">
                    All Supplies, Commercial HEPA Vacuums &amp; 24-Hour Clean Guarantee Included
                  </p>
                </div>
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────────
                CONTINUOUS VOICE DICTATION BAR (NEVER SHUTS OFF ON PAUSE)
               ───────────────────────────────────────────────────────────────── */}
            <div
              className={`p-4 sm:p-5 rounded-2xl border-2 transition-all ${
                isRecordingVoice
                  ? 'border-red-500 bg-gradient-to-r from-red-950/90 via-pink-950/80 to-black ring-4 ring-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.45)]'
                  : 'border-pink-500/80 bg-gradient-to-r from-zinc-950 via-pink-950/30 to-zinc-950'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                      isRecordingVoice
                        ? 'bg-red-600 text-white animate-pulse'
                        : 'bg-gradient-to-br from-pink-500 to-red-600 text-white'
                    }`}
                  >
                    {isRecordingVoice ? <Volume2 className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-black text-white">
                        🎙️ Continuous Voice Fill — Speak Your Details &amp; Watch the Boxes Light Up!
                      </span>
                      {isRecordingVoice && (
                        <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase animate-pulse">
                          ● Live Continuous Mic (Won&apos;t Stop on Pause)
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-pink-200/90 mt-0.5">
                      Click <strong>Start Voice Mic</strong> and speak naturally at your own pace. Pausing won&apos;t shut off the mic — click <strong>Stop Mic</strong> only when you&apos;re done!
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleToggleContinuousMic}
                    className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer shadow-lg transition-all ${
                      isRecordingVoice
                        ? 'bg-red-600 hover:bg-red-500 text-white ring-2 ring-white/50'
                        : 'bg-gradient-to-r from-pink-500 to-red-600 hover:from-pink-400 hover:to-red-500 text-white'
                    }`}
                  >
                    {isRecordingVoice ? (
                      <>
                        <MicOff className="w-4 h-4" />
                        <span>Stop Mic</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4" />
                        <span>Start Voice Mic</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={isParsingVoice || !voiceTranscript.trim()}
                    onClick={() => handleServerVoiceParse(voiceTranscript)}
                    className="px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-pink-600 disabled:opacity-40 border border-pink-500/50 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Wand2 className="w-3.5 h-3.5 text-pink-400" />
                    <span>{isParsingVoice ? 'Lighting Boxes...' : 'Light Up Boxes'}</span>
                  </button>
                </div>
              </div>

              <div className="mt-3">
                <input
                  type="text"
                  value={
                    interimTranscript
                      ? `${voiceTranscript} ${interimTranscript}`.trim()
                      : voiceTranscript
                  }
                  onChange={(e) => {
                    setVoiceTranscript(e.target.value);
                    latestTranscriptRef.current = e.target.value;
                    applyLiveSpeechExtraction(e.target.value);
                  }}
                  placeholder='Example: "My name is Sarah Jenkins, phone 780-555-0199, Move-Out Cleaning at 10420 98 Ave NW Edmonton, 3 bedrooms 2 bathrooms, 2 cleaners, tomorrow morning"'
                  className="w-full px-3.5 py-2.5 bg-black/90 border border-pink-500/50 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-pink-400"
                />
              </div>

              {voiceStatusMsg && (
                <p className="mt-2 text-[11px] font-black text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                  <span>{voiceStatusMsg}</span>
                </p>
              )}
            </div>

            {/* ─────────────────────────────────────────────────────────────────
                LIVE BOX LIGHTING PROGRESS BAR (Shows which boxes are filled in)
               ───────────────────────────────────────────────────────────────── */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-[11px] font-black uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-red-500" />
                  <span>Live Form Box Status — Boxes Light Up Green/Pink When Filled!</span>
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

            {errorMsg && (
              <div className="p-3.5 bg-red-950/90 border-2 border-red-500 rounded-2xl text-red-200 text-xs font-bold">
                {errorMsg}
              </div>
            )}

            {/* 1. Three Simple Options: Move-Out, Basic, Deep */}
            <div className={`p-4 sm:p-5 rounded-2xl border-2 ${getLitBoxClass('serviceType', Boolean(serviceType))}`}>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <label className="block text-xs font-black text-white uppercase tracking-wider">
                  1. Choose Your Cleaning Type (3 Options Only) *
                </label>
                {renderLitBadge('serviceType', Boolean(serviceType), true)}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {THREE_BOOKING_OPTIONS.map((opt) => {
                  const isSelected = serviceType === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setServiceType(opt.id);
                        triggerFieldHighlight('serviceType');
                      }}
                      className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                        isSelected
                          ? 'border-pink-500 bg-gradient-to-b from-pink-950/90 via-red-950/60 to-black text-white shadow-[0_0_20px_rgba(236,72,153,0.45)] ring-2 ring-pink-500/40 scale-[1.01]'
                          : 'border-zinc-800 bg-zinc-950/90 hover:border-pink-500/60 text-zinc-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-base font-black text-white">
                            {opt.shortLabel}
                          </span>
                          {isSelected ? (
                            <CheckCircle2 className="w-5 h-5 text-pink-400 shrink-0" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-zinc-700 shrink-0" />
                          )}
                        </div>
                        <div className="text-xs font-extrabold text-pink-400 mt-0.5">
                          {opt.title}
                        </div>
                        <span className="inline-block mt-1.5 px-2 py-0.5 rounded-md bg-red-600/25 border border-red-500/50 text-[10px] font-black text-red-300">
                          {opt.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-300 leading-relaxed mt-1">
                        {opt.description}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Cleaner Crew & Minimum Hours Rule Selector */}
              <div className="mt-4 pt-4 border-t border-zinc-800/80">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <span className="text-xs font-black text-pink-300 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-red-500" />
                    <span>Cleaner Crew &amp; Minimum Hours Rule ({serviceType}):</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase">
                    {crewRuleDetails.badgeText}
                  </span>
                </div>

                {serviceType === 'Basic Cleaning' && (
                  <div className="p-3 rounded-xl bg-zinc-950 border border-pink-500/50 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-black text-white">👤 1 Professional Cleaner ($52.50/hr)</span>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Basic Cleaning is scheduled with 1 dedicated TidyUps cleaner.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-black text-[11px]">
                      ✓ 1 Cleaner Active
                    </span>
                  </div>
                )}

                {serviceType === 'Deep Cleaning' && (
                  <div className="p-3 rounded-xl bg-zinc-950 border border-pink-500/50 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-black text-white">👥 2 Professional Cleaners — Minimum 2 Hours ($105.00/hr)</span>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Deep Cleaning requires a minimum of 2 cleaners for 2+ hours ($210.00+ base).
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-black text-[11px]">
                      ✓ 2 Cleaners (Min 2 Hrs)
                    </span>
                  </div>
                )}

                {serviceType === 'Move-Out Cleaning' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setCleanerCount(2);
                        triggerFieldHighlight('cleanerCount');
                      }}
                      className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                        cleanerCount === 2
                          ? 'border-pink-500 bg-pink-950/50 text-white shadow-md'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-pink-500/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-white">👥 2 Cleaners (Recommended)</span>
                        {cleanerCount === 2 && <CheckCircle2 className="w-4 h-4 text-pink-400" />}
                      </div>
                      <div className="text-[11px] font-bold text-pink-300 mt-0.5">
                        Minimum 3 Hours @ $105.00/hr ($315.00+)
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCleanerCount(1);
                        triggerFieldHighlight('cleanerCount');
                      }}
                      className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                        cleanerCount === 1
                          ? 'border-pink-500 bg-pink-950/50 text-white shadow-md'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-pink-500/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-white">👤 1 Cleaner (Solo Move-Out)</span>
                        {cleanerCount === 1 && <CheckCircle2 className="w-4 h-4 text-pink-400" />}
                      </div>
                      <div className="text-[11px] font-bold text-red-300 mt-0.5">
                        Starts at 6 Hours Minimum @ $52.50/hr ($315.00+)
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Split Customer Name (First Name + Last Name) & Contact Boxes */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-pink-500" />
                <span className="text-xs font-black text-white uppercase tracking-wider">
                  2. Your Name &amp; Contact Information (Each Box Lights Up When Filled)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* FIRST NAME BOX */}
                <div className={`p-3.5 rounded-2xl border-2 ${getLitBoxClass('firstName', Boolean(firstName.trim()))}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-black text-white">First Name *</label>
                    {renderLitBadge('firstName', Boolean(firstName.trim()), true)}
                  </div>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Sarah"
                    className="w-full px-3.5 py-2.5 bg-black/90 border border-zinc-700 rounded-xl text-xs font-bold text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500"
                  />
                </div>

                {/* LAST NAME BOX */}
                <div className={`p-3.5 rounded-2xl border-2 ${getLitBoxClass('lastName', Boolean(lastName.trim()))}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-black text-white">Last Name *</label>
                    {renderLitBadge('lastName', Boolean(lastName.trim()), true)}
                  </div>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Jenkins"
                    className="w-full px-3.5 py-2.5 bg-black/90 border border-zinc-700 rounded-xl text-xs font-bold text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500"
                  />
                </div>

                {/* MOBILE PHONE BOX */}
                <div className={`p-3.5 rounded-2xl border-2 ${getLitBoxClass('phone', Boolean(phone.trim()))}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-black text-white">Mobile Number (For Quote) *</label>
                    {renderLitBadge('phone', Boolean(phone.trim()), true)}
                  </div>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. (780) 555-0199"
                    className="w-full px-3.5 py-2.5 bg-black/90 border border-zinc-700 rounded-xl text-xs font-bold text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500"
                  />
                </div>

                {/* EMAIL BOX */}
                <div className={`p-3.5 rounded-2xl border-2 ${getLitBoxClass('email', Boolean(email.trim()))}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-black text-white">Email Address (For Official Quote)</label>
                    {renderLitBadge('email', Boolean(email.trim()), false)}
                  </div>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-pink-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="sarah@example.com"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-black/90 border border-zinc-700 rounded-xl text-xs font-bold text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Property Address, Home Size & Preferred Date */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-red-500" />
                <span className="text-xs font-black text-white uppercase tracking-wider">
                  3. Property Address, Home Size &amp; Preferred Date
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                {/* STREET ADDRESS BOX */}
                <div className={`sm:col-span-8 p-3.5 rounded-2xl border-2 ${getLitBoxClass('address', Boolean(address.trim()))}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-black text-white">
                      Property Street Address (Edmonton &amp; Area) *
                    </label>
                    {renderLitBadge('address', Boolean(address.trim()), true)}
                  </div>
                  <AddressAutocompleteInput
                    required
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
                  />
                </div>

                {/* CITY BOX */}
                <div className={`sm:col-span-4 p-3.5 rounded-2xl border-2 ${getLitBoxClass('city', Boolean(city))}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-black text-white">City / Community</label>
                    {renderLitBadge('city', Boolean(city), false)}
                  </div>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2.5 bg-black/90 border border-zinc-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-pink-500"
                  >
                    <option value="Edmonton">Edmonton</option>
                    <option value="St. Albert">St. Albert</option>
                    <option value="Sherwood Park">Sherwood Park</option>
                    <option value="Spruce Grove">Spruce Grove</option>
                    <option value="Leduc">Leduc</option>
                    <option value="Beaumont">Beaumont</option>
                    <option value="Fort Saskatchewan">Fort Saskatchewan</option>
                    <option value="Stony Plain">Stony Plain</option>
                  </select>
                </div>

                {/* BEDROOMS BOX */}
                <div className={`sm:col-span-6 p-3.5 rounded-2xl border-2 ${getLitBoxClass('bedrooms', Boolean(bedrooms))}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-black text-white">Bedrooms / Property Size *</label>
                    {renderLitBadge('bedrooms', Boolean(bedrooms), true)}
                  </div>
                  <select
                    value={bedrooms}
                    onChange={(e) => setBedrooms(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/90 border border-zinc-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-pink-500"
                  >
                    <option value="1 Bedroom">1 Bedroom / Condo / Apartment</option>
                    <option value="2 Bedrooms">2 Bedrooms</option>
                    <option value="3 Bedrooms">3 Bedrooms</option>
                    <option value="4 Bedrooms">4 Bedrooms</option>
                    <option value="5 Bedrooms">5 Bedrooms</option>
                    <option value="6 Bedrooms">6+ Bedrooms</option>
                  </select>
                </div>

                {/* BATHROOMS BOX */}
                <div className={`sm:col-span-6 p-3.5 rounded-2xl border-2 ${getLitBoxClass('bathrooms', Boolean(bathrooms))}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-black text-white">Bathrooms *</label>
                    {renderLitBadge('bathrooms', Boolean(bathrooms), true)}
                  </div>
                  <select
                    value={bathrooms}
                    onChange={(e) => setBathrooms(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/90 border border-zinc-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-pink-500"
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

                {/* PREFERRED DATE BOX */}
                <div className={`sm:col-span-6 p-3.5 rounded-2xl border-2 ${getLitBoxClass('preferredDate', Boolean(preferredDate))}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-black text-white flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-pink-400" />
                      <span>Preferred Cleaning Date *</span>
                    </label>
                    {renderLitBadge('preferredDate', Boolean(preferredDate), true)}
                  </div>
                  <input
                    type="date"
                    required
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/90 border border-zinc-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-pink-500"
                  />
                </div>

                {/* PREFERRED TIME WINDOW BOX */}
                <div className={`sm:col-span-6 p-3.5 rounded-2xl border-2 ${getLitBoxClass('preferredTime', Boolean(preferredTime))}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-black text-white flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-red-400" />
                      <span>Preferred Time Window *</span>
                    </label>
                    {renderLitBadge('preferredTime', Boolean(preferredTime), true)}
                  </div>
                  <select
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/90 border border-zinc-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-pink-500"
                  >
                    <option value="Morning (8:00 AM - 12:00 PM)">Morning (8:00 AM - 12:00 PM)</option>
                    <option value="Afternoon (12:00 PM - 4:00 PM)">Afternoon (12:00 PM - 4:00 PM)</option>
                    <option value="Flexible / Any Time">Flexible / Earliest Available</option>
                  </select>
                </div>

                {/* SPECIAL INSTRUCTIONS BOX */}
                <div
                  className={`sm:col-span-12 p-3.5 rounded-2xl border-2 ${getLitBoxClass(
                    'specialInstructions',
                    Boolean(specialInstructions.trim())
                  )}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-black text-white">
                      Tell Us About Your Home (Appliances, Basement, Pets, Lockbox, or Special Requests)
                    </label>
                    {renderLitBadge('specialInstructions', Boolean(specialInstructions.trim()), false)}
                  </div>
                  <textarea
                    rows={2}
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="e.g. Main floor + basement, inside oven & fridge needed, key in lockbox, or any specific areas you'd like us to quote & focus on..."
                    className="w-full px-3.5 py-2 bg-black/90 border border-zinc-700 rounded-xl text-xs font-medium text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="space-y-2.5 pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-6 bg-gradient-to-r from-pink-600 via-red-600 to-pink-600 hover:from-pink-500 hover:via-red-500 hover:to-pink-500 text-white rounded-2xl text-sm sm:text-base font-black shadow-[0_0_25px_rgba(236,72,153,0.5)] flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Submitting Your Booking &amp; Creating Jobber Quote...</span>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>
                      Submit {serviceType} ({crewRuleDetails.cleaners} Cleaner
                      {crewRuleDetails.cleaners > 1 ? 's' : ''}) Request
                    </span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
              <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-zinc-400 font-semibold">
                <span className="flex items-center gap-1 text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>No Upfront Card Charge Today</span>
                </span>
                <span>•</span>
                <span className="text-pink-300">24-Hour Clean Guarantee</span>
                <span>•</span>
                <a
                  href="mailto:booking@tidyupscleaning.com"
                  className="text-red-400 hover:underline font-bold"
                >
                  booking@tidyupscleaning.com
                </a>
              </div>
            </div>
          </form>
        ) : (
          /* SUCCESS STATE */
          <div className="text-center py-8 space-y-5">
            <div className="flex justify-center">
              <TidyUpsBunnyLogo size="lg" />
            </div>

            <div className="space-y-2">
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-xs font-black uppercase">
                ✓ Form Completed &amp; Jobber Quote Created
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white">
                Thank you{firstName ? `, ${firstName},` : ''} for completing the form!
              </h3>
              <p className="text-base sm:text-lg font-extrabold text-pink-400 max-w-md mx-auto">
                A team member will be in contact with you shortly.
              </p>
              <p className="text-xs sm:text-sm text-zinc-300 max-w-md mx-auto">
                Your <strong>{serviceType}</strong> request has been received and logged in Jobber. We will review your home details and send your confirmation to <strong>{phone}</strong>
                {email ? ` and ${email}` : ''}.
              </p>
            </div>

            <div className="bg-zinc-900 p-5 rounded-2xl border-2 border-pink-500/60 max-w-md mx-auto text-left text-xs space-y-2.5 shadow-lg">
              <div className="flex justify-between border-b border-zinc-800 pb-2">
                <span className="text-zinc-400 font-bold">Client Name:</span>
                <span className="font-black text-white">
                  {firstName} {lastName}
                </span>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-2">
                <span className="text-zinc-400 font-bold">Cleaning Service:</span>
                <span className="font-black text-pink-400">{serviceType}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-2">
                <span className="text-zinc-400 font-bold">Crew &amp; Minimum Hours:</span>
                <span className="font-bold text-red-300">{crewRuleDetails.badgeText}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-2">
                <span className="text-zinc-400 font-bold">Home Size:</span>
                <span className="font-bold text-white">
                  {bedrooms} • {bathrooms}
                </span>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-2">
                <span className="text-zinc-400 font-bold">Property Address:</span>
                <span className="font-bold text-white text-right">
                  {address}, {city}
                </span>
              </div>
              <div className="flex justify-between border-b border-zinc-800 pb-2">
                <span className="text-zinc-400 font-bold">Preferred Date:</span>
                <span className="font-bold text-emerald-400">
                  {preferredDate} • {preferredTime}
                </span>
              </div>
              <div className="flex justify-between pt-0.5">
                <span className="text-zinc-400 font-bold">Reference Number:</span>
                <span className="font-black font-mono text-pink-400">
                  {createdSummary?.quoteNumber || 'QT-4510'} / #{createdSummary?.jobberJobId || 'JOB-94182'}
                </span>
              </div>
            </div>

            <div className="pt-3 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-3 bg-gradient-to-r from-pink-600 to-red-600 hover:from-pink-500 hover:to-red-500 text-white rounded-xl text-xs font-black transition-colors cursor-pointer shadow-md"
              >
                {mode === 'MODAL' ? 'Done' : 'Submit Another Request'}
              </button>
              <a
                href="https://tidyupscleaning.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3 rounded-xl border-2 border-pink-500/60 hover:border-pink-400 text-white text-xs font-black flex items-center gap-1.5"
              >
                <span>Visit tidyupscleaning.com</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (mode === 'STANDALONE_PAGE') {
    return (
      <div className="min-h-screen w-full bg-gradient-to-b from-black via-zinc-950 to-black py-6 sm:py-10 px-4 text-white">
        {/* Owner Quick-Switch Bar (Only visible when Owner is logged in inside app.tidyupscleaning.com) */}
        {isOwnerViewing && (
          <div className="max-w-4xl mx-auto mb-4 bg-zinc-950 text-white rounded-2xl border-2 border-pink-500 p-3.5 flex flex-wrap items-center justify-between gap-2.5 shadow-lg">
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-pink-500 to-red-600 text-white font-black text-[10px] uppercase">
                👑 Owner Controls
              </span>
              <span className="font-bold text-zinc-200">
                Viewing <code className="text-pink-400 font-mono">/booking</code> (3-Option Voice &amp; Lit-Box Form: Move-Out • Basic • Deep)
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  handleCopyBookingUrl('https://app.tidyupscleaning.com/booking', 'booking')
                }
                className="px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer"
              >
                {copiedUrl === 'booking' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied /booking Link!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy /booking Link</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() =>
                  handleCopyBookingUrl('https://app.tidyupscleaning.com/thank-you', 'thankyou')
                }
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer"
                title="Copy Google Ads Conversion Page Link (https://app.tidyupscleaning.com/thank-you)"
              >
                {copiedUrl === 'thankyou' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied /thank-you!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy /thank-you Ads Link</span>
                  </>
                )}
              </button>
              {onSwitchToCalculatorMode && (
                <button
                  type="button"
                  onClick={onSwitchToCalculatorMode}
                  className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Switch to /book (Quote Calculator Variation)</span>
                </button>
              )}
            </div>
          </div>
        )}

        {formCardContent}

        {/* Minimal Public Footer (No Phone Numbers) */}
        <div className="max-w-4xl mx-auto mt-6 text-center text-xs text-zinc-400 flex flex-wrap items-center justify-center gap-4">
          <span>© {new Date().getFullYear()} TidyUps Cleaning Service Inc. • Edmonton &amp; Area</span>
          <span>•</span>
          <a
            href="mailto:booking@tidyupscleaning.com"
            className="text-pink-400 hover:underline font-bold"
          >
            booking@tidyupscleaning.com
          </a>
          <span>•</span>
          <a
            href="https://tidyupscleaning.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-red-400 hover:underline font-bold"
          >
            tidyupscleaning.com
          </a>
          {onOpenStaffLogin && !isOwnerViewing && (
            <>
              <span>•</span>
              <button
                type="button"
                onClick={onOpenStaffLogin}
                className="text-zinc-500 hover:text-pink-400 underline cursor-pointer inline-flex items-center gap-1"
              >
                <Lock className="w-3 h-3" />
                <span>Owner / Staff Login</span>
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      {formCardContent}
    </div>
  );
};
