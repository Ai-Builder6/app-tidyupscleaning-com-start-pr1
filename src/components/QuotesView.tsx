import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  ExternalLink,
  Search,
  Calendar,
  CheckCircle2,
  Plus,
  RefreshCw,
  Zap,
  Check,
  MessageSquare,
  FileSpreadsheet,
  MapPin,
  BedDouble,
  Bath,
  Phone,
  Users,
  Clock,
  SlidersHorizontal,
  Tag,
  ClipboardList,
  Sparkles,
} from 'lucide-react';
import { JobberQuote, extractJobberNumericId } from '../services/jobberSyncModules';
import { getCustomerIntelligence } from '../services/customerIntelligenceService';
import { CustomerIntelligenceBadge } from './CustomerIntelligenceBadge';
import { QuoteDetailModal } from './QuoteDetailModal';
import { ServiceCatalogModal } from './ServiceCatalogModal';
import { ServiceCatalogItem, CANONICAL_SERVICE_CATALOG, matchCatalogItem } from '../data/serviceCatalogData';

interface QuotesViewProps {
  quotes: JobberQuote[];
  onQuotesUpdated?: (quotes: JobberQuote[]) => void;
  onRefreshQuotes?: () => void;
  onBackToManagement?: () => void;
  onVisitCreated?: (newVisit: any) => void;
  calls?: any[];
  visits?: any[];
  clients?: any[];
  projectId?: 'dispatchgeeni' | 'tidyups';
  serviceCatalog?: ServiceCatalogItem[];
  onCatalogUpdated?: (newCatalog: ServiceCatalogItem[]) => void;
}

const AVAILABLE_CLEANERS = [
  'Cindy Guay',
  'Melissa Clarke',
  'Cheyenne',
  'Stacey',
  'Natalia',
];

function formatQuoteDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export const QuotesView: React.FC<QuotesViewProps> = ({
  quotes,
  onQuotesUpdated,
  onBackToManagement,
  onVisitCreated,
  calls = [],
  visits = [],
  clients = [],
  projectId = 'tidyups',
  serviceCatalog,
  onCatalogUpdated,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Service Catalog & Price List state
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [localCatalog, setLocalCatalog] = useState<ServiceCatalogItem[]>(serviceCatalog || CANONICAL_SERVICE_CATALOG);

  useEffect(() => {
    if (serviceCatalog && serviceCatalog.length > 0) {
      setLocalCatalog(serviceCatalog);
    }
  }, [serviceCatalog]);

  // Selected Quote for Jobber Detail, Adjustment, Schedule & Text Sender Modal
  const [selectedQuote, setSelectedQuote] = useState<JobberQuote | null>(null);

  // New Quote Modal state (Step 1 Client -> Step 2 Property + Bedrooms/Bathrooms -> Step 3 Draft Quote)
  const [isNewQuoteModalOpen, setIsNewQuoteModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newServiceAddress, setNewServiceAddress] = useState('');
  const [newService, setNewService] = useState('Move Out Cleaning Services 2026');
  const [newBedrooms, setNewBedrooms] = useState('3 Bedrooms');
  const [newBathrooms, setNewBathrooms] = useState('2 Bathrooms');
  const [newTotal, setNewTotal] = useState('354.38');
  const [newDiscount, setNewDiscount] = useState('0');
  const [newDeposit, setNewDeposit] = useState('50');
  const [newScheduledDate, setNewScheduledDate] = useState('');
  const [newScheduledTime, setNewScheduledTime] = useState('10:00');
  const [newAssignedCleaners, setNewAssignedCleaners] = useState<string[]>([]);
  const [newNotes, setNewNotes] = useState('');
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);
  const [selectedLineItems, setSelectedLineItems] = useState<any[]>([]);

  const handleSelectCatalogItemForNewQuote = (item: ServiceCatalogItem) => {
    setNewService(item.categoryLabel || item.name);
    if (item.bedrooms || item.beds) setNewBedrooms(item.bedrooms || item.beds || '2 Bedrooms');
    if (item.bathrooms || item.baths) setNewBathrooms(item.bathrooms || item.baths || '2 Bathrooms');
    const qty = item.quantity ?? item.baseHours ?? 1;
    const unitPrice = item.unitPrice ?? item.basePrice ?? 105;
    const total = item.total ?? (qty * unitPrice);
    setNewTotal(String(total));
    setNewDeposit(String(item.depositRequired));
    if (item.description) setNewNotes(item.description);
    setSelectedLineItems([
      {
        name: item.jobberItemName || item.name,
        description: item.description || `${item.name}\nQuantity: ${qty} @ $${unitPrice.toFixed(2)} = $${total.toFixed(2)} CAD`,
        quantity: qty,
        unitPrice: unitPrice,
        total: total,
      },
    ]);
    setSyncFeedback(`Applied line item: ${item.name} (${qty} @ $${unitPrice.toFixed(2)} = $${total.toFixed(2)} CAD)`);
  };

  const uniqueQuotes = React.useMemo(() => {
    const seenIds = new Set<string>();
    const seenNums = new Set<string>();
    const deduped = quotes.filter((q) => {
      if (!q) return false;
      const id = String(q.id || '').trim();
      const num = String(q.quoteNumber || '').trim();
      if ((id && seenIds.has(id)) || (num && seenNums.has(num))) return false;
      if (id) seenIds.add(id);
      if (num) seenNums.add(num);
      return true;
    });
    return [...deduped].sort((a, b) => {
      const aLocal = String(a.id || '').startsWith('quote_local_') ? 1 : 0;
      const bLocal = String(b.id || '').startsWith('quote_local_') ? 1 : 0;
      if (aLocal !== bLocal) return bLocal - aLocal;
      const numA = parseInt(String(a.quoteNumber || '').replace(/\D+/g, ''), 10) || 0;
      const numB = parseInt(String(b.quoteNumber || '').replace(/\D+/g, ''), 10) || 0;
      if (numB !== numA) return numB - numA;
      return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    });
  }, [quotes]);

  const filteredQuotes = uniqueQuotes.filter((q) => {
    const qStr = `${q.clientName} ${q.quoteNumber} ${q.service || ''} ${q.serviceAddress || ''} ${q.clientPhone || ''} ${q.bedrooms || ''} ${q.bathrooms || ''}`.toLowerCase();
    const matchesSearch = !search.trim() || qStr.includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'AWAITING_RESPONSE'
        ? q.quoteStatus === 'AWAITING_RESPONSE' || q.quoteStatus === 'CHANGES_REQUESTED'
        : q.quoteStatus === statusFilter);

    return matchesSearch && matchesStatus;
  });

  const totalValue = filteredQuotes.reduce((acc, q) => acc + (Number(q.total) || 0), 0);

  const statusCounts = {
    ALL: uniqueQuotes.length,
    DRAFT: uniqueQuotes.filter((q) => q.quoteStatus === 'DRAFT').length,
    AWAITING_RESPONSE: uniqueQuotes.filter(
      (q) => q.quoteStatus === 'AWAITING_RESPONSE' || q.quoteStatus === 'CHANGES_REQUESTED'
    ).length,
    APPROVED: uniqueQuotes.filter((q) => q.quoteStatus === 'APPROVED').length,
    CONVERTED: uniqueQuotes.filter((q) => q.quoteStatus === 'CONVERTED').length,
    ARCHIVED: uniqueQuotes.filter((q) => q.quoteStatus === 'ARCHIVED').length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONVERTED':
        return 'bg-emerald-500/15 text-emerald-700 border-emerald-400/50';
      case 'APPROVED':
        return 'bg-teal-500/15 text-teal-700 border-teal-400/50';
      case 'AWAITING_RESPONSE':
        return 'bg-amber-500/15 text-amber-800 border-amber-400/50';
      case 'CHANGES_REQUESTED':
        return 'bg-rose-500/15 text-rose-700 border-rose-400/50';
      case 'ARCHIVED':
        return 'bg-slate-200 text-slate-600 border-slate-300';
      default:
        return 'bg-blue-500/15 text-blue-700 border-blue-400/50';
    }
  };

  const handleSyncWithJobber = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await fetch(`/api/jobber/sync-quotes?project=${projectId}`, {
        method: 'POST',
        headers: { 'x-project-id': projectId },
      });
      const data = await res.json();
      if (data.success) {
        if (data.quotes && onQuotesUpdated) {
          onQuotesUpdated(data.quotes);
        }
        if (data.delta) {
          setSyncFeedback(
            `✓ Synced from Jobber: ${data.delta.newCount} new, ${data.delta.updatedCount} updated, ${data.delta.unchangedCount} synced quotes (${data.delta.durationMs}ms)`
          );
        } else {
          setSyncFeedback(data.message || 'Quotes synchronized with Jobber!');
        }
      }
    } catch {
      setSyncFeedback('Sync failed. Please check network connection.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleStatusChange = async (quote: JobberQuote, newStatus: JobberQuote['quoteStatus']) => {
    try {
      const res = await fetch(`/api/database/quotes/${encodeURIComponent(quote.id)}?project=${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-project-id': projectId },
        body: JSON.stringify({ quoteStatus: newStatus }),
      });
      const data = await res.json();
      if (data.success && onQuotesUpdated) {
        onQuotesUpdated(
          data.quotes ||
            quotes.map((q) =>
              q.id === quote.id ? { ...q, quoteStatus: newStatus, updatedAt: new Date().toISOString() } : q
            )
        );
        setSyncFeedback(`Quote ${quote.quoteNumber} updated to ${newStatus.replace('_', ' ')}!`);
      }
    } catch (err) {
      console.warn('Quote status update error:', err);
    }
  };

  const handleConvertToJob = async (
    quote: JobberQuote,
    scheduleOptions?: { scheduledDate: string; scheduledTime: string; assignedCleaners: string[] }
  ) => {
    try {
      const targetDate =
        scheduleOptions?.scheduledDate || quote.scheduledDate || new Date().toISOString().slice(0, 10);
      const targetTime = scheduleOptions?.scheduledTime || quote.scheduledTime || '10:00';
      const targetCleaners = scheduleOptions?.assignedCleaners ?? quote.assignedCleaners ?? [];

      setSyncFeedback(`Scheduling quote ${quote.quoteNumber} onto calendar & Jobber...`);
      const res = await fetch(`/api/jobber/convert-quote?project=${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-project-id': projectId },
        body: JSON.stringify({
          quoteId: quote.id,
          scheduledDate: targetDate,
          scheduledTime: targetTime,
          assignedCleaners: targetCleaners,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.quotes && onQuotesUpdated) {
          onQuotesUpdated(data.quotes);
        } else if (onQuotesUpdated) {
          onQuotesUpdated(
            quotes.map((q) =>
              q.id === quote.id
                ? {
                    ...q,
                    quoteStatus: 'CONVERTED',
                    scheduledDate: targetDate,
                    scheduledTime: targetTime,
                    assignedCleaners: targetCleaners,
                    updatedAt: new Date().toISOString(),
                  }
                : q
            )
          );
        }
        if (onVisitCreated && data.newVisit) {
          onVisitCreated(data.newVisit);
        }
        setSyncFeedback(
          `✓ ${
            data.message ||
            `Quote ${quote.quoteNumber} scheduled for ${targetDate} (${
              targetCleaners.length > 0 ? targetCleaners.join(' & ') : 'Unassigned'
            })!`
          }`
        );
      } else {
        await handleStatusChange(quote, 'CONVERTED');
      }
    } catch (err) {
      console.warn('Convert quote error:', err);
      await handleStatusChange(quote, 'CONVERTED');
    }
  };

  const toggleNewCleaner = (name: string) => {
    setNewAssignedCleaners((prev) => (prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]));
  };

  const handleApplyNewDiscount = (discountVal: number) => {
    const prevDiscount = Number(newDiscount) || 0;
    const baseTotal = (Number(newTotal) || 280) + prevDiscount;
    const nextTotal = Math.max(50, Math.round((baseTotal - discountVal) * 100) / 100);
    setNewDiscount(String(discountVal));
    setNewTotal(String(nextTotal));
  };

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim() || !newTotal) return;
    setIsSubmittingQuote(true);

    try {
      const totalNum = Number(newTotal) || 280;
      let lineItems = selectedLineItems;
      if (lineItems.length === 0) {
        const matched = matchCatalogItem(newService, newBedrooms, newBathrooms, localCatalog || CANONICAL_SERVICE_CATALOG);
        if (matched) {
          const qty = matched.quantity ?? matched.baseHours ?? 1;
          const unitPrice = matched.unitPrice ?? matched.basePrice ?? 105;
          const total = matched.total ?? (qty * unitPrice);
          lineItems = [
            {
              name: matched.jobberItemName || matched.name,
              description: matched.description || `${matched.name} (${newBedrooms}, ${newBathrooms})`,
              quantity: qty,
              unitPrice: unitPrice,
              total: total,
            },
          ];
        } else {
          lineItems = [
            {
              name: `${newService} (${newBedrooms}, ${newBathrooms})`,
              description: `${newBedrooms}, ${newBathrooms} • ${newService} — ${newServiceAddress.trim() || 'Edmonton, AB'}`,
              quantity: 1,
              unitPrice: totalNum,
              total: totalNum,
            },
          ];
        }
      }

      const res = await fetch(`/api/database/quotes?project=${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-project-id': projectId },
        body: JSON.stringify({
          clientName: newClientName.trim(),
          clientPhone: newClientPhone.trim() || '(780) 555-0199',
          clientEmail: newClientEmail.trim(),
          serviceAddress: newServiceAddress.trim() || 'Edmonton, AB',
          service: newService,
          bedrooms: newBedrooms,
          bathrooms: newBathrooms,
          total: totalNum,
          discountAmount: Number(newDiscount) || 0,
          depositRequired: Number(newDeposit) || 0,
          scheduledDate: newScheduledDate || undefined,
          scheduledTime: newScheduledDate ? newScheduledTime : undefined,
          assignedCleaners: newAssignedCleaners,
          notes: newNotes.trim(),
          quoteStatus: 'DRAFT',
          lineItems,
        }),
      });

      const data = await res.json();
      if (data.success && data.quote) {
        if (onQuotesUpdated) {
          onQuotesUpdated(data.quotes || [data.quote, ...quotes]);
        }
        setIsNewQuoteModalOpen(false);
        setNewClientName('');
        setNewClientPhone('');
        setNewClientEmail('');
        setNewServiceAddress('');
        setNewNotes('');
        setNewDiscount('0');
        setNewScheduledDate('');
        setNewAssignedCleaners([]);
        setSelectedQuote(data.quote);
        setSyncFeedback(
          data.message ||
            `✓ Step 1: Created Client "${data.quote.clientName}" in Jobber → Step 2: Created Draft Quote ${data.quote.quoteNumber} (${newBedrooms}, ${newBathrooms}) & synced to Google Sheets!`
        );
      }
    } catch (err) {
      console.warn('Failed to create quote:', err);
    } finally {
      setIsSubmittingQuote(false);
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col overflow-hidden bg-slate-50/70 font-sans p-4 sm:p-6">
      {/* Top Header matching Screenshot 1 */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-xs">
              <FileCheck className="w-4 h-4 text-white" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight leading-none">
                Quotes
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Draft, sent, and approved estimates synced with Jobber &amp; Google Sheets
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search quotes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-pink-500 w-44 sm:w-60"
            />
          </div>

          <div className="px-3 py-2 bg-gradient-to-r from-pink-50 to-purple-50 text-purple-900 border border-purple-200/80 rounded-xl font-mono text-xs font-bold">
            Pipeline: <span className="text-pink-600 font-extrabold">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <button
            onClick={handleSyncWithJobber}
            disabled={isSyncing}
            className="px-3.5 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync from Jobber'}</span>
          </button>

          <button
            onClick={() => setIsCatalogModalOpen(true)}
            className="px-3.5 py-2 text-xs font-bold text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95 flex items-center gap-1.5"
            title="View or Paste Service Catalog Price List"
          >
            <Tag className="w-3.5 h-3.5 text-purple-600" />
            <span>Price List &amp; Catalog</span>
          </button>

          <button
            onClick={() => setIsNewQuoteModalOpen(true)}
            className="px-3.5 py-2 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ New Quote</span>
          </button>

          {onBackToManagement && (
            <button
              onClick={onBackToManagement}
              className="px-3 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all border border-slate-200 cursor-pointer"
            >
              ← Management
            </button>
          )}
        </div>
      </div>

      {/* Sync Feedback Toast / Banner */}
      {syncFeedback && (
        <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 text-xs flex items-center justify-between shadow-2xs animate-fadeIn font-medium">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
          <button
            onClick={() => setSyncFeedback(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* Status Filter Pills Row matching Screenshot 1 */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-3 scrollbar-none">
        {[
          { key: 'ALL', label: 'All', count: statusCounts.ALL },
          { key: 'DRAFT', label: 'Draft', count: statusCounts.DRAFT },
          { key: 'AWAITING_RESPONSE', label: 'Awaiting Response', count: statusCounts.AWAITING_RESPONSE },
          { key: 'APPROVED', label: 'Approved', count: statusCounts.APPROVED },
          { key: 'CONVERTED', label: 'Converted', count: statusCounts.CONVERTED },
          { key: 'ARCHIVED', label: 'Archived', count: statusCounts.ARCHIVED },
        ].map((pill) => {
          const isSelected = statusFilter === pill.key;
          return (
            <button
              key={pill.key}
              onClick={() => setStatusFilter(pill.key)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 border ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <span>{pill.label}</span>
              <span
                className={`text-[11px] font-mono ${
                  isSelected ? 'text-pink-300 font-extrabold' : 'text-slate-400'
                }`}
              >
                ({pill.count})
              </span>
            </button>
          );
        })}
      </div>

      {/* Quotes List / Cards matching Screenshot 1 */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {filteredQuotes.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-white rounded-2xl border border-dashed border-slate-200">
            <FileCheck className="w-10 h-10 text-slate-300 mb-2" />
            <p className="font-bold text-slate-700 text-sm">No Quotes Found</p>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Click &ldquo;+ New Quote&rdquo; to create a client &amp; draft quote in Jobber, or &ldquo;Sync from Jobber&rdquo;.
            </p>
          </div>
        ) : (
          filteredQuotes.map((q) => {
            const numericJobberId = extractJobberNumericId(q.id);
            const jobberUrl = numericJobberId
              ? `https://secure.getjobber.com/quotes/${numericJobberId}`
              : q.jobberWebUri && !q.id?.startsWith('Z2lkOi8v')
              ? q.jobberWebUri
              : 'https://secure.getjobber.com/quotes';
            const googleSheetUrl =
              q.googleSheetUrl ||
              'https://docs.google.com/spreadsheets/d/1TifULi7n2BylQdvla-8DRvYHul_A1wXXzypUdBJwEeA/edit';

            const displayQuoteNum = q.quoteNumber.replace(/^QT-/i, 'Quote #');
            const createdFormatted = formatQuoteDate(q.createdAt);
            const sentFormatted = formatQuoteDate(q.sentAt);
            const verdictLabel =
              q.verdict || (q.quoteStatus === 'CONVERTED' ? 'Client' : 'Good lead');

            return (
              <div
                key={q.id}
                onClick={() => setSelectedQuote(q)}
                className="bg-white p-4 sm:p-4.5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-pink-300 transition-all cursor-pointer group"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  {/* Left Column: Client Name, Quote #, Verdict, Service, Bedrooms/Bathrooms, Address, Phone, Dates */}
                  <div className="space-y-1.5 min-w-0 flex-1">
                    {/* Row 1: Client Name + Quote # + Verdict Badge */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900 group-hover:text-pink-600 transition-colors">
                        {q.clientName}
                      </h3>

                      <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        {displayQuoteNum}
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          verdictLabel === 'Client'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-cyan-50 text-cyan-800 border-cyan-200'
                        }`}
                      >
                        {verdictLabel}
                      </span>

                      <CustomerIntelligenceBadge
                        intelligence={getCustomerIntelligence(q.clientPhone, q.clientName, {
                          calls,
                          visits,
                          clients,
                        })}
                        compact
                      />
                    </div>

                    {/* Row 2: Service • Address • Phone (Exact Screenshot 1 format) */}
                    <div className="text-xs text-slate-600 flex items-center gap-1.5 flex-wrap leading-relaxed">
                      <span className="font-semibold text-slate-800">
                        {q.service || 'Residential Cleaning'}
                      </span>

                      {(q.bedrooms || q.bathrooms) && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200 text-[11px] font-bold">
                            <BedDouble className="w-3 h-3 text-purple-600" />
                            <span>{[q.bedrooms, q.bathrooms].filter(Boolean).join(' • ')}</span>
                          </span>
                        </>
                      )}

                      {q.serviceAddress && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="inline-flex items-center gap-1 text-slate-600">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{q.serviceAddress}</span>
                          </span>
                        </>
                      )}

                      {q.clientPhone && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="font-mono text-slate-600">{q.clientPhone}</span>
                        </>
                      )}
                    </div>

                    {/* Row 3: Created / Sent / Scheduled Dates */}
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap pt-0.5">
                      {createdFormatted && <span>Created {createdFormatted}</span>}
                      {sentFormatted && <span>Sent {sentFormatted}</span>}
                      {q.scheduledDate && (
                        <span className="inline-flex items-center gap-1 text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          <Calendar className="w-3 h-3 text-purple-600" />
                          <span>
                            Scheduled: {q.scheduledDate}
                            {q.scheduledTime ? ` at ${q.scheduledTime}` : ''}
                            {q.assignedCleaners && q.assignedCleaners.length > 0
                              ? ` (${q.assignedCleaners.join(' & ')})`
                              : ' (Unassigned)'}
                          </span>
                        </span>
                      )}
                      {!q.scheduledDate && q.requestedDate && (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                          <Calendar className="w-3 h-3 text-amber-500" />
                          <span>Requested: {q.requestedDate}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Price + Status Badge + Open in Jobber Link & Action Buttons */}
                  <div
                    className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-extrabold text-base sm:text-lg text-slate-900 font-mono">
                        ${Number(q.total).toFixed(2)}
                      </span>

                      <span
                        className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md border ${getStatusBadge(
                          q.quoteStatus
                        )}`}
                      >
                        {q.quoteStatus.replace('_', ' ')}
                      </span>

                      {String(q.id || '').startsWith('quote_local_') && !(q as any).isLiveSynced ? (
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              setSyncFeedback(`Pushing ${displayQuoteNum} (${q.clientName}) live to Jobber...`);
                              const res = await fetch(
                                `/api/database/quotes/${encodeURIComponent(q.id)}/push-to-jobber?project=${projectId}`,
                                { method: 'POST', headers: { 'x-project-id': projectId } }
                              );
                              const data = await res.json();
                              if (data.success && data.quotes && onQuotesUpdated) {
                                onQuotesUpdated(data.quotes);
                                setSyncFeedback(`✓ Pushed ${q.clientName} live to Jobber (${data.quote?.quoteNumber || displayQuoteNum})!`);
                              } else {
                                setSyncFeedback(
                                  data.error ||
                                    'Jobber 60-min token expired — click "1-Click Reconnect Jobber" in Settings / Jobber Sync to auto-push queued quotes.'
                                );
                              }
                            } catch {
                              setSyncFeedback('Could not push to Jobber right now.');
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                          title="Saved in Clean Sheet Hub & Firestore — click to push live to Jobber"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Push to Jobber</span>
                        </button>
                      ) : (
                        <a
                          href={jobberUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold inline-flex items-center gap-1 transition-colors"
                          title={`Open ${displayQuoteNum} in Jobber`}
                        >
                          <span>Open in Jobber</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      <button
                        type="button"
                        onClick={() => setSelectedQuote(q)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        title="Adjust quote price, bedrooms/bathrooms, or schedule onto calendar"
                      >
                        <SlidersHorizontal className="w-3 h-3 text-purple-600" />
                        <span>Adjust / Schedule</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedQuote(q)}
                        className="px-2.5 py-1 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                        title='Send text saying "This is your quote"'
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Text Quote</span>
                      </button>

                      <a
                        href={googleSheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Open in Google Sheets"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Jobber-Style Quote Detail, Adjustment, Schedule & SMS Sender Modal */}
      <QuoteDetailModal
        isOpen={Boolean(selectedQuote)}
        quote={selectedQuote}
        onClose={() => setSelectedQuote(null)}
        projectId={projectId}
        onConvertToJob={(quoteToConvert, scheduleOpts) => handleConvertToJob(quoteToConvert, scheduleOpts)}
        onQuoteUpdated={(updated, allQuotes) => {
          setSelectedQuote(updated);
          if (allQuotes && onQuotesUpdated) {
            onQuotesUpdated(allQuotes);
          } else if (onQuotesUpdated) {
            onQuotesUpdated(quotes.map((item) => (item.id === updated.id ? updated : item)));
          }
        }}
      />

      {/* Modal: Create New Job Quote (Step 1: Jobber Client -> Step 2: Property -> Step 3: Draft Quote + Google Sheets) */}
      {isNewQuoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-fadeIn my-auto max-h-[94vh] flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-lg">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-sm">
                    New Jobber Quote (Client + Draft Estimate)
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Step 1: Creates Client in Jobber → Step 2: Creates Draft Quote &amp; Syncs Google Sheet
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNewQuoteModalOpen(false)}
                className="text-slate-300 hover:text-white text-base font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateQuote} className="p-4 sm:p-5 space-y-3.5 text-xs text-slate-700 overflow-y-auto">
              {/* Step 1: Client Information */}
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2.5">
                <div className="font-extrabold text-emerald-950 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Step 1: Jobber Client Details (Name, Address, Phone, Email)</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Customer / Client Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Waldemar Dutra"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-purple-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      placeholder="(780) 555-0199"
                      value={newClientPhone}
                      onChange={(e) => setNewClientPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-purple-600 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      placeholder="client@example.com"
                      value={newClientEmail}
                      onChange={(e) => setNewClientEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-purple-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Service Property Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 173 Cornell Court, Edmonton, AB T5C 3C3"
                    value={newServiceAddress}
                    onChange={(e) => setNewServiceAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              {/* Real-Time Caller Intelligence & Loyalty Discount Banner */}
              {(newClientPhone.trim() || newClientName.trim()) &&
                (() => {
                  const intel = getCustomerIntelligence(newClientPhone, newClientName, {
                    calls,
                    visits,
                    clients,
                  });
                  return (
                    <CustomerIntelligenceBadge
                      intelligence={intel}
                      showDiscountPrompt={intel.loyaltyDiscountEligible}
                      onApplyDiscount={(discountPercent) => {
                        const cur = Number(newTotal) || 280;
                        const discounted = Math.round(cur * (1 - discountPercent / 100));
                        setNewDiscount(String(cur - discounted));
                        setNewTotal(String(discounted));
                      }}
                    />
                  );
                })()}

              {/* Price List & Service Catalog Quick-Fill */}
              <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-extrabold text-purple-900 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>Price List Catalog Match (Auto-Fills Rates &amp; Line Items)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCatalogModalOpen(true)}
                    className="text-[11px] text-purple-700 hover:text-purple-900 font-bold underline cursor-pointer"
                  >
                    Manage Price List →
                  </button>
                </div>
                <select
                  onChange={(e) => {
                    const selected = (localCatalog || CANONICAL_SERVICE_CATALOG).find((c) => c.id === e.target.value);
                    if (selected) handleSelectCatalogItemForNewQuote(selected);
                  }}
                  defaultValue=""
                  className="w-full px-3 py-2 border border-purple-300 rounded-xl focus:outline-none focus:border-purple-600 bg-white font-semibold text-slate-800 text-xs shadow-2xs"
                >
                  <option value="" disabled>-- Select a pre-priced line item from Catalog --</option>
                  {(localCatalog || CANONICAL_SERVICE_CATALOG).map((item) => {
                    const cln = item.cleanersCount || 2;
                    const qty = item.quantity ?? item.baseHours ?? 3;
                    const up = item.unitPrice ?? item.basePrice ?? 105;
                    const tot = item.total ?? item.basePrice ?? 315;
                    return (
                      <option key={item.id} value={item.id}>
                        {item.categoryLabel}: {item.name} — {cln} Cleaner{cln > 1 ? 's' : ''} ({qty} × ${up.toFixed(2)}) = ${tot.toFixed(2)} CAD
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Step 2: Service Requested, Bedrooms & Bathrooms (Synced to Google Sheets) */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <BedDouble className="w-3.5 h-3.5 text-purple-600" />
                  <span>Step 2: Service Requested, Bedrooms &amp; Bathrooms (Google Sheets)</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cleaning Service Requested</label>
                  <select
                    value={newService}
                    onChange={(e) => setNewService(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-600 bg-white font-semibold"
                  >
                    <option value="Move Out Cleaning Services 2026">Move Out Cleaning Services 2026</option>
                    <option value="Deep Cleaning Services 2026">Deep Cleaning Services 2026</option>
                    <option value="Initial Basic / Standard Cleaning 2026">Initial Basic / Standard Cleaning 2026</option>
                    <option value="MoveIn - Post Construction">MoveIn - Post Construction</option>
                    <option value="Bi-Weekly Recurring Residential Clean">Bi-Weekly Recurring Residential Clean</option>
                    <option value="Commercial Office Cleaning">Commercial Office Cleaning</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">How Many Bedrooms?</label>
                    <select
                      value={newBedrooms}
                      onChange={(e) => setNewBedrooms(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-600 bg-white font-bold"
                    >
                      <option value="Studio Apartment">Studio Apartment</option>
                      <option value="1 Bedroom">1 Bedroom</option>
                      <option value="2 Bedrooms">2 Bedrooms</option>
                      <option value="3 Bedrooms">3 Bedrooms</option>
                      <option value="4 Bedrooms">4 Bedrooms</option>
                      <option value="5 Bedrooms">5 Bedrooms</option>
                      <option value="6+ Bedrooms">6+ Bedrooms</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">How Many Bathrooms?</label>
                    <select
                      value={newBathrooms}
                      onChange={(e) => setNewBathrooms(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-600 bg-white font-bold"
                    >
                      <option value="1 Bathroom">1 Bathroom</option>
                      <option value="1.5 Bathrooms">1.5 Bathrooms</option>
                      <option value="2 Bathrooms">2 Bathrooms</option>
                      <option value="2.5 Bathrooms">2.5 Bathrooms</option>
                      <option value="3 Bathrooms">3 Bathrooms</option>
                      <option value="3.5 Bathrooms">3.5 Bathrooms</option>
                      <option value="4+ Bathrooms">4+ Bathrooms</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Pricing, Custom Discount ($40 or custom), and Deposit ($50 / $100) */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Total ($ CAD) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    value={newTotal}
                    onChange={(e) => setNewTotal(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-600 font-mono font-bold text-emerald-700"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Discount ($)</label>
                    <div className="flex gap-1">
                      {[0, 40].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => handleApplyNewDiscount(d)}
                          className="px-1.5 py-0.5 rounded bg-pink-50 text-pink-700 border border-pink-200 text-[9px] font-bold cursor-pointer"
                        >
                          ${d}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={newDiscount}
                    onChange={(e) => handleApplyNewDiscount(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-pink-600 font-mono text-pink-700"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Deposit ($)</label>
                    <div className="flex gap-1">
                      {[50, 100].map((dep) => (
                        <button
                          key={dep}
                          type="button"
                          onClick={() => setNewDeposit(String(dep))}
                          className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[9px] font-bold cursor-pointer"
                        >
                          ${dep}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={newDeposit}
                    onChange={(e) => setNewDeposit(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-600 font-mono"
                  />
                </div>
              </div>

              {/* Optional Schedule Date, Time & Cleaner Assignment (Defaults to No One) */}
              <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-200 space-y-2">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Preferred / Scheduled Date</label>
                    <input
                      type="date"
                      value={newScheduledDate}
                      onChange={(e) => setNewScheduledDate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-xl font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Preferred Time</label>
                    <input
                      type="time"
                      value={newScheduledTime}
                      onChange={(e) => setNewScheduledTime(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-purple-200 rounded-xl font-mono text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Cleaner Assignment (Default: No One — click to add 1 or more)
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setNewAssignedCleaners([])}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer border ${
                        newAssignedCleaners.length === 0
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-300'
                      }`}
                    >
                      No One
                    </button>
                    {AVAILABLE_CLEANERS.map((c) => {
                      const active = newAssignedCleaners.includes(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => toggleNewCleaner(c)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer border flex items-center gap-1 ${
                            active
                              ? 'bg-purple-600 text-white border-purple-600'
                              : 'bg-white text-slate-700 border-purple-200'
                          }`}
                        >
                          {active && <Check className="w-3 h-3" />}
                          <span>{c}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes / Special Instructions</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Basement suite + main level. Please focus on kitchen & bathrooms."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewQuoteModalOpen(false)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingQuote}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {isSubmittingQuote ? 'Creating Client & Quote...' : 'Create Client & Draft Quote in Jobber'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
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
          handleSelectCatalogItemForNewQuote(item);
          setIsNewQuoteModalOpen(true);
        }}
        projectId={projectId}
      />
    </div>
  );
};
