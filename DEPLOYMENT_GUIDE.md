# XP System Deployment Guide

## Prerequisites
- MongoDB database access
- Node.js environment
- Admin access to the application

## Deployment Steps

### 1. Database Initialization

Run the XP settings initialization script to create the default configuration:

```bash
cd backend
npm run init:xp-settings
```

This will create the XpSettings document with default values:
- Reflection XP: 20
- Practice XP per Minute: 2
- 5-Day Streak Multiplier: 2x
- 7+ Day Streak Multiplier: 5x

**Note:** This script is safe to run multiple times. If settings already exist, it will display current values without creating duplicates.

### 2. Backend Deployment

Deploy the updated backend code:

```bash
cd backend
npm install  # Install any new dependencies
npm start    # Start the server
```

Verify the server starts without errors and check logs for:
- ✅ MongoDB connection successful
- ✅ Server listening on port

### 3. Frontend Deployment

Deploy the updated frontend code:

```bash
cd frontend
npm install  # Install any new dependencies
npm run build
# Deploy build folder to your hosting service
```

### 4. Verification

#### Test XP Award Flow

1. **Test Practice XP:**
   ```bash
   # Log a practice session via API or UI
   # Expected: Immediate XP award (minutes × 2 XP/min)
   # Example: 10 minutes = 20 XP base
   ```

2. **Test Reflection XP:**
   ```bash
   # Create a reflection via API or UI
   # Expected: Immediate XP award (20 XP base)
   # Second reflection same day: No XP (daily cap)
   ```

3. **Test Streak Multipliers:**
   ```bash
   # User with 5-day streak logs practice
   # Expected: Base XP × 2
   
   # User with 7+ day streak writes reflection
   # Expected: Base XP × 5
   ```

#### Test Admin Settings

1. Log in as admin user
2. Navigate to Admin Settings page
3. Click "Edit XP Settings"
4. Modify values and save
5. Verify changes apply immediately to new XP awards

### 5. Monitor

Check the following after deployment:

- **XP Transactions:** Verify new transactions have correct source types
  ```javascript
  db.xptransactions.find().sort({createdAt: -1}).limit(10)
  // Should see source: 'practice' or 'reflection'
  ```

- **Leaderboard:** Verify rankings update correctly
- **Admin Audit Log:** Check XP settings changes are logged
- **Error Logs:** Monitor for any XP-related errors

## Rollback Plan

If issues occur, you can rollback:

1. **Revert Code:**
   ```bash
   git revert <commit-hash>
   ```

2. **XP Transactions:** Old transactions remain valid, no data loss

3. **Settings:** Reset to defaults via MongoDB:
   ```javascript
   db.xpsettings.updateOne(
     {},
     {
       $set: {
         reflectionXp: 20,
         practiceXpPerMinute: 2,
         streak5DayMultiplier: 2,
         streak7DayMultiplier: 5
       }
     }
   )
   ```

## Post-Deployment

### Communicate Changes to Users

Notify users about the new XP system:

**Key Points:**
- ✅ XP awarded immediately for practice and reflections
- ✅ Practice: 2 XP per minute (configurable)
- ✅ Reflection: 20 XP daily (configurable)
- ✅ Streak bonuses: 2x at 5 days, 5x at 7+ days
- ❌ No more XP for skill map completion
- ❌ No more XP for session completion

### Admin Training

Train admins on new settings:
1. Access Admin Settings page
2. Locate "XP Reward Settings" card
3. Click "Edit XP Settings"
4. Adjust values within allowed ranges
5. Save changes (logged in audit log)

### Monitor Metrics

Track these metrics post-deployment:
- Average XP per user per day
- Streak maintenance rates
- Leaderboard activity
- User engagement with practice/reflection features

## Troubleshooting

### Issue: XP not awarded for practice
**Solution:** Check that XpSettings document exists:
```bash
npm run init:xp-settings
```

### Issue: Multiplier not applying
**Solution:** Verify user's current streak:
```javascript
db.userstreaks.findOne({userId: "USER_ID"})
```

### Issue: Admin can't update settings
**Solution:** Verify admin role and check browser console for errors

### Issue: Old XP transactions causing issues
**Solution:** Old transactions are compatible. If needed, filter by date:
```javascript
db.xptransactions.find({
  createdAt: {$gte: new Date('2026-04-10')}
})
```

## Support

For issues or questions:
1. Check application logs
2. Review XP_SYSTEM_CHANGES.md for technical details
3. Contact development team

## Maintenance

### Regular Tasks
- Monitor XP settings for balance
- Review leaderboard rankings weekly
- Check admin audit log for setting changes
- Analyze user engagement metrics

### Periodic Reviews
- Quarterly: Review XP values for game balance
- Monthly: Check streak multiplier effectiveness
- Weekly: Monitor leaderboard activity
