import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

function readEnv(name: keyof ImportMetaEnv): string {
  return import.meta.env[name] || '';
}

const rawFirebaseConfig = {
  apiKey: readEnv('VITE_FIREBASE_API_KEY'),
  authDomain: readEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: readEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: readEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: readEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: readEnv('VITE_FIREBASE_APP_ID'),
};

export const isFirebaseConfigured = Object.values(rawFirebaseConfig).every(Boolean);

export const firebaseConfigMissingMessage =
  'Firebase web app config is missing. Add the VITE_FIREBASE_* values in .env.local or use the local demo workspace.';

const firebaseConfig = isFirebaseConfigured
  ? rawFirebaseConfig
  : {
      apiKey: 'demo-api-key',
      authDomain: 'demo.moneytrack.local',
      projectId: 'moneytrack-demo-local',
      storageBucket: 'moneytrack-demo-local.appspot.com',
      messagingSenderId: '0',
      appId: 'demo-app-id',
    };

export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

const canUsePersistentCache =
  typeof window !== 'undefined' &&
  typeof indexedDB !== 'undefined' &&
  typeof navigator !== 'undefined';

export const db = (() => {
  try {
    return initializeFirestore(firebaseApp, {
      ignoreUndefinedProperties: true,
      localCache: canUsePersistentCache
        ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
        : memoryLocalCache(),
    });
  } catch {
    return getFirestore(firebaseApp);
  }
})();

export const auth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({ prompt: 'select_account' });
