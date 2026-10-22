import React, { useState } from 'react';
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
} from 'lucide-react';
import { ServiceTicket } from '../types/dispatch';
import { AddressAutocompleteInput } from './AddressAutocompleteInput';

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
    badge: 'Landlord & Realtor Checklist',
    description:
      'Complete empty-home or condo turnover: inside oven, inside fridge, inside all cabinets & drawers, baseboards, bathrooms, and floors.',
  },
  {
    id: 'Basic Cleaning' as const,
    shortLabel: 'Basic',
    title: 'Basic Cleaning',
    badge: 'Standard Maintenance Clean',
    description:
      'Essential residential refresh: kitchen counters & exterior appliances, bathrooms sanitized, thorough dusting, HEPA vacuuming & mopping.',
  },
  {
    id: 'Deep Cleaning' as const,
    shortLabel: 'Deep',
    title: 'Deep Cleaning',
    badge: 'Top-to-Bottom Detail Scrub',
    description:
      'Intensive detail clean: hand-wiped baseboards, doors, frames, light switches, heavy kitchen degreasing, and bathroom tile & grout scrub.',
  },
] as const;

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
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Edmonton');
  const [postalCode, setPostalCode] = useState('');
  const [bedrooms, setBedrooms] = useState('3 Bedrooms');
  const [bathrooms, setBathrooms] = useState('2 Bathrooms');
  const [preferredDate, setPreferredDate] = useState(() => {
    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    return tmrw.toISOString().slice(0, 10);
  });
  const [preferredTime, setPreferredTime] = useState('Morning (8:00 AM - 12:00 PM)');
  const [heardAbout, setHeardAbout] = useState('Website (tidyupscleaning.com)');
  const [specialInstructions, setSpecialInstructions] = useState('');

  if (mode === 'MODAL' && !isOpen) return null;

  const handleCopyBookingUrl = (url: string, key: string) => {
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedUrl(key);
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !address.trim()) {
      setErrorMsg('Please enter your full name, phone number, and property street address.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const bookingPayload = {
      customerName: fullName.trim(),
      customerPhone: phone.trim(),
      customerEmail: email.trim(),
      serviceType,
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
    setFullName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setSpecialInstructions('');
    if (mode === 'MODAL' && onClose) {
      onClose();
    }
  };

  const formCardContent = (
    <div
      className={`w-full ${
        mode === 'STANDALONE_PAGE' ? 'max-w-3xl mx-auto' : 'max-w-2xl'
      } bg-white border-2 border-teal-500/80 rounded-3xl shadow-2xl overflow-hidden text-slate-900 font-sans ${
        mode === 'MODAL' ? 'max-h-[92vh] flex flex-col' : ''
      }`}
    >
      {/* Top Header */}
      <div className="p-5 sm:p-6 border-b border-slate-200 bg-gradient-to-r from-slate-950 via-teal-950 to-emerald-950 text-white flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3.5">
          <img
            src="/images/tidyups-logo.png"
            alt="TidyUps Cleaning Service Inc."
            className="w-12 h-12 object-contain bg-white rounded-2xl p-1 shadow-md"
          />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                Official Online Booking Form
              </span>
              <span className="text-[11px] text-teal-300 font-mono">
                app.tidyupscleaning.com/booking
              </span>
            </div>
            <h2 className="font-black text-lg sm:text-xl text-white mt-0.5">
              TidyUps Cleaning — Request Your Clean &amp; Custom Quote
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Choose <strong>Move-Out</strong>, <strong>Basic</strong>, or <strong>Deep Cleaning</strong> and share your home details so we can quote &amp; schedule your clean accurately.
            </p>
          </div>
        </div>

        {mode === 'MODAL' && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Form Body */}
      <div className={`p-5 sm:p-7 ${mode === 'MODAL' ? 'flex-1 overflow-y-auto' : ''} bg-slate-50/60`}>
        {step === 'FORM' ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {errorMsg && (
              <div className="p-3.5 bg-rose-50 border-2 border-rose-200 rounded-2xl text-rose-800 text-xs font-bold">
                {errorMsg}
              </div>
            )}

            {/* 1. Three Simple Options: Move-Out, Basic, Deep */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="block text-xs font-black text-slate-900 uppercase tracking-wider">
                  1. Choose Your Cleaning Type (3 Options) *
                </label>
                <span className="text-[11px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full">
                  ✨ All Supplies &amp; Equipment Included
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {THREE_BOOKING_OPTIONS.map((opt) => {
                  const isSelected = serviceType === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setServiceType(opt.id)}
                      className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/90 text-emerald-950 shadow-md ring-2 ring-emerald-500/30 scale-[1.01]'
                          : 'border-slate-200 bg-white hover:border-teal-400 text-slate-800'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-base font-black text-slate-900">
                            {opt.shortLabel}
                          </span>
                          {isSelected ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-slate-300 shrink-0" />
                          )}
                        </div>
                        <div className="text-xs font-extrabold text-teal-800 mt-0.5">
                          {opt.title}
                        </div>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-bold text-slate-600">
                          {opt.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed mt-1">
                        {opt.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Home Size & Property Info */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <Home className="w-4 h-4 text-teal-600" />
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  2. Home Size &amp; Preferred Date
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Bedrooms / Property Size *
                  </label>
                  <select
                    value={bedrooms}
                    onChange={(e) => setBedrooms(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600"
                  >
                    <option value="1 Bedroom">1 Bedroom / Condo / Apartment</option>
                    <option value="2 Bedrooms">2 Bedrooms</option>
                    <option value="3 Bedrooms">3 Bedrooms</option>
                    <option value="4 Bedrooms">4 Bedrooms</option>
                    <option value="5 Bedrooms">5 Bedrooms</option>
                    <option value="6 Bedrooms">6+ Bedrooms</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Bathrooms *
                  </label>
                  <select
                    value={bathrooms}
                    onChange={(e) => setBathrooms(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600"
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

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-teal-600" />
                    <span>Preferred Cleaning Date *</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-teal-600" />
                    <span>Preferred Time Window *</span>
                  </label>
                  <select
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600"
                  >
                    <option value="Morning (8:00 AM - 12:00 PM)">Morning (8:00 AM - 12:00 PM)</option>
                    <option value="Afternoon (12:00 PM - 4:00 PM)">Afternoon (12:00 PM - 4:00 PM)</option>
                    <option value="Flexible / Any Time">Flexible / Earliest Available</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 3. Contact & Address Details */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <User className="w-4 h-4 text-teal-600" />
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  3. Your Contact Info &amp; Property Address
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Your Mobile Number (For Quote &amp; Confirmation) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 780-555-0199"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Address (For Official Quote &amp; Receipt)
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="sarah@example.com"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    How Did You Hear About Us?
                  </label>
                  <select
                    value={heardAbout}
                    onChange={(e) => setHeardAbout(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600"
                  >
                    <option value="Website (tidyupscleaning.com)">tidyupscleaning.com Website</option>
                    <option value="Google Search / Ad">Google Search / Google Maps</option>
                    <option value="Facebook / Instagram Ad">Facebook / Instagram</option>
                    <option value="Friend / Realtor Referral">Friend / Realtor Referral</option>
                    <option value="Returning TidyUps Client">Returning TidyUps Customer</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Property Street Address (Edmonton &amp; Area Auto-Complete) *
                  </label>
                  <AddressAutocompleteInput
                    required
                    value={address}
                    onChange={(newAddr) => {
                      setAddress(newAddr);
                      const lower = newAddr.toLowerCase();
                      if (lower.includes('st. albert') || lower.includes('st albert')) setCity('St. Albert');
                      else if (lower.includes('sherwood park')) setCity('Sherwood Park');
                      else if (lower.includes('leduc')) setCity('Leduc');
                      else if (lower.includes('spruce grove')) setCity('Spruce Grove');
                      else if (lower.includes('beaumont')) setCity('Beaumont');
                      else if (lower.includes('fort saskatchewan')) setCity('Fort Saskatchewan');
                      else if (lower.includes('edmonton')) setCity('Edmonton');
                    }}
                    placeholder="Start typing your street address (e.g. 10405 Jasper Ave NW)..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">City / Community</label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600"
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

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Postal Code (Optional)</label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="e.g. T5J 3S2"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tell Us About Your Home (Appliances, Basement, Pets, Lockbox, or Special Requests)
                  </label>
                  <textarea
                    rows={3}
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="e.g. Main floor + basement, inside oven & fridge needed, key in lockbox, or any specific areas you'd like us to quote & focus on..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="space-y-2.5">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-2xl text-sm sm:text-base font-black shadow-xl flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Submitting Your Booking &amp; Creating Jobber Quote...</span>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Submit {serviceType} Request &amp; Get Your Quote</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
              <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-500 font-semibold">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>No Upfront Card Charge Today</span>
                </span>
                <span>•</span>
                <span>24-Hour Clean Guarantee</span>
                <span>•</span>
                <a
                  href="mailto:booking@tidyupscleaning.com"
                  className="text-teal-700 hover:underline font-bold"
                >
                  booking@tidyupscleaning.com
                </a>
              </div>
            </div>
          </form>
        ) : (
          /* SUCCESS STATE */
          <div className="text-center py-8 space-y-5">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase">
                ✓ Booking Request &amp; Quote Created
              </span>
              <h3 className="text-2xl font-black text-slate-900">
                Thank You, {fullName}!
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                Your <strong>{serviceType}</strong> request has been received and logged in Jobber. We will review your home details and send your confirmation to <strong>{phone}</strong>{email ? ` and ${email}` : ''}.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border-2 border-emerald-200 max-w-md mx-auto text-left text-xs space-y-2.5 shadow-xs">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-bold">Cleaning Service:</span>
                <span className="font-black text-slate-900">{serviceType}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-bold">Home Size:</span>
                <span className="font-bold text-slate-900">
                  {bedrooms} • {bathrooms}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-bold">Property Address:</span>
                <span className="font-bold text-slate-900 text-right">
                  {address}, {city}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-bold">Preferred Date:</span>
                <span className="font-bold text-teal-700">
                  {preferredDate} • {preferredTime}
                </span>
              </div>
              <div className="flex justify-between pt-0.5">
                <span className="text-slate-500 font-bold">Reference Number:</span>
                <span className="font-black font-mono text-emerald-700">
                  {createdSummary?.quoteNumber || 'QT-4510'} / #{createdSummary?.jobberJobId || 'JOB-94182'}
                </span>
              </div>
            </div>

            <div className="pt-3 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-colors cursor-pointer shadow-md"
              >
                {mode === 'MODAL' ? 'Done' : 'Submit Another Request'}
              </button>
              <a
                href="https://tidyupscleaning.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-3 rounded-xl border-2 border-slate-300 hover:border-teal-500 text-slate-800 text-xs font-black flex items-center gap-1.5"
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
      <div className="min-h-screen w-full bg-gradient-to-b from-slate-100 via-teal-50/40 to-slate-100 py-6 sm:py-10 px-4">
        {/* Owner Quick-Switch Bar (Only visible when Owner is logged in inside app.tidyupscleaning.com) */}
        {isOwnerViewing && (
          <div className="max-w-3xl mx-auto mb-4 bg-slate-950 text-white rounded-2xl border-2 border-amber-400 p-3.5 flex flex-wrap items-center justify-between gap-2.5 shadow-lg">
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase">
                👑 Owner Controls
              </span>
              <span className="font-bold text-slate-200">
                Viewing <code className="text-emerald-300 font-mono">/booking</code> (3-Option Simple Form: Move-Out • Basic • Deep)
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  handleCopyBookingUrl('https://app.tidyupscleaning.com/booking', 'booking')
                }
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer"
              >
                {copiedUrl === 'booking' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied /booking Link!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy /booking Link (3-Option Form)</span>
                  </>
                )}
              </button>
              {onSwitchToCalculatorMode && (
                <button
                  type="button"
                  onClick={onSwitchToCalculatorMode}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-200 font-black text-xs flex items-center gap-1.5 cursor-pointer"
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
        <div className="max-w-3xl mx-auto mt-6 text-center text-xs text-slate-500 flex flex-wrap items-center justify-center gap-4">
          <span>© {new Date().getFullYear()} TidyUps Cleaning Service Inc. • Edmonton &amp; Area</span>
          <span>•</span>
          <a
            href="mailto:booking@tidyupscleaning.com"
            className="text-teal-700 hover:underline font-bold"
          >
            booking@tidyupscleaning.com
          </a>
          <span>•</span>
          <a
            href="https://tidyupscleaning.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-700 hover:underline font-bold"
          >
            tidyupscleaning.com
          </a>
          {onOpenStaffLogin && !isOwnerViewing && (
            <>
              <span>•</span>
              <button
                type="button"
                onClick={onOpenStaffLogin}
                className="text-slate-400 hover:text-slate-700 underline cursor-pointer inline-flex items-center gap-1"
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      {formCardContent}
    </div>
  );
};

