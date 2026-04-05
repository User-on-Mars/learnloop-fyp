import { authAPI } from '../api/client';
import { authService } from './auth';

// Bridge between Firebase auth and backend JWT
export const authBridge = {
  // Sync Firebase user profile to backend
  syncProfileToBackend: async (user) => {
    try {
      console.log(`🔄 Frontend: Syncing profile for ${user.email} with displayName: ${user.displayName}`);
      const response = await authAPI.syncProfile({
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0],
        firebaseUid: user.uid  // CRITICAL: Send the Firebase UID
      });
      console.log(`✅ Frontend: Profile sync successful`, response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Frontend: Profile sync failed:', error);
      // Don't throw - this is non-critical
      return null;
    }
  },

  // Register user in backend after Firebase signup
  registerInBackend: async (user) => {
    try {
      const userData = {
        name: user.displayName || user.email.split('@')[0],
        email: user.email,
        password: 'firebase_user_' + user.uid // Placeholder password for Firebase users
      };
      
      await authAPI.register(userData);
    } catch (error) {
      // User might already exist in backend, try to login
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
      
      // Store JWT token for API calls
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
        // Sync profile first to ensure display name is saved
        await authBridge.syncProfileToBackend(user);
        
        // Then try to login, if that fails, register
        await authBridge.loginToBackend(user);
      } catch (error) {
        if (error.response?.status === 401) {
          // User doesn't exist in backend, register them
          await authBridge.registerInBackend(user);
          await authBridge.loginToBackend(user);
        } else {
          throw error;
        }
      }
    } else {
      // User logged out, remove JWT token
      authService.removeToken();
    }
  }
};