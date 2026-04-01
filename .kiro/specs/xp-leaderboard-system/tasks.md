# Implementation Plan: XP Leaderboard System

## Overview

Incrementally build the XP, streak, and leaderboard system by first creating data models, then backend services, then API routes, then wiring into existing flows (session completion, reflection, skill map completion), and finally building the frontend components. Each step builds on the previous and ends with integration.

## Tasks

- [x] 1. Create Mongoose data models
  - [x] 1.1 Create `XpTransaction` model at `backend/src/models/XpTransaction.js`
    - Define schema with fields: `userId` (String, required, indexed), `source` (String, enum: session_completion, reflection, streak_bonus, skillmap_completion), `baseAmount` (Number, min 1), `multiplier` (Number, enum [1, 2]), `finalAmount` (Number, min 1), `referenceId` (String, nullable), `metadata` (Mixed)
    - Add compound indexes: `{ userId: 1, createdAt: -1 }`, `{ userId: 1, source: 1, createdAt: -1 }`
    - _Requirements: 1.5, 3.4, 4.5, 5.4, 6.4, 16.1_

  - [x] 1.2 Create `UserXpProfile` model at `backend/src/models/UserXpProfile.js`
    - Define schema with fields: `userId` (String, required, unique), `totalXp` (Number, default 0, min 0), `weeklyXp` (Number, default 0, min 0), `weekStartDate` (Date, required), `leagueTier` (String, enum: Gold, Silver, Bronze, Newcomer, default Newcomer)
    - Add indexes: `{ weeklyXp: -1 }`, `{ totalXp: -1 }`, `{ leagueTier: 1 }`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 13.1, 13.4_

  - [x] 1.3 Create `UserStreak` model at `backend/src/models/UserStreak.js`
    - Define schema with fields: `userId` (String, required, unique), `currentStreak` (Number, default 0, min 0), `lastPracticeDate` (Date, nullable), `streakStartDate` (Date, nullable)
    - Add index: `{ currentStreak: -1 }`
    - _Requirements: 7.4, 13.2_

  - [x] 1.4 Create `WeeklyResetHistory` model at `backend/src/models/WeeklyResetHistory.js`
    - Define schema with fields: `weekEndDate` (Date, required), `promotions` (array of { userId, fromTier, toTier }), `relegations` (array of { userId, fromTier, toTier }), `totalRankedUsers` (Number)
    - _Requirements: 10.7_

  - [x] 1.5 Add `fromTemplate` boolean field to existing `Skill` model at `backend/src/models/Skill.js`
    - Add `fromTemplate: { type: Boolean, default: false }` to the schema
    - Update `SkillService.createSkillMapFromTemplate` to set `fromTemplate: true` when creating from a template
    - _Requirements: 5.1, 5.2_

- [x] 2. Implement StreakService
  - [x] 2.1 Create `backend/src/services/StreakService.js`
    - Implement `processSession(userId, sessionDate)`: increment streak if consecutive day, reset to 1 if gap, no-op if same day, set to 1 if no prior history
    - Implement `getStreak(userId)`: return `{ currentStreak, lastPracticeDate }`
    - Use UTC calendar day comparison for all date logic
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]* 2.2 Write property tests for StreakService
    - **Property 8: Streak increment on consecutive day**
    - **Property 9: Streak reset on gap**
    - **Property 10: Streak idempotence on same day**
    - **Validates: Requirements 7.1, 7.2, 7.3**

- [x] 3. Implement XpService
  - [x] 3.1 Create `backend/src/services/XpService.js`
    - Implement `awardXp(userId, source, baseAmount, metadata)`:
      - Query XpTransaction for same userId + source + current UTC day to enforce daily cap
      - Get current streak from StreakService to determine multiplier (×2 if streak ≥ 7, else ×1)
      - Validate baseAmount is positive integer and multiplier is 1 or 2
      - Compute `finalAmount = baseAmount × multiplier`
      - Persist XpTransaction document
      - Atomically `$inc` totalXp and weeklyXp on UserXpProfile (upsert with weekStartDate)
      - Return the transaction or null if daily cap reached
    - Implement `getProfile(userId)`: return totalXp, weeklyXp, streak, tier, weekly rank
    - Implement `recalculateTotalXp(userId)`: sum all transactions and compare to stored total
    - Handle errors gracefully: retry once on persist failure, log via ErrorLoggingService, never block triggering action
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 6.5, 16.1, 16.2, 16.3, 16.4, 16.5_

  - [ ]* 3.2 Write property tests for XpService
    - **Property 1: Session XP threshold**
    - **Property 2: Daily XP cap per source**
    - **Property 3: Streak bonus formula**
    - **Property 6: Streak multiplier assignment**
    - **Property 7: Transaction amount invariant**
    - **Property 19: Transaction validation**
    - **Property 22: Reflection XP award**
    - **Property 23: XP transaction structure completeness**
    - **Validates: Requirements 1.1, 1.2, 1.3, 3.1, 4.1, 6.1, 6.5, 16.4**

- [x] 4. Implement LeaderboardService
  - [x] 4.1 Create `backend/src/services/LeaderboardService.js`
    - Implement `getWeeklyBoard(page, pageSize)`: aggregate UserXpProfile by weeklyXp descending, paginate at 50, cache in Redis with 5-min TTL via CacheService
    - Implement `getStreakBoard(page, pageSize)`: aggregate UserStreak where currentStreak ≥ 1, descending, tiebreak by earlier streakStartDate
    - Implement `getAllTimeBoard(page, pageSize)`: aggregate UserXpProfile by totalXp descending, tiebreak by earlier createdAt on User model
    - Implement `getUserRanks(userId)`: return user's rank on each board
    - Implement `getTierForRank(rank)`: Gold 1–10, Silver 11–30, Bronze 31–100, Newcomer >100 or 0
    - Implement `executeWeeklyReset()`: reset all weeklyXp to 0, promote top 3 Silver to Gold (if ≥4 Silver), relegate bottom 3 Gold to Silver (if ≥4 Gold), persist WeeklyResetHistory
    - For weekly tiebreaker: earlier first XP transaction timestamp in the week wins
    - For streak tiebreaker: earlier streakStartDate wins
    - For all-time tiebreaker: earlier user registration (createdAt on User) wins
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 11.1, 11.2, 11.3, 11.4, 12.1, 12.2, 12.3, 12.4, 15.1, 15.3, 15.4_

  - [ ]* 4.2 Write property tests for LeaderboardService
    - **Property 11: Leaderboard sorting invariant**
    - **Property 13: Streak board exclusion of zero streaks**
    - **Property 14: Tier assignment from rank**
    - **Property 15: Weekly reset zeroes weekly XP**
    - **Property 16: Promotion from Silver to Gold**
    - **Property 17: Relegation from Gold to Silver**
    - **Property 20: Pagination page size**
    - **Validates: Requirements 8.2, 9.1, 10.2, 10.3, 10.4, 11.4, 15.1**

- [ ] 5. Checkpoint - Ensure all backend services work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Create API routes and wire into server
  - [x] 6.1 Create XP routes at `backend/src/routes/xp.js`
    - `GET /api/xp/profile` — calls `XpService.getProfile(req.user.id)`, returns XP profile data
    - `GET /api/xp/transactions` — queries recent XpTransactions for the user, paginated
    - Both routes require `requireAuth` middleware
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_

  - [x] 6.2 Create leaderboard routes at `backend/src/routes/leaderboard.js`
    - `GET /api/leaderboard/weekly?page=1` — calls `LeaderboardService.getWeeklyBoard`
    - `GET /api/leaderboard/streaks?page=1` — calls `LeaderboardService.getStreakBoard`
    - `GET /api/leaderboard/all-time?page=1` — calls `LeaderboardService.getAllTimeBoard`
    - `GET /api/leaderboard/my-ranks` — calls `LeaderboardService.getUserRanks(req.user.id)`
    - All routes require `requireAuth` middleware
    - _Requirements: 8.5, 11.3, 12.4, 14.2, 14.3, 14.4, 15.1, 15.2_

  - [x] 6.3 Register new routes in `backend/src/server.js`
    - Import and mount `xpRoutes` at `/api/xp`
    - Import and mount `leaderboardRoutes` at `/api/leaderboard`
    - _Requirements: 13.7, 14.8_

- [x] 7. Integrate XP hooks into existing flows
  - [x] 7.1 Hook session completion to award session XP and update streak
    - In `SessionController.completeSession` (or `SessionManager.completeSession`), after successful session completion:
      - Calculate `minutesPracticed` from session duration (duration in seconds / 60)
      - If `minutesPracticed >= 10`: call `StreakService.processSession(userId, new Date())`, then call `XpService.awardXp(userId, 'session_completion', 10)`, then call `XpService.awardXp(userId, 'streak_bonus', 5 * streakCount)`
    - Wrap in try/catch so XP failures never block session completion
    - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.4, 7.1, 7.2, 7.3_

  - [x] 7.2 Hook reflection submission to award reflection XP
    - In the `POST /api/reflections` route handler, after successful `createReflection()`:
      - If reflection has mood and content, call `XpService.awardXp(userId, 'reflection', 20)`
    - Wrap in try/catch so XP failures never block reflection creation
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 7.3 Hook skill map completion to award skill map XP
    - In `NodeService.updateNodeStatus`, after marking a node as Completed:
      - Check if all nodes for the skill are now Completed
      - If yes, check if the Skill has `fromTemplate === true`
      - If template skill map fully completed, call `XpService.awardXp(userId, 'skillmap_completion', 200, { skillMapId: skillId })`
    - For uniqueness: `XpService.awardXp` checks for existing transaction with same source + referenceId
    - Wrap in try/catch so XP failures never block node status update
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 8. Set up weekly reset scheduler
  - [x] 8.1 Create `backend/src/services/WeeklyResetScheduler.js`
    - Use `setInterval` or `node-cron` to run `LeaderboardService.executeWeeklyReset()` every Monday at 00:00 UTC
    - Log execution via ErrorLoggingService
    - Initialize in `server.js` `startServer()` function
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [ ] 9. Checkpoint - Ensure backend integration works end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Build frontend API layer and XP Profile widget
  - [x] 10.1 Add XP and leaderboard API functions to `frontend/src/services/api.js`
    - Add `xpAPI` object with: `getProfile()`, `getTransactions(params)`
    - Add `leaderboardAPI` object with: `getWeekly(page)`, `getStreaks(page)`, `getAllTime(page)`, `getMyRanks()`
    - _Requirements: 13.1, 14.1_

  - [x] 10.2 Create `XpProfileCard` component at `frontend/src/components/XpProfileCard.jsx`
    - Display: total XP, current streak (days), league tier with icon (🏆/🥈/🥉/⭐), weekly XP, weekly rank
    - Show "×2 XP Active" badge when streak ≥ 7
    - Show loading skeleton while fetching
    - Show "XP data unavailable" fallback with retry on error
    - Use Tailwind CSS consistent with existing dashboard cards
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 17.3, 17.4_

  - [x] 10.3 Add `XpProfileCard` to Dashboard page
    - Import and render `XpProfileCard` in `frontend/src/pages/Dashboard.jsx` alongside existing stats
    - Fetch XP profile data in the dashboard's `fetchDashboard` function
    - _Requirements: 13.7_

- [x] 11. Build Leaderboard page and components
  - [x] 11.1 Create `LeaderboardTable` component at `frontend/src/components/LeaderboardTable.jsx`
    - Reusable table with columns: rank, display name, metric value (XP or streak days)
    - Highlight current user's row with accent background
    - Show tier badge on weekly view entries
    - Pagination controls (prev/next) when total > 50
    - Loading skeleton state
    - _Requirements: 14.6, 14.7, 15.2, 17.1_

  - [x] 11.2 Create `Leaderboard` page at `frontend/src/pages/Leaderboard.jsx`
    - Three tabs: "Weekly XP" (default), "Streaks", "All-Time"
    - Pin current user's rank + stats at top regardless of page
    - Include `XpProfileCard` at top of page
    - Show error message with retry on API failure
    - Use Sidebar layout consistent with other pages
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8, 15.5, 17.1, 17.2_

  - [x] 11.3 Add Leaderboard route and Sidebar navigation
    - Add route `{ path: "/leaderboard", element: <Protected><Leaderboard /></Protected> }` in `frontend/src/main.jsx`
    - Add "Leaderboard" nav item with trophy icon to `navItems` array in `frontend/src/components/Sidebar.jsx`
    - _Requirements: 14.8_

- [ ] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- XP hooks are wrapped in try/catch to never block existing flows (session completion, reflection, node updates)
- The `fromTemplate` field on Skill model is needed to distinguish template vs user-created skill maps for Requirement 5
