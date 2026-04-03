# Root Cause Analysis and Fix for "Unknown (you)" Issue

## The Problem
Leaderboard shows "Unknown (you)" even though sidebar shows "Naresh K.C."

## Root Cause (Found by Context Analysis)

The issue was a **data mismatch** in how User records are queried:

### Step 1: User Creation
- When user logs in, auth middleware creates User record with `firebaseUid` set ✅

### Step 2: Profile Sync (THE BUG)
- Frontend calls `/sync-profile` endpoint with email and displayName
- Backend updates the `name` field ✅
- **BUT** backend NEVER saves the `firebaseUid` ❌

### Step 3: Leaderboard Query (THE FAILURE)
- LeaderboardService queries: `User.findOne({ firebaseUid: entry.userId })`
- Since firebaseUid was never saved in Step 2, query returns null ❌
- displayName defaults to "Unknown" ❌

## The Fix

### Frontend Change (authBridge.js)
Send the Firebase UID along with email and displayName:

```javascript
const response = await authAPI.syncProfile({
  email: user.email,
  displayName: user.displayName || user.email.split('@')[0],
  firebaseUid: user.uid  // ← CRITICAL: Send the Firebase UID
});
```

### Backend Change (auth.js)
Save the firebaseUid when syncing profile:

```javascript
user = await User.create({
  name,
  email,
  firebaseUid,  // ← CRITICAL: Save the Firebase UID
  passwordHash: 'firebase-auth-user',
  role: 'user',
  accountStatus: 'active'
})
```

And update existing users:
```javascript
const updateData = {}
if (displayName && user.name !== displayName) {
  updateData.name = displayName
}
if (!user.firebaseUid) {
  updateData.firebaseUid = firebaseUid  // ← Set if missing
}
await User.updateOne({ email }, updateData)
```

## Why This Works

1. **Frontend sends firebaseUid** → Backend knows which Firebase user this is
2. **Backend saves firebaseUid** → User record now has the link to Firebase
3. **Leaderboard queries by firebaseUid** → Finds the User record
4. **User record has name** → Leaderboard displays correct name

## Data Flow After Fix

```
Firebase Login
    ↓
user.uid = "np03cs4a230012..."
user.displayName = "Naresh K.C."
    ↓
Frontend: syncProfileToBackend(user)
    ↓
POST /sync-profile {
  email: "user@example.com",
  displayName: "Naresh K.C.",
  firebaseUid: "np03cs4a230012..."
}
    ↓
Backend: Create/Update User {
  email: "user@example.com",
  name: "Naresh K.C.",
  firebaseUid: "np03cs4a230012..."
}
    ↓
Leaderboard Query: User.findOne({ firebaseUid: "np03cs4a230012..." })
    ↓
Returns: { name: "Naresh K.C.", ... }
    ↓
Leaderboard displays: "Naresh K.C." ✅
```

## Testing

1. Log in with your Firebase account
2. Check browser console for: `🔄 Frontend: Syncing profile for...`
3. Check backend logs for: `✅ User created: ... with firebaseUid: ...`
4. Navigate to Leaderboard
5. Your name should now appear instead of "Unknown"

## Why This Was Missed

The sync endpoint was created but didn't include the firebaseUid, creating an inconsistency:
- Auth middleware creates users WITH firebaseUid
- Sync endpoint creates users WITHOUT firebaseUid
- Leaderboard queries by firebaseUid
- Result: Sync-created users not found by leaderboard

The fix ensures consistency across all user creation paths.
