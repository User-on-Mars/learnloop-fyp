# Leaderboard "Unknown" - Debugging Steps

The sync is working (200 OK), but leaderboard still shows "Unknown". This means the data is being synced but the query is not finding it.

## Step 1: Check Backend Logs

After logging in, check your backend console for logs like:

```
✅ Frontend: Profile sync successful
🔄 Syncing profile for user@example.com (uid: np03cs4a230012...) with name: Naresh K.C.
✅ User created: 507f1f77bcf41cd789439011 with firebaseUid: np03cs4a230012...
✅ Leaderboard cache cleared
```

**If you see these logs**: The sync is working correctly.

## Step 2: Run Debug Script

Run the debug script to check what's actually in the database:

```bash
node backend/scripts/debugLeaderboard.js
```

This will show:
- All users in the database
- Their email, name, and firebaseUid
- Which users have XP profiles
- Whether the firebaseUid matches

**Expected output:**
```
📋 All Users in Database:
Found 2 users:

1. Email: user@example.com
   Name: Naresh K.C.
   FirebaseUid: np03cs4a230012...

📊 XP Profiles with Weekly XP > 0:
Found 2 profiles:

UserId: np03cs4a230012...
Weekly XP: 20
✅ Found User: user@example.com (name: Naresh K.C.)
```

## Step 3: Check Leaderboard Response

In browser DevTools, check the leaderboard API response:

1. Open DevTools (F12)
2. Go to Network tab
3. Look for GET `/api/leaderboard/weekly`
4. Check the Response tab
5. Look for your entry - should show your name, not "Unknown"

**Expected:**
```json
{
  "entries": [
    {
      "userId": "np03cs4a230012...",
      "displayName": "Naresh K.C.",
      "weeklyXp": 20,
      "rank": 1
    }
  ]
}
```

## Step 4: Clear Cache Manually

If the debug script shows correct data but leaderboard still shows "Unknown", the cache might be stale.

**Option A: Restart Backend**
```bash
# Stop and restart your backend server
# This clears all caches
```

**Option B: Call Cache Clear Endpoint**
```bash
curl -X POST http://localhost:4000/api/leaderboard/clear-cache \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

Then refresh the leaderboard page.

## Step 5: Check Backend Logs During Leaderboard Query

When you navigate to the leaderboard, check backend console for logs like:

```
✅ Found user by firebaseUid np03cs4a230012...: Naresh K.C.
```

or

```
❌ No user found for firebaseUid: np03cs4a230012...
```

**If you see ❌**: The firebaseUid is not being saved or doesn't match.

## Common Issues & Solutions

### Issue: Debug script shows firebaseUid is empty
**Solution**: 
- The sync endpoint is not saving firebaseUid
- Check that frontend is sending `firebaseUid: user.uid`
- Check backend logs for sync errors

### Issue: Debug script shows firebaseUid but leaderboard still shows "Unknown"
**Solution**:
- Cache is stale - restart backend or call cache clear endpoint
- Or there's a mismatch between userId in XpProfile and firebaseUid in User

### Issue: Debug script shows user not found
**Solution**:
- User record was never created
- Check if sync endpoint was called (check frontend logs)
- Check if sync endpoint returned 200 OK

## What to Check

1. **Frontend Console**: Look for sync logs
2. **Backend Console**: Look for sync and query logs
3. **Debug Script**: Check database contents
4. **Network Tab**: Check API responses
5. **Backend Logs**: Check query logs during leaderboard load

## If Still Not Working

1. Restart backend server completely
2. Run debug script to verify database state
3. Check all console logs (frontend and backend)
4. Verify firebaseUid is being sent from frontend
5. Verify firebaseUid is being saved in backend

## Quick Test

1. Log in
2. Check frontend console for: `✅ Frontend: Profile sync successful`
3. Check backend console for: `✅ User created: ... with firebaseUid: ...`
4. Run: `node backend/scripts/debugLeaderboard.js`
5. Verify firebaseUid is set in database
6. Refresh leaderboard
7. Should now show your name
