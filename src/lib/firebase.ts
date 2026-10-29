import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithCredential,
  signOut, 
  onAuthStateChanged,
  User,
  Unsubscribe
} from 'firebase/auth';
import { getFirestore, initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

export const OAUTH_CLIENT_ID =
  (firebaseConfig as any).oAuthClientId ||
  '230358145142-cs2b932r0uoc0fvm8kner4ipkr6qvng9.apps.googleusercontent.com';

export const OAUTH_REGISTERED_ORIGINS = [
  'https://app.tidyupscleaning.com',
  'https://cleaning-service-dispatch-board-230358145142.us-east1.run.app',
  'https://ais-dev-2jvzwakvityygyeyjp5ysi-460696821435.us-east5.run.app',
  'https://ais-pre-2jvzwakvityygyeyjp5ysi-460696821435.us-east5.run.app',
];

export const OAUTH_BRIDGE_PRIMARY_ORIGIN =
  'https://cleaning-service-dispatch-board-230358145142.us-east1.run.app';

// Non-sensitive Google Workspace Drive scope (drive.file) — never triggers Google "This app is blocked" restricted scope warnings
export const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
];

SCOPES.forEach((scope) => {
  googleAuthProvider.addScope(scope);
});

const targetDatabaseId = (firebaseConfig as any).firestoreDatabaseId || '(default)';
export const db = (() => {
  try {
    return initializeFirestore(app, { ignoreUndefinedProperties: true }, targetDatabaseId);
  } catch {
    return getFirestore(app, targetDatabaseId);
  }
})();

// In-memory access token cache (never stored in localStorage/sessionStorage per security guidelines)
let isSigningIn = false;
let cachedAccessToken: string | null = null;
let cachedFallbackUser: User | null = null;
const rejectedTokens = new Set<string>();
const authSuccessListeners = new Set<(user: User, token: string) => void>();

export async function verifyGoogleAccessToken(
  token: string | null | undefined
): Promise<{ email?: string; expiresIn: number } | null> {
  const clean = String(token || '').trim();
  if (!clean || rejectedTokens.has(clean)) {
    return null;
  }
  try {
    const res = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(clean)}`
    );
    if (!res.ok) {
      rejectedTokens.add(clean);
      if (cachedAccessToken === clean) cachedAccessToken = null;
      return null;
    }
    const info = await res.json();
    const expiresIn = Number(info?.expires_in || 0);
    if (info?.error || isNaN(expiresIn) || expiresIn <= 90) {
      rejectedTokens.add(clean);
      if (cachedAccessToken === clean) cachedAccessToken = null;
      return null;
    }
    return {
      email: info.email,
      expiresIn,
    };
  } catch {
    return null;
  }
}

export function clearCachedAccessToken(badToken?: string | null): void {
  if (badToken) {
    rejectedTokens.add(String(badToken).trim());
  }
  if (cachedAccessToken) {
    rejectedTokens.add(cachedAccessToken);
  }
  cachedAccessToken = null;
  fetch('/api/google-drive/session-token', {
    method: 'DELETE',
  }).catch(() => {});
}

async function finalizeAccessTokenSession(
  accessToken: string,
  emailHint?: string,
  nameHint?: string
): Promise<{ user: User; accessToken: string }> {
  const verified = await verifyGoogleAccessToken(accessToken);
  if (!verified) {
    clearCachedAccessToken(accessToken);
    throw new Error('GOOGLE_TOKEN_EXPIRED_OR_INVALID');
  }

  cachedAccessToken = accessToken;
  let resolvedUser: User | null = null;

  try {
    const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (infoRes.ok) {
      const info = await infoRes.json();
      resolvedUser = {
        uid: info.sub || 'google-drive-user',
        email: info.email || verified.email || emailHint || 'cleaningserviceyeg@gmail.com',
        displayName: info.name || info.email || nameHint || 'TidyUps Admin',
        photoURL: info.picture || null,
      } as unknown as User;
    }
  } catch {}

  if (!resolvedUser) {
    resolvedUser = {
      uid: 'google-drive-user',
      email: verified.email || emailHint || 'cleaningserviceyeg@gmail.com',
      displayName: nameHint || 'TidyUps Admin',
    } as unknown as User;
  }

  cachedFallbackUser = resolvedUser;
  authSuccessListeners.forEach((cb) => {
    try {
      cb(resolvedUser!, accessToken);
    } catch {}
  });

  // Also cache the verified active token on our backend for 55 minutes so any tab/view can reuse it seamlessly
  fetch('/api/google-drive/session-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accessToken,
      email: resolvedUser.email || 'cleaningserviceyeg@gmail.com',
      displayName: resolvedUser.displayName || 'TidyUps Admin',
    }),
  }).catch(() => {});

  return { user: resolvedUser, accessToken };
}

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
): Unsubscribe => {
  if (onAuthSuccess) {
    authSuccessListeners.add(onAuthSuccess);
  }

  // Check if backend or primary Cloud Run bridge already has a LIVE, VERIFIED Google Drive session token cached
  if (!cachedAccessToken && typeof window !== 'undefined') {
    fetch('/api/google-drive/session-token')
      .then((r) => (r.ok ? r.json() : null))
      .then(async (data) => {
        if (data?.accessToken && !cachedAccessToken) {
          try {
            await finalizeAccessTokenSession(data.accessToken, data.email, data.displayName);
            return;
          } catch {
            clearCachedAccessToken(data.accessToken);
          }
        }
        // Fallback: check primary Cloud Run bridge so preview & live domains share authorization seamlessly
        if (!cachedAccessToken) {
          try {
            const bridgeRes = await fetch(`${OAUTH_BRIDGE_PRIMARY_ORIGIN}/api/google-drive/session-token`);
            if (bridgeRes.ok) {
              const bridgeData = await bridgeRes.json();
              if (bridgeData?.accessToken && !cachedAccessToken) {
                try {
                  await finalizeAccessTokenSession(
                    bridgeData.accessToken,
                    bridgeData.email,
                    bridgeData.displayName
                  );
                } catch {
                  rejectedTokens.add(String(bridgeData.accessToken).trim());
                }
              }
            }
          } catch {}
        }
      })
      .catch(() => {});
  }

  try {
    const unsub = onAuthStateChanged(
      auth,
      async (user: User | null) => {
        if (user && cachedAccessToken) {
          if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
        } else if (cachedAccessToken && cachedFallbackUser) {
          if (onAuthSuccess) onAuthSuccess(cachedFallbackUser, cachedAccessToken);
        } else if (!isSigningIn) {
          if (onAuthFailure) onAuthFailure();
        }
      },
      (err) => {
        console.warn('Firebase Auth state listener notice:', err?.message || err);
        if (cachedAccessToken && cachedFallbackUser && onAuthSuccess) {
          onAuthSuccess(cachedFallbackUser, cachedAccessToken);
        } else if (onAuthFailure) {
          onAuthFailure();
        }
      }
    );
    return () => {
      if (onAuthSuccess) authSuccessListeners.delete(onAuthSuccess);
      unsub();
    };
  } catch (e) {
    console.warn('Firebase initAuth notice:', e);
    if (onAuthFailure) onAuthFailure();
    return () => {
      if (onAuthSuccess) authSuccessListeners.delete(onAuthSuccess);
    };
  }
};

/**
 * Explicit user-click OAuth flow for Google Drive & Google Sheets.
 * Always routes through the already-authorized Cloud Run origin
 * (`https://cleaning-service-dispatch-board-230358145142.us-east1.run.app/oauth-bridge`)
 * so it works on both `app.tidyupscleaning.com` and AI Studio preview (`ais-dev-*.run.app`)
 * without ever triggering Error 400: origin_mismatch!
 */
export const requestGoogleDriveAccessTokenPopup = async (
  forceInteractive = false
): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  if (forceInteractive) {
    clearCachedAccessToken();
  } else if (cachedAccessToken) {
    try {
      return await finalizeAccessTokenSession(cachedAccessToken);
    } catch {
      clearCachedAccessToken();
    }
  }

  if (typeof window === 'undefined') return null;

  const bridgeOrigin = OAUTH_BRIDGE_PRIMARY_ORIGIN;
  const currentOrigin = window.location.origin.replace(/\/$/, '');
  const targetBridgeBase = currentOrigin === bridgeOrigin ? currentOrigin : bridgeOrigin;
  const bridgeUrl = `${targetBridgeBase}/oauth-bridge?return_origin=${encodeURIComponent(
    currentOrigin
  )}&prompt=select_account&t=${Date.now()}`;

  // Open popup SYNCHRONOUSLY during the user click event so Chrome/Safari never block it
  const popup = window.open(
    bridgeUrl,
    'tidyups_google_drive_oauth',
    'width=500,height=660,menubar=no,toolbar=no,location=no,status=no'
  );

  // Only check pre-existing cached server tokens if forceInteractive is false,
  // and ONLY accept if Google's tokeninfo endpoint confirms the token is live!
  if (!forceInteractive) {
    try {
      const cachedRes = await fetch('/api/google-drive/session-token');
      if (cachedRes.ok) {
        const cachedData = await cachedRes.json();
        if (cachedData?.accessToken && !rejectedTokens.has(cachedData.accessToken)) {
          try {
            const session = await finalizeAccessTokenSession(
              cachedData.accessToken,
              cachedData.email,
              cachedData.displayName
            );
            try {
              popup?.close();
            } catch {}
            return session;
          } catch {
            clearCachedAccessToken(cachedData.accessToken);
          }
        }
      }
    } catch {}

    try {
      const bridgeCachedRes = await fetch(`${OAUTH_BRIDGE_PRIMARY_ORIGIN}/api/google-drive/session-token`);
      if (bridgeCachedRes.ok) {
        const bridgeCachedData = await bridgeCachedRes.json();
        if (bridgeCachedData?.accessToken && !rejectedTokens.has(bridgeCachedData.accessToken)) {
          try {
            const session = await finalizeAccessTokenSession(
              bridgeCachedData.accessToken,
              bridgeCachedData.email,
              bridgeCachedData.displayName
            );
            try {
              popup?.close();
            } catch {}
            return session;
          } catch {
            rejectedTokens.add(String(bridgeCachedData.accessToken).trim());
          }
        }
      }
    } catch {}
  } else {
    // Snapshot any existing token on the bridge before user finishes interactive login so we don't close the popup early
    try {
      const bridgeCachedRes = await fetch(`${OAUTH_BRIDGE_PRIMARY_ORIGIN}/api/google-drive/session-token`);
      if (bridgeCachedRes.ok) {
        const bridgeCachedData = await bridgeCachedRes.json();
        if (bridgeCachedData?.accessToken) {
          const check = await verifyGoogleAccessToken(bridgeCachedData.accessToken);
          if (!check) {
            rejectedTokens.add(String(bridgeCachedData.accessToken).trim());
          }
        }
      }
    } catch {}
  }

  return new Promise((resolve) => {
    isSigningIn = true;

    if (!popup) {
      isSigningIn = false;
      resolve(null);
      return;
    }

    let settled = false;
    let isPolling = false;
    const cleanup = () => {
      isSigningIn = false;
      window.removeEventListener('message', onMessage);
      clearInterval(checkClosedAndPoll);
    };

    const onMessage = async (event: MessageEvent) => {
      if (!event?.data || event.data.type !== 'TIDYUPS_GOOGLE_OAUTH_SUCCESS') return;
      const token = String(event.data.accessToken || '').trim();
      if (!token || settled) return;
      try {
        const session = await finalizeAccessTokenSession(
          token,
          event.data.user?.email,
          event.data.user?.name
        );
        if (!settled) {
          settled = true;
          cleanup();
          try {
            popup.close();
          } catch {}
          resolve(session);
        }
      } catch {
        rejectedTokens.add(token);
      }
    };

    window.addEventListener('message', onMessage);

    const checkClosedAndPoll = setInterval(async () => {
      if (settled || isPolling) return;
      isPolling = true;
      try {
        // Poll local and bridge session-token endpoint in case COOP cleared window.opener
        try {
          const localTokenRes = await fetch('/api/google-drive/session-token');
          if (localTokenRes.ok) {
            const data = await localTokenRes.json();
            const candidate = String(data?.accessToken || '').trim();
            if (candidate && !rejectedTokens.has(candidate) && !settled) {
              try {
                const session = await finalizeAccessTokenSession(
                  candidate,
                  data.email,
                  data.displayName
                );
                if (!settled) {
                  settled = true;
                  cleanup();
                  try {
                    popup.close();
                  } catch {}
                  resolve(session);
                  return;
                }
              } catch {
                clearCachedAccessToken(candidate);
              }
            }
          }
        } catch {}

        try {
          const bridgeTokenRes = await fetch(`${bridgeOrigin}/api/google-drive/session-token`);
          if (bridgeTokenRes.ok) {
            const data = await bridgeTokenRes.json();
            const candidate = String(data?.accessToken || '').trim();
            if (candidate && !rejectedTokens.has(candidate) && !settled) {
              try {
                const session = await finalizeAccessTokenSession(
                  candidate,
                  data.email,
                  data.displayName
                );
                if (!settled) {
                  settled = true;
                  cleanup();
                  try {
                    popup.close();
                  } catch {}
                  resolve(session);
                  return;
                }
              } catch {
                rejectedTokens.add(candidate);
              }
            }
          }
        } catch {}

        if (popup.closed && !settled) {
          settled = true;
          cleanup();
          resolve(null);
        }
      } finally {
        isPolling = false;
      }
    }, 900);
  });
};

/**
 * Interactive Google Drive OAuth Sign-In triggered on user button clicks.
 * Uses the authorized Cloud Run /oauth-bridge popup so it never hits Error 400: origin_mismatch.
 */
export const googleSignIn = async (
  forceInteractive = false
): Promise<{ user: User; accessToken: string } | null> => {
  return requestGoogleDriveAccessTokenPopup(forceInteractive);
};

export const getAccessTokenSync = (): string | null => {
  if (cachedAccessToken && rejectedTokens.has(cachedAccessToken)) {
    cachedAccessToken = null;
  }
  return cachedAccessToken;
};

export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) {
    const check = await verifyGoogleAccessToken(cachedAccessToken);
    if (check) return cachedAccessToken;
    clearCachedAccessToken(cachedAccessToken);
  }
  try {
    const r = await fetch('/api/google-drive/session-token');
    if (r.ok) {
      const data = await r.json();
      if (data?.accessToken && !rejectedTokens.has(data.accessToken)) {
        const check = await verifyGoogleAccessToken(data.accessToken);
        if (check) {
          cachedAccessToken = data.accessToken;
          return cachedAccessToken;
        } else {
          clearCachedAccessToken(data.accessToken);
        }
      }
    }
  } catch {}
  return cachedAccessToken;
};

export const logout = async (): Promise<void> => {
  try {
    await auth.signOut();
  } catch (e) {
    console.warn('Firebase signOut notice:', e);
  }
  clearCachedAccessToken();
  cachedFallbackUser = null;
};

export async function signInWithGoogle(): Promise<User | null> {
  try {
    const res = await googleSignIn(true);
    return res ? res.user : null;
  } catch (error: any) {
    console.warn('Firebase Google Sign-in notice:', error?.code || error?.message || error);
    throw error;
  }
}

export async function signOutFirebase(): Promise<void> {
  clearCachedAccessToken();
  cachedFallbackUser = null;
  await signOut(auth);
}

export function onFirebaseAuthStateChanged(callback: (user: User | null) => void): Unsubscribe {
  try {
    return onAuthStateChanged(auth, callback, (err) => {
      console.warn('Firebase Auth listener notice:', err?.message || err);
    });
  } catch (e) {
    console.warn('Firebase Auth init notice:', e);
    return () => {};
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot per Firebase skill guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Please check your Firebase configuration: client is offline.");
    }
  }
}

testConnection().catch(() => {
  // Graceful initial probe
});
