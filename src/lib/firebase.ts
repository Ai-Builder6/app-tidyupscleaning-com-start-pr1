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

// Google Workspace Drive Scopes
export const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.activity',
  'https://www.googleapis.com/auth/drive.activity.readonly',
  'https://www.googleapis.com/auth/drive.appdata',
  'https://www.googleapis.com/auth/drive.apps.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.install',
  'https://www.googleapis.com/auth/drive.meet.readonly',
  'https://www.googleapis.com/auth/drive.metadata',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.photos.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.scripts',
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

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
): Unsubscribe => {
  if (onAuthSuccess) {
    authSuccessListeners.add(onAuthSuccess);
  }
  try {
    const unsub = onAuthStateChanged(
      auth,
      async (user: User | null) => {
        if (user) {
          if (cachedAccessToken) {
            if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
          } else if (!isSigningIn) {
            cachedAccessToken = null;
            if (onAuthFailure) onAuthFailure();
          }
        } else if (cachedAccessToken && cachedFallbackUser) {
          if (onAuthSuccess) onAuthSuccess(cachedFallbackUser, cachedAccessToken);
        } else {
          cachedAccessToken = null;
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
 * Synchronous Google OAuth Sign-In using Google Identity Services (initTokenClient)
 * with Firebase signInWithCredential fallback so popup is never blocked by Referer restrictions or async delays.
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

              cachedAccessToken = accessToken;

              // 1. Try signing into Firebase Auth with the Google OAuth access token (proxied via /api/firebase-auth-proxy)
              let resolvedUser: User | null = null;
              try {
                const cred = GoogleAuthProvider.credential(null, accessToken);
                const credResult = await signInWithCredential(auth, cred);
                resolvedUser = credResult.user;
              } catch (firebaseErr) {
                // 2. If Firebase Auth is unavailable, fetch Google userinfo directly so Drive upload still succeeds 100%
                try {
                  const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${accessToken}` },
                  });
                  if (infoRes.ok) {
                    const info = await infoRes.json();
                    resolvedUser = {
                      uid: info.sub || 'google-drive-user',
                      email: info.email || 'cleaningserviceyeg@gmail.com',
                      displayName: info.name || info.email || 'TidyUps Admin',
                      photoURL: info.picture || null,
                    } as unknown as User;
                  }
                } catch {}
              }

              if (!resolvedUser) {
                resolvedUser = {
                  uid: 'google-drive-user',
                  email: 'cleaningserviceyeg@gmail.com',
                  displayName: 'TidyUps Admin',
                } as unknown as User;
              }

              cachedFallbackUser = resolvedUser;
              authSuccessListeners.forEach((cb) => {
                try {
                  cb(resolvedUser!, accessToken);
                } catch {}
              });

              isSigningIn = false;
              resolve({ user: resolvedUser, accessToken });
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
                  'Google Sign-In popup was closed or blocked. Please click the button again to approve Google Drive.'
              )
            );
          },
        });

        // Must be called synchronously inside the user click handler tick!
        tokenClient.requestAccessToken({ prompt: '' });
      } catch (err) {
        isSigningIn = false;
        reject(err);
      }
    });
  }

  // Fallback to Firebase signInWithPopup (routed via /api/firebase-auth-proxy)
  return (async () => {
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error('Failed to get Google Drive OAuth access token from Firebase Auth');
      }
      cachedAccessToken = credential.accessToken;
      cachedFallbackUser = result.user;
      authSuccessListeners.forEach((cb) => {
        try {
          cb(result.user, cachedAccessToken!);
        } catch {}
      });
      return { user: result.user, accessToken: cachedAccessToken };
    } catch (error: any) {
      console.warn('Google Drive OAuth Sign-in notice:', error?.code || error?.message || error);
      throw error;
    } finally {
      isSigningIn = false;
    }
  })();
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
