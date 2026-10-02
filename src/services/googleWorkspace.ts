import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
provider.addScope('https://www.googleapis.com/auth/gmail.send');
provider.addScope('https://www.googleapis.com/auth/userinfo.email');
provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
provider.setCustomParameters({ prompt: 'consent' });

// In-memory + sessionStorage cached token
let cachedAccessToken: string | null =
  typeof window !== 'undefined' ? sessionStorage.getItem('bk_google_token') : null;
let cachedUserProfile: GoogleUserProfile | null =
  typeof window !== 'undefined'
    ? (() => {
        try {
          const raw = sessionStorage.getItem('bk_google_user');
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      })()
    : null;

let isSigningIn = false;

export interface RealDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export interface RealGmailMessage {
  id: string;
  threadId?: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  body?: string;
}

export interface GoogleUserProfile {
  email: string;
  name: string;
  picture?: string;
}

export const initAuthListener = (
  onSuccess: (user: GoogleUserProfile, token: string) => void,
  onSignedOut: () => void
) => {
  // If we already have a cached token and user in session, notify immediately
  if (cachedAccessToken && cachedUserProfile) {
    onSuccess(cachedUserProfile, cachedAccessToken);
  }

  return onAuthStateChanged(auth, async (user) => {
    if (user && cachedAccessToken) {
      const profile: GoogleUserProfile = {
        email: user.email || 'user@gmail.com',
        name: user.displayName || 'Google User',
        picture: user.photoURL || undefined,
      };
      cachedUserProfile = profile;
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('bk_google_user', JSON.stringify(profile));
      }
      onSuccess(profile, cachedAccessToken);
    } else if (!isSigningIn && !cachedAccessToken) {
      onSignedOut();
    }
  });
};

export const signInWithGoogle = async (): Promise<{ user: GoogleUserProfile; accessToken: string }> => {
  // First attempt Google Identity Services tokenClient (most reliable in modern iframes)
  if (typeof window !== 'undefined' && window.google?.accounts?.oauth2 && firebaseConfig.oAuthClientId) {
    return new Promise((resolve, reject) => {
      try {
        isSigningIn = true;
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: firebaseConfig.oAuthClientId,
          scope:
            'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
          callback: async (resp: any) => {
            isSigningIn = false;
            if (resp.error) {
              reject(new Error(resp.error_description || resp.error));
              return;
            }

            cachedAccessToken = resp.access_token;
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('bk_google_token', resp.access_token);
            }

            let profile: GoogleUserProfile = {
              email: 'workspace.user@gmail.com',
              name: 'Google Workspace User',
            };

            try {
              const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${resp.access_token}` },
              });
              if (infoRes.ok) {
                const info = await infoRes.json();
                profile = {
                  email: info.email,
                  name: info.name || info.email.split('@')[0],
                  picture: info.picture,
                };
              }
            } catch {}

            cachedUserProfile = profile;
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('bk_google_user', JSON.stringify(profile));
            }

            resolve({ user: profile, accessToken: resp.access_token });
          },
        });
        client.requestAccessToken({ prompt: 'consent' });
      } catch (err) {
        isSigningIn = false;
        reject(err);
      }
    });
  }

  // Fallback to Firebase Auth
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;

    if (!token) {
      throw new Error('No access token returned from Google Auth');
    }

    cachedAccessToken = token;
    const profile: GoogleUserProfile = {
      email: result.user.email || 'user@gmail.com',
      name: result.user.displayName || 'Google User',
      picture: result.user.photoURL || undefined,
    };
    cachedUserProfile = profile;

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('bk_google_token', token);
      sessionStorage.setItem('bk_google_user', JSON.stringify(profile));
    }

    return { user: profile, accessToken: token };
  } catch (error: any) {
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const signOutGoogle = async () => {
  try {
    await firebaseSignOut(auth);
  } catch {}
  cachedAccessToken = null;
  cachedUserProfile = null;
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('bk_google_token');
    sessionStorage.removeItem('bk_google_user');
  }
};

export const getCachedToken = () => cachedAccessToken;

// Real-time live Gmail messages (securely proxied through the server backend to avoid browser iframe CORS errors)
export const fetchLiveGmailMessages = async (query = ''): Promise<RealGmailMessage[]> => {
  if (!cachedAccessToken) {
    throw new Error('Please sign in with Google first.');
  }

  const qParam = query ? `?q=${encodeURIComponent(query)}` : '';
  const res = await fetch(`/api/workspace/gmail${qParam}`, {
    headers: { Authorization: `Bearer ${cachedAccessToken}` },
  });

  if (res.status === 401) {
    cachedAccessToken = null;
    if (typeof window !== 'undefined') sessionStorage.removeItem('bk_google_token');
    throw new Error('Google authorization expired. Please click Sign In with Google.');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Failed to fetch Gmail messages from Google API');
  }

  const data = await res.json();
  return data.messages || [];
};

// Real-time live Google Drive files (securely proxied through the server)
export const fetchLiveDriveFiles = async (): Promise<RealDriveFile[]> => {
  if (!cachedAccessToken) {
    throw new Error('Please sign in with Google first.');
  }

  const res = await fetch('/api/workspace/drive', {
    headers: { Authorization: `Bearer ${cachedAccessToken}` },
  });

  if (res.status === 401) {
    cachedAccessToken = null;
    if (typeof window !== 'undefined') sessionStorage.removeItem('bk_google_token');
    throw new Error('Google authorization expired. Please click Sign In with Google.');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Failed to list Google Drive files');
  }

  const data = await res.json();
  return data.files || [];
};

// Real-time send email via Gmail (proxied through server)
export const sendLiveEmail = async (to: string, subject: string, body: string): Promise<boolean> => {
  if (!cachedAccessToken) {
    throw new Error('Please sign in with Google first.');
  }

  const res = await fetch('/api/workspace/send-email', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cachedAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ to, subject, body }),
  });

  if (res.status === 401) {
    cachedAccessToken = null;
    if (typeof window !== 'undefined') sessionStorage.removeItem('bk_google_token');
    throw new Error('Google authorization expired. Please click Sign In with Google.');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Failed to send email via Gmail');
  }

  return true;
};

// Real-time upload file to Google Drive (proxied through server)
export const saveLiveFileToDrive = async (
  filename: string,
  content: string,
  mimeType = 'text/plain'
): Promise<string> => {
  if (!cachedAccessToken) {
    throw new Error('Please sign in with Google first.');
  }

  const res = await fetch('/api/workspace/upload-drive', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cachedAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ filename, content, mimeType }),
  });

  if (res.status === 401) {
    cachedAccessToken = null;
    if (typeof window !== 'undefined') sessionStorage.removeItem('bk_google_token');
    throw new Error('Google authorization expired. Please click Sign In with Google.');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Failed to upload to Google Drive');
  }

  const data = await res.json();
  return data.id;
};
