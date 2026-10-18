import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  MessageSquare,
  Send,
  Copy,
  Check,
  RefreshCw,
  CheckCircle2,
  MapPin,
  Phone,
  Mail,
  User,
  Calendar,
  Search,
  FileSpreadsheet,
  BedDouble,
  Bath,
  DollarSign,
  Users,
  Clock,
  Save,
  AlertTriangle
} from 'lucide-react';
import { JobberQuote, extractJobberNumericId } from '../services/jobberSyncModules';
import { saveQuoteToFirestore, saveClientToFirestore } from '../services/firestoreSyncService';
import { syncLeadsToLiveGoogleSheetInDrive } from '../services/googleDriveBackupService';

interface QuoteDetailModalProps {
  isOpen: boolean;
  quote: JobberQuote | null;
  onClose: () => void;
  onQuoteUpdated?: (updatedQuote: JobberQuote, allQuotes?: JobberQuote[]) => void;
  onConvertToJob?: (
    quote: JobberQuote,
    scheduleOptions?: { scheduledDate: string; scheduledTime: string; assignedCleaners: string[] }
  ) => void;
  projectId?: 'dispatchgeeni' | 'tidyups';
}

const AVAILABLE_CLEANERS = [
  'Cindy Guay',
  'Melissa Clarke',
  'Cheyenne',
  'Stacey',
  'Natalia',
];

export const QuoteDetailModal: React.FC<QuoteDetailModalProps> = ({
  isOpen,
  quote,
  onClose,
  onQuoteUpdated,
  onConvertToJob,
  projectId = 'dispatchgeeni',
}) => {
  // Editable quote fields ("go back in and adjust it")
  const [editClientName, setEditClientName] = useState('');
  const [editClientPhone, setEditClientPhone] = useState('');
  const [editClientEmail, setEditClientEmail] = useState('');
  const [editServiceAddress, setEditServiceAddress] = useState('');
  const [editService, setEditService] = useState('');
  const [editBedrooms, setEditBedrooms] = useState('3 Bedrooms');
  const [editBathrooms, setEditBathrooms] = useState('2 Bathrooms');
  const [editTotal, setEditTotal] = useState('280');
  const [editDiscount, setEditDiscount] = useState('0');
  const [editDeposit, setEditDeposit] = useState('50');
  const [editStatus, setEditStatus] = useState<JobberQuote['quoteStatus']>('DRAFT');
  const [editNotes, setEditNotes] = useState('');

  // Schedule fields ("It could be scheduled" — defaults to No One / Unassigned)
  const [schedDate, setSchedDate] = useState('');
  const [schedTime, setSchedTime] = useState('10:00');
  const [schedCleaners, setSchedCleaners] = useState<string[]>([]);

  // SMS state
  const [smsText, setSmsText] = useState('');
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [isSyncingBoth, setIsSyncingBoth] = useState(false);
  const [isSavingAdjustments, setIsSavingAdjustments] = useState(false);
  const [isSchedulingJob, setIsSchedulingJob] = useState(false);
  const [isSyncingDriveSheet, setIsSyncingDriveSheet] = useState(false);
  const [liveSheetUrl, setLiveSheetUrl] = useState<string>('');
  const [copiedSms, setCopiedSms] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<'success' | 'warning'>('success');

  useEffect(() => {
    if (quote) {
      setEditClientName(quote.clientName || '');
      setEditClientPhone(quote.clientPhone || '');
      setEditClientEmail(quote.clientEmail || '');
      setEditServiceAddress(quote.serviceAddress || 'Edmonton, AB');
      setEditService(quote.service || 'Residential Standard Cleaning');
      setEditBedrooms(quote.bedrooms || '3 Bedrooms');
      setEditBathrooms(quote.bathrooms || '2 Bathrooms');
      setEditTotal(String(quote.total ?? 280));
      setEditDiscount(String((quote as any).discountAmount ?? 0));
      setEditDeposit(String(quote.depositRequired ?? 50));
      setEditStatus(quote.quoteStatus || 'DRAFT');
      setEditNotes(quote.notes || '');

      setSchedDate(quote.scheduledDate || quote.requestedDate || new Date().toISOString().slice(0, 10));
      setSchedTime(quote.scheduledTime ? quote.scheduledTime.replace(/\s*(AM|PM)/i, '') : '10:00');
      setSchedCleaners(Array.isArray(quote.assignedCleaners) ? quote.assignedCleaners : []);

      const addressPart = quote.serviceAddress ? ` at ${quote.serviceAddress}` : '';
      const sizePart =
        quote.bedrooms || quote.bathrooms
          ? ` (${[quote.bedrooms, quote.bathrooms].filter(Boolean).join(', ')})`
          : '';
      const defaultMsg = `Hi ${quote.clientName}, this is your quote from TidyUps Cleaning Service Inc (${quote.quoteNumber}) for ${quote.service}${sizePart}${addressPart}: Total $${Number(quote.total).toFixed(2)} CAD${quote.depositRequired ? ` (Deposit: $${Number(quote.depositRequired).toFixed(2)})` : ''}. Please reply YES to approve and confirm your booking!`;
      setSmsText(defaultMsg);
      setFeedbackBanner(null);
    }
  }, [quote]);

  if (!isOpen || !quote) return null;

  const isLiveJobberSynced = Boolean(
    quote.isLiveSynced || (quote.id && String(quote.id).startsWith('Z2lkOi8v'))
  );

  const numericJobberId = extractJobberNumericId(quote.id);
  const jobberUrl = numericJobberId
    ? `https://secure.getjobber.com/quotes/${numericJobberId}`
    : quote.jobberWebUri && !quote.id?.startsWith('Z2lkOi8v')
    ? quote.jobberWebUri
    : 'https://secure.getjobber.com/quotes';

  const googleSheetUrl =
    liveSheetUrl ||
    quote.googleSheetUrl ||
    'https://docs.google.com/spreadsheets/d/1TifULi7n2BylQdvla-8DRvYHul_A1wXXzypUdBJwEeA/edit';

  const googleSearchQuery = `${editClientName || quote.clientName} ${editServiceAddress || quote.serviceAddress || 'Edmonton AB'} ${editClientPhone || quote.clientPhone || ''}`.trim();
  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(googleSearchQuery)}`;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    editServiceAddress || quote.serviceAddress || `${quote.clientName} Edmonton AB`
  )}`;

  const totalNum = Number(editTotal) || Number(quote.total) || 280;
  const discountNum = Number(editDiscount) || 0;
  const depositNum = Number(editDeposit) || 0;

  const lineItems =
    quote.lineItems && quote.lineItems.length > 0
      ? quote.lineItems
      : [
          {
            description: `${editService || quote.service || 'Residential Cleaning'} (${editBedrooms}, ${editBathrooms})`,
            quantity: 1,
            unitPrice: Math.round((totalNum / 1.125 - 12.5 + discountNum) * 100) / 100,
            total: Math.round((totalNum / 1.125 - 12.5 + discountNum) * 100) / 100,
          },
          {
            description: 'Fuel & Travel Surcharge',
            quantity: 1,
            unitPrice: 12.5,
            total: 12.5,
          },
        ];

  const subtotal = Math.round((totalNum / 1.125) * 100) / 100;
  const taxAmount = Math.max(0, Math.round((totalNum - subtotal) * 100) / 100);

  const toggleCleaner = (cleanerName: string) => {
    setSchedCleaners((prev) =>
      prev.includes(cleanerName) ? prev.filter((c) => c !== cleanerName) : [...prev, cleanerName]
    );
  };

  const handleApplyQuickDiscount = (discountVal: number) => {
    const prevDiscount = Number(editDiscount) || 0;
    const baseTotal = (Number(editTotal) || Number(quote.total) || 280) + prevDiscount;
    const nextTotal = Math.max(50, Math.round((baseTotal - discountVal) * 100) / 100);
    setEditDiscount(String(discountVal));
    setEditTotal(String(nextTotal));
  };

  const handleSaveAndSyncQuote = async () => {
    setIsSavingAdjustments(true);
    setIsSyncingBoth(true);
    setFeedbackBanner(null);
    try {
      const updatedLineItems = [
        {
          description: `${editService} (${editBedrooms}, ${editBathrooms})`,
          quantity: 1,
          unitPrice: Math.max(0, Math.round((totalNum / 1.125 - 12.5 + discountNum) * 100) / 100),
          total: Math.max(0, Math.round((totalNum / 1.125 - 12.5 + discountNum) * 100) / 100),
        },
        {
          description: 'Fuel & Travel Surcharge',
          quantity: 1,
          unitPrice: 12.5,
          total: 12.5,
        },
      ];
      if (discountNum > 0) {
        updatedLineItems.push({
          description: `Custom Discount Applied (-$${discountNum.toFixed(2)})`,
          quantity: 1,
          unitPrice: -discountNum,
          total: -discountNum,
        });
      }

      const payload = {
        clientName: editClientName.trim() || quote.clientName,
        clientPhone: editClientPhone.trim(),
        clientEmail: editClientEmail.trim(),
        serviceAddress: editServiceAddress.trim(),
        service: editService.trim(),
        bedrooms: editBedrooms,
        bathrooms: editBathrooms,
        total: totalNum,
        discountAmount: discountNum,
        depositRequired: depositNum,
        quoteStatus: editStatus,
        scheduledDate: schedDate || undefined,
        scheduledTime: schedTime || undefined,
        assignedCleaners: schedCleaners,
        notes: editNotes,
        lineItems: updatedLineItems,
      };

      const res = await fetch(`/api/quotes/${encodeURIComponent(quote.id)}/sync-jobber-google?project=${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-project-id': projectId },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        if (data.quote) {
          saveQuoteToFirestore(data.quote).catch(() => {});
        }
        if (data.client) {
          saveClientToFirestore(data.client).catch(() => {});
        }
        // Automatically update live Google Sheet in Drive if user is already signed into Google Drive
        syncLeadsToLiveGoogleSheetInDrive({ silentIfNoAuth: true })
          .then((driveRes) => {
            if (driveRes?.sheetUrl) setLiveSheetUrl(driveRes.sheetUrl);
          })
          .catch(() => {});

        const syncedLiveToJobber = Boolean(data.isLiveSynced || data.isLive);
        setFeedbackTone(syncedLiveToJobber ? 'success' : 'warning');
        setFeedbackBanner(
          data.message ||
            (syncedLiveToJobber
              ? `✓ Saved adjustments & synced ${payload.clientName} (Client + Quote ${data.quote?.quoteNumber || quote.quoteNumber}) live with Jobber & Google Sheets!`
              : `Saved ${payload.clientName} (${data.quote?.quoteNumber || quote.quoteNumber}) to Clean Sheet Hub & Firestore! Reconnect Jobber OAuth below to push live to Jobber.`)
        );
        if (data.quote && onQuoteUpdated) {
          onQuoteUpdated(data.quote, data.quotes);
        }
      } else {
        setFeedbackTone('warning');
        setFeedbackBanner(data.error || 'Could not save adjustments.');
      }
    } catch (err: any) {
      setFeedbackTone('warning');
      setFeedbackBanner(`Save error: ${err.message}`);
    } finally {
      setIsSavingAdjustments(false);
      setIsSyncingBoth(false);
    }
  };

  const handleSyncToLiveDriveGoogleSheet = async () => {
    setIsSyncingDriveSheet(true);
    setFeedbackBanner(null);
    try {
      const res = await syncLeadsToLiveGoogleSheetInDrive();
      if (res?.sheetUrl) {
        setLiveSheetUrl(res.sheetUrl);
      }
      setFeedbackTone('success');
      setFeedbackBanner(
        `✓ Synced "${editClientName || quote.clientName}" (${quote.quoteNumber}) directly to your live Google Sheet "${res.sheetName}" in Google Drive!`
      );
    } catch (err: any) {
      setFeedbackTone('warning');
      setFeedbackBanner(`Google Drive Sheet sync notice: ${err?.message || 'Please authorize Google Drive.'}`);
    } finally {
      setIsSyncingDriveSheet(false);
    }
  };

  const handleOneClickReconnectJobber = () => {
    const authUrl = `/api/jobber/oauth/authorize?project=tidyups&sourceOrigin=${encodeURIComponent(window.location.origin)}`;
    window.location.href = authUrl;
  };

  const handleScheduleQuoteJob = async () => {
    setIsSchedulingJob(true);
    setFeedbackBanner(null);
    try {
      // First save any adjustments to the quote
      await fetch(`/api/database/quotes/${encodeURIComponent(quote.id)}?project=${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-project-id': projectId },
        body: JSON.stringify({
          clientName: editClientName.trim() || quote.clientName,
          clientPhone: editClientPhone.trim(),
          clientEmail: editClientEmail.trim(),
          serviceAddress: editServiceAddress.trim(),
          service: editService.trim(),
          bedrooms: editBedrooms,
          bathrooms: editBathrooms,
          total: totalNum,
          discountAmount: discountNum,
          depositRequired: depositNum,
          scheduledDate: schedDate,
          scheduledTime: schedTime,
          assignedCleaners: schedCleaners,
          notes: editNotes,
        }),
      });

      if (onConvertToJob) {
        onConvertToJob(
          {
            ...quote,
            clientName: editClientName.trim() || quote.clientName,
            clientPhone: editClientPhone.trim(),
            clientEmail: editClientEmail.trim(),
            serviceAddress: editServiceAddress.trim(),
            service: editService.trim(),
            bedrooms: editBedrooms,
            bathrooms: editBathrooms,
            total: totalNum,
            depositRequired: depositNum,
            scheduledDate: schedDate,
            scheduledTime: schedTime,
            assignedCleaners: schedCleaners,
            notes: editNotes,
          },
          {
            scheduledDate: schedDate || new Date().toISOString().slice(0, 10),
            scheduledTime: schedTime || '10:00',
            assignedCleaners: schedCleaners,
          }
        );
      }
      setFeedbackBanner(
        `✓ Scheduled Quote ${quote.quoteNumber} for ${schedDate} at ${schedTime} (${
          schedCleaners.length > 0 ? `Assigned: ${schedCleaners.join(' & ')}` : 'Unassigned / No One Assigned Yet'
        })!`
      );
    } catch (err: any) {
      setFeedbackBanner(`Schedule error: ${err.message}`);
    } finally {
      setIsSchedulingJob(false);
    }
  };

  const handleSendSmsViaQuo = async () => {
    const phoneToUse = editClientPhone.trim() || quote.clientPhone;
    if (!phoneToUse) {
      setFeedbackBanner('Please add a client phone number before sending SMS.');
      return;
    }
    setIsSendingSms(true);
    setFeedbackBanner(null);
    try {
      const res = await fetch(`/api/quotes/send-sms?project=${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-project-id': projectId },
        body: JSON.stringify({
          quoteId: quote.id,
          clientName: editClientName || quote.clientName,
          clientPhone: phoneToUse,
          message: smsText,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackBanner(data.message || `✓ Sent "This is your quote" text to ${editClientName || quote.clientName}!`);
        if (data.quote && onQuoteUpdated) {
          onQuoteUpdated(data.quote);
        }
      } else {
        setFeedbackBanner(data.error || 'Could not send SMS.');
      }
    } catch (err: any) {
      setFeedbackBanner(`SMS notice: ${err.message}`);
    } finally {
      setIsSendingSms(false);
    }
  };

  const handleCopySms = () => {
    navigator.clipboard?.writeText(smsText);
    setCopiedSms(true);
    setTimeout(() => setCopiedSms(false), 2000);
  };

  const smsHref = `sms:${(editClientPhone || quote.clientPhone || '').replace(/[^\d+]/g, '')}?body=${encodeURIComponent(smsText)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden text-slate-900 font-sans my-auto max-h-[95vh] flex flex-col">
        {/* Top Jobber-Style Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-mono text-xs font-extrabold">
                {quote.quoteNumber.replace(/^QT-/i, 'Quote #')}
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-pink-500/20 text-pink-200 border border-pink-400/30 text-[11px] font-bold uppercase">
                {editStatus.replace('_', ' ')}
              </span>
              {isLiveJobberSynced ? (
                <span className="px-2 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-200 border border-cyan-400/30 text-[10px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-cyan-300" />
                  <span>Live Synced in Jobber &amp; Clean Sheet</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-lg bg-amber-500/25 text-amber-200 border border-amber-400/40 text-[10px] font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-300" />
                  <span>Saved in Clean Sheet Hub • Queued for Jobber OAuth</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <User className="w-5 h-5 text-pink-400 shrink-0" />
                <span>{editClientName || quote.clientName}</span>
              </h2>
              <span className="text-lg font-black text-emerald-400 font-mono">
                ${totalNum.toFixed(2)} CAD
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {editService} • {editBedrooms} • {editBathrooms} • {editServiceAddress}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs">
          {feedbackBanner && (
            <div
              className={`p-3 rounded-xl font-bold flex items-center justify-between gap-2 animate-fadeIn ${
                feedbackTone === 'warning'
                  ? 'bg-amber-50 border border-amber-300 text-amber-950'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {feedbackTone === 'warning' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
                <span>{feedbackBanner}</span>
              </div>
              <button onClick={() => setFeedbackBanner(null)} className="text-slate-700 font-bold">
                ×
              </button>
            </div>
          )}

          {/* 1. Quick External Links Bar: Open in Jobber, Sync Live Google Sheet in Drive, Open Google Sheet, Save & Sync */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <a
              href={jobberUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all text-center"
              title={`Open ${quote.quoteNumber} in Jobber (${jobberUrl})`}
            >
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              <span>Open in Jobber</span>
            </a>

            <button
              type="button"
              onClick={handleSyncToLiveDriveGoogleSheet}
              disabled={isSyncingDriveSheet}
              className="px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all text-center cursor-pointer disabled:opacity-50"
              title="Push this quote row directly into your live Google Sheet inside Google Drive"
            >
              <FileSpreadsheet className={`w-3.5 h-3.5 shrink-0 ${isSyncingDriveSheet ? 'animate-spin' : ''}`} />
              <span>{isSyncingDriveSheet ? 'Updating Sheet...' : 'Push to Google Sheet'}</span>
            </button>

            <a
              href={googleSheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all text-center"
              title="Open synced Google Sheet"
            >
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              <span>Open Sheet ↗</span>
            </a>

            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold flex items-center justify-center gap-1.5 transition-all text-center"
              title="Open service address on Google Maps"
            >
              <MapPin className="w-3.5 h-3.5 text-pink-600 shrink-0" />
              <span>Google Maps</span>
            </a>

            <button
              type="button"
              onClick={handleSaveAndSyncQuote}
              disabled={isSyncingBoth}
              className="px-3 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-xs"
              title="Save adjustments and sync Client + Quote to Jobber & Google Sheets"
            >
              <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isSyncingBoth ? 'animate-spin' : ''}`} />
              <span>{isSyncingBoth ? 'Syncing...' : 'Save & Sync Jobber'}</span>
            </button>
          </div>

          {/* 2. Jobber 2-Step Client -> Draft Quote Sync Verification Banner */}
          {isLiveJobberSynced ? (
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5">
                <div className="font-extrabold text-emerald-950 text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Synced Live in Jobber &amp; Clean Google Sheet Hub</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  Client ({editClientName || quote.clientName}) &amp; Quote{' '}
                  <span className="font-mono font-bold">{quote.quoteNumber}</span> are live in Jobber.
                </p>
              </div>
              <a
                href={jobberUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-mono font-bold text-emerald-700 hover:text-emerald-900 underline shrink-0"
              >
                {jobberUrl.replace('https://', '')} ↗
              </a>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="font-extrabold text-amber-950 text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Saved in App &amp; Clean Sheet Hub • Waiting for Jobber OAuth Refresh</span>
                </div>
                <p className="text-[11px] text-amber-900">
                  Jobber&apos;s 60-minute access token expired. Click <strong>1-Click Reconnect Jobber</strong> to authorize once with your non-rotating refresh token — all queued quotes (including {quote.quoteNumber}) will automatically push live to Jobber!
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleOneClickReconnectJobber}
                  className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs cursor-pointer shadow-xs whitespace-nowrap"
                >
                  1-Click Reconnect Jobber ↗
                </button>
              </div>
            </div>
          )}

          {/* 3. Adjust Quote & Property Details ("I could go back in and adjust it") */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div>
                <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                  <BedDouble className="w-4 h-4 text-purple-600" />
                  <span>Adjust Quote, Bedrooms/Bathrooms &amp; Pricing</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Edit any detail below and click &ldquo;Save &amp; Sync to Jobber&rdquo; to update both Jobber and Google Sheets.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSaveAndSyncQuote}
                disabled={isSavingAdjustments}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingAdjustments ? 'Saving...' : 'Save Adjustments'}</span>
              </button>
            </div>

            {/* Client Name, Phone, Email */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                  Client Name (Jobber Person)
                </label>
                <input
                  type="text"
                  value={editClientName}
                  onChange={(e) => setEditClientName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-600"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={editClientPhone}
                  onChange={(e) => setEditClientPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-purple-600"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editClientEmail}
                  onChange={(e) => setEditClientEmail(e.target.value)}
                  placeholder="client@example.com"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-600"
                />
              </div>
            </div>

            {/* Service Address & Quote Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                  Service Property Address
                </label>
                <input
                  type="text"
                  value={editServiceAddress}
                  onChange={(e) => setEditServiceAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-purple-600"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                  Quote Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as JobberQuote['quoteStatus'])}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-600"
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="AWAITING_RESPONSE">AWAITING RESPONSE</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="CONVERTED">CONVERTED</option>
                  <option value="CHANGES_REQUESTED">CHANGES REQUESTED</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </div>
            </div>

            {/* Service Requested, Bedrooms, Bathrooms (Synced with Google Sheets) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                  Service Requested
                </label>
                <input
                  type="text"
                  value={editService}
                  onChange={(e) => setEditService(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-purple-600"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1 flex items-center gap-1">
                  <BedDouble className="w-3 h-3 text-purple-600" />
                  <span>Bedrooms (Google Sheet)</span>
                </label>
                <select
                  value={editBedrooms}
                  onChange={(e) => setEditBedrooms(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-600"
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
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1 flex items-center gap-1">
                  <Bath className="w-3 h-3 text-cyan-600" />
                  <span>Bathrooms (Google Sheet)</span>
                </label>
                <select
                  value={editBathrooms}
                  onChange={(e) => setEditBathrooms(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-purple-600"
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

            {/* Pricing: Total, Custom Discount ($40 or custom), Deposit ($50 / $100 / custom) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                  Quote Total ($ CAD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editTotal}
                  onChange={(e) => setEditTotal(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-emerald-700 focus:outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-extrabold uppercase text-slate-500">
                    Custom Discount ($)
                  </label>
                  <div className="flex items-center gap-1">
                    {[0, 25, 40, 50].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleApplyQuickDiscount(d)}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer border ${
                          Number(editDiscount) === d
                            ? 'bg-pink-600 text-white border-pink-600'
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        ${d}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={editDiscount}
                  onChange={(e) => handleApplyQuickDiscount(Number(e.target.value) || 0)}
                  placeholder="e.g. 40"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-pink-700 focus:outline-none focus:border-pink-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-extrabold uppercase text-slate-500">
                    Deposit Required ($)
                  </label>
                  <div className="flex items-center gap-1">
                    {[0, 50, 100].map((dep) => (
                      <button
                        key={dep}
                        type="button"
                        onClick={() => setEditDeposit(String(dep))}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer border ${
                          Number(editDeposit) === dep
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        ${dep}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={editDeposit}
                  onChange={(e) => setEditDeposit(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-amber-800 focus:outline-none focus:border-amber-600"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                Quote Scope &amp; Special Instructions (Synced to Jobber)
              </label>
              <textarea
                rows={2}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-purple-600"
              />
            </div>
          </div>

          {/* 4. Schedule Quote & Assign Cleaners ("It could be scheduled" + Default No One + Multi-Cleaner) */}
          <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-purple-600 text-white">
                  <Calendar className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                    Schedule Quote to Calendar &amp; Jobber
                  </h3>
                  <p className="text-[11px] text-slate-600">
                    Pick date, time &amp; cleaner(s) (defaults to <strong>No One</strong> so you can assign 1 or multiple cleaners later).
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleScheduleQuoteJob}
                disabled={isSchedulingJob}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{isSchedulingJob ? 'Scheduling...' : 'Schedule Job on Calendar'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-600 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-purple-600" />
                  <span>Scheduled Date</span>
                </label>
                <input
                  type="date"
                  value={schedDate}
                  onChange={(e) => setSchedDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs font-mono font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-600 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-purple-600" />
                  <span>Start Time</span>
                </label>
                <input
                  type="time"
                  value={schedTime}
                  onChange={(e) => setSchedTime(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs font-mono font-bold text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase text-slate-600 mb-1.5 flex items-center gap-1">
                <Users className="w-3 h-3 text-purple-600" />
                <span>
                  Assign Cleaners ({schedCleaners.length === 0 ? 'No One Assigned Yet' : `${schedCleaners.length} Selected`})
                </span>
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setSchedCleaners([])}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer border transition-all ${
                    schedCleaners.length === 0
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  No One (Unassigned)
                </button>
                {AVAILABLE_CLEANERS.map((cleaner) => {
                  const selected = schedCleaners.includes(cleaner);
                  return (
                    <button
                      key={cleaner}
                      type="button"
                      onClick={() => toggleCleaner(cleaner)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer border transition-all flex items-center gap-1 ${
                        selected
                          ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                          : 'bg-white text-slate-700 border-purple-200 hover:bg-purple-100/60'
                      }`}
                    >
                      {selected && <Check className="w-3 h-3" />}
                      <span>{cleaner}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 5. Send Text Message: "This is your quote" Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-50 via-rose-50/60 to-purple-50 border border-pink-200 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-pink-600 text-white">
                  <MessageSquare className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                    Send Text to {editClientName || quote.clientName}: &ldquo;This is your quote&rdquo;
                  </h3>
                  <p className="text-[11px] text-slate-600">
                    To: <span className="font-mono font-bold text-slate-900">{editClientPhone || quote.clientPhone || 'No phone on file'}</span>
                    {quote.lastSmsSentAt && (
                      <span className="ml-2 text-emerald-700 font-bold">
                        • Last texted {new Date(quote.lastSmsSentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopySms}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
              >
                {copiedSms ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSms ? 'Copied!' : 'Copy Text'}</span>
              </button>
            </div>

            <textarea
              rows={3}
              value={smsText}
              onChange={(e) => setSmsText(e.target.value)}
              className="w-full p-3 bg-white border border-pink-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:border-pink-500"
            />

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleSendSmsViaQuo}
                disabled={isSendingSms}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-extrabold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingSms ? 'Sending Text...' : `Send Text Now ("This is your quote")`}</span>
              </button>

              {(editClientPhone || quote.clientPhone) && (
                <a
                  href={smsHref}
                  className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs"
                  title="Open in your phone or computer SMS app with this quote pre-filled"
                >
                  <Phone className="w-3.5 h-3.5 text-pink-400" />
                  <span>Open in SMS App</span>
                </a>
              )}
            </div>
          </div>

          {/* 6. Exact Jobber Line Items Breakdown Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px]">
                Jobber Product / Service Line Items
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {editBedrooms} • {editBathrooms} • Synced with Jobber &amp; Google Sheets
              </span>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase">
                <tr>
                  <th className="py-2.5 px-4">Service / Line Item</th>
                  <th className="py-2.5 px-3 text-right">Qty / Hrs</th>
                  <th className="py-2.5 px-3 text-right">Unit Price</th>
                  <th className="py-2.5 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {lineItems.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-semibold text-slate-900">{item.description}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600">{item.quantity}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600">
                      ${Number(item.unitPrice).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      ${Number(item.total).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200 font-mono">
                {discountNum > 0 && (
                  <tr>
                    <td colSpan={3} className="py-2 px-4 text-right text-pink-600 font-sans font-bold">
                      Custom Discount Applied
                    </td>
                    <td className="py-2 px-4 text-right font-bold text-pink-600">-${discountNum.toFixed(2)}</td>
                  </tr>
                )}
                <tr>
                  <td colSpan={3} className="py-2 px-4 text-right text-slate-500 font-sans font-semibold">
                    Subtotal
                  </td>
                  <td className="py-2 px-4 text-right font-bold text-slate-800">${subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="py-2 px-4 text-right text-slate-500 font-sans font-semibold">
                    Tax (12.5% GST &amp; Admin)
                  </td>
                  <td className="py-2 px-4 text-right font-bold text-slate-800">${taxAmount.toFixed(2)}</td>
                </tr>
                <tr className="bg-emerald-50/70 border-t border-emerald-200">
                  <td colSpan={3} className="py-3 px-4 text-right text-emerald-950 font-sans font-black text-sm">
                    Total Quote (CAD)
                  </td>
                  <td className="py-3 px-4 text-right font-black text-emerald-700 text-base">
                    ${totalNum.toFixed(2)}
                  </td>
                </tr>
                {depositNum > 0 && (
                  <tr>
                    <td colSpan={3} className="py-2 px-4 text-right text-slate-500 font-sans font-semibold">
                      Required Deposit
                    </td>
                    <td className="py-2 px-4 text-right font-bold text-amber-700">
                      ${depositNum.toFixed(2)}
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleSaveAndSyncQuote}
              disabled={isSavingAdjustments}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSavingAdjustments ? 'Saving...' : 'Save & Sync to Jobber'}</span>
            </button>

            <button
              type="button"
              onClick={handleScheduleQuoteJob}
              disabled={isSchedulingJob}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Schedule Job</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
