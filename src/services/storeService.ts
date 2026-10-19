import fs from "fs";
import path from "path";

const IS_SERVERLESS = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const BUNDLED_DATA_DIR = path.join(process.cwd(), "data");
const DATA_DIR = IS_SERVERLESS ? "/tmp" : path.join(process.cwd(), "data");

export type SupportedProjectId = "tidyups";

const PRIMARY_STORE_FILENAME = "tidyups_cleaning_store.json";

export function resolveStoreFilePath(_projectId?: string): string {
  return path.join(DATA_DIR, PRIMARY_STORE_FILENAME);
}

export function resolveBundledStoreFilePath(_projectId?: string): string {
  return path.join(BUNDLED_DATA_DIR, PRIMARY_STORE_FILENAME);
}

export interface AppPersistentStore {
  version: number;
  lastSavedAt: string;
  tickets: any[];
  cleanerOverrides: Record<string, any>;
  scheduledVisits: any[];
  unscheduledJobs?: any[];
  staffRoster?: any[];
  clients?: any[];
  quotes: any[];
  invoices: any[];
  quoCallLogs?: any[];
  adLeads?: any[];
  chatMessages?: any[];
  spamShieldConfig?: {
    enabled: boolean;
    blockAllNonNorthAmerica: boolean;
    blockedCountryCodes: string[];
    blockedPrefixes: string[];
    blockedNumbers: string[];
    blockRobocallFloods: boolean;
    rejectionAction: 'busy' | 'reject';
    forwardDestinationNumber?: string;
    callerIdMode?: 'caller' | 'line';
    lineMappings?: Record<string, string>;
  };
  blockedCallsHistory?: any[];
  recentInboundCalls?: any[];
  jobberConfig?: {
    isConnected: boolean;
    accountName: string;
    clientId: string;
    clientSecret: string;
    accessToken: string;
    refreshToken: string;
    lastSyncedAt: string;
  };
  quoConfig?: {
    isConnected: boolean;
    apiKey: string;
    phoneNumbers: any[];
  };
  apiKeys?: {
    mapsApiKey?: string;
    geminiApiKey?: string;
  };
  serviceCatalog?: any[];
  zipPrCounter?: number;
  lastZipFilename?: string;
  lastZipCreatedAt?: string;
  githubConfig?: {
    token?: string;
    owner?: string;
    repo?: string;
    lastPushedAt?: string;
    lastPushedPr?: string;
    lastPushedUrl?: string;
  };
  headerNavOrder?: string[];
  footerBtnOrder?: string[];
  footerButtonsSide?: 'left' | 'right';
}

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error("Failed to create data directory:", err);
  }
}

/**
 * Loads stored data from disk exclusively for TidyUps Cleaning (app.tidyupscleaning.com)
 */
export function loadStore(_projectId?: string): AppPersistentStore | null {
  const targetFile = resolveStoreFilePath();
  const bundledFile = resolveBundledStoreFilePath();

  try {
    const candidateFiles = [targetFile, bundledFile];

    let newestStore: AppPersistentStore | null = null;
    let newestTime = 0;

    for (const file of candidateFiles) {
      if (fs.existsSync(file)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(file, "utf-8")) as AppPersistentStore;
          const ts = parsed?.lastSavedAt ? new Date(parsed.lastSavedAt).getTime() : 1;
          if (!newestStore || ts > newestTime) {
            newestStore = parsed;
            newestTime = ts;
          }
        } catch {
          // skip unreadable candidate
        }
      }
    }

    if (newestStore) {
      return newestStore;
    }
  } catch (err) {
    console.warn(`Could not read store file (${targetFile}), creating initial store:`, err);
  }
  return null;
}

/**
 * Atomically writes and persists store data exclusively for TidyUps Cleaning (app.tidyupscleaning.com)
 */
export function saveStore(
  store: AppPersistentStore & { explicitReplaceSpamShield?: boolean },
  _projectId?: string
): boolean {
  const targetFile = resolveStoreFilePath();

  try {
    const existing = loadStore() || ({} as Partial<AppPersistentStore>);

    const explicitReplace = Boolean((store as any).explicitReplaceSpamShield);
    const incomingShield = store.spamShieldConfig;
    const existingShield = existing.spamShieldConfig;

    let mergedSpamShield = incomingShield || existingShield;
    if (incomingShield && existingShield && !explicitReplace) {
      mergedSpamShield = {
        ...existingShield,
        ...incomingShield,
        blockedNumbers: Array.from(
          new Set([...(existingShield.blockedNumbers || []), ...(incomingShield.blockedNumbers || [])])
        ),
        blockedPrefixes: Array.from(
          new Set([...(existingShield.blockedPrefixes || []), ...(incomingShield.blockedPrefixes || [])])
        ),
        blockedCountryCodes: Array.from(
          new Set([...(existingShield.blockedCountryCodes || []), ...(incomingShield.blockedCountryCodes || [])])
        ),
        lineMappings: {
          ...(existingShield.lineMappings || {}),
          ...(incomingShield.lineMappings || {}),
        },
      };
    }

    // Preserve blockedCallsHistory across partial saves unless explicitly cleared
    const mergedBlockedHistory = (() => {
      if (Array.isArray(store.blockedCallsHistory)) {
        if (store.blockedCallsHistory.length === 0 && explicitReplace) return [];
        const map = new Map<string, any>();
        for (const item of existing.blockedCallsHistory || []) {
          if (item && (item.id || item.callerNumber)) {
            map.set(item.id || `${item.callerNumber}-${item.timestamp}`, item);
          }
        }
        for (const item of store.blockedCallsHistory) {
          if (item && (item.id || item.callerNumber)) {
            map.set(item.id || `${item.callerNumber}-${item.timestamp}`, item);
          }
        }
        return Array.from(map.values()).slice(0, 200);
      }
      return existing.blockedCallsHistory || [];
    })();

    // Preserve quoCallLogs and never lose SOLICITOR_BLOCKED / manuallyBlocked flags on existing calls
    const mergedQuoCallLogs = (() => {
      const existingLogs = Array.isArray(existing.quoCallLogs) ? existing.quoCallLogs : [];
      const incomingLogs = Array.isArray(store.quoCallLogs) ? store.quoCallLogs : null;
      if (!incomingLogs) return existingLogs;

      const byId = new Map<string, any>();
      for (const c of existingLogs) {
        if (c && c.id) byId.set(c.id, c);
      }
      for (const c of incomingLogs) {
        if (!c || !c.id) continue;
        const prev = byId.get(c.id);
        if (prev && (prev.manuallyBlocked || prev.status === 'SOLICITOR_BLOCKED') && c.manuallyBlocked !== false && !explicitReplace) {
          byId.set(c.id, {
            ...prev,
            ...c,
            status: 'SOLICITOR_BLOCKED',
            isBlocked: true,
            manuallyBlocked: true,
          });
        } else {
          byId.set(c.id, { ...(prev || {}), ...c });
        }
      }
      return Array.from(byId.values());
    })();

    const cleanStore = { ...store };
    delete (cleanStore as any).explicitReplaceSpamShield;

    // Deduplicate embedded callTranscripts on quotes so store file never bloats above GitHub's 1MB limit
    const cleanedQuotes = Array.isArray(cleanStore.quotes || existing.quotes)
      ? (cleanStore.quotes || existing.quotes).map((q: any) => {
          if (!q || !Array.isArray(q.callTranscripts) || q.callTranscripts.length <= 1) return q;
          const seen = new Set<string>();
          return {
            ...q,
            callTranscripts: q.callTranscripts
              .filter((c: any) => {
                const key = String(c?.callId || c?.id || `${c?.callerPhone}-${c?.timestamp}`);
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
              })
              .slice(0, 5),
          };
        })
      : [];

    const rawGh = (store as any).githubConfig || (existing as any).githubConfig;
    const safeGithubConfig = rawGh
      ? {
          owner: rawGh.owner,
          repo: rawGh.repo,
          lastPushedAt: rawGh.lastPushedAt,
          lastPushedPr: rawGh.lastPushedPr,
          lastPushedUrl: rawGh.lastPushedUrl,
        }
      : undefined;

    const merged: AppPersistentStore = {
      ...existing,
      ...cleanStore,
      quotes: cleanedQuotes,
      // Ensure nested API, phone configurations, blocked call lists, and custom serviceCatalog are never erased
      spamShieldConfig: mergedSpamShield,
      blockedCallsHistory: mergedBlockedHistory,
      quoCallLogs: mergedQuoCallLogs,
      jobberConfig: store.jobberConfig || existing.jobberConfig,
      quoConfig: store.quoConfig || existing.quoConfig,
      githubConfig: safeGithubConfig,
      apiKeys: store.apiKeys || existing.apiKeys,
      serviceCatalog:
        Array.isArray(store.serviceCatalog) && store.serviceCatalog.length > 0
          ? store.serviceCatalog
          : existing.serviceCatalog,
      headerNavOrder:
        Array.isArray(store.headerNavOrder) && store.headerNavOrder.length > 0
          ? store.headerNavOrder
          : existing.headerNavOrder,
      footerBtnOrder:
        Array.isArray(store.footerBtnOrder) && store.footerBtnOrder.length > 0
          ? store.footerBtnOrder
          : existing.footerBtnOrder,
      footerButtonsSide:
        store.footerButtonsSide === 'left' || store.footerButtonsSide === 'right'
          ? store.footerButtonsSide
          : existing.footerButtonsSide,
      lastSavedAt: new Date().toISOString(),
    };

    if (Array.isArray(merged.scheduledVisits)) {
      merged.scheduledVisits = merged.scheduledVisits.filter(
        (v: any) => !v?.startAt || String(v.startAt) >= "2026-10-01"
      );
    }
    if (Array.isArray(merged.quoCallLogs) && merged.quoCallLogs.length > 25) {
      merged.quoCallLogs = merged.quoCallLogs.slice(0, 25);
    }

    // Replace Quo "AC" + 32 hex call IDs with "QUO_" so GitHub Push Protection never mistakes them for a Twilio SID
    const json = JSON.stringify(merged, null, 2).replace(/AC([0-9a-f]{32})/gi, "QUO_$1");

    fs.writeFileSync(targetFile, json, "utf-8");

    return true;
  } catch (err) {
    console.error(`Failed to write store (${targetFile}):`, err);
    return false;
  }
}
