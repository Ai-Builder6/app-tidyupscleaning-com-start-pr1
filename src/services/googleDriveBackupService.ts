import { User } from 'firebase/auth';
import { getAccessTokenSync, googleSignIn } from '../lib/firebase';

export const TIDYUPS_DRIVE_FOLDER_NAME = 'TidyUps Cleaning App Backup Zips';

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

/**
 * 1-Click Handler:
 * 1. Determines the next sequential PR number (PR1, PR2, PR3...) across Google Drive & Server so morning and afternoon saves are always distinct.
 * 2. Builds a fresh numbered `app.tidyups.cleaning-PR#...zip` on the server.
 * 3. Uploads the numbered ZIP straight into "TidyUps Cleaning App Backup Zips" in Google Drive.
 */
export async function uploadWholeProjectZipToDriveFolder(options?: {
  customFilename?: string;
  requestedPr?: string | number;
  forceRebuild?: boolean;
  accessToken?: string | null;
  aiWorkflowContent?: string;
}): Promise<DriveUploadResult> {
  let token = options?.accessToken || getAccessTokenSync();
  let userEmail: string | null = null;

  if (!token) {
    // Trigger Google Sign-In synchronously on the click tick before any await
    const authPromise = ensureDriveAuthToken();
    const authRes = await authPromise;
    token = authRes.accessToken;
    userEmail = authRes.user?.email || null;
  }

  let folder: DriveFolderInfo;
  let existingDriveFiles: DriveBackupFileItem[] = [];
  try {
    const listed = await listTidyUpsFolderFiles(token);
    folder = listed.folder;
    existingDriveFiles = listed.files;
  } catch (err: any) {
    if (err?.message === 'AUTH_EXPIRED') {
      const freshAuth = await googleSignIn();
      if (!freshAuth?.accessToken) {
        throw new Error('Google Drive re-authentication required.');
      }
      token = freshAuth.accessToken;
      userEmail = freshAuth.user?.email || null;
      const listed = await listTidyUpsFolderFiles(token);
      folder = listed.folder;
      existingDriveFiles = listed.files;
    } else {
      throw err;
    }
  }

  // Inspect existing PR numbers in Google Drive so we never collide with an earlier morning/afternoon save (minimum floor PR6 since PR1-PR5 are retired)
  let highestDrivePr = 5;
  for (const f of existingDriveFiles) {
    const m = (f.name || '').match(/PR(\d+)/i);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!isNaN(n) && n > highestDrivePr) highestDrivePr = n;
    }
  }

  let prParam = '';
  if (options?.requestedPr !== undefined && options?.requestedPr !== '') {
    const m = String(options.requestedPr).match(/(\d+)/);
    if (m) prParam = `&pr=${Math.max(6, parseInt(m[1], 10))}`;
  } else {
    prParam = `&pr=${highestDrivePr + 1}`;
  }

  const shouldIncrement = options?.forceRebuild !== false;
  const queryUrl = `/api/project/export-zip?mode=drive&force=true${shouldIncrement ? '&increment=true' : ''}${prParam}`;
  const zipRes = await fetch(queryUrl);
  if (!zipRes.ok) {
    throw new Error('Could not build or retrieve Whole Project & Workflows ZIP from server.');
  }

  const reusedServerZip = zipRes.headers.get('X-Zip-Cache-Status') === 'REUSED_EXISTING';
  const serverSuggestedName = zipRes.headers.get('X-Zip-Filename');
  const prLabel = zipRes.headers.get('X-Zip-PR-Label') || 'PR6';
  const prNumber = Number(zipRes.headers.get('X-Zip-PR-Number') || 6);
  const zipBlob = await zipRes.blob();

  const dateStr = new Date().toISOString().slice(0, 10);
  const zipFilename =
    options?.customFilename ||
    serverSuggestedName ||
    `app.tidyups.cleaning-${prLabel}-${dateStr}.zip`;

  const { file } = await uploadAppFileToTidyUpsDriveFolder({
    filename: zipFilename,
    blob: zipBlob,
    mimeType: 'application/zip',
    description: `TidyUps Cleaning (${prLabel}) Whole Project & Workflows Archive for app.tidyups.cleaning (src/, server.ts, .github/workflows/, workflows/, AI_BUILD_WORKFLOW.md, README.md, database store & configs)`,
    accessToken: token,
  });

  // Also ensure AI_BUILD_WORKFLOW.md is inside the same "TidyUps Cleaning App Backup Zips" folder
  if (options?.aiWorkflowContent) {
    await uploadAppFileToTidyUpsDriveFolder({
      filename: `AI_BUILD_WORKFLOW-${prLabel}-${dateStr}.md`,
      blob: new Blob([options.aiWorkflowContent], { type: 'text/markdown' }),
      mimeType: 'text/markdown',
      description: `Master AI Build & Reconstruction Workflow (${prLabel}) for TidyUps Cleaning (app.tidyups.cleaning)`,
      accessToken: token,
    }).catch(() => {});
  }

  return {
    folder,
    file,
    reusedServerZip,
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
  let token = options?.accessToken || getAccessTokenSync();

  if (!token && options?.promptAuthIfNeeded) {
    try {
      const authRes = await ensureDriveAuthToken();
      token = authRes.accessToken;
    } catch {
      // Continue with public link check if popup closed
    }
  }

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
 * 1-Click: Creates a brand-new native multi-tab Google Sheet inside the user's
 * "TidyUps Cleaning App Backup Zips" folder in Google Drive (pre-formatted with
 * "FB Leads", "Google Leads", "Voice & Quick Quotes", "Pasted Leads", and the
 * 20-column "ScrubbyBuilder Leads" schema for Facebook Lead Ads & Google Ads),
 * and immediately saves it as the active Clean Google Sheet URL across the app.
 */
export async function createNewCleanLeadsSheetInDrive(options?: {
  sheetTitle?: string;
  accessToken?: string | null;
}): Promise<LiveDriveSheetResult> {
  let token = options?.accessToken || getAccessTokenSync();
  let userEmail: string | null = null;

  if (!token) {
    const authPromise = ensureDriveAuthToken();
    const authRes = await authPromise;
    token = authRes.accessToken;
    userEmail = authRes.user?.email || null;
  }

  let folder: DriveFolderInfo;
  try {
    folder = await ensureTidyUpsDriveFolder(token);
  } catch (err: any) {
    if (err?.message === 'AUTH_EXPIRED') {
      const freshAuth = await googleSignIn();
      if (!freshAuth?.accessToken) {
        throw new Error('Google Drive re-authentication required.');
      }
      token = freshAuth.accessToken;
      userEmail = freshAuth.user?.email || null;
      folder = await ensureTidyUpsDriveFolder(token);
    } else {
      throw err;
    }
  }

  // First pull any new rows from existing sheets so we never miss a lead before creating the new sheet
  let pullSnap: PullGoogleSheetLeadsResult | null = null;
  try {
    pullSnap = await pullNewLeadsFromGoogleSheetInDrive({ accessToken: token });
  } catch {
    // ignore pre-pull notice
  }

  // Fetch the multi-tab XLSX buffer from the server (contains All Clean Leads, FB Leads, Google Leads, Voice & Quick Quotes, Pasted Leads, ScrubbyBuilder Leads)
  const xlsxRes = await fetch('/api/leads/export.xlsx?project=tidyups');
  if (!xlsxRes.ok) {
    throw new Error('Could not build Clean Leads multi-tab workbook from server.');
  }
  const xlsxBlob = await xlsxRes.blob();

  const dateStr = new Date().toISOString().slice(0, 10);
  const sheetName =
    options?.sheetTitle || `TidyUps Clean Leads & Ads Hub (FB & Google Ads) - ${dateStr}`;

  // Upload with target mimeType = application/vnd.google-apps.spreadsheet so Google Drive natively converts the multi-tab XLSX into a live Google Sheet!
  const createMeta = {
    name: sheetName,
    mimeType: 'application/vnd.google-apps.spreadsheet',
    parents: [folder.id],
    description:
      'Live TidyUps Clean Leads & Ads Google Sheet (Tabs: FB Leads, Google Leads, Voice & Quick Quotes, Pasted Leads, ScrubbyBuilder Leads). Ready for Facebook Lead Ads & Google Ads.',
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(createMeta)], { type: 'application/json' }));
  form.append(
    'file',
    new Blob([xlsxBlob], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
  );

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }
  );

  if (!uploadRes.ok) {
    const errBody = await uploadRes.json().catch(() => ({}));
    throw new Error(
      errBody?.error?.message || 'Failed to create Google Sheet in your Google Drive folder.'
    );
  }

  const created = await uploadRes.json();
  const spreadsheetId = created.id;
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Save the newly created live Google Sheet URL as the active sheet on the server
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
    pulledRowsCount: pullSnap?.pulledRowsCount || 0,
    newlyImportedLeads: pullSnap?.newlyImportedLeads || [],
    leads: pullSnap?.leads,
    clients: pullSnap?.clients,
    quotes: pullSnap?.quotes,
  };
}

/**
 * Updates an existing Google Sheet in Google Drive with the latest multi-tab leads data
 * (or creates a new Google Sheet in the user's Drive folder if no existing sheet can be patched).
 * CRITICAL: Always pulls any newly added Facebook Lead Ads / Google Ads rows from the Google Sheet FIRST
 * before exporting and patching, so external form submissions are never overwritten!
 */
export async function syncLeadsToLiveGoogleSheetInDrive(options?: {
  spreadsheetId?: string;
  accessToken?: string | null;
  silentIfNoAuth?: boolean;
}): Promise<LiveDriveSheetResult> {
  let token = options?.accessToken || getAccessTokenSync();
  let userEmail: string | null = null;

  if (!token) {
    if (options?.silentIfNoAuth) {
      throw new Error('NO_ACTIVE_GOOGLE_TOKEN');
    }
    const authPromise = ensureDriveAuthToken();
    const authRes = await authPromise;
    token = authRes.accessToken;
    userEmail = authRes.user?.email || null;
  }

  let folder: DriveFolderInfo;
  try {
    folder = await ensureTidyUpsDriveFolder(token);
  } catch (err: any) {
    if (err?.message === 'AUTH_EXPIRED') {
      if (options?.silentIfNoAuth) {
        throw err;
      }
      const freshAuth = await googleSignIn();
      if (!freshAuth?.accessToken) {
        throw new Error('Google Drive re-authentication required.');
      }
      token = freshAuth.accessToken;
      userEmail = freshAuth.user?.email || null;
      folder = await ensureTidyUpsDriveFolder(token);
    } else {
      throw err;
    }
  }

  // Resolve candidate spreadsheet IDs: explicit option -> server config (createdDriveSheetId / spreadsheetId) -> existing sheet in Drive folder
  const candidateIds: string[] = [];
  if (options?.spreadsheetId && !options.spreadsheetId.includes('clean_sheet') && options.spreadsheetId.length >= 20) {
    candidateIds.push(options.spreadsheetId.trim());
  }

  try {
    const cfgRes = await fetch('/api/google-sheets/config?project=tidyups');
    if (cfgRes.ok) {
      const cfg = await cfgRes.json();
      if (cfg?.createdDriveSheetId && !candidateIds.includes(cfg.createdDriveSheetId)) {
        candidateIds.unshift(cfg.createdDriveSheetId);
      }
      if (
        cfg?.spreadsheetId &&
        !cfg.spreadsheetId.includes('clean_sheet') &&
        cfg.spreadsheetId.length >= 20 &&
        !candidateIds.includes(cfg.spreadsheetId)
      ) {
        candidateIds.push(cfg.spreadsheetId);
      }
    }
  } catch {
    // ignore config fetch error
  }

  // Also check if there is already a "TidyUps Clean Leads & Ads Hub" Google Sheet inside the Drive folder
  try {
    const q = encodeURIComponent(
      `'${folder.id}' in parents and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`
    );
    const listRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,webViewLink)&orderBy=modifiedTime desc&pageSize=5`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (listRes.ok) {
      const listData = await listRes.json();
      for (const f of listData?.files || []) {
        if (f?.id && !candidateIds.includes(f.id)) {
          candidateIds.push(f.id);
        }
      }
    }
  } catch {
    // ignore folder search error
  }

  // STEP 1 (PULL BEFORE PUSH): Pull any new rows written by Facebook Lead Ads / Google Ads from the sheet FIRST!
  let pullSnap: PullGoogleSheetLeadsResult | null = null;
  try {
    const targetSheetUrlForPull =
      candidateIds.length > 0
        ? `https://docs.google.com/spreadsheets/d/${candidateIds[0]}/edit`
        : undefined;
    pullSnap = await pullNewLeadsFromGoogleSheetInDrive({
      sheetUrl: targetSheetUrlForPull,
      accessToken: token,
    });
  } catch {
    // ignore pre-pull warning
  }

  // STEP 2 (EXPORT & PATCH): Now export the complete merged multi-tab workbook and update the Google Sheet in Drive
  const xlsxRes = await fetch('/api/leads/export.xlsx?project=tidyups');
  if (xlsxRes.ok && candidateIds.length > 0) {
    const xlsxBlob = await xlsxRes.blob();
    for (const targetId of candidateIds) {
      try {
        const patchMeta = {
          mimeType: 'application/vnd.google-apps.spreadsheet',
        };
        const patchForm = new FormData();
        patchForm.append('metadata', new Blob([JSON.stringify(patchMeta)], { type: 'application/json' }));
        patchForm.append(
          'file',
          new Blob([xlsxBlob], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          })
        );

        const patchRes = await fetch(
          `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(
            targetId
          )}?uploadType=multipart&fields=id,name,webViewLink`,
          {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` },
            body: patchForm,
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

  // Fallback: create a fresh writable Google Sheet in the user's Drive folder and link it
  return createNewCleanLeadsSheetInDrive({ accessToken: token });
}

/**
 * Downloads a file from an internal /api/... endpoint using in-memory fetch() + Blob
 * so the browser NEVER navigates to a raw .run.app URL (preventing the
 * "Action required to load your app / blocking a required security cookie" screen).
 */
export async function downloadFileFromApiWithoutNavigation(
  apiUrl: string,
  fallbackFilename: string
): Promise<void> {
  const res = await fetch(apiUrl);
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

