import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  CloudUpload,
  CheckCircle2,
  FileArchive,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  RefreshCw,
  GitBranch,
  Globe,
  AlertTriangle,
  Sparkles,
  LogOut,
  FolderOpen,
  Layers,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { initAuth, googleSignIn, getAccessToken, logout } from '../lib/firebase';
import {
  TIDYUPS_DRIVE_FOLDER_NAME,
  DriveFolderInfo,
  DriveBackupFileItem,
  listTidyUpsFolderFiles,
  uploadWholeProjectZipToDriveFolder,
} from '../services/googleDriveBackupService';

interface ProjectBackupDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'BACKUP_DRIVE' | 'AI_WORKFLOW' | 'GITHUB_PUBLISH';
}

export const ProjectBackupDriveModal: React.FC<ProjectBackupDriveModalProps> = ({
  isOpen,
  onClose,
  initialTab,
}) => {
  const [activeTab, setActiveTab] = useState<'BACKUP_DRIVE' | 'AI_WORKFLOW' | 'GITHUB_PUBLISH'>(
    initialTab || 'BACKUP_DRIVE'
  );

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Google Workspace Auth State per workspace-integration skill guidelines
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Server ZIP readiness & Google Drive folder state
  const [zipReadyOnServer, setZipReadyOnServer] = useState<boolean>(false);
  const [zipSizeBytes, setZipSizeBytes] = useState<number>(0);
  const [zipCreatedAt, setZipCreatedAt] = useState<string | null>(null);
  const [nextPrLabel, setNextPrLabel] = useState<string>('PR6');
  const [selectedPrOverride, setSelectedPrOverride] = useState<string>('');
  const [nextSuggestedZipFilename, setNextSuggestedZipFilename] = useState<string>(
    'app.tidyups.cleaning-PR6.zip'
  );
  const [savedLocalBackups, setSavedLocalBackups] = useState<
    Array<{ filename: string; prLabel: string; prNumber: number; sizeBytes: number; createdAt: string }>
  >([]);
  const [driveFolder, setDriveFolder] = useState<DriveFolderInfo | null>(null);

  // Upload & Drive files state
  const [isUploadingDrive, setIsUploadingDrive] = useState<boolean>(false);
  const [isDownloadingLocal, setIsDownloadingLocal] = useState<boolean>(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  const [driveFiles, setDriveFiles] = useState<DriveBackupFileItem[]>([]);
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error';
    message: string;
    link?: string;
    folderLink?: string;
  } | null>(null);

  // Mandatory Explicit User Confirmation Dialog State for Destructive/Mutating Drive Operations
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  // AI Build Workflow & README content
  const [readmeContent, setReadmeContent] = useState<string>('');
  const [aiWorkflowContent, setAiWorkflowContent] = useState<string>('');
  const [copiedWorkflow, setCopiedWorkflow] = useState<boolean>(false);
  const [copiedGitCmd, setCopiedGitCmd] = useState<boolean>(false);
  const [copiedSafeRepoName, setCopiedSafeRepoName] = useState<boolean>(false);

  // Direct GitHub Push State (Ai-Builder6/APP.TIDYUPSCLEANING.COM-START-PR6)
  const [githubOwner, setGithubOwner] = useState<string>('Ai-Builder6');
  const [githubRepo, setGithubRepo] = useState<string>('APP.TIDYUPSCLEANING.COM-START-PR6');
  const [githubTokenInput, setGithubTokenInput] = useState<string>('');
  const [hasSavedGithubToken, setHasSavedGithubToken] = useState<boolean>(false);
  const [isPushingGithub, setIsPushingGithub] = useState<boolean>(false);
  const [githubPushNotice, setGithubPushNotice] = useState<{
    type: 'success' | 'error';
    message: string;
    url?: string;
  } | null>(null);
  const [githubReposList, setGithubReposList] = useState<
    Array<{ name: string; fullName: string; htmlUrl: string; sizeKb: number; updatedAt: string }>
  >([]);

  // Initialize Auth Listener
  useEffect(() => {
    const unsub = initAuth(
      (authedUser, cachedToken) => {
        setUser(authedUser);
        setToken(cachedToken);
        setNeedsAuth(false);
      },
      () => {
        setNeedsAuth(true);
      }
    );
    return () => unsub();
  }, []);

  // Load README, AI_BUILD_WORKFLOW & server ZIP readiness when opened
  const refreshMetadata = useCallback(() => {
    fetch('/api/project/export-metadata')
      .then((r) => r.json())
      .then((data) => {
        if (data?.readme) setReadmeContent(data.readme);
        if (data?.aiWorkflow) setAiWorkflowContent(data.aiWorkflow);
        setZipReadyOnServer(Boolean(data?.zipReadyOnServer));
        setZipSizeBytes(Number(data?.zipSizeBytes || 0));
        setZipCreatedAt(data?.zipCreatedAt || null);
        if (data?.nextPrLabel) setNextPrLabel(data.nextPrLabel);
        if (data?.nextSuggestedZipFilename) setNextSuggestedZipFilename(data.nextSuggestedZipFilename);
        if (Array.isArray(data?.savedLocalBackups)) setSavedLocalBackups(data.savedLocalBackups);
      })
      .catch(() => {});
    fetch('/api/project/github-status')
      .then((r) => r.json())
      .then((gh) => {
        if (gh?.owner) setGithubOwner(gh.owner);
        if (gh?.repo) setGithubRepo(gh.repo);
        setHasSavedGithubToken(Boolean(gh?.hasToken));
        if (Array.isArray(gh?.repos)) setGithubReposList(gh.repos);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    refreshMetadata();
  }, [isOpen, refreshMetadata]);

  // Fetch existing backup files from the dedicated "TidyUps Cleaning App Backup Zips" folder in Google Drive
  const fetchDriveBackupFiles = useCallback(async (accessToken?: string | null) => {
    const activeToken = accessToken || (await getAccessToken());
    if (!activeToken) {
      setNeedsAuth(true);
      return;
    }

    setIsLoadingFiles(true);
    try {
      const { folder, files } = await listTidyUpsFolderFiles(activeToken);
      setDriveFolder(folder);
      setDriveFiles(files);
    } catch (err: any) {
      if (err?.message === 'AUTH_EXPIRED') {
        setNeedsAuth(true);
      } else {
        console.warn('Google Drive folder list note:', err);
      }
    } finally {
      setIsLoadingFiles(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && token && !needsAuth) {
      fetchDriveBackupFiles(token);
    }
  }, [isOpen, token, needsAuth, fetchDriveBackupFiles]);

  // Sign in with Google to authorize Google Drive access
  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setStatusBanner(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        setNeedsAuth(false);
        setStatusBanner({
          type: 'success',
          message: `Signed in as ${result.user.email || result.user.displayName}. Folder "${TIDYUPS_DRIVE_FOLDER_NAME}" is ready in Google Drive!`,
        });
        fetchDriveBackupFiles(result.accessToken);
      }
    } catch (err: any) {
      setStatusBanner({
        type: 'error',
        message: err?.message || 'Google Sign-In was cancelled or blocked by popup settings.',
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    await logout();
    setToken(null);
    setUser(null);
    setNeedsAuth(true);
    setDriveFiles([]);
    setDriveFolder(null);
  };

  const activePrLabel = selectedPrOverride || nextPrLabel;

  // 1-Click: Create numbered PR# Whole Project & Workflows ZIP and upload directly into
  // the "TidyUps Cleaning App Backup Zips" folder in Google Drive
  const handleOneClickUploadToDriveFolder = async (forceRebuild = true) => {
    setIsUploadingDrive(true);
    setStatusBanner(null);
    try {
      const result = await uploadWholeProjectZipToDriveFolder({
        requestedPr: selectedPrOverride || undefined,
        forceRebuild,
        accessToken: token,
        aiWorkflowContent,
      });

      const currentToken = await getAccessToken();
      if (currentToken) {
        setToken(currentToken);
        setNeedsAuth(false);
      }
      setDriveFolder(result.folder);
      setSelectedPrOverride('');
      refreshMetadata();

      setStatusBanner({
        type: 'success',
        message: `✓ Saved numbered backup "${result.file.name}" (${result.prLabel || activePrLabel}) directly into folder "${result.folder.name}" in Google Drive!`,
        link: result.file.webViewLink || result.folder.webViewLink,
        folderLink: result.folder.webViewLink,
      });

      if (currentToken) {
        fetchDriveBackupFiles(currentToken);
      }
    } catch (err: any) {
      if (err?.message === 'AUTH_EXPIRED') {
        setNeedsAuth(true);
      }
      setStatusBanner({
        type: 'error',
        message: err?.message || 'Failed to upload Whole Project ZIP to Google Drive folder.',
      });
    } finally {
      setIsUploadingDrive(false);
    }
  };

  // Download a numbered PR# ZIP copy directly to computer
  const handleDownloadNumberedZip = async () => {
    setIsDownloadingLocal(true);
    setStatusBanner(null);
    try {
      const prQuery = selectedPrOverride ? `&pr=${encodeURIComponent(selectedPrOverride)}` : '';
      const res = await fetch(`/api/project/export-zip?force=true&increment=true${prQuery}`);
      if (!res.ok) throw new Error('Failed to build numbered ZIP archive.');
      const filename =
        res.headers.get('X-Zip-Filename') ||
        `app.tidyups.cleaning-${activePrLabel}-${new Date().toISOString().slice(0, 10)}.zip`;
      const prLabel = res.headers.get('X-Zip-PR-Label') || activePrLabel;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSelectedPrOverride('');
      refreshMetadata();
      setStatusBanner({
        type: 'success',
        message: `✓ Downloaded numbered archive "${filename}" (${prLabel})! Next save will automatically increment to the next PR number.`,
      });
    } catch (err: any) {
      setStatusBanner({
        type: 'error',
        message: err?.message || 'Failed to download numbered project ZIP.',
      });
    } finally {
      setIsDownloadingLocal(false);
    }
  };

  // Delete a backup file from Google Drive (Requires explicit user confirmation modal per SKILL.md)
  const handleRequestDeleteDriveFile = (file: DriveBackupFileItem) => {
    setConfirmDialog({
      title: `Delete "${file.name}" from "${TIDYUPS_DRIVE_FOLDER_NAME}"?`,
      message: `Are you sure you want to permanently delete "${file.name}" from your "${TIDYUPS_DRIVE_FOLDER_NAME}" folder in Google Drive? This action cannot be undone.`,
      confirmLabel: 'Delete from Google Drive',
      onConfirm: async () => {
        const activeToken = token || (await getAccessToken());
        if (!activeToken) {
          setNeedsAuth(true);
          return;
        }
        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${activeToken}` },
        });
        if (res.ok || res.status === 204) {
          setDriveFiles((prev) => prev.filter((f) => f.id !== file.id));
          setStatusBanner({
            type: 'success',
            message: `Deleted "${file.name}" from "${TIDYUPS_DRIVE_FOLDER_NAME}" in Google Drive.`,
          });
        }
      },
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-4xl bg-[#11141f] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100 font-sans my-auto max-h-[92vh] flex flex-col">
        {/* Top Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 bg-[#151926] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 text-white flex items-center justify-center shadow-lg">
              <CloudUpload className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2 flex-wrap">
                <span>app.tidyups.cleaning — Numbered PR Backup ZIP</span>
                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-black">
                  Next: {activePrLabel}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Automatically numbers every morning &amp; afternoon save (<code className="text-emerald-300">PR6</code>,{' '}
                <code className="text-emerald-300">PR7</code>, <code className="text-emerald-300">PR8</code>...) so you always know which copy is which.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="px-4 sm:px-6 pt-3 bg-[#151926] border-b border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('BACKUP_DRIVE')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'BACKUP_DRIVE'
                ? 'border-emerald-500 text-white bg-[#11141f]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <CloudUpload className="w-4 h-4 text-emerald-400" />
            <span>1. Save Numbered PR# ZIP (Google Drive &amp; Local)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('AI_WORKFLOW')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'AI_WORKFLOW'
                ? 'border-purple-500 text-white bg-[#11141f]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>2. Included Workflows &amp; AI Rebuild Guide</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('GITHUB_PUBLISH')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-extrabold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'GITHUB_PUBLISH'
                ? 'border-pink-500 text-white bg-[#11141f]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-4 h-4 text-pink-400" />
            <span>3. GitHub Push &amp; When to Publish Live</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {statusBanner && (
            <div
              className={`p-4 rounded-2xl border text-xs sm:text-sm font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                statusBanner.type === 'success'
                  ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
                  : 'bg-rose-950/80 border-rose-700 text-rose-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>{statusBanner.message}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {statusBanner.folderLink && (
                  <a
                    href={statusBanner.folderLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shrink-0"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Open Drive Folder</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          )}

          {activeTab === 'BACKUP_DRIVE' && (
            <div className="space-y-6">
              {/* Primary Numbered PR1, PR2, PR3 Card */}
              <div className="bg-gradient-to-br from-[#132622] via-[#171b29] to-[#171b29] border border-emerald-500/40 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider">
                        Clean app.tidyups.cleaning Archive • Sequential PR Numbering
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold">
                        📁 Folder: {TIDYUPS_DRIVE_FOLDER_NAME}
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-white">
                      Save Numbered Copy ({activePrLabel}) — Morning &amp; Afternoon Distinguished
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Every save increments the PR number (<code className="text-emerald-300">PR6</code>,{' '}
                      <code className="text-emerald-300">PR7</code>, <code className="text-emerald-300">PR8</code>...) and stamps the file with the Edmonton date,{' '}
                      <code className="text-emerald-300">Morning / Afternoon / Evening</code>, and clock time so multiple updates on the same day never overwrite each other.
                    </p>
                  </div>

                  {driveFolder?.webViewLink && (
                    <a
                      href={driveFolder.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center gap-1.5 shrink-0 self-start md:self-auto"
                    >
                      <FolderOpen className="w-4 h-4 text-emerald-400" />
                      <span>Open Backup Folder in Drive</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                {/* PR Version Selector (Auto PR#, or pick PR6, PR7, PR8, PR9, PR10, PR11...) */}
                <div className="p-3.5 rounded-2xl bg-[#11141f] border border-slate-800 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Next ZIP File Name &amp; PR Number (PR1–PR5 Retired)
                      </span>
                      <code className="text-xs sm:text-sm font-mono font-black text-emerald-300 break-all">
                        {selectedPrOverride
                          ? nextSuggestedZipFilename.replace(/PR\d+/i, selectedPrOverride)
                          : nextSuggestedZipFilename}
                      </code>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setSelectedPrOverride('')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-black border cursor-pointer transition-all ${
                          !selectedPrOverride
                            ? 'bg-emerald-600 text-white border-emerald-400'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        Auto ({nextPrLabel})
                      </button>
                      {['PR6', 'PR7', 'PR8', 'PR9', 'PR10', 'PR11'].map((pr) => (
                        <button
                          key={pr}
                          type="button"
                          onClick={() => setSelectedPrOverride(pr)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-black border cursor-pointer transition-all ${
                            selectedPrOverride === pr
                              ? 'bg-emerald-600 text-white border-emerald-400'
                              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                          }`}
                        >
                          {pr}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Server Archive Status + Google Drive Folder Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-[#11141f] border border-slate-800 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Latest Numbered ZIP on Server
                      </span>
                      <span className="text-xs font-extrabold text-white flex items-center gap-1.5 mt-0.5">
                        <FileArchive className="w-4 h-4 text-emerald-400 shrink-0" />
                        {zipReadyOnServer && savedLocalBackups[0]
                          ? `${savedLocalBackups[0].prLabel} (${(zipSizeBytes / 1024).toFixed(0)} KB) — ${savedLocalBackups[0].filename}`
                          : `Ready to build ${activePrLabel} on click`}
                      </span>
                      {zipCreatedAt && (
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          Last packaged: {new Date(zipCreatedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#11141f] border border-slate-800 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Google Drive Destination Folder
                      </span>
                      <span className="text-xs font-extrabold text-emerald-300 flex items-center gap-1.5 mt-0.5 font-mono">
                        <FolderOpen className="w-4 h-4 text-emerald-400 shrink-0" />
                        {TIDYUPS_DRIVE_FOLDER_NAME}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Saves each PR1, PR2, PR3... as a separate file in Drive
                      </span>
                    </div>
                  </div>
                </div>

                {/* 1-Click Action Area */}
                <div className="pt-1 space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      disabled={isUploadingDrive || isDownloadingLocal || isLoggingIn}
                      onClick={() => handleOneClickUploadToDriveFolder(true)}
                      className="flex-1 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-xl cursor-pointer disabled:opacity-50 transition-all active:scale-99"
                    >
                      <CloudUpload className="w-5 h-5 shrink-0" />
                      <span>
                        {isUploadingDrive
                          ? `Building & Uploading ${activePrLabel} ZIP to "${TIDYUPS_DRIVE_FOLDER_NAME}"...`
                          : `1-Click Save ${activePrLabel} ZIP to Google Drive ("${TIDYUPS_DRIVE_FOLDER_NAME}")`}
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={isUploadingDrive || isDownloadingLocal || isLoggingIn}
                      onClick={handleDownloadNumberedZip}
                      className="py-3.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40 font-black text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
                      title={`Build and download ${activePrLabel} ZIP directly to your computer`}
                    >
                      <FileArchive className="w-4 h-4 text-emerald-400" />
                      <span>
                        {isDownloadingLocal ? `Building ${activePrLabel}...` : `Download ${activePrLabel} ZIP`}
                      </span>
                    </button>
                  </div>

                  {/* Google Account Connection Status */}
                  {needsAuth || !token ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                      <span className="text-xs text-slate-400">
                        Clicking the 1-Click button above will automatically connect Google Drive and upload to{' '}
                        <strong className="text-slate-200">{TIDYUPS_DRIVE_FOLDER_NAME}</strong>, or sign in below:
                      </span>
                      <button
                        type="button"
                        disabled={isLoggingIn}
                        onClick={handleGoogleLogin}
                        className="gsi-material-button py-2 px-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer shrink-0"
                      >
                        <div className="gsi-material-button-state" />
                        <div className="gsi-material-button-content-wrapper flex items-center justify-center gap-2">
                          <div className="gsi-material-button-icon w-4 h-4">
                            <svg
                              version="1.1"
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 48 48"
                              style={{ display: 'block', width: '16px', height: '16px' }}
                            >
                              <path
                                fill="#EA4335"
                                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                              />
                              <path
                                fill="#4285F4"
                                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                              />
                              <path
                                fill="#FBBC05"
                                d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                              />
                              <path
                                fill="#34A853"
                                d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                              />
                              <path fill="none" d="M0 0h48v48H0z" />
                            </svg>
                          </div>
                          <span className="gsi-material-button-contents">
                            {isLoggingIn ? 'Connecting...' : 'Sign in with Google'}
                          </span>
                        </div>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80 px-1">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        Connected to Google Drive ({user?.email || 'Active Session'}) • Folder:{' '}
                        <strong className="text-emerald-300 font-mono">{TIDYUPS_DRIVE_FOLDER_NAME}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={handleGoogleLogout}
                        className="text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Sign Out
                      </button>
                    </div>
                  )}

                  {/* OAuth Error 400: origin_mismatch Helper for cleaningserviceyeg@gmail.com */}
                  <details className="pt-2 text-xs text-slate-400">
                    <summary className="cursor-pointer font-bold text-amber-300 hover:text-amber-200 select-none">
                      Seeing &ldquo;Error 400: origin_mismatch&rdquo; with cleaningserviceyeg@gmail.com? Click here for 1-click origin fix
                    </summary>
                    <div className="mt-2 p-3 rounded-2xl bg-slate-950/90 border border-amber-500/30 space-y-2">
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Google Sign-In now automatically uses Firebase Auth popup routing on preview URLs. To also authorize direct Google Identity Services on every domain for <code className="text-amber-300">cleaningserviceyeg@gmail.com</code>, add these <strong>Authorized JavaScript origins</strong> in Google Cloud Console &rarr; APIs &amp; Services &rarr; Credentials (Client ID <code className="text-emerald-300">230358145142-cs2b932r0uoc0fvm8kner4ipkr6qvng9</code>):
                      </p>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-emerald-300 space-y-0.5 select-all">
                        <div>https://app.tidyupscleaning.com</div>
                        <div>https://book.tidyupscleaning.com</div>
                        <div>https://cleaning-service-dispatch-board-230358145142.us-east1.run.app</div>
                        <div>https://ais-dev-2jvzwakvityygyeyjp5ysi-460696821435.us-east5.run.app</div>
                        <div>https://ais-pre-2jvzwakvityygyeyjp5ysi-460696821435.us-east5.run.app</div>
                      </div>
                    </div>
                  </details>
                </div>
              </div>

              {/* Files Inside "TidyUps Cleaning App Backup Zips" Folder in Google Drive */}
              <div className="bg-[#171b29] border border-slate-800 rounded-3xl p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <h4 className="text-sm font-black text-white">
                        Files Inside Google Drive Folder: <span className="text-emerald-300 font-mono">{TIDYUPS_DRIVE_FOLDER_NAME}</span>
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        All Whole Project ZIPs, Workflows, and CSV exports from this app are saved in this folder.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {driveFolder?.webViewLink && (
                      <a
                        href={driveFolder.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5"
                      >
                        <span>Open Folder</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {!needsAuth && token && (
                      <button
                        type="button"
                        onClick={() => fetchDriveBackupFiles(token)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                      </button>
                    )}
                  </div>
                </div>

                {needsAuth || !token ? (
                  <p className="text-xs text-slate-400 py-3">
                    Click the <strong>1-Click Upload Whole Project &amp; Workflows ZIP</strong> button above to automatically create the{' '}
                    <code className="text-emerald-300">{TIDYUPS_DRIVE_FOLDER_NAME}</code> folder and upload your project archive.
                  </p>
                ) : driveFiles.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3">
                    Folder <strong className="text-emerald-300">{TIDYUPS_DRIVE_FOLDER_NAME}</strong> is ready in your Google Drive. Click the 1-Click button above to upload your Whole Project &amp; Workflows ZIP into it now.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {driveFiles.map((f) => (
                      <div
                        key={f.id}
                        className="p-3 rounded-2xl bg-[#10131d] border border-slate-800 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-white truncate flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="truncate">{f.name}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {f.createdTime ? new Date(f.createdTime).toLocaleString() : 'Saved in Drive Folder'}
                            {f.size ? ` • ${(Number(f.size) / 1024).toFixed(0)} KB` : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {f.webViewLink && (
                            <a
                              href={f.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-1 hover:bg-emerald-600/30"
                            >
                              <span>Open in Drive</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRequestDeleteDriveFile(f)}
                            className="p-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/50 cursor-pointer"
                            title="Delete file from Google Drive folder"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'AI_WORKFLOW' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#171b29] p-4 rounded-2xl border border-purple-500/30">
                <div>
                  <h3 className="text-sm font-black text-white">
                    Complete Project Workflows (<code className="text-purple-300">AI_BUILD_WORKFLOW.md</code> &amp; <code className="text-purple-300">workflows/COMPLETE_APP_WORKFLOWS.md</code>)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Packaged inside every Whole Project ZIP uploaded to <code className="text-emerald-300">{TIDYUPS_DRIVE_FOLDER_NAME}</code>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(aiWorkflowContent || readmeContent);
                    setCopiedWorkflow(true);
                    setTimeout(() => setCopiedWorkflow(false), 2500);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  {copiedWorkflow ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedWorkflow ? 'Copied All Workflows!' : 'Copy Complete Workflows'}</span>
                </button>
              </div>

              <pre className="p-4 rounded-2xl bg-[#0b0d14] border border-slate-800 text-xs text-slate-200 font-mono whitespace-pre-wrap overflow-x-auto max-h-[380px] leading-relaxed">
                {aiWorkflowContent || 'Loading complete project workflows...'}
              </pre>
            </div>
          )}

          {activeTab === 'GITHUB_PUBLISH' && (
            <div className="space-y-5">
              {/* Fix for AI Studio Top-Right GitHub Button "get repo has an invalid argument" */}
              <div className="bg-amber-500/10 border border-amber-500/40 rounded-3xl p-5 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-amber-300 font-black text-sm">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span>How to Push 101 Files in AI Studio&rsquo;s GitHub Sync Without &ldquo;Request contains an invalid argument&rdquo;</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        const msg = `feat(${selectedPrOverride || nextPrLabel || 'PR1'}): full app.tidyupscleaning.com sync`;
                        navigator.clipboard.writeText(msg);
                        setCopiedSafeRepoName(true);
                        setTimeout(() => setCopiedSafeRepoName(false), 2500);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      {copiedSafeRepoName ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>
                        {copiedSafeRepoName
                          ? 'Copied Commit Message!'
                          : `1-Click Copy Commit Message`}
                      </span>
                    </button>
                  </div>
                </div>
                <div className="text-xs text-slate-200 space-y-1.5 leading-relaxed">
                  <p>
                    1. <strong>Click <code className="text-amber-300">Commit message &gt;</code> in AI Studio&rsquo;s GitHub panel and type/paste a Commit Message!</strong> When pushing 101 files to a brand-new repo (<code className="text-emerald-300">Ai-Builder6/app-tidyupscleaning-com-start-pr1</code>), AI Studio&rsquo;s auto-summary leaves the <strong>Commit message</strong> box empty. Clicking Push with an empty Commit message triggers <code className="text-rose-300">Failed to push commit to GitHub: Request contains an invalid argument</code>.
                  </p>
                  <p>
                    2. We also reformatted <code className="text-emerald-300">data/tidyups_cleaning_store.json</code> and <code className="text-emerald-300">src/data/baseJobberStoreSeed.json</code> into clean multi-line JSON and trimmed pre-October historical visits so the 101-file payload stays fast and well under GitHub/gRPC size limits.
                  </p>
                </div>
              </div>

              {/* Direct 1-Click Push to Ai-Builder6/APP.TIDYUPSCLEANING.COM-START-PR1 */}
              <div className="bg-[#171b29] border border-pink-500/40 rounded-3xl p-5 space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 text-white font-black text-sm">
                      <GitBranch className="w-5 h-5 text-pink-400" />
                      <span>Direct 1-Click Push to GitHub (<code className="text-pink-300">Ai-Builder6/APP.TIDYUPSCLEANING.COM-START-PR1</code>)</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Pushes all project files directly into your existing <code className="text-emerald-300">Ai-Builder6/APP.TIDYUPSCLEANING.COM-START-PR1</code> repository (or creates <code className="text-emerald-300">PR2</code>, <code className="text-emerald-300">PR3</code>...) via GitHub&rsquo;s API.
                    </p>
                  </div>
                  <a
                    href={`https://github.com/${githubOwner}/${githubRepo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-bold flex items-center gap-1.5"
                  >
                    <span>Open {githubOwner}/{githubRepo}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">GitHub Owner</label>
                    <input
                      type="text"
                      value={githubOwner}
                      onChange={(e) => setGithubOwner(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#0b0d14] border border-slate-700 text-xs text-white font-mono"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">
                      Target Repository Name (supports dots or PR# names)
                    </label>
                    <input
                      type="text"
                      value={githubRepo}
                      onChange={(e) => setGithubRepo(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#0b0d14] border border-slate-700 text-xs text-emerald-300 font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Quick PR6, PR7, PR8, PR9, PR10 Repo Name Switcher */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold text-slate-400">Quick Select PR Repo (PR6+):</span>
                  {['PR6', 'PR7', 'PR8', 'PR9', 'PR10', 'PR11'].map((pr) => {
                    const candidate = `APP.TIDYUPSCLEANING.COM-START-${pr}`;
                    const active = githubRepo.toUpperCase().endsWith(`-${pr}`);
                    return (
                      <button
                        key={pr}
                        type="button"
                        onClick={() => {
                          setGithubRepo(candidate);
                          setSelectedPrOverride(pr);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-black font-mono cursor-pointer transition-all border ${
                          active
                            ? 'bg-pink-600 text-white border-pink-400'
                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-pink-400/50'
                        }`}
                      >
                        {pr}
                      </button>
                    );
                  })}
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    GitHub Personal Access Token {hasSavedGithubToken ? '(Saved on Server ✓ — leave blank to reuse)' : '(Paste once — starts with ghp_ or github_pat_)'}
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="password"
                      value={githubTokenInput}
                      onChange={(e) => setGithubTokenInput(e.target.value)}
                      placeholder={
                        hasSavedGithubToken
                          ? '•••••••••••••••••••••••• (Saved — click Push to GitHub)'
                          : 'Paste GitHub token (Settings → Developer settings → Personal access tokens → repo scope)'
                      }
                      className="flex-1 px-3 py-2 rounded-xl bg-[#0b0d14] border border-slate-700 text-xs text-white font-mono"
                    />
                      <button
                        type="button"
                        disabled={isPushingGithub}
                        onClick={async () => {
                          setIsPushingGithub(true);
                          setGithubPushNotice(null);
                          try {
                            const prNum = Math.max(6, parseInt((selectedPrOverride || nextPrLabel || 'PR6').replace(/\D+/g, ''), 10) || 6);
                            const res = await fetch('/api/project/github-push', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                owner: githubOwner,
                                repo: githubRepo,
                                token: githubTokenInput.trim() || undefined,
                                prNumber: prNum,
                              }),
                            });
                            const data = await res.json();
                            if (res.ok && data.success) {
                              setHasSavedGithubToken(true);
                              setGithubTokenInput('');
                              setGithubPushNotice({
                                type: 'success',
                                message: `✓ Pushed ${data.filesPushed} files (${data.prLabel}) live to ${data.fullRepoName}!`,
                                url: data.htmlUrl,
                              });
                              refreshMetadata();
                            } else {
                              setGithubPushNotice({
                                type: 'error',
                                message: data.error || 'Could not push to GitHub.',
                              });
                            }
                          } catch (err: any) {
                            setGithubPushNotice({
                              type: 'error',
                              message: err.message || 'Network error while pushing to GitHub.',
                            });
                          } finally {
                            setIsPushingGithub(false);
                          }
                        }}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
                      >
                        <CloudUpload className="w-4 h-4" />
                        <span>
                          {isPushingGithub
                            ? `Pushing to ${githubOwner}/${githubRepo}...`
                            : `1-Click Push Project to ${githubRepo}`}
                        </span>
                      </button>

                      <button
                        type="button"
                        disabled={isPushingGithub}
                        onClick={async () => {
                          setIsPushingGithub(true);
                          setGithubPushNotice(null);
                          try {
                            const res = await fetch('/api/project/github-push', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                owner: githubOwner,
                                repo: githubRepo,
                                token: githubTokenInput.trim() || undefined,
                                createNewCopy: true,
                              }),
                            });
                            const data = await res.json();
                            if (res.ok && data.success) {
                              setHasSavedGithubToken(true);
                              setGithubTokenInput('');
                              if (data.repo) setGithubRepo(data.repo);
                              setGithubPushNotice({
                                type: 'success',
                                message: `✓ Created & pushed ${data.filesPushed} files (${data.prLabel}) to new GitHub copy ${data.fullRepoName}!`,
                                url: data.htmlUrl,
                              });
                              refreshMetadata();
                            } else {
                              setGithubPushNotice({
                                type: 'error',
                                message: data.error || 'Could not create new GitHub copy.',
                              });
                            }
                          } catch (err: any) {
                            setGithubPushNotice({
                              type: 'error',
                              message: err.message || 'Network error while creating GitHub copy.',
                            });
                          } finally {
                            setIsPushingGithub(false);
                          }
                        }}
                        className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-lg disabled:opacity-50"
                        title="Creates a brand-new numbered GitHub repository copy (PR2, PR3...) and pushes all files"
                      >
                        <GitBranch className="w-4 h-4" />
                        <span>Create New Copy (Next PR#)</span>
                      </button>
                    </div>
                  </div>

                {githubPushNotice && (
                  <div
                    className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-2 ${
                      githubPushNotice.type === 'success'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                        : 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                    }`}
                  >
                    <span className="font-bold">{githubPushNotice.message}</span>
                    {githubPushNotice.url && (
                      <a
                        href={githubPushNotice.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 font-black inline-flex items-center gap-1 shrink-0"
                      >
                        <span>View on GitHub</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}

                {githubReposList.length > 0 && (
                  <div className="pt-2 border-t border-slate-800">
                    <div className="text-[11px] font-bold text-slate-400 mb-2">
                      Your Existing <code className="text-emerald-300">{githubOwner}</code> Repositories on GitHub (Click any to select):
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {githubReposList.slice(0, 8).map((r) => (
                        <button
                          key={r.fullName}
                          type="button"
                          onClick={() => setGithubRepo(r.name)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border cursor-pointer transition-all ${
                            githubRepo === r.name
                              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-bold'
                              : 'bg-[#0b0d14] border-slate-800 text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          {r.name} {r.sizeKb === 0 ? '(empty — ready for push)' : `(${Math.round(r.sizeKb / 1024 * 10) / 10} MB)`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 1: When to Publish to Make Live on app.tidyupscleaning.com */}
              <div className="bg-[#171b29] border border-emerald-500/40 rounded-3xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
                  <Globe className="w-5 h-5" />
                  <span>When Do You Need to Click &ldquo;Publish&rdquo; to Make Things Live on app.tidyupscleaning.com?</span>
                </div>
                <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
                  <p>
                    <strong className="text-white">1. To push code or UI updates live to <code className="text-emerald-300">app.tidyupscleaning.com</code>:</strong>
                    <br />
                    Click the <strong>&ldquo;Publish&rdquo;</strong> (or <strong>&ldquo;Deploy&rdquo;</strong>) button in the top-right corner of Google AI Studio. That builds the production container and updates <code className="text-emerald-300">app.tidyupscleaning.com</code> within ~60 seconds.
                  </p>
                  <p>
                    <strong className="text-white">2. Do you need to re-publish every time someone calls or books a cleaning?</strong>
                    <br />
                    <strong className="text-emerald-400">No!</strong> All daily voice dictations, quick quotes, customer bookings, and Jobber syncs save automatically to your live database.
                  </p>
                </div>
              </div>

              {/* Section 2: Pushing to GitHub via CLI */}
              <div className="bg-[#171b29] border border-slate-800 rounded-3xl p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-white font-black text-sm">
                    <GitBranch className="w-5 h-5 text-pink-400" />
                    <span>Terminal Git Push Commands for <code className="text-emerald-300">{githubOwner}/{githubRepo}</code></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const cmds = `git init\ngit add .\ngit commit -m "TidyUps Cleaning (${selectedPrOverride || nextPrLabel}): Whole Project & Workflows Backup"\ngit branch -M main\ngit remote add origin https://github.com/${githubOwner}/${githubRepo}.git\ngit push -u origin main --force`;
                      navigator.clipboard.writeText(cmds);
                      setCopiedGitCmd(true);
                      setTimeout(() => setCopiedGitCmd(false), 2500);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedGitCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedGitCmd ? 'Copied Git Commands!' : 'Copy Git Push Commands'}</span>
                  </button>
                </div>
                <pre className="p-3.5 rounded-2xl bg-[#0b0d14] border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto">
{`git init
git add .
git commit -m "TidyUps Cleaning (${selectedPrOverride || nextPrLabel}): Whole Project & Workflows Backup"
git branch -M main
git remote add origin https://github.com/${githubOwner}/${githubRepo}.git
git push -u origin main --force`}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Mandatory Explicit User Confirmation Modal for Destructive Google Drive Actions */}
        {confirmDialog && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs">
            <div className="w-full max-w-md bg-[#181c2a] border border-rose-500/40 rounded-3xl p-6 space-y-4 shadow-2xl">
              <div className="flex items-center gap-3 text-rose-400">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h3 className="text-base font-black text-white">{confirmDialog.title}</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{confirmDialog.message}</p>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const fn = confirmDialog.onConfirm;
                    setConfirmDialog(null);
                    await fn();
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black cursor-pointer"
                >
                  {confirmDialog.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
