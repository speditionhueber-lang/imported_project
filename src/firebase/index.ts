
import { initializeFirebase } from '@/firebase/init'; // Re-export from the new file
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';


// This function ensures Firebase is initialized only once.
function getFirebaseApp() {
  let firebaseApp: FirebaseApp;
  if (getApps().length === 0) {
    firebaseApp = initializeApp(initializeFirebase().firebaseApp.options);
  } else {
    firebaseApp = getApp();
  }
  return firebaseApp;
}

// Keep this export for other parts of the app that might use it server-side.
export { initializeFirebase };


export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
export * from './firestore/use-memo-firebase';
