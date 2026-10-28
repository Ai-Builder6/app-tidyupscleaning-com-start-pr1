import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calculator, 
  X, 
  Check, 
  Copy, 
  CheckCircle2, 
  Sparkles, 
  Tag, 
  Calendar, 
  FileText, 
  User, 
  Phone, 
  MapPin, 
  Fuel, 
  Percent, 
  ArrowRight,
  Clock,
  Users,
  Mic,
  MicOff,
  BedDouble,
  Bath
} from 'lucide-react';
import { getCustomerIntelligence } from '../services/customerIntelligenceService';
import { CustomerIntelligenceBadge } from './CustomerIntelligenceBadge';
import { AddressAutocompleteInput } from './AddressAutocompleteInput';

interface QuickQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLead?: {
    customerName?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    postalCode?: string;
    serviceType?: string;
    serviceRequested?: string;
    bedrooms?: string | number;
    bathrooms?: string | number;
    source?: string;
    notes?: string;
  } | null;
  onSaveBooking?: (booking: any) => void;
  onCreateJobberQuote?: (quote: any, fullResponse?: any) => void;
  calls?: any[];
  visits?: any[];
  clients?: any[];
  projectId?: 'dispatchgeeni' | 'tidyups';
}

export const QuickQuoteModal: React.FC<QuickQuoteModalProps> = ({
  isOpen,
  onClose,
  initialLead,
  onSaveBooking,
  onCreateJobberQuote,
  calls = [],
  visits = [],
  clients = [],
  projectId = 'dispatchgeeni',
}) => {
  // Calculator state matching Screenshot 2
  const [hours, setHours] = useState<number>(3);
  const [crewSelection, setCrewSelection] = useState<'1_CLEANER' | '2_CLEANERS' | 'CUSTOM'>('1_CLEANER');
  const [customHourlyRate, setCustomHourlyRate] = useState<number>(55);
  const [selectedSource, setSelectedSource] = useState<string>('Google');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [fuelSurcharge, setFuelSurcharge] = useState<number>(12.50);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [quoteNote, setQuoteNote] = useState<string>('');
  const [applyTax, setApplyTax] = useState<boolean>(true);
  const [taxRate] = useState<number>(0.125); // 12.5% tax per Screenshot 2

  // Customer Contact & Property Size Fields for Fast Phone Quoting + Booking System Sync
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [serviceAddress, setServiceAddress] = useState<string>('');
  const [bedrooms, setBedrooms] = useState<string>('3 Bedrooms');
  const [bathrooms, setBathrooms] = useState<string>('2 Bathrooms');
  const [serviceType, setServiceType] = useState<string>('Residential Standard Cleaning');
  const [scheduledDate, setScheduledDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [scheduledTime, setScheduledTime] = useState<string>('10:00');
  const [assignedCleaners, setAssignedCleaners] = useState<string[]>([]);
  const [isRecordingVoice, setIsRecordingVoice] = useState<boolean>(false);

  const [copiedBreakdown, setCopiedBreakdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // Pre-fill if opened with lead details
  useEffect(() => {
    if (initialLead) {
      if (initialLead.customerName) setCustomerName(initialLead.customerName);
      if (initialLead.phone) setCustomerPhone(initialLead.phone);
      if (initialLead.email) setCustomerEmail(initialLead.email);
      if (initialLead.address) {
        const fullAddr = [initialLead.address, initialLead.city, initialLead.postalCode].filter(Boolean).join(', ');
        setServiceAddress(fullAddr);
      }
      if (initialLead.serviceType || initialLead.serviceRequested) {
        setServiceType(initialLead.serviceType || initialLead.serviceRequested || 'Residential Standard Cleaning');
      }
      if (initialLead.bedrooms) {
        const bStr = String(initialLead.bedrooms);
        setBedrooms(bStr.toLowerCase().includes('bed') || bStr.toLowerCase().includes('studio') ? bStr : `${bStr} Bedrooms`);
      }
      if (initialLead.bathrooms) {
        const baStr = String(initialLead.bathrooms);
        setBathrooms(baStr.toLowerCase().includes('bath') ? baStr : `${baStr} Bathrooms`);
      }
      if (initialLead.source) setSelectedSource(initialLead.source);
      if (initialLead.notes) setQuoteNote(initialLead.notes);
    }
  }, [initialLead, isOpen]);

  // Hourly Rate resolution
  const hourlyRate = useMemo(() => {
    if (crewSelection === '1_CLEANER') return 52.50;
    if (crewSelection === '2_CLEANERS') return 105.00;
    return customHourlyRate;
  }, [crewSelection, customHourlyRate]);

  // Formula matching Screenshot 2:
  // "Pick the hours and the crew to price this job. Fuel ($12.50), and 12.5% tax are added automatically."
  const calculations = useMemo(() => {
    const labor = Math.round(hours * hourlyRate * 100) / 100;
    const subtotalBeforeDiscount = labor + Number(fuelSurcharge);
    const subtotal = Math.max(0, subtotalBeforeDiscount - Number(discountAmount));
    const tax = applyTax ? Math.round(subtotal * taxRate * 100) / 100 : 0;
    const total = Math.round((subtotal + tax) * 100) / 100;

    return {
      labor,
      subtotal,
      tax,
      total,
    };
  }, [hours, hourlyRate, fuelSurcharge, discountAmount, applyTax, taxRate]);

  // Customer Intelligence
  const intelligence = useMemo(() => {
    return getCustomerIntelligence(customerPhone, customerName, { calls, visits, clients });
  }, [customerPhone, customerName, calls, visits, clients]);

  // Auto-suggest repeat customer discount
  const handleApplyLoyaltyDiscount = (percent: number) => {
    const labor = hours * hourlyRate;
    const loyaltyDiscountVal = Math.round(labor * (percent / 100));
    setDiscountAmount(loyaltyDiscountVal);
    setQuoteNote((prev) => `${prev ? prev + ' ' : ''}[Applied ${percent}% Repeat Client Loyalty Discount (-$${loyaltyDiscountVal})]`);
  };

  const quickVoiceRecRef = React.useRef<any>(null);
  const shouldKeepQuickVoiceRef = React.useRef<boolean>(false);
  const quickVoiceTranscriptRef = React.useRef<string>('');

  const handleQuickVoiceDictation = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;
    if (isRecordingVoice) {
      shouldKeepQuickVoiceRef.current = false;
      if (quickVoiceRecRef.current) {
        try {
          quickVoiceRecRef.current.onend = null;
          quickVoiceRecRef.current.stop();
        } catch {}
        quickVoiceRecRef.current = null;
      }
      setIsRecordingVoice(false);
      return;
    }
    try {
      shouldKeepQuickVoiceRef.current = true;
      quickVoiceTranscriptRef.current = '';

      const startRec = () => {
        const rec = new SpeechRec();
        rec.lang = 'en-CA';
        rec.continuous = true;
        rec.interimResults = true;
        rec.onstart = () => setIsRecordingVoice(true);
        rec.onresult = async (ev: any) => {
          let finalChunk = '';
          for (let i = ev.resultIndex; i < ev.results.length; i++) {
            if (ev.results[i].isFinal) {
              finalChunk += ev.results[i][0].transcript + ' ';
            }
          }
          if (finalChunk.trim()) {
            quickVoiceTranscriptRef.current = `${quickVoiceTranscriptRef.current} ${finalChunk}`.trim();
            try {
              const res = await fetch('/api/dispatch/parse-voice-ticket', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transcript: quickVoiceTranscriptRef.current }),
              });
              const data = await res.json();
              if (data) {
                if (data.customerName) setCustomerName(data.customerName);
                if (data.phone) setCustomerPhone(data.phone);
                if (data.address) setServiceAddress(data.address);
                if (data.bedrooms) setBedrooms(data.bedrooms);
                if (data.bathrooms) setBathrooms(data.bathrooms);
                if (data.serviceCategory) setServiceType(data.serviceCategory);
                if (data.specificInstructions) setQuoteNote(data.specificInstructions);
              }
            } catch {}
          }
        };
        rec.onerror = (ev: any) => {
          if (ev?.error === 'not-allowed' || ev?.error === 'service-not-allowed') {
            shouldKeepQuickVoiceRef.current = false;
            setIsRecordingVoice(false);
          }
        };
        rec.onend = () => {
          if (shouldKeepQuickVoiceRef.current) {
            setTimeout(() => {
              if (!shouldKeepQuickVoiceRef.current) return;
              try {
                rec.start();
              } catch {
                try {
                  startRec();
                } catch {}
              }
            }, 90);
            return;
          }
          setIsRecordingVoice(false);
        };
        quickVoiceRecRef.current = rec;
        rec.start();
      };

      startRec();
    } catch {
      shouldKeepQuickVoiceRef.current = false;
      setIsRecordingVoice(false);
    }
  };

  const handleCopyBreakdown = () => {
    const text = `TidyUps Cleaning Estimate for ${customerName || 'Customer'}:
• Service: ${serviceType}
• Property Size: ${bedrooms} • ${bathrooms}
• Address: ${serviceAddress || 'Edmonton, AB'}
• Time: ${hours} hours (${crewSelection === '1_CLEANER' ? '1 Cleaner @ $52.50/hr' : crewSelection === '2_CLEANERS' ? '2 Cleaners @ $105/hr' : `Custom @ $${hourlyRate}/hr`})
• Labor: $${calculations.labor.toFixed(2)}
• Fuel Surcharge: $${Number(fuelSurcharge).toFixed(2)}
${discountAmount > 0 ? `• Discount Applied: -$${Number(discountAmount).toFixed(2)}\n` : ''}• Subtotal: $${calculations.subtotal.toFixed(2)}
• Tax (12.5%): $${calculations.tax.toFixed(2)}
• TOTAL QUOTED: $${calculations.total.toFixed(2)} CAD
${depositAmount > 0 ? `• Deposit Required: $${Number(depositAmount).toFixed(2)}\n` : ''}${quoteNote ? `• Specific Info / Notes: ${quoteNote}` : ''}`;

    navigator.clipboard.writeText(text);
    setCopiedBreakdown(true);
    setTimeout(() => setCopiedBreakdown(false), 2500);
  };

  const handleSaveBooking = async () => {
    setIsSubmitting(true);
    setFeedbackNotice(null);
    try {
      // 1. Send to Booking System (/api/public/book) with bedrooms, bathrooms & specific instructions
      await fetch('/api/public/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName || 'Phone Lead',
          customerPhone: customerPhone || '(780) 555-0199',
          customerEmail: customerEmail || '',
          serviceType: `${serviceType} (${bedrooms}, ${bathrooms})`,
          address: serviceAddress || 'Edmonton, AB',
          city: 'Edmonton',
          bedrooms,
          bathrooms,
          preferredDate: scheduledDate,
          preferredTime: scheduledTime,
          specialInstructions: `Property: ${bedrooms}, ${bathrooms}. ${quoteNote ? `Specific Info: ${quoteNote}` : ''} | Quoted: $${calculations.total.toFixed(2)}`,
        }),
      }).catch(() => {});

      // 2. Also create Jobber scheduled visit
      const res = await fetch(`/api/quo/calls/convert-to-job?project=${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-project-id': projectId },
        body: JSON.stringify({
          callerName: customerName || 'Phone Lead',
          callerPhone: customerPhone || '(780) 555-0199',
          serviceAddress: serviceAddress || 'Edmonton, AB',
          serviceType: `${serviceType} (${bedrooms}, ${bathrooms} • ${hours} hrs)`,
          scheduledDate,
          scheduledTime,
          assignedCleaners,
          totalAmount: calculations.total,
          notes: `Property: ${bedrooms}, ${bathrooms}. Quoted: ${hours} hrs @ $${hourlyRate}/hr + $${fuelSurcharge} fuel. Source: ${selectedSource}. Specific Info: ${quoteNote}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackNotice(`✓ Sent to Booking System (${bedrooms}, ${bathrooms}) & Dispatched: ${data.newVisit?.visitNumber || 'VISIT'}!`);
        if (onSaveBooking && data.newVisit) {
          onSaveBooking(data.newVisit);
        }
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setFeedbackNotice(data.error || 'Failed to save booking.');
      }
    } catch (err: any) {
      setFeedbackNotice(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveJobberQuote = async () => {
    setIsSubmitting(true);
    setFeedbackNotice(null);
    try {
      const lineItems = [
        {
          description: `${serviceType} — ${bedrooms}, ${bathrooms} (${hours} hrs @ $${hourlyRate.toFixed(2)}/hr)`,
          quantity: hours,
          unitPrice: hourlyRate,
          total: calculations.labor,
        },
        {
          description: 'Fuel & Travel Surcharge',
          quantity: 1,
          unitPrice: Number(fuelSurcharge),
          total: Number(fuelSurcharge),
        },
      ];
      if (Number(discountAmount) > 0) {
        lineItems.push({
          description: 'Client Discount Applied',
          quantity: 1,
          unitPrice: -Number(discountAmount),
          total: -Number(discountAmount),
        });
      }

      const res = await fetch(`/api/database/quotes?project=${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-project-id': projectId },
        body: JSON.stringify({
          clientName: customerName || 'Phone Lead',
          clientPhone: customerPhone || '(780) 555-0199',
          clientEmail: customerEmail,
          serviceAddress: serviceAddress || 'Edmonton, AB',
          service: `${serviceType} (${bedrooms}, ${bathrooms} • ${hours} hrs)`,
          bedrooms,
          bathrooms,
          total: calculations.total,
          discountAmount: Number(discountAmount) || 0,
          depositRequired: depositAmount,
          scheduledDate,
          scheduledTime,
          assignedCleaners,
          lineItems,
          notes: `Property: ${bedrooms}, ${bathrooms}. Fast Quote: ${hours} hrs @ $${hourlyRate}/hr + $${fuelSurcharge} fuel. Source: ${selectedSource}. Specific Info: ${quoteNote}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackNotice(`✓ Synced Client & Jobber Quote ${data.quote?.quoteNumber || 'QT'} (${bedrooms}, ${bathrooms})!`);
        if (onCreateJobberQuote && data.quote) {
          onCreateJobberQuote(data.quote, data);
        }
        setTimeout(() => {
          onClose();
        }, 700);
      } else {
        setFeedbackNotice(data.error || 'Failed to save quote.');
      }
    } catch (err: any) {
      setFeedbackNotice(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg bg-[#141218] border border-[#2b2533] rounded-3xl shadow-2xl overflow-hidden text-slate-100 font-sans my-auto max-h-[95vh] flex flex-col">
        {/* Header matching Screenshot 2 */}
        <div className="p-4 sm:p-5 border-b border-[#2b2533] flex items-center justify-between flex-shrink-0 bg-[#19161f]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg text-white tracking-tight">
                Quoted price
              </h2>
              <p className="text-[11px] text-slate-400">
                Instant phone estimator &amp; booking calculator
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
          {feedbackNotice && (
            <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2 font-bold animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{feedbackNotice}</span>
            </div>
          )}

          {/* Caller / Customer Intelligence Badge if Phone is Present */}
          {customerPhone.trim() && (
            <CustomerIntelligenceBadge
              intelligence={intelligence}
              showDiscountPrompt={intelligence.loyaltyDiscountEligible && discountAmount === 0}
              onApplyDiscount={(percent) => handleApplyLoyaltyDiscount(percent)}
            />
          )}

          {/* 1. Hours Selector (Matches Screenshot 2) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-300">Hours:</span>
              <span className="font-mono font-bold text-pink-400 text-sm">{hours} {hours === 1 ? 'hour' : 'hours'}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {[1, 2, 3, 4, 5].map((h) => {
                const isSelected = hours === h;
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHours(h)}
                    className={`w-9 h-9 rounded-full font-bold text-xs transition-all cursor-pointer flex items-center justify-center border ${
                      isSelected
                        ? 'bg-pink-600 text-white border-pink-500 shadow-md scale-105'
                        : 'bg-[#221d2b] text-slate-300 border-[#322c3e] hover:bg-[#2b2537]'
                    }`}
                  >
                    {h}
                  </button>
                );
              })}
              {/* +1 and +½ increments */}
              <button
                type="button"
                onClick={() => setHours((prev) => Math.min(16, prev + 1))}
                className="px-3 h-9 rounded-full bg-[#221d2b] hover:bg-[#2b2537] text-slate-300 border border-[#322c3e] font-bold text-xs transition-colors cursor-pointer"
                title="Add 1 hour"
              >
                +1
              </button>
              <button
                type="button"
                onClick={() => setHours((prev) => prev + 0.5)}
                className="px-3 h-9 rounded-full bg-[#221d2b] hover:bg-[#2b2537] text-slate-300 border border-[#322c3e] font-bold text-xs transition-colors cursor-pointer"
                title="Add half hour"
              >
                +½
              </button>
            </div>
          </div>

          {/* 2. Cleaner Crew Selection (Matches Screenshot 2) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setCrewSelection('1_CLEANER')}
                className={`py-2 px-3.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                  crewSelection === '1_CLEANER'
                    ? 'bg-pink-600 text-white border-pink-500 shadow-md'
                    : 'bg-[#221d2b] text-slate-300 border-[#322c3e] hover:bg-[#2b2537]'
                }`}
              >
                1 cleaner $52.50/hr
              </button>
              <button
                type="button"
                onClick={() => setCrewSelection('2_CLEANERS')}
                className={`py-2 px-3.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                  crewSelection === '2_CLEANERS'
                    ? 'bg-pink-600 text-white border-pink-500 shadow-md'
                    : 'bg-[#221d2b] text-slate-300 border-[#322c3e] hover:bg-[#2b2537]'
                }`}
              >
                2 cleaners $105.00/hr
              </button>
              <button
                type="button"
                onClick={() => setCrewSelection('CUSTOM')}
                className={`py-2 px-3.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                  crewSelection === 'CUSTOM'
                    ? 'bg-pink-600 text-white border-pink-500 shadow-md'
                    : 'bg-[#221d2b] text-slate-300 border-[#322c3e] hover:bg-[#2b2537]'
                }`}
              >
                Custom $/hr
              </button>
            </div>

            {crewSelection === 'CUSTOM' && (
              <div className="flex items-center gap-2 pt-1 animate-fadeIn">
                <span className="text-slate-400">Custom Rate: $</span>
                <input
                  type="number"
                  min="30"
                  step="1"
                  value={customHourlyRate}
                  onChange={(e) => setCustomHourlyRate(Number(e.target.value) || 55)}
                  className="w-24 px-2 py-1 bg-[#1d1924] border border-[#373043] rounded-lg text-white font-mono font-bold focus:outline-none focus:border-pink-500"
                />
                <span className="text-slate-400">/hr</span>
              </div>
            )}
          </div>

          {/* 3. Big Calculated Price Box (Matches Screenshot 2) */}
          <div className="p-4 bg-[#191621] border border-[#2b2536] rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Total Quoted Price</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-pink-400 font-mono tracking-tight flex items-baseline gap-1">
                <span className="text-pink-500">$</span>
                <span>{calculations.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="text-right text-[11px] text-slate-400 space-y-0.5">
              <div>Labor: <span className="font-mono text-slate-200">${calculations.labor.toFixed(2)}</span></div>
              <div>Fuel: <span className="font-mono text-slate-200">+${Number(fuelSurcharge).toFixed(2)}</span></div>
              {discountAmount > 0 && (
                <div className="text-emerald-400 font-bold">Discount: -${Number(discountAmount).toFixed(2)}</div>
              )}
              <div>Tax (12.5%): <span className="font-mono text-slate-200">+${calculations.tax.toFixed(2)}</span></div>
            </div>
          </div>

          {/* 4. "How did they hear about us?" (Matches Screenshot 2) */}
          <div className="space-y-2">
            <label className="block text-slate-300 font-medium">How did they hear about us?</label>
            <div className="flex items-center gap-2 flex-wrap">
              {['Google', 'Facebook', 'Instagram', 'TikTok', 'Referral'].map((src) => {
                const isSelected = selectedSource === src;
                return (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setSelectedSource(src)}
                    className={`py-1.5 px-3 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-pink-600 text-white border-pink-500 shadow-md'
                        : 'bg-[#221d2b] text-slate-300 border-[#322c3e] hover:bg-[#2b2537]'
                    }`}
                  >
                    {src}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Quick Discounts (Matches Screenshot 2) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setDiscountAmount(10)}
                className={`py-1.5 px-3 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                  discountAmount === 10
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                    : 'bg-[#221d2b] text-slate-300 border-[#322c3e] hover:bg-[#2b2537]'
                }`}
              >
                -$10 off
              </button>
              <button
                type="button"
                onClick={() => setDiscountAmount(20)}
                className={`py-1.5 px-3 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                  discountAmount === 20
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                    : 'bg-[#221d2b] text-slate-300 border-[#322c3e] hover:bg-[#2b2537]'
                }`}
              >
                -$20 off
              </button>
              {discountAmount > 0 && (
                <button
                  type="button"
                  onClick={() => setDiscountAmount(0)}
                  className="py-1.5 px-2.5 rounded-full text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Clear discount
                </button>
              )}
            </div>
          </div>

          {/* 6. Fuel Surcharge & Deposit (Matches Screenshot 2) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 bg-[#1b1723] p-2.5 rounded-xl border border-[#2b2537]">
              <span className="text-slate-400 whitespace-nowrap">Fuel surcharge $</span>
              <input
                type="number"
                step="0.5"
                value={fuelSurcharge}
                onChange={(e) => setFuelSurcharge(Number(e.target.value) || 0)}
                className="w-full bg-transparent text-white font-mono font-bold focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 bg-[#1b1723] p-2.5 rounded-xl border border-[#2b2537]">
              <span className="text-slate-400 whitespace-nowrap">Deposit $</span>
              <input
                type="number"
                step="5"
                value={depositAmount}
                onChange={(e) => setDepositAmount(Number(e.target.value) || 0)}
                className="w-full bg-transparent text-white font-mono font-bold focus:outline-none"
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-400 italic">
            Pick the hours and the crew to price this job. Fuel ($12.50), and 12.5% tax are added automatically.
          </p>

          {/* 7. Caller / Client & Property Details for Live Booking System Sync */}
          <div className="pt-2 border-t border-[#2b2536] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 uppercase tracking-wider text-[10px] block">
                Customer, Property Size &amp; Location (Sent to Booking System &amp; Jobber)
              </span>
              <button
                type="button"
                onClick={handleQuickVoiceDictation}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                  isRecordingVoice
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-pink-600/20 text-pink-300 border border-pink-500/40 hover:bg-pink-600/30'
                }`}
              >
                {isRecordingVoice ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                <span>{isRecordingVoice ? 'Listening...' : 'Voice Dictate'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <input
                type="text"
                placeholder="Customer Name *"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 bg-[#1b1723] border border-[#2e273a] rounded-xl text-white font-bold focus:outline-none focus:border-pink-500"
              />
              <input
                type="text"
                placeholder="Phone Number *"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full px-3 py-2 bg-[#1b1723] border border-[#2e273a] rounded-xl text-white font-mono focus:outline-none focus:border-pink-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <AddressAutocompleteInput
                theme="dark"
                placeholder="Service Address (Edmonton, AB)"
                value={serviceAddress}
                onChange={(val) => setServiceAddress(val)}
                onSelect={(pred) => setServiceAddress(pred.description || pred.mainText)}
                className="w-full px-3 py-2 bg-[#1b1723] border border-[#2e273a] rounded-xl text-white text-xs font-bold focus:outline-none focus:border-pink-500"
              />
              <select
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="w-full px-3 py-2 bg-[#1b1723] border border-[#2e273a] rounded-xl text-white focus:outline-none focus:border-pink-500"
              >
                <option value="Residential Standard Cleaning">Standard Home Cleaning</option>
                <option value="Residential Deep Scrub Cleaning">Deep Scrub Cleaning</option>
                <option value="Turnover Move-Out / Vacate Cleaning">Move-Out / Vacate Cleaning</option>
                <option value="Commercial Office Cleaning">Commercial Office Cleaning</option>
              </select>
            </div>

            {/* How Many Bedrooms & How Many Bathrooms */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-pink-300 flex items-center gap-1 mb-1">
                  <BedDouble className="w-3.5 h-3.5 text-pink-400" />
                  <span>How Many Bedrooms? *</span>
                </label>
                <select
                  value={bedrooms}
                  onChange={(e) => setBedrooms(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1b1723] border border-pink-500/40 rounded-xl text-white font-bold focus:outline-none focus:border-pink-500"
                >
                  <option value="1 Bedroom">1 Bedroom</option>
                  <option value="2 Bedrooms">2 Bedrooms</option>
                  <option value="3 Bedrooms">3 Bedrooms</option>
                  <option value="4 Bedrooms">4 Bedrooms</option>
                  <option value="5+ Bedrooms">5+ Bedrooms</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-purple-300 flex items-center gap-1 mb-1">
                  <Bath className="w-3.5 h-3.5 text-purple-400" />
                  <span>How Many Bathrooms? *</span>
                </label>
                <select
                  value={bathrooms}
                  onChange={(e) => setBathrooms(e.target.value)}
                  className="w-full px-3 py-2 bg-[#1b1723] border border-purple-500/40 rounded-xl text-white font-bold focus:outline-none focus:border-pink-500"
                >
                  <option value="1 Bathroom">1 Bathroom</option>
                  <option value="1.5 Bathrooms">1.5 Bathrooms</option>
                  <option value="2 Bathrooms">2 Bathrooms</option>
                  <option value="2.5 Bathrooms">2.5 Bathrooms</option>
                  <option value="3 Bathrooms">3 Bathrooms</option>
                  <option value="4+ Bathrooms">4+ Bathrooms</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#1b1723] border border-[#2e273a] rounded-xl text-white text-xs font-mono focus:outline-none"
              />
              <input
                type="text"
                placeholder="10:00"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#1b1723] border border-[#2e273a] rounded-xl text-white text-xs font-mono focus:outline-none"
              />
              <select
                value=""
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'NONE') {
                    setAssignedCleaners([]);
                  } else if (val && !assignedCleaners.includes(val)) {
                    setAssignedCleaners((prev) => [...prev, val]);
                  }
                }}
                className="w-full px-2 py-1.5 bg-[#1b1723] border border-[#2e273a] rounded-xl text-white text-xs focus:outline-none"
              >
                <option value="">
                  {assignedCleaners.length === 0 ? '— No One (Unassigned) —' : `+ Add Cleaner (${assignedCleaners.length})...`}
                </option>
                <option value="NONE">✕ No One / Clear All</option>
                <option value="Melissa Clarke">+ Melissa Clarke</option>
                <option value="Cindy Guay">+ Cindy Guay</option>
                <option value="Joel MBATCHOU">+ Joel MBATCHOU</option>
                <option value="Sergine Ngongang wetie">+ Sergine Ngongang wetie</option>
                <option value="Robyn Adele">+ Robyn Adele</option>
                <option value="Jen & Bryan Cabugon">+ Jen &amp; Bryan Cabugon</option>
                <option value="Joseph Juma">+ Joseph Juma</option>
                <option value="Adison Haugland">+ Adison Haugland</option>
                <option value="Jasmin Kunin">+ Jasmin Kunin</option>
              </select>
            </div>
            {assignedCleaners.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {assignedCleaners.map((name) => (
                  <span
                    key={name}
                    className="px-2 py-0.5 rounded-lg bg-emerald-600/25 border border-emerald-400/50 text-emerald-200 text-[10px] font-bold flex items-center gap-1"
                  >
                    <span>✓ {name}</span>
                    <button
                      type="button"
                      onClick={() => setAssignedCleaners((prev) => prev.filter((c) => c !== name))}
                      className="hover:text-white cursor-pointer"
                    >
                      ✕
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => setAssignedCleaners([])}
                  className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                >
                  Reset to No One
                </button>
              </div>
            )}
          </div>

          {/* 8. Specific Information & Quote Notes */}
          <div className="space-y-1.5">
            <label className="block text-slate-300 font-bold">
              Specific Information / Access Notes (Sent to Booking System &amp; Quote)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Clean inside oven & fridge, lockbox code 4482, friendly dog in home..."
              value={quoteNote}
              onChange={(e) => setQuoteNote(e.target.value)}
              className="w-full p-3 bg-[#1b1723] border border-[#2e273a] rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
            />
          </div>
        </div>

        {/* Footer Actions (Matches Screenshot 2 "Save booking") */}
        <div className="p-4 sm:p-5 border-t border-[#2b2533] bg-[#19161f] flex items-center justify-between gap-2.5 flex-wrap flex-shrink-0">
          <button
            type="button"
            onClick={handleCopyBreakdown}
            className="px-3 py-2.5 rounded-xl bg-[#25202e] hover:bg-[#2e283b] text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Copy formatted quote text to clipboard"
          >
            {copiedBreakdown ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedBreakdown ? 'Copied!' : 'Copy Quote Text'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveJobberQuote}
              disabled={isSubmitting}
              className="px-3.5 py-2.5 rounded-xl bg-purple-700/80 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Create Quote</span>
            </button>

            <button
              type="button"
              onClick={handleSaveBooking}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-lg active:scale-95 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Save booking'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
