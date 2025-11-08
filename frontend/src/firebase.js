// src/firebase.js
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";

// ⚙️ Replace these with your actual Firebase config from Firebase Console → Project Settings → Web App
const firebaseConfig = {
  apiKey: "AIzaSyDJxbmfoHA0Rc1Mqj5CA7G0zV0kwx7B_uY",
  authDomain: "learnloop-ab17a.firebaseapp.com",
  projectId: "learnloop-ab17a",
  appId: "1:251484257905:web:e8c9a778cfb7c1aa7ca5d0",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// make sure login persists
setPersistence(auth, browserLocalPersistence);

// helper: one-click Google sign-in
export async function signInWithGoogle() {
  try {
    const res = await signInWithPopup(auth, googleProvider);
    return res.user;
  } catch (err) {
    console.error("Google sign-in error", err);
    throw err;
  }
}

