import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { firebaseConfig, isFirebaseConfigured } from "./firebase/config";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

function initFirebase(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* variables to client/.env.local (see .env.local.example)."
    );
  }

  if (!app) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  }

  return app;
}

/** Lazily initialized Auth instance */
export function getFirebaseAuth(): Auth {
  initFirebase();
  return auth!;
}

/** Lazily initialized Firestore */
export function getFirebaseDb(): Firestore {
  initFirebase();
  return db!;
}

/** Lazily initialized Storage */
export function getFirebaseStorage(): FirebaseStorage {
  initFirebase();
  return storage!;
}

export { isFirebaseConfigured };

// Legacy named exports for existing imports
export { getFirebaseAuth as auth, getFirebaseDb as db, getFirebaseStorage as storage };
