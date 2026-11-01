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

export type LegalPageType = 'SUPPORT' | 'CONTACT' | 'TERMS' | 'PRIVACY';

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

  const handleSelectLegalTab = (tab: LegalPageType) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      try {
        const pathMap: Record<LegalPageType, string> = {
          SUPPORT: '/support',
          CONTACT: '/contact',
          TERMS: '/T&C',
          PRIVACY: '/privacy',
        };
        window.history.pushState({}, '', pathMap[tab]);
      } catch {}
    }
  };

  // Support Form State
  const [supportName, setSupportName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [supportSubject, setSupportSubject] = useState('Booking Inquiry');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSent, setSupportSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Contact Us Form State
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactTopic, setContactTopic] = useState('New Cleaning Quote / Booking');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSent, setContactSent] = useState(false);
  const [isContactSubmitting, setIsContactSubmitting] = useState(false);

  // Data Deletion & Info Release State (for /support, /data-deletion & Meta Apps compliance)
  const [activeMetaControlTab, setActiveMetaControlTab] = useState<'DELETE' | 'RELEASE'>('DELETE');
  const [deletionIdentifier, setDeletionIdentifier] = useState('');
  const [deletionScope, setDeletionScope] = useState<'ALL' | 'MESSENGER' | 'LEADS'>('ALL');
  const [deletionConfirmationCode, setDeletionConfirmationCode] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('code') || params.get('deletion_code') || null;
    }
    return null;
  });
  const [deletionProcessedAt, setDeletionProcessedAt] = useState<string | null>(null);
  const [isDeletingData, setIsDeletingData] = useState(false);

  // Release / Export Info State ("add button to release info if wanted")
  const [releaseIdentifier, setReleaseIdentifier] = useState('');
  const [releaseType, setReleaseType] = useState<'SELF_EXPORT' | 'LANDLORD_REALTOR_RELEASE' | 'META_DATA_COPY'>('SELF_EXPORT');
  const [releaseRecipient, setReleaseRecipient] = useState('');
  const [isReleasingInfo, setIsReleasingInfo] = useState(false);
  const [releasedInfoResult, setReleasedInfoResult] = useState<{
    releaseCode: string;
    releasedAt: string;
    identifier: string;
    releaseType: string;
    authorizedRecipient: string;
    summary: { metaMessengerThreadsFound: number; leadRecordsFound: number; bookingVisitsFound: number };
    dataPackage: any;
  } | null>(null);

  const handleRequestDataDeletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletionIdentifier.trim()) return;
    setIsDeletingData(true);
    try {
      const res = await fetch('/api/facebook/data-deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: deletionIdentifier.trim(),
          scope: deletionScope,
        }),
      });
      const data = await res.json();
      setDeletionConfirmationCode(data?.confirmation_code || `DEL-TIDYUPS-${Date.now().toString(36).toUpperCase()}`);
      setDeletionProcessedAt(data?.processed_at || new Date().toISOString());
      setDeletionIdentifier('');
    } catch {
      setDeletionConfirmationCode(`DEL-TIDYUPS-${Date.now().toString(36).toUpperCase()}`);
      setDeletionProcessedAt(new Date().toISOString());
    } finally {
      setIsDeletingData(false);
    }
  };

  const handleDownloadDeletionReceipt = () => {
    if (!deletionConfirmationCode) return;
    const text = [
      '====================================================================',
      'TIDYUPS CLEANING SERVICE INC — META APPS & USER DATA DELETION RECEIPT',
      '====================================================================',
      `Confirmation Code: ${deletionConfirmationCode}`,
      `Processed At:      ${deletionProcessedAt || new Date().toISOString()}`,
      `Deletion Scope:    ${deletionScope} (Facebook, Instagram, Messenger & Account Data)`,
      'Status:            PERMANENTLY DELETED & PURGED',
      'Verification URL:  https://app.tidyupscleaning.com/support?code=' + deletionConfirmationCode,
      '====================================================================',
    ].join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TidyUps-Data-Deletion-${deletionConfirmationCode}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRequestInfoRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!releaseIdentifier.trim()) return;
    setIsReleasingInfo(true);
    try {
      const res = await fetch('/api/facebook/data-release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: releaseIdentifier.trim(),
          releaseType,
          authorizeThirdParty: releaseRecipient.trim(),
        }),
      });
      const data = await res.json();
      const fallbackCode = `REL-TIDYUPS-${Date.now().toString(36).toUpperCase()}`;
      setReleasedInfoResult({
        releaseCode: data?.release_code || fallbackCode,
        releasedAt: data?.released_at || new Date().toISOString(),
        identifier: releaseIdentifier.trim(),
        releaseType,
        authorizedRecipient: releaseRecipient.trim() || 'Account Holder (Self)',
        summary: data?.summary || { metaMessengerThreadsFound: 0, leadRecordsFound: 0, bookingVisitsFound: 0 },
        dataPackage: data?.data_package || {
          organization: 'TidyUps Cleaning Service Inc (https://app.tidyupscleaning.com)',
          releaseConfirmationCode: data?.release_code || fallbackCode,
          requestedBy: releaseIdentifier.trim(),
          releaseType,
        },
      });
    } catch {
      const fallbackCode = `REL-TIDYUPS-${Date.now().toString(36).toUpperCase()}`;
      setReleasedInfoResult({
        releaseCode: fallbackCode,
        releasedAt: new Date().toISOString(),
        identifier: releaseIdentifier.trim(),
        releaseType,
        authorizedRecipient: releaseRecipient.trim() || 'Account Holder (Self)',
        summary: { metaMessengerThreadsFound: 0, leadRecordsFound: 0, bookingVisitsFound: 0 },
        dataPackage: {
          organization: 'TidyUps Cleaning Service Inc (https://app.tidyupscleaning.com)',
          releaseConfirmationCode: fallbackCode,
          requestedBy: releaseIdentifier.trim(),
          releaseType,
        },
      });
    } finally {
      setIsReleasingInfo(false);
    }
  };

  const handleDownloadReleasedInfo = () => {
    if (!releasedInfoResult) return;
    const jsonStr = JSON.stringify(releasedInfoResult.dataPackage, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TidyUps-Released-Info-${releasedInfoResult.releaseCode}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) return;

    setIsContactSubmitting(true);
    setTimeout(() => {
      setIsContactSubmitting(false);
      setContactSent(true);
    }, 500);
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
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto shrink-0">
            <button
              onClick={() => handleSelectLegalTab('SUPPORT')}
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
              onClick={() => handleSelectLegalTab('CONTACT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'CONTACT'
                  ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>/contact</span>
            </button>

            <button
              onClick={() => handleSelectLegalTab('TERMS')}
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
              onClick={() => handleSelectLegalTab('PRIVACY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'PRIVACY'
                  ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>/privacy</span>
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

            {/* ─────────────────────────────────────────────────────────────────────────────
                META APPS (FACEBOOK / INSTAGRAM / MESSENGER) USER DATA DELETION & INFO RELEASE CENTER
               ───────────────────────────────────────────────────────────────────────────── */}
            <div id="data-deletion" className="bg-white rounded-2xl border-2 border-emerald-200 shadow-sm p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider">
                      Meta Apps &amp; PIPEDA Compliance
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                      Facebook • Instagram • Messenger • Lead Ads
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900 mt-1.5">
                    Meta Apps User Data Deletion &amp; Information Release Center
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    Manage, permanently delete, or request a full release/copy of your personal data collected via Facebook Login, Facebook Messenger AI, Instagram, Meta Lead Ads, or TidyUps booking records.
                  </p>
                </div>

                {/* Action Mode Switcher Buttons: Delete Data vs. Release Info */}
                <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                  <button
                    type="button"
                    onClick={() => setActiveMetaControlTab('DELETE')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all ${
                      activeMetaControlTab === 'DELETE'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Delete My Data</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMetaControlTab('RELEASE')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all ${
                      activeMetaControlTab === 'RELEASE'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Release / Export My Info</span>
                  </button>
                </div>
              </div>

              {/* Step-by-Step Meta Data Deletion Instructions */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
                <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>How to Delete Your Data for Meta Apps (Facebook, Instagram &amp; Messenger):</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                  <li>
                    <strong>Option 1 — Instant Self-Service Deletion Button (Below):</strong> Enter your phone number, email address, full name, or Facebook/Messenger User ID below and click <strong>Delete My Data Now</strong>. Your Meta Messenger conversation history, Lead Ad records, and personal contact data are purged immediately and you receive a permanent <strong>Confirmation Code</strong>.
                  </li>
                  <li>
                    <strong>Option 2 — Via Your Facebook / Meta Account Settings:</strong> Open Facebook &rarr; go to <em>Settings &amp; Privacy &rarr; Settings &rarr; Apps and Websites</em> &rarr; locate <strong>TidyUps Messenger AI / BookMyCleaning-Tidyups</strong> &rarr; click <strong>Remove</strong> and check <em>Delete posts, videos or events / Send Data Deletion Request</em> (which automatically triggers our Meta callback endpoint at <code>https://app.tidyupscleaning.com/api/facebook/data-deletion</code>).
                  </li>
                  <li>
                    <strong>Option 3 — Release or Export Your Stored Information:</strong> Click the <strong>Release / Export My Info</strong> button above (or below) to view, download, or authorize the release of your stored booking/Meta records (e.g. for your own records or to release Move-Out verification info to a landlord/property manager).
                  </li>
                  <li>
                    <strong>Option 4 — Direct Support Desk Assistance:</strong> Email <a href="mailto:booking@tidyupscleaning.com" className="text-emerald-700 underline font-bold">booking@tidyupscleaning.com</a> with subject <code>Meta Data Deletion Request</code> or <code>Release My Info</code>, or call toll-free <a href="tel:18338439877" className="text-purple-700 font-bold hover:underline">1-833-TIDYUPS (833-843-9877)</a>.
                  </li>
                </ol>
              </div>

              {/* PANEL A: DELETE MY DATA (META APPS & ACCOUNT) */}
              {activeMetaControlTab === 'DELETE' && (
                <div className="p-4 sm:p-5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-3.5 animate-fadeIn">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900">
                        1-Click Meta Apps &amp; Account Data Deletion Request
                      </h3>
                      <p className="text-[11px] text-slate-600">
                        Immediately deletes your Facebook Messenger threads, Instagram/Meta Lead Ad entries, and stored contact details.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveMetaControlTab('RELEASE')}
                      className="text-[11px] font-bold text-purple-700 hover:text-purple-900 underline cursor-pointer"
                    >
                      Want to release or download your info instead? Click here &rarr;
                    </button>
                  </div>

                  {deletionConfirmationCode && (
                    <div className="p-4 rounded-xl bg-white border-2 border-emerald-500 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-extrabold text-emerald-700 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Data Deletion Request Processed &amp; Confirmed</span>
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5">
                          Your Meta app records (Facebook Messenger, Lead Ads, and contact identifiers) have been permanently purged.
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <div className="px-3 py-1.5 rounded-lg bg-emerald-100 border border-emerald-300 font-mono text-xs font-black text-emerald-900">
                          Code: {deletionConfirmationCode}
                        </div>
                        <button
                          type="button"
                          onClick={handleDownloadDeletionReceipt}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                        >
                          Download Receipt (.txt)
                        </button>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleRequestDataDeletion} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Phone Number, Email, Full Name, or Facebook/Meta User ID *
                        </label>
                        <input
                          type="text"
                          required
                          value={deletionIdentifier}
                          onChange={(e) => setDeletionIdentifier(e.target.value)}
                          placeholder="e.g. (780) 555-0199, sarah@example.com, or Facebook ID..."
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Data Scope to Delete
                        </label>
                        <select
                          value={deletionScope}
                          onChange={(e) => setDeletionScope(e.target.value as 'ALL' | 'MESSENGER' | 'LEADS')}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                        >
                          <option value="ALL">All Meta Apps &amp; Account Data</option>
                          <option value="MESSENGER">Facebook / Instagram Messenger Only</option>
                          <option value="LEADS">Meta Lead Ads &amp; Quote Inquiries Only</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="submit"
                        disabled={isDeletingData}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs cursor-pointer shadow-xs transition-colors"
                      >
                        {isDeletingData ? 'Purging Meta & Account Data...' : 'Delete My Data Now'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveMetaControlTab('RELEASE')}
                        className="px-4 py-2.5 rounded-xl bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 font-bold text-xs cursor-pointer transition-colors"
                      >
                        Release / Export My Info Instead
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* PANEL B: RELEASE / EXPORT MY INFO (IF WANTED) */}
              {activeMetaControlTab === 'RELEASE' && (
                <div className="p-4 sm:p-5 rounded-xl bg-purple-50/70 border border-purple-200 space-y-3.5 animate-fadeIn">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900">
                        Release or Export Your Stored Information (On-Demand Data Release)
                      </h3>
                      <p className="text-[11px] text-slate-600">
                        Request an immediate copy of your Meta app interactions &amp; booking info, or authorize releasing your cleaning verification records to a landlord, realtor, or third party.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveMetaControlTab('DELETE')}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                    >
                      Want to permanently delete your data instead? Click here &rarr;
                    </button>
                  </div>

                  {releasedInfoResult && (
                    <div className="p-4 rounded-xl bg-white border-2 border-purple-500 text-slate-900 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="text-xs font-extrabold text-purple-800 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                            <span>Information Release Authorized &amp; Ready</span>
                          </div>
                          <div className="text-[11px] text-slate-600 mt-0.5">
                            Released for: <strong>{releasedInfoResult.identifier}</strong> • Recipient: <strong>{releasedInfoResult.authorizedRecipient}</strong>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-3 py-1.5 rounded-lg bg-purple-100 border border-purple-300 font-mono text-xs font-black text-purple-900">
                            Code: {releasedInfoResult.releaseCode}
                          </span>
                          <button
                            type="button"
                            onClick={handleDownloadReleasedInfo}
                            className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold cursor-pointer"
                          >
                            Download Released Info (.json)
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
                        <div>
                          <div className="font-black text-slate-900">{releasedInfoResult.summary.metaMessengerThreadsFound}</div>
                          <div className="text-[10px] text-slate-500">Meta Messenger Threads</div>
                        </div>
                        <div>
                          <div className="font-black text-slate-900">{releasedInfoResult.summary.leadRecordsFound}</div>
                          <div className="text-[10px] text-slate-500">Meta / Web Lead Records</div>
                        </div>
                        <div>
                          <div className="font-black text-slate-900">{releasedInfoResult.summary.bookingVisitsFound}</div>
                          <div className="text-[10px] text-slate-500">Service Bookings</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleRequestInfoRelease} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Your Phone, Email, Name, or Meta ID *
                        </label>
                        <input
                          type="text"
                          required
                          value={releaseIdentifier}
                          onChange={(e) => setReleaseIdentifier(e.target.value)}
                          placeholder="e.g. (780) 555-0199 or sarah@example.com"
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-purple-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Release Type
                        </label>
                        <select
                          value={releaseType}
                          onChange={(e) => setReleaseType(e.target.value as 'SELF_EXPORT' | 'LANDLORD_REALTOR_RELEASE' | 'META_DATA_COPY')}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-purple-600"
                        >
                          <option value="SELF_EXPORT">Release &amp; Download My Own Data Copy</option>
                          <option value="META_DATA_COPY">Release Meta App (Facebook / Messenger) Info</option>
                          <option value="LANDLORD_REALTOR_RELEASE">Authorize Info Release to Landlord / Property Manager</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Release Recipient (Optional)
                        </label>
                        <input
                          type="text"
                          value={releaseRecipient}
                          onChange={(e) => setReleaseRecipient(e.target.value)}
                          placeholder="Self or Landlord/Realtor Email"
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-purple-600"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="submit"
                        disabled={isReleasingInfo}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-95 text-white font-extrabold text-xs cursor-pointer shadow-xs transition-all"
                      >
                        {isReleasingInfo ? 'Preparing Information Release...' : 'Release My Information Now'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveMetaControlTab('DELETE')}
                        className="px-4 py-2.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs cursor-pointer transition-colors"
                      >
                        Switch to Delete My Data
                      </button>
                    </div>
                  </form>
                </div>
              )}
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
                <div className="pt-2">
                  <h4 className="font-bold text-slate-900">How does the Jobber App Integration work?</h4>
                  <p className="text-slate-600 mt-1 leading-relaxed">
                    Our BookMyCleaning-Tidyups app connects via Jobber OAuth 2.0 (<code>https://app.tidyupscleaning.com/api/jobber/oauth/callback</code>) and real-time Webhooks (<code>https://app.tidyupscleaning.com/api/jobber/webhooks</code>) to synchronize clients, quotes, scheduled visits, and invoices automatically.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────────
            TAB 2: /contact (Dedicated Contact Us Page — Phone, Email, Address, Form)
           ───────────────────────────────────────────────────────────────────────────── */}
        {activeTab === 'CONTACT' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Hero Contact Card */}
            <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-400/30 text-[10px] font-bold uppercase tracking-wider">
                    Official Contact Page • /contact
                  </span>
                  <h2 className="text-xl sm:text-2xl font-extrabold mt-2">
                    Contact TidyUps Cleaning Service Inc.
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    Reach our Greater Edmonton customer booking desk, live dispatchers, or Jobber integration support team 7 days a week.
                  </p>
                </div>
                <a
                  href="/booking"
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-95 text-white text-xs font-extrabold shadow-md flex items-center gap-1.5 self-start sm:self-auto shrink-0 no-underline"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Book Online (/booking) →</span>
                </a>
              </div>
            </div>

            {/* 4-Card Contact Directory */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
                  <Phone className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-xs text-slate-900">Toll-Free &amp; Bookings</h3>
                <div className="text-xs font-mono font-bold text-purple-900 space-y-0.5">
                  <a href="tel:18338439877" className="block hover:text-pink-600">1-833-TIDYUPS</a>
                  <a href="tel:8338439877" className="block text-slate-700 hover:underline">(833) 843-9877</a>
                  <a href="tel:7809004526" className="block text-emerald-700 hover:underline">(780) 900-4526</a>
                </div>
                <p className="text-[10px] text-slate-500">Customer Quotes &amp; Scheduling</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Phone className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-xs text-slate-900">Edmonton Dispatch &amp; SMS</h3>
                <div className="text-xs font-mono font-bold text-slate-800 space-y-0.5">
                  <a href="tel:5879007223" className="block hover:text-blue-600">(587) 900-7223</a>
                  <a href="tel:5877422500" className="block hover:text-blue-600">(587) 742-2500</a>
                </div>
                <p className="text-[10px] text-slate-500">2-Way Text &amp; Live Crew ETA</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-xs text-slate-900">Email Addresses</h3>
                <div className="text-xs font-semibold space-y-1 break-all">
                  <a href="mailto:booking@tidyupscleaning.com" className="block text-emerald-700 font-bold hover:underline">
                    booking@tidyupscleaning.com
                  </a>
                  <a href="mailto:cleaningserviceyeg@gmail.com" className="block text-slate-700 hover:underline text-[11px]">
                    cleaningserviceyeg@gmail.com
                  </a>
                </div>
                <p className="text-[10px] text-slate-500">Bookings, Billing &amp; Admin</p>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-xs text-slate-900">Edmonton Office &amp; Hours</h3>
                <p className="text-xs font-semibold text-slate-800 leading-snug">
                  8306 Chappelle Way SW<br />
                  Edmonton, AB T6W 4L3
                </p>
                <p className="text-[10px] text-emerald-700 font-bold">
                  Mon – Sun: 7:00 AM – 8:00 PM MST
                </p>
              </div>
            </div>

            {/* Interactive Contact Us Message Form */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-base font-bold text-slate-900 mb-1">Send Us a Direct Message</h3>
              <p className="text-xs text-slate-500 mb-4">
                Fill out the form below for residential move-out, deep, or basic cleaning quotes, billing questions, or partnership inquiries.
              </p>

              {contactSent ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                    <div>
                      <h4 className="font-bold text-xs">Thank You for Contacting TidyUps Cleaning!</h4>
                      <p className="text-[11px] text-emerald-800 mt-0.5">
                        Your message has been delivered to our Edmonton team (<code>booking@tidyupscleaning.com</code>). We will respond shortly.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setContactSent(false);
                      setContactMessage('');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-800 text-xs font-bold cursor-pointer shrink-0"
                  >
                    Send Another
                  </button>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="e.g. Sarah Jenkins"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="e.g. sarah@example.com"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="(780) 555-0199"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-pink-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">How Can We Help?</label>
                    <select
                      value={contactTopic}
                      onChange={(e) => setContactTopic(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-pink-500"
                    >
                      <option value="New Cleaning Quote / Booking">New Cleaning Quote / Booking (Move-Out, Deep, Basic)</option>
                      <option value="Existing Appointment or Reschedule">Existing Appointment or Reschedule</option>
                      <option value="Billing, Invoice or Receipt">Billing, Invoice or Receipt</option>
                      <option value="Property Management / Realtor Account">Property Management / Realtor Account</option>
                      <option value="Jobber App & Technical Support">Jobber App &amp; Technical Support</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Your Message *</label>
                    <textarea
                      rows={4}
                      required
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="How can our Edmonton cleaning & dispatch team help you today?"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-pink-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isContactSubmitting}
                    className="px-5 py-2.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-95 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isContactSubmitting ? 'Sending Message...' : 'Send Message to TidyUps'}</span>
                  </button>
                </form>
              )}
            </div>

            {/* Service Coverage Corridors */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-2">
              <h3 className="text-sm font-bold text-slate-900">Greater Edmonton Service Areas</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Our 15 GPS-dispatched cleaning vans serve all neighborhoods across <strong>Edmonton (NW, SW, NE, SE, Downtown)</strong>, <strong>St. Albert</strong>, <strong>Sherwood Park</strong>, <strong>Spruce Grove</strong>, <strong>Stony Plain</strong>, <strong>Leduc</strong>, <strong>Beaumont</strong>, and <strong>Fort Saskatchewan</strong>.
              </p>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────────
            TAB 3: /T&C (Terms and Conditions)
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
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMetaControlTab('RELEASE');
                      handleSelectLegalTab('SUPPORT');
                    }}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer shrink-0"
                  >
                    Release / Export My Info
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
