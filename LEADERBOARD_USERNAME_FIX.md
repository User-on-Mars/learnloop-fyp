# Leaderboard Username Fix

## Problem
The leaderboard was showing "Unknown (you)" instead of the user's actual display name.

## Root Cause
Firebase users (those who sign up with email/password or Google) weren't having their display names saved to the backend User database. The leaderboard queries the User model for the `name` field, which was empty or missing.

## Solution

### Backend Changes

1. **Updated `/auth/register` endpoint** (`backend/src/routes/auth.js`)
   - Now updates the user's name if they already exist but don't have a name set
   - Ensures display name is preserved even if user already exists

2. **Added `/auth/sync-profile` endpoint** (`backend/src/routes/auth.js`)
   - New endpoint to sync Firebase user profile data to backend
   - Accepts `email` and `displayName` from frontend
   - Creates or updates User record with the display name
   - Called after Firebase authentication to ensure data is synced

### Frontend Changes

1. **Updated `authBridge.js`** (`frontend/src/services/authBridge.js`)
   - Added `syncProfileToBackend()` method
   - Calls the new `/auth/sync-profile` endpoint after Firebase auth
   - Syncs display name before attempting login/registration
   - Non-critical - doesn't block auth flow if sync fails

2. **Updated `api.js`** (`frontend/src/services/api.js`)
   - Added `syncProfile` method to `authAPI`
   - Provides clean interface to call the sync endpoint

### How It Works

1. User signs up/logs in with Firebase
2. Frontend receives Firebase user object with `displayName`
3. Frontend calls `authBridge.syncProfileToBackend(user)`
4. Backend creates/updates User record with display name
5. Leaderboard queries now find the correct display name
6. User sees their actual name instead of "Unknown"

## Benefits

- ✅ Users see their actual names on leaderboard
- ✅ Works for both email/password and Google sign-in
- ✅ Non-blocking - auth continues even if sync fails
- ✅ Handles existing users gracefully
- ✅ Preserves display names on subsequent logins

## Testing

1. Sign up with a new Firebase account with a display name
2. Navigate to Leaderboard
3. Verify your name appears instead of "Unknown"
4. Check that the name persists across sessions
