import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, initializeFirestore, persistentLocalCache } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from './firebase-applet-config.json';

const isNew = getApps().length === 0;
const app = isNew ? initializeApp(firebaseConfig) : getApp();

const cfg = firebaseConfig as any;
// Initialize Firestore with the database ID if present in the config, otherwise default
const firestoreOptions = {
    ...(cfg.firestoreDatabaseId ? { databaseId: cfg.firestoreDatabaseId } : {}),
    experimentalForceLongPolling: true,
    localCache: persistentLocalCache()
};

// Use getFirestore if already initialized, else initializeFirestore
export const db = isNew ? initializeFirestore(app, firestoreOptions as any) : getFirestore(app, cfg.firestoreDatabaseId);

export const auth = getAuth(app);
