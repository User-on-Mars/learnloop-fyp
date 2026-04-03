// src/useAuth.js
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase.js";
import { authBridge } from "./services/authBridge.js";

// listens for Firebase auth state changes
export function useAuth() {
  const [user, setUser] = useState(undefined); // undefined = loading

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Sync Firebase profile to backend when user logs in
        try {
          await authBridge.syncProfileToBackend(currentUser);
        } catch (error) {
          console.error('Failed to sync profile:', error);
          // Continue anyway - don't block auth
        }
      }
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  return user; // null = logged out, object = logged in
}
