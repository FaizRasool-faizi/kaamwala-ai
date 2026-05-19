import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBe1kznN1vVN1CaoA88Uaq35EOERSvUZk4",
  authDomain: "ai-sales-engine-490611.firebaseapp.com",
  projectId: "ai-sales-engine-490611",
  storageBucket: "ai-sales-engine-490611.firebasestorage.app",
  messagingSenderId: "711374931404",
  appId: "1:711374931404:web:11d3edbff1bef94b7c0969",
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
