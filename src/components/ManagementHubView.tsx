import React, { useState } from 'react';
import { 
  SlidersHorizontal, 
  FileCheck, 
  Receipt, 
  Users, 
  RefreshCw, 
  PhoneCall, 
  HelpCircle, 
  ShieldCheck, 
  FileText, 
  ArrowRight, 
  Truck, 
  Globe, 
  ExternalLink,
  Sparkles,
  Database,
  Building,
  Key,
  Edit2,
  MapPin,
  Phone,
  User,
  Navigation,
  ShieldAlert,
  Mic,
  ClipboardList,
  FileArchive,
  CloudUpload,
  Tag,
  FileSpreadsheet,
  FolderOpen,
  Calendar,
  Compass,
  Zap,
  MessageSquare,
  Plus,
  Maximize2,
  PanelRightOpen,
  Flame,
  CheckCircle2,
  HardDrive,
  ClipboardPaste,
  Map as MapIcon,
} from 'lucide-react';
import { Technician } from '../types/dispatch';
import {
  TIDYUPS_DRIVE_FOLDER_NAME,
  saveAndDownloadNumberedProjectBackupZip,
  uploadWholeProjectZipToDriveFolder,
  downloadFileFromApiWithoutNavigation,
} from '../services/googleDriveBackupService';

interface ManagementHubViewProps {
  onNavigateToVoiceIntake?: () => void;
  onNavigateToIntakes?: () => void;
  onNavigateToQuotes: () => void;
  onNavigateToInvoices: () => void;
  onOpenStaffRoster: () => void;
  onOpenJobberSync: () => void;
  onOpenQuoModal: () => void;
  onOpenSpamShield?: () => void;
  onNavigateToSpamShield?: () => void;
  onNavigateToLegal: (tab: 'SUPPORT' | 'TERMS' | 'PRIVACY') => void;
  onNavigateToCustomerPortal: () => void;
  onOpenPriceList?: () => void;
  onNavigateToMasterHub?: () => void;
  onNavigateToPasteTable?: () => void;
  onNavigateToCleanSheet?: () => void;
  onNavigateToAddressRadar?: () => void;
  onNavigateToDispatchMap?: () => void;
  onNavigateToSchedule?: () => void;
  onNavigateToUnscheduled?: () => void;
  onNavigateToClients?: () => void;
  onOpenQuickLinks?: () => void;
  onOpenQuickReplies?: () => void;
  onOpenPublicBookingModal?: () => void;
  onOpenNewTicketModal?: () => void;
  onOpenAiDispatchModal?: () => void;
  onToggleZenMode?: () => void;
  onToggleBoard?: () => void;
  onToggleRearrangeBars?: () => void;
  isRearrangingBars?: boolean;
  onSyncEverything?: () => void;
  isSyncingEverything?: boolean;
  onSwitchBrand?: (brand: 'dispatchgeeni' | 'tidyups' | 'easycleans') => void;
  catalogCount?: number;
  intakesCount?: number;
  quotesCount?: number;
  invoicesCount?: number;
  leadsCount?: number;
  clientsCount?: number;
  scheduledCount?: number;
  callsCount?: number;
  staffCount?: number;
  cleanersCount?: number;
  technicians?: Technician[];
  onEditVanHub?: (tech: Technician) => void;
  onSyncFirestore?: () => void;
  isSyncingFirestore?: boolean;
  lastSyncedAllAt?: string | null;
  firestoreSyncStatus?: string | null;
  deltaSyncStats?: {
    deltaWritesCount: number;
    unchangedSkippedCount: number;
    lastDeltaSyncAt?: string;
  } | null;
  onOpenProjectBackup?: () => void;
  onOpenAccessManager?: () => void;
  onNavigateToFbMessengerAi?: () => void;
}

export const ManagementHubView: React.FC<ManagementHubViewProps> = ({
  onNavigateToVoiceIntake,
  onNavigateToIntakes,
  onNavigateToQuotes,
  onNavigateToInvoices,
  onOpenStaffRoster,
  onOpenJobberSync,
  onOpenQuoModal,
  onOpenSpamShield,
  onNavigateToSpamShield,
  onNavigateToLegal,
  onNavigateToCustomerPortal,
  onOpenPriceList,
  onNavigateToMasterHub,
  onNavigateToPasteTable,
  onNavigateToCleanSheet,
  onNavigateToAddressRadar,
  onNavigateToDispatchMap,
  onNavigateToSchedule,
  onNavigateToUnscheduled,
  onNavigateToClients,
  onOpenQuickLinks,
  onOpenQuickReplies,
  onOpenPublicBookingModal,
  onOpenNewTicketModal,
  onOpenAiDispatchModal,
  onToggleZenMode,
  onToggleBoard,
  onToggleRearrangeBars,
  isRearrangingBars = false,
  onSyncEverything,
  isSyncingEverything = false,
  onSwitchBrand,
  catalogCount = 28,
  intakesCount = 0,
  quotesCount = 0,
  invoicesCount = 0,
  leadsCount = 0,
  clientsCount = 0,
  scheduledCount = 0,
  callsCount = 0,
  staffCount = 15,
  cleanersCount = 15,
  technicians = [],
  onEditVanHub,
  onSyncFirestore,
  isSyncingFirestore = false,
  lastSyncedAllAt,
  firestoreSyncStatus,
  deltaSyncStats,
  onOpenProjectBackup,
  onOpenAccessManager,
  onNavigateToFbMessengerAi,
}) => {
  const [isUploadingProjectDrive, setIsUploadingProjectDrive] = useState(false);
  const [driveBackupNotice, setDriveBackupNotice] = useState<{
    text: string;
    folderUrl?: string;
    downloadUrl?: string;
    downloadFilename?: string;
    isError?: boolean;
  } | null>(null);

  const handleOneClickDriveUpload = async () => {
    setIsUploadingProjectDrive(true);
    setDriveBackupNotice(null);
    try {
      const res = await uploadWholeProjectZipToDriveFolder({ forceRebuild: true });
      const fname = res.file?.name || 'app.tidyups.cleaning-PR6.zip';
      setDriveBackupNotice({
        text: `✓ Built & Loaded "${fname}" (${res.prLabel || 'PR6'}) directly into folder "${res.folder.name}" in your Google Drive!`,
        folderUrl: res.folder.webViewLink,
        downloadUrl: `/api/project/download-saved-zip?filename=${encodeURIComponent(fname)}`,
        downloadFilename: fname,
      });
    } catch (err: any) {
      // Also build on server so the user can still download or open the Backup Modal immediately
      try {
        const localRes = await saveAndDownloadNumberedProjectBackupZip({ autoGithubBackup: true });
        setDriveBackupNotice({
          text: `✓ Built "${localRes.filename}" (${localRes.prLabel}) on server! Click "All Backups, Drive & GitHub" to sign in to Google Drive and load it to your Drive.`,
          downloadUrl: localRes.downloadUrl,
          downloadFilename: localRes.filename,
        });
      } catch {
        setDriveBackupNotice({
          text: err?.message || 'Could not build or upload numbered Backup ZIP.',
          isError: true,
        });
      }
      if (onOpenProjectBackup) {
        onOpenProjectBackup();
      }
    } finally {
      setIsUploadingProjectDrive(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-slate-900 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-5">
      {/* Top Quick-Jump Button Bar on Owner's Hub */}
      <div className="rounded-2xl bg-slate-950/90 border border-slate-700/80 px-3 py-2 flex flex-wrap items-center justify-between gap-2 shadow-md">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={onNavigateToQuotes}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md transition-all"
          >
            <FileCheck className="w-3.5 h-3.5 text-slate-950 shrink-0" />
            <span>📋 Quotes ({quotesCount})</span>
          </button>
          <button
            type="button"
            onClick={onNavigateToInvoices}
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Receipt className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Invoices ({invoicesCount})</span>
          </button>
          <button
            type="button"
            onClick={onNavigateToMasterHub}
            className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Master Leads &amp; Quotes ({leadsCount + quotesCount})</span>
          </button>
          <button
            type="button"
            onClick={onNavigateToPasteTable}
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <ClipboardPaste className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Paste Table</span>
          </button>
          {onNavigateToFbMessengerAi && (
            <button
              type="button"
              onClick={onNavigateToFbMessengerAi}
              className="px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/40 text-blue-300 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>FB Messenger AI (3 Pages)</span>
            </button>
          )}
          <button
            type="button"
            onClick={onNavigateToVoiceIntake}
            className="px-3 py-1.5 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-400/40 text-pink-300 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Mic className="w-3.5 h-3.5 text-pink-400 shrink-0" />
            <span>Voice Dictation &amp; Intake</span>
          </button>
          <button
            type="button"
            onClick={onNavigateToDispatchMap}
            className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/40 text-purple-300 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Navigation className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span>Dispatch Map</span>
          </button>
          <button
            type="button"
            onClick={onNavigateToAddressRadar}
            className="px-3 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-300 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <MapIcon className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>Quick Map Radar</span>
          </button>
          <button
            type="button"
            onClick={onNavigateToSchedule}
            className="px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-indigo-300 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>Schedule ({scheduledCount})</span>
          </button>
          <button
            type="button"
            onClick={onNavigateToClients}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Users className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Clients ({clientsCount})</span>
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleOneClickDriveUpload}
            disabled={isUploadingProjectDrive}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <FileArchive className="w-3.5 h-3.5 text-white shrink-0" />
            <span>{isUploadingProjectDrive ? 'Saving PR# ZIP...' : '📦 Save Backup ZIP (PR6+)'}</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenSpamShield()}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-white shrink-0" />
            <span>Block Spam Caller</span>
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="border-b border-slate-800 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-bold">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              👑 Owner Hub — All App Buttons &amp; Operations
            </h1>
            {/* Relocated Compact Domain Button inside Management Section */}
            <button
              type="button"
              onClick={() => onSwitchBrand?.('tidyups')}
              className="px-2.5 py-1 rounded-lg bg-emerald-700/90 hover:bg-emerald-600 text-white border border-emerald-500/40 text-[11px] font-extrabold transition-all flex items-center gap-1 cursor-pointer shadow-xs"
              title="Active Domain: TidyUps Cleaning (app.tidyupscleaning.com)"
            >
              <span>✨</span>
              <span>app.tidyupscleaning.com</span>
            </button>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Clean header above with your main workflow tabs • Every single Owner, Admin, Phone, Sync, Map &amp; Tool button is organized right here in 1 click.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onSyncEverything && (
            <button
              type="button"
              onClick={onSyncEverything}
              disabled={isSyncingEverything}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
              title="1-Click Incremental Delta Sync: Quotes, Invoices, Jobber Visits, Clients, Quo Calls & Master Leads Sheet"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingEverything ? 'animate-spin' : ''}`} />
              <span>{isSyncingEverything ? 'Delta Syncing...' : 'Sync Everything (Incremental Delta)'}</span>
            </button>
          )}
          {onSyncFirestore && (
            <button
              type="button"
              onClick={onSyncFirestore}
              disabled={isSyncingFirestore}
              className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
              title="Push only new/updated records to Firebase Firestore"
            >
              <Database className={`w-3.5 h-3.5 ${isSyncingFirestore ? 'animate-spin' : ''}`} />
              <span>{isSyncingFirestore ? 'Updating Firestore...' : 'Delta Sync to Firebase'}</span>
            </button>
          )}
          <button
            onClick={handleOneClickDriveUpload}
            disabled={isUploadingProjectDrive}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
            title="1-Click: Build, Save & Download Numbered PR6+ Backup ZIP directly from app.tidyupscleaning.com (Computer + Server + GitHub)"
          >
            <FileArchive className="w-3.5 h-3.5 text-white" />
            <span>
              {isUploadingProjectDrive
                ? 'Building & Saving PR# Backup ZIP...'
                : '1-Click Save & Download Backup ZIP'}
            </span>
          </button>
          {onOpenAccessManager && (
            <button
              type="button"
              onClick={onOpenAccessManager}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
              title="Owner Password & Access Control: Set passwords for Owner, Dispatchers & Cleaners and grant Full Access to Everything"
            >
              <Key className="w-3.5 h-3.5 text-slate-950" />
              <span>🔑 Passwords &amp; Staff Access</span>
            </button>
          )}
        </div>
      </div>

      {/* LIVE INCREMENTAL DELTA STORAGE & RESUME WHERE YOU LEFT OFF BANNER */}
      <div className="bg-gradient-to-r from-emerald-950/90 via-slate-900 to-indigo-950/90 border border-emerald-500/40 rounded-3xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Incremental Delta Sync Active</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                <span>Always Resumes Where You Left Off</span>
              </span>
              {lastSyncedAllAt && (
                <span className="text-[11px] font-mono text-slate-400">
                  Last Saved: {new Date(lastSyncedAllAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-200 font-semibold leading-relaxed">
              Every time a new lead, quote, call transcript, or Jobber update comes in, <strong className="text-emerald-300">only the new or changed records (Delta Updates)</strong> are saved to your Server Store &amp; Firebase Firestore — never re-uploading everything from scratch. When you open your screen, it loads your <strong className="text-cyan-300">exact last active tab &amp; newest data</strong> immediately.
            </p>
            {firestoreSyncStatus && (
              <p className="text-xs text-emerald-300 font-mono font-bold">{firestoreSyncStatus}</p>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-center">
              <div className="text-[10px] font-bold uppercase text-slate-400">Live Leads</div>
              <div className="text-base font-black text-emerald-400 font-mono">{leadsCount}</div>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-center">
              <div className="text-[10px] font-bold uppercase text-slate-400">Jobber Quotes</div>
              <div className="text-base font-black text-amber-400 font-mono">{quotesCount}</div>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-center">
              <div className="text-[10px] font-bold uppercase text-slate-400">Clients &amp; Jobs</div>
              <div className="text-base font-black text-cyan-400 font-mono">{clientsCount} / {scheduledCount}</div>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-center">
              <div className="text-[10px] font-bold uppercase text-slate-400">Delta Writes</div>
              <div className="text-base font-black text-purple-400 font-mono">
                {deltaSyncStats ? `${deltaSyncStats.deltaWritesCount} new / ${deltaSyncStats.unchangedSkippedCount} cached` : 'Up to Date'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 👑 ALL APP BUTTONS — OWNER COMMAND LAUNCHPAD */}
      <div className="bg-[#131722] border-2 border-amber-500/40 rounded-3xl p-5 sm:p-6 space-y-5 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3.5">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
              <span>🎛️</span>
              <span>All App Buttons &amp; Owner Launchpad (Every Tool in One Place)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              We moved secondary buttons out of the top header so your header stays clean. Click any button below to open that page or tool immediately.
            </p>
          </div>
          {onToggleRearrangeBars && (
            <button
              type="button"
              onClick={onToggleRearrangeBars}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 border cursor-pointer transition-all self-start ${
                isRearrangingBars
                  ? 'bg-amber-400 text-slate-950 border-amber-300'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
              }`}
            >
              <span>⇄</span>
              <span>{isRearrangingBars ? 'Done Moving Header/Footer Buttons' : 'Move / Rearrange Header & Footer'}</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Group 1: Daily Workflow, Leads & Quotes */}
          <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-4 space-y-2.5">
            <div className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 pb-1 border-b border-slate-800">
              <FileSpreadsheet className="w-4 h-4" />
              <span>1. Leads, Quotes &amp; Intakes</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {onNavigateToMasterHub && (
                <button
                  type="button"
                  onClick={onNavigateToMasterHub}
                  className="w-full px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black flex items-center justify-between cursor-pointer shadow-sm"
                >
                  <span className="flex items-center gap-2"><FileSpreadsheet className="w-3.5 h-3.5" /> Master Leads &amp; Quotes Table</span>
                  <span className="px-1.5 py-0.5 rounded bg-black/25 font-mono text-[10px]">{leadsCount + quotesCount}</span>
                </button>
              )}
              {onNavigateToPasteTable && (
                <button
                  type="button"
                  onClick={onNavigateToPasteTable}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-200 border border-emerald-500/30 text-xs font-bold flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2"><ClipboardList className="w-3.5 h-3.5 text-emerald-400" /> Paste Table &amp; Lead Parser</span>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                </button>
              )}
              {onNavigateToFbMessengerAi && (
                <button
                  type="button"
                  onClick={onNavigateToFbMessengerAi}
                  className="w-full px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-black flex items-center justify-between cursor-pointer shadow-sm"
                >
                  <span className="flex items-center gap-2"><MessageSquare className="w-3.5 h-3.5" /> 3-Page FB Messenger AI Bot</span>
                  <span className="px-1.5 py-0.5 rounded bg-black/25 font-mono text-[10px]">Live AI</span>
                </button>
              )}
              {onNavigateToVoiceIntake && (
                <button
                  type="button"
                  onClick={onNavigateToVoiceIntake}
                  className="w-full px-3 py-2 rounded-xl bg-pink-600/90 hover:bg-pink-500 text-white text-xs font-black flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2"><Mic className="w-3.5 h-3.5" /> Voice Dictation &amp; Quick Quote</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
              {onNavigateToCleanSheet && (
                <button
                  type="button"
                  onClick={onNavigateToCleanSheet}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-bold flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2"><Flame className="w-3.5 h-3.5 text-rose-400" /> Clean Google Sheet / Ad Leads</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-950 text-emerald-300 font-mono text-[10px]">{leadsCount}</span>
                </button>
              )}
              {onNavigateToIntakes && (
                <button
                  type="button"
                  onClick={onNavigateToIntakes}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-bold flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2"><ClipboardList className="w-3.5 h-3.5 text-pink-400" /> Intakes Log Page</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-950 text-pink-300 font-mono text-[10px]">{intakesCount}</span>
                </button>
              )}
              <button
                type="button"
                onClick={onNavigateToQuotes}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-bold flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2"><FileCheck className="w-3.5 h-3.5 text-amber-400" /> Quotes Pipeline</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-950 text-amber-300 font-mono text-[10px]">{quotesCount}</span>
              </button>
              <button
                type="button"
                onClick={onNavigateToInvoices}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-bold flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2"><Receipt className="w-3.5 h-3.5 text-emerald-400" /> Invoices &amp; Billing</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-950 text-emerald-300 font-mono text-[10px]">{invoicesCount}</span>
              </button>
            </div>
          </div>

          {/* Group 2: Dispatch Map, Radar, Schedule & Tickets */}
          <div className="bg-slate-900/90 border border-blue-500/30 rounded-2xl p-4 space-y-2.5">
            <div className="text-xs font-black uppercase tracking-wider text-blue-400 flex items-center gap-1.5 pb-1 border-b border-slate-800">
              <Navigation className="w-4 h-4" />
              <span>2. Map, Radar &amp; Schedule</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {onNavigateToDispatchMap && (
                <button
                  type="button"
                  onClick={onNavigateToDispatchMap}
                  className="w-full px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black flex items-center justify-between cursor-pointer shadow-sm"
                >
                  <span className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> Live Dispatch Map &amp; GPS</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
              {onNavigateToAddressRadar && (
                <button
                  type="button"
                  onClick={onNavigateToAddressRadar}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-200 border border-purple-500/30 text-xs font-bold flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2"><Compass className="w-3.5 h-3.5 text-purple-400" /> Quick Map &amp; Schedule Radar</span>
                  <ArrowRight className="w-3.5 h-3.5 text-purple-400" />
                </button>
              )}
              {onNavigateToSchedule && (
                <button
                  type="button"
                  onClick={onNavigateToSchedule}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-bold flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-cyan-400" /> Schedule Calendar</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-950 text-cyan-300 font-mono text-[10px]">{scheduledCount}</span>
                </button>
              )}
              {onNavigateToClients && (
                <button
                  type="button"
                  onClick={onNavigateToClients}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-bold flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2"><Users className="w-3.5 h-3.5 text-blue-400" /> Clients Database</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-950 text-blue-300 font-mono text-[10px]">{clientsCount}</span>
                </button>
              )}
              {onOpenNewTicketModal && (
                <button
                  type="button"
                  onClick={onOpenNewTicketModal}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-bold flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2"><Plus className="w-3.5 h-3.5 text-emerald-400" /> + Create Service Ticket</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
              {onOpenAiDispatchModal && (
                <button
                  type="button"
                  onClick={onOpenAiDispatchModal}
                  className="w-full px-3 py-2 rounded-xl bg-blue-950/80 hover:bg-blue-900 text-blue-200 border border-blue-500/30 text-xs font-bold flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-blue-400" /> AI Dispatch Assistant</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
              <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                {onToggleZenMode && (
                  <button
                    type="button"
                    onClick={() => {
                      onNavigateToDispatchMap?.();
                      onToggleZenMode();
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Maximize2 className="w-3 h-3 text-cyan-400" /> Full Map
                  </button>
                )}
                {onToggleBoard && (
                  <button
                    type="button"
                    onClick={() => {
                      onNavigateToDispatchMap?.();
                      onToggleBoard();
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <PanelRightOpen className="w-3 h-3 text-blue-400" /> Toggle Board
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Group 3: Phone Lines, SMS, Spam Shield & Customer Portal */}
          <div className="bg-slate-900/90 border border-violet-500/30 rounded-2xl p-4 space-y-2.5">
            <div className="text-xs font-black uppercase tracking-wider text-violet-400 flex items-center gap-1.5 pb-1 border-b border-slate-800">
              <PhoneCall className="w-4 h-4" />
              <span>3. Phone Lines, SMS &amp; Spam</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={onOpenQuoModal}
                className="w-full px-3 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-black flex items-center justify-between cursor-pointer shadow-sm"
              >
                <span className="flex items-center gap-2"><PhoneCall className="w-3.5 h-3.5" /> Quo (6 Lines &amp; Transcripts)</span>
                <span className="px-1.5 py-0.5 rounded bg-black/25 font-mono text-[10px]">{callsCount || '6 Lines'}</span>
              </button>
              {onNavigateToSpamShield && (
                <button
                  type="button"
                  onClick={onNavigateToSpamShield}
                  className="w-full px-3 py-2 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-black flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2"><ShieldAlert className="w-3.5 h-3.5" /> Spam Shield Console Page</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
              {onOpenSpamShield && (
                <button
                  type="button"
                  onClick={() => onOpenSpamShield()}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-200 border border-rose-500/30 text-xs font-bold flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2"><ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Block Caller / Area Code Modal</span>
                  <ArrowRight className="w-3.5 h-3.5 text-rose-400" />
                </button>
              )}
              {onOpenQuickReplies && (
                <button
                  type="button"
                  onClick={onOpenQuickReplies}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-pink-200 border border-pink-500/30 text-xs font-bold flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2"><MessageSquare className="w-3.5 h-3.5 text-pink-400" /> SMS Quick Replies</span>
                  <ArrowRight className="w-3.5 h-3.5 text-pink-400" />
                </button>
              )}
              {onOpenQuickLinks && (
                <button
                  type="button"
                  onClick={onOpenQuickLinks}
                  className="w-full px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-xs font-bold flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2"><Zap className="w-3.5 h-3.5 text-amber-400" /> Quick Links &amp; Shortcuts</span>
                  <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                </button>
              )}
              <button
                type="button"
                onClick={onNavigateToCustomerPortal}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-bold flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-fuchsia-400" /> Customer Booking Page (/booking)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              {onOpenPublicBookingModal && (
                <button
                  type="button"
                  onClick={onOpenPublicBookingModal}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-200 border border-teal-500/30 text-xs font-bold flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2"><Globe className="w-3.5 h-3.5 text-teal-400" /> Book Online Popup Form</span>
                  <ArrowRight className="w-3.5 h-3.5 text-teal-400" />
                </button>
              )}
            </div>
          </div>

          {/* Group 4: Owner Admin, Price List, Jobber Sync, Staff & Backups */}
          <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 space-y-2.5">
            <div className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5 pb-1 border-b border-slate-800">
              <Key className="w-4 h-4" />
              <span>4. Owner Admin, Sync &amp; Backups</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {onOpenAccessManager && (
                <button
                  type="button"
                  onClick={onOpenAccessManager}
                  className="w-full px-3 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-slate-950 text-xs font-black flex items-center justify-between cursor-pointer shadow-sm"
                >
                  <span className="flex items-center gap-2"><Key className="w-3.5 h-3.5" /> Passwords &amp; Staff Access</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={onOpenJobberSync}
                className="w-full px-3 py-2 rounded-xl bg-emerald-950/90 hover:bg-emerald-900 text-emerald-200 border border-emerald-500/40 text-xs font-bold flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2"><Database className="w-3.5 h-3.5 text-emerald-400" /> Jobber CRM Sync Hub</span>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
              </button>
              {onOpenPriceList && (
                <button
                  type="button"
                  onClick={onOpenPriceList}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-200 border border-emerald-500/30 text-xs font-bold flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2"><Tag className="w-3.5 h-3.5 text-emerald-400" /> Service Catalog Price List</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-950 text-emerald-300 font-mono text-[10px]">{catalogCount}</span>
                </button>
              )}
              <button
                type="button"
                onClick={onOpenStaffRoster}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-bold flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2"><Truck className="w-3.5 h-3.5 text-purple-400" /> Staff Roster &amp; 15 Vans</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-950 text-purple-300 font-mono text-[10px]">{staffCount}</span>
              </button>
              {onOpenProjectBackup && (
                <button
                  type="button"
                  onClick={onOpenProjectBackup}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 text-xs font-bold flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2"><FileArchive className="w-3.5 h-3.5 text-emerald-400" /> Backup ZIP, Drive &amp; GitHub</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onNavigateToLegal('SUPPORT')}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 text-xs font-bold flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2"><HelpCircle className="w-3.5 h-3.5 text-cyan-400" /> Support, Terms &amp; Privacy</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid of Management Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* 00. 2-Page Facebook Messenger AI Bot, Live Prompt Tweaker & Auto-Sync */}
        {onNavigateToFbMessengerAi && (
          <div className="bg-gradient-to-br from-[#121c36] via-[#151923] to-[#151923] border border-blue-500/50 hover:border-blue-400 rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-xl transition-all group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/25 to-indigo-500/25 text-blue-400 border border-blue-500/40 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-950 text-blue-300 border border-blue-800">
                  💬 2 Facebook Pages • Live AI
                </span>
              </div>
              <div>
                <h3 className="font-black text-lg text-white">Facebook Messenger AI Bot (2 Pages)</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Monitors both Facebook Pages for Ad clicks &amp; DMs, answers customer questions, collects <strong className="text-blue-300">Service, Bedrooms/Bathrooms &amp; Preferred Date</strong>, lets you tweak the AI rules or jump in live, and auto-syncs to Google Sheets (<code className="text-emerald-300">FB Leads</code>) + Jobber Quote.
                </p>
              </div>
            </div>

            <button
              onClick={onNavigateToFbMessengerAi}
              className="w-full py-2.5 px-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Open 2-Page FB Messenger AI &amp; Live Tweaker</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 0. Voice Dictations, Customer Request Intake & Quick Quote Box */}
        <div className="bg-gradient-to-br from-[#1b1528] via-[#151923] to-[#151923] border border-pink-500/40 hover:border-pink-500 rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-xl transition-all group">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500/25 to-purple-500/25 text-pink-400 border border-pink-500/40 flex items-center justify-center">
                <ClipboardList className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-pink-950 text-pink-300 border border-pink-800">
                🎙️ {intakesCount > 0 ? `${intakesCount} Intakes` : 'Live Dictation'}
              </span>
            </div>
            <div>
              <h3 className="font-black text-lg text-white">Voice Intakes &amp; Quick Quote</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Live voice dictation auto-fills the customer request form (Name, Phone, Address, Cleaning Type, Bedrooms, Bathrooms &amp; Specific Info) with Quick Quote, Quick Map &amp; Jobber sync.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            {onNavigateToVoiceIntake && (
              <button
                onClick={onNavigateToVoiceIntake}
                className="flex-1 py-2.5 px-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-95 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Voice Intake &amp; Quote</span>
              </button>
            )}
            {onNavigateToIntakes && (
              <button
                onClick={onNavigateToIntakes}
                className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Intakes Log ({intakesCount})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 0B. Whole Project & Workflows ZIP — 1-Click Upload to Google Drive Folder */}
        <div className="bg-gradient-to-br from-[#112420] via-[#151923] to-[#151923] border border-emerald-500/40 hover:border-emerald-400 rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-xl transition-all group">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/25 to-teal-500/25 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
                <CloudUpload className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                📁 {TIDYUPS_DRIVE_FOLDER_NAME}
              </span>
            </div>
            <div>
              <h3 className="font-black text-lg text-white">1-Click Numbered Backup ZIP (PR6+)</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Works directly on <strong className="text-emerald-300">app.tidyupscleaning.com</strong> with zero popups! Builds &amp; downloads your numbered <code className="text-emerald-300 font-mono">.zip</code> (<code className="text-emerald-300">PR6</code>, <code className="text-emerald-300">PR7</code>...) straight to your computer AND saves a copy to the Server &amp; GitHub.
              </p>
              {driveBackupNotice && (
                <div
                  className={`mt-2 p-2.5 rounded-xl text-[11px] font-bold flex flex-wrap items-center justify-between gap-2 ${
                    driveBackupNotice.isError
                      ? 'bg-rose-950/80 text-rose-200 border border-rose-700'
                      : 'bg-emerald-950/80 text-emerald-200 border border-emerald-700'
                  }`}
                >
                  <span>{driveBackupNotice.text}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {driveBackupNotice.downloadUrl && (
                      <a
                        href={driveBackupNotice.downloadUrl}
                        download={driveBackupNotice.downloadFilename || true}
                        className="px-2 py-1 rounded-lg bg-cyan-600 text-white text-[10px] font-black flex items-center gap-1 shrink-0"
                      >
                        <span>⬇️ Download ZIP</span>
                      </a>
                    )}
                    {driveBackupNotice.folderUrl && (
                      <a
                        href={driveBackupNotice.folderUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-black flex items-center gap-1 shrink-0"
                      >
                        <span>Open Drive Folder</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleOneClickDriveUpload}
              disabled={isUploadingProjectDrive}
              className="flex-1 py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
            >
              <CloudUpload className="w-3.5 h-3.5" />
              <span>
                {isUploadingProjectDrive ? 'Building & Loading to Drive...' : '☁️ Build & Load ZIP to Google Drive'}
              </span>
            </button>
            {onOpenProjectBackup && (
              <button
                onClick={onOpenProjectBackup}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>All Backups, Drive &amp; GitHub</span>
              </button>
            )}
          </div>
        </div>

        {/* 1. Quotes Pipeline */}
        <div className="bg-[#151923] border border-slate-800 hover:border-amber-500/50 rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-xl transition-all group">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-black text-lg text-white">Quotes Pipeline</h3>
                {quotesCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800">
                    ⚡ {quotesCount} in Local DB
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Fast local database copy loads in 0ms. Incremental Jobber delta sync only pulls modified quotes, preserving your entire pipeline.
              </p>
            </div>
          </div>

          <button
            onClick={onNavigateToQuotes}
            className="w-full py-2.5 px-4 bg-amber-600/90 hover:bg-amber-600 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md group-hover:translate-x-0.5"
          >
            <span>Open Quotes Pipeline (Local DB)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* 1B. Service Catalog & Price List Card */}
        <div className="bg-[#151923] border border-slate-800 hover:border-pink-500/50 rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-xl transition-all group">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center justify-center">
              <Tag className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-black text-lg text-white">Service Catalog &amp; Price List</h3>
                <span className="text-xs font-mono font-bold text-pink-300">
                  {catalogCount || 46} Items
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Formula: <strong className="text-slate-200 font-mono">Number of Cleaners (QTY × Unit Price) = Total</strong>. 2 Cleaners (3 × $105) = $315 ↔ 1 Cleaner (6 × $52.50) = $315.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={onOpenPriceList}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-95 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md group-hover:translate-x-0.5"
            >
              <span>Open Service Catalog &amp; Price List</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                downloadFileFromApiWithoutNavigation(
                  '/api/price-list/export.xlsx?project=tidyups',
                  `TidyUps_Service_Catalog_Price_List_${new Date().toISOString().slice(0, 10)}.xlsx`
                )
              }
              className="w-full py-2 px-4 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Download Live Google Sheets (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* 2. Invoices & Billing */}
        <div className="bg-[#151923] border border-slate-800 hover:border-emerald-500/50 rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-xl transition-all group">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-black text-lg text-white">Invoices &amp; Billing</h3>
                {invoicesCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                    ⚡ {invoicesCount} in Local DB
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Real-time billing ledger cached in database. Tracks paid and due balances with fast incremental delta sync from Jobber.
              </p>
            </div>
          </div>

          <button
            onClick={onNavigateToInvoices}
            className="w-full py-2.5 px-4 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md group-hover:translate-x-0.5"
          >
            <span>Open Invoices &amp; Billing (Local DB)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* 3. Staff, Vans & Hubs Roster */}
        <div className="bg-[#151923] border border-slate-800 hover:border-purple-500/50 rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-xl transition-all group">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-black text-lg text-white">Staff &amp; Roster Master</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800">
                  {staffCount} Members
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Manage mobile cleaning staff, roles, spreadsheet CSV imports, archive status, and employee permissions.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenStaffRoster}
            className="w-full py-2.5 px-4 bg-purple-600/90 hover:bg-purple-600 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md group-hover:translate-x-0.5"
          >
            <span>Open Staff Roster Spreadsheet</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* 4. Quo Voice Intake & Contacts */}
        <div className="bg-[#151923] border border-slate-800 hover:border-pink-500/50 rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-xl transition-all group">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center justify-center">
              <PhoneCall className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-lg text-white">Quo Voice &amp; Contacts</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Access incoming voice calls, call transcripts, auto-logged phone leads, and synchronized Quo contact lists.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenQuoModal}
            className="w-full py-2.5 px-4 bg-pink-600/90 hover:bg-pink-600 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md group-hover:translate-x-0.5"
          >
            <span>Open Quo Voice Desk</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Twilio Spam Shield & Call Blocker */}
        <div className="bg-[#151923] border border-slate-800 hover:border-rose-500/50 rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-xl transition-all group">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-black text-lg text-white">Twilio Spam Shield</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800">
                  Live TwiML
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Block country codes, repetitive rotating numbers (prefixes &amp; wildcards), and robocalls. Returns instant busy tone before phones ring.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => {
                if (onNavigateToSpamShield) onNavigateToSpamShield();
                else if (onOpenSpamShield) onOpenSpamShield();
              }}
              className="flex-1 py-2.5 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
            >
              <span>Full Spam Console</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (onOpenSpamShield) onOpenSpamShield();
                else if (onNavigateToSpamShield) onNavigateToSpamShield();
              }}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              title="Open quick 1-click blocker modal"
            >
              <span>Quick Modal</span>
            </button>
          </div>
        </div>

        {/* 5. Support & Dispatch Policies */}
        <div className="bg-[#151923] border border-slate-800 hover:border-blue-500/50 rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-xl transition-all group">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-lg text-white">Support &amp; Policies</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Dispatch support desk, customer satisfaction guidelines, damage protocols, and staff training documentation.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateToLegal('SUPPORT')}
            className="w-full py-2.5 px-4 bg-blue-600/90 hover:bg-blue-600 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md group-hover:translate-x-0.5"
          >
            <span>Open Support &amp; Policies</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* 6. Terms of Service & Privacy */}
        <div className="bg-[#151923] border border-slate-800 hover:border-slate-600 rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-xl transition-all group">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-lg text-white">Terms &amp; Privacy</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Legal customer agreements, cancellation policy clauses, deposit requirements, and privacy disclosures.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateToLegal('TERMS')}
              className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
            >
              Terms of Service
            </button>
            <button
              onClick={() => onNavigateToLegal('PRIVACY')}
              className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
            >
              Privacy Policy
            </button>
          </div>
        </div>

        {/* 7. Customer Booking Portal */}
        <div className="bg-[#151923] border border-slate-800 hover:border-pink-500/50 rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-xl transition-all group">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 text-pink-400 border border-pink-500/30 flex items-center justify-center">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-lg text-white">Customer Booking Portal</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Public client booking landing page for residential and commercial customers to request cleaning estimates.
              </p>
            </div>
          </div>

          <button
            onClick={onNavigateToCustomerPortal}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
          >
            <span>Open Booking Portal View</span>
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>

        {/* 8. Firebase Cloud Firestore Database */}
        <div className="bg-[#151923] border border-slate-800 hover:border-indigo-500/50 rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4 shadow-xl transition-all group">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-black text-lg text-white">Cloud Firestore</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Persistent multi-tenant database: clients, scheduled visits, unscheduled jobs, quotes, invoices, and van hubs.
              </p>
              <div className="mt-2 text-[10px] font-mono text-indigo-300 bg-slate-900/80 p-2 rounded-xl border border-slate-800 truncate">
                ai-studio-cleaningserviced-8a2493ab-cb9d-4c28-a60b-c28e7d08d30e
              </div>
            </div>
          </div>

          {onSyncFirestore && (
            <button
              onClick={onSyncFirestore}
              disabled={isSyncingFirestore}
              className="w-full py-2.5 px-4 bg-indigo-600/90 hover:bg-indigo-600 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingFirestore ? 'animate-spin' : ''}`} />
              <span>{isSyncingFirestore ? 'Syncing to Firestore...' : 'Sync Live Store to Firestore'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Fleet & Van Hubs Direct Management Section */}
      <div className="bg-[#151923] border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">Mobile Fleet Vans &amp; Home Hubs</h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800">
                  {technicians.length} Vans Stationed
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Live fleet units deployed across Greater Edmonton. Click "Edit Van &amp; Hub" on any unit to rename the vehicle, change driver assignment, phone number, or home depot base.
              </p>
            </div>
          </div>

          <button
            onClick={onOpenStaffRoster}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span>Full Staff Roster ({staffCount})</span>
          </button>
        </div>

        {/* Grid of Van Units */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {technicians.map((tech) => (
            <div 
              key={tech.id}
              className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between space-y-3 transition-all group"
            >
              <div className="space-y-2.5">
                {/* Header: Color & Van Identifier */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black shadow-xs"
                      style={{ backgroundColor: tech.color || '#2563EB' }}
                    >
                      <Truck className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white leading-tight">
                        {tech.vanNumber || tech.id}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {tech.role}
                      </span>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    tech.status === 'AVAILABLE' 
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/80'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {tech.status === 'AVAILABLE' ? 'On Duty' : 'Off Duty'}
                  </span>
                </div>

                {/* Driver Info */}
                <div className="p-2.5 bg-slate-800/50 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-200 font-bold">
                    <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>{tech.name}</span>
                  </div>
                  {tech.phone && (
                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-mono">
                      <Phone className="w-3 h-3 text-slate-500 flex-shrink-0" />
                      <span>{tech.phone}</span>
                    </div>
                  )}
                </div>

                {/* Hub Depot Info */}
                <div className="p-2.5 bg-purple-950/20 rounded-xl border border-purple-900/30 space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 text-purple-300 font-bold text-[11px]">
                    <MapPin className="w-3 h-3 text-purple-400 flex-shrink-0" />
                    <span className="truncate">{tech.depotLocation?.name || `${tech.name} Home Hub`}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 pl-4.5">
                    {tech.depotLocation?.address || tech.homeAddress || 'Edmonton, AB'}
                  </p>
                  {tech.depotLocation && (
                    <div className="text-[9px] text-slate-500 font-mono pl-4.5 flex items-center gap-1">
                      <Navigation className="w-2.5 h-2.5 text-slate-500" />
                      <span>{tech.depotLocation.lat.toFixed(4)}° N, {Math.abs(tech.depotLocation.lng).toFixed(4)}° W</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Edit Van & Hub Button */}
              {onEditVanHub && (
                <button
                  type="button"
                  onClick={() => onEditVanHub(tech)}
                  className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700/80 active:scale-98"
                >
                  <Edit2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Edit Van &amp; Hub Details</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
