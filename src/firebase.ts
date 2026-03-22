import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Import the Firebase configuration
import firebaseConfig from '../firebase-applet-config.json';

// Helper to pick the best config value (Env Var > JSON Config)
const getVal = (keyName: string, envVal: string | undefined, jsonVal: string) => {
  const isEnv = (envVal && envVal.trim() !== "");
  const finalVal = isEnv ? envVal : jsonVal;
  
  if (keyName === "apiKey") {
    console.log(`[Firebase] Using ${isEnv ? "Environment Variable" : "JSON Config"} for ${keyName}`);
  }
  
  return finalVal;
};

// Initialize Firebase SDK
const config = {
  apiKey: getVal("apiKey", import.meta.env.VITE_FIREBASE_API_KEY, firebaseConfig.apiKey),
  authDomain: getVal("authDomain", import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, firebaseConfig.authDomain),
  projectId: getVal("projectId", import.meta.env.VITE_FIREBASE_PROJECT_ID, firebaseConfig.projectId),
  storageBucket: getVal("storageBucket", import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, firebaseConfig.storageBucket),
  messagingSenderId: getVal("messagingSenderId", import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, firebaseConfig.messagingSenderId),
  appId: getVal("appId", import.meta.env.VITE_FIREBASE_APP_ID, firebaseConfig.appId),
  measurementId: getVal("measurementId", import.meta.env.VITE_FIREBASE_MEASUREMENT_ID, firebaseConfig.measurementId),
  firestoreDatabaseId: getVal("firestoreDatabaseId", import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID, firebaseConfig.firestoreDatabaseId)
};

const app = initializeApp(config);

// Initialize Firestore with the database ID if provided
export const db = getFirestore(app, config.firestoreDatabaseId);
export const auth = getAuth();
