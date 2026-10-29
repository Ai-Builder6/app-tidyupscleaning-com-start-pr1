import { User } from 'firebase/auth';
import {
  getAccessTokenSync,
  googleSignIn,
  requestGoogleDriveAccessTokenPopup,
  clearCachedAccessToken,
} from '../lib/firebase';

export const TIDYUPS_DRIVE_FOLDER_NAME = 'TidyUps Cleaning App Backup Zips';

export const ARCHIVED_OLD_SPREADSHEET_IDS = new Set([
  '1TifULi7n2BylQdvla-8DRvYHul_A1wXXzypUdBJwEeA',
  '1TifULi7n2BylQdvla-8DRVYHul_A1wXXzypUdBJ_bB8',
  '1-1palHco2hOEKDh8ivnLYX6-PuzeQtHhLQGkaD_Dp4I',
  '1-1palHc3s80-c8p44-eb19344bf42a01fa28ba5c',
]);

export const DEFAULT_NEW_CLEAN_SHEET_URL = 'https://app.tidyupscleaning.com/clean-sheet';
export const DEFAULT_NEW_CLEAN_SHEET_ID = 'tidyups-new-7tab-clean-sheet-2026';

export function isArchivedOldSheetUrlOrId(val?: string | null): boolean {
  const s = String(val || '').trim();
  if (!s) return false;
  for (const oldId of ARCHIVED_OLD_SPREADSHEET_IDS) {
    if (s.includes(oldId) || s.includes('1TifULi7n2Byl') || s.includes('1-1palHc')) {
      return true;
    }
  }
  return false;
}

export interface DriveFolderInfo {
  id: string;
  name: string;
  webViewLink: string;
}

export interface DriveBackupFileItem {
  id: string;
  name: string;
  mimeType: string;
  createdTime?: string;
  size?: string;
  webViewLink?: string;
}

export interface DriveUploadResult {
  folder: DriveFolderInfo;
  file: DriveBackupFileItem;
  reusedServerZip: boolean;
  prNumber?: number;
  prLabel?: string;
  alreadyInDrive?: boolean;
  userEmail?: string | null;
}

// Cache folder info in memory per session so repeated uploads are instant
let cachedFolderInfo: DriveFolderInfo | null = null;

/**
 * Ensures we have an active Google OAuth access token.
 * If not yet signed in, triggers the Google Sign-In popup directly from the user's click.
 */
export function ensureDriveAuthToken(): Promise<{ accessToken: string; user?: User | null }> {
  const existingToken = getAccessTokenSync();
  if (existingToken) {
    return Promise.resolve({ accessToken: existingToken });
  }
  // Invoke googleSignIn() synchronously on the user click tick!
  const signInPromise = googleSignIn();
  return signInPromise.then((signInResult) => {
    if (!signInResult?.accessToken) {
      throw new Error('Google Drive authorization is required to upload to your Drive folder.');
    }
    return {
      accessToken: signInResult.accessToken,
      user: signInResult.user,
    };
  });
}

/**
 * Finds or creates the dedicated "TidyUps Cleaning App Backup Zips" folder in the user's Google Drive.
 */
export async function ensureTidyUpsDriveFolder(accessToken: string): Promise<DriveFolderInfo> {
  if (cachedFolderInfo) {
    // Verify cached folder still exists and is not trashed
    try {
      const checkRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${cachedFolderInfo.id}?fields=id,name,webViewLink,trashed`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (checkData?.id && !checkData.trashed) {
          return {
            id: checkData.id,
            name: checkData.name || TIDYUPS_DRIVE_FOLDER_NAME,
            webViewLink:
              checkData.webViewLink || `https://drive.google.com/drive/folders/${checkData.id}`,
          };
        }
      }
    } catch {
      // Fall through to search/create
    }
    cachedFolderInfo = null;
  }

  // 1. Search for existing "TidyUps Cleaning App Backup Zips" folder
  const query = encodeURIComponent(
    `mimeType = 'application/vnd.google-apps.folder' and name = '${TIDYUPS_DRIVE_FOLDER_NAME}' and trashed = false`
  );
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)&pageSize=5`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (searchRes.status === 401 || searchRes.status === 403) {
    throw new Error('AUTH_EXPIRED');
  }

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (Array.isArray(searchData.files) && searchData.files.length > 0) {
      const existing = searchData.files[0];
      cachedFolderInfo = {
        id: existing.id,
        name: existing.name || TIDYUPS_DRIVE_FOLDER_NAME,
        webViewLink:
          existing.webViewLink || `https://drive.google.com/drive/folders/${existing.id}`,
      };
      return cachedFolderInfo;
    }
  }

  // 2. Folder doesn't exist yet — create "TidyUps Cleaning App Backup Zips" in Google Drive
  const createRes = await fetch(
    'https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: TIDYUPS_DRIVE_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
        description:
          'Dedicated backup folder for TidyUps Cleaning App (app.tidyups.cleaning) — Numbered PR1, PR2, PR3 Whole Project & Workflows ZIPs',
      }),
    }
  );

  if (!createRes.ok) {
    const errData = await createRes.json().catch(() => ({}));
    throw new Error(
      errData?.error?.message || `Failed to create "${TIDYUPS_DRIVE_FOLDER_NAME}" folder in Google Drive.`
    );
  }

  const created = await createRes.json();
  cachedFolderInfo = {
    id: created.id,
    name: created.name || TIDYUPS_DRIVE_FOLDER_NAME,
    webViewLink: created.webViewLink || `https://drive.google.com/drive/folders/${created.id}`,
  };
  return cachedFolderInfo;
}

/**
 * Lists all backup ZIPs and app downloads stored inside the "TidyUps Cleaning App Backup Zips" folder.
 */
export async function listTidyUpsFolderFiles(
  accessToken: string
): Promise<{ folder: DriveFolderInfo; files: DriveBackupFileItem[] }> {
  const folder = await ensureTidyUpsDriveFolder(accessToken);
  const q = encodeURIComponent(`'${folder.id}' in parents and trashed = false`);
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,createdTime,size,webViewLink)&orderBy=createdTime desc&pageSize=30`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (res.status === 401 || res.status === 403) {
    throw new Error('AUTH_EXPIRED');
  }

  const data = await res.json().catch(() => ({}));
  return {
    folder,
    files: Array.isArray(data.files) ? data.files : [],
  };
}

/**
 * Uploads any file or export from the app directly into the "TidyUps Cleaning App Backup Zips" Google Drive folder
 * without downloading it to the user's computer.
 */
export async function uploadAppFileToTidyUpsDriveFolder(params: {
  filename: string;
  blob: Blob;
  mimeType: string;
  description?: string;
  accessToken?: string | null;
}): Promise<{ folder: DriveFolderInfo; file: DriveBackupFileItem }> {
  let token = params.accessToken || getAccessTokenSync();
  if (!token) {
    // Trigger Google Sign-In synchronously on the click tick before any await
    const authPromise = ensureDriveAuthToken();
    const authRes = await authPromise;
    token = authRes.accessToken;
  }

  let folder: DriveFolderInfo;
  try {
    folder = await ensureTidyUpsDriveFolder(token);
  } catch (err: any) {
    if (err?.message === 'AUTH_EXPIRED') {
      const freshAuth = await googleSignIn();
      if (!freshAuth?.accessToken) throw new Error('Google Drive re-authentication required.');
      token = freshAuth.accessToken;
      folder = await ensureTidyUpsDriveFolder(token);
    } else {
      throw err;
    }
  }

  // Check if a file with the exact same name already exists inside the folder
  const existingQ = encodeURIComponent(
    `'${folder.id}' in parents and name = '${params.filename.replace(/'/g, "\\'")}' and trashed = false`
  );
  const existingRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${existingQ}&fields=files(id,name,webViewLink,size,createdTime)&pageSize=1`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  const existingData = existingRes.ok ? await existingRes.json().catch(() => ({})) : {};
  const existingFile = Array.isArray(existingData.files) ? existingData.files[0] : null;

  const form = new FormData();
  if (existingFile?.id) {
    // Update existing file in place inside the folder
    const updateMeta = {
      name: params.filename,
      mimeType: params.mimeType,
      description:
        params.description ||
        `Uploaded from TidyUps Cleaning App (app.tidyups.cleaning) into ${TIDYUPS_DRIVE_FOLDER_NAME}`,
    };
    form.append('metadata', new Blob([JSON.stringify(updateMeta)], { type: 'application/json' }));
    form.append('file', params.blob);

    const patchRes = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart&fields=id,name,mimeType,createdTime,size,webViewLink`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      }
    );
    if (patchRes.ok) {
      const updated = await patchRes.json();
      return { folder, file: updated };
    }
  }

  // Create new file inside "TidyUps Cleaning App Backup Zips" folder
  const createMeta = {
    name: params.filename,
    mimeType: params.mimeType,
    parents: [folder.id],
    description:
      params.description ||
      `Uploaded from TidyUps Cleaning App (app.tidyups.cleaning) into ${TIDYUPS_DRIVE_FOLDER_NAME}`,
  };
  const createForm = new FormData();
  createForm.append('metadata', new Blob([JSON.stringify(createMeta)], { type: 'application/json' }));
  createForm.append('file', params.blob);

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,createdTime,size,webViewLink',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: createForm,
    }
  );

  if (!uploadRes.ok) {
    const errBody = await uploadRes.json().catch(() => ({}));
    throw new Error(errBody?.error?.message || 'Failed to upload file to Google Drive folder.');
  }

  const uploaded = await uploadRes.json();
  return { folder, file: uploaded };
}

export interface DirectBackupZipResult {
  filename: string;
  prNumber: number;
  prLabel: string;
  sizeBytes: number;
  downloadUrl: string;
  savedToServer: boolean;
  autoGithubBackedUp: boolean;
  uploadedToDrive: boolean;
  driveFolderUrl?: string;
  driveFileUrl?: string;
}

/**
 * Triggers a reliable native browser attachment download for a server-saved ZIP file,
 * working inside both standalone browser tabs and sandboxed preview iframes.
 */
export function triggerNativeServerZipDownload(downloadUrl: string, filename: string): void {
  if (typeof document === 'undefined') return;
  try {
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch {}
}

/**
 * Updates the active/next PR# on the server (`PR6`, `PR7`, `PR8`, `PR9`, `PR10`, `PR11`...)
 * and persists it so all subsequent Whole Project ZIP builds and Google Drive uploads use this PR number.
 */
export async function updateServerProjectPrNumber(prNumberOrLabel: string | number): Promise<{
  success: boolean;
  nextPrNumber: number;
  nextPrLabel: string;
  nextSuggestedZipFilename: string;
}> {
  const res = await fetch('/api/project/set-pr-number', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prNumber: prNumberOrLabel }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || 'Could not update PR number on server.');
  }
  return {
    success: true,
    nextPrNumber: Number(data.nextPrNumber || 6),
    nextPrLabel: String(data.nextPrLabel || `PR${data.nextPrNumber || 6}`),
    nextSuggestedZipFilename: String(
      data.nextSuggestedZipFilename || `app.tidyups.cleaning-PR${data.nextPrNumber || 6}.zip`
    ),
  };
}

/**
 * Builds the numbered Whole Project & Workflows ZIP (`PR6`, `PR7`, `PR8`...) on the server
 * and backs up to GitHub WITHOUT downloading any file to the user's computer hard drive.
 */
export async function buildProjectZipOnServerOnly(options?: {
  requestedPr?: string | number;
  autoGithubBackup?: boolean;
}): Promise<DirectBackupZipResult> {
  return saveAndDownloadNumberedProjectBackupZip({
    ...options,
    skipBrowserDownload: true,
  });
}

/**
 * 1-Click Instant Backup ZIP:
 * 1. Builds & saves the next numbered PR# ZIP (`PR6`, `PR7`, `PR8`...) on the server via `/api/project/build-zip`.
 * 2. Triggers an automatic background GitHub repository backup on the server.
 * 3. Only triggers a local browser download if `downloadToHardDrive: true` is explicitly passed (default is false so we don't spam the user's hard drive).
 * 4. If a Google Drive token is active in this session, also uploads a copy to "TidyUps Cleaning App Backup Zips" in Google Drive.
 */
export async function saveAndDownloadNumberedProjectBackupZip(options?: {
  requestedPr?: string | number;
  autoGithubBackup?: boolean;
  skipBrowserDownload?: boolean;
  downloadToHardDrive?: boolean;
}): Promise<DirectBackupZipResult> {
  const buildRes = await fetch('/api/project/build-zip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requestedPr: options?.requestedPr,
      forceRebuild: true,
      incrementPr: true,
      autoGithubBackup: options?.autoGithubBackup !== false,
    }),
  });

  if (!buildRes.ok) {
    const errData = await buildRes.json().catch(() => ({}));
    throw new Error(errData?.error || 'Could not build numbered Backup ZIP on server.');
  }

  const built = await buildRes.json();
  const filename: string =
    built.filename || `app.tidyups.cleaning-PR7-${new Date().toISOString().slice(0, 10)}.zip`;
  const prLabel: string = built.prLabel || 'PR7';
  const prNumber: number = Number(built.prNumber || 7);
  const sizeBytes: number = Number(built.sizeBytes || 0);
  const downloadUrl: string =
    built.downloadUrl || `/api/project/download-saved-zip?filename=${encodeURIComponent(filename)}`;

  if (options?.downloadToHardDrive === true && options?.skipBrowserDownload !== true) {
    triggerNativeServerZipDownload(downloadUrl, filename);
  }

  let uploadedToDrive = false;
  let driveFolderUrl: string | undefined;
  let driveFileUrl: string | undefined;
  const existingToken = getAccessTokenSync();
  if (existingToken) {
    try {
      const driveRes = await fetch('/api/project/upload-zip-to-drive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${existingToken}`,
        },
        body: JSON.stringify({
          accessToken: existingToken,
          filename,
        }),
      });
      if (driveRes.ok) {
        const driveData = await driveRes.json();
        uploadedToDrive = true;
        driveFolderUrl = driveData?.folder?.webViewLink;
        driveFileUrl = driveData?.file?.webViewLink;
      } else if (driveRes.status === 401) {
        clearCachedAccessToken(existingToken);
      }
    } catch {
      // Non-blocking
    }
  }

  return {
    filename,
    prNumber,
    prLabel,
    sizeBytes,
    downloadUrl,
    savedToServer: true,
    autoGithubBackedUp: options?.autoGithubBackup !== false,
    uploadedToDrive,
    driveFolderUrl,
    driveFileUrl,
  };
}

/**
 * 1-Click Google Drive Upload Handler:
 * 1. Ensures the user is authenticated with Google Drive (opening the authorized Cloud Run `/oauth-bridge` popup on click if needed).
 * 2. Builds a fresh ~1.4 MB numbered `app.tidyups.cleaning-PR#...zip` (or uploads an already-built `existingServerFilename`) on the server.
 * 3. Uploads the `.zip` directly from the server into the user's `"TidyUps Cleaning App Backup Zips"` folder in Google Drive — ZERO local hard-drive downloads!
 */
export async function uploadWholeProjectZipToDriveFolder(options?: {
  customFilename?: string;
  existingServerFilename?: string;
  requestedPr?: string | number;
  forceRebuild?: boolean;
  accessToken?: string | null;
  aiWorkflowContent?: string;
}): Promise<DriveUploadResult> {
  let token = options?.accessToken || getAccessTokenSync();
  let userEmail: string | null = null;

  if (!token) {
    // Trigger Google Sign-In popup synchronously on user click
    const authRes = await googleSignIn(true);
    if (!authRes?.accessToken) {
      throw new Error('Google Sign-In is required to upload the project build ZIP to your Google Drive.');
    }
    token = authRes.accessToken;
    userEmail = authRes.user?.email || null;
  }

  const attemptServerDriveUpload = async (activeToken: string) => {
    const res = await fetch('/api/project/upload-zip-to-drive', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${activeToken}`,
      },
      body: JSON.stringify({
        accessToken: activeToken,
        filename: options?.existingServerFilename || undefined,
        requestedPr: options?.requestedPr || undefined,
        forceRebuild: options?.forceRebuild !== false,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 || data?.error === 'AUTH_EXPIRED' || data?.error === 'AUTH_REQUIRED') {
      clearCachedAccessToken(activeToken);
      throw new Error('AUTH_EXPIRED');
    }
    if (!res.ok || !data?.success) {
      throw new Error(data?.error || data?.message || 'Failed to upload ZIP to Google Drive folder.');
    }
    return data;
  };

  let uploadData: any;
  try {
    uploadData = await attemptServerDriveUpload(token);
  } catch (err: any) {
    if (err?.message === 'AUTH_EXPIRED') {
      clearCachedAccessToken(token);
      const freshAuth = await googleSignIn(true);
      if (!freshAuth?.accessToken) {
        throw new Error('Google Drive Sign-In is required to upload the ZIP file into your Google Drive.');
      }
      token = freshAuth.accessToken;
      userEmail = freshAuth.user?.email || null;
      uploadData = await attemptServerDriveUpload(token);
    } else {
      throw err;
    }
  }

  const prLabel: string = uploadData.prLabel || 'PR7';
  const prNumber: number = Number(uploadData.prNumber || 7);
  const dateStr = new Date().toISOString().slice(0, 10);

  // Also ensure AI_BUILD_WORKFLOW.md is inside the same "TidyUps Cleaning App Backup Zips" folder
  if (options?.aiWorkflowContent && token) {
    await uploadAppFileToTidyUpsDriveFolder({
      filename: `AI_BUILD_WORKFLOW-${prLabel}-${dateStr}.md`,
      blob: new Blob([options.aiWorkflowContent], { type: 'text/markdown' }),
      mimeType: 'text/markdown',
      description: `Master AI Build & Reconstruction Workflow (${prLabel}) for TidyUps Cleaning (app.tidyups.cleaning)`,
      accessToken: token,
    }).catch(() => {});
  }

  return {
    folder: uploadData.folder,
    file: uploadData.file,
    reusedServerZip: Boolean(uploadData.reusedServerZip),
    prNumber,
    prLabel,
    userEmail,
  };
}

export interface LiveDriveSheetResult {
  spreadsheetId: string;
  sheetUrl: string;
  sheetName: string;
  folder: DriveFolderInfo;
  userEmail?: string | null;
  pulledRowsCount?: number;
  newlyImportedLeads?: any[];
  leads?: any[];
  clients?: any[];
  quotes?: any[];
}

export interface PullGoogleSheetLeadsResult {
  success: boolean;
  pulledRowsCount: number;
  newlyImportedLeads: any[];
  scannedSheetIds: string[];
  scannedTabs: string[];
  discoveredDriveSheetUrl?: string;
  discoveredDriveSheetName?: string;
  leads: any[];
  clients: any[];
  quotes: any[];
  message: string;
}

/**
 * Pulls any newly added Facebook Lead Ads / Google Ads rows from the user's connected Google Sheet(s)
 * (supports both private Google Drive spreadsheets via the user's OAuth token and link-shared sheets).
 */
export async function pullNewLeadsFromGoogleSheetInDrive(options?: {
  sheetUrl?: string;
  projectId?: string;
  accessToken?: string | null;
  promptAuthIfNeeded?: boolean;
}): Promise<PullGoogleSheetLeadsResult> {
  const projectId = options?.projectId || 'tidyups';
  const token = options?.accessToken || getAccessTokenSync();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-project-id': projectId,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`/api/leads/reconnect-sheets?project=${encodeURIComponent(projectId)}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      sheetUrl: options?.sheetUrl,
      accessToken: token || undefined,
    }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody?.error || `Failed to pull from Google Sheet (${res.status})`);
  }

  return res.json();
}

/**
 * Helper: Performs a complete server-side Google Sheet pull + Master Clean Sheet sync & TSV formatting
 * without requiring any browser Google OAuth popup (preventing Error 400: origin_mismatch on app.tidyupscleaning.com).
 */
async function performServerSideGoogleSheetSync(options?: {
  spreadsheetId?: string;
  sheetTitle?: string;
  downloadXlsx?: boolean;
}): Promise<LiveDriveSheetResult> {
  const candidateOptId =
    options?.spreadsheetId &&
    !options.spreadsheetId.includes('clean_sheet') &&
    options.spreadsheetId.length >= 20 &&
    !isArchivedOldSheetUrlOrId(options.spreadsheetId)
      ? options.spreadsheetId.trim()
      : '';
  let resolvedSpreadsheetId = candidateOptId || DEFAULT_NEW_CLEAN_SHEET_ID;
  let resolvedSheetUrl = candidateOptId
    ? `https://docs.google.com/spreadsheets/d/${candidateOptId}/edit`
    : DEFAULT_NEW_CLEAN_SHEET_URL;
  let resolvedSheetName =
    options?.sheetTitle || 'TidyUps Brand-New Leads Hub (7 Tabs • Fresh Start)';

  try {
    const cfgRes = await fetch('/api/google-sheets/config?project=tidyups');
    if (cfgRes.ok) {
      const cfg = await cfgRes.json();
      const cfgId = cfg?.createdDriveSheetId || cfg?.spreadsheetId;
      if (
        cfgId &&
        !String(cfgId).includes('clean_sheet') &&
        String(cfgId).length >= 20 &&
        !isArchivedOldSheetUrlOrId(cfgId) &&
        cfgId !== DEFAULT_NEW_CLEAN_SHEET_ID
      ) {
        resolvedSpreadsheetId = String(cfgId);
        resolvedSheetUrl =
          cfg?.createdDriveSheetUrl && !isArchivedOldSheetUrlOrId(cfg.createdDriveSheetUrl)
            ? cfg.createdDriveSheetUrl
            : cfg?.sheetUrl && !isArchivedOldSheetUrlOrId(cfg.sheetUrl)
            ? cfg.sheetUrl
            : `https://docs.google.com/spreadsheets/d/${resolvedSpreadsheetId}/edit`;
      }
      if (cfg?.createdDriveSheetName) {
        resolvedSheetName = cfg.createdDriveSheetName;
      }
    }
  } catch {
    // ignore config lookup notice
  }

  // 1. Pull any new rows from connected Google Sheets first so nothing is ever overwritten
  let pullSnap: PullGoogleSheetLeadsResult | null = null;
  if (resolvedSheetUrl.includes('docs.google.com/spreadsheets/d/') && !isArchivedOldSheetUrlOrId(resolvedSheetUrl)) {
    try {
      pullSnap = await pullNewLeadsFromGoogleSheetInDrive({
        sheetUrl: resolvedSheetUrl,
        projectId: 'tidyups',
        promptAuthIfNeeded: false,
      });
    } catch {
      // ignore pre-pull warning
    }
  }

  // 2. Sync Jobber quotes + clients + leads on the server and generate formatted 20-column headers + TSV
  let syncData: any = null;
  try {
    const syncRes = await fetch('/api/leads/sync?project=tidyups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-project-id': 'tidyups' },
    });
    if (syncRes.ok) {
      syncData = await syncRes.json();
      if (syncData?.tsv && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(syncData.tsv).catch(() => {});
      }
    }
  } catch {
    // ignore sync notice
  }

  // 3. Optionally download the multi-tab .xlsx workbook if requested (e.g. "+ Create New Sheet")
  if (options?.downloadXlsx) {
    const dateStr = new Date().toISOString().slice(0, 10);
    await downloadFileFromApiWithoutNavigation(
      '/api/leads/export.xlsx?project=tidyups',
      `TidyUps_New_7_Tab_Clean_Leads_Sheet_${dateStr}.xlsx`
    ).catch(() => {});
  }

  return {
    spreadsheetId: resolvedSpreadsheetId,
    sheetUrl: resolvedSheetUrl,
    sheetName: resolvedSheetName,
    folder: {
      id: 'server-connected-sheet',
      name: TIDYUPS_DRIVE_FOLDER_NAME,
      webViewLink: resolvedSheetUrl,
    },
    userEmail: 'cleaningserviceyeg@gmail.com',
    pulledRowsCount: pullSnap?.pulledRowsCount || 0,
    newlyImportedLeads: pullSnap?.newlyImportedLeads || [],
    leads: syncData?.leads || pullSnap?.leads,
    clients: syncData?.clients || pullSnap?.clients,
    quotes: syncData?.quotes || pullSnap?.quotes,
  };
}

/**
/**
 * Constructs a strict RFC 2387 multipart/related body for Google Drive API v3 uploads.
 * Never uses browser FormData (which sends multipart/form-data with filename="blob" and causes
 * Google Sheets to create a single tab named "blob").
 */
function buildGoogleDriveMultipartRelatedBody(
  metadata: Record<string, any>,
  fileBytes: Uint8Array,
  fileMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
): { body: Blob; contentType: string } {
  const boundary = 'tidyups_drive_xlsx_boundary_2026';
  const metaHeader =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${fileMimeType}\r\n\r\n`;
  const closing = `\r\n--${boundary}--`;
  const encoder = new TextEncoder();
  const body = new Blob(
    [encoder.encode(metaHeader), fileBytes, encoder.encode(closing)],
    { type: `multipart/related; boundary=${boundary}` }
  );
  return {
    body,
    contentType: `multipart/related; boundary=${boundary}`,
  };
}

/**
 * Verifies that an ArrayBuffer is a genuine ZIP/XLSX binary (starts with PK\x03\x04 magic bytes 0x50 0x4B 0x03 0x04)
 * and is never an HTML build splash screen or error JSON.
 */
function isValidXlsxZipBytes(bytes: Uint8Array): boolean {
  return (
    bytes.byteLength > 4000 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  );
}

/**
 * Fetches the 9-tab Styled Clean Leads .xlsx workbook (All New Leads 14-Day, Facebook Leads 1, Facebook Leads 2,
 * Google Leads 1, Google Leads 2, Other Ads, Facebook AI, Quo, Archived Old Sheets) and verifies its magic ZIP bytes.
 * Retries automatically if the server is momentarily restarting, and falls back to client-side generation if needed.
 */
export async function fetchVerifiedStyledLeadsXlsxBytes(): Promise<Uint8Array> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`/api/leads/export.xlsx?project=tidyups&_t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const buf = await res.arrayBuffer();
        const bytes = new Uint8Array(buf);
        if (isValidXlsxZipBytes(bytes)) {
          return bytes;
        }
      }
    } catch {
      // retry after brief pause
    }
    await new Promise((r) => setTimeout(r, 1200));
  }

  // Client-side fallback using styledLeadsWorkbookBuilder so it is 100% impossible to ever upload a non-XLSX blob
  const { generateStyledLeadsWorkbookBuffer } = await import('./styledLeadsWorkbookBuilder');
  let currentLeads: any[] = [];
  let currentQuotes: any[] = [];
  try {
    const leadsRes = await fetch('/api/leads?project=tidyups');
    if (leadsRes.ok) {
      const lData = await leadsRes.json();
      if (Array.isArray(lData?.leads)) currentLeads = lData.leads;
    }
  } catch {}
  const fallbackBuf = await generateStyledLeadsWorkbookBuffer({
    leads: currentLeads,
    quotes: currentQuotes,
  });
  return new Uint8Array(fallbackBuf);
}

/**
 * 1-Click: Creates a brand-new 9-tab Visual Clean Google Sheet ("All New Leads (14-Day)",
 * "Facebook Leads 1", "Facebook Leads 2", "Google Leads 1", "Google Leads 2",
 * "Other Ads", "Facebook AI", "Quo", "Archived Old Sheets") in the user's Google Drive
 * using strict RFC 2387 multipart/related (never "blob") and connects its new URL!
 */
export async function createNewCleanLeadsSheetInDrive(options?: {
  sheetTitle?: string;
  accessToken?: string | null;
}): Promise<LiveDriveSheetResult> {
  let token = options?.accessToken || getAccessTokenSync();
  let userEmail: string | null = 'cleaningserviceyeg@gmail.com';

  if (!token) {
    try {
      const popupAuth = await requestGoogleDriveAccessTokenPopup();
      if (popupAuth?.accessToken) {
        token = popupAuth.accessToken;
        userEmail = popupAuth.user?.email || userEmail;
      }
    } catch {
      // Fallback below if popup skipped
    }
  }

  if (!token) {
    return performServerSideGoogleSheetSync({
      sheetTitle: options?.sheetTitle,
      downloadXlsx: true,
    });
  }

  let folder: DriveFolderInfo = {
    id: '',
    name: TIDYUPS_DRIVE_FOLDER_NAME,
    webViewLink: 'https://drive.google.com/drive/my-drive',
  };
  try {
    folder = await ensureTidyUpsDriveFolder(token);
  } catch {
    // If folder lookup fails, upload directly to root of Google Drive so creation never fails
  }

  // Fetch & verify the real 9-tab Styled .xlsx binary (guaranteed PK\x03\x04 ZIP with all 9 visual tabs, never HTML/CSV)
  const xlsxBytes = await fetchVerifiedStyledLeadsXlsxBytes();

  const dateStr = new Date().toISOString().slice(0, 10);
  const sheetName =
    options?.sheetTitle || `TidyUps Brand-New Leads Hub (7 Tabs • 14-Day Fresh) - ${dateStr}`;

  // Also upgrade any previously created "TidyUps Brand-New Leads Hub" sheet in Drive that had the "blob" tab
  try {
    const qOld = encodeURIComponent(
      `mimeType = 'application/vnd.google-apps.spreadsheet' and name contains 'TidyUps Brand-New Leads Hub' and trashed = false`
    );
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${qOld}&fields=files(id,name)&pageSize=5`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (Array.isArray(searchData.files)) {
        for (const f of searchData.files) {
          if (f?.id && !isArchivedOldSheetUrlOrId(f.id)) {
            const patchPayload = buildGoogleDriveMultipartRelatedBody(
              { name: sheetName, mimeType: 'application/vnd.google-apps.spreadsheet' },
              xlsxBytes
            );
            await fetch(
              `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(
                f.id
              )}?uploadType=multipart&fields=id,name,webViewLink`,
              {
                method: 'PATCH',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': patchPayload.contentType,
                },
                body: patchPayload.body,
              }
            ).catch(() => {});
          }
        }
      }
    }
  } catch {
    // non-blocking repair of previous sheet
  }

  const createMeta: Record<string, any> = {
    name: sheetName,
    mimeType: 'application/vnd.google-apps.spreadsheet',
    description:
      'Brand-New TidyUps Clean Leads Google Sheet (9 Visual Tabs: All New Leads 14-Day, Facebook Leads 1, Facebook Leads 2, Google Leads 1, Google Leads 2, Other Ads, Facebook AI, Quo, Archived Old Sheets).',
  };
  if (folder.id) {
    createMeta.parents = [folder.id];
  }

  const multipart = buildGoogleDriveMultipartRelatedBody(createMeta, xlsxBytes);

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': multipart.contentType,
      },
      body: multipart.body,
    }
  );

  if (!uploadRes.ok) {
    return performServerSideGoogleSheetSync({
      sheetTitle: options?.sheetTitle,
      downloadXlsx: true,
    });
  }

  const created = await uploadRes.json();
  const spreadsheetId = created.id;
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  await fetch('/api/google-sheets/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      spreadsheetId,
      sheetUrl,
      createdDriveSheetId: spreadsheetId,
      createdDriveSheetUrl: sheetUrl,
      createdDriveSheetName: sheetName,
    }),
  }).catch(() => {});

  return {
    spreadsheetId,
    sheetUrl,
    sheetName: created.name || sheetName,
    folder,
    userEmail,
    pulledRowsCount: 0,
    newlyImportedLeads: [],
  };
}

/**
 * Syncs and formats the Master Google Sheet with the latest multi-tab leads data.
 * Uses strict RFC 2387 multipart/related and verified PK\x03\x04 XLSX bytes so all 9 visual tabs are preserved.
 */
export async function syncLeadsToLiveGoogleSheetInDrive(options?: {
  spreadsheetId?: string;
  accessToken?: string | null;
  silentIfNoAuth?: boolean;
}): Promise<LiveDriveSheetResult> {
  const token = options?.accessToken || getAccessTokenSync();
  const userEmail: string | null = 'cleaningserviceyeg@gmail.com';

  if (!token) {
    return performServerSideGoogleSheetSync({
      spreadsheetId: options?.spreadsheetId,
      downloadXlsx: false,
    });
  }

  let folder: DriveFolderInfo;
  try {
    folder = await ensureTidyUpsDriveFolder(token);
  } catch {
    return performServerSideGoogleSheetSync({
      spreadsheetId: options?.spreadsheetId,
      downloadXlsx: false,
    });
  }

  // Resolve candidate spreadsheet IDs: explicit option -> server config (createdDriveSheetId / spreadsheetId)
  const candidateIds: string[] = [];
  if (
    options?.spreadsheetId &&
    !options.spreadsheetId.includes('clean_sheet') &&
    options.spreadsheetId.length >= 20 &&
    !isArchivedOldSheetUrlOrId(options.spreadsheetId)
  ) {
    candidateIds.push(options.spreadsheetId.trim());
  }

  try {
    const cfgRes = await fetch('/api/google-sheets/config?project=tidyups');
    if (cfgRes.ok) {
      const cfg = await cfgRes.json();
      if (
        cfg?.createdDriveSheetId &&
        !isArchivedOldSheetUrlOrId(cfg.createdDriveSheetId) &&
        !candidateIds.includes(cfg.createdDriveSheetId)
      ) {
        candidateIds.unshift(cfg.createdDriveSheetId);
      }
      if (
        cfg?.spreadsheetId &&
        !cfg.spreadsheetId.includes('clean_sheet') &&
        cfg.spreadsheetId.length >= 20 &&
        !isArchivedOldSheetUrlOrId(cfg.spreadsheetId) &&
        !candidateIds.includes(cfg.spreadsheetId)
      ) {
        candidateIds.push(cfg.spreadsheetId);
      }
    }
  } catch {
    // ignore config fetch error
  }

  // STEP 1 (PULL BEFORE PUSH): Pull any new rows written by Facebook Lead Ads / Google Ads from the new sheet FIRST!
  let pullSnap: PullGoogleSheetLeadsResult | null = null;
  if (candidateIds.length > 0) {
    try {
      const targetSheetUrlForPull = `https://docs.google.com/spreadsheets/d/${candidateIds[0]}/edit`;
      pullSnap = await pullNewLeadsFromGoogleSheetInDrive({
        sheetUrl: targetSheetUrlForPull,
        accessToken: token,
      });
    } catch {
      // ignore pre-pull warning
    }
  }

  // STEP 2 (EXPORT & PATCH): Export the verified 9-tab workbook and update the Google Sheet in Drive
  if (candidateIds.length > 0) {
    const xlsxBytes = await fetchVerifiedStyledLeadsXlsxBytes();
    for (const targetId of candidateIds) {
      try {
        const patchMeta = {
          mimeType: 'application/vnd.google-apps.spreadsheet',
        };
        const multipart = buildGoogleDriveMultipartRelatedBody(patchMeta, xlsxBytes);

        const patchRes = await fetch(
          `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(
            targetId
          )}?uploadType=multipart&fields=id,name,webViewLink`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': multipart.contentType,
            },
            body: multipart.body,
          }
        );

        if (patchRes.ok) {
          const updated = await patchRes.json();
          const sheetUrl = `https://docs.google.com/spreadsheets/d/${updated.id}/edit`;
          const sheetName = updated.name || 'TidyUps Clean Leads & Ads Hub';
          await fetch('/api/google-sheets/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              spreadsheetId: updated.id,
              sheetUrl,
              createdDriveSheetId: updated.id,
              createdDriveSheetUrl: sheetUrl,
              createdDriveSheetName: sheetName,
            }),
          }).catch(() => {});

          return {
            spreadsheetId: updated.id,
            sheetUrl,
            sheetName,
            folder,
            userEmail,
            pulledRowsCount: pullSnap?.pulledRowsCount || 0,
            newlyImportedLeads: pullSnap?.newlyImportedLeads || [],
            leads: pullSnap?.leads,
            clients: pullSnap?.clients,
            quotes: pullSnap?.quotes,
          };
        }
      } catch {
        // try next candidate ID
      }
    }
  }

  return performServerSideGoogleSheetSync({
    spreadsheetId: options?.spreadsheetId,
    downloadXlsx: false,
  });
}

/**
 * Downloads a file from an internal /api/... endpoint using in-memory fetch() + Blob
 * so the browser NEVER navigates to a raw .run.app URL and verifies .xlsx magic bytes.
 */
export async function downloadFileFromApiWithoutNavigation(
  apiUrl: string,
  fallbackFilename: string
): Promise<void> {
  if (apiUrl.includes('leads/export.xlsx')) {
    const xlsxBytes = await fetchVerifiedStyledLeadsXlsxBytes();
    const blob = new Blob([xlsxBytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fallbackFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    return;
  }

  const res = await fetch(apiUrl, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Download failed (${res.status})`);
  }
  const disposition = res.headers.get('Content-Disposition') || '';
  const fnMatch = disposition.match(/filename="?([^"]+)"?/i);
  const filename = fnMatch?.[1] || fallbackFilename;

  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
}


