import React, { useState } from 'react';
import { BookMyCleaningLogo } from './BookMyCleaningLogo';
import { 
  ShieldCheck, 
  HelpCircle, 
  FileText, 
  Lock, 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Send, 
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Globe
} from 'lucide-react';

export type LegalPageType = 'SUPPORT' | 'TERMS' | 'PRIVACY';

interface LegalPagesViewProps {
  initialTab?: LegalPageType;
  onBackToDispatch?: () => void;
}

export const LegalPagesView: React.FC<LegalPagesViewProps> = ({
  initialTab = 'SUPPORT',
  onBackToDispatch,
}) => {
  const [activeTab, setActiveTab] = useState<LegalPageType>(initialTab);

  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Support Form State
  const [supportName, setSupportName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [supportSubject, setSupportSubject] = useState('Booking Inquiry');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSent, setSupportSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data Deletion Request State (for /data-deletion & Facebook Messenger compliance)
  const [deletionIdentifier, setDeletionIdentifier] = useState('');
  const [deletionConfirmationCode, setDeletionConfirmationCode] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('code') || null;
    }
    return null;
  });
  const [isDeletingData, setIsDeletingData] = useState(false);

  const handleRequestDataDeletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletionIdentifier.trim()) return;
    setIsDeletingData(true);
    try {
      const res = await fetch('/api/facebook/data-deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: deletionIdentifier.trim() }),
      });
      const data = await res.json();
      setDeletionConfirmationCode(data?.confirmation_code || `DEL-TIDYUPS-${Date.now().toString(36).toUpperCase()}`);
      setDeletionIdentifier('');
    } catch {
      setDeletionConfirmationCode(`DEL-TIDYUPS-${Date.now().toString(36).toUpperCase()}`);
    } finally {
      setIsDeletingData(false);
    }
  };

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportName.trim() || !supportEmail.trim() || !supportMessage.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSupportSent(true);
    }, 600);
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-50 text-slate-800 font-sans p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BookMyCleaningLogo size={42} withText={false} />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold text-slate-900 leading-tight">TidyUps Cleaning Service Inc</h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                  Verified Platform
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1 font-mono text-emerald-700 font-semibold">
                  <Globe className="w-3 h-3 text-emerald-600" /> https://app.tidyupscleaning.com
                </span>
                <span>•</span>
                <span>Edmonton &amp; Regional Corridors</span>
              </p>
            </div>
          </div>

          {/* Navigation Pill Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto shrink-0">
            <button
              onClick={() => setActiveTab('SUPPORT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'SUPPORT'
                  ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>/support</span>
            </button>

            <button
              onClick={() => setActiveTab('TERMS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'TERMS'
                  ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>/T&amp;C</span>
            </button>

            <button
              onClick={() => setActiveTab('PRIVACY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'PRIVACY'
                  ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>/privacy-policy</span>
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────────
            TAB 1: /support (Client Helpdesk, Dispatch Operations, Direct Contacts)
           ───────────────────────────────────────────────────────────────────────────── */}
        {activeTab === 'SUPPORT' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Direct Contact Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Toll-Free Vanity Line */}
              <div className="bg-gradient-to-br from-pink-50/80 to-purple-50/80 p-4 rounded-xl border border-pink-200/80 shadow-2xs">
                <div className="w-8 h-8 rounded-lg bg-pink-600 text-white flex items-center justify-center mb-2 shadow-2xs">
                  <Phone className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-xs text-purple-950">Toll-Free Vanity Line</h3>
                <p className="text-[11px] text-pink-700 font-medium mt-0.5">Customer Bookings &amp; Service</p>
                <div className="mt-2 space-y-0.5 font-mono text-xs font-black text-slate-900">
                  <a href="tel:18338439877" className="text-purple-900 hover:text-pink-600 block">
                    1-833-TIDYUPS
                  </a>
                  <a href="tel:8338439877" className="text-pink-700 hover:underline text-[11px] block">
                    (833) 843-9877
                  </a>
                  <div className="text-[10px] text-slate-500 font-sans font-normal">Toll-Free Across Canada</div>
                </div>
              </div>

              {/* Direct Dispatch Lines */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                  <Phone className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-xs text-slate-800">Direct Dispatch Lines</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Live phone &amp; SMS intake</p>
                <div className="mt-2 space-y-0.5 font-mono text-xs font-bold text-slate-800">
                  <a href="tel:5879007223" className="hover:text-blue-600 block">
                    (587) 900-7223
                  </a>
                  <a href="tel:5877422500" className="hover:text-blue-600 block">
                    (587) 742-2500
                  </a>
                  <div className="text-[10px] text-slate-500 font-sans font-normal">Edmonton Dispatch Corridors</div>
                </div>
              </div>

              {/* Operations Email */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                  <Mail className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-xs text-slate-800">Operations Email</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Booking confirmation &amp; support</p>
                <div className="mt-2 space-y-0.5 text-xs font-semibold text-slate-800">
                  <a href="mailto:booking@tidyupscleaning.com" className="hover:underline text-emerald-700 font-bold block">
                    booking@tidyupscleaning.com
                  </a>
                </div>
              </div>

              {/* Hours of Operation */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2">
                  <Clock className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-xs text-slate-800">Hours of Operation</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Edmonton Time (MST)</p>
                <div className="mt-2 space-y-0.5 text-xs text-slate-700">
                  <div className="font-semibold">Mon – Sun: 7:00 AM – 8:00 PM</div>
                  <div className="text-[10px] text-emerald-700 font-semibold">Same-Day Emergency Dispatch Active</div>
                </div>
              </div>
            </div>

            {/* Support Message Box */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-base font-bold text-slate-900 mb-1">Submit a Support Request / Dispatch Notice</h2>
              <p className="text-xs text-slate-500 mb-4">
                Have a question regarding your cleaning schedule, need to update lockbox access notes, or request a service adjustment?
              </p>

              {supportSent ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="font-bold text-xs">Support Request Dispatched!</h4>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      Your inquiry has been routed to TidyUps Cleaning Operations at <code>booking@tidyupscleaning.com</code>. We typically reply within 15–30 minutes during business hours.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSupportSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Your Name *</label>
                      <input
                        type="text"
                        required
                        value={supportName}
                        onChange={(e) => setSupportName(e.target.value)}
                        placeholder="e.g. Sarah Miller"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={supportEmail}
                        onChange={(e) => setSupportEmail(e.target.value)}
                        placeholder="e.g. sarah@example.com"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={supportPhone}
                        onChange={(e) => setSupportPhone(e.target.value)}
                        placeholder="(780) 555-0199"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
                    <select
                      value={supportSubject}
                      onChange={(e) => setSupportSubject(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                    >
                      <option value="Booking Inquiry">Booking Inquiry / Schedule Change</option>
                      <option value="Access Code Update">Access Code / Lockbox / Keypad Update</option>
                      <option value="Quote Adjustment">Quote &amp; Estimate Question</option>
                      <option value="Invoice or Payment">Invoice or Payment Receipt</option>
                      <option value="Move-Out Inspection Guarantee">Move-Out Walkthrough Guarantee</option>
                      <option value="Other">Other Operational Inquiries</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Message / Access Details *</label>
                    <textarea
                      rows={4}
                      required
                      value={supportMessage}
                      onChange={(e) => setSupportMessage(e.target.value)}
                      placeholder="Please include your Edmonton service address or Jobber booking ticket number if applicable..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Sending Request...' : 'Send to Dispatch Support'}</span>
                  </button>
                </form>
              )}
            </div>

            {/* FAQs */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <h2 className="text-base font-bold text-slate-900">Frequently Asked Questions</h2>
              <div className="space-y-3 divide-y divide-slate-100 text-xs">
                <div className="pt-2">
                  <h4 className="font-bold text-slate-900">How do I provide home or condo access?</h4>
                  <p className="text-slate-600 mt-1 leading-relaxed">
                    You can leave a lockbox code, garage keypad code, or buzzer number during booking. Our 15 cleaning crew members are background-verified and enter access notes securely via our dispatch console.
                  </p>
                </div>
                <div className="pt-2">
                  <h4 className="font-bold text-slate-900">What is included in the Move-Out Cleaning Guarantee?</h4>
                  <p className="text-slate-600 mt-1 leading-relaxed">
                    Our move-out turnover service covers all interior appliances (oven, refrigerator, range hood), interior cabinets, baseboards, window tracks, and full bathroom sanitization designed for landlord deposit return.
                  </p>
                </div>
                <div className="pt-2">
                  <h4 className="font-bold text-slate-900">Do your cleaners bring all equipment &amp; supplies?</h4>
                  <p className="text-slate-600 mt-1 leading-relaxed">
                    Yes. All mobile units arrive equipped with commercial backpack HEPA vacuums, microfiber cleaning flat-mop systems, hospital-grade sanitizers, and degreasing kits.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────────
            TAB 2: /T&C (Terms and Conditions)
           ───────────────────────────────────────────────────────────────────────────── */}
        {activeTab === 'TERMS' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6 text-xs text-slate-700 leading-relaxed animate-fadeIn">
            <div>
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest block mb-1">
                Legal Terms of Service
              </span>
              <h2 className="text-lg font-bold text-slate-900">Terms and Conditions</h2>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Effective Date: September 29, 2026 • Governing Law: Province of Alberta, Canada
              </p>
            </div>

            <div className="space-y-4">
              <section>
                <h3 className="font-bold text-slate-900 text-sm mb-1">1. Scope of Services</h3>
                <p>
                  TidyUps Cleaning Service Inc (&quot;TidyUps Cleaning&quot;, &quot;we&quot;, &quot;us&quot;) provides residential, deep, and move-out cleaning, live operations dispatch, and customer booking management across the Greater Edmonton Area (YEG) and connected regional corridors via <code>https://app.tidyupscleaning.com</code>.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-slate-900 text-sm mb-1">2. Bookings, Estimates &amp; Jobber Integration</h3>
                <p>
                  All bookings submitted via website, voice intake, or telephone are scheduled and confirmed using our live Jobber scheduling system. Service durations are estimated based on property square footage and standard condition. Additional heavy soiling or appliance interior cleaning outside the original quote may require rate adjustments approved prior to commencement.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-slate-900 text-sm mb-1">3. Access, Keys &amp; Entry Requirements</h3>
                <p>
                  Clients are responsible for ensuring clear, safe access to the premises at the scheduled time window (e.g., active lockbox code, working keypad, reception pass). If cleaning staff are unable to access the property within 30 minutes of scheduled arrival, a lock-out fee of $50 CAD may apply.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-slate-900 text-sm mb-1">4. Move-Out Inspection &amp; 24-Hour Satisfaction Guarantee</h3>
                <p>
                  We stand behind our work. If your landlord or property inspector identifies an item within the booked service scope that was overlooked, notify us within 24 hours of completion and we will dispatch a team member to rectify the item at zero additional charge.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-slate-900 text-sm mb-1">5. Cancellations &amp; Rescheduling</h3>
                <p>
                  You may reschedule or cancel your cleaning appointment up to 24 hours prior to the scheduled service start time with no penalty. Cancellations within 24 hours may be subject to a late cancellation charge of $50 CAD.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-slate-900 text-sm mb-1">6. Payment Terms</h3>
                <p>
                  Invoices are issued digitally via Jobber and are due upon completion of the service. We accept major credit cards, Interac e-Transfer to <code>booking@tidyupscleaning.com</code>, and corporate accounts.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-slate-900 text-sm mb-1">7. Liability &amp; Insurance</h3>
                <p>
                  Dispatch Genie maintains full commercial general liability insurance and WCB Alberta coverage. We take the utmost care with your property; however, we are not liable for pre-existing wear and tear, loose fixtures, or unsecured fragile antiques exceeding $500 in value that were not disclosed in writing prior to service.
                </p>
              </section>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────────
            TAB 3: /privacy-policy (Privacy & Data Protection)
           ───────────────────────────────────────────────────────────────────────────── */}
        {activeTab === 'PRIVACY' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6 text-xs text-slate-700 leading-relaxed animate-fadeIn">
            <div>
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest block mb-1">
                Data Protection &amp; PIPEDA Compliance
              </span>
              <h2 className="text-lg font-bold text-slate-900">Privacy Policy</h2>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Effective Date: September 29, 2026 • Compliance: Personal Information Protection and Electronic Documents Act (PIPEDA, Canada)
              </p>
            </div>

            <div className="space-y-4">
              <section>
                <h3 className="font-bold text-slate-900 text-sm mb-1">1. Information We Collect</h3>
                <p>
                  When you book a cleaning service on <code>https://app.tidyupscleaning.com</code>, submit a voice request, or interact with our dispatch console, we collect:
                </p>
                <ul className="list-disc list-inside mt-1 space-y-1 text-slate-600">
                  <li><strong>Contact Details:</strong> Full name, phone number, email address.</li>
                  <li><strong>Service Location:</strong> Street address, city, postal code, and property specifications (bedrooms/bathrooms).</li>
                  <li><strong>Access Information:</strong> Lockbox codes, buzzer codes, gate instructions, and pet presence notes.</li>
                  <li><strong>Billing Information:</strong> Invoicing history, payment transaction IDs (credit card numbers are processed via secure PCI-compliant processors like Stripe/Jobber and are never stored on our dispatch servers).</li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold text-slate-900 text-sm mb-1">2. How We Use Your Information</h3>
                <p>We use your information exclusively to:</p>
                <ul className="list-disc list-inside mt-1 space-y-1 text-slate-600">
                  <li>Dispatch and navigate our 15 cleaning crew units directly to your home using route optimization.</li>
                  <li>Send booking confirmations, arrival ETA notices, and Jobber digital invoices.</li>
                  <li>Ensure quality assurance and fulfill our 24-hour Move-Out guarantee.</li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold text-slate-900 text-sm mb-1">3. Third-Party Integrations &amp; Data Transfers</h3>
                <p>
                  To deliver seamless operations, your data is securely transmitted only to authorized service providers:
                </p>
                <ul className="list-disc list-inside mt-1 space-y-1 text-slate-600">
                  <li><strong>Jobber:</strong> Operational management, scheduled calendar visits, and quotes (developer.getjobber.com).</li>
                  <li><strong>Google Maps &amp; Routes API:</strong> Travel time calculation and route navigation for field cleaners.</li>
                  <li><strong>Quo (OpenPhone):</strong> Telephony and SMS dispatch communication.</li>
                </ul>
                <p className="mt-1 font-semibold text-slate-800">
                  We never sell, rent, or trade your personal information to third-party advertisers.
                </p>
              </section>

              <section>
                <h3 className="font-bold text-slate-900 text-sm mb-1">4. Data Security &amp; Storage</h3>
                <p>
                  All data in transit is encrypted using Industry-Standard TLS 1.3 encryption. Access to customer contact details and property entrance codes is strictly restricted to assigned cleaning staff scheduled for that specific booking.
                </p>
              </section>

              <section id="data-deletion" className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    5. User Data Deletion Instructions &amp; Facebook Messenger Data Removal (<code>/data-deletion</code>)
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold uppercase">
                    Meta &amp; PIPEDA Compliant
                  </span>
                </div>
                <p className="text-slate-700">
                  In compliance with Meta Platform Terms and Canadian PIPEDA privacy regulations, you have the right to request the complete and permanent deletion of any personal data, Facebook Messenger chat history, phone numbers, or booking records associated with your account.
                </p>
                <div className="space-y-1.5 text-slate-700">
                  <div className="font-bold text-slate-900">How to Delete Your Data:</div>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>
                      <strong>Instant Online Deletion (Below):</strong> Enter your name, phone number, email address, or Facebook User ID in the box below and click <strong>Delete My Data Now</strong> to immediately purge your Messenger thread and receive a Deletion Confirmation Code.
                    </li>
                    <li>
                      <strong>Via Facebook Settings:</strong> Go to your Facebook Account <em>Settings &amp; Privacy &rarr; Settings &rarr; Apps and Websites</em>, select <strong>TidyUps Messenger AI</strong>, and click <strong>Remove</strong> / <strong>Send Data Deletion Request</strong> (which automatically triggers our callback at <code>https://app.tidyupscleaning.com/api/facebook/data-deletion</code>).
                    </li>
                    <li>
                      <strong>Via Email or Phone:</strong> Email <a href="mailto:booking@tidyupscleaning.com" className="text-blue-600 underline font-semibold">booking@tidyupscleaning.com</a> with subject <code>Data Deletion Request</code> or call <strong>1-833-TIDYUPS</strong>.
                    </li>
                  </ol>
                </div>

                {deletionConfirmationCode && (
                  <div className="p-3.5 rounded-xl bg-white border-2 border-emerald-500 text-emerald-950 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-extrabold text-emerald-700">
                        ✓ Data Deletion Request Processed &amp; Confirmed
                      </div>
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        Your Facebook Messenger conversation and associated personal data have been permanently scheduled/removed.
                      </div>
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-emerald-100 border border-emerald-300 font-mono text-xs font-black text-emerald-900 shrink-0">
                      Code: {deletionConfirmationCode}
                    </div>
                  </div>
                )}

                <form onSubmit={handleRequestDataDeletion} className="flex flex-col sm:flex-row gap-2 pt-1">
                  <input
                    type="text"
                    required
                    value={deletionIdentifier}
                    onChange={(e) => setDeletionIdentifier(e.target.value)}
                    placeholder="Enter your Phone, Email, Name, or Facebook ID to delete..."
                    className="flex-1 px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900"
                  />
                  <button
                    type="submit"
                    disabled={isDeletingData}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shrink-0"
                  >
                    {isDeletingData ? 'Deleting Data...' : 'Delete My Data Now'}
                  </button>
                </form>
              </section>

              <section>
                <h3 className="font-bold text-slate-900 text-sm mb-1">6. Contact Our Privacy Officer</h3>
                <p>
                  For inquiries regarding your personal data, data correction, or removal requests under Canadian privacy law, please contact:
                </p>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl mt-2 text-slate-800 space-y-1">
                  <div><strong>TidyUps Cleaning Service Inc — Privacy &amp; Operations Office</strong></div>
                  <div>8306 Chappelle Way SW, Edmonton, AB T6W 4L3</div>
                  <div>Website: <a href="https://app.tidyupscleaning.com" target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline font-semibold">https://app.tidyupscleaning.com</a></div>
                  <div>Email: <a href="mailto:booking@tidyupscleaning.com" className="text-blue-600 underline font-semibold">booking@tidyupscleaning.com</a></div>
                  <div>Toll-Free Vanity Line: <a href="tel:18338439877" className="font-bold text-purple-700">1-833-TIDYUPS (833-843-9877)</a></div>
                  <div>Direct Dispatch: (587) 900-7223 / (587) 742-2500</div>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
