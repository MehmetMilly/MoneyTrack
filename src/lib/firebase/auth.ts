import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  getRedirectResult,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth, firebaseConfigMissingMessage, googleProvider, isFirebaseConfigured } from './client';

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
}

function assertFirebaseConfigured() {
  if (!isFirebaseConfigured) {
    throw new Error(firebaseConfigMissingMessage);
  }
}

export async function loginWithEmail(email: string, password: string) {
  assertFirebaseConfigured();
  return signInWithEmailAndPassword(auth, email, password);
}

async function createUserWithEmailRest(email: string, password: string) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${import.meta.env.VITE_FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    }
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    const message = payload?.error?.message ?? 'SIGNUP_FAILED';
    throw Object.assign(new Error(getAuthErrorMessage({ code: message })), { code: message });
  }
}

function isNetworkRequestFailure(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'auth/network-request-failed'
  );
}

export async function signupWithEmail({ name, email, password }: SignupPayload) {
  assertFirebaseConfigured();
  let credential;

  try {
    credential = await createUserWithEmailAndPassword(auth, email, password);
  } catch (error) {
    if (!isNetworkRequestFailure(error)) {
      throw error;
    }

    await createUserWithEmailRest(email, password);
    credential = await signInWithEmailAndPassword(auth, email, password);
  }

  if (name.trim()) {
    await updateProfile(credential.user, { displayName: name.trim() });
  }
  return credential;
}

export async function loginWithGoogle() {
  assertFirebaseConfigured();
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'auth/popup-blocked'
    ) {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }

    throw error;
  }
}

export async function completeGoogleRedirectSignIn() {
  if (!isFirebaseConfigured) {
    return null;
  }
  return getRedirectResult(auth);
}

export async function logoutUser() {
  if (!isFirebaseConfigured) {
    return;
  }
  await signOut(auth);
}

export async function sendPasswordReset(email: string) {
  assertFirebaseConfigured();
  await sendPasswordResetEmail(auth, email);
}

export function observeAuthState(callback: (user: User | null) => void) {
  if (!isFirebaseConfigured) {
    callback(null);
    return () => undefined;
  }
  return onAuthStateChanged(auth, callback);
}

export async function getExistingSignInMethods(email: string) {
  assertFirebaseConfigured();
  return fetchSignInMethodsForEmail(auth, email);
}

export function getAuthErrorMessage(error: unknown): string {
  const code =
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string'
      ? (error as { code: string }).code
      : '';

  switch (code) {
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email. Sign in with the original provider first.';
    case 'auth/email-already-in-use':
      return 'This email address is already being used.';
    case 'auth/invalid-credential':
    case 'auth/invalid-email':
      return 'The email address or password is invalid.';
    case 'auth/invalid-login-credentials':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Incorrect email or password.';
    case 'auth/network-request-failed':
      return 'MoneyTrack could not reach Firebase Auth. Please check your connection and try again.';
    case 'auth/unauthorized-domain':
      return 'Google sign-in is not enabled for this domain yet. Add the current local or deployed hostname to Firebase Authentication authorized domains.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was closed before it finished.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google sign-in popup.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/weak-password':
    case 'WEAK_PASSWORD':
      return 'Choose a stronger password with at least 6 characters.';
    case 'EMAIL_EXISTS':
      return 'This email address is already being used.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
