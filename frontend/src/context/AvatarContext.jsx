import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { auth } from "../firebase";
import { authAPI } from "../api/client";
import { generateAvatar } from "../data/avatars";

const AvatarContext = createContext({ customAvatar: null, avatarUrl: null, setCustomAvatar: () => {}, refreshAvatar: () => {} });

/**
 * Provides the user's custom avatar across the app.
 * Stores the avatar ID (e.g. "cat-2e5023") and generates the SVG data URI from it.
 */
export function AvatarProvider({ children }) {
  const [customAvatar, setCustomAvatarState] = useState(null); // avatar ID string
  const [avatarUrl, setAvatarUrl] = useState(null); // SVG data URI

  // Convert avatar ID to SVG data URI
  const resolveAvatarUrl = useCallback((avatarId) => {
    if (!avatarId) {
      setAvatarUrl(null);
      return;
    }
    const match = avatarId.match(/^(\w+)-([\da-f]{6})$/i);
    if (match) {
      const svg = generateAvatar(match[1], `#${match[2]}`);
      setAvatarUrl(svg);
    }
  }, []);

  // Load avatar from backend on mount
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user?.email) {
        try {
          const res = await authAPI.getAvatar(user.email);
          const avatar = res.data?.avatar || null;
          setCustomAvatarState(avatar);
          resolveAvatarUrl(avatar);
        } catch (err) {
          console.warn('Could not load avatar:', err);
        }
      } else {
        setCustomAvatarState(null);
        setAvatarUrl(null);
      }
    });
    return () => unsubscribe();
  }, [resolveAvatarUrl]);

  const setCustomAvatar = useCallback(async (avatarId) => {
    const email = auth.currentUser?.email;
    if (!email) return;

    try {
      await authAPI.updateAvatar(email, avatarId);
      setCustomAvatarState(avatarId);
      resolveAvatarUrl(avatarId);
    } catch (err) {
      console.error('Failed to save avatar:', err);
      throw err;
    }
  }, [resolveAvatarUrl]);

  const refreshAvatar = useCallback(async () => {
    const email = auth.currentUser?.email;
    if (!email) return;
    try {
      const res = await authAPI.getAvatar(email);
      const avatar = res.data?.avatar || null;
      setCustomAvatarState(avatar);
      resolveAvatarUrl(avatar);
    } catch (err) {
      console.warn('Could not refresh avatar:', err);
    }
  }, [resolveAvatarUrl]);

  return (
    <AvatarContext.Provider value={{ customAvatar, avatarUrl, setCustomAvatar, refreshAvatar }}>
      {children}
    </AvatarContext.Provider>
  );
}

export function useCustomAvatar() {
  return useContext(AvatarContext);
}
