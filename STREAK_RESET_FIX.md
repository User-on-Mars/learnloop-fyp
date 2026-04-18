# Streak Reset Fix

## Problem
Streaks were not automatically resetting when users missed days. The streak counter would remain at its previous value until the user completed another session, at which point it would reset to 1. This meant:

- A user with a 10-day streak who missed 5 days would still see "10 days" until they logged in again
- Leaderboards showed inaccurate streak data
- Users couldn't see their streak had broken until they returned

## Root Cause
The original implementation only updated streaks when `StreakService.processSession()` was called (during session completion). There was no background process to check for expired streaks and reset them to 0.

## Solution
Implemented a two-part solution:

### 1. Real-time Streak Validation
Modified `StreakService.getStreak()` to automatically check if a streak has expired when it's retrieved:
- Calculates days since last practice
- If more than 1 day has passed, immediately resets streak to 0
- Ensures users always see accurate streak data when viewing their profile

### 2. Daily Scheduled Reset
Created `DailyStreakResetScheduler` that runs every day at midnight UTC:
- Bulk updates all expired streaks in the database
- Keeps leaderboard data accurate
- Logs reset operations for monitoring
- Runs independently of user activity

## Changes Made

### Modified Files
1. **backend/src/services/StreakService.js**
   - Enhanced `getStreak()` to validate and reset expired streaks on-the-fly
   - Added `resetExpiredStreaks()` method for bulk reset operations

2. **backend/src/server.js**
   - Imported `DailyStreakResetScheduler`
   - Started scheduler on server startup
   - Added graceful shutdown handling for the scheduler

### New Files
1. **backend/src/services/DailyStreakResetScheduler.js**
   - Scheduler that runs daily at midnight UTC
   - Calls `StreakService.resetExpiredStreaks()`
   - Logs success/failure events

2. **backend/scripts/resetExpiredStreaks.js**
   - Manual script to reset expired streaks immediately
   - Useful for testing and one-time cleanup
   - Run with: `node backend/scripts/resetExpiredStreaks.js`

## How It Works

### Streak Lifecycle
1. **User completes session**: `processSession()` increments or resets streak
2. **User views profile**: `getStreak()` validates streak is still active
3. **Daily at midnight UTC**: Scheduler resets all expired streaks in bulk
4. **User returns after gap**: Sees accurate 0-day streak, next session starts at 1

### Streak States
- **Active (1+ days)**: Last practice was today or yesterday
- **Expired (0 days)**: Last practice was 2+ days ago
- **New (1 day)**: First session after a break

## Testing

### Manual Testing
1. Run the reset script:
   ```bash
   node backend/scripts/resetExpiredStreaks.js
   ```

2. Check the output for number of streaks reset

3. Verify in the database or frontend that expired streaks now show 0

### Automated Testing
The scheduler will run automatically:
- First run: At next midnight UTC
- Subsequent runs: Every 24 hours

Check server logs for:
```
⏰ Daily streak reset scheduled — next run: [timestamp]
✅ Daily streak reset completed — X streaks reset
```

## Deployment Notes

### Server Restart Required
After deploying these changes, restart the backend server to:
- Initialize the new scheduler
- Start the daily reset process

### Initial Cleanup
Run the manual reset script once after deployment to clean up any existing expired streaks:
```bash
node backend/scripts/resetExpiredStreaks.js
```

### Monitoring
Watch for these log events:
- `daily_streak_reset_started` - Scheduler triggered
- `daily_streak_reset_success` - Reset completed with count
- `DAILY_STREAK_RESET_FAILED` - Error occurred (investigate)

## Impact

### User Experience
- ✅ Accurate streak display at all times
- ✅ No confusion about broken streaks
- ✅ Immediate feedback when viewing profile

### System Performance
- ✅ Minimal overhead (runs once per day)
- ✅ Efficient bulk update query
- ✅ No impact on session completion flow

### Data Integrity
- ✅ Leaderboards show accurate data
- ✅ Streak multipliers apply correctly
- ✅ Historical data preserved (lastPracticeDate retained)

## Future Enhancements
Consider adding:
- Streak freeze/protection feature (allow 1 missed day)
- Streak recovery notifications
- Streak milestone achievements
- Weekly streak reports
