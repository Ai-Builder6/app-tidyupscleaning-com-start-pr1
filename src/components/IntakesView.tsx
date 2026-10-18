import React, { useState, useMemo } from 'react';
import {
  ClipboardList,
  Mic,
  Phone,
  MapPin,
  BedDouble,
  Bath,
  Sparkles,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Search,
  Calendar,
  FileText,
  Send,
  ExternalLink,
  User,
  Clock,
  Plus,
  ShieldAlert,
} from 'lucide-react';
import { ServiceTicket } from '../types/dispatch';
import { JobberQuote } from '../services/jobberSyncModules';
import { AdLeadItem } from '../types/lead';

export interface IntakeRecord {
  id: string;
  customerName: string;
  phone: string;
  email?: string;
  address: string;
  city?: string;
  serviceType: string;
  bedrooms: string;
  bathrooms: string;
  specificInfo: string;
  quotedPrice?: number;
  hours?: number;
  createdAt: string;
  source: 'Voice Dictation' | 'Customer Request Form' | 'Quick Quote' | 'Jobber Sync';
  status: 'NEW_INTAKE' | 'QUOTED' | 'BOOKED_IN_SYSTEM' | 'JOBBER_SYNCED';
  jobberRef?: string;
}

interface IntakesViewProps {
  tickets: ServiceTicket[];
  quotes: JobberQuote[];
  leads: AdLeadItem[];
  onOpenVoiceIntake: (prefill?: Partial<AdLeadItem>) => void;
  onSelectOnMap?: (address: string) => void;
  onNavigateToSchedule?: () => void;
  onBackToManagement?: () => void;
  onBookingSubmitted?: (ticket: ServiceTicket) => void;
  onOpenSpamShield?: (num?: string) => void;
}

function extractBedBathFromText(text: string): { bedrooms: string; bathrooms: string; cleanNotes: string } {
  const lower = (text || '').toLowerCase();
  let bedrooms = '3 Bedrooms';
  let bathrooms = '2 Bathrooms';

  const bedMatch = lower.match(/(\d+\+?)\s*(?:bed|bd|br|bedroom)/i);
  if (bedMatch) {
    const n = bedMatch[1];
    bedrooms = n === '1' ? '1 Bedroom' : `${n} Bedrooms`;
  }

  const bathMatch = lower.match(/(\d+(?:\.5)?\+?)\s*(?:bath|ba|bathroom)/i);
  if (bathMatch) {
    const n = bathMatch[1];
    bathrooms = n === '1' ? '1 Bathroom' : `${n} Bathrooms`;
  }

  return {
    bedrooms,
    bathrooms,
    cleanNotes: text || 'Standard checklist requested',
  };
}

export const IntakesView: React.FC<IntakesViewProps> = ({
  tickets = [],
  quotes = [],
  leads = [],
  onOpenVoiceIntake,
  onSelectOnMap,
  onNavigateToSchedule,
  onBackToManagement,
  onBookingSubmitted,
  onOpenSpamShield,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState<string>('ALL');
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  // Build unified intake records from Quotes, Tickets, and Leads (deduplicated so each intake only appears once)
  const intakeRecords = useMemo<IntakeRecord[]>(() => {
    const list: IntakeRecord[] = [];
    const seenKeys = new Set<string>();

    const makeKey = (name?: string, phone?: string) => {
      const n = (name || '').trim().toLowerCase();
      const p = (phone || '').replace(/\D/g, '').slice(-10);
      return n || p || `anon-${Math.random()}`;
    };

    // 1. From Quotes (Quick Quote & Voice Intake quotes — prioritized first)
    quotes.forEach((q) => {
      const key = makeKey(q.clientName, q.clientPhone);
      if (seenKeys.has(key)) return;
      seenKeys.add(key);

      const parsed = extractBedBathFromText(`${q.service || ''} ${q.notes || ''}`);
      list.push({
        id: `intake-quote-${q.id}`,
        customerName: q.clientName || 'Phone Lead',
        phone: q.clientPhone || '(780) 555-0199',
        email: q.clientEmail,
        address: q.serviceAddress || 'Edmonton, AB',
        city: 'Edmonton',
        serviceType: q.service || 'Residential Standard Cleaning',
        bedrooms: q.bedrooms || parsed.bedrooms,
        bathrooms: q.bathrooms || parsed.bathrooms,
        specificInfo: q.notes || 'Quick quote generated from phone intake.',
        quotedPrice: q.total,
        createdAt: (q as any).createdDate || q.createdAt || 'Today',
        source: 'Quick Quote',
        status: 'JOBBER_SYNCED',
        jobberRef: q.quoteNumber,
      });
    });

    // 2. From Service Tickets (Customer Portal + Voice Dictation tickets) if not already in Quotes
    tickets.forEach((t) => {
      const key = makeKey(t.customerName, (t as any).phone || t.customerPhone);
      if (seenKeys.has(key)) return;
      seenKeys.add(key);

      const parsed = extractBedBathFromText(`${t.equipmentModel || ''} ${t.issueDescription || ''} ${t.accessNotes || ''}`);
      list.push({
        id: `intake-ticket-${t.id}`,
        customerName: t.customerName || 'Residential Caller',
        phone: (t as any).phone || t.customerPhone || '(780) 555-0199',
        address: t.location?.address || 'Edmonton, AB',
        city: 'Edmonton',
        serviceType: t.equipmentType || 'Residential Standard Cleaning',
        bedrooms: parsed.bedrooms,
        bathrooms: parsed.bathrooms,
        specificInfo: t.issueDescription || t.accessNotes || 'No extra access notes specified.',
        createdAt: t.createdAt || 'Today',
        source: t.faultCode?.includes('WEB') ? 'Customer Request Form' : 'Voice Dictation',
        status: t.assignedTechId ? 'BOOKED_IN_SYSTEM' : 'NEW_INTAKE',
        jobberRef: t.faultCode || 'JOBBER-READY',
      });
    });

    // 3. From Ad/Phone Leads if not already represented
    leads.slice(0, 15).forEach((l) => {
      const key = makeKey(l.customerName, l.phone);
      if (seenKeys.has(key)) return;
      seenKeys.add(key);

      const parsed = extractBedBathFromText(`${l.serviceRequested || ''} ${l.notes || ''}`);
      list.push({
        id: `intake-lead-${l.id}`,
        customerName: l.customerName,
        phone: l.phone,
        email: l.email,
        address: l.address || 'Edmonton, AB',
        city: 'Edmonton',
        serviceType: l.serviceRequested || 'Residential Standard Cleaning',
        bedrooms: l.bedrooms || parsed.bedrooms,
        bathrooms: l.bathrooms || parsed.bathrooms,
        specificInfo: l.notes || 'Caller requested quick quote and availability.',
        quotedPrice: l.quotedAmount,
        createdAt: (l as any).timestamp || (l as any).createdAt || 'Recent',
        source: 'Voice Dictation',
        status: l.isJobberSynced ? 'JOBBER_SYNCED' : 'NEW_INTAKE',
        jobberRef: l.quoteNumber || 'INTAKE',
      });
    });

    return list;
  }, [tickets, quotes, leads]);

  const filteredIntakes = useMemo(() => {
    return intakeRecords.filter((item) => {
      if (filterSource !== 'ALL' && item.source !== filterSource) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.customerName.toLowerCase().includes(q) ||
        item.phone.toLowerCase().includes(q) ||
        item.address.toLowerCase().includes(q) ||
        item.serviceType.toLowerCase().includes(q) ||
        item.bedrooms.toLowerCase().includes(q) ||
        item.bathrooms.toLowerCase().includes(q) ||
        item.specificInfo.toLowerCase().includes(q)
      );
    });
  }, [intakeRecords, filterSource, searchQuery]);

  const handleSendIntakeToBookingSystem = async (item: IntakeRecord) => {
    setSendingId(item.id);
    setFeedbackBanner(null);
    try {
      const res = await fetch('/api/public/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: item.customerName,
          customerPhone: item.phone,
          customerEmail: item.email || '',
          serviceType: `${item.serviceType} (${item.bedrooms}, ${item.bathrooms})`,
          address: item.address,
          city: item.city || 'Edmonton',
          bedrooms: item.bedrooms,
          bathrooms: item.bathrooms,
          preferredDate: new Date().toISOString().slice(0, 10),
          preferredTime: 'Morning (8:00 AM - 12:00 PM)',
          specialInstructions: item.specificInfo,
        }),
      });
      const data = await res.json();
      if (data?.success) {
        setFeedbackBanner(
          `✓ Sent ${item.customerName} (${item.bedrooms}, ${item.bathrooms}) to Booking System & Jobber (#${data.jobberJobId})!`
        );
        if (data.ticket && onBookingSubmitted) {
          onBookingSubmitted(data.ticket);
        }
      }
    } catch (err: any) {
      setFeedbackBanner(`Error sending intake: ${err.message}`);
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0d0f17] text-slate-100 min-h-screen p-4 sm:p-6 lg:p-8 space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          {onBackToManagement && (
            <button
              onClick={onBackToManagement}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
              title="Back to Management Hub"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-pink-600 to-purple-600 text-white flex items-center justify-center shadow-lg">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Customer Intakes &amp; Voice Dictation Log
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-pink-950 text-pink-300 border border-pink-800">
                {filteredIntakes.length} Intakes
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Complete property intake records with Name, Phone, Address, Cleaning Type, Bedrooms, Bathrooms &amp; Specific Instructions synced with Jobber.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => onOpenVoiceIntake()}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 via-fuchsia-600 to-purple-600 hover:opacity-95 text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-lg cursor-pointer active:scale-95"
          >
            <Mic className="w-4 h-4" />
            <span>+ New Live Voice Dictation &amp; Quick Quote</span>
          </button>
        </div>
      </div>

      {feedbackBanner && (
        <div className="p-4 rounded-2xl bg-emerald-950/90 border border-emerald-700 text-emerald-200 text-xs sm:text-sm font-bold flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{feedbackBanner}</span>
          </div>
          {onNavigateToSchedule && (
            <button
              onClick={onNavigateToSchedule}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold cursor-pointer"
            >
              Open Schedule →
            </button>
          )}
        </div>
      )}

      {/* Search & Source Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#151923] p-4 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search intakes by caller name, phone, address, bedrooms, bathrooms, or notes..."
            className="w-full pl-10 pr-4 py-2 bg-[#0e1118] border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {['ALL', 'Voice Dictation', 'Quick Quote', 'Customer Request Form'].map((src) => (
            <button
              key={src}
              onClick={() => setFilterSource(src)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                filterSource === src
                  ? 'bg-pink-600 text-white border-pink-500 shadow-sm'
                  : 'bg-[#0e1118] text-slate-300 border-slate-700/80 hover:border-slate-600'
              }`}
            >
              {src === 'ALL' ? 'All Intakes' : src}
            </button>
          ))}
        </div>
      </div>

      {/* Intakes Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredIntakes.map((item) => (
          <div
            key={item.id}
            className="bg-[#151923] border border-slate-800 hover:border-pink-500/40 rounded-3xl p-5 flex flex-col justify-between space-y-4 shadow-xl transition-all"
          >
            <div className="space-y-3">
              {/* Top Row: Source Badge & Jobber Ref */}
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-pink-500/15 text-pink-300 border border-pink-500/30">
                  {item.source}
                </span>
                <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/70 px-2.5 py-0.5 rounded-lg border border-emerald-800/70">
                  {item.jobberRef || 'JOBBER-SYNC'}
                </span>
              </div>

              {/* Caller Name, Phone & Quoted Price */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-1.5">
                    <User className="w-4 h-4 text-pink-400 shrink-0" />
                    <span>{item.customerName}</span>
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <a
                      href={`tel:${item.phone}`}
                      className="text-xs font-mono font-bold text-slate-300 hover:text-pink-400 flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{item.phone}</span>
                    </a>
                    {onOpenSpamShield && item.phone && (
                      <button
                        type="button"
                        onClick={() => onOpenSpamShield(item.phone)}
                        className="px-2 py-0.5 rounded-md bg-rose-950/60 hover:bg-rose-900 border border-rose-800/80 text-rose-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Block this caller or area code in Twilio Spam Shield"
                      >
                        <ShieldAlert className="w-3 h-3 text-rose-400" />
                        <span>Block</span>
                      </button>
                    )}
                  </div>
                </div>
                {item.quotedPrice && (
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Quoted</span>
                    <span className="text-lg font-black font-mono text-pink-400">
                      ${item.quotedPrice.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              {/* Address */}
              <div className="p-2.5 rounded-xl bg-[#0e1118] border border-slate-800/90 text-xs flex items-start gap-2">
                <MapPin className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <span className="text-slate-200 font-medium leading-snug">{item.address}</span>
              </div>

              {/* Cleaning Type + Bedrooms & Bathrooms Badges */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-pink-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                  <span className="truncate">{item.serviceType}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="px-3 py-1.5 rounded-xl bg-pink-950/30 border border-pink-800/40 text-xs font-bold text-pink-200 flex items-center gap-1.5">
                    <BedDouble className="w-3.5 h-3.5 text-pink-400" />
                    <span>{item.bedrooms}</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-purple-950/30 border border-purple-800/40 text-xs font-bold text-purple-200 flex items-center gap-1.5">
                    <Bath className="w-3.5 h-3.5 text-purple-400" />
                    <span>{item.bathrooms}</span>
                  </div>
                </div>
              </div>

              {/* Specific Information / Notes */}
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Specific Information &amp; Notes:
                </span>
                <p className="text-xs text-slate-200 line-clamp-3 leading-relaxed">
                  {item.specificInfo}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  onOpenVoiceIntake({
                    id: item.id,
                    customerName: item.customerName,
                    phone: item.phone,
                    email: item.email || '',
                    address: item.address,
                    serviceRequested: item.serviceType,
                    notes: `${item.bedrooms}, ${item.bathrooms}. ${item.specificInfo}`,
                    source: (item.source as any) || 'Phone call',
                    dateReceived: item.createdAt,
                    city: item.city || 'Edmonton',
                    status: 'New',
                  })
                }
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Mic className="w-3.5 h-3.5 text-pink-400" />
                <span>Open in Quote/Voice</span>
              </button>

              <button
                type="button"
                disabled={sendingId === item.id}
                onClick={() => handleSendIntakeToBookingSystem(item)}
                className="py-2 px-3 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-95 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sendingId === item.id ? 'Sending...' : 'Send to Booking'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
