# Leaderboard Username Debug Guide

## Issue
Leaderboard still shows "Unknown (you)" instead of the user's display name.

## What Was Fixed

### 1. Frontend Changes
- **useAuth.js**: Now calls `authBridge.syncProfileToBackend()` when user logs in
- **authBridge.js**: Added `syncProfileToBackend()` method to sync Firebase profile
- **api.js**: Added `syncProfile` endpoint to authAPI

### 2. Backend Changes
- **auth.js**: Added `/auth/sync-profile` endpoint to sync and save display name
- **LeaderboardService.js**: Added `clearCache()` method to invalidate stale cache
- **auth.js**: Now clears leaderboard cache when profile is synced

## How to Debug

### Step 1: Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for logs like:
   - `Profile sync failed: ...` (if sync failed)
   - Check if there are any network errors

### Step 2: Check Network Requests
1. Open DevTools Network tab
2. Look for POST request to `/api/auth/sync-profile`
3. Check:
   - Request payload includes `email` and `displayName`
   - Response status is 200
   - Response includes `{ ok: true, user: { email, name } }`

### Step 3: Check Backend Logs
1. Look at backend console output
2. Should see logs like:
   - `📝 Auto-created User record for Firebase user: ...`
   - Or update confirmation

### Step 4: Check Database
1. Connect to MongoDB
2. Query the User collection:
   ```javascript
   db.users.findOne({ email: "your-email@example.com" })
   ```
3. Verify the `name` field is populated with the display name

### Step 5: Check Leaderboard Data
1. In browser console, check the leaderboard API response:
   ```javascript
   // After navigating to leaderboard
   // The entries should have displayName populated
   ```

## Common Issues & Solutions

### Issue: displayName is undefined in Firebase
**Solution**: 
- Ensure user set a display name during signup
- Check Firebase console to verify displayName is saved
- For Google sign-in, ensure profile scope is requested

### Issue: Sync endpoint returns 400
**Solution**:
- Check that email is being sent in request body
- Verify displayName is not empty
- Check backend logs for specific error message

### Issue: Cache not clearing
**Solution**:
- Verify Redis/cache service is running
- Check if `cacheService.isAvailable()` returns true
- Manually clear cache by restarting backend

### Issue: User record not created
**Solution**:
- Check if email already exists in database
- Verify User model has `name` field
- Check for database connection issues

## Testing Steps

1. **Fresh signup with display name**:
   - Sign up with email and set display name
   - Check browser console for sync logs
   - Navigate to leaderboard
   - Verify name appears (not "Unknown")

2. **Existing user**:
   - Log in with existing account
   - Check if sync is called
   - Verify name is updated if it was empty

3. **Google sign-in**:
   - Sign in with Google
   - Verify displayName is captured from Google profile
   - Check leaderboard shows correct name

## Performance Notes

- Sync happens on every login (non-blocking)
- Cache is cleared immediately after sync
- Leaderboard queries will fetch fresh data
- Cache repopulates after first query (5-minute TTL)

## Next Steps if Still Not Working

1. Add console.log statements in syncProfileToBackend()
2. Add console.log in backend /sync-profile endpoint
3. Verify User.updateOne() is actually updating the database
4. Check if there's a race condition between sync and leaderboard query
5. Consider adding a small delay before leaderboard query
