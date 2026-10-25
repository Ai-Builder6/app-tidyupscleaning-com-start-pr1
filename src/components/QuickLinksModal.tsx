import React, { useState } from 'react';
import { 
  Zap, 
  X, 
  Calendar, 
  AlertCircle, 
  Map, 
  Users, 
  FileCheck, 
  CreditCard, 
  Phone, 
  MessageSquare, 
  ExternalLink, 
  Plus, 
  Sparkles, 
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  CloudUpload,
  FolderOpen,
  GitBranch,
  FileSpreadsheet,
  Compass,
  Calculator,
  Flame,
  ShieldAlert
} from 'lucide-react';
import { JOBBER_TEAM_MEMBERS } from '../data/jobberCalendarData';
import {
  TIDYUPS_DRIVE_FOLDER_NAME,
  uploadWholeProjectZipToDriveFolder,
} from '../services/googleDriveBackupService';

interface QuickLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTo: (view: 'MAP' | 'CUSTOMER_PORTAL' | 'SCHEDULED_JOBS' | 'QUOTES' | 'INVOICES' | 'LEGAL' | 'ADDRESS_SEARCH' | 'LEADS' | 'QUICK_QUOTE' | 'SPAM_SHIELD', subTab?: string) => void;
  onOpenNewTicket?: () => void;
  onOpenTeamChat?: () => void;
  onOpenQuoPhone?: () => void;
  onOpenSpamShield?: () => void;
  onOpenStaffRoster?: () => void;
  onOpenQuickReplies?: () => void;
  onOpenGithubSync?: () => void;
  staffCount?: number;
  unscheduledJobsCount?: number;
  scheduledJobsCount?: number;
}

export const QuickLinksModal: React.FC<QuickLinksModalProps> = ({
  isOpen,
  onClose,
  onNavigateTo,
  onOpenNewTicket,
  onOpenTeamChat,
  onOpenQuoPhone,
  onOpenSpamShield,
  onOpenStaffRoster,
  onOpenQuickReplies,
  onOpenGithubSync,
  staffCount = 15,
  unscheduledJobsCount = 6,
  scheduledJobsCount = 181,
}) => {
  const [isUploadingDrive, setIsUploadingDrive] = useState(false);
  const [driveStatus, setDriveStatus] = useState<{
    message: string;
    folderLink?: string;
    isError?: boolean;
  } | null>(null);

  const [isPushingGithub, setIsPushingGithub] = useState(false);
  const [githubStatus, setGithubStatus] = useState<{
    message: string;
    repoUrl?: string;
    isError?: boolean;
  } | null>(null);

  if (!isOpen) return null;

  const handleUploadWholeProjectToDrive = async (requestedPr?: string) => {
    setIsUploadingDrive(true);
    setDriveStatus(null);
    try {
      const res = await uploadWholeProjectZipToDriveFolder({
        requestedPr,
        forceRebuild: true,
      });
      setDriveStatus({
        message: `✓ Saved "${res.file.name}" (${res.prLabel || 'PR#'}) into Drive folder "${res.folder.name}"!`,
        folderLink: res.folder.webViewLink,
      });
    } catch (err: any) {
      setDriveStatus({
        message: err?.message || 'Could not upload to Google Drive folder.',
        isError: true,
      });
    } finally {
      setIsUploadingDrive(false);
    }
  };

  const handleSyncToGithub = async (opts?: { createNewCopy?: boolean; prNumber?: number }) => {
    setIsPushingGithub(true);
    setGithubStatus(null);
    try {
      const res = await fetch('/api/project/github-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: 'Ai-Builder6',
          repo: opts?.prNumber ? `APP.TIDYUPSCLEANING.COM-START-PR${opts.prNumber}` : 'APP.TIDYUPSCLEANING.COM-START-PR6',
          createNewCopy: Boolean(opts?.createNewCopy),
          prNumber: opts?.prNumber,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        setGithubStatus({
          message: `✓ Pushed ${data.filesPushed} files (${data.prLabel}) live to GitHub: ${data.fullRepoName}!`,
          repoUrl: data.htmlUrl,
        });
      } else {
        setGithubStatus({
          message: data?.error || 'Failed to push copy to GitHub.',
          isError: true,
        });
      }
    } catch (err: any) {
      setGithubStatus({
        message: err?.message || 'Network error while syncing to GitHub.',
        isError: true,
      });
    } finally {
      setIsPushingGithub(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
              <Zap className="w-5 h-5 fill-white text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight">Quick Links &amp; Actions</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/20 text-white">
                  Jobber Dispatch
                </span>
              </div>
              <p className="text-xs text-white/80">
                Instant shortcuts to Jobber schedules, unscheduled jobs, live map, and team roster
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* Primary Operations Section */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <span>📅 Jobber Core Operations</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Scheduled Calendar */}
              <button
                onClick={() => {
                  onNavigateTo('SCHEDULED_JOBS', 'CALENDAR');
                  onClose();
                }}
                className="p-3.5 rounded-2xl border border-purple-200 bg-purple-50/50 hover:bg-purple-100/60 transition-all text-left flex items-start justify-between gap-3 group cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 group-hover:text-purple-700 transition-colors flex items-center gap-1.5">
                      <span>Schedule &amp; Calendar</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-purple-200 text-purple-900 font-bold">
                        {scheduledJobsCount}
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Month, 7-day, 3-day &amp; day views with 15 Jobber staff color codes
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-purple-400 group-hover:translate-x-0.5 transition-transform shrink-0 mt-1" />
              </button>

              {/* Unscheduled Jobs */}
              <button
                onClick={() => {
                  onNavigateTo('SCHEDULED_JOBS', 'UNSCHEDULED');
                  onClose();
                }}
                className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100/60 transition-all text-left flex items-start justify-between gap-3 group cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 group-hover:text-amber-800 transition-colors flex items-center gap-1.5">
                      <span>Unscheduled Jobs</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-amber-200 text-amber-900 font-bold">
                        {unscheduledJobsCount}
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Approve in Jobber &amp; attach dual cleaners
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-500 group-hover:translate-x-0.5 transition-transform shrink-0 mt-1" />
              </button>

              {/* Live Dispatch Map */}
              <button
                onClick={() => {
                  onNavigateTo('MAP');
                  onClose();
                }}
                className="p-3.5 rounded-2xl border border-pink-200 bg-pink-50/50 hover:bg-pink-100/60 transition-all text-left flex items-start justify-between gap-3 group cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-pink-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Map className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 group-hover:text-pink-700 transition-colors">
                      Live Fleet Dispatch Map
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Edmonton real-time routes, traffic, &amp; technician GPS
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-pink-400 group-hover:translate-x-0.5 transition-transform shrink-0 mt-1" />
              </button>

              {/* Address Distance Radar */}
              <button
                onClick={() => {
                  onNavigateTo('ADDRESS_SEARCH');
                  onClose();
                }}
                className="p-3.5 rounded-2xl border border-purple-200 bg-purple-50/50 hover:bg-purple-100/60 transition-all text-left flex items-start justify-between gap-3 group cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 group-hover:text-purple-700 transition-colors flex items-center gap-1.5">
                      <span>Caller Address Radar</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-purple-200 text-purple-900 font-bold">
                        15 Hubs
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Search caller address, drop pin, &amp; rank cleaners by distance
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-purple-400 group-hover:translate-x-0.5 transition-transform shrink-0 mt-1" />
              </button>

              {/* Quotes Pipeline */}
              <button
                onClick={() => {
                  onNavigateTo('QUOTES');
                  onClose();
                }}
                className="p-3.5 rounded-2xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100/60 transition-all text-left flex items-start justify-between gap-3 group cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 group-hover:text-blue-700 transition-colors">
                      Quotes &amp; Client Approvals
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Converted quotes synced from Jobber GraphQL API
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-blue-400 group-hover:translate-x-0.5 transition-transform shrink-0 mt-1" />
              </button>

              {/* Google Sheets Ad Leads */}
              <button
                onClick={() => {
                  onNavigateTo('LEADS');
                  onClose();
                }}
                className="p-3.5 rounded-2xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100/60 transition-all text-left flex items-start justify-between gap-3 group cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Flame className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 group-hover:text-rose-700 transition-colors flex items-center gap-1.5">
                      <span>Ad Leads &amp; Google Sheets</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-rose-200 text-rose-900 font-bold">
                        99+
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      FB Leads_V1, FB Leads_V2, Google Leads_V3 tabs &amp; forms
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-rose-400 group-hover:translate-x-0.5 transition-transform shrink-0 mt-1" />
              </button>

              {/* Quick Quote Phone Estimator */}
              <button
                onClick={() => {
                  onNavigateTo('QUICK_QUOTE');
                  onClose();
                }}
                className="p-3.5 rounded-2xl border border-fuchsia-200 bg-fuchsia-50/50 hover:bg-fuchsia-100/60 transition-all text-left flex items-start justify-between gap-3 group cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-600 to-fuchsia-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 group-hover:text-fuchsia-700 transition-colors">
                      Quick Quote Phone Estimator
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      1 cleaner $52.50/hr, 2 cleaners $105/hr, fuel &amp; tax
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-fuchsia-400 group-hover:translate-x-0.5 transition-transform shrink-0 mt-1" />
              </button>

              {/* Twilio Spam Shield & Call Blocker */}
              <button
                onClick={() => {
                  onNavigateTo('SPAM_SHIELD');
                  onClose();
                }}
                className="p-3.5 rounded-2xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100/60 transition-all text-left flex items-start justify-between gap-3 group cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 group-hover:text-rose-700 transition-colors flex items-center gap-1.5">
                      <span>Twilio Spam Shield</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-rose-200 text-rose-900 font-bold">
                        Live Filter
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Block foreign country codes, rotating numbers &amp; robocalls
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-rose-400 group-hover:translate-x-0.5 transition-transform shrink-0 mt-1" />
              </button>
            </div>
          </div>

          {/* Quick Actions & Communication */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <span>⚡ Actions &amp; Communication</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {onOpenQuickReplies && (
                <button
                  onClick={() => {
                    onOpenQuickReplies();
                    onClose();
                  }}
                  className="p-3 rounded-2xl border border-pink-200 bg-pink-50/60 hover:bg-pink-100/70 transition-all text-left flex items-center gap-2.5 cursor-pointer shadow-2xs group"
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 group-hover:text-pink-700 transition-colors">SMS Quick Replies</h5>
                    <p className="text-[10px] text-pink-700 font-semibold">Client Scripts</p>
                  </div>
                </button>
              )}

              {onOpenNewTicket && (
                <button
                  onClick={() => {
                    onOpenNewTicket();
                    onClose();
                  }}
                  className="p-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-all text-left flex items-center gap-2.5 cursor-pointer shadow-2xs"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">New Job Ticket</h5>
                    <p className="text-[10px] text-slate-500">Manual Intake</p>
                  </div>
                </button>
              )}

              {onOpenTeamChat && (
                <button
                  onClick={() => {
                    onOpenTeamChat();
                    onClose();
                  }}
                  className="p-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-all text-left flex items-center gap-2.5 cursor-pointer shadow-2xs"
                >
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">Team Chat</h5>
                    <p className="text-[10px] text-slate-500">Cleaner Broadcast</p>
                  </div>
                </button>
              )}

              {onOpenQuoPhone && (
                <button
                  onClick={() => {
                    onOpenQuoPhone();
                    onClose();
                  }}
                  className="p-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-all text-left flex items-center gap-2.5 cursor-pointer shadow-2xs"
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">Quo Phone</h5>
                    <p className="text-[10px] text-slate-500">VoIP &amp; AI Calls</p>
                  </div>
                </button>
              )}

              {/* 1-Click GitHub Sync Action Button (Uses GITHUB_PAT_Ai-Builder6) */}
              <button
                type="button"
                disabled={isPushingGithub}
                onClick={() => handleSyncToGithub({ createNewCopy: false, prNumber: 6 })}
                className="p-3 rounded-2xl border border-slate-900 bg-slate-900 hover:bg-slate-800 text-white transition-all text-left flex items-center gap-2.5 cursor-pointer shadow-xs group disabled:opacity-60"
                title="1-Click GitHub Sync: Pushes all 100+ project files directly to Ai-Builder6/APP.TIDYUPSCLEANING.COM-START-PR6 using GITHUB_PAT_Ai-Builder6"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <GitBranch className={`w-4 h-4 ${isPushingGithub ? 'animate-spin' : ''}`} />
                </div>
                <div className="min-w-0">
                  <h5 className="text-xs font-extrabold text-white truncate">
                    {isPushingGithub ? 'Syncing GitHub...' : 'GitHub Sync (1-Click)'}
                  </h5>
                  <p className="text-[10px] text-emerald-300 font-mono font-bold truncate">
                    Push Copy to PR6
                  </p>
                </div>
              </button>

              {/* 1-Click Create New Numbered Repo Copy on GitHub (PR6, PR7...) */}
              <button
                type="button"
                disabled={isPushingGithub}
                onClick={() => handleSyncToGithub({ createNewCopy: true })}
                className="p-3 rounded-2xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/80 transition-all text-left flex items-center gap-2.5 cursor-pointer shadow-2xs group disabled:opacity-60"
                title="Creates a brand-new numbered repository copy on GitHub (e.g. APP.TIDYUPSCLEANING.COM-START-PR6, PR7...) and pushes all files"
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <CloudUpload className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h5 className="text-xs font-extrabold text-slate-900 group-hover:text-indigo-800 truncate">
                    New GitHub Copy (PR#)
                  </h5>
                  <p className="text-[10px] text-indigo-700 font-semibold truncate">
                    Create Next PR# Repo
                  </p>
                </div>
              </button>

              {/* Open Full GitHub & Backup Panel */}
              {onOpenGithubSync && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenGithubSync();
                    onClose();
                  }}
                  className="p-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/80 transition-all text-left flex items-center gap-2.5 cursor-pointer shadow-2xs group sm:col-span-2"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h5 className="text-xs font-extrabold text-slate-900 group-hover:text-emerald-800 truncate">
                      GitHub Repos &amp; Drive Backup Manager
                    </h5>
                    <p className="text-[10px] text-emerald-700 font-semibold truncate">
                      Ai-Builder6/APP.TIDYUPSCLEANING.COM-START-PR6 • Choose PR6–PR11
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-emerald-500 shrink-0" />
                </button>
              )}
            </div>

            {/* Live GitHub Push Status Banner right under Actions & Communication */}
            {githubStatus && (
              <div
                className={`mt-2.5 p-3 rounded-2xl border text-xs font-bold flex flex-wrap items-center justify-between gap-2 ${
                  githubStatus.isError
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{githubStatus.message}</span>
                </span>
                {githubStatus.repoUrl && (
                  <a
                    href={githubStatus.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-extrabold flex items-center gap-1 shrink-0"
                  >
                    <span>Open on GitHub</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* 20 Cleaners Team Roster Color Strip */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>Jobber Team Roster ({staffCount} Staff)</span>
              </h3>
              {onOpenStaffRoster && (
                <button
                  onClick={() => {
                    onOpenStaffRoster();
                    onClose();
                  }}
                  className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                >
                  <FileSpreadsheet className="w-3 h-3 text-purple-700" />
                  <span>Sync Spreadsheet (CSV)</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-36 overflow-y-auto p-2 border border-slate-200 rounded-2xl bg-slate-50/50">
              {JOBBER_TEAM_MEMBERS.map((tm) => (
                <div
                  key={tm.id}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 flex items-center gap-1.5 text-xs truncate shadow-2xs"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                    style={{ backgroundColor: tm.color }}
                  />
                  <span className="truncate text-[11px] font-semibold text-slate-800">{tm.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* External Jobber Dashboard Link */}
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                JB
              </div>
              <div>
                <p className="font-extrabold text-emerald-950">Jobber Direct Web Dashboard</p>
                <p className="text-[11px] text-emerald-700">Open secure.getjobber.com in a new tab</p>
              </div>
            </div>

            <a
              href="https://secure.getjobber.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <span>Open Jobber</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Numbered PR1, PR2, PR3... Whole Project & Workflows ZIP — 1-Click Upload to Google Drive Folder */}
          <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 flex flex-col gap-3 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                  <GitBranch className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-extrabold text-indigo-950 flex items-center gap-2 flex-wrap">
                    <span>app.tidyups.cleaning — Numbered PR# ZIP → Google Drive</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-200 text-emerald-950 font-bold border border-emerald-300">
                      📁 {TIDYUPS_DRIVE_FOLDER_NAME}
                    </span>
                  </p>
                  <p className="text-[11px] text-indigo-700 mt-0.5 leading-relaxed">
                    Automatically numbers each morning &amp; afternoon backup (<code>PR1</code>, <code>PR2</code>, <code>PR3</code>...) with the Edmonton date &amp; time so copies never overwrite each other.
                  </p>
                </div>
              </div>
            </div>

            {driveStatus && (
              <div
                className={`p-2.5 rounded-xl border text-[11px] font-bold flex items-center justify-between gap-2 ${
                  driveStatus.isError
                    ? 'bg-rose-50 border-rose-200 text-rose-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                <span>{driveStatus.message}</span>
                {driveStatus.folderLink && (
                  <a
                    href={driveStatus.folderLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold flex items-center gap-1 shrink-0"
                  >
                    <FolderOpen className="w-3 h-3" />
                    <span>Open Folder</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}

            {/* Dedicated Whole Project & Workflows -> Google Drive Folder */}
            <div className="p-3 bg-white/90 rounded-xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm">✨</span>
                  <span className="font-extrabold text-emerald-950 text-xs">Auto-Numbered PR Archive</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-100 text-emerald-800 font-bold">
                    app.tidyups.cleaning
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 font-mono">
                  Google Drive Folder: {TIDYUPS_DRIVE_FOLDER_NAME} • Next PR# + Morning/Afternoon Timestamp
                </span>
              </div>
              <button
                type="button"
                disabled={isUploadingDrive}
                onClick={() => handleUploadWholeProjectToDrive()}
                className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:opacity-95 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer shrink-0 active:scale-95 text-xs self-start sm:self-auto disabled:opacity-50"
                title={`1-Click: Build next numbered PR# ZIP and upload straight into "${TIDYUPS_DRIVE_FOLDER_NAME}" in Google Drive`}
              >
                <CloudUpload className="w-3.5 h-3.5" />
                <span>
                  {isUploadingDrive ? 'Uploading to Google Drive...' : '1-Click Save Next PR# ZIP to Drive'}
                </span>
              </button>
            </div>

            {/* Explicit PR6, PR7, PR8, PR9, PR10 Checkpoint Buttons */}
            <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-indigo-200/60">
              <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider">
                Save Specific PR# to Drive:
              </span>
              {['PR6', 'PR7', 'PR8', 'PR9', 'PR10'].map((pr) => (
                <button
                  key={pr}
                  type="button"
                  disabled={isUploadingDrive}
                  onClick={() => handleUploadWholeProjectToDrive(pr)}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg font-mono font-bold flex items-center gap-1 transition-all cursor-pointer text-[11px] active:scale-95 disabled:opacity-50"
                  title={`Save ${pr} archive into "${TIDYUPS_DRIVE_FOLDER_NAME}" in Google Drive`}
                >
                  <CloudUpload className="w-3 h-3 text-emerald-600" />
                  <span>Save {pr}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
