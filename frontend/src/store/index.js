import { configureStore } from '@reduxjs/toolkit';
import sessionManagementReducer from './slices/sessionManagementSlice';

export const store = configureStore({
  reducer: {
    sessionManagement: sessionManagementReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        ignoredActionsPaths: ['meta.arg', 'payload.timestamp'],
        ignoredPaths: ['sessionManagement.activeSessions.startTime'],
      },
    }),
});