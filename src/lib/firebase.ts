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
  'https://book.tidyupscleaning.com',
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
const authSuccessListeners = new Set<(user: User, token: string) => void>();

async function finalizeAccessTokenSession(
  accessToken: string,
  emailHint?: string,
  nameHint?: string
): Promise<{ user: User; accessToken: string }> {
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
        email: info.email || emailHint || 'cleaningserviceyeg@gmail.com',
        displayName: info.name || info.email || nameHint || 'TidyUps Admin',
        photoURL: info.picture || null,
      } as unknown as User;
    }
  } catch {}

  if (!resolvedUser) {
    resolvedUser = {
      uid: 'google-drive-user',
      email: emailHint || 'cleaningserviceyeg@gmail.com',
      displayName: nameHint || 'TidyUps Admin',
    } as unknown as User;
  }

  cachedFallbackUser = resolvedUser;
  authSuccessListeners.forEach((cb) => {
    try {
      cb(resolvedUser!, accessToken);
    } catch {}
  });

  // Also cache the active token on our backend for 55 minutes so any tab/view can reuse it seamlessly
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

  // Check if backend already has an active Google Drive session token cached from this session
  if (!cachedAccessToken && typeof window !== 'undefined') {
    fetch('/api/google-drive/session-token')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.accessToken && !cachedAccessToken) {
          finalizeAccessTokenSession(data.accessToken, data.email, data.displayName).catch(() => {});
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
 * Direct Google Identity Services (initTokenClient) OAuth Sign-In.
 * NEVER calls Firebase signInWithPopup (`gtm-kvj5cp62-zty5m.firebaseapp.com/__/auth/handler`),
 * avoiding the "The requested action is invalid" popup completely.
 */
export const googleSignIn = (): Promise<{ user: User; accessToken: string } | null> => {
  isSigningIn = true;
  const gsi = typeof window !== 'undefined' ? (window as any).google?.accounts?.oauth2 : null;

  if (gsi && typeof gsi.initTokenClient === 'function') {
    return new Promise((resolve, reject) => {
      try {
        const tokenClient = gsi.initTokenClient({
          client_id: OAUTH_CLIENT_ID,
          scope: [...SCOPES, 'openid', 'email', 'profile'].join(' '),
          callback: async (tokenResponse: any) => {
            try {
              if (tokenResponse?.error) {
                isSigningIn = false;
                reject(
                  new Error(
                    tokenResponse.error_description ||
                      tokenResponse.error ||
                      'Google Drive authorization was declined.'
                  )
                );
                return;
              }
              const accessToken = tokenResponse?.access_token;
              if (!accessToken) {
                isSigningIn = false;
                reject(new Error('No access token returned from Google OAuth.'));
                return;
              }
              const session = await finalizeAccessTokenSession(accessToken);
              isSigningIn = false;
              resolve(session);
            } catch (innerErr) {
              isSigningIn = false;
              reject(innerErr);
            }
          },
          error_callback: (err: any) => {
            isSigningIn = false;
            reject(
              new Error(
                err?.message ||
                  'Google Sign-In popup was closed before completing selection. Click the button again and select cleaningserviceyeg@gmail.com.'
              )
            );
          },
        });

        // Synchronous call on user click tick opens ONLY the clean accounts.google.com chooser
        tokenClient.requestAccessToken({ prompt: '' });
      } catch (err) {
        isSigningIn = false;
        reject(err);
      }
    });
  }

  isSigningIn = false;
  return Promise.reject(
    new Error('Google Identity Services is still loading. Please wait 1 second and click again.')
  );
};

export const getAccessTokenSync = (): string | null => {
  return cachedAccessToken;
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async (): Promise<void> => {
  try {
    await auth.signOut();
  } catch (e) {
    console.warn('Firebase signOut notice:', e);
  }
  cachedAccessToken = null;
  cachedFallbackUser = null;
};

export async function signInWithGoogle(): Promise<User | null> {
  try {
    const res = await googleSignIn();
    return res ? res.user : null;
  } catch (error: any) {
    console.warn('Firebase Google Sign-in notice:', error?.code || error?.message || error);
    throw error;
  }
}

export async function signOutFirebase(): Promise<void> {
  cachedAccessToken = null;
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
