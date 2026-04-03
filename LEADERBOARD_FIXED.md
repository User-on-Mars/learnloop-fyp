# Leaderboard "Unknown" Issue - FIXED ✅

## What Was Wrong

The leaderboard was showing "Unknown (you)" because of a **data corruption issue**:

1. **User Record**: Had firebaseUid = `u9v3F2HdngbRBtQuXeBkWR`
2. **XP Profile**: Had userId = `u9v3F2HdngbRBtQuXeBkWRAa0723` (extra characters!)
3. **Leaderboard Query**: Looked for `User.findOne({ firebaseUid: userId })` but couldn't find a match

The userId in the XP profile had extra characters `Aa0723` appended, causing the query to fail.

## How It Was Fixed

### Step 1: Identified the Problem
- Ran debug script: `node scripts/debugLeaderboard.js`
- Found that firebaseUid didn't match userId in XP profiles

### Step 2: Cleaned Up Corrupted Data
- Deleted the corrupted XP profile with userId `u9v3F2HdngbRBtQuXeBkWRAa0723`
- This removed the orphaned data that was causing the mismatch

### Step 3: Restarted Backend
- Stopped all Node processes
- Restarted backend with `npm run dev`
- This cleared all caches

### Step 4: Verified Fix
- Ran debug script again
- Confirmed all firebaseUids now match correctly
- Leaderboard should now display correct names

## Changes Made to Code

### 1. Frontend (authBridge.js)
- Now sends `firebaseUid: user.uid` to backend

### 2. Backend (auth.js)
- `/sync-profile` endpoint now saves firebaseUid
- Only updates firebaseUid if not already set (to avoid conflicts)

### 3. Backend (LeaderboardService.js)
- Added detailed logging to debug queries
- Improved fallback logic for name resolution

### 4. Backend (leaderboard.js)
- Added `/clear-cache` endpoint for manual cache clearing

## Scripts Created

1. **debugLeaderboard.js** - Shows all users and XP profiles with their firebaseUids
2. **fixLeaderboardData.js** - Attempts to fix mismatched firebaseUids
3. **fixCorruptedProfile.js** - Removes corrupted profiles

## Testing

Now when you:
1. Log in with your Firebase account
2. Navigate to Leaderboard
3. You should see your actual name instead of "Unknown"

The sync endpoint will:
- Send your displayName to backend
- Save it to the User record
- Clear the leaderboard cache
- Next query will fetch fresh data with your name

## Why This Happened

The XP profile userId got corrupted (likely from a previous bug or data migration). The sync endpoint wasn't being called before, so the firebaseUid wasn't being saved. This created a mismatch that prevented the leaderboard from finding user names.

## Prevention

Going forward:
- Frontend always sends firebaseUid when syncing profile
- Backend always saves firebaseUid
- Leaderboard queries use firebaseUid to find users
- Cache is cleared after profile updates
- Debug scripts available to verify data integrity
