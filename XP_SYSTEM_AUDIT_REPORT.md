# XP System Audit Report

## Executive Summary

The XP counting system has **10 identified issues**, including **2 HIGH priority bugs** that allow users to earn XP unfairly:

1. **Session duration ambiguity** - Unclear if active time or total time is counted
2. **Streak bonus cap not enforced** - Users with long streaks earn unlimited bonus XP

## Critical Issues (HIGH PRIORITY)

### Issue #1: Session Duration Definition Ambiguity ⚠️ HIGH

**Location**: `backend/src/controllers/sessionController.js:234`

**Problem**:
```javascript
const minutesPracticed = (result.duration || 0) / 60;
if (minutesPracticed >= 10) {
  // Award XP
}
```

The code doesn't clarify if `result.duration` is:
- Total session time (including pauses) ❌ WRONG
- Active (non-paused) time only ✅ CORRECT

**Impact**: Users could start a session, pause for 50 minutes, practice 10 minutes, and get XP for 60 minutes total.

**Fix Needed**: Verify `SessionManager.completeSession()` returns active time only.

---

### Issue #2: Streak Bonus Cap Not Enforced ⚠️ HIGH

**Location**: `backend/src/controllers/sessionController.js:237`

**Problem**:
```javascript
await XpService.awardXp(userId, 'streak_bonus', 5 * streakResult.streakCount);
```

The streak bonus should be capped at 35 XP (5 × 7 days), but this passes uncapped value.

**Current Behavior**:
- 7-day streak: 5 × 7 = 35 XP ✅ Correct
- 100-day streak: 5 × 100 = 500 XP ❌ WRONG (should be 35)
- With 2× multiplier: 500 × 2 = 1000 XP ❌ MASSIVE EXPLOIT

**Fix**: Cap the bonus before passing to awardXp:
```javascript
await XpService.awardXp(userId, 'streak_bonus', Math.min(5 * streakResult.streakCount, 35));
```

---

## Medium Priority Issues

### Issue #3: Promotion/Relegation XP Checks Missing

**Location**: `backend/src/services/LeaderboardService.js:410-430`

**Problem**: Users are promoted/relegated based only on rank, not XP earned this week.

**Requirement**: 
- Only promote Silver users who earned ≥50 XP this week
- Only relegate Gold users who earned <50 XP this week

**Current**: Any top 3 Silver gets promoted regardless of activity.

---

### Issue #4: Weekly Reset Idempotency Missing

**Location**: `backend/src/services/LeaderboardService.js:380`

**Problem**: If server restarts on Monday 00:00 UTC, reset could run twice.

**Fix**: Check if `WeeklyResetHistory` exists for current week before running reset.

---

### Issue #5: Reflection XP Mood Requirement Unclear

**Location**: `backend/src/routes/reflections.js:55`

**Problem**: Code requires both mood AND content for XP:
```javascript
if (reflection.mood && reflection.content) {
  await XpService.awardXp(req.user.id, 'reflection', 20)
}
```

**Question**: Should mood be required, or just content?

---

## Low Priority Issues

### Issue #6: Active Time Calculation Unverified
- Need to verify `SessionManager.completeSession()` sums only active intervals

### Issue #7: Skill.fromTemplate Migration Missing
- Existing skills may not have `fromTemplate` field

### Issue #8: Profile Update Retry Logic Missing
- If profile update fails, transaction persists but profile doesn't update

### Issue #9: Leaderboard Tiebreaker N+1 Queries
- Performance issue: queries each tied user individually

### Issue #10: Cache Invalidation Missing
- Leaderboard cached for 5 minutes, but XP awards don't invalidate cache
- Users see stale rank for up to 5 minutes after earning XP

---

## XP System Flow (Current)

```
User completes session (≥10 min active time)
    ↓
SessionController.completeSession()
    ↓
StreakService.processSession() → Updates streak
    ↓
XpService.awardXp('session_completion', 10)
    ↓
XpService.awardXp('streak_bonus', 5 × streakCount) ← BUG: Not capped!
    ↓
XpService applies multiplier (×2 if streak ≥7, else ×1)
    ↓
XpTransaction created
    ↓
UserXpProfile updated (totalXp += finalAmount, weeklyXp += finalAmount)
    ↓
Frontend fetches /api/xp/profile
    ↓
XpProfileCard displays XP, rank, tier, streak
```

---

## XP Sources and Caps

| Source | Base XP | Daily Cap | Multiplier | Max/Day |
|--------|---------|-----------|-----------|---------|
| Session Completion | 10 | 1 | 1-2× | 20 |
| Reflection | 20 | 1 | 1-2× | 40 |
| Streak Bonus | 5×streak (capped 35) | 1 | 1-2× | 70 |
| Skill Map Completion | 200 | 1 per template | 1-2× | 400 |
| **Total Max/Day** | - | - | - | **530** |

---

## Recommendations

### Immediate (Today)
1. ✅ Fix streak bonus cap (Issue #2)
2. ✅ Verify session duration calculation (Issue #1)

### This Week
3. Add XP checks to promotion/relegation (Issue #3)
4. Add idempotency guard to weekly reset (Issue #4)
5. Clarify reflection mood requirement (Issue #5)

### Next Sprint
6. Add cache invalidation on XP award (Issue #10)
7. Optimize leaderboard tiebreaker queries (Issue #9)
8. Add profile update retry logic (Issue #8)

---

## Testing Checklist

- [ ] Verify session duration is active time only
- [ ] Test streak bonus caps at 35 XP
- [ ] Test 2× multiplier applies correctly
- [ ] Test daily caps are enforced
- [ ] Test promotion/relegation XP requirements
- [ ] Test weekly reset idempotency
- [ ] Test reflection XP with/without mood
- [ ] Test skill map completion XP
- [ ] Verify leaderboard updates immediately after XP award
- [ ] Check for profile-transaction desync
