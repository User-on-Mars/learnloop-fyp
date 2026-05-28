import { authAPI } from '../api/client';
import { authService } from './auth';

const profileSyncState = {
  lastKey: null,
  inFlight: new Map()
};

const TERMINAL_ACCOUNT_STATUSES = ['deleted', 'banned', 'suspended'];

function getProfileSyncKey(user) {
  return [
    user.uid,
    user.email,
    user.displayName || '',
    user.emailVerified ? 'verified' : 'unverified'
  ].join('|');
}

// Bridge between Firebase auth and backend JWT
export const authBridge = {
  // Sync Firebase user profile to backend
  syncProfileToBackend: async (user) => {
    const syncKey = getProfileSyncKey(user);
    if (profileSyncState.lastKey === syncKey) {
      return null;
    }

    if (profileSyncState.inFlight.has(syncKey)) {
      return profileSyncState.inFlight.get(syncKey);
    }

    const syncPromise = (async () => {
      try {
        const response = await authAPI.syncProfile({
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0],
          firebaseUid: user.uid,
          emailVerified: user.emailVerified
        });
        profileSyncState.lastKey = syncKey;
        return response.data;
      } catch (error) {
        const accountStatus = error.response?.data?.accountStatus;
        if (error.response?.status === 403 && TERMINAL_ACCOUNT_STATUSES.includes(accountStatus)) {
          throw error;
        }
        if (error.code !== 'ERR_NETWORK') {
          console.error('Frontend profile sync failed:', error);
        }
        return null;
      } finally {
        profileSyncState.inFlight.delete(syncKey);
      }
    })();

    profileSyncState.inFlight.set(syncKey, syncPromise);
    return syncPromise;
  },

  // Register user in backend after Firebase signup
  registerInBackend: async (user) => {
    try {
      const userData = {
        name: user.displayName || user.email.split('@')[0],
        email: user.email,
        password: 'firebase_user_' + user.uid
      };

      await authAPI.register(userData);
    } catch (error) {
      if (error.response?.status === 409) {
        return await authBridge.loginToBackend(user);
      }
      throw error;
    }
  },

  // Login to backend and get JWT token
  loginToBackend: async (user) => {
    try {
      const loginData = {
        email: user.email,
        password: 'firebase_user_' + user.uid
      };

      const response = await authAPI.login(loginData);
      const token = response.data.token;

      authService.setToken(token);

      return token;
    } catch (error) {
      console.error('Backend login failed:', error);
      throw error;
    }
  },

  // Handle Firebase auth state change
  handleFirebaseAuth: async (user) => {
    if (user) {
      try {
        await authBridge.syncProfileToBackend(user);
        await authBridge.loginToBackend(user);
      } catch (error) {
        if (error.response?.status === 401) {
          await authBridge.registerInBackend(user);
          await authBridge.loginToBackend(user);
        } else {
          throw error;
        }
      }
    } else {
      authService.removeToken();
      profileSyncState.lastKey = null;
      profileSyncState.inFlight.clear();
    }
  }
};
