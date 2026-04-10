# XP System Modifications - Implementation Summary

## Overview
Comprehensive overhaul of the XP and leaderboard system with configurable admin settings, new streak multipliers, and immediate XP rewards.

## Key Changes

### 1. XP Sources (Modified)
- **Daily Reflection**: 20 XP (default, admin configurable)
  - Awarded immediately when reflection is created
  - Daily cap: 1 reflection XP per UTC day
  
- **Practice Time**: 2 XP per minute (default, admin configurable)
  - Awarded immediately when practice session is logged
  - No daily cap - users get XP for every minute practiced
  - Example: 10 minutes practice = 20 XP base
  
- **Skill Map Completion**: REMOVED (no longer awards XP)
  
- **Session Completion**: REMOVED (no longer awards XP)

### 2. Streak Multiplier System (New)
- **5-Day Streak**: 2x multiplier (default, admin configurable)
- **7+ Day Streak**: 5x multiplier (default, admin configurable)
- **Streak Loss**: Multiplier resets to 1x when streak breaks
- **Streak Maintenance**: User must rebuild streak to regain multiplier

**Example:**
- User with 7-day streak writes reflection (20 XP base)
- With 5x multiplier: 20 × 5 = 100 XP awarded
- User with 5-day streak practices 10 minutes (20 XP base)
- With 2x multiplier: 20 × 2 = 40 XP awarded

### 3. Admin Configuration Panel
New admin settings interface allows real-time adjustment of:
- `reflectionXp`: 0-1000 (default: 20)
- `practiceXpPerMinute`: 0-100 (default: 2)
- `streak5DayMultiplier`: 1-10 (default: 2)
- `streak7DayMultiplier`: 1-10 (default: 5)

All changes are logged in admin audit log.

### 4. Immediate XP Award
- XP is awarded **immediately** when task completes
- Practice: XP awarded when practice session is logged
- Reflection: XP awarded when reflection is created
- Leaderboard updates in real-time (with 5-minute cache)

## Technical Implementation

### New Files
1. **`backend/src/models/XpSettings.js`**
   - Singleton model for admin-configurable XP values
   - Methods: `getSettings()`, `updateSettings()`

### Modified Files

#### Backend
1. **`backend/src/models/XpTransaction.js`**
   - Updated source enum: `['practice', 'reflection', 'admin_adjustment']`
   - Removed: `session_completion`, `streak_bonus`, `skillmap_completion`
   - Changed multiplier from enum to min:1 (supports decimal multipliers)

2. **`backend/src/services/XpService.js`**
   - Imports `XpSettings` model
   - `awardXp()` now uses configurable XP values
   - Applies 5-day (2x) or 7-day (5x) multipliers based on streak
   - Removed daily cap for practice XP
   - `getProfile()` returns `activeMultiplier` value

3. **`backend/src/routes/practice.js`**
   - Imports `XpService` and `XpSettings`
   - Awards XP immediately on practice creation
   - XP = `minutesPracticed × practiceXpPerMinute × streakMultiplier`
   - Returns `xpAwarded` object in response

4. **`backend/src/routes/reflections.js`**
   - Imports `XpSettings`
   - Awards configurable reflection XP immediately
   - Daily cap enforced (1 reflection XP per UTC day)
   - Returns `xpAwarded` object in response

5. **`backend/src/controllers/sessionController.js`**
   - Removed XP awarding from session completion
   - Still processes streak for session completion
   - No longer returns `xpAwarded` in response

6. **`backend/src/routes/admin.js`**
   - New endpoint: `GET /admin/xp-settings`
   - New endpoint: `PUT /admin/xp-settings`
   - Validates XP setting ranges
   - Logs changes to audit log

#### Frontend
1. **`frontend/src/pages/admin/AdminSettings.jsx`**
   - New XP Settings card with editable fields
   - Fetches current settings on mount
   - Edit mode with save/cancel buttons
   - Real-time validation and error handling
   - Success/error messages with auto-dismiss

## Database Schema

### XpSettings Collection (New)
```javascript
{
  reflectionXp: Number (0-1000, default: 20),
  practiceXpPerMinute: Number (0-100, default: 2),
  streak5DayMultiplier: Number (1-10, default: 2),
  streak7DayMultiplier: Number (1-10, default: 5),
  createdAt: Date,
  updatedAt: Date
}
```

### XpTransaction Collection (Modified)
```javascript
{
  userId: String,
  source: 'practice' | 'reflection' | 'admin_adjustment',
  baseAmount: Number (min: 0),
  multiplier: Number (min: 1),
  finalAmount: Number (min: 0),
  referenceId: String (practiceId or reflectionId),
  metadata: {
    streakDays: Number,
    minutesPracticed: Number (for practice),
    skillName: String (for practice)
  },
  createdAt: Date,
  updatedAt: Date
}
```

## API Endpoints

### New Endpoints
- `GET /admin/xp-settings` - Get current XP settings
- `PUT /admin/xp-settings` - Update XP settings (admin only)

### Modified Endpoints
- `POST /api/practice` - Now returns `xpAwarded` object
- `POST /api/reflections` - Now returns `xpAwarded` object
- `POST /sessions/:id/complete` - No longer returns `xpAwarded`

## Migration Notes

### Existing Data
- Old XP transactions remain valid
- Old source types (`session_completion`, `skillmap_completion`) still in database
- Total XP calculations include all historical transactions
- No data migration required

### Backward Compatibility
- Leaderboard continues to work with mixed transaction types
- XP profile calculations aggregate all sources
- Weekly reset functionality unchanged

## Testing Recommendations

1. **XP Award Flow**
   - Create practice session → verify XP awarded immediately
   - Create reflection → verify XP awarded immediately
   - Check daily reflection cap (2nd reflection same day = no XP)

2. **Streak Multipliers**
   - Test 5-day streak → verify 2x multiplier
   - Test 7-day streak → verify 5x multiplier
   - Break streak → verify multiplier resets to 1x

3. **Admin Settings**
   - Update XP values → verify changes apply immediately
   - Test validation (negative values, out of range)
   - Verify audit log entries

4. **Leaderboard**
   - Verify real-time updates (within 5-minute cache)
   - Check ranking with new XP sources
   - Test weekly reset functionality

## Future Enhancements

Potential additions:
- Bonus XP events (double XP weekends)
- Achievement-based XP bonuses
- Skill-specific XP multipliers
- XP decay for inactive users
- Custom XP formulas per user tier
