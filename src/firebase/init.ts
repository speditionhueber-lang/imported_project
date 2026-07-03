
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, setLogLevel } from 'firebase/firestore';

let firebaseApp: FirebaseApp;

// This function ensures Firebase is initialized only once.
function getFirebaseApp() {
  if (getApps().length === 0) {
    firebaseApp = initializeApp(firebaseConfig);
  } else {
    firebaseApp = getApp();
  }
  return firebaseApp;
}

export function initializeFirebase() {
  const app = getFirebaseApp();
  // Temporarily set log level to debug for more detailed error messages
  setLogLevel('debug');
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  
  return { firebaseApp: app, auth, firestore };
}
